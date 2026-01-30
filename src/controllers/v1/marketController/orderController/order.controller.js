const httpStatus = require('http-status');
const catchAsync = require('../../../../utils/catchAsync');
const pick = require('../../../../utils/pick');
const { orderService, orderExecutionService, marketDataService } = require('../../../../services');
const ApiError = require('../../../../utils/ApiError');

/**
 * Place a new order
 * POST /v1/orders/place
 */
const placeOrder = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const orderData = req.body;

  // Check market status before placing order
  const marketStatus = marketDataService.getMarketStatus();

  // Return market status info with response
  const marketInfo = {
    status: marketStatus.status,
    reason: marketStatus.reason,
    isOpen: marketStatus.status === 'OPEN',
  };

  const order = await orderService.placeOrder(userId, orderData);

  // For market orders, execute immediately
  if (orderData.orderVariant === 'market') {
    try {
      const executedOrder = await orderExecutionService.executeMarketOrder(order.id);

      res.status(httpStatus.CREATED).json({
        success: true,
        message: 'Order placed and executed successfully',
        market: marketInfo,
        order: {
          id: executedOrder.id,
          symbol: executedOrder.symbol,
          orderType: executedOrder.orderType,
          orderVariant: executedOrder.orderVariant,
          transactionType: executedOrder.transactionType,
          quantity: executedOrder.quantity,
          executedPrice: executedOrder.executedPrice,
          status: executedOrder.status,
          orderValue: `₹${executedOrder.orderValue.toLocaleString('en-IN')}`,
          totalCharges: `₹${executedOrder.totalCharges.toLocaleString('en-IN')}`,
          netAmount: `₹${executedOrder.netAmount.toLocaleString('en-IN')}`,
          executedAt: executedOrder.executedAt,
          createdAt: executedOrder.createdAt,
        },
      });
    } catch (executionError) {
      // Order placed but execution failed
      res.status(httpStatus.ACCEPTED).json({
        success: false,
        message: 'Order placed but execution failed',
        market: marketInfo,
        order: {
          id: order.id,
          status: 'rejected',
          reason: executionError.message,
        },
      });
    }
  } else {
    // For limit/SL orders, just return pending status
    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Order placed successfully',
      market: marketInfo,
      order: {
        id: order.id,
        symbol: order.symbol,
        orderType: order.orderType,
        orderVariant: order.orderVariant,
        transactionType: order.transactionType,
        quantity: order.quantity,
        price: order.price,
        triggerPrice: order.triggerPrice,
        status: order.status,
        orderValue: `₹${order.orderValue.toLocaleString('en-IN')}`,
        totalCharges: `₹${order.totalCharges.toLocaleString('en-IN')}`,
        netAmount: `₹${order.netAmount.toLocaleString('en-IN')}`,
        createdAt: order.createdAt,
      },
    });
  }
});

/**
 * Cancel an order
 * POST /v1/orders/:orderId/cancel
 */
const cancelOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;
  const { reason } = req.body;

  const order = await orderService.cancelOrder(orderId, userId, reason);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Order cancelled successfully',
    order: {
      id: order.id,
      symbol: order.symbol,
      status: order.status,
      cancellationReason: order.cancellationReason,
      cancelledAt: order.cancelledAt,
      refundedAmount: `₹${order.netAmount.toLocaleString('en-IN')}`,
    },
  });
});

/**
 * Get all orders
 * GET /v1/orders
 */
const getOrders = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const filter = pick(req.query, ['status', 'orderType', 'transactionType', 'symbol', 'startDate', 'endDate']);
  const options = pick(req.query, ['page', 'limit']);

  const result = await orderService.getOrders(userId, filter, options);

  // Format orders with Indian currency
  const formattedOrders = result.orders.map((order) => ({
    id: order.id,
    symbol: order.symbol,
    exchange: order.exchange,
    orderType: order.orderType,
    orderVariant: order.orderVariant,
    transactionType: order.transactionType,
    quantity: order.quantity,
    price: order.price,
    executedPrice: order.executedPrice,
    status: order.status,
    orderValue: `₹${order.orderValue.toLocaleString('en-IN')}`,
    totalCharges: `₹${order.totalCharges.toLocaleString('en-IN')}`,
    netAmount: `₹${order.netAmount.toLocaleString('en-IN')}`,
    executedAt: order.executedAt,
    createdAt: order.createdAt,
  }));

  res.status(httpStatus.OK).json({
    success: true,
    orders: formattedOrders,
    pagination: result.pagination,
  });
});

/**
 * Get order by ID
 * GET /v1/orders/:orderId
 */
const getOrderById = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  const order = await orderService.getOrderById(orderId, userId);

  res.status(httpStatus.OK).json({
    success: true,
    order: {
      id: order.id,
      symbol: order.symbol,
      exchange: order.exchange,
      tradingSymbol: order.tradingSymbol,
      orderType: order.orderType,
      orderVariant: order.orderVariant,
      transactionType: order.transactionType,
      quantity: order.quantity,
      price: order.price,
      triggerPrice: order.triggerPrice,
      executedPrice: order.executedPrice,
      executedQuantity: order.executedQuantity,
      status: order.status,
      orderValue: `₹${order.orderValue.toLocaleString('en-IN')}`,
      charges: {
        brokerage: `₹${order.brokerage.toLocaleString('en-IN')}`,
        stt: `₹${order.stt.toLocaleString('en-IN')}`,
        transactionCharges: `₹${order.transactionCharges.toLocaleString('en-IN')}`,
        gst: `₹${order.gst.toLocaleString('en-IN')}`,
        sebiCharges: `₹${order.sebiCharges.toLocaleString('en-IN')}`,
        stampDuty: `₹${order.stampDuty.toLocaleString('en-IN')}`,
        total: `₹${order.totalCharges.toLocaleString('en-IN')}`,
      },
      netAmount: `₹${order.netAmount.toLocaleString('en-IN')}`,
      description: order.description,
      executedAt: order.executedAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      rejectionReason: order.rejectionReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
  });
});

