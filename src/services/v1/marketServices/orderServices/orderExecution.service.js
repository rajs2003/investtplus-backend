const httpStatus = require('http-status');
const { Order } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const fundManager = require('../walletServices/fundManager.service');
const holdingService = require('../holdingServices/holding.service');
const orderHelpers = require('./orderHelpers');
const marketConfig = require('../../../../config/market.config');
const { marketDataService } = require('../../mockMarket');

/**
 * Get current market price for a symbol from market data service
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange (NSE/BSE)
 * @returns {Promise<number>} Current market price
 */
const getCurrentMarketPrice = async (symbol, exchange = 'NSE') => {
  try {
    const priceData = marketDataService.getCurrentPrice(symbol.toUpperCase(), exchange);
    return priceData.data.ltp;
  } catch (error) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Unable to fetch current price for ${symbol} on ${exchange}: ${error.message}`,
    );
  }
};

/**
 * Execute a market order
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order>}
 */
const executeMarketOrder = async (orderId) => {
  // Step 1: Get order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Step 2: Validate order status
  if (order.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Order is already ${order.status}`);
  }

  // Step 3: Check if market is open
  const marketStatus = marketDataService.getMarketStatus();
  if (marketStatus.status === 'CLOSED') {
    order.markAsRejected(`Market is closed. ${marketStatus.reason}`);
    await order.save();

    // Release funds if buy order
    if (order.transactionType === 'buy') {
      await fundManager.releaseFunds(order.userId, order.netAmount, orderId, 'Market closed');
    }

    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot execute order. Market is closed. ${marketStatus.reason}`);
  }

  // Step 4: Get current market price
  const marketPrice = await getCurrentMarketPrice(order.symbol, order.exchange);

  // Step 5: Apply slippage for market orders
  const slippage = marketConfig.orderSettings.marketOrderSlippage;
  const executionPrice = order.transactionType === 'buy' ? marketPrice * (1 + slippage) : marketPrice * (1 - slippage);

  // Step 6: Calculate actual charges at execution price
  const actualCharges = orderHelpers.calculateOrderCharges(
    {
      orderType: order.orderType,
      transactionType: order.transactionType,
      quantity: order.quantity,
      price: executionPrice,
    },
    order.exchange,
  );

  try {
    // Step 7: Execute based on transaction type
    if (order.transactionType === 'buy') {
      // For BUY orders: Settle payment using reserved funds
      await fundManager.settleOrderPayment(
        order.userId,
        order.netAmount, // Reserved amount
        actualCharges.netAmount, // Actual amount to pay
        orderId,
        {
          reason: 'stock_buy',
          description: `BUY ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toFixed(2)}`,
        },
      );

      // Log price impact if significant
      const priceImpact = orderHelpers.calculatePriceImpact(order.price, executionPrice);
      if (Math.abs(priceImpact) > 1) {
        console.log(`Price impact for order ${orderId}: ${priceImpact}%`);
      }
    } else {
      // For SELL orders: Credit sale proceeds
      const proceeds = actualCharges.netAmount;
      const isProfit = proceeds > 0;

      await fundManager.creditSaleProceeds(order.userId, proceeds, orderId, {
        isProfit,
        description: `SELL ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toFixed(2)}`,
      });
    }

    // Step 8: Update order with execution details
    order.markAsExecuted(executionPrice, order.quantity);
    order.orderValue = actualCharges.orderValue;
    order.totalCharges = actualCharges.totalCharges;
    order.netAmount = actualCharges.netAmount;
    await order.save();

    // Step 9: Update holdings
    try {
      if (order.transactionType === 'buy') {
        await holdingService.createOrUpdateHolding(order);
      } else {
        await holdingService.processSellOrder(order);
      }
    } catch (holdingError) {
      console.error('Failed to update holding:', holdingError.message);
      // Don't fail the order execution for holding errors
    }

    return order;
  } catch (error) {
    console.error('Order execution failed:', error);

    // Mark order as rejected
    order.markAsRejected(error.message);
    await order.save();

    // For buy orders, try to release the locked funds
    if (order.transactionType === 'buy') {
      try {
        await fundManager.releaseFunds(order.userId, order.netAmount, orderId, 'Order execution failed');
      } catch (releaseError) {
        console.error('Failed to release funds after execution failure:', releaseError);
      }
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Order execution failed: ${error.message}`);
  }
};

/**
 * Execute a limit order
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order|null>} Order if executed, null if conditions not met
 */
