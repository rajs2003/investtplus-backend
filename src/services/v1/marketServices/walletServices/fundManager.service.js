const httpStatus = require('http-status');
const ApiError = require('../../../../utils/ApiError');
const walletService = require('./wallet.service');
const transactionService = require('./transaction.service');

/**
 * Fund Manager Service
 * Handles wallet fund operations with a flexible and clean approach
 */

/**
 * Validate fund amount
 * @param {number} amount - Amount to validate
 * @param {string} operation - Operation name for error message
 * @throws {ApiError} If amount is invalid
 */
const validateAmount = (amount, operation = 'operation') => {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid amount for ${operation}`);
  }

  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Amount must be greater than 0 for ${operation}`);
  }
};

/**
 * Check if wallet has sufficient available balance
 * @param {Object} wallet - Wallet document
 * @param {number} requiredAmount - Required amount
 * @returns {Object} { hasBalance: boolean, shortfall: number }
 */
const checkSufficientBalance = (wallet, requiredAmount) => {
  const hasBalance = wallet.availableBalance >= requiredAmount;
  const shortfall = hasBalance ? 0 : requiredAmount - wallet.availableBalance;

  return { hasBalance, shortfall, available: wallet.availableBalance };
};

/**
 * Reserve funds for order (lock funds)
 * This is called when an order is placed but not yet executed
 * @param {ObjectId} userId - User ID
 * @param {number} amount - Amount to reserve
 * @param {string} orderId - Order ID for reference
 * @returns {Promise<Object>} { success: boolean, wallet: Wallet, lockedAmount: number }
 */
// eslint-disable-next-line no-unused-vars
const reserveFunds = async (userId, amount, orderId = null) => {
  validateAmount(amount, 'fund reservation');

  const wallet = await walletService.getWalletByUserId(userId);

  // Check if sufficient balance is available
  const balanceCheck = checkSufficientBalance(wallet, amount);
  if (!balanceCheck.hasBalance) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient balance. Required: ₹${amount.toLocaleString('en-IN')}, Available: ₹${balanceCheck.available.toLocaleString('en-IN')}, Shortfall: ₹${balanceCheck.shortfall.toLocaleString('en-IN')}`,
    );
  }

  // Lock the amount
  wallet.lockAmount(amount);
  await wallet.save();

  return {
    success: true,
    wallet,
    lockedAmount: amount,
    availableBalance: wallet.availableBalance,
  };
};

/**
 * Release reserved funds (unlock funds)
 * This is called when an order is cancelled or rejected before execution
 * @param {ObjectId} userId - User ID
 * @param {number} amount - Amount to release
 * @param {string} orderId - Order ID for reference
 * @param {string} reason - Reason for release
 * @returns {Promise<Object>} { success: boolean, wallet: Wallet, releasedAmount: number }
 */
const releaseFunds = async (userId, amount, orderId = null, reason = 'Order cancelled') => {
  validateAmount(amount, 'fund release');

  const wallet = await walletService.getWalletByUserId(userId);

  // Check if amount can be unlocked
  if (amount > wallet.lockedAmount) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot release ₹${amount.toLocaleString('en-IN')}. Only ₹${wallet.lockedAmount.toLocaleString('en-IN')} is currently locked.`,
    );
  }

  const balanceBefore = wallet.balance;

  // Unlock the amount
  wallet.unlockAmount(amount);
  await wallet.save();

  // Create transaction record for tracking
  await transactionService.createTransaction({
    userId,
    walletId: wallet._id,
    type: 'credit',
    amount, // Available balance increases via unlock
    reason: 'refund',
    orderId,
    balanceBefore,
    balanceAfter: wallet.balance,
    description: `${reason} - Funds released: ₹${amount.toLocaleString('en-IN')}`,
  });

  return {
    success: true,
    wallet,
    releasedAmount: amount,
    availableBalance: wallet.availableBalance,
  };
};

/**
 * Settle order payment (execute payment from reserved funds)
 * This is called when an order is executed
 * @param {ObjectId} userId - User ID
 * @param {number} reservedAmount - Amount that was reserved
 * @param {number} actualAmount - Actual amount to deduct
 * @param {string} orderId - Order ID
 * @param {Object} metadata - Additional metadata for transaction
 * @returns {Promise<Object>} { success: boolean, wallet: Wallet, deducted: number, refunded: number }
 */
