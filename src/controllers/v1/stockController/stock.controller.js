const catchAsync = require('../../../utils/catchAsync');
const { stockService } = require('../../../services');
const { isMarketOpen } = require('../../../utils/marketUtils');

/**
 * Get realtime stock price
 * @route GET /api/v1/stocks/price
 * @query {string} symbol - Trading symbol
 * @query {string} exchange - Exchange (NSE, BSE)
 * @query {string} token - Symbol token
 */
const getRealtimePrice = catchAsync(async (req, res) => {
  const { symbol, exchange, token } = req.query;

  if (!symbol || !exchange || !token) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: symbol, exchange, token',
    });
  }

  const result = await stockService.getRealtimeStockPrice(symbol, exchange, token);

  res.status(200).json(result);
});

/**
 * Get stock details with market depth
 * @route GET /api/v1/stocks/details
 * @query {string} symbol - Trading symbol
 * @query {string} exchange - Exchange
 * @query {string} token - Symbol token
 */
const getStockDetails = catchAsync(async (req, res) => {
  const { symbol, exchange, token } = req.query;

  if (!symbol || !exchange || !token) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: symbol, exchange, token',
    });
  }

  const result = await stockService.getStockDetails(symbol, exchange, token);

  res.status(200).json(result);
});

/**
 * Get multiple stocks prices
 * @route POST /api/v1/stocks/multiple
 * @body {Array<Object>} stocks - Array of {tradingSymbol, exchange, symbolToken}
 */
const getMultipleStocksPrices = catchAsync(async (req, res) => {
  const { stocks } = req.body;

  if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid stocks array',
    });
  }

  const result = await stockService.getMultipleStocksPrices(stocks);

  res.status(200).json(result);
});

/**
 * Get market status
 * @route GET /api/v1/stocks/market-status
 */
const getMarketStatus = catchAsync(async (req, res) => {
  const marketOpen = isMarketOpen();

  res.status(200).json({
    success: true,
    data: {
      isOpen: marketOpen,
      status: marketOpen ? 'OPEN' : 'CLOSED',
      timezone: 'Asia/Kolkata',
    },
  });
});

module.exports = {
  getRealtimePrice,
  getStockDetails,
  getMultipleStocksPrices,
  getMarketStatus,
};
