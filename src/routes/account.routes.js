const express = require("express");
const authMiddleware = require("../middlewares/account.middleware");
const accountController = require("../controllers/account.controller");


const router = express.Router();

/**
 * - POST /api/accounts/create
 * - create an account
 * - secure route
 */
router.post("/create", authMiddleware.authUserMiddleware, accountController.createAccountController);


module.exports = router;