const settleOrderPayment = async (userId, reservedAmount, actualAmount, orderId, metadata = {}) => {
  if (typeof reservedAmount !== 'number' || isNaN(reservedAmount) || !isFinite(reservedAmount) || reservedAmount < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid reserved amount for settlement');
  }
  validateAmount(actualAmount, 'actual amount');

  const wallet = await walletService.getWalletByUserId(userId);
  const balanceBefore = wallet.balance;

  // Check if actual amount can be deducted from balance
  if (actualAmount > wallet.balance) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient balance for settlement. Required: ₹${actualAmount.toLocaleString('en-IN')}, Available: ₹${wallet.balance.toLocaleString('en-IN')}`,
    );
  }

  // Unlock only what's available (min of reserved amount and current locked amount)
  // This handles cases where multiple orders are being settled simultaneously
  const amountToUnlock = Math.min(reservedAmount, wallet.lockedAmount);
  if (amountToUnlock > 0) {
    wallet.unlockAmount(amountToUnlock);
  }

  // Deduct the actual amount
  wallet.deduct(actualAmount);

  await wallet.save();

  // Calculate difference for refund or additional charge tracking
  const difference = reservedAmount - actualAmount;

  // Create transaction for the actual payment
  await transactionService.createTransaction({
    userId,
    walletId: wallet._id,
    type: 'debit',
    amount: actualAmount,
    reason: metadata.reason || 'stock_buy',
    orderId,
    balanceBefore,
    balanceAfter: wallet.balance,
    description: metadata.description || `Order executed - Amount: ₹${actualAmount.toLocaleString('en-IN')}`,
  });

  // If there's a refund (reserved > actual), create a refund record
  if (difference > 0) {
    await transactionService.createTransaction({
      userId,
      walletId: wallet._id,
      type: 'credit',
      amount: difference, // Amount unlocked from reserved funds
      reason: 'refund',
      orderId,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance,
      description: `Excess reserved amount: ₹${difference.toLocaleString('en-IN')} (Reserved: ₹${reservedAmount.toLocaleString('en-IN')}, Used: ₹${actualAmount.toLocaleString('en-IN')})`,
    });
  }

  return {
    success: true,
    wallet,
    deducted: actualAmount,
    refunded: difference > 0 ? difference : 0,
    finalBalance: wallet.balance,
    availableBalance: wallet.availableBalance,
  };
};

/**
 * Credit sale proceeds to wallet
 * This is called when a sell order is executed
 * @param {ObjectId} userId - User ID
 * @param {number} amount - Amount to credit
 * @param {string} orderId - Order ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} { success: boolean, wallet: Wallet, credited: number }
 */
const creditSaleProceeds = async (userId, amount, orderId, metadata = {}) => {
  if (amount < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Sale proceeds cannot be negative');
  }

  // Allow zero amount for loss scenarios
  if (amount === 0) {
    const wallet = await walletService.getWalletByUserId(userId);
    return {
      success: true,
      wallet,
      credited: 0,
      message: 'Zero proceeds - no amount credited',
    };
  }

  validateAmount(amount, 'sale proceeds');

  const wallet = await walletService.getWalletByUserId(userId);
  const balanceBefore = wallet.balance;

  // Credit the amount
  wallet.credit(amount);

  // Update profit/loss tracking
  const { isProfit = true, profitAmount = 0, lossAmount = 0 } = metadata;

  if (isProfit && profitAmount > 0) {
    wallet.totalProfit += profitAmount;
  } else if (!isProfit && lossAmount > 0) {
    wallet.totalLoss += lossAmount;
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
    description: metadata.description || `Stock sold - ${isProfit ? 'Profit' : 'Sale'}: ₹${amount.toLocaleString('en-IN')}`,
  });

  return {
    success: true,
    wallet,
    credited: amount,
    finalBalance: wallet.balance,
    availableBalance: wallet.availableBalance,
  };
};

/**
 * Deduct funds directly from wallet (for delivery orders)
 * This immediately deducts funds without locking first
 * @param {ObjectId} userId - User ID
 * @param {number} amount - Amount to deduct
 * @param {string} orderId - Order ID for reference
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} { success: boolean, wallet: Wallet, deducted: number }
 */
const deductFunds = async (userId, amount, orderId = null, metadata = {}) => {
  validateAmount(amount, 'fund deduction');

  const wallet = await walletService.getWalletByUserId(userId);
  const balanceBefore = wallet.balance;

  // Check if sufficient balance is available
  if (amount > wallet.balance) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient balance. Required: Rs ${amount.toLocaleString('en-IN')}, Available: Rs ${wallet.balance.toLocaleString('en-IN')}`,
    );
  }

  // Deduct the amount
  wallet.deduct(amount);
  await wallet.save();

  // Create transaction record
  await transactionService.createTransaction({
    userId,
    walletId: wallet._id,
    type: 'debit',
    amount,
    reason: metadata.reason || 'stock_buy',
    orderId,
    balanceBefore,
    balanceAfter: wallet.balance,
    description: metadata.description || `Funds deducted: Rs ${amount.toLocaleString('en-IN')}`,
  });

  return {
    success: true,
    wallet,
    deducted: amount,
    finalBalance: wallet.balance,
    availableBalance: wallet.availableBalance,
  };
};

/**
 * Add funds to wallet (for refunds or corrections)
 * @param {ObjectId} userId - User ID
 * @param {number} amount - Amount to add
 * @param {string} orderId - Order ID for reference
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} { success: boolean, wallet: Wallet, added: number }
 */
const addFunds = async (userId, amount, orderId = null, metadata = {}) => {
  validateAmount(amount, 'fund addition');

  const wallet = await walletService.getWalletByUserId(userId);
  const balanceBefore = wallet.balance;

  // Credit the amount
  wallet.credit(amount);
  await wallet.save();

  // Create transaction record
  await transactionService.createTransaction({
    userId,
    walletId: wallet._id,
    type: 'credit',
    amount,
    reason: metadata.reason || 'refund',
    orderId,
    balanceBefore,
    balanceAfter: wallet.balance,
    description: metadata.description || `Funds added: Rs ${amount.toLocaleString('en-IN')}`,
  });

  return {
    success: true,
    wallet,
    added: amount,
    finalBalance: wallet.balance,
    availableBalance: wallet.availableBalance,
  };
};

/**
 * Get fund reservation status
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Fund status details
 */
const getFundStatus = async (userId) => {
  const wallet = await walletService.getWalletByUserId(userId);

  return {
    totalBalance: wallet.balance,
    availableBalance: wallet.availableBalance,
    lockedAmount: wallet.lockedAmount,
    canPlaceOrder: wallet.availableBalance > 0,
    utilizationPercentage: wallet.balance > 0 ? ((wallet.lockedAmount / wallet.balance) * 100).toFixed(2) : 0,
  };
};

module.exports = {
  validateAmount,
  checkSufficientBalance,
  reserveFunds,
  releaseFunds,
  settleOrderPayment,
  creditSaleProceeds,
  deductFunds,
  addFunds,
  getFundStatus,
};
