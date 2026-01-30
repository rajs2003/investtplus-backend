/**
 * Wallet Services Index
 * Centralized exports for all wallet-related services
 */

const walletService = require('./wallet.service');
const transactionService = require('./transaction.service');
const fundManager = require('./fundManager.service');

module.exports = {
  walletService,
  transactionService,
  fundManager,
};
