const mongoose = require("mongoose");
const emailService = require("../services/email.service");
const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");



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

    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session },
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
     * - 10) Send email notification
     */

    await emailService.sendTransactionEmail( req.user.email, req.user.name, amount, fromAccount, toAccount, "debit", transaction._id );
    await emailService.sendTransactionEmail( toUserAccount.user.email, toUserAccount.user.name, amount, fromAccount, toUserAccount._id, "credit", transaction._id );

    return res.status(201).json({
        message: "Transaction completed successfully",
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

    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    }).populate("user")

    if(!toUserAccount){
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if(!fromUserAccount){
        return res.status(400).json({
            message: "System user account not found"
        })
    }


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


    await emailService.sendTransactionEmail( req.user.email, req.user.name, amount, fromUserAccount._id, toAccount, "debit", transaction._id );
    await emailService.sendTransactionEmail( toUserAccount.user.email, toUserAccount.user.name, amount, fromUserAccount._id, toUserAccount._id, "credit", transaction._id );

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })


}


module.exports = {
    createTransaction,
    createInitialFundsTransaction
}