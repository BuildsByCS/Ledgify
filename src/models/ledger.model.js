const mongoose = require("mongoose");


const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Ledger must be associated with an account" ],
        index: true,
        immutable: true,
    },
    amount: {
        type: Number,
        required: [ true, "Amount is required for creating a ledger entry"],
        immutable: true
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: [ true, "Ledger must be associated with a transaction "],
        index: true,
        immutable: true
    },
    type: {
        type: String,
        enum: {
            values: ["CREDIT", "DEBIT"],
            message: "Type should be either CREDIT or DEBIT"
        },
        require: [ true, "Ledger type is required"],
        immutable: true
    }

})


function preverntLedgerModification(){
    throw new Error("Ledger entried are immutable and can't be modified or deleted");
}

ledgerSchema.pre("findOneAndUpdate", preverntLedgerModification);
ledgerSchema.pre("findOneAndDelete", preverntLedgerModification);
ledgerSchema.pre("findOneAndReplace", preverntLedgerModification);
ledgerSchema.pre("updateMany", preverntLedgerModification);
ledgerSchema.pre("updateOne", preverntLedgerModification);
ledgerSchema.pre("remove", preverntLedgerModification);
ledgerSchema.pre("deleteMany", preverntLedgerModification);
ledgerSchema.pre("deleteOne", preverntLedgerModification);
ledgerSchema.pre("replaceOne", preverntLedgerModification);


const ledgerModel = mongoose.model("ledger", ledgerSchema);

module.exports = ledgerModel;