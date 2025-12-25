const Joi = require('joi');

/**
 * Get wallet balance - no params needed
 */
const getWalletBalance = {};

/**
 * Get transaction history
 */
const getTransactionHistory = {
  query: Joi.object().keys({
    type: Joi.string().valid('credit', 'debit'),
    reason: Joi.string().valid(
      'initial_deposit',
      'bonus',
      'stock_buy',
      'stock_sell',
      'charges',
      'refund',
      'order_cancelled',
      'profit_realized',
      'loss_realized',
      'admin_credit',
      'admin_debit'
    ),
    orderId: Joi.string(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(100),
    page: Joi.number().integer().min(1),
  }),
};

/**
 * Get transaction summary
 */
const getTransactionSummary = {
  query: Joi.object().keys({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
  }),
};

/**
 * Add funds (admin only)
 */
const addFunds = {
  body: Joi.object().keys({
    userId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    reason: Joi.string().valid('admin_credit', 'bonus').default('admin_credit'),
    description: Joi.string().max(500),
  }),
};

/**
 * Get transaction by ID
 */
const getTransaction = {
  params: Joi.object().keys({
    transactionId: Joi.string().required(),
  }),
};

module.exports = {
  getWalletBalance,
  getTransactionHistory,
  getTransactionSummary,
  addFunds,
  getTransaction,
};
