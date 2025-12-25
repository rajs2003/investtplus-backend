// Market Provider Factory - dynamically loads AngelOne or Kite services based on config
const marketProviderFactory = require('./v1/marketProviderFactory');

// Get services from the active provider
const { 
  providerService, 
  marketService, 
  stockService, 
  webSocketService 
} = marketProviderFactory.getAllServices();

// Auth and User Services
const { authService, emailService, otpService, tokenService } = require('./v1/authServices');
const { userService } = require('./v1/userServices');

// Market Simulation Services
const walletService = require('./v1/marketServices/walletServices/wallet.service');
const transactionService = require('./v1/marketServices/walletServices/transaction.service');

const orderService = require('./v1/marketServices/orderServices/order.service');
const orderExecutionService = require('./v1/marketServices/orderServices/orderExecution.service');
const chargesService = require('./v1/marketServices/orderServices/charges.service');

const holdingService = require('./v1/marketServices/holdingServices/holding.service');
const tradeService = require('./v1/marketServices/tradeServices/trade.service');

const { watchlistService } = require('./v1/marketServices/watchlistServices');

const { dashboardService } = require('./v1/marketServices/dashboardServices');


module.exports = {
  // Market Provider Factory
  marketProviderFactory,
  
  // Market Data Services (dynamically loaded based on provider)
  providerService, // angelOneService or kiteService
  marketService,
  stockService,
  webSocketService,
  
  // Legacy export for backward compatibility
  angelOneService: providerService, // Points to active provider
  
  // Auth Services
  authService,
  emailService,
  otpService,
  tokenService,
  
  // User Services
  userService,
  
  // Market Simulation Services
  walletService,
  transactionService,
  
  orderService,
  orderExecutionService,
  chargesService,
  
  holdingService,
  tradeService,
  
  watchlistService,
  
  dashboardService,
};