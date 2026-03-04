const mongoose = require("mongoose");
// const emailService = require("../services/email.service");
const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const userModel = require("../models/user.model");



/**
 * - create a new transaction
 * - the 10- strp transfer flow:
 * - 1) Validate request
 * - 2) Validate idempotency key
 * - 3) Check account status
 * - 4) Derive sender balance from ledger
 * - 5) Create transaction (PENDING)
 * - 6) Create DEBIT ledger entry
 * - 7) Create CREDIT ledger entry
 * - 8) Mark transaction COMPLETED
 * - 9) Commit MongoDB session
 * - 10) Send email notification
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

    const fromUserAccount = await accountModel.findOne({ _id: fromAccount });

    const toUserAccount = await accountModel.findOne({ _id: toAccount }).populate("user");

    if( !fromUserAccount || !toUserAccount ){
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }


    /**
     * - 2) Validate idempotency key
     */

    const isTransactionAlreadyExist = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if(isTransactionAlreadyExist){
        if(isTransactionAlreadyExist.status === "COMPLETED"){
            return res.status(200).json({
              message: "Transaction already processed",
              transaction: isTransactionAlreadyExist,
            });
        }

        if(isTransactionAlreadyExist.status === "PENDING"){
            return res.status(200).json({
                message: "Transaction is still processing"
            })
        }

        if(isTransactionAlreadyExist.status === "FAILED"){
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if(isTransactionAlreadyExist.status === "REVERSED"){
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }


    /**
     * - 3) Check account status
     */

    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE"){
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process a transaction"
        })
    }


    /**
     * - 4) Derive sender balance from ledger
     */

    const balance = await fromUserAccount.getBalance();

    if(balance < amount){
        return res.status(400).json({
            message: `Insufficient Balance. Current balance is ${balance}. Requested transfer amount is ${amount}`
        })
    }


  let transaction;

  try {

    /**
     * - 5) Create transaction (PENDING)
     */

    const session = await mongoose.startSession();
    session.startTransaction();

    transaction = (
      await transactionModel.create(
        [
          {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING",
          },
        ],
        { session },
      )
    )[0];

    /** - 6) Create DEBIT ledger entry */
    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromAccount,
          amount: amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );

    // await (() => {
    //   return new Promise((resolve) => setTimeout(resolve, 1000 * 15));
    // })();
    // Simulating some delay in transaction process:
    // e.g amount is Debit but not credit to account due to some delay in processing or some issue & 
    // user retry with new req. then a new transaction should not be created with the same idempotency key
    // so for retry req. we return current transaction is still pending
    // & when its completed then return transaction completed with the transaction details


    /** - 7) Create CREDIT ledger entry */
    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount: amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    /** - 8) Mark transaction COMPLETED */

    transaction = await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session, returnDocument: "after" },
    );

    /**
     * - 9) Commit MongoDB session
     */
    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    return res.status(400).json({
        message: "Transaction is pending due to some error, please retry after some time",
    })
  }


    /**
     * - 10) Send email notification : avoided it for the free tier deployment playforms
     *    like render & vercel as they block the SMPT ports used for sending emails.
     */

    // await emailService.sendTransactionEmail( req.user.email, req.user.name, amount, fromAccount, toAccount, "debit", transaction._id );
    // await emailService.sendTransactionEmail( toUserAccount.user.email, toUserAccount.user.name, amount, fromAccount, toUserAccount._id, "credit", transaction._id );


    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })


}

async function getAllTransactionsByAccountId(req, res){

    const { accountId, page = 1, limit = 10 } = req.query;

    if (!accountId) {
        return res.status(400).json({
            message: "accountId query parameter is required",
        });
    }

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id,
    });

    if (!account) {
        return res.status(404).json({
            message: "Account not found for the user",
        });
    }

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({ message: "Invalid page number. Must be a positive integer." });
    }
    if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ message: "Invalid limit. Must be a positive integer." });
    }


    const skip = (parsedPage - 1) * parsedLimit;

    const transactions = await ledgerModel
      .find({ account: accountId })
      .populate("transaction", "_id fromAccount toAccount")
      .select({ amount: 1, type: 1, createdAt: 1, transaction: 1, _id: 0 })
      .sort({ createdAt: -1 }) // descending order: latest transactions first
      .skip(skip)
      .limit(parsedLimit);
    
    const totalCount = await ledgerModel.countDocuments({ account: accountId });


    return res.status(200).json({
        accountId: accountId,
        transactions: transactions,
        pagination: {
            currentPage: parsedPage,
            totalPages: Math.ceil(totalCount / parsedLimit),
            totalEntries: totalCount,
            limit: parsedLimit,
        },
    });

}

