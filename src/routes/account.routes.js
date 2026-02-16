const express = require("express");
const authMiddleware = require("../middlewares/account.middleware");
const accountController = require("../controllers/account.controller");


const router = express.Router();

/**
 * - POST /api/accounts/create
 * - create an account
 * - protected route
 */
router.post("/create", authMiddleware.authUserMiddleware, accountController.createAccountController);


/**
 * - GET /api/accounts
 * - get all acounts of the logged in user
 * - protected route
 */

router.get("/", authMiddleware.authUserMiddleware, accountController.getUserAccountsController);


/**
 * - GET /api/accounts/balance/:accountId
 * - get balance of a specific account
 */

router.get("/balance/:accountId", authMiddleware.authUserMiddleware, accountController.getAccountBalanceController)



module.exports = router;