/**
 * Get pending orders
 * GET /v1/orders/pending
 */
const getPendingOrders = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const orders = await orderService.getPendingOrders(userId);

  const formattedOrders = orders.map((order) => ({
    id: order.id,
    symbol: order.symbol,
    orderType: order.orderType,
    orderVariant: order.orderVariant,
    transactionType: order.transactionType,
    quantity: order.quantity,
    price: order.price,
    triggerPrice: order.triggerPrice,
    status: order.status,
    orderValue: `₹${order.orderValue.toLocaleString('en-IN')}`,
    netAmount: `₹${order.netAmount.toLocaleString('en-IN')}`,
    createdAt: order.createdAt,
  }));

  res.status(httpStatus.OK).json({
    success: true,
    count: formattedOrders.length,
    orders: formattedOrders,
  });
});

/**
 * Get order history
 * GET /v1/orders/history
 */
const getOrderHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const filter = pick(req.query, ['status', 'orderType', 'transactionType', 'symbol', 'startDate', 'endDate']);
  const options = pick(req.query, ['page', 'limit']);

  const result = await orderService.getOrderHistory(userId, filter, options);

  const formattedOrders = result.orders.map((order) => ({
    id: order.id,
    symbol: order.symbol,
    orderType: order.orderType,
    orderVariant: order.orderVariant,
    transactionType: order.transactionType,
    quantity: order.quantity,
    executedPrice: order.executedPrice,
    status: order.status,
    orderValue: `₹${order.orderValue.toLocaleString('en-IN')}`,
    totalCharges: `₹${order.totalCharges.toLocaleString('en-IN')}`,
    netAmount: `₹${order.netAmount.toLocaleString('en-IN')}`,
    executedAt: order.executedAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
  }));

  res.status(httpStatus.OK).json({
    success: true,
    orders: formattedOrders,
    pagination: result.pagination,
  });
});

/**
 * Execute order manually (for testing/admin)
 * POST /v1/orders/:orderId/execute
 */
const executeOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;

  const order = await orderExecutionService.executeMarketOrder(orderId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Order executed successfully',
    order: {
      id: order.id,
      symbol: order.symbol,
      status: order.status,
      executedPrice: order.executedPrice,
      executedAt: order.executedAt,
      netAmount: `₹${order.netAmount.toLocaleString('en-IN')}`,
    },
  });
});

/**
 * Buy stock with current market price
 * POST /v1/orders/buy
 */
const buyStock = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { symbol, quantity, orderType = 'MARKET', limitPrice, duration = 'DAY' } = req.body;

  if (!symbol || !quantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Symbol and quantity are required');
  }

  if (quantity <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quantity must be greater than 0');
  }

  // Get current market price from market data service
  const priceData = marketDataService.getCurrentPrice(symbol, 'NSE');

  if (!priceData.success) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock not found');
  }

  const currentPrice = priceData.data.ltp;
  const orderPrice = orderType === 'LIMIT' && limitPrice ? limitPrice : currentPrice;

  // Place order with market data
  const orderData = {
    symbol,
    quantity,
    orderType: orderType === 'LIMIT' ? 'LIMIT' : 'MARKET',
    orderVariant: orderType === 'LIMIT' ? 'regular' : 'market',
    transactionType: 'BUY',
    limitPrice: orderPrice,
    duration,
    exchange: 'NSE',
    product: 'MIS', // Margin Intraday Square-off
  };

  const order = await orderService.placeOrder(userId, orderData);

  // For market orders, execute immediately with current price
  if (orderType === 'MARKET') {
    try {
      const executedOrder = await orderExecutionService.executeMarketOrder(order.id, currentPrice);

      return res.status(httpStatus.CREATED).json({
        success: true,
        message: 'Buy order placed and executed successfully',
        data: {
          id: executedOrder.id,
          symbol: executedOrder.symbol,
          quantity: executedOrder.quantity,
          price: parseFloat(currentPrice.toFixed(2)),
          totalAmount: executedOrder.orderValue,
          charges: executedOrder.totalCharges,
          netAmount: executedOrder.netAmount,
          status: executedOrder.status,
          executedAt: executedOrder.executedAt,
        },
      });
    } catch (executionError) {
      return res.status(httpStatus.ACCEPTED).json({
        success: false,
        message: 'Order placed but execution failed',
        data: {
          id: order.id,
          status: 'rejected',
          reason: executionError.message,
        },
      });
    }
  }

  // For limit orders, return pending
  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Limit order placed successfully',
    data: {
      id: order.id,
      symbol: order.symbol,
      quantity: order.quantity,
      limitPrice: orderPrice,
      status: order.status,
      createdAt: order.createdAt,
    },
  });
});

module.exports = {
  placeOrder,
  cancelOrder,
  getOrders,
  getOrderById,
  getPendingOrders,
  getOrderHistory,
  executeOrder,
  buyStock,
};
