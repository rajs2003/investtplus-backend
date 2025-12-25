const catchAsync = require('../../../utils/catchAsync');
const { webSocketService } = require('../../../services');

/**
 * Connect to WebSocket
 * @route POST /api/v1/websocket/connect
 */
const connect = catchAsync(async (req, res) => {
  await webSocketService.connect();

  res.status(200).json({
    success: true,
    message: 'WebSocket connected successfully',
  });
});

/**
 * Disconnect WebSocket
 * @route POST /api/v1/websocket/disconnect
 */
const disconnect = catchAsync(async (req, res) => {
  webSocketService.disconnect();

  res.status(200).json({
    success: true,
    message: 'WebSocket disconnected successfully',
  });
});

/**
 * Subscribe to tokens
 * @route POST /api/v1/websocket/subscribe
 * @body {number} mode - Mode (1=LTP, 2=Quote, 3=Snap Quote)
 * @body {Array<Object>} tokens - [{exchangeType: 1, tokens: ['99926000', '99926009']}]
 */
const subscribe = catchAsync(async (req, res) => {
  const { mode, tokens } = req.body;

  if (!mode || !tokens || !Array.isArray(tokens)) {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid parameters: mode, tokens',
    });
  }

  webSocketService.subscribe(mode, tokens);

  res.status(200).json({
    success: true,
    message: 'Subscribed to tokens successfully',
  });
});

/**
 * Unsubscribe from tokens
 * @route POST /api/v1/websocket/unsubscribe
 * @body {number} mode - Mode
 * @body {Array<Object>} tokens - Token list
 */
const unsubscribe = catchAsync(async (req, res) => {
  const { mode, tokens } = req.body;

  if (!mode || !tokens || !Array.isArray(tokens)) {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid parameters: mode, tokens',
    });
  }

  webSocketService.unsubscribe(mode, tokens);

  res.status(200).json({
    success: true,
    message: 'Unsubscribed from tokens successfully',
  });
});

/**
 * Get WebSocket status
 * @route GET /api/v1/websocket/status
 */
const getStatus = catchAsync(async (req, res) => {
  const isConnected = webSocketService.getConnectionStatus();

  res.status(200).json({
    success: true,
    data: {
      connected: isConnected,
      status: isConnected ? 'CONNECTED' : 'DISCONNECTED',
    },
  });
});

module.exports = {
  connect,
  disconnect,
  subscribe,
  unsubscribe,
  getStatus,
};
