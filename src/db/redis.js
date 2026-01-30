const logger = require('../config/logger');
const config = require('../config/config');
const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  // Skip Redis if not configured (optional for deployment)
  if (!config.redis.host || !config.redis.port) {
    logger.warn('Redis configuration not found - skipping Redis connection');
    return null;
  }

  try {
    redisClient = redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      // Optional: Add password if Redis requires authentication
      // password: config.redis.password,
    });

    // Handle connection events
    redisClient.on('connect', () => {
      logger.info(`Connected to Redis at ${config.redis.host}:${config.redis.port}`);
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisClient.on('reconnecting', () => {
      logger.info('Reconnecting to Redis...');
    });

    await redisClient.connect(); // Connect to Redis
    return redisClient;
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
    // Don't crash the app if Redis fails (make it optional)
    return null;
  }
};

// Call the function to connect to Redis when this module is imported
connectRedis();

const getRedisClient = () => {
  if (!redisClient) {
    logger.warn('Redis client is not initialized - operations will be skipped');
    return null;
  }
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient,
};
