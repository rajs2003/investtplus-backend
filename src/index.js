const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const connectDB = require('./db/mongoose');

const http = require('http');
const { Server } = require('socket.io');
const { marketWebSocketService } = require('./services/v1/mockMarket');
const { limitOrderManager } = require('./services/v1/marketServices/orderServices');
const { initializeScheduledJobs, stopScheduledJobs } = require('./jobs/marketSettlement.job');

let server;
let io;
let scheduledJobs;

connectDB().then(() => {
  // Create HTTP server
  server = http.createServer(app);

  // Attach socket.io
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3002',
        'file://',
      ],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Initialize Market WebSocket Service
  marketWebSocketService.initializeWebSocket(io);
  logger.info('Market WebSocket service initialized');

  // Initialize scheduled jobs for market settlement
  scheduledJobs = initializeScheduledJobs();
  logger.info('Market settlement jobs initialized');

  // Sync pending orders to Redis on startup
  setTimeout(async () => {
    try {
      const syncResult = await limitOrderManager.syncPendingOrdersToRedis();
      if (syncResult.success) {
        logger.info(`Synced ${syncResult.count} pending orders to Redis`);
      } else {
        logger.warn('Failed to sync pending orders to Redis');
      }
    } catch (error) {
      logger.error('Error syncing pending orders:', error);
    }
  }, 2000); // Wait 2 seconds for Redis to connect

  // socket.io connections (for other purposes)
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  server.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
  });
});

// Graceful shutdown handlers
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');

      // Stop all scheduled jobs
      if (scheduledJobs) {
        stopScheduledJobs(scheduledJobs);
      }

      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }

  // Stop all scheduled jobs
  if (scheduledJobs) {
    stopScheduledJobs(scheduledJobs);
  }
});
