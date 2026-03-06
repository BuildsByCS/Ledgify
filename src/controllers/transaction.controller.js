const mongoose = require("mongoose");
// const emailService = require("../services/email.service");
const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const userModel = require("../models/user.model");
const { toPaise, toRupees } = require("../utils/money.js");



/**
 * - create a new transaction
 * - the 10- strp transfer flow:
 * - 1) Validate request
 * - 2) Validate idempotency key
 * - 3) Start MongoDB session
 * - 4) Fetch fromAccount & toAccount accounts inside transaction session
 * - 5) Check account status
 * - 6) Derive sender balance from ledger
 * - 7) Create transaction (PENDING)
 * - 8) Create DEBIT ledger entry
 * - 9) Create CREDIT ledger entry
 * - 10) Mark transaction COMPLETED
 * - 11) Commit MongoDB session
 * - 12) Send email notification 
 * - 13) Send response to client
 */


async function createTransaction(req, res){

    /**
     * -1) Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if(!fromAccount || !toAccount || !amount || !idempotencyKey ){
        return res.status(400).json({
            message: "fromAccount, toAccount, amount & idempotencyKey are required"
        })
    }

    if (fromAccount === toAccount) {
      return res.status(400).json({
        message: "Self transfer not allowed",
      });
    }

    if (typeof amount !== "number") {
      return res.status(400).json({
        message: "Amount must be a number",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "Transfer amount must be greater than zero",
      });
    }


    /**
     * - 2) Validate idempotency key
     */

    const isTransactionAlreadyExist = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    }).lean();

    if(isTransactionAlreadyExist){
        if(isTransactionAlreadyExist.status === "COMPLETED"){
            return res.status(200).json({
              message: "Transaction already processed",
              transaction: {
                ...isTransactionAlreadyExist,
                amount: toRupees(isTransactionAlreadyExist.amount),
              },
            });
        }

        if(isTransactionAlreadyExist.status === "PENDING"){
            return res.status(200).json({
                message: "Transaction is still processing"
            })
        }

        if (isTransactionAlreadyExist.status === "FAILED" || isTransactionAlreadyExist.status === "REVERSED") {
            return res.status(409).json({
              message: "Previous transaction attempt failed. Retry with a new idempotency key."
            })
        }
    }

    
    // Convert rupees to paise
    // database stores money in smallest unit to avoid floating precision issues
    const amountInPaise = toPaise(amount)

    let session;
    let transaction;
  
    try {
      /**
       * - 3) Start MongoDB session
       * - ensures debit & credit ledger entries remain atomic
       */

      session = await mongoose.startSession();
      session.startTransaction();

      /**
       * - 4) Fetch fromAccount & toAccount accounts inside transaction session
       * - prevents race conditions when multiple transfers happen simultaneously
       */

      const fromUserAccount = await accountModel
        .findById(fromAccount)
        .session(session);

      const toUserAccount = await accountModel
        .findById(toAccount)
        .populate("user")
        .session(session);

      if (!fromUserAccount || !toUserAccount) {
        throw new Error("Invalid fromAccount or toAccount");
      }

      /**
       * - 5) Check account status
       */

      if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message:
            "Both fromAccount and toAccount must be ACTIVE to process a transaction",
        });
      }

      /**
       * - 6) Derive sender balance from ledger
       */

      // Pass session so balance calculation sees same transactional snapshot
      const balance = await fromUserAccount.getBalance(session);

      if (balance < amountInPaise) {
    
        await session.abortTransaction();
        session.endSession();
    
        return res.status(400).json({
          message: `Insufficient balance. Current balance ${toRupees(balance)}. Requested transfer amount is ${amount}`,
        });
      }

      /**
       * - 7) Create transaction (PENDING)
       */

      transaction = (
        await transactionModel.create(
          [
            {
              fromAccount,
              toAccount,
              amount: amountInPaise,
              type: "TRANSFER",
              idempotencyKey,
              status: "PENDING",
            },
          ],
          { session },
        )
      )[0];

      /** - 8) Create DEBIT ledger entry */
       await ledgerModel.create(
        [
          {
            account: fromAccount,
            amount: amountInPaise,
            transaction: transaction._id,
            type: "DEBIT",
          },
        ],
        { session },
      );

      /** - 9) Create CREDIT ledger entry */
       await ledgerModel.create(
        [
          {
            account: toAccount,
            amount: amountInPaise,
            transaction: transaction._id,
            type: "CREDIT",
          },
        ],
        { session },
      );

      /** - 10) Mark transaction COMPLETED */

      transaction = await transactionModel.findByIdAndUpdate(
        transaction._id,
        { status: "COMPLETED" },
        { session, returnDocument: "after" },
      );

      /**
       * - 11) Commit MongoDB session
       */
      await session.commitTransaction();
      session.endSession();

    } catch (error) {
        
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }

        // Handle duplicate idempotency key (MongoDB unique index violation)
        if (error.code === 11000) {
          return res.status(409).json({
            message: "Duplicate idempotency key. Transaction already processed."
          })
        }


        // mark failed if transaction already created
        if (transaction) {
          await transactionModel.findByIdAndUpdate(transaction._id, {
            status: "FAILED",
          });
        }

        return res.status(500).json({
          error: error.message,
          message: "Transaction failed",
        });

    }


    /**
     * - 12) Send email notification : avoided it for the free tier deployment playforms
     *    like render & vercel as they block the SMPT ports used for sending emails.
     */

    // await emailService.sendTransactionEmail( req.user.email, req.user.name, amount, fromAccount, toAccount, "debit", transaction._id );
    // await emailService.sendTransactionEmail( toUserAccount.user.email, toUserAccount.user.name, amount, fromAccount, toUserAccount._id, "credit", transaction._id );


    /**
     * 13) Send response to client
     */

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: {
            ...transaction.toObject(),
            amount: toRupees(transaction.amount)
        }
    })


}

