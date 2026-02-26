const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
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


/**
 * - GET /api/accounts/total-balance
 * - get total balance of all accounts of the logged in user
 */
router.get("/total-balance", authMiddleware.authUserMiddleware, accountController.getTotalBalanceController)


/**
 * - POST /api/accounts/update-status?accountId=xxx&status=ACTIVE/CLOSED
 * - update account status to ACTIVE or CLOSED
 */
router.post("/update-status", authMiddleware.authUserMiddleware, accountController.updateAccountStatusController);


/**
 * - POST /api/accounts/freeze/:accountId
 * - freeze an account
 * - protected route, only system user can freeze an account
 */
router.post("/freeze/:accountId", authMiddleware.authSystemUserMiddleware, accountController.freezeAccountController);


module.exports = router;

