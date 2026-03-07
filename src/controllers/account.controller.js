const accountModel = require("../models/account.model");
const ledgerModel = require("../models/ledger.model");
const { toRupees } = require("../utils/money");


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
  const accounts = await accountModel.find({ user: req.user._id }).lean();

  res.status(200).json({
    accounts
  });

}


async function getAllUsersAccountsController(req, res){

  const allAccounts = await accountModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        pipeline: [
          { $match: { systemUser: false } },
          { $project: { _id: 1, email: 1, name: 1 } }
        ],
        as: "user"
      }
    },
    { $unwind: "$user" },   // removes accounts where user didn't match
    {
      $project: {
        _id: 1,
        user: 1,
        status: 1,
        currency: 1,
        createdAt: 1,
        updatedAt: 1
      }
    }
  ]);

  
  res.status(200).json({
    allAccounts: allAccounts,
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
    balance: toRupees(balance)
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
    totalBalance: toRupees(totalBalance),
  });
}


async function updateAccountStatusController(req, res){
  const { accountId, status } = req.body;

  if(!accountId || !status){
    return res.status(400).json({
      message: "accountId and status query parameters are required"
    })
  }

  if( !["ACTIVE", "CLOSED"].includes(status) ){
    return res.status(400).json({
      message: "Invalid status value. Status should be either ACTIVE or CLOSED"
    })
  }

  const account = await accountModel.findOne({
      _id: accountId,
      user: req.user._id
    }
  );

  if(!account){
    return res.status(404).json({
      message: "Account not found for the user"
    })
  }

  if(account.status === "FROZEN"){
    return res.status(400).json({
      message: "Account is Frozen by system user. Please contact support."
    })
  }

  if (account.status === status) {
    return res.status(400).json({
      message: `Account is already ${status}`,
    });
  }

  account.status = status;
  await account.save();

  return res.status(200).json({
    message: "Account status updated successfully",
    account
  })

}

async function updateAccountStatusSystemController(req, res) {

  const { accountId, status } = req.body;

  if (!accountId || !status) {
    return res.status(400).json({
      message: "accountId and status are required"
    });
  }

  const allowedStatuses = ["ACTIVE", "CLOSED", "FROZEN"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid status value. Allowed values: ACTIVE, CLOSED, FROZEN"
    });
  }

  let account = await accountModel.findById(accountId);

  if (!account) {
    return res.status(404).json({
      message: "Account not found",
    });
  }

  if (account.status === status) {
    return res.status(400).json({
      message: `Account is already ${status}`,
    });
  }

  if(account.status === "FROZEN" && status === "CLOSED"){
    return res.status(400).json({
      message: "Cannot directly close a frozen account. Please activate it first."
    })
  }

  if(account.status === "CLOSED" && status === "FROZEN"){
    return res.status(400).json({
      message: "Cannot freeze a closed account. Please activate it first."
    })
  }

  account.status = status;
  await account.save();


  return res.status(200).json({
    message: `Account status updated successfully to ${status}`,
    account
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
    }).lean();

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
        .sort({ createdAt: 1 }).lean(); // sort by creation date for chart display

    return res.status(200).json({
        accountId: accountId,
        transactions: transactions.map(tx => ({
          ...tx,
          amount: toRupees(tx.amount)
        })),
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
    }).lean();

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

    const [transactions, totalCount] = await Promise.all([
      ledgerModel
        .find({ account: accountId })
        .select({ amount: 1, type: 1, createdAt: 1, transaction: 1, _id: 0 })
        .sort({ createdAt: -1 }) // descending order: latest transactions first
        .skip(skip)
        .limit(parsedLimit)
        .lean(),

      ledgerModel.countDocuments({ account: accountId }),
    ]);


    return res.status(200).json({
        accountId: accountId,
        transactions: transactions.map(tx => ({
          ...tx,
          amount: toRupees(tx.amount)
        })),
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
  updateAccountStatusSystemController,
  getLedgerEntriesChart,
  getLedgerEntriesList,
};