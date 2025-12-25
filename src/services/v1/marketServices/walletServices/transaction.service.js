const { Transaction } = require('../../../../models');

/**
 * Create a transaction record
 * @param {Object} transactionData
 * @returns {Promise<Transaction>}
 */
const createTransaction = async (transactionData) => {
  const transaction = await Transaction.create(transactionData);
  return transaction;
};

/**
 * Get transaction by id
 * @param {ObjectId} transactionId
 * @returns {Promise<Transaction>}
 */
const getTransactionById = async (transactionId) => {
  return Transaction.findById(transactionId);
};

/**
 * Get transactions by order id
 * @param {ObjectId} orderId
 * @returns {Promise<Array<Transaction>>}
 */
const getTransactionsByOrderId = async (orderId) => {
  return Transaction.find({ orderId }).sort({ createdAt: -1 });
};

/**
 * Get user transactions
 * @param {ObjectId} userId
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const getUserTransactions = async (userId, filter = {}, options = {}) => {
  const query = { userId, ...filter };
  return Transaction.paginate(query, {
    ...options,
    sortBy: options.sortBy || 'createdAt:desc',
  });
};

/**
 * Get wallet transactions
 * @param {ObjectId} walletId
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const getWalletTransactions = async (walletId, filter = {}, options = {}) => {
  const query = { walletId, ...filter };
  return Transaction.paginate(query, {
    ...options,
    sortBy: options.sortBy || 'createdAt:desc',
  });
};

module.exports = {
  createTransaction,
  getTransactionById,
  getTransactionsByOrderId,
  getUserTransactions,
  getWalletTransactions,
};
