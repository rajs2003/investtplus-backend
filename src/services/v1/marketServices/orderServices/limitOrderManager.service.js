/**
 * Limit Order Manager Service
 * Redis-based in-memory storage for pending limit orders
 * Executes orders based on real-time price change events
 */

const { getRedisClient } = require('../../../../db/redis');
const { Order } = require('../../../../models');
const logger = require('../../../../config/logger');

// Lazy load to avoid circular dependency
let orderExecutionService;
const getOrderExecutionService = () => {
  if (!orderExecutionService) {
    orderExecutionService = require('./orderExecution.service');
  }
  return orderExecutionService;
};

// Redis keys
const PENDING_ORDERS_KEY = 'pending_limit_orders';
const ORDER_BY_SYMBOL_PREFIX = 'limit_orders:symbol:';

/**
 * Add a pending limit/SL order to Redis
 * @param {Object} order - Order object
 */
const addPendingOrder = async (order) => {
  const redisClient = getRedisClient();
  if (!redisClient) {
    logger.warn('Redis not available - skipping limit order caching');
    return false;
  }

  try {
    const orderData = {
      orderId: order.id.toString(),
      symbol: order.symbol,
      exchange: order.exchange,
      orderVariant: order.orderVariant,
      transactionType: order.transactionType,
      price: order.price,
      triggerPrice: order.triggerPrice,
      quantity: order.quantity,
      userId: order.userId.toString(),
      createdAt: order.createdAt.toISOString(),
    };

    // Store in main pending orders hash
    await redisClient.hSet(PENDING_ORDERS_KEY, order.id.toString(), JSON.stringify(orderData));

    // Store in symbol-specific set for faster lookup
    const symbolKey = `${ORDER_BY_SYMBOL_PREFIX}${order.exchange}:${order.symbol}`;
    await redisClient.sAdd(symbolKey, order.id.toString());

    // Set expiry for symbol key (7 days)
    await redisClient.expire(symbolKey, 7 * 24 * 60 * 60);

    logger.info(`Added pending ${order.orderVariant} order to Redis`, {
      orderId: order.id,
      symbol: order.symbol,
      price: order.price,
    });

    return true;
  } catch (error) {
    logger.error('Failed to add pending order to Redis:', error);
    return false;
  }
};

/**
 * Remove a pending order from Redis
 * @param {string} orderId - Order ID
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange
 */
const removePendingOrder = async (orderId, symbol, exchange) => {
  const redisClient = getRedisClient();
  if (!redisClient) return false;

  try {
    // Remove from main hash
    await redisClient.hDel(PENDING_ORDERS_KEY, orderId);

    // Remove from symbol set
    const symbolKey = `${ORDER_BY_SYMBOL_PREFIX}${exchange}:${symbol}`;
    await redisClient.sRem(symbolKey, orderId);

    logger.info(`Removed pending order from Redis`, { orderId, symbol });
    return true;
  } catch (error) {
    logger.error('Failed to remove pending order from Redis:', error);
    return false;
  }
};

/**
 * Get all pending orders for a specific symbol
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange
 * @returns {Promise<Array>} Array of pending orders
 */
const getPendingOrdersForSymbol = async (symbol, exchange) => {
  const redisClient = getRedisClient();
  if (!redisClient) return [];

  try {
    const symbolKey = `${ORDER_BY_SYMBOL_PREFIX}${exchange}:${symbol}`;
    const orderIds = await redisClient.sMembers(symbolKey);

    if (!orderIds || orderIds.length === 0) {
      return [];
    }

    const orders = [];
    for (const orderId of orderIds) {
      const orderDataStr = await redisClient.hGet(PENDING_ORDERS_KEY, orderId);
      if (orderDataStr) {
        orders.push(JSON.parse(orderDataStr));
      }
    }

    // Sort by createdAt (FIFO)
    orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return orders;
  } catch (error) {
    logger.error('Failed to get pending orders for symbol:', error);
    return [];
  }
};

/**
 * Get all pending orders from Redis
 * @returns {Promise<Array>} Array of all pending orders
 */
const getAllPendingOrders = async () => {
  const redisClient = getRedisClient();
  if (!redisClient) return [];

  try {
    const orderDataList = await redisClient.hGetAll(PENDING_ORDERS_KEY);
    const orders = Object.values(orderDataList).map((str) => JSON.parse(str));

    // Sort by createdAt (FIFO)
    orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return orders;
  } catch (error) {
    logger.error('Failed to get all pending orders:', error);
    return [];
  }
};

/**
 * Sync pending orders from MongoDB to Redis (on startup/recovery)
 */
const syncPendingOrdersToRedis = async () => {
  const redisClient = getRedisClient();
  if (!redisClient) {
    logger.warn('Redis not available - skipping order sync');
    return { success: false, count: 0 };
  }

  try {
    logger.info('Starting pending orders sync to Redis...');

    // Get all pending limit/SL orders from MongoDB
    const pendingOrders = await Order.find({
      status: 'pending',
      orderVariant: { $in: ['limit', 'sl', 'slm'] },
    }).sort({ createdAt: 1 });

    if (pendingOrders.length === 0) {
      logger.info('No pending orders to sync');
      return { success: true, count: 0 };
    }

    // Clear existing Redis data
    await redisClient.del(PENDING_ORDERS_KEY);

    // Clear all symbol-specific sets
    const symbolKeys = await redisClient.keys(`${ORDER_BY_SYMBOL_PREFIX}*`);
    if (symbolKeys.length > 0) {
      await redisClient.del(symbolKeys);
    }

    // Add each order to Redis
    let syncedCount = 0;
    for (const order of pendingOrders) {
      const success = await addPendingOrder(order);
      if (success) syncedCount++;
    }

    logger.info(`Synced ${syncedCount}/${pendingOrders.length} pending orders to Redis`);
    return { success: true, count: syncedCount };
  } catch (error) {
    logger.error('Failed to sync pending orders to Redis:', error);
    return { success: false, count: 0, error: error.message };
  }
};

