const kiteService = require('./kite.service');
const logger = require('../../../config/logger');

class KiteWebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.subscriptions = new Map(); // Map of token -> callback
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  /**
   * Connect to Kite WebSocket (Ticker)
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      await kiteService.ensureLoggedIn();
      const accessToken = kiteService.getSessionData().accessToken;

      if (!accessToken) {
        throw new Error('Access token not available');
      }

      const { KiteTicker } = require('kiteconnect');
      const config = require('../../../config/config');

      this.ticker = new KiteTicker({
        api_key: config.kite.apiKey,
        access_token: accessToken,
      });

      this.ticker.connect();

      this.ticker.on('connect', () => {
        logger.info('Kite WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Resubscribe to previous subscriptions if any
        if (this.subscriptions.size > 0) {
          const tokens = Array.from(this.subscriptions.keys());
          this.ticker.subscribe(tokens);
          this.ticker.setMode(this.ticker.modeFull, tokens);
        }
      });

      this.ticker.on('disconnect', (error) => {
        logger.warn('Kite WebSocket disconnected:', error);
        this.isConnected = false;
        this.handleReconnect();
      });

      this.ticker.on('error', (error) => {
        logger.error('Kite WebSocket error:', error);
        this.isConnected = false;
      });

      this.ticker.on('close', () => {
        logger.info('Kite WebSocket closed');
        this.isConnected = false;
      });

      this.ticker.on('ticks', (ticks) => {
        this.handleTicks(ticks);
      });

      this.ticker.on('order_update', (order) => {
        logger.info('Order update received:', order);
        this.handleOrderUpdate(order);
      });
    } catch (error) {
      logger.error('Error connecting to Kite WebSocket:', error);
      throw error;
    }
  }

  /**
   * Handle reconnection
   */
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached for Kite WebSocket');
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Attempting to reconnect to Kite WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        logger.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay);
  }

  /**
   * Handle incoming ticks
   * @param {Array} ticks - Market ticks
   */
  handleTicks(ticks) {
    try {
      for (const tick of ticks) {
        const token = tick.instrument_token.toString();
        const callback = this.subscriptions.get(token);

        if (callback && typeof callback === 'function') {
          callback(tick);
        }
      }
    } catch (error) {
      logger.error('Error handling ticks:', error);
    }
  }

  /**
   * Handle order updates
   * @param {Object} order - Order update
   */
  handleOrderUpdate(order) {
    try {
      // Emit order update event or call registered callbacks
      logger.info('Order update:', order);
    } catch (error) {
      logger.error('Error handling order update:', error);
    }
  }

  /**
   * Subscribe to instrument tokens
   * @param {Array<string>} tokens - Instrument tokens
   * @param {Function} callback - Callback function for tick updates
   * @returns {boolean} Success status
   */
  subscribe(tokens, callback) {
    try {
      if (!this.isConnected) {
        throw new Error('WebSocket not connected');
      }

      // Store callbacks for each token
      tokens.forEach((token) => {
        this.subscriptions.set(token.toString(), callback);
      });

      this.ticker.subscribe(tokens);
      this.ticker.setMode(this.ticker.modeFull, tokens);

      logger.info(`Subscribed to ${tokens.length} instruments on Kite`);
      return true;
    } catch (error) {
      logger.error('Error subscribing to instruments:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from instrument tokens
   * @param {Array<string>} tokens - Instrument tokens
   * @returns {boolean} Success status
   */
  unsubscribe(tokens) {
    try {
      if (!this.isConnected) {
        throw new Error('WebSocket not connected');
      }

      tokens.forEach((token) => {
        this.subscriptions.delete(token.toString());
      });

      this.ticker.unsubscribe(tokens);

      logger.info(`Unsubscribed from ${tokens.length} instruments on Kite`);
      return true;
    } catch (error) {
      logger.error('Error unsubscribing from instruments:', error);
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.ticker) {
        this.ticker.disconnect();
        this.isConnected = false;
        this.subscriptions.clear();
        logger.info('Disconnected from Kite WebSocket');
      }
    } catch (error) {
      logger.error('Error disconnecting from Kite WebSocket:', error);
      throw error;
    }
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get current subscriptions
   * @returns {Array<string>} List of subscribed tokens
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }
}

// Create singleton instance
const kiteWebSocketService = new KiteWebSocketService();

module.exports = kiteWebSocketService;
