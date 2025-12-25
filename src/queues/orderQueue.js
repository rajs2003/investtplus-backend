const Queue = require('bull');
const config = require('../config/config');
const logger = require('../config/logger');

/**
 * Order Execution Queue
 * Processes pending limit and stop-loss orders in background
 */
const orderQueue = new Queue('order-execution', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
});

// Queue event handlers
orderQueue.on('completed', (job, result) => {
  logger.info(`Order execution job ${job.id} completed`, {
    jobId: job.id,
    result,
  });
});

orderQueue.on('failed', (job, err) => {
  logger.error(`Order execution job ${job.id} failed`, {
    jobId: job.id,
    error: err.message,
    stack: err.stack,
  });
});

orderQueue.on('stalled', (job) => {
  logger.warn(`Order execution job ${job.id} stalled`, {
    jobId: job.id,
  });
});

orderQueue.on('error', (error) => {
  logger.error('Order queue error', {
    error: error.message,
    stack: error.stack,
  });
});

module.exports = orderQueue;
