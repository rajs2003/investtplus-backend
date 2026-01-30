const Queue = require('bull');
const config = require('../config/config');
const logger = require('../config/logger');

/**
 * Order Execution Queue
 * Processes pending limit and stop-loss orders in background
 * FIFO (First In First Out) Implementation:
 * Orders are processed in the order they were created (createdAt timestamp)
 * Bull queue ensures job processing order is maintained
 * Background job sorts orders by createdAt before processing
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
  settings: {
    lockDuration: 30000, // 30 seconds
    stalledInterval: 30000,
    maxStalledCount: 1,
  },
});

// Queue event handlers
orderQueue.on('ready', () => {
  logger.info('Order queue connected to Redis successfully', {
    host: config.redis.host,
    port: config.redis.port,
  });
});

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
  logger.error('Order queue error - Bull queue connection issue', {
    errorMessage: error.message,
    errorName: error.name,
    errorCode: error.code,
    stack: error.stack,
    redisConfig: {
      host: config.redis.host,
      port: config.redis.port,
      hasPassword: !!config.redis.password,
    },
  });
});

// Redis client error handler
orderQueue.on('client:error', (error) => {
  logger.error('Order queue Redis client error', {
    errorMessage: error.message,
    errorCode: error.code,
    redisConfig: {
      host: config.redis.host,
      port: config.redis.port,
    },
  });
});

module.exports = orderQueue;
