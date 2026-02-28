const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
// const emailService = require("../services/email.service");
const tokenBlacklistModel = require("../models/blackList.model");


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

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })

    // await emailService.sendRegistrationEmail(user.email, user.name);

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

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

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


/**
 * - get current logged in user details
 * - GET /api/auth/me
 */

async function getCurrentUserController(req, res){
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if(!token){
    return res.status(401).json({
      message: "Unauthorized, token not found",
    })
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await userModel.findById(decoded.userId);

  if(!user){
    return res.status(404).json({
      message: "User not found",
    })
  }

  return res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name
    }
  })

}


/**
 * - user logout controller
 * - POST /api/auth/logout
 */

async function userLogoutController(req, res){

  try {

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(400).json({
        message: "Token not found",
      });
    }

    await tokenBlacklistModel.create({
      token: token,
    });

    res.clearCookie("token");

    res.status(200).json({
      message: "User logged out successfully",
    });

  } catch (err) {
    return res.status(500).json({
      message: "Invalid token",
      error: err.message,
    });
  }

}


module.exports = {
  userRegisterController,
  userLoginController,
  getCurrentUserController,
  userLogoutController
};