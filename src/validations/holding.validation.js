const Joi = require('joi');
const { objectId } = require('./custom.validation');

/**
 * Get holdings query validation
 */
const getHoldings = {
  query: Joi.object().keys({
    holdingType: Joi.string().valid('intraday', 'delivery'),
    symbol: Joi.string().uppercase(),
  }),
};

/**
 * Get holding by symbol validation
 */
const getHoldingBySymbol = {
  params: Joi.object().keys({
    symbol: Joi.string().required().uppercase(),
  }),
  query: Joi.object().keys({
    holdingType: Joi.string().valid('intraday', 'delivery').default('intraday'),
  }),
};

/**
 * Get portfolio summary validation
 */
const getPortfolioSummary = {
  query: Joi.object().keys({}),
};

/**
 * Get trade history validation
 */
const getTradeHistory = {
  query: Joi.object().keys({
    symbol: Joi.string().uppercase(),
    tradeType: Joi.string().valid('intraday', 'delivery'),
    startDate: Joi.date(),
    endDate: Joi.date(),
    isProfit: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(100),
    page: Joi.number().integer().min(1),
  }),
};

/**
 * Get trade by ID validation
 */
const getTradeById = {
  params: Joi.object().keys({
    tradeId: Joi.string().custom(objectId).required(),
  }),
};

/**
 * Get trade statistics validation
 */
const getTradeStatistics = {
  query: Joi.object().keys({
    startDate: Joi.date(),
    endDate: Joi.date(),
    tradeType: Joi.string().valid('intraday', 'delivery'),
  }),
};

/**
 * Get today's trades validation
 */
const getTodayTrades = {
  query: Joi.object().keys({}),
};

module.exports = {
  getHoldings,
  getHoldingBySymbol,
  getPortfolioSummary,
  getTradeHistory,
  getTradeById,
  getTradeStatistics,
  getTodayTrades,
};
