const mongoose = require("mongoose");


function connectToDB(){
    mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to DB");
    }).catch((error) => {
        console.log(error, "Error while connecting to DB");
        process.exit(1);
    })
}


module.exports = connectToDB;