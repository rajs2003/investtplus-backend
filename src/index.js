const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const connectDB = require('./db/mongoose');

const http = require('http');
const { Server } = require('socket.io');
const { marketWebSocketService } = require('./services/v1/mockMarket');

let server;
let io;

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
