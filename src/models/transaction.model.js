const mongoose = require("mongoose");


const transactionSchema = new mongoose.Schema({
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "account",
    required: [true, "Transaction must be associated with a from account"],
    index: true
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "account",
    required: [true, "Transaction must be associated with a to account"],
    index: true
  },
  status: {
    type: String,
    enum: {
        values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
        message: "Status can be either PENDING, COMPLETED, FAILED or REVERSED"
    },
    default: "PENDING"
  },
  amount: {
    type: Number,
    required: [ true, "Amount is required for creating a transaction"],
    min: [1, "Transaction amount can't be zero or negative"]
  },
  idempotencyKey: {
    type: String,
    required: [true, "Idempotency key is required for creating a transaction"],
    index: true,
    unique: true
  },
  type: {
    type: String,
    enum: ["TRANSFER", "BONUS", "DEPOSIT", "WITHDRAWAL"],
    default: "TRANSFER",
    required: true
  },
}, {
    timestamps: true
});

transactionSchema.index({ fromAccount: 1, createdAt: -1 });
transactionSchema.index({ toAccount: 1, createdAt: -1 });

transactionSchema.path("toAccount").validate(function (value) {
  return value.toString() !== this.fromAccount.toString();
}, "Sender and receiver account cannot be same");


const transactionModel = mongoose.model("transaction", transactionSchema);

module.exports = transactionModel