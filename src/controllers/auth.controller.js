const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");


/** 
 * - user register controller
 * - POST /api/auth/register
*/
async function userRegisterController(req, res){

    const { email, password, name } = req.body;

    const isUserExist = await userModel.findOne({
        email: email
    })

    if (isUserExist) {
      return res.status(422).json({
        message: "User already exist with this email",
      });
    }

    const user = await userModel.create({
        email, password, name
    })

    const token = jwt.sign({ userId: user._id}, process.env.JWT_SECRET, { expiresIn: "3d" });

    res.cookie("token", token);

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })

}


/**
 * - user login controller
 * - POST /api/auth/login
*/
async function userLoginController(req, res){
    const { email, password } = req.body;

    const user = await userModel.findOne({ email}).select("+password");

    if(!user){
      return res.status(404).json({
          message: "User doesn't exist, please register first",
        })
    }

    const isValidPassword = await user.comparePassword(password);

    if(!isValidPassword){
      return res.status(401).json({
          message: "Invalid password",
      })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

    res.cookie("token", token);

    return res.status(200).json({
      message: "User logged in successfully",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name
      },
      token
    });

}


module.exports = {
  userRegisterController,
  userLoginController,
};