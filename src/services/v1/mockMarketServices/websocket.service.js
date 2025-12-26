const EventEmitter = require('events');
const dataGenerator = require('./dataGenerator.service');
const mockConfig = require('../../../config/mockMarket.config');
const logger = require('../../../config/logger');

/**
 * Mock WebSocket Service
 * Simulates real-time market data streaming
 */
class MockWebSocketService extends EventEmitter {
  constructor() {
    super();
    this.isConnected = false;
    this.subscriptions = new Map(); // token -> subscription details
    this.intervals = new Map(); // token -> interval ID
    this.tickCallbacks = new Map(); // token -> array of callbacks
  }

  /**
   * Connect to mock websocket (simulate connection)
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isConnected = true;
        logger.info('Mock WebSocket connected');
        this.emit('connect');
        resolve();
      }, 100); // Simulate connection delay
    });
  }

  /**
   * Disconnect from mock websocket
   */
  disconnect() {
    // Clear all intervals
    this.intervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.intervals.clear();
    this.subscriptions.clear();
    this.tickCallbacks.clear();
    this.isConnected = false;
    logger.info('Mock WebSocket disconnected');
    this.emit('disconnect');
  }

  /**
   * Subscribe to instruments
   * @param {Array<number>} tokens - Instrument tokens to subscribe
   * @param {string} mode - Subscription mode (full, quote, ltp)
   */
  subscribe(tokens, mode = 'full') {
    if (!this.isConnected) {
      logger.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    tokens.forEach((token) => {
      if (this.subscriptions.has(token)) {
        logger.debug(`Already subscribed to token ${token}`);
        return;
      }

      // Store subscription
      this.subscriptions.set(token, { token, mode });

      // Start generating ticks based on mode
      this.startTickGeneration(token, mode);

      logger.info(`Subscribed to token ${token} in ${mode} mode`);
    });

    this.emit('subscribe', tokens);
  }

  /**
   * Unsubscribe from instruments
   * @param {Array<number>} tokens - Instrument tokens to unsubscribe
   */
  unsubscribe(tokens) {
    tokens.forEach((token) => {
      // Clear interval
      const intervalId = this.intervals.get(token);
      if (intervalId) {
        clearInterval(intervalId);
        this.intervals.delete(token);
      }

      // Remove subscription
      this.subscriptions.delete(token);
      this.tickCallbacks.delete(token);

      logger.info(`Unsubscribed from token ${token}`);
    });

    this.emit('unsubscribe', tokens);
  }

  /**
   * Set mode for subscribed instruments
   * @param {string} mode - Mode (full, quote, ltp)
   * @param {Array<number>} tokens - Instrument tokens
   */
  setMode(mode, tokens) {
    tokens.forEach((token) => {
      const subscription = this.subscriptions.get(token);
      if (subscription) {
        subscription.mode = mode;

        // Restart tick generation with new mode
        const intervalId = this.intervals.get(token);
        if (intervalId) {
          clearInterval(intervalId);
        }
        this.startTickGeneration(token, mode);

        logger.info(`Changed mode to ${mode} for token ${token}`);
      }
    });
  }

  /**
   * Start generating ticks for a token
   * @param {number} token
   * @param {string} mode
   */
  startTickGeneration(token, mode) {
    const updateInterval = this.getUpdateInterval(mode);

    const intervalId = setInterval(() => {
      if (!this.isMarketOpen()) {
        logger.debug('Market is closed, skipping tick generation');
        return;
      }

      let tickData;

      switch (mode) {
        case 'full':
          tickData = dataGenerator.generateQuote(token);
          break;
        case 'quote':
          tickData = dataGenerator.generateTick(token);
          break;
        case 'ltp': {
          const state = dataGenerator.getStockState(token);
          if (state) {
            tickData = {
              instrumentToken: token,
              lastPrice: state.currentPrice,
              lastTradedPrice: state.currentPrice,
              mode: 'ltp',
              timestamp: new Date(),
            };
          }
          break;
        }
        default:
          tickData = dataGenerator.generateTick(token);
      }

      if (tickData) {
        // Emit to event listeners
        this.emit('ticks', [tickData]);

        // Call registered callbacks
        const callbacks = this.tickCallbacks.get(token);
        if (callbacks) {
          callbacks.forEach((callback) => callback(tickData));
        }
      }
    }, updateInterval);

    this.intervals.set(token, intervalId);
  }

  /**
   * Get update interval based on mode
   * @param {string} mode
   * @returns {number} Interval in milliseconds
   */
  getUpdateInterval(mode) {
    switch (mode) {
      case 'full':
        return mockConfig.updateIntervals.quote;
      case 'quote':
        return mockConfig.updateIntervals.tick;
      case 'ltp':
        return mockConfig.updateIntervals.tick;
      default:
        return mockConfig.updateIntervals.tick;
    }
  }

  /**
   * Check if market is currently open
   * @returns {boolean}
   */
  isMarketOpen() {
    const now = new Date();
    const day = now.getDay();

    // Check if today is a closed day
    if (mockConfig.marketTiming.closedDays.includes(day)) {
      return false;
    }

    // Check time
    const [openHour, openMinute] = mockConfig.marketTiming.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = mockConfig.marketTiming.closeTime.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  /**
   * Register callback for specific token
   * @param {number} token
   * @param {Function} callback
   */
  onTick(token, callback) {
    if (!this.tickCallbacks.has(token)) {
      this.tickCallbacks.set(token, []);
    }
    this.tickCallbacks.get(token).push(callback);
  }

  /**
   * Get subscription status
   * @returns {Array} List of subscribed tokens
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isWebSocketConnected() {
    return this.isConnected;
  }

  /**
   * Simulate order update (for testing order execution)
   * @param {object} order
   */
  emitOrderUpdate(order) {
    this.emit('order_update', order);
    logger.info('Order update emitted:', order);
  }

  /**
   * Get current market status
   * @returns {object}
   */
  getMarketStatus() {
    return {
      isOpen: this.isMarketOpen(),
      openTime: mockConfig.marketTiming.openTime,
      closeTime: mockConfig.marketTiming.closeTime,
      totalStocks: mockConfig.stocks.length,
      totalIndices: mockConfig.indices.length,
      activeSubscriptions: this.subscriptions.size,
    };
  }

  /**
   * Manual trigger tick generation (for testing)
   * @param {number} token
   */
  triggerTick(token) {
    const subscription = this.subscriptions.get(token);
    if (!subscription) {
      logger.warn(`Token ${token} not subscribed`);
      return null;
    }

    const tickData = dataGenerator.generateQuote(token);
    if (tickData) {
      this.emit('ticks', [tickData]);
    }
    return tickData;
  }
}

module.exports = new MockWebSocketService();
