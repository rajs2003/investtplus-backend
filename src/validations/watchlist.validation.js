const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createWatchlist = {
  body: Joi.object().keys({
    name: Joi.string().required().min(1).max(50).trim(),
    description: Joi.string().max(200).trim().optional(),
    stocks: Joi.array()
      .items(
        Joi.object().keys({
          symbol: Joi.string().required().uppercase().trim(),
          symbolToken: Joi.string().required().trim(),
          exchange: Joi.string().valid('NSE', 'BSE', 'NFO', 'MCX').default('NSE'),
          companyName: Joi.string().optional().trim(),
        }),
      )
      .max(50)
      .optional(),
    color: Joi.string()
      .pattern(/^#[0-9A-F]{6}$/i)
      .optional(),
    icon: Joi.string().optional().trim(),
    isDefault: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
  }),
};

const getWatchlists = {
  query: Joi.object().keys({
    includeStocks: Joi.boolean().optional(),
  }),
};

const getWatchlist = {
  params: Joi.object().keys({
    watchlistId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    withPrices: Joi.boolean().optional(),
  }),
};

const updateWatchlist = {
  params: Joi.object().keys({
    watchlistId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().min(1).max(50).trim(),
      color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
      icon: Joi.string().trim(),
      isDefault: Joi.boolean(),
      sortOrder: Joi.number().integer().min(0),
    })
    .min(1), // At least one field must be provided
};

const deleteWatchlist = {
  params: Joi.object().keys({
    watchlistId: Joi.string().custom(objectId).required(),
  }),
};

const addStock = {
  params: Joi.object().keys({
    watchlistId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    symbol: Joi.string().required().uppercase().trim(),
    symbolToken: Joi.string().required().trim(),
    exchange: Joi.string().valid('NSE', 'BSE', 'NFO', 'MCX').default('NSE'),
    companyName: Joi.string().optional().trim(),
  }),
};

const removeStock = {
  params: Joi.object().keys({
    watchlistId: Joi.string().custom(objectId).required(),
    symbol: Joi.string().required().uppercase().trim(),
  }),
  query: Joi.object().keys({
    exchange: Joi.string().valid('NSE', 'BSE', 'NFO', 'MCX').default('NSE'),
  }),
};

const reorderStocks = {
  params: Joi.object().keys({
    watchlistId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    order: Joi.array().items(Joi.string().uppercase().trim()).min(1).required(),
  }),
};

const searchStock = {
  query: Joi.object().keys({
    symbol: Joi.string().required().uppercase().trim(),
  }),
};

module.exports = {
  createWatchlist,
  getWatchlists,
  getWatchlist,
  updateWatchlist,
  deleteWatchlist,
  addStock,
  removeStock,
  reorderStocks,
  searchStock,
};
