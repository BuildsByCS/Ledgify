require("dotenv").config();
const app = require("./app");
const connectToDB = require("./src/config/db");


connectToDB();


app.listen(3000, () => {
    console.log("Ledgify server started at port 3000");
})

