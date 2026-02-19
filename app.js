const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://ledgify-cs.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));


/**
 * - Routes required
 */
const authRouter = require("./src/routes/auth.routes");
const accountRouter = require("./src/routes/account.routes");
const transactionRoutes = require("./src/routes/transaction.routes");

/**
 * - Used Routes
 */

app.get("/", (req, res) => {
    res.send("Ledgify service is running");
})

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRoutes);

module.exports = app;