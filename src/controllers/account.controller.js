const accountModel = require("../models/account.model");


async function createAccountController(req, res){
    const user = req.user;

    const account = await accountModel.create({
        user: user._id
    });

    res.status(201).json({
      account
    });

}


async function getUserAccountsController(req, res){
  const accounts = await accountModel.find({ user: req.user._id });

  res.status(200).json({
    accounts
  });

}


async function getAccountBalanceController(req, res){
  const { accountId } = req.params;

  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id
  })

  if(!account){
    return res.status(404).json({
      message: "Account not found"
    })
  }
  
  const balance = await account.getBalance();

  res.status(200).json({
    accountId: account._id,
    balance: balance
  })

}

async function getTotalBalanceController(req, res) {
  const userId = req.user._id;

  const accounts = await accountModel.find({ user: userId }).lean();

  let totalBalance = 0;

  for (let account of accounts) {
    const balance = await account.getBalance();
    totalBalance += balance;
  }

  res.status(200).json({
    totalBalance: totalBalance,
  });
}


/**
 * - update account status controller
 * - POST /api/accounts/update-status?accountId=xxx&status=ACTIVE/CLOSED
 * - protected route
 */
async function updateAccountStatusController(req, res){
  const { accountId, status } = req.query;

  if(!accountId || !status){
    return res.statu(400).json({
      message: "accountId and status query parameters are required"
    })
  }

  if( !["ACTIVE", "CLOSED"].includes(status) ){
    return res.status(400).json({
      message: "Invalid status value. Status should be either ACTIVE or CLOSED"
    })
  }

  const account = await accountModel.findOneAndUpdate(
    {
      _id: accountId,
      user: req.user._id
    }, 
    { status: status },
    { new: true }
  )

  if(!account){
    return res.status(404).json({
      message: "Account not found for the user"
    })
  }

  return res.status(200).json({
    message: "Account status updated successfully",
    account
  })

}


async function freezeAccountController(req, res){

  const accountId = req.params.accountId;

  if(!accountId){
    return res.status(400).json({
      message: "accountId parameter is required"
    })
  }

  const account = await accountModel.findOneAndUpdate(
    { _id: accountId},
    { status: "FROZEN" },
    { new: true }
  )

  if(!account){
    return res.status(404).json({
      message: "Account not found"
    })
  }

  return res.status(200).json({
    message: "Account frozen successfully",
    account
  })

}


module.exports = {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
  getTotalBalanceController,
  updateAccountStatusController,
  freezeAccountController,
};