const { Trade } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../../../../config/logger');

/**
 * Get user's trade history with filters
 * @param {ObjectId} userId
 * @param {Object} filter - { symbol, tradeType, startDate, endDate, isProfit }
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>}
 */
const getTradeHistory = async (userId, filter = {}, options = {}) => {
  try {
    const result = await Trade.getUserTrades(userId, filter, {
      page: options.page || 1,
      limit: options.limit || 10,
      sortBy: options.sortBy || '-sellDate',
    });

    logger.info('Trade history retrieved', {
      userId,
      count: result.results.length,
      total: result.totalResults,
    });

    return result;
  } catch (error) {
    logger.error('Failed to get trade history', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get trade by ID
 * @param {ObjectId} tradeId
 * @param {ObjectId} userId - For ownership verification
 * @returns {Promise<Trade>}
 */
const getTradeById = async (tradeId, userId) => {
  const trade = await Trade.findById(tradeId)
    .populate('buyOrderId', 'orderVariant createdAt executedAt')
    .populate('sellOrderId', 'orderVariant createdAt executedAt');

  if (!trade) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trade not found');
  }

  if (trade.userId.toString() !== userId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }

  return trade;
};

/**
 * Get trade statistics for a user
 * @param {ObjectId} userId
 * @param {Object} filter - { startDate, endDate, tradeType }
 * @returns {Promise<Object>}
 */
const getTradeStatistics = async (userId, filter = {}) => {
  try {
    const stats = await Trade.getTradeStats(userId, filter);

    logger.info('Trade statistics retrieved', {
      userId,
      totalTrades: stats.totalTrades,
      winRate: stats.winRate,
    });

    return stats;
  } catch (error) {
    logger.error('Failed to get trade statistics', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get today's trades
 * @param {ObjectId} userId
 * @returns {Promise<Array<Trade>>}
 */
const getTodayTrades = async (userId) => {
  try {
    const trades = await Trade.getTodayTrades(userId);

    logger.info("Today's trades retrieved", {
      userId,
      count: trades.length,
    });

    return trades;
  } catch (error) {
    logger.error("Failed to get today's trades", {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get profitable trades
 * @param {ObjectId} userId
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>}
 */
const getProfitableTrades = async (userId, options = {}) => {
  return getTradeHistory(userId, { isProfit: true }, options);
};

/**
 * Get losing trades
 * @param {ObjectId} userId
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>}
 */
const getLosingTrades = async (userId, options = {}) => {
  return getTradeHistory(userId, { isProfit: false }, options);
};

module.exports = {
  getTradeHistory,
  getTradeById,
  getTradeStatistics,
  getTodayTrades,
  getProfitableTrades,
  getLosingTrades,
};