async function getTransactionsHistory(req, res){

    const { accountId, page = 1, limit = 10 } = req.query;

    if (!accountId) {
        return res.status(400).json({
            message: "accountId query parameter is required",
        });
    }

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id,
    }).lean();

    if (!account) {
        return res.status(404).json({
            message: "Account not found for the user",
        });
    }

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    if (parsedLimit > 50) {
      return res.status(400).json({
        message: "Limit cannot exceed 50",
      });
    }

    if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({ message: "Invalid page number. Must be a positive integer." });
    }
    if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ message: "Invalid limit. Must be a positive integer." });
    }


    const skip = (parsedPage - 1) * parsedLimit;

    const [transactions, totalCount] = await Promise.all([
      ledgerModel
        .find({ account: accountId })
        .populate("transaction", "_id fromAccount toAccount")
        .select({ amount: 1, type: 1, createdAt: 1, transaction: 1, _id: 0 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),

      ledgerModel.countDocuments({ account: accountId }),
    ]);


    return res.status(200).json({
        accountId: accountId,
        transactions: transactions.map(tx => ({
            ...tx,
            amount: toRupees(tx.amount)
        })),
        pagination: {
            currentPage: parsedPage,
            totalPages: Math.ceil(totalCount / parsedLimit),
            totalEntries: totalCount,
            limit: parsedLimit,
        },
    });

}

async function getBonus(req, res) {

    const { idempotencyKey, toAccount } = req.body;

    if (!idempotencyKey || !toAccount) {
      return res.status(400).json({
        message: "Idempotency key and toAccount are required to add bonus",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(toAccount)) {
      return res.status(400).json({
        message: "Invalid toAccount format",
      });
    }

    /**
     * create bonus amount & bonus idempotencykey
     */
    const bonusAmount = toPaise(1000);
    const bonusIdempotencyKey = `bonus-${idempotencyKey}`;

    /**
     * Check if bonus transaction already exists
     */

    const existingBonusTransaction = await transactionModel
      .findOne({ idempotencyKey: bonusIdempotencyKey })
      .lean();

    if (existingBonusTransaction) {
        if (existingBonusTransaction.status === "COMPLETED") {
          return res.status(200).json({
            message: "Transaction already processed",
            transaction: {
              ...existingBonusTransaction,
              amount: toRupees(existingBonusTransaction.amount),
            },
          });
        }

        if (existingBonusTransaction.status === "PENDING") {
           return res.status(200).json({
             message: "Transaction is still processing",
           });
         }

        if ( existingBonusTransaction.status === "FAILED" || existingBonusTransaction.status === "REVERSED") {
           return res.status(409).json({
             message:
               "Previous transaction attempt failed. Retry with a new idempotency key.",
           });
         }

    }

    let session;
    let transaction;

    try {

      session = await mongoose.startSession();
      session.startTransaction();

    /**
     * validate toAccount - must belong to requesting user
     */

      const isValidToAccount = await accountModel.findOne(
          { _id: toAccount, user: req.user._id, status: "ACTIVE" },
          { _id: 1 },
        )
        .session(session)
        .lean();

      if (!isValidToAccount) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
          message: "Invalid toAccount, it should be users own ACTIVE account",
        });
      }

    /**
     * get system user
     */

      const systemUser = await userModel
        .findOne({ systemUser: true })
        .select({ _id: 1 })
        .session(session)
        .lean();

      if (!systemUser) {
        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({
          message: "System user not found, please contact support",
        });
      }

    /**
     * get system account
     */

      const systemUserAccount = await accountModel
        .findOne({ user: systemUser._id })
        .select({ _id: 1 })
        .session(session)
        .lean();

      if (!systemUserAccount) {
        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({
          message: "System user account not found, please contact support",
        });
      }

    /**
     * create transaction
     */

      transaction = (
        await transactionModel.create(
          [
            {
              fromAccount: systemUserAccount._id,
              toAccount,
              amount: bonusAmount,
              type: "BONUS",
              idempotencyKey: bonusIdempotencyKey,
              status: "PENDING",
            },
          ],
          { session },
        )
      )[0];


    /**
     * debit system account
     */

      await ledgerModel.create(
        [
          {
            account: systemUserAccount._id,
            amount: bonusAmount,
            transaction: transaction._id,
            type: "DEBIT",
          },
        ],
        { session },
      );

    /**
     * credit user account
     */

      await ledgerModel.create(
        [
          {
            account: toAccount,
            amount: bonusAmount,
            transaction: transaction._id,
            type: "CREDIT",
          },
        ],
        { session },
      );

    /**
     * mark transaction completed
     */

      transaction = await transactionModel.findByIdAndUpdate(
        transaction._id,
        { status: "COMPLETED" },
        { session, returnDocument: "after" },
      );

    /**
     * commit transaction
     */

      await session.commitTransaction();
      session.endSession();

  } catch (error) {

      if (session) {
        await session.abortTransaction();
        session.endSession();
      }

      if (error.code === 11000) {
        return res.status(409).json({
          message: "Duplicate idempotency key. Transaction already processed.",
        });
      }

      if (transaction) {
        await transactionModel.findByIdAndUpdate(transaction._id, {
          status: "FAILED",
        });
      }

      return res.status(500).json({
        error: error.message,
        message: "Error occurred, please retry after some time",
      });

  }

    return res.status(200).json({
      message: "Bonus added successfully",
      transaction: {
        ...transaction.toObject(),
        amount: toRupees(transaction.amount),
      },
    });

}

