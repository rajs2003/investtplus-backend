const logger = require('../config/logger');
const config = require('../config/config');
const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  if (!config.redis.url) {
    logger.warn('REDIS_URL not found - skipping Redis connection');
    return null;
  }

  try {
    redisClient = redis.createClient({
      url: config.redis.url,
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
    return null;
  }
};

connectRedis();

const getRedisClient = () => {
  if (!redisClient) {
    logger.warn('Redis client not initialized');
    return null;
  }
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient,
};
