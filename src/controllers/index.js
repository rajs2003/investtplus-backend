const { authController } = require('./v1/authController');
const { userController } = require('./v1/userController');

// External Market Data Controllers (AngelOne/Kite APIs)
// const marketController = require('./v1/marketController/market.controller');
const { stockController } = require('./v1/stockController');
// const { websocketController } = require('./v1/websocketController');

// Market Simulation Controllers
const walletController = require('./v1/marketController/walletController');
const orderController = require('./v1/marketController/orderController/order.controller');
const holdingController = require('./v1/marketController/holdingController/holding.controller');
const positionController = require('./v1/marketController/positionController/position.controller');
const watchlistController = require('./v1/marketController/watchlistController');
const dashboardController = require('./v1/marketController/dashboardController');

module.exports = {
  authController,
  userController,

  // marketController,
  stockController,
  // websocketController,

  // Market Simulation
  walletController,
  orderController,
  holdingController,
  positionController,
  watchlistController,
  dashboardController,
};
