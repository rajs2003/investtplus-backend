const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const { walletValidation } = require('../../../validations');
const { walletController } = require('../../../controllers');

const router = express.Router();

// All wallet routes require authentication
router.use(auth('user', 'admin', 'superadmin'));

/**
 * @route   GET /api/v1/wallet
 * @desc    Get wallet balance and details
 * @access  Private
 */
router.get('/', walletController.getWalletBalance);

/**
 * @route   GET /api/v1/wallet/details
 * @desc    Get complete wallet information
 * @access  Private
 */
router.get('/details', walletController.getWalletDetails);

/**
 * @route   GET /api/v1/wallet/transactions
 * @desc    Get transaction history with filters and pagination
 * @access  Private
 * @query   type, reason, orderId, startDate, endDate, sortBy, limit, page
 */
router.get(
  '/transactions',
  validate(walletValidation.getTransactionHistory),
  walletController.getTransactionHistory
);

/**
 * @route   GET /api/v1/wallet/transactions/summary
 * @desc    Get transaction summary (total credits/debits)
 * @access  Private
 * @query   startDate, endDate
 */
router.get(
  '/transactions/summary',
  validate(walletValidation.getTransactionSummary),
  walletController.getTransactionSummary
);

/**
 * @route   GET /api/v1/wallet/transactions/:transactionId
 * @desc    Get single transaction details
 * @access  Private
 */
router.get(
  '/transactions/:transactionId',
  validate(walletValidation.getTransaction),
  walletController.getTransaction
);

/**
 * @route   POST /api/v1/wallet/add-funds
 * @desc    Add funds to user wallet (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/add-funds',
  auth('manageUsers'), // Admin permission
  validate(walletValidation.addFunds),
  walletController.addFunds
);

module.exports = router;
