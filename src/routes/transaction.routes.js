const { Router } = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRoutes = Router();

/**
 * - POST /api/transactions/
 * - create a new transaction
 */

transactionRoutes.post("/", authMiddleware.authUserMiddleware, transactionController.createTransaction)


/**
 * - GET /api/transactions?accountId=xxx&page=1&limit=10
 * - get all transactions of the user account with pagination
 */

transactionRoutes.get("/", authMiddleware.authUserMiddleware, transactionController.getAllTransactionsByAccountId)


/**
 * - POST /api/transactions/add-bonus
 * - add bonus amount to their account so they will be able to do a transaction without
 *   system user to add bonus amount into their account
 */
transactionRoutes.post("/get-bonus", authMiddleware.authUserMiddleware, transactionController.getBonus)


/**
 * - POST /api/transactions/system/initial-funds
 * - create initial funds transaction form system user
 */

transactionRoutes.post("/system/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction )

module.exports = transactionRoutes;