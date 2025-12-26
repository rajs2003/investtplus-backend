const Joi = require('joi');

const getRealtimePrice = {
  query: Joi.object().keys({
    symbol: Joi.string().required(),
    exchange: Joi.string().required().valid('NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'BFO'),
    token: Joi.string().required(),
  }),
};

const getStockDetails = {
  query: Joi.object().keys({
    symbol: Joi.string().required(),
    exchange: Joi.string().required().valid('NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'BFO'),
    token: Joi.string().required(),
  }),
};

const getMultipleStocksPrices = {
  body: Joi.object().keys({
    stocks: Joi.array()
      .items(
        Joi.object().keys({
          tradingSymbol: Joi.string().required(),
          exchange: Joi.string().required().valid('NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'BFO'),
          symbolToken: Joi.string().required(),
        }),
      )
      .min(1)
      .required(),
  }),
};

const getLTP = {
  query: Joi.object().keys({
    exchange: Joi.string().required().valid('NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'BFO'),
    token: Joi.string().required(),
    symbol: Joi.string().optional(),
  }),
};

const getMarketDepth = {
  query: Joi.object().keys({
    exchange: Joi.string().required().valid('NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'BFO'),
    token: Joi.string().required(),
  }),
};

const getQuotes = {
  body: Joi.object().keys({
    exchange: Joi.string().required().valid('NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'BFO'),
    tokens: Joi.array().items(Joi.string()).min(1).required(),
  }),
};

const searchStocks = {
  query: Joi.object().keys({
    q: Joi.string().required().min(1),
    exchange: Joi.string().optional().valid('NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'BFO'),
  }),
};

const getCandleData = {
  body: Joi.object().keys({
    exchange: Joi.string().required().valid('NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'BFO'),
    token: Joi.string().required(),
    interval: Joi.string()
      .required()
      .valid(
        'ONE_MINUTE',
        'THREE_MINUTE',
        'FIVE_MINUTE',
        'TEN_MINUTE',
        'FIFTEEN_MINUTE',
        'THIRTY_MINUTE',
        'ONE_HOUR',
        'ONE_DAY',
      ),
    fromDate: Joi.string().required(),
    toDate: Joi.string().required(),
  }),
};

const wsSubscribe = {
  body: Joi.object().keys({
    mode: Joi.number().required().valid(1, 2, 3),
    tokens: Joi.array()
      .items(
        Joi.object().keys({
          exchangeType: Joi.number().required().valid(1, 2, 3, 4, 5),
          tokens: Joi.array().items(Joi.string()).min(1).required(),
        }),
      )
      .min(1)
      .required(),
  }),
};

const wsUnsubscribe = {
  body: Joi.object().keys({
    mode: Joi.number().required().valid(1, 2, 3),
    tokens: Joi.array()
      .items(
        Joi.object().keys({
          exchangeType: Joi.number().required().valid(1, 2, 3, 4, 5),
          tokens: Joi.array().items(Joi.string()).min(1).required(),
        }),
      )
      .min(1)
      .required(),
  }),
};

module.exports = {
  getRealtimePrice,
  getStockDetails,
  getMultipleStocksPrices,
  getLTP,
  getMarketDepth,
  getQuotes,
  searchStocks,
  getCandleData,
  wsSubscribe,
  wsUnsubscribe,
};
