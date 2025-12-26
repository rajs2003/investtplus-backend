const httpStatus = require('http-status');
const { Order } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const { walletService } = require('../walletServices/wallet.service');
const transactionService = require('../walletServices/transaction.service');
const holdingService = require('../holdingServices/holding.service');

/**
 * Get current market price for a symbol
 * TODO: Integrate with AngelOne API or Redis cache
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange (NSE/BSE)
 * @returns {Promise<number>} Current market price
 */
// eslint-disable-next-line no-unused-vars
const getCurrentMarketPrice = async (symbol, exchange = 'NSE') => {
  // TODO: Fetch from AngelOne API or Redis cache
  // For now, returning dummy price
  // In production: fetch from Redis cache using key `price:${exchange}:${symbol}`

  // Dummy prices for testing
  const dummyPrices = {
    RELIANCE: 2450.5,
    TCS: 3890.75,
    INFY: 1456.2,
    HDFCBANK: 1650.3,
    ICICIBANK: 960.45,
    SBIN: 598.6,
    BHARTIARTL: 1234.8,
    ITC: 450.25,
    WIPRO: 456.9,
    LT: 3250.7,
  };

  // Use exchange parameter in future for exchange-specific prices
  return dummyPrices[symbol] || 100; // Default to 100 if symbol not found
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

  // Step 2: Check if order can be executed
  if (order.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Order is already ${order.status}`);
  }

  // Step 3: Get current market price
  const marketPrice = await getCurrentMarketPrice(order.symbol, order.exchange);

  // Step 4: Calculate actual order value and charges at execution price
  const actualOrderValue = order.quantity * marketPrice;
  const priceDifference = Math.abs(actualOrderValue - order.orderValue);

  try {
    // Step 5: Execute based on transaction type
    if (order.transactionType === 'buy') {
      // For BUY orders
      // Funds are already locked, now deduct them permanently

      // If actual price is higher than estimated, check if user has enough balance
      if (actualOrderValue > order.orderValue) {
        const additionalAmount = priceDifference + order.totalCharges * (priceDifference / order.orderValue);

        const wallet = await walletService.getWalletByUserId(order.userId);
        const totalRequired = order.netAmount + additionalAmount;

        if (wallet.lockedAmount < totalRequired) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Insufficient locked funds. Required: ₹${totalRequired.toLocaleString('en-IN')}, Locked: ₹${wallet.lockedAmount.toLocaleString('en-IN')}`,
          );
        }
      }

      // Deduct from wallet using executeOrderPayment
      await walletService.executeOrderPayment(order.userId, order.netAmount, order.netAmount, orderId);

      // Create transaction record
      await transactionService.createTransaction({
        userId: order.userId,
        walletId: null, // Will be fetched in service
        type: 'debit',
        amount: order.netAmount,
        reason: 'stock_buy',
        orderId: order.id,
        description: `BUY ${order.quantity} shares of ${order.symbol} at ₹${marketPrice.toLocaleString('en-IN')}`,
      });
    } else {
      // For SELL orders
      // Calculate proceeds (order value - charges)
      const proceeds = actualOrderValue - order.totalCharges;
      const isProfit = proceeds > 0; // Simplified for now

      // Credit proceeds to wallet
      await walletService.creditSaleProceeds(order.userId, proceeds, orderId, isProfit);

      // Create transaction record
      await transactionService.createTransaction({
        userId: order.userId,
        walletId: null,
        type: 'credit',
        amount: proceeds,
        reason: 'stock_sell',
        orderId: order.id,
        description: `SELL ${order.quantity} shares of ${order.symbol} at ₹${marketPrice.toLocaleString('en-IN')}`,
      });
    }

    // Step 6: Update order status to executed
    order.markAsExecuted(marketPrice, order.quantity);
    await order.save();

    // Step 7: Create or update holding
    try {
      if (order.transactionType === 'buy') {
        // Create/update holding for buy orders
        await holdingService.createOrUpdateHolding(order);
      } else {
        // Process sell order and create trade record
        await holdingService.processSellOrder(order);
      }
    } catch (holdingError) {
      // Log error but don't fail the order execution
      console.error('Failed to update holding:', holdingError.message);
    }

    return order;
  } catch (error) {
    // Rollback on failure
    console.error('Order execution failed:', error);

    // Mark order as rejected
    order.markAsRejected(error.message);
    await order.save();

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Order execution failed: ${error.message}`);
  }
};

/**
 * Execute a limit order
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order>}
 */
const executeLimitOrder = async (orderId) => {
  // Step 1: Get order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Step 2: Check if order can be executed
  if (order.status !== 'pending') {
    return null; // Order is not pending
  }

  // Step 3: Get current market price
  const marketPrice = await getCurrentMarketPrice(order.symbol, order.exchange);

  // Step 4: Check if limit price condition is met
  let shouldExecute = false;

  if (order.transactionType === 'buy') {
    // For BUY limit orders: Execute when market price <= limit price
    shouldExecute = marketPrice <= order.price;
  } else {
    // For SELL limit orders: Execute when market price >= limit price
    shouldExecute = marketPrice >= order.price;
  }

  if (!shouldExecute) {
    return null; // Condition not met, don't execute
  }

  // Step 5: Execute at limit price (not market price)
  const executionPrice = order.price;

  try {
    // Execute based on transaction type (similar to market order)
    if (order.transactionType === 'buy') {
      // Deduct from wallet
      await walletService.executeOrderPayment(order.userId, order.netAmount, order.netAmount, orderId);

      // Create transaction record
      await transactionService.createTransaction({
        userId: order.userId,
        walletId: null,
        type: 'debit',
        amount: order.netAmount,
        reason: 'stock_buy',
        orderId: order.id,
        description: `BUY ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toLocaleString('en-IN')} (Limit Order)`,
      });
    } else {
      // Credit proceeds to wallet
      const proceeds = order.orderValue - order.totalCharges;
      await walletService.creditSaleProceeds(order.userId, proceeds, orderId, true);

      await transactionService.createTransaction({
        userId: order.userId,
        walletId: null,
        type: 'credit',
        amount: proceeds,
        reason: 'stock_sell',
        orderId: order.id,
        description: `SELL ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toLocaleString('en-IN')} (Limit Order)`,
      });
    }

    // Update order status
    order.markAsExecuted(executionPrice, order.quantity);
    await order.save();

    // Create or update holding
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

    order.markAsRejected(error.message);
    await order.save();

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Limit order execution failed: ${error.message}`);
  }
};

