/* eslint-disable no-unused-vars */
const httpStatus = require('http-status');
const { Order } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const fundManager = require('../walletServices/fundManager.service');
const holdingService = require('../holdingServices/holding.service');
const orderHelpers = require('./orderHelpers');
const marketConfig = require('../../../../config/market.config');
const { marketDataService } = require('../../mockMarket');

/**
 * ========================================
 * ORDER PLACEMENT SERVICE
 * ========================================
 *
 * Handles order placement with proper validations
 *
 * KEY FEATURES:
 *
 * 1. INTRADAY SHORT SELLING SUPPORT
 *    - Users can sell stocks without holdings in intraday
 *    - Margin/leverage balance is checked and locked
 *    - Both BUY and SELL require margin for intraday orders
 *
 * 2. DELIVERY ORDER TRADITIONAL FLOW
 *    - BUY requires 100% funds
 *    - SELL requires holdings validation
 *
 * 3. VALIDATION FLOW:
 *    - Market status check
 *    - Order data validation
 *    - Quantity limits check
 *    - Price validation
 *    - Margin/fund requirements check
 *    - Holdings check (for delivery sell only)
 *
 * 4. FUND MANAGEMENT:
 *    - INTRADAY (BUY/SELL): Margin locked (e.g., 20%)
 *    - DELIVERY BUY: Full amount locked (100%)
 *    - DELIVERY SELL: No funds locked (holdings validated)
 *
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

  // Normalize orderType (convert MIS to intraday)
  const normalizedOrderType = orderType === 'MIS' || orderType === 'mis' ? 'intraday' : orderType.toLowerCase();

  // Step 1: Check market status
  const marketStatus = marketDataService.getMarketStatus();
  if (marketStatus.status === 'CLOSED') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Market is closed. Reason: ${marketStatus.reason}. Orders can only be placed during market hours (${marketConfig.marketHours.regular.start} - ${marketConfig.marketHours.regular.end} IST).`,
    );
  }

  // Step 2: Validate order data against config
  orderHelpers.validateOrderData({ ...orderData, orderType: normalizedOrderType });

  // Step 3: Validate order type and product type from config
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

  // Step 4: Validate quantity limits from config
  if (quantity < marketConfig.orderSettings.minQuantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum order quantity is ${marketConfig.orderSettings.minQuantity}`);
  }

  if (quantity > marketConfig.orderSettings.maxQuantity) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Maximum order quantity is ${marketConfig.orderSettings.maxQuantity} per order`,
    );
  }

  // Step 5: Get current market price from market data service
  let currentPriceData;
  try {
    currentPriceData = marketDataService.getCurrentPrice(symbol.toUpperCase(), exchange || 'NSE');
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Unable to fetch price for ${symbol}. Please check symbol and exchange.`);
  }

  const marketPrice = currentPriceData.data.ltp;
  const symbolToken = currentPriceData.data.symbolToken;
  const companyName = currentPriceData.data.companyName;

  // Step 6: Apply market order slippage if applicable
  let estimatedPrice = orderHelpers.getEstimatedExecutionPrice(orderData, marketPrice);
  if (orderVariant === 'market') {
    const slippage = marketConfig.orderSettings.marketOrderSlippage;
    if (transactionType === 'buy') {
      estimatedPrice = marketPrice * (1 + slippage); // Buy at slightly higher
    } else {
      estimatedPrice = marketPrice * (1 - slippage); // Sell at slightly lower
    }
  }

  // Step 7: Calculate charges using config-based calculation
  const charges = orderHelpers.calculateOrderCharges(
    {
      orderType: normalizedOrderType,
      transactionType,
      quantity,
      price: estimatedPrice,
    },
    exchange || 'NSE',
  );

  // Step 8: Check margin requirements from config
  const marginRequired = marketConfig.margins[normalizedOrderType]?.required || 1.0;
  const requiredFunds = charges.orderValue * marginRequired + charges.totalCharges;

  // Step 9: Fund validation and reservation based on order type and transaction type
  let reservedFunds = null;

  // For INTRADAY orders - support short selling (both buy and sell check leverage balance)
  if (normalizedOrderType === 'intraday') {
    // INTRADAY: Both BUY and SELL require margin/leverage balance check
    // This allows short selling - user can sell first without holdings
    try {
      reservedFunds = await fundManager.reserveFunds(userId, requiredFunds);
      console.log(
        `✅ Intraday ${transactionType.toUpperCase()} order - Margin reserved: ₹${requiredFunds.toFixed(2)} (${(marginRequired * 100).toFixed(0)}% of ₹${charges.orderValue.toFixed(2)})`,
      );
    } catch (error) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Insufficient funds for intraday ${transactionType} order. Required: ₹${requiredFunds.toFixed(2)} (including ${(marginRequired * 100).toFixed(0)}% margin). ${error.message}`,
      );
    }
  }
  // For DELIVERY orders - traditional flow
  else if (normalizedOrderType === 'delivery') {
    if (transactionType === 'buy') {
      // DELIVERY BUY: Reserve full amount (100% margin)
      try {
        reservedFunds = await fundManager.reserveFunds(userId, requiredFunds);
        console.log(`✅ Delivery BUY order - Funds reserved: ₹${requiredFunds.toFixed(2)}`);
      } catch (error) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Insufficient funds for delivery buy order. Required: ₹${requiredFunds.toFixed(2)}. ${error.message}`,
        );
      }
    } else {
      // DELIVERY SELL: Must have holdings, no funds reservation needed
      const holdingValidation = await holdingService.validateHoldingForSell(
        userId,
        symbol,
        exchange || 'NSE',
        quantity,
        orderType,
      );

      if (!holdingValidation.hasHolding) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          holdingValidation.message ||
            `Insufficient holdings for ${symbol.toUpperCase()}. Cannot sell delivery without holdings.`,
        );
      }

      console.log(
        `✅ Delivery SELL validation passed: ${symbol} - Available: ${holdingValidation.available}, Selling: ${quantity}`,
      );
    }
  }

  // Step 11: Create order with all market data
  try {
    const order = await Order.create({
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
      `✅ Order placed successfully: ${normalizedOrderType.toUpperCase()} ${transactionType.toUpperCase()} ${quantity} ${symbol} @ ₹${estimatedPrice.toFixed(2)}`,
    );

    // Step 12: Queue limit/SL orders for background processing
    if (orderVariant === 'limit' || orderVariant === 'sl' || orderVariant === 'slm') {
      try {
        const { queueOrderExecution } = require('../../../jobs/orderExecutionJob');
        await queueOrderExecution(order._id, orderVariant);
        console.log(`📋 Order ${order._id} queued for background processing (${orderVariant})`);
      } catch (queueError) {
        // Log error but don't fail order placement
        console.error('Failed to queue order for processing:', queueError);
      }
    }

    return order;
  } catch (error) {
    // Rollback: Release reserved funds if order creation fails
    if (reservedFunds) {
      try {
        await fundManager.releaseFunds(userId, requiredFunds, null, 'Order creation failed');
        console.log(`🔄 Rollback: Released ₹${requiredFunds.toFixed(2)} due to order creation failure`);
      } catch (rollbackError) {
        console.error('Failed to release funds during rollback:', rollbackError);
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

  // Step 4: Release reserved funds for buy orders
  if (order.transactionType === 'buy') {
    await fundManager.releaseFunds(userId, order.netAmount, orderId, reason);
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
