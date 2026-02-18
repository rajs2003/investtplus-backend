const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getPositions = {
  query: Joi.object().keys({
    positionType: Joi.string().valid('intraday', 'delivery'),
    symbol: Joi.string().uppercase().trim(),
  }),
};

const getPositionById = {
  params: Joi.object().keys({
    positionId: Joi.string().custom(objectId).required(),
  }),
};

const getPositionSummary = {
  query: Joi.object().keys({}),
};

const getPositionHistory = {
  query: Joi.object().keys({
    positionType: Joi.string().valid('intraday', 'delivery'),
    symbol: Joi.string().uppercase().trim(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
      'date.min': 'End date must be after start date',
    }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

const squareOffPosition = {
  params: Joi.object().keys({
    positionId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  getPositions,
  getPositionById,
  getPositionSummary,
  getPositionHistory,
  squareOffPosition,
};