async function getBonus(req, res){

    const { idempotencyKey, toAccount } = req.body;

    if(!idempotencyKey || !toAccount){
        return res.status(400).json({
            message: "Idempotency key and toAccount are required to add bonus"
        })
    }

    /**
     *  validate toAccount
     */

    const isValidToAccount = await accountModel.findOne({ _id: toAccount, user: req.user._id, status: "ACTIVE" });

    if(!isValidToAccount){
        return res.status(400).json({
            message: "Invalid toAccount, it should be an ACTIVE account of the user"
        })
    }

    /** 
     *  create bonus amount & bonus idempotencykey
    */
    const bonusAmount = 1000;
    const bonusIdempotencyKey = `bonus-${idempotencyKey}`;


    /**
     * get system user & its account
     */

    const systemUser = await userModel.findOne({ systemUser: true }).select({ systemUser: 1, _id: 1 });;

    if (!systemUser) {
      return res.status(500).json({
        message: "System user not found, please contact support",
      });
    }

    const systemUserAccount = await accountModel.findOne({ user: systemUser._id }).select({ _id: 1 });

    if(!systemUserAccount){
        return res.status(500).json({
            message: "System user account not found, please contact support"
        })
    }


    /**
     * Check if bonus transaction already exists for the user
     */

    const existingBonusTransaction = await transactionModel.findOne({ bonusIdempotencyKey });

    if(existingBonusTransaction){
        if(existingBonusTransaction.status === "COMPLETED"){
            return res.status(200).json({
              message: "Bonus already added",
              transaction: existingBonusTransaction,
            });
        }
        if(existingBonusTransaction.status === "PENDING"){
            return res.status(200).json({
                message: "Bonus is still being added, please wait"
            })
        }
        if(existingBonusTransaction.status === "FAILED"){
            return res.status(500).json({
                message: "Bonus adding failed, please retry"
            })
        }
    }


    /**
     * create bonus transaction from system account to user account
     */

    let transaction;

    try {
        
        // start transaction process
        const session = await mongoose.startSession();
        session.startTransaction();

        // create a PENDING transaction
        transaction = (
          await transactionModel.create(
            [
              {
                fromAccount: systemUserAccount._id,
                toAccount,
                amount: bonusAmount,
                idempotencyKey: bonusIdempotencyKey,
                status: "PENDING",
              },
            ],
            { session },
          )
        )[0];

        // debit ledger entry for system account
        const debitLedgerEntry = await ledgerModel.create(
            [
                {
                    account: systemUserAccount._id,
                    amount: bonusAmount,
                    transaction: transaction._id,
                    type: "DEBIT",
                },
            ],
            { session },
        )

        // credit ledger entry for user account
        const creditLedgerEntry = await ledgerModel.create(
            [
                {
                    account: toAccount,
                    amount: bonusAmount,
                    transaction: transaction._id,
                    type: "CREDIT",
                }
            ],
            { session },
        )

        // update transaction status to COMPLETED
        transaction = await transactionModel.findOneAndUpdate(
          { _id: transaction._id },
          { status: "COMPLETED" },
          { session, returnDocument: "after" },
        );

        // commit transaction
        await session.commitTransaction();
        session.endSession();


    } catch (error) {
        return res.status(500).json({
            error: error.message,
            message: "Error occured, please retry after some time",
        })
    }


    return res.status(200).json({
        message: "Bonus added successfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res){

    const { toAccount, amount, idempotencyKey } = req.body;

    if( !toAccount || !amount || !idempotencyKey ){
        return res.status(400).json({
            message: "toAccount, amount & idempotencyKey are required"
        })
    }

    // validate toAccount
    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    }).populate("user")

    if(!toUserAccount){
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    // validate fromAccount (system user account)
    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if(!fromUserAccount){
        return res.status(400).json({
            message: "System user account not found"
        })
    }

    // validate idempotency key
    const isTransactionAlreadyExist = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if(isTransactionAlreadyExist){
        if(isTransactionAlreadyExist.status === "COMPLETED"){
            return res.status(200).json({
              message: "Transaction already processed",
              transaction: isTransactionAlreadyExist,
            });
        }

        if(isTransactionAlreadyExist.status === "PENDING"){
            return res.status(200).json({
                message: "Transaction is still processing"
            })
        }

        if(isTransactionAlreadyExist.status === "FAILED"){
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if(isTransactionAlreadyExist.status === "REVERSED"){
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }


    // start transaction process
    let transaction;

    try {

    const session = await mongoose.startSession();
    session.startTransaction();

    transaction = (await transactionModel.create([{
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    }], { session })) [0]

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }], { session })

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }], { session })


    await transactionModel.findOneAndUpdate(
        { _id: transaction._id },
        { status: "COMPLETED" },
        { session }
    )

    await session.commitTransaction()
    session.endSession()



    } catch (error) {
        return res.status(400).json({
            message: "Initial funds transaction is pending due to some error, please retry after some time",
        })
    }


    /** - Send email notification : avoided it for the free tier deployment playforms
     *    like render & vercel as they block the SMPT ports used for sending emails.
     */

    // await emailService.sendTransactionEmail( req.user.email, req.user.name, amount, fromUserAccount._id, toAccount, "debit", transaction._id );
    // await emailService.sendTransactionEmail( toUserAccount.user.email, toUserAccount.user.name, amount, fromUserAccount._id, toUserAccount._id, "credit", transaction._id );


    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })


}


module.exports = {
  createTransaction,
  getAllTransactionsByAccountId,
  getBonus,
  createInitialFundsTransaction,
};