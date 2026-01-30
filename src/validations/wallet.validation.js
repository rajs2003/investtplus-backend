const Joi = require('joi');

const createWallet = {
  body: Joi.object().keys({}),
};

const getWalletBalance = {
  query: Joi.object().keys({}),
  params: Joi.object().keys({}),
  body: Joi.object().keys({}),
};

const getWalletDetails = {
  query: Joi.object().keys({}),
  params: Joi.object().keys({}),
  body: Joi.object().keys({}),
};

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
      'admin_debit',
    ),
    orderId: Joi.string(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(100),
    page: Joi.number().integer().min(1),
  }),
};

const getTransactionSummary = {
  query: Joi.object().keys({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
  }),
};

const addFunds = {
  body: Joi.object().keys({
    userId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    reason: Joi.string().valid('admin_credit', 'bonus').default('admin_credit'),
    description: Joi.string().max(500),
  }),
};

const getTransaction = {
  params: Joi.object().keys({
    transactionId: Joi.string().required(),
  }),
};

module.exports = {
  createWallet,
  getWalletDetails,
  getWalletBalance,
  getTransactionHistory,
  getTransactionSummary,
  addFunds,
  getTransaction,
};
