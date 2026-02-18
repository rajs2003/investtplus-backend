const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const dashboardValidation = require('../../../validations/dashboard.validation');
const { dashboardController } = require('../../../controllers');

const router = express.Router();

router.get('/market-overview', auth('user'), dashboardController.getMarketOverview);

router.get(
  '/popular-stocks',
  auth('user'),
  validate(dashboardValidation.getPopularStocks),
  dashboardController.getPopularStocks,
);

router.get('/top-gainers', auth('user'), validate(dashboardValidation.getTopGainers), dashboardController.getTopGainers);

router.get('/top-losers', auth('user'), validate(dashboardValidation.getTopLosers), dashboardController.getTopLosers);

router.get('/sector-performance', auth('user'), dashboardController.getSectorPerformance);

router.get('/portfolio-analytics', auth('user'), dashboardController.getPortfolioAnalytics);

router.get('/activity-summary', auth('user'), dashboardController.getUserActivitySummary);

router.get('/platform-stats', auth('admin'), dashboardController.getPlatformStatistics);

module.exports = router;
