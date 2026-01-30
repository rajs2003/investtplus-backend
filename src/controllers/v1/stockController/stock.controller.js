const catchAsync = require('../../../utils/catchAsync');
const { stockService } = require('../../../services');
const { isMarketOpen } = require('../../../utils/marketUtils');
const httpStatus = require('http-status');

/**
 * Get all stocks with current prices
 * @route GET /api/v1/stocks
 */
const getAllStocks = catchAsync(async (req, res) => {
  const { limit = 100, page = 1, sort, search } = req.query;

  let stocks = await stockService.getAllStocksWithPrices();

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    stocks = stocks.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(searchLower) ||
        (stock.companyName || stock.name || '').toLowerCase().includes(searchLower) ||
        stock.sector.toLowerCase().includes(searchLower),
    );
  }

  // Apply sorting
  if (sort) {
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;

    stocks.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortOrder * (aVal > bVal ? 1 : aVal < bVal ? -1 : 0);
    });
  }

  // Apply pagination
  const limitNum = parseInt(limit);
  const pageNum = parseInt(page);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedStocks = stocks.slice(startIndex, endIndex);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Stocks retrieved successfully',
    results: paginatedStocks,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(stocks.length / limitNum),
    totalResults: stocks.length,
  });
});

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
 * @route GET /api/v1/stocks/:symbol
 * @param {string} symbol - Trading symbol (from URL params)
 * @query {string} exchange - Exchange (optional, defaults to NSE)
 */
const getStockBySymbol = catchAsync(async (req, res) => {
  const { symbol } = req.params;
  const { exchange = 'NSE' } = req.query;

  if (!symbol) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: symbol',
    });
  }

  const stock = await stockService.getStockDetailsWithPrice(symbol, exchange);

  if (!stock) {
    return res.status(httpStatus.NOT_FOUND).json({
      success: false,
      message: 'Stock not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Stock details retrieved successfully',
    stock: stock,
  });
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
  getAllStocks,
  getRealtimePrice,
  getStockBySymbol,
  getMultipleStocksPrices,
  getMarketStatus,
};
