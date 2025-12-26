const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const dashboardValidation = require('../../../validations/dashboard.validation');
const { dashboardController } = require('../../../controllers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard and analytics endpoints
 */

/**
 * @swagger
 * /v1/dashboard/market-overview:
 *   get:
 *     summary: Get market overview (indices, market status)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Market overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                     marketStatus:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [OPEN, CLOSED, PRE_OPEN]
 *                         message:
 *                           type: string
 *                     indices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           ltp:
 *                             type: number
 *                           change:
 *                             type: number
 *                           changePercent:
 *                             type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/market-overview', auth('user', 'admin', 'superadmin'), dashboardController.getMarketOverview);

/**
 * @swagger
 * /v1/dashboard/popular-stocks:
 *   get:
 *     summary: Get popular stocks
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of stocks to return
 *     responses:
 *       200:
 *         description: Popular stocks retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/popular-stocks',
  auth('user', 'admin', 'superadmin'),
  validate(dashboardValidation.getPopularStocks),
  dashboardController.getPopularStocks,
);

/**
 * @swagger
 * /v1/dashboard/top-gainers:
 *   get:
 *     summary: Get top gaining stocks
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of stocks to return
 *     responses:
 *       200:
 *         description: Top gainers retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/top-gainers',
  auth('user', 'admin', 'superadmin'),
  validate(dashboardValidation.getTopGainers),
  dashboardController.getTopGainers,
);

/**
 * @swagger
 * /v1/dashboard/top-losers:
 *   get:
 *     summary: Get top losing stocks
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of stocks to return
 *     responses:
 *       200:
 *         description: Top losers retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/top-losers',
  auth('user', 'admin', 'superadmin'),
  validate(dashboardValidation.getTopLosers),
  dashboardController.getTopLosers,
);

/**
 * @swagger
 * /v1/dashboard/sector-performance:
 *   get:
 *     summary: Get sector performance
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sector performance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sector:
 *                         type: string
 *                       ltp:
 *                         type: number
 *                       change:
 *                         type: number
 *                       changePercent:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/sector-performance', auth('user', 'admin', 'superadmin'), dashboardController.getSectorPerformance);

/**
 * @swagger
 * /v1/dashboard/portfolio-analytics:
 *   get:
 *     summary: Get user's portfolio analytics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portfolio analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         balance:
 *                           type: number
 *                     portfolio:
 *                       type: object
 *                       properties:
 *                         totalInvested:
 *                           type: number
 *                         currentValue:
 *                           type: number
 *                         totalPnL:
 *                           type: number
 *                         totalPnLPercent:
 *                           type: number
 *                     holdings:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         stocks:
 *                           type: array
 *       401:
 *         description: Unauthorized
 */
router.get('/portfolio-analytics', auth('user', 'admin', 'superadmin'), dashboardController.getPortfolioAnalytics);

/**
 * @swagger
 * /v1/dashboard/activity-summary:
 *   get:
 *     summary: Get user's activity summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity summary retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/activity-summary', auth('user', 'admin', 'superadmin'), dashboardController.getUserActivitySummary);

/**
 * @swagger
 * /v1/dashboard/platform-stats:
 *   get:
 *     summary: Get platform statistics (admin only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/platform-stats', auth('admin'), dashboardController.getPlatformStatistics);

module.exports = router;
