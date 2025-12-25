const express = require('express');
const { marketController } = require('../../../controllers');
const validate = require('../../../middlewares/validate');
const { stockValidation } = require('../../../validations');

const router = express.Router();

router.route('/ltp').get(validate(stockValidation.getLTP), marketController.getLTP);

router.route('/depth').get(validate(stockValidation.getMarketDepth), marketController.getMarketDepth);

router.route('/quotes').post(validate(stockValidation.getQuotes), marketController.getQuotes);

router.route('/search').get(validate(stockValidation.searchStocks), marketController.searchStocks);

router.route('/candles').post(validate(stockValidation.getCandleData), marketController.getCandleData);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Market
 *   description: Market data and information
 */

/**
 * @swagger
 * /market/ltp:
 *   get:
 *     summary: Get Last Traded Price
 *     description: Fetches the last traded price for a stock
 *     tags: [Market]
 *     parameters:
 *       - in: query
 *         name: exchange
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 */

/**
 * @swagger
 * /market/search:
 *   get:
 *     summary: Search stocks
 *     description: Search for stocks by name or symbol
 *     tags: [Market]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: exchange
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 */
