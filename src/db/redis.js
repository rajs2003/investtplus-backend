const logger = require('../config/logger');

const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      host: 'localhost',
      port: 14351,
    });

    // Handle connection events
    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    await redisClient.connect(); // Connect to Redis
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
  }
};

// Call the function to connect to Redis when this module is imported
connectRedis();

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client is not initialized');
  }
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient,
};
