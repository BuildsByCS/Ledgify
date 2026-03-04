const accountModel = require("../models/account.model");
const ledgerModel = require("../models/ledger.model");


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


async function getAllUsersAccountsController(req, res){
  const allAccounts = await accountModel.find().populate("user", { "_id": 1, "email": 1, "name": 1 });

  res.status(200).json({
    allAccounts: allAccounts
  })

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

  const accounts = await accountModel.find({ user: userId });

  let totalBalance = 0;

  for (let account of accounts) {
    const balance = await account.getBalance();
    totalBalance += balance;
  }

  res.status(200).json({
    totalBalance: totalBalance,
  });
}


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


async function defreezeAccountController(req, res) {
  const accountId = req.params.accountId;

  if (!accountId) {
    return res.status(400).json({
      message: "accountId parameter is required",
    });
  }

  const account = await accountModel.findOneAndUpdate(
    { _id: accountId },
    { status: "ACTIVE" },
    { new: true },
  );

  if (!account) {
    return res.status(404).json({
      message: "Account not found",
    });
  }

  return res.status(200).json({
    message: "Successfully defrozen and activated the account",
    account,
  });
}


async function getLedgerEntriesChart(req, res) {
    const accountId = req.params.accountId;

    if (!accountId) {
        return res.status(400).json({
            message: "accountId query parameter is required",
        });
    }

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id,
    });

    if (!account) {
        return res.status(404).json({
            message: "Account not found for the user",
        });
    }

    const endDate = new Date(); // current date
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // 7 days ago

    const transactions = await ledgerModel
        .find(
            {
                account: accountId,
                createdAt: {
                    $gte: startDate, // greater than or equal to start date
                    $lte: endDate,   // less than or equal to end date
                },
            },
            { amount: 1, type: 1, createdAt: 1, _id: 0 } // projection
        )
        .sort({ createdAt: 1 }); // sort by creation date for chart display

    return res.status(200).json({
        accountId: accountId,
        transactions: transactions,
    });
}


async function getLedgerEntriesList(req, res) {
    const { accountId, page = 1, limit = 10 } = req.query;

    if (!accountId) {
        return res.status(400).json({
            message: "accountId query parameter is required",
        });
    }

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id,
    });

    if (!account) {
        return res.status(404).json({
            message: "Account not found for the user",
        });
    }

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({ message: "Invalid page number. Must be a positive integer." });
    }
    if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ message: "Invalid limit. Must be a positive integer." });
    }

    const skip = (parsedPage - 1) * parsedLimit;

    const transactions = await ledgerModel
      .find({ account: accountId })
      .select({ amount: 1, type: 1, createdAt: 1, transaction: 1, _id: 0 })
      .sort({ createdAt: -1 }) // descending order: latest transactions first
      .skip(skip)
      .limit(parsedLimit);

    const totalCount = await ledgerModel.countDocuments({ account: accountId });

    return res.status(200).json({
        accountId: accountId,
        transactions: transactions,
        pagination: {
            currentPage: parsedPage,
            totalPages: Math.ceil(totalCount / parsedLimit),
            totalEntries: totalCount,
            limit: parsedLimit,
        },
    });

}


module.exports = {
  createAccountController,
  getUserAccountsController,
  getAllUsersAccountsController,
  getAccountBalanceController,
  getTotalBalanceController,
  updateAccountStatusController,
  freezeAccountController,
  defreezeAccountController,
  getLedgerEntriesChart,
  getLedgerEntriesList,
};