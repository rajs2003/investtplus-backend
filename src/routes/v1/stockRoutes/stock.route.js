const express = require('express');
const { stockController } = require('../../../controllers');

const router = express.Router();

/**
 * GET /api/v1/stocks
 * Get all stocks with current market prices
 */
router.get('/', stockController.getAllStocks);

/**
 * GET /api/v1/stocks/:symbol
 * Get specific stock details
 */
router.get('/:symbol', stockController.getStockBySymbol);

/**
 * GET /api/v1/stocks/search/:query
 * Search stocks by name or symbol
 */
// router.get('/search/:query', stockController.searchStocks);

module.exports = router;
