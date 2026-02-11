const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required to create an user"],
    trim: true,
    lowercase: true,
    unique: [true, "Email already exist"],
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please fill a valid email address"],
  },
  name: {
    type: String,
    required: [ true, "Name is required" ]
  },
  password: {
    type: String,
    required: [ true, "Password is required to create an account"],
    minlength: [6, "Password should contain atleast 6 characters"],
    select: false
  }
}, {
    timestamps: true
});


userSchema.pre("save", async function(){

  if(!this.isModified("password")){
    return ;
  }

  const hash = await bcrypt.hash(this.password, 10);
  this.password = hash;

  return ;

})


userSchema.methods.comparePassword = async function (password){
  return await bcrypt.compare(password, this.password);
}


const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
