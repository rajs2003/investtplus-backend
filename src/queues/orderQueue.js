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

// Redis configuration for Bull Queue
const getRedisConfig = () => {
  // Priority 1: Use REDIS_URL if available (production/Render/Railway)
  if (config.redis.url) {
    return config.redis.url;
  }

  // Priority 2: Use separate host/port (local development)
  if (config.redis.host && config.redis.port) {
    return {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
    };
  }

  // Fallback: No Redis configured
  logger.warn('No Redis configuration found - Bull queue will not be initialized');
  return null;
};

const redisConfig = getRedisConfig();

// Only create queue if Redis is configured
const orderQueue = redisConfig
  ? new Queue('order-execution', {
      redis: redisConfig,
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
    })
  : null;

// Queue event handlers (only if queue is initialized)
if (orderQueue) {
  orderQueue.on('ready', () => {
    logger.info('Order queue connected to Redis successfully');
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
    });
  });

  // Redis client error handler
  orderQueue.on('client:error', (error) => {
    logger.error('Order queue Redis client error', {
      errorMessage: error.message,
      errorCode: error.code,
    });
  });
} else {
  logger.warn('Bull queue not initialized - Redis not configured');
}

module.exports = orderQueue;
