const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const { walletValidation } = require('../../../validations');
const { walletController } = require('../../../controllers');

const router = express.Router();

// All wallet routes require authentication
// router.use(auth('user', 'admin', 'superadmin'));

router.get('/', auth('all'), validate(walletValidation.getWalletBalance), walletController.getWalletBalance);

router.post('/create', validate(walletValidation.createWallet), auth('user'), walletController.createWallet);

router.get('/details', validate(walletValidation.getWalletDetails), auth('user'), walletController.getWalletDetails);

router.get('/balance', validate(walletValidation.getWalletBalance), auth('user'), walletController.getWalletBalance);

router.get(
  '/transactions',
  auth('user'),
  validate(walletValidation.getTransactionHistory),
  walletController.getTransactionHistory,
);

router.get(
  '/transactions/summary',
  auth('user'),
  validate(walletValidation.getTransactionSummary),
  walletController.getTransactionSummary,
);

router.get(
  '/transactions/:transactionId',
  auth('user'),
  validate(walletValidation.getTransaction),
  walletController.getTransaction,
);

router.post(
  '/add-funds',
  auth('admin'), // Admin permission
  validate(walletValidation.addFunds),
  walletController.addFunds,
);

module.exports = router;
