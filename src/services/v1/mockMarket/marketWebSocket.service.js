/**
 * Mock Market WebSocket Service
 * Real-time market data streaming using Socket.IO
 */

const marketDataService = require('./marketData.service');
const marketConfig = require('../../../config/market.config');
const logger = require('../../../config/logger');

// Store active subscriptions
const subscriptions = new Map();

/**
 * Initialize WebSocket server
 */
const initializeWebSocket = (io) => {
  const marketNamespace = io.of('/market');

  marketNamespace.on('connection', (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    logger.info(`✅ Client connected to market stream`);
    logger.info(`   Socket ID: ${socket.id}`);
    logger.info(`   Client IP: ${clientIp}`);
    logger.info(`   Timestamp: ${new Date().toISOString()}`);

    // Initialize client subscriptions
    subscriptions.set(socket.id, new Set());

    // Handle stock subscription
    socket.on('subscribe', (data) => {
      try {
        const { symbols } = data;

        if (!Array.isArray(symbols)) {
          socket.emit('error', { message: 'Symbols must be an array' });
          return;
        }

        const clientSubs = subscriptions.get(socket.id);

        // Check subscription limit
        if (clientSubs.size + symbols.length > marketConfig.webSocket.maxSubscriptions) {
          socket.emit('error', {
            message: `Maximum ${marketConfig.webSocket.maxSubscriptions} subscriptions allowed`,
          });
          return;
        }

        // Add symbols to subscriptions
        symbols.forEach((symbolData) => {
          const key = `${symbolData.exchange}:${symbolData.symbol}`;
          clientSubs.add(key);
        });

        subscriptions.set(socket.id, clientSubs);

        socket.emit('subscribed', {
          symbols: Array.from(clientSubs),
          count: clientSubs.size,
        });

        logger.info(`Client ${socket.id} subscribed to ${symbols.length} symbols`);
      } catch (error) {
        logger.error('Subscription error:', error);
        socket.emit('error', { message: 'Subscription failed' });
      }
    });

    // Handle unsubscribe
    socket.on('unsubscribe', (data) => {
      try {
        const { symbols } = data;
        const clientSubs = subscriptions.get(socket.id);

        if (!clientSubs) return;

        symbols.forEach((symbolData) => {
          const key = `${symbolData.exchange}:${symbolData.symbol}`;
          clientSubs.delete(key);
        });

        subscriptions.set(socket.id, clientSubs);

        socket.emit('unsubscribed', {
          symbols: Array.from(clientSubs),
          count: clientSubs.size,
        });

        logger.info(`Client ${socket.id} unsubscribed from ${symbols.length} symbols`);
      } catch (error) {
        logger.error('Unsubscribe error:', error);
        socket.emit('error', { message: 'Unsubscribe failed' });
      }
    });

    // Handle market depth request
    socket.on('getMarketDepth', (data) => {
      try {
        const { symbol, exchange } = data;
        const depth = marketDataService.getMarketDepth(symbol, exchange);

        socket.emit('marketDepth', {
          symbol,
          exchange,
          ...depth.data,
        });
      } catch (error) {
        logger.error('Market depth error:', error);
        socket.emit('error', { message: 'Failed to get market depth' });
      }
    });

    // Handle market status request
    socket.on('getMarketStatus', () => {
      try {
        const status = marketDataService.getMarketStatus();
        socket.emit('marketStatus', status);
      } catch (error) {
        logger.error('Market status error:', error);
        socket.emit('error', { message: 'Failed to get market status' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const remainingClients = subscriptions.size - 1;
      const clientSubs = subscriptions.get(socket.id);
      const subCount = clientSubs ? clientSubs.size : 0;

      subscriptions.delete(socket.id);

      logger.info(`❌ Client disconnected from market stream`);
      logger.info(`   Socket ID: ${socket.id}`);
      logger.info(`   Was subscribed to: ${subCount} symbols`);
      logger.info(`   Active clients remaining: ${remainingClients}`);
    });

    // Send initial market status
    const marketStatus = marketDataService.getMarketStatus();
    socket.emit('marketStatus', marketStatus);

    // Send popular stocks on connect
    const popularStocks = marketDataService.getPopularStocks();
    socket.emit('popularStocks', popularStocks.data);
  });

  // Start streaming interval
  startMarketDataStream(marketNamespace);

  logger.info('WebSocket market streaming initialized');
  return marketNamespace;
};

/**
 * Stream market data to subscribed clients
 */
const startMarketDataStream = (namespace) => {
  logger.info('📊 Starting market data streaming service');
  logger.info(`   Tick interval: ${marketConfig.webSocket.tickInterval}ms`);
  logger.info(`   Heartbeat interval: ${marketConfig.webSocket.heartbeatInterval}ms`);

  setInterval(() => {
    // Check if market is open
    const isOpen = marketDataService.isMarketOpen();

    if (!isOpen) {
      // Send market closed status every minute during off hours
      namespace.emit('marketStatus', marketDataService.getMarketStatus());
      return;
    }

    // Get all active subscriptions
    const allSubscriptions = new Set();
    subscriptions.forEach((clientSubs) => {
      clientSubs.forEach((sub) => allSubscriptions.add(sub));
    });

    // Emit price updates for subscribed symbols
    allSubscriptions.forEach((key) => {
      const [exchange, symbol] = key.split(':');

      try {
        const priceData = marketDataService.getCurrentPrice(symbol, exchange);

        // Emit to all clients subscribed to this symbol
        subscriptions.forEach((clientSubs, socketId) => {
          if (clientSubs.has(key)) {
            const socket = namespace.sockets.get(socketId);
            if (socket) {
              socket.emit('tick', {
                symbol,
                exchange,
                ...priceData.data,
              });
            }
          }
        });

        // Also emit market depth occasionally (every 5th tick)
        if (Math.random() < 0.2) {
          const depth = marketDataService.getMarketDepth(symbol, exchange);
          subscriptions.forEach((clientSubs, socketId) => {
            if (clientSubs.has(key)) {
              const socket = namespace.sockets.get(socketId);
              if (socket) {
                socket.emit('marketDepth', {
                  symbol,
                  exchange,
                  ...depth.data,
                });
              }
            }
          });
        }
      } catch (error) {
        logger.warn(`Failed to stream data for ${key}:`, error.message);
      }
    });

    // Emit popular stocks update
    if (Math.random() < 0.1) {
      // 10% chance every tick
      const popularStocks = marketDataService.getPopularStocks();
      namespace.emit('popularStocks', popularStocks.data);
    }

    // Emit indices update
    if (Math.random() < 0.15) {
      // 15% chance every tick
      const indices = marketDataService.getIndices();
      namespace.emit('indices', indices.data);
    }
  }, marketConfig.webSocket.tickInterval);

  // Send heartbeat
  setInterval(() => {
    namespace.emit('heartbeat', {
      timestamp: new Date(),
      marketStatus: marketDataService.getMarketStatus(),
    });
  }, marketConfig.webSocket.heartbeatInterval);
};

/**
 * Get active subscription count
 */
const getSubscriptionStats = () => {
  const stats = {
    totalConnections: subscriptions.size,
    totalSubscriptions: 0,
    subscriptionsByClient: {},
  };

  subscriptions.forEach((clientSubs, socketId) => {
    stats.totalSubscriptions += clientSubs.size;
    stats.subscriptionsByClient[socketId] = clientSubs.size;
  });

  return stats;
};

module.exports = {
  initializeWebSocket,
  getSubscriptionStats,
};
