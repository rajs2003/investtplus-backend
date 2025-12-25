const Joi = require('joi');

const getPopularStocks = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(50).optional().default(10),
  }),
};

const getTopGainers = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(50).optional().default(10),
  }),
};

const getTopLosers = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(50).optional().default(10),
  }),
};

module.exports = {
  getPopularStocks,
  getTopGainers,
  getTopLosers,
};
