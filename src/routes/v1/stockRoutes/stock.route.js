const express = require('express');
const { stockController } = require('../../../controllers');
const validate = require('../../../middlewares/validate');
const { stockValidation } = require('../../../validations');

const router = express.Router();

router.route('/price').get(validate(stockValidation.getRealtimePrice), stockController.getRealtimePrice);

router.route('/details').get(validate(stockValidation.getStockDetails), stockController.getStockDetails);

router.route('/multiple').post(validate(stockValidation.getMultipleStocksPrices), stockController.getMultipleStocksPrices);

router.route('/market-status').get(stockController.getMarketStatus);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Stocks
 *   description: Stock price and details management
 */

/**
 * @swagger
 * /stocks/price:
 *   get:
 *     summary: Get realtime stock price
 *     description: Fetches the current price of a specific stock based on IST time
 *     tags: [Stocks]
 *     parameters:
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Trading symbol
 *       - in: query
 *         name: exchange
 *         required: true
 *         schema:
 *           type: string
 *         description: Exchange (NSE, BSE, etc.)
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Symbol token
 *     responses:
 *       "200":
 *         description: OK
 *       "400":
 *         description: Bad Request
 */

/**
 * @swagger
 * /stocks/details:
 *   get:
 *     summary: Get stock details with market depth
 *     description: Fetches complete stock details including market depth
 *     tags: [Stocks]
 *     parameters:
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       "200":
 *         description: OK
 */
