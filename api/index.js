const app = require('../src/app');
const connectDB = require('../src/db/mongoose');
const logger = require('../src/config/logger');

let isConnected = false;

// Serverless function handler for Vercel
module.exports = async (req, res) => {
  try {
    // Connect to DB only once (reuse connection across invocations)
    if (!isConnected) {
      await connectDB();
      isConnected = true;
      logger.info('Database connected for serverless function');
    }

    // Note: WebSocket features are disabled on Vercel
    // For real-time features, use external services like:
    // - Pusher (pusher.com)
    // - Ably (ably.com)
    // - Socket.io with Redis adapter + separate WebSocket server

    // Handle the request with Express app
    return app(req, res);
  } catch (error) {
    logger.error('Serverless function error:', error);

    // Return proper error response
    if (!res.headersSent) {
      return res.status(500).json({
        code: 'FUNCTION_INVOCATION_FAILED',
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      });
    }
  }
};
