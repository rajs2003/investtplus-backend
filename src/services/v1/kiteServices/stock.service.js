const kiteService = require('./kite.service');
const logger = require('../../../config/logger');
const { getCurrentISTTime, isMarketOpen, parseExchange } = require('../../../utils/marketUtils');

/**
 * Get real-time stock price based on current IST time
 * @param {string} tradingSymbol - Trading symbol (e.g., "RELIANCE")
 * @param {string} exchange - Exchange (NSE, BSE, etc.)
 * @param {string} symbolToken - Symbol token (instrument token)
 * @returns {Promise<Object>} Real-time price data with market status
 */
const getRealtimeStockPrice = async (tradingSymbol, exchange, symbolToken) => {
  try {
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    const standardizedExchange = parseExchange(exchange);
    const currentTime = getCurrentISTTime();
    const marketStatus = isMarketOpen();

    const instrument = `${standardizedExchange}:${tradingSymbol}`;
    const response = await kc.getQuote([instrument]);

    if (response && response[instrument]) {
      const stockData = response[instrument];

      return {
        success: true,
        data: {
          symbol: tradingSymbol,
          symbolToken: symbolToken,
          exchange: standardizedExchange,
          lastPrice: parseFloat(stockData.last_price || 0),
          open: parseFloat(stockData.ohlc?.open || 0),
          high: parseFloat(stockData.ohlc?.high || 0),
          low: parseFloat(stockData.ohlc?.low || 0),
          close: parseFloat(stockData.ohlc?.close || 0),
          volume: parseInt(stockData.volume || 0, 10),
          marketStatus: marketStatus ? 'OPEN' : 'CLOSED',
          timestamp: currentTime.format('YYYY-MM-DD HH:mm:ss'),
          timezone: 'Asia/Kolkata',
        },
      };
    } else {
      throw new Error('Failed to fetch stock price from Kite');
    }
  } catch (error) {
    logger.error('Error fetching realtime stock price from Kite:', error);
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
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    const standardizedExchange = parseExchange(exchange);
    const currentTime = getCurrentISTTime();
    const marketStatus = isMarketOpen();

    const instrument = `${standardizedExchange}:${tradingSymbol}`;
    const response = await kc.getQuote([instrument]);

    if (response && response[instrument]) {
      const stockData = response[instrument];

      return {
        success: true,
        data: {
          symbol: tradingSymbol,
          symbolToken: symbolToken,
          exchange: standardizedExchange,
          lastPrice: parseFloat(stockData.last_price || 0),
          open: parseFloat(stockData.ohlc?.open || 0),
          high: parseFloat(stockData.ohlc?.high || 0),
          low: parseFloat(stockData.ohlc?.low || 0),
          close: parseFloat(stockData.ohlc?.close || 0),
          volume: parseInt(stockData.volume || 0, 10),
          averagePrice: parseFloat(stockData.average_price || 0),
          upperCircuitLimit: parseFloat(stockData.upper_circuit_limit || 0),
          lowerCircuitLimit: parseFloat(stockData.lower_circuit_limit || 0),
          marketDepth: stockData.depth || null,
          marketStatus: marketStatus ? 'OPEN' : 'CLOSED',
          timestamp: currentTime.format('YYYY-MM-DD HH:mm:ss'),
          timezone: 'Asia/Kolkata',
          buyQuantity: parseInt(stockData.buy_quantity || 0, 10),
          sellQuantity: parseInt(stockData.sell_quantity || 0, 10),
          lastTradeTime: stockData.last_trade_time || null,
        },
      };
    } else {
      throw new Error('Failed to fetch stock details from Kite');
    }
  } catch (error) {
    logger.error('Error fetching stock details from Kite:', error);
    throw error;
  }
};

/**
 * Get stock quote with basic info
 * @param {string} tradingSymbol - Trading symbol
 * @param {string} exchange - Exchange
 * @returns {Promise<Object>} Stock quote
 */
const getStockQuote = async (tradingSymbol, exchange) => {
  try {
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    const standardizedExchange = parseExchange(exchange);
    const instrument = `${standardizedExchange}:${tradingSymbol}`;
    
    const response = await kc.getQuote([instrument]);

    if (response && response[instrument]) {
      return {
        success: true,
        data: response[instrument],
      };
    } else {
      throw new Error('Failed to fetch stock quote from Kite');
    }
  } catch (error) {
    logger.error('Error fetching stock quote from Kite:', error);
    throw error;
  }
};

/**
 * Search for stock by symbol or name
 * @param {string} query - Search query
 * @param {string} exchange - Exchange (optional)
 * @returns {Promise<Array>} Search results
 */
const searchStock = async (query, exchange = 'NSE') => {
  try {
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    const instruments = await kc.getInstruments(exchange);
    
    const searchRegex = new RegExp(query, 'i');
    const results = instruments.filter(instrument => 
      searchRegex.test(instrument.tradingsymbol) || 
      searchRegex.test(instrument.name)
    );

    return results.slice(0, 20).map(instrument => ({
      symbol: instrument.tradingsymbol,
      name: instrument.name,
      instrumentToken: instrument.instrument_token,
      exchange: instrument.exchange,
      instrumentType: instrument.instrument_type,
      segment: instrument.segment,
    }));
  } catch (error) {
    logger.error('Error searching stock in Kite:', error);
    throw error;
  }
};

/**
 * Get multiple stock prices
 * @param {Array<Object>} stocks - Array of {tradingSymbol, exchange}
 * @returns {Promise<Array>} Array of stock prices
 */
const getMultipleStockPrices = async (stocks) => {
  try {
    await kiteService.ensureLoggedIn();
    const kc = kiteService.getKiteInstance();

    const instruments = stocks.map(stock => `${stock.exchange}:${stock.tradingSymbol}`);
    const response = await kc.getLTP(instruments);

    const prices = [];
    for (const stock of stocks) {
      const instrument = `${stock.exchange}:${stock.tradingSymbol}`;
      if (response[instrument]) {
        prices.push({
          symbol: stock.tradingSymbol,
          exchange: stock.exchange,
          lastPrice: response[instrument].last_price,
        });
      }
    }

    return prices;
  } catch (error) {
    logger.error('Error fetching multiple stock prices from Kite:', error);
    throw error;
  }
};

module.exports = {
  getRealtimeStockPrice,
  getStockDetails,
  getStockQuote,
  searchStock,
  getMultipleStockPrices,
};
