const mockService = require('./mock.service');
const dataGenerator = require('./dataGenerator.service');
const mockConfig = require('../../../config/mockMarket.config');

/**
 * Mock Market Service
 * Provides market-level operations
 */
class MockMarketService {
  /**
   * Get market status
   * @returns {Promise<object>}
   */
  async getMarketStatus() {
    return mockService.getMarketStatus();
  }

  /**
   * Get indices data
   * @returns {Promise<Array>}
   */
  async getIndices() {
    return mockConfig.indices.map((index) => {
      const state = dataGenerator.getStockState(index.instrumentToken);
      return {
        tradingSymbol: index.tradingSymbol,
        name: index.name,
        instrumentToken: index.instrumentToken,
        lastPrice: state.currentPrice,
        change: state.change,
        changePercent: state.changePercent,
        open: state.open,
        high: state.high,
        low: state.low,
      };
    });
  }

  /**
   * Get market overview
   * @returns {Promise<object>}
   */
  async getMarketOverview() {
    const indices = await this.getIndices();
    const marketStatus = await this.getMarketStatus();

    return {
      marketStatus,
      indices,
      timestamp: new Date(),
      totalStocks: mockConfig.stocks.length,
    };
  }

  /**
   * Get quote for multiple instruments
   * @param {Array<string>} instruments
   * @returns {Promise<object>}
   */
  async getQuote(instruments) {
    return mockService.getQuote(instruments);
  }

  /**
   * Get OHLC for multiple instruments
   * @param {Array<string>} instruments
   * @returns {Promise<object>}
   */
  async getOHLC(instruments) {
    return mockService.getOHLC(instruments);
  }

  /**
   * Get LTP for multiple instruments
   * @param {Array<string>} instruments
   * @returns {Promise<object>}
   */
  async getLTP(instruments) {
    return mockService.getLTP(instruments);
  }
}

module.exports = new MockMarketService();