async function createInitialFundsTransaction(req, res) {

  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "toAccount, amount & idempotencyKey are required"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(toAccount)) {
    return res.status(400).json({
      message: "Invalid toAccount format"
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      message: "Amount must be greater than zero"
    });
  }

  // convert rupees to paise
  const amountInPaise = toPaise(amount);

  /**
   * validate toAccount
   */
  const toUserAccount = await accountModel
    .findOne({ _id: toAccount })
    .populate("user")
    .lean();

  if (!toUserAccount) {
    return res.status(400).json({
      message: "Invalid toAccount"
    });
  }

  /**
   * validate fromAccount (system user account)
   */
  const fromUserAccount = await accountModel
    .findOne({ user: req.user._id })
    .select({ _id: 1 })
    .lean();

  if (!fromUserAccount) {
    return res.status(400).json({
      message: "System user account not found"
    });
  }

  /**
   * validate idempotency key
   */
  const existingTransaction = await transactionModel
    .findOne({ idempotencyKey })
    .lean();

  if (existingTransaction) {

    if (existingTransaction.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: {
          ...existingTransaction,
          amount: toRupees(existingTransaction.amount)
        }
      });
    }

    if (existingTransaction.status === "PENDING") {
      return res.status(200).json({
        message: "Transaction is still processing"
      });
    }

    if (
      existingTransaction.status === "FAILED" ||
      existingTransaction.status === "REVERSED"
    ) {
      return res.status(409).json({
        message: "Previous transaction attempt failed. Retry with a new idempotency key."
      });
    }
  }

  let session;
  let transaction;

  try {

    session = await mongoose.startSession();
    session.startTransaction();

    /**
     * create transaction
     */

    transaction = (
      await transactionModel.create(
        [{
          fromAccount: fromUserAccount._id,
          toAccount,
          amount: amountInPaise,
          type: "DEPOSIT",
          idempotencyKey,
          status: "PENDING"
        }],
        { session }
      )
    )[0];

    /**
     * debit ledger entry
     */

    await ledgerModel.create(
      [{
        account: fromUserAccount._id,
        amount: amountInPaise,
        transaction: transaction._id,
        type: "DEBIT"
      }],
      { session }
    );

    /**
     * credit ledger entry
     */

    await ledgerModel.create(
      [{
        account: toAccount,
        amount: amountInPaise,
        transaction: transaction._id,
        type: "CREDIT"
      }],
      { session }
    );

    /**
     * mark transaction completed
     */

    transaction = await transactionModel.findByIdAndUpdate(
      transaction._id,
      { status: "COMPLETED" },
      { session, returnDocument: "after" }
    );

    /**
     * commit transaction
     */

    await session.commitTransaction();
    session.endSession();

  } catch (error) {

    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Duplicate idempotency key. Transaction already processed."
      });
    }

    if (transaction) {
      await transactionModel.findByIdAndUpdate(transaction._id, {
        status: "FAILED"
      });
    }

    return res.status(500).json({
      error: error.message,
      message: "Initial funds transaction failed"
    });
  }

  /**
   * Email notifications skipped due to SMTP restrictions on free hosting
   */

  return res.status(201).json({
    message: "Initial funds transaction completed successfully",
    transaction: {
      ...transaction.toObject(),
      amount: toRupees(transaction.amount)
    }
  });

}


module.exports = {
  createTransaction,
  getTransactionsHistory,
  getBonus,
  createInitialFundsTransaction,
};