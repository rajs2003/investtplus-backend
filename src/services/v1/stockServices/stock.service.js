/* eslint-disable no-unused-vars */
const { marketDataService } = require('../mockMarket');
const stocksData = require('../../../data/stocks.json');

/**
 * Get all stocks with current market prices
 */
const getAllStocksWithPrices = async () => {
  return stocksData.stocks.map((stock) => {
    const priceData = marketDataService.getCurrentPrice(stock.symbol, stock.exchange);
    return {
      ...stock,
      ...priceData.data,
    };
  });
};

/**
 * Get specific stock details with live price
 */
const getStockDetailsWithPrice = async (symbol, exchange = 'NSE') => {
  const stock = stocksData.stocks.find((s) => s.symbol === symbol && s.exchange === exchange);
  if (!stock) {
    return null;
  }

  const priceData = marketDataService.getCurrentPrice(symbol, exchange);
  const depth = marketDataService.getMarketDepth(symbol, exchange);

  return {
    ...stock,
    ...priceData.data,
    depth: depth.data,
  };
};

/**
 * Search stocks by name or symbol
 */
const searchStocksQuery = (query) => {
  const lowerQuery = query.toLowerCase();
  return stocksData.stocks
    .filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(lowerQuery) ||
        stock.name.toLowerCase().includes(lowerQuery) ||
        stock.sector.toLowerCase().includes(lowerQuery),
    )
    .map((stock) => {
      const priceData = marketDataService.getCurrentPrice(stock.symbol, stock.exchange);
      return {
        ...stock,
        ...priceData.data,
      };
    });
};

/**
 * Get stock by symbol (existing method signature)
 */
const getStockDetails = async (symbol, exchange = 'NSE', token) => {
  return getStockDetailsWithPrice(symbol, exchange);
};

/**
 * Get multiple stocks prices
 */
const getMultipleStocksPrices = async (stocks) => {
  return stocks
    .map((stock) => {
      const stockData = stocksData.stocks.find((s) => s.symbol === stock.symbol);
      if (!stockData) return null;

      const priceData = marketDataService.getCurrentPrice(stock.symbol, stock.exchange || 'NSE');
      return {
        ...stockData,
        ...priceData.data,
      };
    })
    .filter(Boolean);
};

/**
 * Get realtime stock price
 */
const getRealtimeStockPrice = async (symbol, exchange = 'NSE', token) => {
  const stock = stocksData.stocks.find((s) => s.symbol === symbol && s.exchange === exchange);
  if (!stock) {
    return {
      success: false,
      message: 'Stock not found',
    };
  }

  const priceData = marketDataService.getCurrentPrice(symbol, exchange);
  return {
    success: true,
    data: {
      symbol,
      exchange,
      token,
      ...priceData.data,
    },
  };
};

module.exports = {
  getAllStocksWithPrices,
  getStockDetailsWithPrice,
  searchStocksQuery,
  getStockDetails,
  getMultipleStocksPrices,
  getRealtimeStockPrice,
};
