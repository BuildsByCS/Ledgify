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
 * - get all accounts of the logged in user
 * - protected route
 */

router.get("/", authMiddleware.authUserMiddleware, accountController.getUserAccountsController);

/**
 * - GET /api/accounts/all
 * - get all accounts in ledgify with its users data
 */

router.get("/all", authMiddleware.authUserMiddleware, accountController.getAllUsersAccountsController );

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
 * - GET /api/accounts/ledger-chart/:accountId
 * - Get ledger entries for chart display (last 7 days)
 */
router.get("/ledger-chart/:accountId", authMiddleware.authUserMiddleware, accountController.getLedgerEntriesChart );


/**
 * - GET /api/accounts/ledger-list?accountId=xxx&page=1&limit=10
 * - Get paginated ledger entries for list display
 */
router.get("/ledger-list", authMiddleware.authUserMiddleware, accountController.getLedgerEntriesList );


/**
 * - POST /api/accounts/update-status
 * - update account status to ACTIVE or CLOSED
 */
router.post("/update-status", authMiddleware.authUserMiddleware, accountController.updateAccountStatusController);


/**
 * - POST /api/accounts/system-update-status
 * - update account status to ACTIVE, CLOSED or FROZEN
 * - protected route, only system user can access this route
 */
router.post("/system-update-status", authMiddleware.authSystemUserMiddleware, accountController.updateAccountStatusSystemController);


module.exports = router;

