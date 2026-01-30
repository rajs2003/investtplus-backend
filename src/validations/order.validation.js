/* eslint-disable no-unused-vars */
const Joi = require('joi');
const { objectId } = require('./custom.validation');

/**
 * Validation for placing an order
 */
const placeOrder = {
  body: Joi.object().keys({
    symbol: Joi.string().required().uppercase().trim().max(20).messages({
      'string.empty': 'Stock symbol is required',
      'any.required': 'Stock symbol is required',
    }),

    exchange: Joi.string().valid('NSE', 'BSE').default('NSE').messages({
      'any.only': 'Exchange must be either NSE or BSE',
    }),

    orderType: Joi.string()
      .required()
      .valid('intraday', 'delivery', 'MIS', 'mis')
      .custom((value, helpers) => {
        // Normalize MIS to intraday
        if (value === 'MIS' || value === 'mis') {
          return 'intraday';
        }
        return value.toLowerCase();
      })
      .messages({
        'any.required': 'Order type is required',
        'any.only': 'Order type must be either intraday, delivery, or MIS',
      }),

    orderVariant: Joi.string().required().valid('market', 'limit', 'sl', 'slm').messages({
      'any.required': 'Order variant is required',
      'any.only': 'Order variant must be market, limit, sl, or slm',
    }),

    transactionType: Joi.string().required().valid('buy', 'sell').messages({
      'any.required': 'Transaction type is required',
      'any.only': 'Transaction type must be either buy or sell',
    }),

    quantity: Joi.number().integer().min(1).max(10000).required().messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 10,000 shares',
      'any.required': 'Quantity is required',
    }),

    price: Joi.number()
      .min(0.01)
      .when('orderVariant', {
        is: Joi.string().valid('limit', 'sl'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      })
      .messages({
        'number.base': 'Price must be a number',
        'number.min': 'Price must be greater than 0',
        'any.required': 'Price is required for limit and stop loss orders',
      }),

    triggerPrice: Joi.number()
      .min(0.01)
      .when('orderVariant', {
        is: Joi.string().valid('sl', 'slm'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      })
      .messages({
        'number.base': 'Trigger price must be a number',
        'number.min': 'Trigger price must be greater than 0',
        'any.required': 'Trigger price is required for stop loss orders',
      }),
  }),
};

/**
 * Validation for cancelling an order
 */
const cancelOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId).required().messages({
      'any.required': 'Order ID is required',
      'string.pattern.name': 'Invalid order ID',
    }),
  }),
  body: Joi.object().keys({
    reason: Joi.string().trim().max(200).default('User cancelled').messages({
      'string.max': 'Cancellation reason cannot exceed 200 characters',
    }),
  }),
};

/**
 * Validation for getting orders
 */
const getOrders = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'executed', 'cancelled', 'rejected', 'expired', 'partial'),
    orderType: Joi.string()
      .valid('intraday', 'delivery', 'MIS', 'mis')
      .custom((value, helpers) => {
        if (value === 'MIS' || value === 'mis') {
          return 'intraday';
        }
        return value.toLowerCase();
      }),
    transactionType: Joi.string().valid('buy', 'sell'),
    symbol: Joi.string().uppercase().trim(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
      'date.min': 'End date must be after start date',
    }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
  }),
};

/**
 * Validation for getting order by ID
 */
const getOrderById = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId).required().messages({
      'any.required': 'Order ID is required',
      'string.pattern.name': 'Invalid order ID',
    }),
  }),
};

/**
 * Validation for executing order (admin/testing)
 */
const executeOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId).required().messages({
      'any.required': 'Order ID is required',
      'string.pattern.name': 'Invalid order ID',
    }),
  }),
};

module.exports = {
  placeOrder,
  cancelOrder,
  getOrders,
  getOrderById,
  executeOrder,
};