/**
 * Execute a stop loss order
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order>}
 */
const executeStopLossOrder = async (orderId) => {
  // Step 1: Get order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (order.status !== 'pending') {
    return null;
  }

  // Step 2: Get current market price
  const marketPrice = await getCurrentMarketPrice(order.symbol, order.exchange);

  // Step 3: Check if trigger price is hit
  let shouldTrigger = false;

  if (order.transactionType === 'sell') {
    // For SELL SL: Trigger when market price <= trigger price (stop loss)
    shouldTrigger = marketPrice <= order.triggerPrice;
  } else {
    // For BUY SL: Trigger when market price >= trigger price
    shouldTrigger = marketPrice >= order.triggerPrice;
  }

  if (!shouldTrigger) {
    return null; // Trigger not hit
  }

  // Step 4: Execute at market price (SL converts to market order)
  // Or at limit price if SL order (not SLM)
  const executionPrice = order.orderVariant === 'slm' ? marketPrice : order.price;

  try {
    if (order.transactionType === 'buy') {
      await walletService.executeOrderPayment(order.userId, order.netAmount, order.netAmount, orderId);

      await transactionService.createTransaction({
        userId: order.userId,
        walletId: null,
        type: 'debit',
        amount: order.netAmount,
        reason: 'stock_buy',
        orderId: order.id,
        description: `BUY ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toLocaleString('en-IN')} (Stop Loss Triggered)`,
      });
    } else {
      const proceeds = order.quantity * executionPrice - order.totalCharges;
      await walletService.creditSaleProceeds(order.userId, proceeds, orderId, false); // Loss scenario

      await transactionService.createTransaction({
        userId: order.userId,
        walletId: null,
        type: 'credit',
        amount: proceeds,
        reason: 'stock_sell',
        orderId: order.id,
        description: `SELL ${order.quantity} shares of ${order.symbol} at ₹${executionPrice.toLocaleString('en-IN')} (Stop Loss Triggered)`,
      });
    }

    order.markAsExecuted(executionPrice, order.quantity);
    await order.save();

    // Create or update holding
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
