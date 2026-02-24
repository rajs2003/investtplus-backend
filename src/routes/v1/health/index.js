const express = require('express');
const HTTPStatus = require('http-status');
const catchAsync = require('../../../utils/catchAsync');
const ApiError = require('../../../utils/ApiError');
const config = require('../../../config/config');
const { getMarketStatus } = require('../../../services/v1/mockMarket/marketData.service');

const router = express.Router();

router.get(
  '/',
  catchAsync((req, res) => {
    try {
      res.status(HTTPStatus.OK).json({
        version: config.version,
        status: 'OK',
        Timestamp: new Date().toISOString(),
        Uptime: process.uptime(),
        Message: 'Server is healthy',
        Environment: config.env,
      });
    } catch (err) {
      console.error('Health check error:', err);
      throw new ApiError(HTTPStatus.INTERNAL_SERVER_ERROR, 'Health check failed');
    }
  }),
);

router.get(
  '/status',
  catchAsync((req, res) => {
    try {
      // check thirdparty services status like database, redis, smtp and all others services like twilio and others
      res.status(HTTPStatus.OK).json({
        status: 'READY',
        Timestamp: new Date().toISOString(),
        Message: 'Server is ready to accept requests',
        MarketStatus: getMarketStatus(),
      });
    } catch (err) {
      console.error('Readiness check error:', err);
      throw new ApiError(HTTPStatus.SERVICE_UNAVAILABLE, 'Server is not ready');
    }
  }),
);

module.exports = router;
