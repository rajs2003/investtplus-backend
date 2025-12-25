const catchAsync = require('../../utils/catchAsync');
const { marketService } = require('../../services');

/**
 * Get LTP for a stock
 * @route GET /api/v1/market/ltp
 * @query {string} exchange - Exchange
 * @query {string} token - Symbol token
 * @query {string} symbol - Trading symbol (optional)
 */
const getLTP = catchAsync(async (req, res) => {
  const { exchange, token, symbol = '' } = req.query;

  if (!exchange || !token) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: exchange, token',
    });
  }

  const result = await marketService.getLTP(exchange, token, symbol);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get market depth
 * @route GET /api/v1/market/depth
 * @query {string} exchange - Exchange
 * @query {string} token - Symbol token
 */
const getMarketDepth = catchAsync(async (req, res) => {
  const { exchange, token } = req.query;

  if (!exchange || !token) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: exchange, token',
    });
  }

  const result = await marketService.getMarketDepth(exchange, token);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get quotes for multiple stocks
 * @route POST /api/v1/market/quotes
 * @body {string} exchange - Exchange
 * @body {Array<string>} tokens - Array of symbol tokens
 */
const getQuotes = catchAsync(async (req, res) => {
  const { exchange, tokens } = req.body;

  if (!exchange || !tokens || !Array.isArray(tokens)) {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid parameters: exchange, tokens (array)',
    });
  }

  const result = await marketService.getQuotes(exchange, tokens);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Search for stocks
 * @route GET /api/v1/market/search
 * @query {string} q - Search query
 * @query {string} exchange - Exchange (optional)
 */
const searchStocks = catchAsync(async (req, res) => {
  const { q, exchange = '' } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: q (search query)',
    });
  }

  const result = await marketService.searchStocks(q, exchange);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get candle data (historical)
 * @route POST /api/v1/market/candles
 * @body {string} exchange - Exchange
 * @body {string} token - Symbol token
 * @body {string} interval - Interval (ONE_MINUTE, FIVE_MINUTE, etc.)
 * @body {string} fromDate - From date (YYYY-MM-DD HH:mm)
 * @body {string} toDate - To date (YYYY-MM-DD HH:mm)
 */
const getCandleData = catchAsync(async (req, res) => {
  const { exchange, token, interval, fromDate, toDate } = req.body;

  if (!exchange || !token || !interval || !fromDate || !toDate) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: exchange, token, interval, fromDate, toDate',
    });
  }

  const result = await marketService.getCandleData({
    exchange,
    symbolToken: token,
    interval,
    fromDate,
    toDate,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  getLTP,
  getMarketDepth,
  getQuotes,
  searchStocks,
  getCandleData,
};
