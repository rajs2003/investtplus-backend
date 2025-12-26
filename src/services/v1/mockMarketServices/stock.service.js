const mockService = require('./mock.service');
const dataGenerator = require('./dataGenerator.service');
const mockConfig = require('../../../config/mockMarket.config');
const logger = require('../../../config/logger');

/**
 * Mock Stock Service
 * Provides stock-specific operations
 */
class MockStockService {
  /**
   * Search stocks by query
   * @param {string} query
   * @returns {Promise<Array>}
   */
  async searchStocks(query) {
    return mockService.searchInstruments(query);
  }

  /**
   * Get stock details
   * @param {string} exchange
   * @param {string} symbol
   * @returns {Promise<object>}
   */
  async getStockDetails(exchange, symbol) {
    return mockService.getInstrumentDetails(exchange, symbol);
  }

  /**
   * Get stock quote
   * @param {string} exchange
   * @param {string} symbol
   * @returns {Promise<object>}
   */
  async getStockQuote(exchange, symbol) {
    const instrument = `${exchange}:${symbol}`;
    const quotes = await mockService.getQuote([instrument]);
    return quotes[instrument] || null;
  }

  /**
   * Get multiple stock quotes
   * @param {Array<object>} stocks - Array of {exchange, symbol}
   * @returns {Promise<Array>}
   */
  async getMultipleQuotes(stocks) {
    const instruments = stocks.map((s) => `${s.exchange}:${s.symbol}`);
    const quotes = await mockService.getQuote(instruments);
    return Object.values(quotes);
  }

  /**
   * Get stock OHLC
   * @param {string} exchange
   * @param {string} symbol
   * @returns {Promise<object>}
   */
  async getStockOHLC(exchange, symbol) {
    const instrument = `${exchange}:${symbol}`;
    const ohlc = await mockService.getOHLC([instrument]);
    return ohlc[instrument] || null;
  }

  /**
   * Get historical data (mock implementation)
   * @param {object} params
   * @returns {Promise<Array>}
   */
  async getHistoricalData(params) {
    const { instrumentToken } = params;

    logger.info('Generating mock historical data:', params);

    // Generate mock historical candles
    const candles = [];
    const state = dataGenerator.getStockState(instrumentToken);

    if (!state) {
      throw new Error(`Instrument token ${instrumentToken} not found`);
    }

    // Generate some random historical data
    const numCandles = 100;
    let currentPrice = state.initialPrice;

    for (let i = numCandles; i >= 0; i--) {
      const timestamp = new Date(Date.now() - i * 60000); // 1 minute intervals
      const change = (Math.random() - 0.5) * 10;
      currentPrice += change;

      const open = currentPrice;
      const high = currentPrice + Math.random() * 5;
      const low = currentPrice - Math.random() * 5;
      const close = currentPrice + (Math.random() - 0.5) * 3;
      const volume = Math.floor(Math.random() * 100000) + 1000;

      candles.push({
        timestamp,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
      });
    }

    return candles;
  }

  /**
   * Get top gainers
   * @returns {Promise<Array>}
   */
  async getTopGainers() {
    const stocks = mockConfig.stocks.slice(0, 5).map((stock) => {
      const state = dataGenerator.getStockState(stock.instrumentToken);
      return {
        tradingSymbol: stock.tradingSymbol,
        exchange: stock.exchange,
        name: stock.name,
        lastPrice: state.currentPrice,
        change: state.change,
        changePercent: state.changePercent,
      };
    });

    return stocks.sort((a, b) => b.changePercent - a.changePercent);
  }

  /**
   * Get top losers
   * @returns {Promise<Array>}
   */
  async getTopLosers() {
    const stocks = mockConfig.stocks.slice(0, 5).map((stock) => {
      const state = dataGenerator.getStockState(stock.instrumentToken);
      return {
        tradingSymbol: stock.tradingSymbol,
        exchange: stock.exchange,
        name: stock.name,
        lastPrice: state.currentPrice,
        change: state.change,
        changePercent: state.changePercent,
      };
    });

    return stocks.sort((a, b) => a.changePercent - b.changePercent);
  }

  /**
   * Get stocks by sector
   * @param {string} sector
   * @returns {Promise<Array>}
   */
  async getStocksBySector(sector) {
    const stocks = mockConfig.stocks
      .filter((stock) => stock.sector === sector)
      .map((stock) => {
        const state = dataGenerator.getStockState(stock.instrumentToken);
        return {
          ...stock,
          currentPrice: state.currentPrice,
          change: state.change,
          changePercent: state.changePercent,
        };
      });

    return stocks;
  }

  /**
   * Get all available sectors
   * @returns {Promise<Array>}
   */
  async getSectors() {
    const sectors = [...new Set(mockConfig.stocks.map((stock) => stock.sector))];
    return sectors;
  }
}

module.exports = new MockStockService();