/**
 * Check if order execution conditions are met
 * @param {Object} orderData - Order data from Redis
 * @param {number} currentPrice - Current market price
 * @returns {boolean} True if order should be executed
 */
const shouldExecuteOrder = (orderData, currentPrice) => {
  const { orderVariant, transactionType, price, triggerPrice } = orderData;

  if (orderVariant === 'limit') {
    // Limit Buy: Execute when market price <= limit price
    // Limit Sell: Execute when market price >= limit price
    if (transactionType === 'buy') {
      return currentPrice <= price;
    } else {
      return currentPrice >= price;
    }
  }

  if (orderVariant === 'sl' || orderVariant === 'slm') {
    // Stop Loss Buy: Execute when market price >= trigger price
    // Stop Loss Sell: Execute when market price <= trigger price
    if (transactionType === 'buy') {
      return currentPrice >= triggerPrice;
    } else {
      return currentPrice <= triggerPrice;
    }
  }

  return false;
};

/**
 * Process price change event and execute eligible orders
 * NO FIFO - Process all matching orders in parallel for better performance
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange
 * @param {number} currentPrice - Current market price (LTP)
 */
const processPriceChange = async (symbol, exchange, currentPrice) => {
  try {
    // Get pending orders for this symbol
    const pendingOrders = await getPendingOrdersForSymbol(symbol, exchange);

    if (pendingOrders.length === 0) {
      return { processed: 0, executed: 0, failed: 0 };
    }

    const results = {
      processed: pendingOrders.length,
      executed: 0,
      failed: 0,
      orders: [],
    };

    // PARALLEL PROCESSING - No FIFO, execute all eligible orders simultaneously
    const executionPromises = pendingOrders.map(async (orderData) => {
      try {
        // Check if conditions are met
        if (!shouldExecuteOrder(orderData, currentPrice)) {
          return { status: 'skipped', orderId: orderData.orderId };
        }

        logger.info(`Executing ${orderData.orderVariant} order on price match`, {
          orderId: orderData.orderId,
          symbol: orderData.symbol,
          targetPrice: orderData.price || orderData.triggerPrice,
          currentPrice,
        });

        // Execute the order (lazy load to avoid circular dependency)
        const execService = getOrderExecutionService();
        let executedOrder = null;
        if (orderData.orderVariant === 'limit') {
          executedOrder = await execService.executeLimitOrder(orderData.orderId);
        } else if (orderData.orderVariant === 'sl' || orderData.orderVariant === 'slm') {
          executedOrder = await execService.executeStopLossOrder(orderData.orderId);
        }

        if (executedOrder) {
          // Remove from Redis
          await removePendingOrder(orderData.orderId, symbol, exchange);

          logger.info(`Order ${orderData.orderId} executed @ ₹${executedOrder.executedPrice}`);

          return {
            status: 'executed',
            orderId: orderData.orderId,
            executedPrice: executedOrder.executedPrice,
          };
        }

        return { status: 'not_executed', orderId: orderData.orderId };
      } catch (error) {
        logger.error(`Failed to execute order ${orderData.orderId}: ${error.message}`);

        // If order is no longer pending (cancelled/rejected), remove from Redis
        try {
          const dbOrder = await Order.findById(orderData.orderId);
          if (dbOrder && dbOrder.status !== 'pending') {
            await removePendingOrder(orderData.orderId, symbol, exchange);
          }
        } catch (dbError) {
          // Ignore DB errors
          console.log('Error checking order status in DB:', dbError.message);
        }

        return { status: 'failed', orderId: orderData.orderId, error: error.message };
      }
    });

    // Wait for all executions to complete
    const executionResults = await Promise.all(executionPromises);

    // Count results
    executionResults.forEach((result) => {
      if (result.status === 'executed') {
        results.executed++;
        results.orders.push(result);
      } else if (result.status === 'failed') {
        results.failed++;
      }
    });

    if (results.executed > 0) {
      logger.info(`${results.executed} order(s) executed for ${symbol}`);
    }

    return results;
  } catch (error) {
    logger.error(`Error processing price change for ${symbol}:`, error);
    return { processed: 0, executed: 0, failed: 0, error: error.message };
  }
};

/**
 * Get Redis stats
 */
const getStats = async () => {
  const redisClient = getRedisClient();
  if (!redisClient) {
    return { available: false };
  }

  try {
    const totalOrders = await redisClient.hLen(PENDING_ORDERS_KEY);
    const symbolKeys = await redisClient.keys(`${ORDER_BY_SYMBOL_PREFIX}*`);

    return {
      available: true,
      totalPendingOrders: totalOrders,
      symbolsWithOrders: symbolKeys.length,
    };
  } catch (error) {
    logger.error('Failed to get Redis stats:', error);
    return { available: false, error: error.message };
  }
};

module.exports = {
  addPendingOrder,
  removePendingOrder,
  getPendingOrdersForSymbol,
  getAllPendingOrders,
  syncPendingOrdersToRedis,
  processPriceChange,
  getStats,
};
