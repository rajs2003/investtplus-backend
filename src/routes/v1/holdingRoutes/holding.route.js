const express = require('express');
const auth = require('../../../middlewares/auth');
const { holdingController } = require('../../../controllers');

const router = express.Router();

/**
 * @route   GET /v1/holdings
 * @desc    Get all holdings (intraday + delivery)
 * @access  Private
 */
router.get('/', auth('user', 'admin', 'superadmin'), holdingController.getHoldings);

/**
 * @route   GET /v1/holdings/intraday
 * @desc    Get intraday holdings only
 * @access  Private
 */
router.get('/intraday', auth('user', 'admin', 'superadmin'), holdingController.getIntradayHoldings);

/**
 * @route   GET /v1/holdings/delivery
 * @desc    Get delivery holdings only
 * @access  Private
 */
router.get('/delivery', auth('user', 'admin', 'superadmin'), holdingController.getDeliveryHoldings);

/**
 * @route   GET /v1/holdings/portfolio/summary
 * @desc    Get portfolio summary with P&L
 * @access  Private
 */
router.get('/portfolio/summary', auth('user', 'admin', 'superadmin'), holdingController.getPortfolioSummary);

/**
 * @route   GET /v1/holdings/trades
 * @desc    Get trade history with filters
 * @access  Private
 */
router.get('/trades', auth('user', 'admin', 'superadmin'), holdingController.getTradeHistory);

/**
 * @route   GET /v1/holdings/trades/stats
 * @desc    Get trade statistics
 * @access  Private
 */
router.get('/trades/stats', auth('user', 'admin', 'superadmin'), holdingController.getTradeStatistics);

/**
 * @route   GET /v1/holdings/trades/today
 * @desc    Get today's completed trades
 * @access  Private
 */
router.get('/trades/today', auth('user', 'admin', 'superadmin'), holdingController.getTodayTrades);

/**
 * @route   GET /v1/holdings/trades/:tradeId
 * @desc    Get specific trade details
 * @access  Private
 */
router.get('/trades/:tradeId', auth('user', 'admin', 'superadmin'), holdingController.getTradeById);

/**
 * @route   GET /v1/holdings/:symbol
 * @desc    Get specific holding by symbol
 * @access  Private
 * @query   holdingType (intraday/delivery)
 */
router.get('/:symbol', auth('user', 'admin', 'superadmin'), holdingController.getHoldingBySymbol);

module.exports = router;
