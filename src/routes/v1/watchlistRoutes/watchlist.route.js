const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const watchlistValidation = require('../../../validations/watchlist.validation');
const { watchlistController } = require('../../../controllers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Watchlists
 *   description: User watchlist management
 */

/**
 * @swagger
 * /v1/watchlists:
 *   post:
 *     summary: Create a new watchlist
 *     tags: [Watchlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: Watchlist name
 *               stocks:
 *                 type: array
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                     symbolToken:
 *                       type: string
 *                     exchange:
 *                       type: string
 *                       enum: [NSE, BSE, NFO, MCX]
 *                     companyName:
 *                       type: string
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-F]{6}$'
 *                 description: Hex color code
 *               icon:
 *                 type: string
 *                 description: Emoji or icon identifier
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default watchlist
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Watchlist created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth('user'), validate(watchlistValidation.createWatchlist), watchlistController.createWatchlist);

/**
 * @swagger
 * /v1/watchlists:
 *   get:
 *     summary: Get all watchlists for logged-in user
 *     tags: [Watchlists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watchlists retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth('user'), validate(watchlistValidation.getWatchlists), watchlistController.getUserWatchlists);

/**
 * @swagger
 * /v1/watchlists/search:
 *   get:
 *     summary: Search for a stock in user's watchlists
 *     tags: [Watchlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol to search
 *     responses:
 *       200:
 *         description: Search results
 *       401:
 *         description: Unauthorized
 */
router.get('/search', auth('user'), validate(watchlistValidation.searchStock), watchlistController.searchStock);

/**
 * @swagger
 * /v1/watchlists/{watchlistId}:
 *   get:
 *     summary: Get watchlist by ID
 *     tags: [Watchlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: watchlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Watchlist ID
 *       - in: query
 *         name: withPrices
 *         schema:
 *           type: boolean
 *         description: Include live stock prices
 *     responses:
 *       200:
 *         description: Watchlist retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Watchlist not found
 */
router.get('/:watchlistId', auth('user'), validate(watchlistValidation.getWatchlist), watchlistController.getWatchlist);

/**
 * @swagger
 * /v1/watchlists/{watchlistId}:
 *   patch:
 *     summary: Update watchlist details
 *     tags: [Watchlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: watchlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Watchlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *               icon:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Watchlist updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Watchlist not found
 */
router.patch(
  '/:watchlistId',
  auth('user'),
  validate(watchlistValidation.updateWatchlist),
  watchlistController.updateWatchlist,
);

/**
 * @swagger
 * /v1/watchlists/{watchlistId}:
 *   delete:
 *     summary: Delete watchlist
 *     tags: [Watchlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: watchlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Watchlist ID
 *     responses:
 *       200:
 *         description: Watchlist deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Watchlist not found
 */
router.delete(
  '/:watchlistId',
  auth('user'),
  validate(watchlistValidation.deleteWatchlist),
  watchlistController.deleteWatchlist,
);

/**
 * @swagger
 * /v1/watchlists/{watchlistId}/stocks:
 *   post:
 *     summary: Add stock to watchlist
 *     tags: [Watchlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: watchlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Watchlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - symbolToken
 *             properties:
 *               symbol:
 *                 type: string
 *               symbolToken:
 *                 type: string
 *               exchange:
 *                 type: string
 *                 enum: [NSE, BSE, NFO, MCX]
 *               companyName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock added successfully
 *       400:
 *         description: Invalid request or stock limit reached
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Watchlist not found
 */
router.post('/:watchlistId/stocks', auth('user'), validate(watchlistValidation.addStock), watchlistController.addStock);

/**
 * @swagger
 * /v1/watchlists/{watchlistId}/stocks/{symbol}:
 *   delete:
 *     summary: Remove stock from watchlist
 *     tags: [Watchlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: watchlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Watchlist ID
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol
 *       - in: query
 *         name: exchange
 *         schema:
 *           type: string
 *           enum: [NSE, BSE, NFO, MCX]
 *         description: Exchange (default NSE)
 *     responses:
 *       200:
 *         description: Stock removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Watchlist or stock not found
 */
router.delete(
  '/:watchlistId/stocks/:symbol',
  auth('user'),
  validate(watchlistValidation.removeStock),
  watchlistController.removeStock,
);

/**
 * @swagger
 * /v1/watchlists/{watchlistId}/reorder:
 *   put:
 *     summary: Reorder stocks in watchlist
 *     tags: [Watchlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: watchlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Watchlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order
 *             properties:
 *               order:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of symbols in new order
 *     responses:
 *       200:
 *         description: Stocks reordered successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Watchlist not found
 */
router.put(
  '/:watchlistId/reorder',
  auth('user'),
  validate(watchlistValidation.reorderStocks),
  watchlistController.reorderStocks,
);

module.exports = router;
