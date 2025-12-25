const httpStatus = require('http-status');
const { Wallet, Transaction } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const transactionService = require('./transaction.service');

/**
 * Create wallet for user
 * @param {ObjectId} userId
 * @param {number} initialBalance
 * @returns {Promise<Wallet>}
 */
const createWallet = async (userId, initialBalance = 1000000) => {
  // Check if wallet already exists
  const existingWallet = await Wallet.findOne({ userId });
  if (existingWallet) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Wallet already exists for this user');
  }

  // Create wallet
  const wallet = await Wallet.create({
    userId,
    balance: initialBalance,
    lockedAmount: 0,
    availableBalance: initialBalance,
    initialBalance,
    totalProfit: 0,
    totalLoss: 0,
  });

  // Create initial deposit transaction
  await transactionService.createTransaction({
    userId,
    walletId: wallet._id,
    type: 'credit',
    amount: initialBalance,
    reason: 'initial_deposit',
    balanceBefore: 0,
    balanceAfter: initialBalance,
    description: 'Initial virtual balance credited',
  });

  return wallet;
};

/**
 * Get wallet by userId
 * @param {ObjectId} userId
 * @returns {Promise<Wallet>}
 */
const getWalletByUserId = async (userId) => {
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required');
  }
  
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wallet not found for this user');
  }
  return wallet;
};

/**
 * Get wallet balance
 * @param {ObjectId} userId
 * @returns {Promise<Object>}
 */
const getWalletBalance = async (userId) => {
  const wallet = await getWalletByUserId(userId);
  
  return {
    balance: wallet.balance,
    availableBalance: wallet.availableBalance,
    lockedAmount: wallet.lockedAmount,
    initialBalance: wallet.initialBalance,
    totalProfit: wallet.totalProfit,
    totalLoss: wallet.totalLoss,
    netPL: wallet.netPL,
    returnPercentage: wallet.returnPercentage,
  };
};

/**
 * Add funds to wallet (admin/bonus)
 * @param {ObjectId} userId
 * @param {number} amount
 * @param {string} reason
 * @param {string} description
 * @returns {Promise<Wallet>}
 */
const addFunds = async (userId, amount, reason = 'admin_credit', description = '') => {
  // Validate inputs
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required');
  }
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Amount must be a valid number');
  }
  
  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Amount must be greater than 0');
  }
  
  if (amount > 100000000) { // Max 10 crore
    throw new ApiError(httpStatus.BAD_REQUEST, 'Amount exceeds maximum limit of ₹10,00,00,000');
  }

  const wallet = await getWalletByUserId(userId);
  const balanceBefore = wallet.balance;

  try {
    // Add to balance
    wallet.credit(amount);
    await wallet.save();

    // Create transaction record
    await transactionService.createTransaction({
      userId,
      walletId: wallet._id,
      type: 'credit',
      amount,
      reason,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: description || `Funds added: ₹${amount.toLocaleString('en-IN')}`,
    });

    return wallet;
  } catch (error) {
    // Rollback on failure
    wallet.balance = balanceBefore;
    wallet.updateAvailableBalance();
    await wallet.save();
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to add funds: ${error.message}`);
  }
};

/**
 * Deduct funds from wallet (for order execution)
 * @param {ObjectId} userId
 * @param {number} amount
 * @param {string} reason
 * @param {ObjectId} orderId
 * @param {string} description
 * @returns {Promise<Wallet>}
 */
const deductFunds = async (userId, amount, reason = 'stock_buy', orderId = null, description = '') => {
  // Validate inputs
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required');
  }
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Amount must be a valid number');
  }
  
  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Amount must be greater than 0');
  }

  const wallet = await getWalletByUserId(userId);
  const balanceBefore = wallet.balance;

  // Check sufficient balance with detailed message
  if (!wallet.hasSufficientBalance(amount)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST, 
      `Insufficient balance. Required: ₹${amount.toLocaleString('en-IN')}, Available: ₹${wallet.availableBalance.toLocaleString('en-IN')}`
    );
  }

  try {
    // Deduct from balance
    wallet.deduct(amount);
    await wallet.save();

    // Create transaction record
    await transactionService.createTransaction({
      userId,
      walletId: wallet._id,
      type: 'debit',
      amount,
      reason,
      orderId,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: description || `Funds deducted: ₹${amount.toLocaleString('en-IN')}`,
    });

    return wallet;
  } catch (error) {
    // Rollback on failure
    wallet.balance = balanceBefore;
    wallet.updateAvailableBalance();
    await wallet.save();
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to deduct funds: ${error.message}`);
  }
};

/**
 * Lock amount for pending order
 * @param {ObjectId} userId
 * @param {number} amount
 * @param {ObjectId} orderId
 * @returns {Promise<Wallet>}
 */
