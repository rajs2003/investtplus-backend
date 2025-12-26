const mockConfig = require('../../../config/mockMarket.config');
const logger = require('../../../config/logger');

/**
 * Mock Market Data Generator Service
 * Generates realistic random market data based on configuration
 */
class DataGeneratorService {
  constructor() {
    this.stockStates = new Map(); // Store current state of each stock
    this.trendCounters = new Map(); // Track trend duration for each stock
    this.initialize();
  }

  /**
   * Initialize stock states with initial prices
   */
  initialize() {
    mockConfig.stocks.forEach((stock) => {
      this.stockStates.set(stock.instrumentToken, {
        ...stock,
        currentPrice: stock.initialPrice,
        lastPrice: stock.initialPrice,
        open: stock.initialPrice,
        high: stock.initialPrice,
        low: stock.initialPrice,
        close: stock.initialPrice,
        volume: 0,
        totalBuyQuantity: 0,
        totalSellQuantity: 0,
        trend: Math.random() > 0.5 ? 'bullish' : 'bearish', // Random initial trend
        lastUpdate: new Date(),
      });
      this.trendCounters.set(stock.instrumentToken, 0);
    });

    mockConfig.indices.forEach((index) => {
      this.stockStates.set(index.instrumentToken, {
        ...index,
        currentPrice: index.initialValue,
        lastPrice: index.initialValue,
        open: index.initialValue,
        high: index.initialValue,
        low: index.initialValue,
        close: index.initialValue,
        lastUpdate: new Date(),
      });
      this.trendCounters.set(index.instrumentToken, 0);
    });

    logger.info(`Data generator initialized with ${this.stockStates.size} instruments`);
  }

  /**
   * Generate next price tick for a stock
   * @param {number} instrumentToken
   * @returns {object} Updated tick data
   */
  generateTick(instrumentToken) {
    const state = this.stockStates.get(instrumentToken);
    if (!state) {
      logger.warn(`Stock with token ${instrumentToken} not found`);
      return null;
    }

    const config = mockConfig.fluctuation;

    // Check if trend should reverse
    let trendCounter = this.trendCounters.get(instrumentToken);
    trendCounter++;
    if (trendCounter >= config.trendDuration) {
      state.trend = state.trend === 'bullish' ? 'bearish' : 'bullish';
      trendCounter = 0;
      logger.debug(`Trend reversed for ${state.tradingSymbol}: ${state.trend}`);
    }
    this.trendCounters.set(instrumentToken, trendCounter);

    // Calculate price change
    const changePercent = this.calculatePriceChange(state, config);
    const priceChange = state.currentPrice * (changePercent / 100);
    let newPrice = state.currentPrice + priceChange;

    // Apply circuit breaker limits
    if (mockConfig.settings.enableCircuitBreakers) {
      newPrice = Math.max(state.minPrice || 0, Math.min(newPrice, state.maxPrice || Infinity));
    }

    // Round to tick size
    if (state.tickSize) {
      newPrice = Math.round(newPrice / state.tickSize) * state.tickSize;
    }

    // Update state
    state.lastPrice = state.currentPrice;
    state.currentPrice = parseFloat(newPrice.toFixed(2));
    state.high = Math.max(state.high, state.currentPrice);
    state.low = Math.min(state.low, state.currentPrice);
    state.change = state.currentPrice - state.open;
    state.changePercent = ((state.change / state.open) * 100).toFixed(2);

    // Generate volume
    const volumeIncrement = this.generateVolume();
    state.volume += volumeIncrement;

    // Generate buy/sell quantities
    state.totalBuyQuantity = Math.floor(Math.random() * 1000000) + 100000;
    state.totalSellQuantity = Math.floor(Math.random() * 1000000) + 100000;

    state.lastUpdate = new Date();

    return this.formatTickData(state);
  }

  /**
   * Calculate price change based on trend and volatility
   * @param {object} state
   * @param {object} config
   * @returns {number} Change percentage
   */
  calculatePriceChange(state, config) {
    const { maxChangePercent, minChangePercent, volatilityFactor } = config;

    // Base random change
    let change = (Math.random() - 0.5) * 2 * maxChangePercent;

    // Apply volatility
    change *= volatilityFactor;

    // Apply trend bias
    const trendBias = state.trend === 'bullish' ? 0.3 : -0.3;
    change += trendBias * Math.random();

    // Ensure minimum change
    if (Math.abs(change) < minChangePercent) {
      change = minChangePercent * (change >= 0 ? 1 : -1);
    }

    return change;
  }

