/* eslint-disable no-unused-vars */
const httpStatus = require('http-status');
const { Order } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const orderHelpers = require('./orderHelpers');
const marketConfig = require('../../../../config/market.config');
const { marketDataService } = require('../../mockMarket');
const limitOrderManager = require('./limitOrderManager.service');
const fundManager = require('../walletServices/fundManager.service');
const orderExecutionService = require('./orderExecution.service');
const { Holding, Position } = require('../../../../models');

/**
 * ========================================
 * ORDER PLACEMENT SERVICE - SIMPLIFIED
 * ========================================
 *
 * Complex fund management and holdings logic removed.
 * This is a clean slate for implementing your own order flow.
 *
 * Current flow:
 * 1. Validate order data
 * 2. Create order in database
 * 3. For limit orders: Store in Redis
 * 4. Return order
 *
 * Fund reservation and holdings updates are commented out.
 * ========================================
 */

/**
 * Place a new order
 * @param {ObjectId} userId - User ID
 * @param {Object} orderData - Order details
 * @returns {Promise<Order>}
 */
const placeOrder = async (userId, orderData) => {
  const { symbol, exchange, orderType, orderVariant, transactionType, quantity, price, triggerPrice } = orderData;

  // Tracks whether margin was actually reserved — used in failure cleanup and reservedAmount field
  let intradayReservationNeeded = false;

  const normalizedOrderType = orderType === 'MIS' || orderType === 'mis' ? 'intraday' : orderType.toLowerCase();

  const marketStatus = marketDataService.getMarketStatus();

  if (marketStatus.status === 'CLOSED') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Market is closed. Reason: ${marketStatus.reason}. Orders can only be placed during market hours (${marketConfig.marketHours.regular.start} - ${marketConfig.marketHours.regular.end} IST).`,
    );
  }

  orderHelpers.validateOrderData({ ...orderData, orderType: normalizedOrderType });

  if (!marketConfig.orderSettings.allowedOrderTypes.includes(orderVariant.toUpperCase())) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Order variant '${orderVariant}' is not allowed. Allowed types: ${marketConfig.orderSettings.allowedOrderTypes.join(', ')}`,
    );
  }

  if (!marketConfig.orderSettings.allowedProductTypes.includes(normalizedOrderType.toUpperCase())) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Order type '${normalizedOrderType}' is not allowed. Allowed types: ${marketConfig.orderSettings.allowedProductTypes.join(', ')}`,
    );
  }

  if (quantity < marketConfig.orderSettings.minQuantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum order quantity is ${marketConfig.orderSettings.minQuantity}`);
  }

  if (quantity > marketConfig.orderSettings.maxQuantity) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Maximum order quantity is ${marketConfig.orderSettings.maxQuantity} per order`,
    );
  }

  let currentPriceData;
  try {
    currentPriceData = marketDataService.getCurrentPrice(symbol.toUpperCase(), exchange || 'NSE');
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Unable to fetch price for ${symbol}. Please check symbol and exchange.`);
  }

  const marketPrice = currentPriceData.data.ltp;
  const symbolToken = currentPriceData.data.symbolToken;
  const companyName = currentPriceData.data.companyName;

  let estimatedPrice = orderHelpers.getEstimatedExecutionPrice(orderData, marketPrice);
  if (orderVariant === 'market') {
    const slippage = marketConfig.orderSettings.marketOrderSlippage;
    if (transactionType === 'buy') {
      estimatedPrice = marketPrice * (1 + slippage); // Buy at slightly higher
    } else {
      estimatedPrice = marketPrice * (1 - slippage); // Sell at slightly lower
    }
  }

  const charges = orderHelpers.calculateOrderCharges(
    {
      orderType: normalizedOrderType,
      transactionType,
      quantity,
      price: estimatedPrice,
    },
    exchange || 'NSE',
  );

  const marginRequired = marketConfig.margins[normalizedOrderType]?.required || 1.0;
  const requiredFunds = charges.orderValue * marginRequired + charges.totalCharges;

  // Step 9: Fund validation and holdings check
  if (normalizedOrderType === 'delivery' && transactionType === 'sell') {
    // Check if user has holdings for delivery sell
    const holding = await Holding.findOne({
      userId,
      symbol: symbol.toUpperCase(),
      exchange: exchange || 'NSE',
      holdingType: 'delivery',
    });

    if (!holding) {
      throw new ApiError(httpStatus.BAD_REQUEST, `No holdings found for ${symbol}. Cannot place delivery sell order.`);
    }

    if (holding.quantity < quantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Insufficient holdings. Available: ${holding.quantity}, Requested: ${quantity}`,
      );
    }
  } else if (normalizedOrderType === 'delivery' && transactionType === 'buy') {
    // For delivery buy, deduct funds immediately (not reserve)
    try {
      await fundManager.deductFunds(userId, requiredFunds, null, {
        reason: 'stock_buy',
        description: `Funds deducted for delivery buy order: ${quantity} ${symbol} @ Rs ${estimatedPrice.toFixed(2)}`,
      });
      console.log(`Funds deducted for delivery buy: Rs ${requiredFunds.toFixed(2)}`);
    } catch (fundError) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Insufficient funds. ${fundError.message}. Required: Rs ${requiredFunds.toFixed(2)}`,
      );
    }
  } else if (normalizedOrderType === 'intraday') {
    // Reserve margin ONLY for new positions (long open or short open).
    // For squareoff (sell against existing long) or cover (buy against existing short),
    // the original position's margin is already locked — no new reservation needed.
    const existingIntradayPosition = await Position.findOne({
      userId,
      symbol: symbol.toUpperCase(),
      exchange: exchange || 'NSE',
      positionType: 'intraday',
      isSquaredOff: false,
    });

    const isCoveringShort = transactionType === 'buy' && existingIntradayPosition && existingIntradayPosition.quantity < 0;
    const isSquaringOffLong =
      transactionType === 'sell' && existingIntradayPosition && existingIntradayPosition.quantity > 0;

    intradayReservationNeeded = !isCoveringShort && !isSquaringOffLong;

    if (intradayReservationNeeded) {
      try {
        await fundManager.reserveFunds(userId, requiredFunds, null);
        console.log(`Funds reserved for intraday ${transactionType} order: Rs ${requiredFunds.toFixed(2)}`);
      } catch (fundError) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Insufficient funds for reservation. ${fundError.message}. Required: Rs ${requiredFunds.toFixed(2)}`,
        );
      }
    } else {
      console.log(
        `Skipping margin reservation — intraday ${transactionType} is ${
          isCoveringShort ? 'covering a short' : 'squaring off a long'
        } position for ${symbol}`,
      );
    }
  }

  // Step 11: Create order with all market data
  let order;
  try {
    order = await Order.create({
      userId,
      symbol: symbol.toUpperCase(),
      exchange: exchange || 'NSE',
      tradingSymbol: `${symbol.toUpperCase()}-EQ`,
      symbolToken: symbolToken || '',
      orderType: normalizedOrderType,
      orderVariant,
      transactionType,
      quantity,
      price: orderVariant === 'limit' || orderVariant === 'sl' ? price : estimatedPrice,
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
      // For intraday: store the actual reserved margin (0 for squareoff/cover orders)
      // For delivery: store the net amount deducted
      reservedAmount:
        normalizedOrderType === 'intraday' ? (intradayReservationNeeded ? requiredFunds : 0) : charges.netAmount,
      description: orderHelpers.formatOrderDescription({
        transactionType,
        quantity,
        symbol: symbol.toUpperCase(),
        orderVariant,
        price: price || estimatedPrice,
        triggerPrice,
        companyName,
      }),
    });

    console.log(
      `Order created: ${normalizedOrderType.toUpperCase()} ${transactionType.toUpperCase()} ${quantity} ${symbol} @ Rs ${estimatedPrice.toFixed(2)}`,
    );
  } catch (error) {
    // Order creation failed - refund/release funds
    console.error(`Order creation failed: ${error.message}`);

    if (normalizedOrderType === 'delivery' && transactionType === 'buy') {
      await fundManager.addFunds(userId, requiredFunds, null, {
        reason: 'refund',
        description: 'Refund due to order creation failure',
      });
    } else if (normalizedOrderType === 'intraday' && intradayReservationNeeded) {
      await fundManager.releaseFunds(userId, requiredFunds, null, 'Order creation failed');
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to place order: ${error.message}`);
  }

  // Step 12: Execute market orders immediately or store limit orders in Redis
  try {
    if (orderVariant === 'market') {
      // Execute market orders immediately
      console.log(`Executing market order ${order._id} immediately...`);
      const executedOrder = await orderExecutionService.executeOrder(order._id);
      return executedOrder;
    } else if (orderVariant === 'limit') {
      // Store limit orders in Redis for price-based execution
      await limitOrderManager.addPendingOrder(order);
      console.log(`Limit order ${order._id} stored in Redis for price monitoring`);
      return order;
    } else if (orderVariant === 'sl' || orderVariant === 'slm') {
      // TODO: Implement stop-loss order handling
      console.log(`Stop-loss order ${order._id} created but execution not implemented yet`);
      return order;
    }

    return order;
  } catch (executionError) {
    // Execution failed - handle cleanup
    console.error(`Order execution failed: ${executionError.message}`);

    // Mark order as rejected
    order.status = 'rejected';
    order.rejectionReason = executionError.message;
    await order.save();

    // Refund/release funds
    if (normalizedOrderType === 'delivery' && transactionType === 'buy') {
      await fundManager.addFunds(userId, requiredFunds, order._id, {
        reason: 'refund',
        description: 'Refund due to order execution failure',
      });
    } else if (normalizedOrderType === 'intraday' && intradayReservationNeeded) {
      await fundManager.releaseFunds(userId, requiredFunds, order._id, 'Order execution failed');
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Order execution failed: ${executionError.message}`);
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

  // Step 4: Calculate and release/refund funds
  // For intraday orders, use reservedAmount (the actual locked amount)
  // For delivery orders, use netAmount (the deducted amount)
  const refundAmount = order.orderType === 'intraday' ? order.reservedAmount : order.netAmount;

  if (order.orderType === 'delivery' && order.transactionType === 'buy') {
    // Delivery buy: Refund deducted funds
    try {
      await fundManager.addFunds(userId, refundAmount, orderId, {
        reason: 'order_cancelled',
        description: `Order cancelled - Refund: Rs ${refundAmount.toLocaleString('en-IN')}`,
      });
      console.log(`Funds refunded for cancelled delivery buy order ${orderId}: Rs ${refundAmount}`);
    } catch (fundError) {
      console.error(`Failed to refund funds for order ${orderId}:`, fundError.message);
    }
  } else if (order.orderType === 'intraday') {
    // Intraday: Release reserved funds
    try {
      await fundManager.releaseFunds(userId, refundAmount, orderId, 'Order cancelled by user');
      console.log(`Funds released for cancelled intraday order ${orderId}: Rs ${refundAmount}`);
    } catch (fundError) {
      console.error(`Failed to release funds for order ${orderId}:`, fundError.message);
    }
  }

  // Step 5: Remove from Redis if it's a limit/SL order
  if (order.orderVariant === 'limit' || order.orderVariant === 'sl' || order.orderVariant === 'slm') {
    try {
      await limitOrderManager.removePendingOrder(orderId.toString(), order.symbol, order.exchange);
      console.log(`Removed cancelled order ${orderId} from Redis`);
    } catch (redisError) {
      console.error('Failed to remove order from Redis:', redisError);
    }
  }

  // Step 6: Update order status
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
