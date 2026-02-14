const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(cookieParser());


/**
 * - Routes required
 */
const authRouter = require("./src/routes/auth.routes");
const accountRouter = require("./src/routes/account.routes");
const transactionRoutes = require("./src/routes/transaction.routes");

/**
 * - Used Routes
 */
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRoutes);

module.exports = app;