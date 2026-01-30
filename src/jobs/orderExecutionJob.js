/* eslint-disable no-unused-vars */
const orderQueue = require('../queues/orderQueue');
const { orderExecutionService } = require('../services');
const { Order } = require('../models');
const logger = require('../config/logger');

/**
 * Process pending limit and stop-loss orders
 * Checks if price conditions are met and executes orders
 * FIFO (First In First Out): Orders are processed in the order they were created
 */
orderQueue.process('check-pending-orders', async (job) => {
  try {
    logger.info('Starting pending orders check job', { jobId: job.id });

    // Get all pending limit and stop-loss orders
    // IMPORTANT: .sort({ createdAt: 1 }) ensures FIFO - oldest orders first
    const pendingOrders = await Order.find({
      status: 'pending',
      orderVariant: { $in: ['limit', 'sl', 'slm'] },
    }).sort({ createdAt: 1 }); // FIFO: Process orders in creation order

    if (pendingOrders.length === 0) {
      return { message: 'No pending orders to process', count: 0 };
    }

    logger.info(`Found ${pendingOrders.length} pending orders to check (FIFO order)`);

    const results = {
      total: pendingOrders.length,
      executed: 0,
      failed: 0,
      pending: 0,
      errors: [],
    };

    // Process each pending order in FIFO sequence
    for (const order of pendingOrders) {
      try {
        let executed = false;

        // Check and execute limit orders
        if (order.orderVariant === 'limit') {
          const result = await orderExecutionService.executeLimitOrder(order._id);
          if (result) {
            results.executed++;
            executed = true;
            logger.info(`Limit order ${order._id} executed successfully`, {
              orderId: order._id,
              symbol: order.symbol,
              price: result.executedPrice,
            });
          }
        }

        // Check and execute stop-loss orders
        if (order.orderVariant === 'sl' || order.orderVariant === 'slm') {
          const result = await orderExecutionService.executeStopLossOrder(order._id);
          if (result) {
            results.executed++;
            executed = true;
            logger.info(`Stop-loss order ${order._id} executed successfully`, {
              orderId: order._id,
              symbol: order.symbol,
              price: result.executedPrice,
            });
          }
        }

        if (!executed) {
          results.pending++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          orderId: order._id,
          error: error.message,
        });
        logger.error(`Failed to process order ${order._id}`, {
          orderId: order._id,
          error: error.message,
        });
      }
    }

    logger.info('Pending orders check job completed', {
      jobId: job.id,
      results,
    });

    return results;
  } catch (error) {
    logger.error('Pending orders check job failed', {
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Process individual order execution
 * Used for manual order execution or retry
 */
orderQueue.process('execute-order', async (job) => {
  const { orderId, orderVariant } = job.data;

  try {
    logger.info('Executing order', { jobId: job.id, orderId, orderVariant });

    let result;

    if (orderVariant === 'market') {
      result = await orderExecutionService.executeMarketOrder(orderId);
    } else if (orderVariant === 'limit') {
      result = await orderExecutionService.executeLimitOrder(orderId);
    } else if (orderVariant === 'sl' || orderVariant === 'slm') {
      result = await orderExecutionService.executeStopLossOrder(orderId);
    } else {
      throw new Error(`Unknown order variant: ${orderVariant}`);
    }

    if (result) {
      logger.info('Order executed successfully', {
        jobId: job.id,
        orderId,
        executedPrice: result.executedPrice,
      });
      return { success: true, result };
    }

    return { success: false, message: 'Order conditions not met yet' };
  } catch (error) {
    logger.error('Order execution job failed', {
      jobId: job.id,
      orderId,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Start the recurring job to check pending orders
 * Runs every 2 seconds
 */
const startOrderMonitoring = async () => {
  try {
    // Clear any existing jobs
    await orderQueue.clean(0, 'completed');
    await orderQueue.clean(0, 'failed');

    // Add recurring job to check pending orders every 2 seconds
    await orderQueue.add(
      'check-pending-orders',
      {},
      {
        repeat: {
          every: 2000, // 2 seconds
        },
        jobId: 'check-pending-orders-recurring',
      },
    );

    logger.info('Order monitoring job started - checking pending orders every 2 seconds');
    return true;
  } catch (error) {
    logger.error('Failed to start order monitoring', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Stop the recurring job
 */
const stopOrderMonitoring = async () => {
  try {
    await orderQueue.removeRepeatable('check-pending-orders', {
      every: 2000,
    });
    logger.info('Order monitoring job stopped');
    return true;
  } catch (error) {
    logger.error('Failed to stop order monitoring', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Add a single order execution job
 */
const queueOrderExecution = async (orderId, orderVariant) => {
  try {
    const job = await orderQueue.add('execute-order', {
      orderId,
      orderVariant,
    });

    logger.info('Order execution job queued', {
      jobId: job.id,
      orderId,
      orderVariant,
    });

    return job;
  } catch (error) {
    logger.error('Failed to queue order execution', {
      orderId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get queue stats
 */
const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      orderQueue.getWaitingCount(),
      orderQueue.getActiveCount(),
      orderQueue.getCompletedCount(),
      orderQueue.getFailedCount(),
      orderQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    logger.error('Failed to get queue stats', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * ========================================
 * INTRADAY AUTO SQUARE-OFF JOB
 * ========================================
 * Automatically closes all intraday positions at market close
 * This prevents users from carrying intraday positions overnight
 */
orderQueue.process('auto-square-off-intraday', async (job) => {
  try {
    logger.info('Starting intraday auto square-off job', { jobId: job.id });

    const { Holding } = require('../models');
    const fundManager = require('../services/v1/marketServices/walletServices/fundManager.service');
    const marketConfig = require('../config/market.config');

    // Find all open intraday positions
    const intradayHoldings = await Holding.find({
      holdingType: { $in: ['intraday', 'MIS'] },
      quantity: { $ne: 0 }, // Either positive (long) or negative (short)
    });

    if (intradayHoldings.length === 0) {
      logger.info('No intraday positions to square off');
      return { message: 'No intraday positions found', count: 0 };
    }

    logger.info(`Found ${intradayHoldings.length} intraday positions to square off`);

    const results = {
      total: intradayHoldings.length,
      squaredOff: 0,
      failed: 0,
      errors: [],
    };

    for (const holding of intradayHoldings) {
      try {
        // Get current market price
        const currentPrice = await getCurrentMarketPrice(holding.symbol, holding.exchange);

        const isLongPosition = holding.quantity > 0;
        const absQuantity = Math.abs(holding.quantity);

        // Create auto square-off order
        const squareOffOrder = await Order.create({
          userId: holding.userId,
          symbol: holding.symbol,
          exchange: holding.exchange,
          tradingSymbol: `${holding.symbol}-EQ`,
          orderType: 'intraday',
          orderVariant: 'market',
          transactionType: isLongPosition ? 'sell' : 'buy', // Reverse the position
          quantity: absQuantity,
          price: currentPrice,
          status: 'pending',
          description: `Auto square-off: ${isLongPosition ? 'SELL' : 'BUY'} ${absQuantity} ${holding.symbol} @ Market`,
        });

        // Execute the square-off order immediately
        await orderExecutionService.executeMarketOrder(squareOffOrder._id);

        // Calculate P&L
        const buyPrice = isLongPosition ? holding.averageBuyPrice : currentPrice;
        const sellPrice = isLongPosition ? currentPrice : holding.averageBuyPrice;
        const pnl = (sellPrice - buyPrice) * absQuantity;

        logger.info(`Intraday position squared off successfully`, {
          holdingId: holding._id,
          symbol: holding.symbol,
          quantity: holding.quantity,
          pnl: pnl.toFixed(2),
        });

        results.squaredOff++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          holdingId: holding._id,
          symbol: holding.symbol,
          error: error.message,
        });
        logger.error(`Failed to square off intraday position ${holding._id}`, {
          holdingId: holding._id,
          symbol: holding.symbol,
          error: error.message,
        });
      }
    }

    logger.info('Intraday auto square-off job completed', {
      jobId: job.id,
      results,
    });

    return results;
  } catch (error) {
    logger.error('Intraday auto square-off job failed', {
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Helper function to get current market price
 */
const getCurrentMarketPrice = async (symbol, exchange = 'NSE') => {
  const { marketDataService } = require('../services/v1/mockMarket');
  try {
    const priceData = marketDataService.getCurrentPrice(symbol.toUpperCase(), exchange);
    return priceData.data.ltp;
  } catch (error) {
    throw new Error(`Unable to fetch price for ${symbol}: ${error.message}`);
  }
};

/**
 * Schedule auto square-off job to run at market close time
 * @returns {Promise<boolean>}
 */
const scheduleAutoSquareOff = async () => {
  try {
    const marketConfig = require('../config/market.config');
    const autoSquareOffTime = marketConfig.autoSquareOff.intraday.time || '15:20';
    const [hours, minutes] = autoSquareOffTime.split(':').map(Number);

    // Schedule job to run daily at specified time
    await orderQueue.add(
      'auto-square-off-intraday',
      {},
      {
        repeat: {
          cron: `${minutes} ${hours} * * 1-5`, // Run Mon-Fri at specified time
        },
        jobId: 'auto-square-off-recurring',
      },
    );

    logger.info(`Auto square-off scheduled for ${autoSquareOffTime} IST (Mon-Fri)`);
    return true;
  } catch (error) {
    logger.error('Failed to schedule auto square-off', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Stop auto square-off job
 */
const stopAutoSquareOff = async () => {
  try {
    const marketConfig = require('../config/market.config');
    const autoSquareOffTime = marketConfig.autoSquareOff.intraday.time || '15:20';
    const [hours, minutes] = autoSquareOffTime.split(':').map(Number);

    await orderQueue.removeRepeatable('auto-square-off-intraday', {
      cron: `${minutes} ${hours} * * 1-5`,
    });
    logger.info('Auto square-off job stopped');
    return true;
  } catch (error) {
    logger.error('Failed to stop auto square-off', {
      error: error.message,
    });
    throw error;
  }
};

module.exports = {
  startOrderMonitoring,
  stopOrderMonitoring,
  queueOrderExecution,
  getQueueStats,
  scheduleAutoSquareOff,
  stopAutoSquareOff,
};
