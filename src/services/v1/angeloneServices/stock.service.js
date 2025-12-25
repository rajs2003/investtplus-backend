const angelOneService = require('./angelone.service');
const logger = require('../../../config/logger');
const { getCurrentISTTime, isMarketOpen, parseExchange } = require('../../../utils/marketUtils');

/**
 * Get real-time stock price based on current IST time
 * @param {string} tradingSymbol - Trading symbol (e.g., "RELIANCE-EQ")
 * @param {string} exchange - Exchange (NSE, BSE, etc.)
 * @param {string} symbolToken - Symbol token
 * @returns {Promise<Object>} Real-time price data with market status
 */
const getRealtimeStockPrice = async (tradingSymbol, exchange, symbolToken) => {
  try {
    await angelOneService.ensureLoggedIn();
    const smartApi = angelOneService.getSmartApiInstance();

    const standardizedExchange = parseExchange(exchange);
    const currentTime = getCurrentISTTime();
    const marketStatus = isMarketOpen();

    const ltpData = {
      exchange: standardizedExchange,
      tradingsymbol: tradingSymbol,
      symboltoken: symbolToken,
    };

    const response = await smartApi.getLTP(ltpData);

    if (response.status && response.data) {
      return {
        success: true,
        data: {
          symbol: tradingSymbol,
          symbolToken: symbolToken,
          exchange: standardizedExchange,
          lastPrice: parseFloat(response.data.ltp || 0),
          open: parseFloat(response.data.open || 0),
          high: parseFloat(response.data.high || 0),
          low: parseFloat(response.data.low || 0),
          close: parseFloat(response.data.close || 0),
          volume: parseInt(response.data.volume || 0, 10),
          marketStatus: marketStatus ? 'OPEN' : 'CLOSED',
          timestamp: currentTime.format('YYYY-MM-DD HH:mm:ss'),
          timezone: 'Asia/Kolkata',
        },
      };
    } else {
      throw new Error(response.message || 'Failed to fetch stock price');
    }
  } catch (error) {
    logger.error('Error fetching realtime stock price:', error);
    throw error;
  }
};

/**
 * Get full stock details with market depth
 * @param {string} tradingSymbol - Trading symbol
 * @param {string} exchange - Exchange
 * @param {string} symbolToken - Symbol token
 * @returns {Promise<Object>} Complete stock details
 */
const getStockDetails = async (tradingSymbol, exchange, symbolToken) => {
  try {
    await angelOneService.ensureLoggedIn();
    const smartApi = angelOneService.getSmartApiInstance();

    const standardizedExchange = parseExchange(exchange);
    const currentTime = getCurrentISTTime();
    const marketStatus = isMarketOpen();

    const quoteParam = {
      mode: 'FULL',
      exchangeTokens: {
        [standardizedExchange]: [symbolToken],
      },
    };

    const response = await smartApi.getMarketData(quoteParam);

    if (response.status && response.data && response.data.fetched && response.data.fetched.length > 0) {
      const stockData = response.data.fetched[0];

      return {
        success: true,
        data: {
          symbol: tradingSymbol,
          symbolToken: symbolToken,
          exchange: standardizedExchange,
          lastPrice: parseFloat(stockData.ltp || 0),
          open: parseFloat(stockData.open || 0),
          high: parseFloat(stockData.high || 0),
          low: parseFloat(stockData.low || 0),
          close: parseFloat(stockData.close || 0),
          volume: parseInt(stockData.volume || 0, 10),
          averagePrice: parseFloat(stockData.avgPrice || 0),
          upperCircuitLimit: parseFloat(stockData.upperCircuitLimit || 0),
          lowerCircuitLimit: parseFloat(stockData.lowerCircuitLimit || 0),
          marketDepth: stockData.depth || null,
          marketStatus: marketStatus ? 'OPEN' : 'CLOSED',
          timestamp: currentTime.format('YYYY-MM-DD HH:mm:ss'),
          timezone: 'Asia/Kolkata',
        },
      };
    } else {
      throw new Error(response.message || 'Failed to fetch stock details');
    }
  } catch (error) {
    logger.error('Error fetching stock details:', error);
    throw error;
  }
};

/**
 * Get multiple stocks data at once
 * @param {Array<Object>} stocks - Array of {tradingSymbol, exchange, symbolToken}
 * @returns {Promise<Object>} Multiple stocks data
 */
const getMultipleStocksPrices = async (stocks) => {
  try {
    await angelOneService.ensureLoggedIn();
    const smartApi = angelOneService.getSmartApiInstance();

    const currentTime = getCurrentISTTime();
    const marketStatus = isMarketOpen();

    // Group stocks by exchange
    const exchangeTokens = {};
    const symbolMap = {};

    stocks.forEach((stock) => {
      const standardizedExchange = parseExchange(stock.exchange);
      if (!exchangeTokens[standardizedExchange]) {
        exchangeTokens[standardizedExchange] = [];
      }
      exchangeTokens[standardizedExchange].push(stock.symbolToken);
      symbolMap[stock.symbolToken] = stock;
    });

    const quoteParam = {
      mode: 'QUOTE',
      exchangeTokens: exchangeTokens,
    };

    const response = await smartApi.getMarketData(quoteParam);

    if (response.status && response.data && response.data.fetched) {
      const results = response.data.fetched.map((item) => {
        const stockInfo = symbolMap[item.symboltoken];
        return {
          symbol: stockInfo?.tradingSymbol || item.tradingsymbol,
          symbolToken: item.symboltoken,
          exchange: item.exchange,
          lastPrice: parseFloat(item.ltp || 0),
          open: parseFloat(item.open || 0),
          high: parseFloat(item.high || 0),
          low: parseFloat(item.low || 0),
          close: parseFloat(item.close || 0),
          volume: parseInt(item.volume || 0, 10),
          change: parseFloat(item.change || 0),
          changePercent: parseFloat(item.changePercent || 0),
        };
      });

      return {
        success: true,
        data: results,
        marketStatus: marketStatus ? 'OPEN' : 'CLOSED',
        timestamp: currentTime.format('YYYY-MM-DD HH:mm:ss'),
        timezone: 'Asia/Kolkata',
      };
    } else {
      throw new Error(response.message || 'Failed to fetch multiple stocks data');
    }
  } catch (error) {
    logger.error('Error fetching multiple stocks prices:', error);
    throw error;
  }
};

module.exports = {
  getRealtimeStockPrice,
  getStockDetails,
  getMultipleStocksPrices,
};
