const WebSocket = require('ws');
const angelOneService = require('./angelone.service');
const logger = require('../../../config/logger');

class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectTimeout = null;
    this.reconnectInterval = 5000; // 5 seconds
    this.subscribers = new Map(); // Store subscribers for different tokens
    this.heartbeatInterval = null;
  }

  /**
   * Connect to AngelOne WebSocket
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      await angelOneService.ensureLoggedIn();
      const sessionData = angelOneService.getSessionData();

      if (!sessionData || !sessionData.jwtToken) {
        throw new Error('No valid session found for WebSocket connection');
      }

      const wsUrl = 'wss://smartapisocket.angelone.in/smart-stream';
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        logger.info('WebSocket connected to AngelOne');
        this.isConnected = true;
        this.authenticate(sessionData);
        this.startHeartbeat();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });

      this.ws.on('close', () => {
        logger.info('WebSocket disconnected');
        this.isConnected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      });
    } catch (error) {
      logger.error('Error connecting to WebSocket:', error);
      throw error;
    }
  }

  /**
   * Authenticate WebSocket connection
   * @param {Object} sessionData - Session data from login
   */
  authenticate(sessionData) {
    try {
      const authMessage = {
        action: 1, // 1 for connect
        params: {
          jwtToken: sessionData.jwtToken,
          apiKey: sessionData.apiKey || sessionData.api_key,
          clientCode: sessionData.clientCode || sessionData.client_code,
          feedToken: sessionData.feedToken || sessionData.feed_token,
        },
      };

      this.send(authMessage);
      logger.info('WebSocket authentication message sent');
    } catch (error) {
      logger.error('Error authenticating WebSocket:', error);
    }
  }

  /**
   * Subscribe to market data for specific tokens
   * @param {string} mode - Subscription mode (1=LTP, 2=Quote, 3=Snap Quote)
   * @param {Array<Object>} tokens - Array of {exchangeType, tokens: [token1, token2]}
   */
  subscribe(mode, tokens) {
    try {
      if (!this.isConnected) {
        throw new Error('WebSocket is not connected');
      }

      const subscribeMessage = {
        action: 1, // 1 for subscribe
        params: {
          mode: mode, // 1=LTP, 2=Quote, 3=Snap Quote
          tokenList: tokens,
        },
      };

      this.send(subscribeMessage);
      logger.info(`Subscribed to tokens in mode ${mode}:`, tokens);

      // Store subscription
      tokens.forEach((tokenGroup) => {
        tokenGroup.tokens.forEach((token) => {
          this.subscribers.set(`${tokenGroup.exchangeType}_${token}`, { mode, exchangeType: tokenGroup.exchangeType });
        });
      });
    } catch (error) {
      logger.error('Error subscribing to tokens:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from market data
   * @param {string} mode - Subscription mode
   * @param {Array<Object>} tokens - Array of {exchangeType, tokens: [token1, token2]}
   */
  unsubscribe(mode, tokens) {
    try {
      if (!this.isConnected) {
        throw new Error('WebSocket is not connected');
      }

      const unsubscribeMessage = {
        action: 0, // 0 for unsubscribe
        params: {
          mode: mode,
          tokenList: tokens,
        },
      };

      this.send(unsubscribeMessage);
      logger.info(`Unsubscribed from tokens in mode ${mode}:`, tokens);

      // Remove from subscribers
      tokens.forEach((tokenGroup) => {
        tokenGroup.tokens.forEach((token) => {
          this.subscribers.delete(`${tokenGroup.exchangeType}_${token}`);
        });
      });
    } catch (error) {
      logger.error('Error unsubscribing from tokens:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Buffer|string} data - Message data
   */
  handleMessage(data) {
    try {
      // Parse binary or JSON data
      let message;
      if (Buffer.isBuffer(data)) {
        // Handle binary data format
        message = this.parseBinaryData(data);
      } else {
        message = JSON.parse(data.toString());
      }

      // Emit message to subscribers
      this.emitToSubscribers(message);
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Parse binary data from WebSocket
   * @param {Buffer} data - Binary data
   * @returns {Object} Parsed data
   */
  parseBinaryData(data) {
    try {
      // AngelOne uses binary format for market data
      // This is a simplified parser - adjust based on actual binary format
      const view = new DataView(data.buffer);
      let offset = 0;

      const mode = view.getUint8(offset);
      offset += 1;

      const exchangeType = view.getUint8(offset);
      offset += 1;

      const token = view.getUint32(offset, true);
      offset += 4;

      const ltp = view.getFloat64(offset, true);
      offset += 8;

      return {
        mode,
        exchangeType,
        token,
        ltp,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error parsing binary data:', error);
      return null;
    }
  }

  /**
   * Emit message to subscribers
   * @param {Object} message - Parsed message
   */
  emitToSubscribers(message) {
    // This should be implemented based on your event handling system
    // For now, just log the message
    logger.debug('Received market data:', message);
  }

  /**
   * Send message through WebSocket
   * @param {Object} message - Message to send
   */
  send(message) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ action: 'ping' });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      logger.info('Attempting to reconnect WebSocket...');
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.subscribers.clear();
    logger.info('WebSocket disconnected');
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

module.exports = webSocketService;
