const angelOneService = require('./angelone.service');
const logger = require('../../../config/logger');
const { formatMarketData } = require('../../../utils/marketUtils');

/**
 * Get LTP (Last Traded Price) for a specific stock
 * @param {string} exchange - Exchange name (NSE, BSE, etc.)
 * @param {string} symbolToken - Symbol token of the stock
 * @param {string} tradingSymbol - Trading symbol (optional)
 * @returns {Promise<Object>} LTP data
 */
const getLTP = async (exchange, symbolToken, tradingSymbol = '') => {
  try {
    await angelOneService.ensureLoggedIn();
    const smartApi = angelOneService.getSmartApiInstance();

    const ltpData = {
      exchange: exchange,
      tradingsymbol: tradingSymbol,
      symboltoken: symbolToken,
    };

    const response = await smartApi.getLTP(ltpData);

    if (response.status && response.data) {
      return formatMarketData(response.data);
    } else {
      throw new Error(response.message || 'Failed to fetch LTP');
    }
  } catch (error) {
    logger.error('Error fetching LTP:', error);
    throw error;
  }
};

/**
 * Get market depth (order book) for a stock
 * @param {string} exchange - Exchange name
 * @param {string} symbolToken - Symbol token
 * @returns {Promise<Object>} Market depth data
 */
const getMarketDepth = async (exchange, symbolToken) => {
  try {
    await angelOneService.ensureLoggedIn();
    const smartApi = angelOneService.getSmartApiInstance();

    const quoteParam = {
      mode: 'FULL',
      exchangeTokens: {
        [exchange]: [symbolToken],
      },
    };

    const response = await smartApi.getMarketData(quoteParam);

    if (response.status && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to fetch market depth');
    }
  } catch (error) {
    logger.error('Error fetching market depth:', error);
    throw error;
  }
};

/**
 * Get quote data for multiple stocks
 * @param {string} exchange - Exchange name
 * @param {Array<string>} symbolTokens - Array of symbol tokens
 * @returns {Promise<Array>} Quote data for multiple stocks
 */
const getQuotes = async (exchange, symbolTokens) => {
  try {
    await angelOneService.ensureLoggedIn();
    const smartApi = angelOneService.getSmartApiInstance();

    const quoteParam = {
      mode: 'QUOTE',
      exchangeTokens: {
        [exchange]: symbolTokens,
      },
    };

    const response = await smartApi.getMarketData(quoteParam);

    if (response.status && response.data && response.data.fetched) {
      return response.data.fetched.map(formatMarketData);
    } else {
      throw new Error(response.message || 'Failed to fetch quotes');
    }
  } catch (error) {
    logger.error('Error fetching quotes:', error);
    throw error;
  }
};

/**
 * Search for stocks/instruments
 * @param {string} searchText - Text to search
 * @param {string} exchange - Exchange to search in (optional)
 * @returns {Promise<Array>} Search results
 */
const searchStocks = async (searchText, exchange = '') => {
  try {
    await angelOneService.ensureLoggedIn();
    const smartApi = angelOneService.getSmartApiInstance();

    const searchParam = {
      exchange: exchange,
      searchscrip: searchText,
    };

    const response = await smartApi.searchScrip(searchParam);

    if (response.status && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to search stocks');
    }
  } catch (error) {
    logger.error('Error searching stocks:', error);
    throw error;
  }
};

/**
 * Get all holdings
 * @returns {Promise<Array>} Holdings data
 */
const getAllHoldings = async () => {
  try {
    await angelOneService.ensureLoggedIn();
    const smartApi = angelOneService.getSmartApiInstance();

    const response = await smartApi.getHolding();

    if (response.status && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to fetch holdings');
    }
  } catch (error) {
    logger.error('Error fetching holdings:', error);
    throw error;
  }
};

/**
 * Get candle data (OHLC) for historical data
 * @param {Object} params - Candle data parameters
 * @param {string} params.exchange - Exchange name
 * @param {string} params.symbolToken - Symbol token
 * @param {string} params.interval - Interval (ONE_MINUTE, THREE_MINUTE, FIVE_MINUTE, etc.)
 * @param {string} params.fromDate - From date (YYYY-MM-DD HH:mm)
 * @param {string} params.toDate - To date (YYYY-MM-DD HH:mm)
 * @returns {Promise<Array>} Candle data
 */
const getCandleData = async ({ exchange, symbolToken, interval, fromDate, toDate }) => {
  try {
    await angelOneService.ensureLoggedIn();
    const smartApi = angelOneService.getSmartApiInstance();

    const candleParam = {
      exchange: exchange,
      symboltoken: symbolToken,
      interval: interval,
      fromdate: fromDate,
      todate: toDate,
    };

    const response = await smartApi.getCandleData(candleParam);

    if (response.status && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to fetch candle data');
    }
  } catch (error) {
    logger.error('Error fetching candle data:', error);
    throw error;
  }
};

module.exports = {
  getLTP,
  getMarketDepth,
  getQuotes,
  searchStocks,
  getAllHoldings,
  getCandleData,
};