// eslint-disable-next-line no-unused-vars
const lockFunds = async (userId, amount, orderId) => {
  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Amount must be greater than 0');
  }

  const wallet = await getWalletByUserId(userId);

  // Lock amount
  wallet.lockAmount(amount);
  await wallet.save();

  return wallet;
};

/**
 * Unlock amount when order is cancelled
 * @param {ObjectId} userId
 * @param {number} amount
 * @param {ObjectId} orderId
 * @returns {Promise<Wallet>}
 */
const unlockFunds = async (userId, amount, orderId) => {
  // Validate inputs
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required');
  }
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Amount must be a valid number');
  }
  
  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Amount must be greater than 0');
  }

  const wallet = await getWalletByUserId(userId);
  
  // Validate locked amount
  if (amount > wallet.lockedAmount) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot unlock ₹${amount.toLocaleString('en-IN')}. Only ₹${wallet.lockedAmount.toLocaleString('en-IN')} is locked.`
    );
  }

  try {
    // Unlock amount
    wallet.unlockAmount(amount);
    await wallet.save();

    // Create refund transaction
    await transactionService.createTransaction({
      userId,
      walletId: wallet._id,
      type: 'credit',
      amount,
      reason: 'refund',
      orderId,
      balanceBefore: wallet.balance, 
      balanceAfter: wallet.balance,
      description: `Order cancelled - funds unlocked: ₹${amount.toLocaleString('en-IN')}`,
    });

    return wallet;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to unlock funds: ${error.message}`);
  }
};

/**
 * Execute order - deduct locked amount
 * @param {ObjectId} userId
 * @param {number} lockedAmount
 * @param {number} actualAmount
 * @param {ObjectId} orderId
 * @returns {Promise<Wallet>}
 */
const executeOrderPayment = async (userId, lockedAmount, actualAmount, orderId) => {
  const wallet = await getWalletByUserId(userId);
  const balanceBefore = wallet.balance;

  // Unlock the locked amount first
  wallet.unlockAmount(lockedAmount);

  // Deduct actual amount from balance
  wallet.deduct(actualAmount);
  await wallet.save();

  // If there's a difference, handle it
  const difference = lockedAmount - actualAmount;
  if (difference > 0) {
    // Refund the extra locked amount
    await transactionService.createTransaction({
      userId,
      walletId: wallet._id,
      type: 'credit',
      amount: difference,
      reason: 'refund',
      orderId,
      balanceBefore: wallet.balance - difference,
      balanceAfter: wallet.balance,
      description: `Excess locked amount refunded: ₹${difference}`,
    });
  }

  // Create debit transaction for actual order
  await transactionService.createTransaction({
    userId,
    walletId: wallet._id,
    type: 'debit',
    amount: actualAmount,
    reason: 'stock_buy',
    orderId,
    balanceBefore,
    balanceAfter: wallet.balance,
    description: `Order executed - Amount: ₹${actualAmount}`,
  });

  return wallet;
};

/**
 * Credit profit/loss from selling stocks
 * @param {ObjectId} userId
 * @param {number} amount
 * @param {ObjectId} orderId
 * @param {boolean} isProfit
 * @returns {Promise<Wallet>}
 */
const creditSaleProceeds = async (userId, amount, orderId, isProfit = true) => {
  const wallet = await getWalletByUserId(userId);
  const balanceBefore = wallet.balance;

  // Add to balance
  wallet.credit(amount);

  // Update profit/loss tracking
  if (isProfit) {
    wallet.totalProfit += amount;
  } else {
    wallet.totalLoss += Math.abs(amount);
  }

  await wallet.save();

  // Create transaction record
  await transactionService.createTransaction({
    userId,
    walletId: wallet._id,
    type: 'credit',
    amount,
    reason: isProfit ? 'profit_realized' : 'stock_sell',
    orderId,
    balanceBefore,
    balanceAfter: wallet.balance,
    description: `Stock sold - ${isProfit ? 'Profit' : 'Sale'}: ₹${amount}`,
  });

  return wallet;
};

/**
 * Get transaction history
 * @param {ObjectId} userId
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const getTransactionHistory = async (userId, filter = {}, options = {}) => {
  const query = { userId, ...filter };
  const transactions = await Transaction.paginate(query, {
    ...options,
    sortBy: options.sortBy || 'createdAt:desc',
  });
  return transactions;
};

/**
 * Get transaction summary
 * @param {ObjectId} userId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Object>}
 */
const getTransactionSummary = async (userId, startDate, endDate) => {
  return Transaction.getTransactionSummary(userId, startDate, endDate);
};

module.exports = {
  createWallet,
  getWalletByUserId,
  getWalletBalance,
  addFunds,
  deductFunds,
  lockFunds,
  unlockFunds,
  executeOrderPayment,
  creditSaleProceeds,
  getTransactionHistory,
  getTransactionSummary,
};
