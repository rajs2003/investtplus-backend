const { authService, emailService, otpService, tokenService } = require('./v1/authServices');
const { userService } = require('./v1/userServices');
const { walletService, transactionService, fundManager } = require('./v1/marketServices/walletServices');
const { orderService, orderExecutionService, orderHelpers, chargesService } = require('./v1/marketServices/orderServices');
const holdingService = require('./v1/marketServices/holdingServices/holding.service');
const { tradeService } = require('./v1/marketServices/tradeServices/');
const { watchlistService } = require('./v1/marketServices/watchlistServices');
const { dashboardService } = require('./v1/marketServices/dashboardServices');
const positionService = require('./v1/marketServices/positionServices/position.service');
const { marketDataService, marketWebSocketService } = require('./v1/mockMarket');
const stockService = require('./v1/stockServices/stock.service');

module.exports = {
  authService,
  emailService,
  otpService,
  tokenService,
  userService,
  walletService,
  transactionService,
  fundManager,
  orderService,
  orderExecutionService,
  orderHelpers,
  chargesService,
  holdingService,
  tradeService,
  watchlistService,
  dashboardService,
  positionService,
  marketDataService,
  marketWebSocketService,
  stockService,
};