const executeLimitOrder = async (orderId) => {
  // Step 1: Get order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Step 2: Validate order status
  if (order.status !== 'pending') {
    return null; // Order is not pending
  }

  // Step 3: Check if market is open
  if (!marketDataService.isMarketOpen()) {
    return null; // Don't execute when market is closed
  }

  // Step 4: Get current market price
  const marketPrice = await getCurrentMarketPrice(order.symbol, order.exchange);

  // Step 5: Check execution conditions using helper
  const executionCheck = orderHelpers.checkExecutionCondition(order, marketPrice);

  if (!executionCheck.canExecute) {
    return null; // Conditions not met
  }

  const executionPrice = executionCheck.executionPrice;

  // Step 6: Calculate actual charges at execution price
  const actualCharges = orderHelpers.calculateOrderCharges(
    {
      orderType: order.orderType,
      transactionType: order.transactionType,
      quantity: order.quantity,
      price: executionPrice,
    },
    order.exchange,
  );

  try {
    // Step 7: Execute payment based on transaction type
    if (order.transactionType === 'buy') {
      await fundManager.settleOrderPayment(order.userId, order.netAmount, actualCharges.netAmount, orderId, {
        reason: 'stock_buy',
        description: `BUY ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toFixed(2)} (Limit Order)`,
      });
    } else {
      const proceeds = actualCharges.netAmount;

      await fundManager.creditSaleProceeds(order.userId, proceeds, orderId, {
        isProfit: true,
        description: `SELL ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toFixed(2)} (Limit Order)`,
      });
    }

    // Step 8: Update order with execution details
    order.markAsExecuted(executionPrice, order.quantity);
    order.orderValue = actualCharges.orderValue;
    order.totalCharges = actualCharges.totalCharges;
    order.netAmount = actualCharges.netAmount;
    await order.save();

    // Step 8: Update holdings
    try {
      if (order.transactionType === 'buy') {
        await holdingService.createOrUpdateHolding(order);
      } else {
        await holdingService.processSellOrder(order);
      }
    } catch (holdingError) {
      console.error('Failed to update holding:', holdingError.message);
    }

    return order;
  } catch (error) {
    console.error('Limit order execution failed:', error);

    // Mark order as rejected
    order.markAsRejected(error.message);
    await order.save();

    // Release funds for buy orders
    if (order.transactionType === 'buy') {
      try {
        await fundManager.releaseFunds(order.userId, order.netAmount, orderId, 'Limit order execution failed');
      } catch (releaseError) {
        console.error('Failed to release funds:', releaseError);
      }
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Limit order execution failed: ${error.message}`);
  }
};

/**
 * Execute a stop loss order
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order|null>} Order if executed, null if conditions not met
 */
const executeStopLossOrder = async (orderId) => {
  // Step 1: Get order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Step 2: Validate order status
  if (order.status !== 'pending') {
    return null;
  }

  // Step 3: Get current market price
  const marketPrice = await getCurrentMarketPrice(order.symbol, order.exchange);

  // Step 4: Check execution conditions using helper
  const executionCheck = orderHelpers.checkExecutionCondition(order, marketPrice);

  if (!executionCheck.canExecute) {
    return null; // Trigger not hit
  }

  const executionPrice = executionCheck.executionPrice;

  // Step 5: Calculate actual charges at execution price
  const actualCharges = orderHelpers.calculateOrderCharges({
    orderType: order.orderType,
    transactionType: order.transactionType,
    quantity: order.quantity,
    price: executionPrice,
  });

  try {
    // Step 6: Execute payment based on transaction type
    if (order.transactionType === 'buy') {
      // Settle payment - fundManager handles transaction creation
      await fundManager.settleOrderPayment(order.userId, order.netAmount, actualCharges.netAmount, orderId, {
        reason: 'stock_buy',
        description: `BUY ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toLocaleString('en-IN')} (Stop Loss Triggered)`,
      });
    } else {
      // Credit sale proceeds - fundManager handles transaction creation
      const proceeds = actualCharges.netAmount;

      await fundManager.creditSaleProceeds(order.userId, proceeds, orderId, {
        isProfit: false, // Stop loss typically indicates a loss scenario
        description: `SELL ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toLocaleString('en-IN')} (Stop Loss Triggered)`,
      });
    }

    // Step 7: Update order with execution details
    order.markAsExecuted(executionPrice, order.quantity);
    order.orderValue = actualCharges.orderValue;
    order.totalCharges = actualCharges.totalCharges;
    order.netAmount = actualCharges.netAmount;
    await order.save();

    // Step 8: Update holdings
    try {
      if (order.transactionType === 'buy') {
        await holdingService.createOrUpdateHolding(order);
      } else {
        await holdingService.processSellOrder(order);
      }
    } catch (holdingError) {
      console.error('Failed to update holding:', holdingError.message);
    }

    return order;
  } catch (error) {
    console.error('Stop loss order execution failed:', error);

    order.markAsRejected(error.message);
    await order.save();

    // Release funds for buy orders
    if (order.transactionType === 'buy') {
      try {
        await fundManager.releaseFunds(order.userId, order.netAmount, orderId, 'Stop loss execution failed');
      } catch (releaseError) {
        console.error('Failed to release funds:', releaseError);
      }
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Stop loss execution failed: ${error.message}`);
  }
};

/**
 * Process all pending limit orders (for background job)
 * @returns {Promise<Array>} Executed orders
 */
const processLimitOrders = async () => {
  const pendingLimitOrders = await Order.find({
    status: 'pending',
    orderVariant: 'limit',
  });

  const executedOrders = [];

  for (const order of pendingLimitOrders) {
    try {
      const executed = await executeLimitOrder(order.id);
      if (executed) {
        executedOrders.push(executed);
      }
    } catch (error) {
      console.error(`Failed to execute limit order ${order.id}:`, error);
    }
  }

  return executedOrders;
};

/**
 * Process all pending stop loss orders (for background job)
 * @returns {Promise<Array>} Executed orders
 */
const processStopLossOrders = async () => {
  const pendingSLOrders = await Order.find({
    status: 'pending',
    orderVariant: { $in: ['sl', 'slm'] },
  });

  const executedOrders = [];

  for (const order of pendingSLOrders) {
    try {
      const executed = await executeStopLossOrder(order.id);
      if (executed) {
        executedOrders.push(executed);
      }
    } catch (error) {
      console.error(`Failed to execute stop loss order ${order.id}:`, error);
    }
  }

  return executedOrders;
};

module.exports = {
  getCurrentMarketPrice,
  executeMarketOrder,
  executeLimitOrder,
  executeStopLossOrder,
  processLimitOrders,
  processStopLossOrders,
};
