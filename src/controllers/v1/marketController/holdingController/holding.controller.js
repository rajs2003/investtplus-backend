const httpStatus = require('http-status');
const catchAsync = require('../../../../utils/catchAsync');
const { holdingService, tradeService } = require('../../../../services');
const pick = require('../../../../utils/pick');

/**
 * Get all holdings for the user
 * GET /v1/holdings
 */
const getHoldings = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['holdingType']);
  const holdings = await holdingService.getHoldings(req.user.id, filter);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Holdings retrieved successfully',
    results: holdings,
    count: holdings.length,
  });
});

/**
 * Get intraday holdings only
 * GET /v1/holdings/intraday
 */
const getIntradayHoldings = catchAsync(async (req, res) => {
  const holdings = await holdingService.getHoldings(req.user.id, { holdingType: 'intraday' });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Intraday holdings retrieved successfully',
    results: holdings,
    count: holdings.length,
  });
});

/**
 * Get delivery holdings only
 * GET /v1/holdings/delivery
 */
const getDeliveryHoldings = catchAsync(async (req, res) => {
  const holdings = await holdingService.getHoldings(req.user.id, { holdingType: 'delivery' });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Delivery holdings retrieved successfully',
    results: holdings,
    count: holdings.length,
  });
});

/**
 * Get specific holding by symbol
 * GET /v1/holdings/:symbol
 */
const getHoldingBySymbol = catchAsync(async (req, res) => {
  const { symbol } = req.params;
  const holdingType = req.query.holdingType || 'intraday';
  
  const holding = await holdingService.getHoldingBySymbol(req.user.id, symbol, holdingType);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Holding retrieved successfully',
    holding,
  });
});

/**
 * Get portfolio summary
 * GET /v1/holdings/portfolio/summary
 */
const getPortfolioSummary = catchAsync(async (req, res) => {
  const summary = await holdingService.getPortfolioSummary(req.user.id);

  // Format amounts for display
  const formattedSummary = {
    ...summary,
    totalInvestment: `₹${summary.totalInvestment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    currentValue: `₹${summary.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    unrealizedPL: `₹${summary.unrealizedPL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    unrealizedPLPercentage: `${summary.unrealizedPLPercentage.toFixed(2)}%`,
    todayPL: `₹${summary.todayPL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    realizedPL: `₹${summary.realizedPL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    winRate: `${summary.winRate.toFixed(2)}%`,
  };

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Portfolio summary retrieved successfully',
    portfolio: formattedSummary,
  });
});

/**
 * Get trade history
 * GET /v1/holdings/trades
 */
const getTradeHistory = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['symbol', 'tradeType', 'startDate', 'endDate', 'isProfit']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  const result = await tradeService.getTradeHistory(req.user.id, filter, options);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Trade history retrieved successfully',
    ...result,
  });
});

/**
 * Get trade by ID
 * GET /v1/holdings/trades/:tradeId
 */
const getTradeById = catchAsync(async (req, res) => {
  const trade = await tradeService.getTradeById(req.params.tradeId, req.user.id);

  // Format amounts
  const formattedTrade = {
    ...trade.toJSON(),
    buyValue: `₹${trade.buyValue.toLocaleString('en-IN')}`,
    sellValue: `₹${trade.sellValue.toLocaleString('en-IN')}`,
    grossPL: `₹${trade.grossPL.toLocaleString('en-IN')}`,
    netPL: `₹${trade.netPL.toLocaleString('en-IN')}`,
    plPercentage: `${trade.plPercentage.toFixed(2)}%`,
    totalCharges: `₹${trade.totalCharges.toLocaleString('en-IN')}`,
  };

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Trade details retrieved successfully',
    trade: formattedTrade,
  });
});

/**
 * Get trade statistics
 * GET /v1/holdings/trades/stats
 */
const getTradeStatistics = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['startDate', 'endDate', 'tradeType']);
  const stats = await tradeService.getTradeStatistics(req.user.id, filter);

  // Format stats
  const formattedStats = {
    ...stats,
    totalGrossPL: `₹${stats.totalGrossPL.toLocaleString('en-IN')}`,
    totalNetPL: `₹${stats.totalNetPL.toLocaleString('en-IN')}`,
    totalCharges: `₹${stats.totalCharges.toLocaleString('en-IN')}`,
    avgPLPerTrade: `₹${stats.avgPLPerTrade.toLocaleString('en-IN')}`,
    winRate: `${stats.winRate.toFixed(2)}%`,
    bestTrade: stats.bestTrade ? {
      ...stats.bestTrade,
      netPL: `₹${stats.bestTrade.netPL.toLocaleString('en-IN')}`,
      plPercentage: `${stats.bestTrade.plPercentage.toFixed(2)}%`,
    } : null,
    worstTrade: stats.worstTrade ? {
      ...stats.worstTrade,
      netPL: `₹${stats.worstTrade.netPL.toLocaleString('en-IN')}`,
      plPercentage: `${stats.worstTrade.plPercentage.toFixed(2)}%`,
    } : null,
  };

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Trade statistics retrieved successfully',
    stats: formattedStats,
  });
});

/**
 * Get today's trades
 * GET /v1/holdings/trades/today
 */
const getTodayTrades = catchAsync(async (req, res) => {
  const trades = await tradeService.getTodayTrades(req.user.id);

  const totalPL = trades.reduce((sum, trade) => sum + trade.netPL, 0);

  res.status(httpStatus.OK).json({
    success: true,
    message: "Today's trades retrieved successfully",
    results: trades,
    count: trades.length,
    todayPL: `₹${totalPL.toLocaleString('en-IN')}`,
  });
});

module.exports = {
  getHoldings,
  getIntradayHoldings,
  getDeliveryHoldings,
  getHoldingBySymbol,
  getPortfolioSummary,
  getTradeHistory,
  getTradeById,
  getTradeStatistics,
  getTodayTrades,
};