  /**
   * Generate random volume increment
   * @returns {number} Volume
   */
  generateVolume() {
    const { baseMultiplier, minVolume, maxVolume } = mockConfig.volume;
    const volume = Math.floor(Math.random() * baseMultiplier) + minVolume;
    return Math.min(volume, maxVolume);
  }

  /**
   * Format tick data to match real market data structure
   * @param {object} state
   * @returns {object} Formatted tick
   */
  formatTickData(state) {
    return {
      tradingSymbol: state.tradingSymbol,
      exchangeToken: state.exchangeToken,
      instrumentToken: state.instrumentToken,
      exchange: state.exchange,
      lastPrice: state.currentPrice,
      lastTradedPrice: state.currentPrice,
      lastQuantity: Math.floor(Math.random() * 100) + 1,
      averagePrice: ((state.open + state.high + state.low + state.currentPrice) / 4).toFixed(2),
      volume: state.volume,
      buyQuantity: state.totalBuyQuantity,
      sellQuantity: state.totalSellQuantity,
      open: state.open,
      high: state.high,
      low: state.low,
      close: state.currentPrice,
      change: parseFloat(state.change.toFixed(2)),
      changePercent: parseFloat(state.changePercent),
      lastTradeTime: state.lastUpdate.toISOString(),
      ohlc: {
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.currentPrice,
      },
      mode: 'full',
      timestamp: new Date(),
    };
  }

  /**
   * Generate market depth data
   * @param {number} instrumentToken
   * @returns {object} Market depth
   */
  generateMarketDepth(instrumentToken) {
    const state = this.stockStates.get(instrumentToken);
    if (!state || !mockConfig.settings.enableMarketDepth) {
      return null;
    }

    const depth = {
      buy: [],
      sell: [],
    };

    const currentPrice = state.currentPrice;
    const tickSize = state.tickSize || 0.05;
    const levels = mockConfig.settings.depthLevels;

    // Generate buy orders (below current price)
    for (let i = 0; i < levels; i++) {
      const price = currentPrice - tickSize * (i + 1);
      depth.buy.push({
        price: parseFloat(price.toFixed(2)),
        quantity: Math.floor(Math.random() * 10000) + 100,
        orders: Math.floor(Math.random() * 50) + 1,
      });
    }

    // Generate sell orders (above current price)
    for (let i = 0; i < levels; i++) {
      const price = currentPrice + tickSize * (i + 1);
      depth.sell.push({
        price: parseFloat(price.toFixed(2)),
        quantity: Math.floor(Math.random() * 10000) + 100,
        orders: Math.floor(Math.random() * 50) + 1,
      });
    }

    return {
      instrumentToken,
      depth,
      timestamp: new Date(),
    };
  }

  /**
   * Generate full quote data
   * @param {number} instrumentToken
   * @returns {object} Full quote
   */
  generateQuote(instrumentToken) {
    const tick = this.generateTick(instrumentToken);
    if (!tick) return null;

    const depth = this.generateMarketDepth(instrumentToken);

    return {
      ...tick,
      depth: depth ? depth.depth : null,
      oi: Math.floor(Math.random() * 1000000), // Open Interest (for futures/options)
      oiDayHigh: Math.floor(Math.random() * 1200000),
      oiDayLow: Math.floor(Math.random() * 800000),
    };
  }

  /**
   * Reset daily data (call at market open)
   */
  resetDailyData() {
    this.stockStates.forEach((state) => {
      state.open = state.currentPrice;
      state.high = state.currentPrice;
      state.low = state.currentPrice;
      state.close = state.currentPrice;
      state.volume = 0;
      state.change = 0;
      state.changePercent = 0;
    });
    logger.info('Daily data reset for all instruments');
  }

  /**
   * Get current state of a stock
   * @param {number} instrumentToken
   * @returns {object} Current state
   */
  getStockState(instrumentToken) {
    return this.stockStates.get(instrumentToken);
  }

  /**
   * Get all stock states
   * @returns {Map} All stock states
   */
  getAllStates() {
    return this.stockStates;
  }

  /**
   * Update stock configuration dynamically
   * @param {number} instrumentToken
   * @param {object} updates
   */
  updateStockConfig(instrumentToken, updates) {
    const state = this.stockStates.get(instrumentToken);
    if (state) {
      Object.assign(state, updates);
      logger.info(`Updated config for ${state.tradingSymbol}`);
    }
  }
}

module.exports = new DataGeneratorService();
