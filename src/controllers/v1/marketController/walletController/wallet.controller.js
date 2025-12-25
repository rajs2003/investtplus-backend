const httpStatus = require('http-status');
const pick = require('../../../../utils/pick');
const ApiError = require('../../../../utils/ApiError');
const catchAsync = require('../../../../utils/catchAsync');
const { walletService, transactionService } = require('../../../../services');

/**
 * Get wallet balance
 */
const getWalletBalance = catchAsync(async (req, res) => {
  const wallet = await walletService.getWalletBalance(req.user.id);
  res.status(httpStatus.OK).send(wallet);
});

/**
 * Get wallet details
 */
const getWalletDetails = catchAsync(async (req, res) => {
  const wallet = await walletService.getWalletByUserId(req.user.id);
  res.status(httpStatus.OK).send({
    balance: wallet.balance,
    availableBalance: wallet.availableBalance,
    lockedAmount: wallet.lockedAmount,
    initialBalance: wallet.initialBalance,
    totalProfit: wallet.totalProfit,
    totalLoss: wallet.totalLoss,
    netPL: wallet.netPL,
    returnPercentage: wallet.returnPercentage,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  });
});

/**
 * Add funds to wallet (admin only)
 */
const addFunds = catchAsync(async (req, res) => {
  const { userId, amount, reason, description } = req.body;
  const wallet = await walletService.addFunds(userId, amount, reason, description);
  res.status(httpStatus.OK).send({
    message: 'Funds added successfully',
    wallet: {
      balance: wallet.balance,
      availableBalance: wallet.availableBalance,
    },
  });
});

/**
 * Get transaction history
 */
const getTransactionHistory = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['type', 'reason', 'orderId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // Add date range filter if provided
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) {
      filter.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  const result = await walletService.getTransactionHistory(req.user.id, filter, options);
  res.status(httpStatus.OK).send(result);
});

/**
 * Get transaction summary
 */
const getTransactionSummary = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const summary = await walletService.getTransactionSummary(req.user.id, startDate, endDate);
  res.status(httpStatus.OK).send(summary);
});

/**
 * Get single transaction details
 */
const getTransaction = catchAsync(async (req, res) => {
  const transaction = await transactionService.getTransactionById(req.params.transactionId);
  
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }

  // Check if transaction belongs to user
  if (transaction.userId.toString() !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }

  res.status(httpStatus.OK).send(transaction);
});

module.exports = {
  getWalletBalance,
  getWalletDetails,
  addFunds,
  getTransactionHistory,
  getTransactionSummary,
  getTransaction,
};
