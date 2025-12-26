const mockConfig = require('../../../config/mockMarket.config');
const dataGenerator = require('./dataGenerator.service');
const logger = require('../../../config/logger');

/**
 * Mock Market Service
 * Provides market data operations similar to real providers
 */
class MockService {
  constructor() {
    this.isLoggedIn = true; // Mock is always "logged in"
    this.sessionData = {
      accessToken: 'mock_access_token',
      userId: 'mock_user',
      provider: 'MOCK',
    };
  }

  /**
   * Ensure logged in (always true for mock)
   * @returns {Promise<boolean>}
   */
  async ensureLoggedIn() {
    return true;
  }

  /**
   * Get session data
   * @returns {object}
   */
  getSessionData() {
    return this.sessionData;
  }

  /**
   * Search instruments
   * @param {string} query - Search query
   * @returns {Promise<Array>}
   */
  async searchInstruments(query) {
    const results = mockConfig.stocks
      .filter(
        (stock) =>
          stock.tradingSymbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase()),
      )
      .map((stock) => ({
        tradingSymbol: stock.tradingSymbol,
        exchange: stock.exchange,
        instrumentToken: stock.instrumentToken,
        exchangeToken: stock.exchangeToken,
        name: stock.name,
        lotSize: stock.lotSize,
        tickSize: stock.tickSize,
      }));

    logger.info(`Search for "${query}" returned ${results.length} results`);
    return results;
  }

  /**
   * Get instrument details
   * @param {string} exchange
   * @param {string} tradingSymbol
   * @returns {Promise<object>}
   */
  async getInstrumentDetails(exchange, tradingSymbol) {
    const stock = mockConfig.stocks.find((s) => s.exchange === exchange && s.tradingSymbol === tradingSymbol);

    if (!stock) {
      throw new Error(`Instrument not found: ${exchange}:${tradingSymbol}`);
    }

    const state = dataGenerator.getStockState(stock.instrumentToken);

    return {
      ...stock,
      currentPrice: state.currentPrice,
      lastPrice: state.lastPrice,
      open: state.open,
      high: state.high,
      low: state.low,
      close: state.close,
      volume: state.volume,
    };
  }

  /**
   * Get quote for instruments
   * @param {Array<string>} instruments - Array of "EXCHANGE:SYMBOL"
   * @returns {Promise<object>}
   */
  async getQuote(instruments) {
    const quotes = {};

    for (const instrument of instruments) {
      const [exchange, symbol] = instrument.split(':');
      const stock = mockConfig.stocks.find((s) => s.exchange === exchange && s.tradingSymbol === symbol);

      if (stock) {
        const quote = dataGenerator.generateQuote(stock.instrumentToken);
        quotes[instrument] = quote;
      }
    }

    return quotes;
  }

  /**
   * Get OHLC data
   * @param {Array<string>} instruments
   * @returns {Promise<object>}
   */
  async getOHLC(instruments) {
    const ohlcData = {};

    for (const instrument of instruments) {
      const [exchange, symbol] = instrument.split(':');
      const stock = mockConfig.stocks.find((s) => s.exchange === exchange && s.tradingSymbol === symbol);

      if (stock) {
        const state = dataGenerator.getStockState(stock.instrumentToken);
        ohlcData[instrument] = {
          instrumentToken: stock.instrumentToken,
          ohlc: {
            open: state.open,
            high: state.high,
            low: state.low,
            close: state.currentPrice,
          },
        };
      }
    }

    return ohlcData;
  }

  /**
   * Get LTP (Last Traded Price)
   * @param {Array<string>} instruments
   * @returns {Promise<object>}
   */
  async getLTP(instruments) {
    const ltpData = {};

    for (const instrument of instruments) {
      const [exchange, symbol] = instrument.split(':');
      const stock = mockConfig.stocks.find((s) => s.exchange === exchange && s.tradingSymbol === symbol);

      if (stock) {
        const state = dataGenerator.getStockState(stock.instrumentToken);
        ltpData[instrument] = {
          instrumentToken: stock.instrumentToken,
          lastPrice: state.currentPrice,
        };
      }
    }

    return ltpData;
  }

  /**
   * Get all available instruments
   * @returns {Promise<Array>}
   */
  async getAllInstruments() {
    return mockConfig.stocks.map((stock) => ({
      tradingSymbol: stock.tradingSymbol,
      exchange: stock.exchange,
      instrumentToken: stock.instrumentToken,
      exchangeToken: stock.exchangeToken,
      name: stock.name,
      lotSize: stock.lotSize,
      tickSize: stock.tickSize,
      sector: stock.sector,
    }));
  }

  /**
   * Place order (mock implementation)
   * @param {object} orderParams
   * @returns {Promise<object>}
   */
  async placeOrder(orderParams) {
    const orderId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Mock order placed:', { orderId, ...orderParams });

    return {
      orderId,
      status: 'SUCCESS',
      message: 'Order placed successfully (MOCK)',
      orderParams,
    };
  }

  /**
   * Get orders
   * @returns {Promise<Array>}
   */
  async getOrders() {
    // Return empty array for mock
    return [];
  }

  /**
   * Get positions
   * @returns {Promise<object>}
   */
  async getPositions() {
    // Return empty positions for mock
    return {
      net: [],
      day: [],
    };
  }

  /**
   * Get holdings
   * @returns {Promise<Array>}
   */
  async getHoldings() {
    // Return empty holdings for mock
    return [];
  }

  /**
   * Cancel order
   * @param {string} orderId
   * @returns {Promise<object>}
   */
  async cancelOrder(orderId) {
    logger.info(`Mock order cancelled: ${orderId}`);
    return {
      orderId,
      status: 'CANCELLED',
    };
  }

  /**
   * Modify order
   * @param {string} orderId
   * @param {object} params
   * @returns {Promise<object>}
   */
  async modifyOrder(orderId, params) {
    logger.info(`Mock order modified: ${orderId}`, params);
    return {
      orderId,
      status: 'MODIFIED',
      params,
    };
  }

  /**
   * Get market status
   * @returns {object}
   */
  getMarketStatus() {
    const now = new Date();
    const day = now.getDay();
    const isOpen = !mockConfig.marketTiming.closedDays.includes(day);

    return {
      isOpen,
      openTime: mockConfig.marketTiming.openTime,
      closeTime: mockConfig.marketTiming.closeTime,
      timezone: mockConfig.marketTiming.timezone,
    };
  }
}

module.exports = new MockService();
