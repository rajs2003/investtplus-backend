const orderQueue = require('../queues/orderQueue');
const { orderExecutionService } = require('../services');
const { Order } = require('../models');
const logger = require('../config/logger');

/**
 * Process pending limit and stop-loss orders
 * Checks if price conditions are met and executes orders
 */
orderQueue.process('check-pending-orders', async (job) => {
  try {
    logger.info('Starting pending orders check job', { jobId: job.id });

    // Get all pending limit and stop-loss orders
    const pendingOrders = await Order.find({
      status: 'pending',
      orderVariant: { $in: ['limit', 'sl', 'slm'] },
    }).sort({ createdAt: 1 });

    if (pendingOrders.length === 0) {
      return { message: 'No pending orders to process', count: 0 };
    }

    logger.info(`Found ${pendingOrders.length} pending orders to check`);

    const results = {
      total: pendingOrders.length,
      executed: 0,
      failed: 0,
      pending: 0,
      errors: [],
    };

    // Process each pending order
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
      stack: error.stack,
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
      stack: error.stack,
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
      stack: error.stack,
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

module.exports = {
  startOrderMonitoring,
  stopOrderMonitoring,
  queueOrderExecution,
  getQueueStats,
};
