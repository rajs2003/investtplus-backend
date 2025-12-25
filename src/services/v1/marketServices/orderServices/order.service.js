const httpStatus = require('http-status');
const { Order } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const { walletService } = require('../walletServices/wallet.service');
const chargesService = require('./charges.service');
const marketTiming = require('../../../../utils/marketTiming');

/**
 * Place a new order
 * @param {ObjectId} userId - User ID
 * @param {Object} orderData - Order details
 * @returns {Promise<Order>}
 */
const placeOrder = async (userId, orderData) => {
  const { symbol, exchange, orderType, orderVariant, transactionType, quantity, price, triggerPrice } = orderData;

  // Step 1: Validate market timing
  const timingValidation = marketTiming.validateOrderTiming(orderType);
  if (!timingValidation.allowed) {
    throw new ApiError(httpStatus.BAD_REQUEST, timingValidation.reason);
  }

  // Step 2: Validate quantity
  if (!quantity || quantity <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quantity must be greater than 0');
  }
  if (quantity > 10000) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quantity cannot exceed 10,000 shares per order');
  }

  // Step 3: Validate price for limit orders
  if (orderVariant === 'limit' && (!price || price <= 0)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Price is required for limit orders');
  }

  // Step 4: Validate trigger price for SL/SLM orders
  if ((orderVariant === 'sl' || orderVariant === 'slm') && (!triggerPrice || triggerPrice <= 0)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Trigger price is required for stop loss orders');
  }

  // Step 5: For market orders, get current price (dummy price for now)
  // TODO: Integrate with AngelOne API for real prices
  let estimatedPrice = price || 100; // Default dummy price
  if (orderVariant === 'market') {
    // In production, fetch from AngelOne/Redis cache
    estimatedPrice = 100; // Placeholder
  }

  // Step 6: Calculate charges
  const charges = chargesService.calculateCharges({
    orderType,
    transactionType,
    quantity,
    price: estimatedPrice,
  });

  // Step 7: For BUY orders, check wallet balance and lock funds
  if (transactionType === 'buy') {
    // Get wallet
    const wallet = await walletService.getWalletByUserId(userId);
    if (!wallet) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Wallet not found');
    }

    // Check sufficient balance
    if (!wallet.hasSufficientBalance(charges.netAmount)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Insufficient balance. Required: ₹${charges.netAmount.toLocaleString('en-IN')}, Available: ₹${wallet.availableBalance.toLocaleString('en-IN')}`
      );
    }

    // Lock funds
    await walletService.lockFunds(userId, charges.netAmount, null); // orderId will be added after order creation
  }

  // Step 8: For SELL orders, validate holdings (TODO: will be implemented in Phase 3)
  if (transactionType === 'sell') {
    // TODO: Check if user has sufficient holdings
    // For now, we'll allow sell orders for testing
  }

  // Step 9: Create order
  try {
    const order = await Order.create({
      userId,
      symbol,
      exchange,
      tradingSymbol: `${symbol}-EQ`,
      symbolToken: '', // TODO: Get from AngelOne
      orderType,
      orderVariant,
      transactionType,
      quantity,
      price: orderVariant === 'limit' ? price : estimatedPrice,
      triggerPrice: triggerPrice || 0,
      status: 'pending',
      orderValue: charges.orderValue,
      brokerage: charges.brokerage,
      stt: charges.stt,
      transactionCharges: charges.transactionCharges,
      gst: charges.gst,
      sebiCharges: charges.sebiCharges,
      stampDuty: charges.stampDuty,
      totalCharges: charges.totalCharges,
      netAmount: charges.netAmount,
      description: `${transactionType.toUpperCase()} ${quantity} shares of ${symbol} at ${orderVariant} price`,
    });

    // Step 10: Update locked amount with orderId
    if (transactionType === 'buy') {
      // The funds are already locked, just update the order reference
      // In future, we might want to track orderId in wallet transactions
    }

    return order;
  } catch (error) {
    // Rollback: Unlock funds if order creation fails
    if (transactionType === 'buy') {
      try {
        await walletService.unlockFunds(userId, charges.netAmount, null);
      } catch (unlockError) {
        // Log error but don't throw
        console.error('Failed to unlock funds during rollback:', unlockError);
      }
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to place order: ${error.message}`);
  }
};

/**
 * Cancel an order
 * @param {ObjectId} orderId - Order ID
 * @param {ObjectId} userId - User ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Order>}
 */
const cancelOrder = async (orderId, userId, reason = 'User cancelled') => {
  // Step 1: Get order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Step 2: Verify ownership
  if (order.userId.toString() !== userId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to cancel this order');
  }

  // Step 3: Check if order can be cancelled
  if (order.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot cancel order with status: ${order.status}`);
  }

  // Step 4: Unlock funds for buy orders
  if (order.transactionType === 'buy') {
    await walletService.unlockFunds(userId, order.netAmount, orderId);
  }

  // Step 5: Update order status
  order.markAsCancelled(reason);
  await order.save();

  return order;
};

/**
 * Get orders with filters and pagination
 * @param {ObjectId} userId - User ID
 * @param {Object} filter - Filter options
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>}
 */
const getOrders = async (userId, filter = {}, options = {}) => {
  const query = { userId };

  // Apply filters
  if (filter.status) {
    query.status = filter.status;
  }
  if (filter.orderType) {
    query.orderType = filter.orderType;
  }
  if (filter.transactionType) {
    query.transactionType = filter.transactionType;
  }
  if (filter.symbol) {
    query.symbol = filter.symbol.toUpperCase();
  }
  if (filter.startDate || filter.endDate) {
    query.createdAt = {};
    if (filter.startDate) {
      query.createdAt.$gte = new Date(filter.startDate);
    }
    if (filter.endDate) {
      query.createdAt.$lte = new Date(filter.endDate);
    }
  }

  // Pagination
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

  const total = await Order.countDocuments(query);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get order by ID
 * @param {ObjectId} orderId - Order ID
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Order>}
 */
const getOrderById = async (orderId, userId) => {
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Verify ownership
  if (order.userId.toString() !== userId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to view this order');
  }

  return order;
};

/**
 * Get pending orders
 * @param {ObjectId} userId - User ID (optional, for specific user)
 * @returns {Promise<Array>}
 */
const getPendingOrders = async (userId = null) => {
  return await Order.getPendingOrders(userId);
};

/**
 * Get today's orders
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Array>}
 */
const getTodayOrders = async (userId) => {
  return await Order.getTodayOrders(userId);
};

/**
 * Get order history
 * @param {ObjectId} userId - User ID
 * @param {Object} filter - Filter options
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>}
 */
const getOrderHistory = async (userId, filter = {}, options = {}) => {
  // Add status filter for executed orders
  filter.status = filter.status || { $in: ['executed', 'cancelled', 'rejected', 'expired'] };
  
  return await getOrders(userId, filter, options);
};

module.exports = {
  placeOrder,
  cancelOrder,
  getOrders,
  getOrderById,
  getPendingOrders,
  getTodayOrders,
  getOrderHistory,
};
