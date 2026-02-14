const { Router } = require("express");
const authMiddleware = require("../middlewares/account.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRoutes = Router();

/**
 * - POST /api/transactions/
 * - create a new transaction
 */

transactionRoutes.post("/", authMiddleware.authUserMiddleware, transactionController.createTransaction)


module.exports = transactionRoutes;