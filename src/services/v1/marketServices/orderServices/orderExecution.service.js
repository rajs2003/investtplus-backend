const httpStatus = require('http-status');
const { Order } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const { marketDataService } = require('../../mockMarket');

/**
 * ========================================
 * ORDER EXECUTION SERVICE - SIMPLIFIED
 * ========================================
 *
 * This is a simplified version for fresh implementation.
 * Complex execution logic, fund manager, and holdings have been removed.
 *
 * For now, market orders are simply marked as executed.
 * You can implement your custom execution logic here.
 * ========================================
 */

/**
 * Get current market price for a symbol
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange (NSE/BSE)
 * @returns {Promise<number>} Current market price
 */
const getCurrentMarketPrice = async (symbol, exchange = 'NSE') => {
  try {
    const priceData = marketDataService.getCurrentPrice(symbol.toUpperCase(), exchange);
    return priceData.data.ltp;
  } catch (error) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Unable to fetch current price for ${symbol} on ${exchange}: ${error.message}`,
    );
  }
};

/**
 * Execute a market order - SIMPLIFIED VERSION
 * For now, just marks the order as executed without complex logic
 *
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order>}
 */
const executeMarketOrder = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (order.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Order is already ${order.status}`);
  }

  // Get current market price
  const marketPrice = await getCurrentMarketPrice(order.symbol, order.exchange);

  // Simple execution - mark as executed at market price
  order.markAsExecuted(marketPrice, order.quantity);
  await order.save();

  console.log(`✅ Order ${orderId} executed at ₹${marketPrice}`);

  return order;
};

/**
 * Execute a limit order - PLACEHOLDER
 * Implement your custom limit order execution logic here
 *
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order|null>} Order if executed, null if conditions not met
 */
const executeLimitOrder = async (orderId) => {
  // TODO: Implement limit order execution logic
  console.log(`⚠️ Limit order execution not implemented yet: ${orderId}`);
  return null; // Not implemented yet
};

/**
 * Execute a stop loss order - PLACEHOLDER
 * Implement your custom stop loss execution logic here
 *
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order|null>} Order if executed, null if conditions not met
 */
const executeStopLossOrder = async (orderId) => {
  // TODO: Implement stop loss order execution logic
  console.log(`⚠️ Stop loss order execution not implemented yet: ${orderId}`);
  return null; // Not implemented yet
};

module.exports = {
  getCurrentMarketPrice,
  executeMarketOrder,
  executeLimitOrder,
  executeStopLossOrder,
};
