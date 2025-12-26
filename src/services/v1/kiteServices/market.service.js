const kiteService = require('./kite.service');
const logger = require('../../../config/logger');

/**
 * Get LTP (Last Traded Price) for a specific stock
 * @param {string} exchange - Exchange name (NSE, BSE, etc.)
 * @param {string} symbolToken - Symbol token (instrument token for Kite)
 * @param {string} tradingSymbol - Trading symbol
 * @returns {Promise<Object>} LTP data
 */
const getLTP = async (exchange, symbolToken, tradingSymbol = '') => {
  try {
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    // Kite uses instrument_token
    const instruments = [`${exchange}:${tradingSymbol}`];
    const response = await kc.getLTP(instruments);

    if (response && response[`${exchange}:${tradingSymbol}`]) {
      const data = response[`${exchange}:${tradingSymbol}`];
      return {
        ltp: data.last_price,
        symbolToken: symbolToken,
        tradingSymbol: tradingSymbol,
        exchange: exchange,
      };
    } else {
      throw new Error('Failed to fetch LTP from Kite');
    }
  } catch (error) {
    logger.error('Error fetching LTP from Kite:', error);
    throw error;
  }
};

/**
 * Get market depth (order book) for a stock
 * @param {string} exchange - Exchange name
 * @param {string} symbolToken - Symbol token (instrument token)
 * @returns {Promise<Object>} Market depth data
 */
const getMarketDepth = async (exchange, symbolToken) => {
  try {
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    // Use instrument token to get quote with depth
    const instruments = [symbolToken];
    const response = await kc.getQuote(instruments);

    if (response && response[symbolToken]) {
      return response[symbolToken];
    } else {
      throw new Error('Failed to fetch market depth from Kite');
    }
  } catch (error) {
    logger.error('Error fetching market depth from Kite:', error);
    throw error;
  }
};

/**
 * Get quote data for multiple stocks
 * @param {string} exchange - Exchange name
 * @param {Array<string>} symbolTokens - Array of trading symbols
 * @returns {Promise<Array>} Quote data for multiple stocks
 */
const getQuotes = async (exchange, symbolTokens) => {
  try {
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    // Format instruments as exchange:symbol
    const instruments = symbolTokens.map((token) => `${exchange}:${token}`);
    const response = await kc.getQuote(instruments);

    const quotes = [];
    for (const instrument of instruments) {
      if (response[instrument]) {
        quotes.push({
          ...response[instrument],
          exchange: exchange,
        });
      }
    }

    return quotes;
  } catch (error) {
    logger.error('Error fetching quotes from Kite:', error);
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
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    // Get all instruments and filter
    const instruments = await kc.getInstruments(exchange || undefined);

    const searchRegex = new RegExp(searchText, 'i');
    const results = instruments.filter(
      (instrument) => searchRegex.test(instrument.tradingsymbol) || searchRegex.test(instrument.name),
    );

    return results.slice(0, 20); // Limit to 20 results
  } catch (error) {
    logger.error('Error searching stocks in Kite:', error);
    throw error;
  }
};

/**
 * Get all holdings
 * @returns {Promise<Array>} Holdings data
 */
const getAllHoldings = async () => {
  try {
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    const holdings = await kc.getHoldings();
    return holdings;
  } catch (error) {
    logger.error('Error fetching holdings from Kite:', error);
    throw error;
  }
};

/**
 * Get candle data (OHLC) for historical data
 * @param {Object} params - Candle data parameters
 * @param {string} params.exchange - Exchange name
 * @param {string} params.symbolToken - Symbol token (instrument token)
 * @param {string} params.interval - Interval (minute, 3minute, 5minute, day, etc.)
 * @param {string} params.fromDate - From date (YYYY-MM-DD)
 * @param {string} params.toDate - To date (YYYY-MM-DD)
 * @returns {Promise<Array>} Candle data
 */
const getCandleData = async ({ symbolToken, interval, fromDate, toDate }) => {
  try {
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    // Convert interval format (AngelOne to Kite format)
    const intervalMap = {
      ONE_MINUTE: 'minute',
      THREE_MINUTE: '3minute',
      FIVE_MINUTE: '5minute',
      TEN_MINUTE: '10minute',
      FIFTEEN_MINUTE: '15minute',
      THIRTY_MINUTE: '30minute',
      ONE_HOUR: '60minute',
      ONE_DAY: 'day',
    };

    const kiteInterval = intervalMap[interval] || interval;

    const response = await kc.getHistoricalData(symbolToken, kiteInterval, fromDate, toDate);

    return response;
  } catch (error) {
    logger.error('Error fetching candle data from Kite:', error);
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
