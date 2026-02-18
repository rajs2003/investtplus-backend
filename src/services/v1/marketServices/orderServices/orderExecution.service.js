/* eslint-disable no-unused-vars */
const httpStatus = require('http-status');
const { Order, Position, Holding } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const { marketDataService } = require('../../mockMarket');
const fundManager = require('../walletServices/fundManager.service');
const walletService = require('../walletServices/wallet.service');
const transactionService = require('../walletServices/transaction.service');
const marketConfig = require('../../../../config/market.config');

/**
 * Get current market price for a symbol
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange (NSE/BSE)
 * @returns {Promise<number>} Current market price
 */
const getCurrentMarketPrice = async (symbol, exchange = 'NSE') => {
  try {
    const priceData = marketDataService.getCurrentPrice(symbol.toUpperCase(), exchange); // later fetch any api to get the real time price.
    return priceData.data.ltp;
  } catch (error) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Unable to fetch current price for ${symbol} on ${exchange}: ${error.message}`,
    );
  }
};

/**
 * Calculate expiry time based on order type
 * @param {string} orderType - Order type (intraday/delivery)
 * @returns {Date} Expiry date
 */
const calculateExpiryTime = (orderType) => {
  const now = new Date();

  if (orderType === 'intraday') {
    // Intraday: Auto square-off time from config
    const squareOffTime = marketConfig.autoSquareOff.intraday.time; // Format: 'HH:mm'
    const [hours, minutes] = squareOffTime.split(':').map(Number);

    const expiryTime = new Date(now);
    expiryTime.setHours(hours, minutes, 0, 0);

    // If current time is after square-off time, set for next trading day
    if (now > expiryTime) {
      expiryTime.setDate(expiryTime.getDate() + 1);
    }

    return expiryTime;
  } else {
    // Delivery: Show in positions for configured duration
    const durationHours = marketConfig.positions.delivery.displayDuration;
    return new Date(now.getTime() + durationHours * 60 * 60 * 1000);
  }
};

const releaseUpToLocked = async (userId, requestedAmount, orderId, reason) => {
  if (!requestedAmount || requestedAmount <= 0) {
    return;
  }

  const latestWallet = await walletService.getWalletByUserId(userId);
  const releasableAmount = Math.min(requestedAmount, latestWallet.lockedAmount || 0);

  if (releasableAmount > 0) {
    await fundManager.releaseFunds(userId, releasableAmount, orderId, reason);
  }
};

/**
 * Handle INTRADAY BUY execution
 * @param {Object} order - Order to execute
 * @param {number} executionPrice - Execution price
 * @returns {Promise<Object>}
 */
const handleIntradayBuy = async (order, executionPrice) => {
  const wallet = await walletService.getWalletByUserId(order.userId);

  // Check if this is covering a short position
  let position = await Position.findOne({
    userId: order.userId,
    symbol: order.symbol,
    exchange: order.exchange,
    positionType: 'intraday',
    isSquaredOff: false,
  });

  if (position && position.quantity < 0) {
    // Covering short position
    const shortQuantityBeforeCover = Math.abs(position.quantity);
    const coverQuantity = Math.min(order.quantity, shortQuantityBeforeCover);
    const shortMarginBeforeCover = Math.abs(position.totalValue);
    const marginToRelease =
      shortQuantityBeforeCover > 0 ? (shortMarginBeforeCover * coverQuantity) / shortQuantityBeforeCover : 0;
    const newQuantity = position.quantity + order.quantity;

    if (newQuantity === 0) {
      // Position fully squared off
      position.markAsSquaredOff(order._id);
      // Release reserved margin for short position
      await releaseUpToLocked(order.userId, shortMarginBeforeCover, order._id, 'Short position squared off');

      const actualAmount0 = order.quantity * executionPrice;
      await fundManager.settleOrderPayment(order.userId, order.reservedAmount || actualAmount0, actualAmount0, order._id, {
        reason: 'stock_buy',
        description: `Intraday short cover: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
      });
    } else if (newQuantity > 0) {
      // Short covered and now long
      position.quantity = newQuantity;
      position.averagePrice = executionPrice;
      position.totalValue = newQuantity * executionPrice;
      position.orderIds.push(order._id);
      // Release short margin and settle for new long position
      await releaseUpToLocked(order.userId, shortMarginBeforeCover, order._id, 'Short position covered');
      const actualAmount1 = order.quantity * executionPrice; // Actual cost without margin
      await fundManager.settleOrderPayment(order.userId, order.reservedAmount || actualAmount1, actualAmount1, order._id, {
        reason: 'stock_buy',
        description: `Intraday buy: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
      });
    } else {
      // Still short, just reduced
      position.quantity = newQuantity;
      position.totalValue = Math.abs(newQuantity * position.averagePrice);
      position.orderIds.push(order._id);

      await releaseUpToLocked(order.userId, marginToRelease, order._id, 'Short position partially covered');

      const actualAmountPartial = order.quantity * executionPrice;
      await fundManager.settleOrderPayment(
        order.userId,
        order.reservedAmount || actualAmountPartial,
        actualAmountPartial,
        order._id,
        {
          reason: 'stock_buy',
          description: `Intraday short partial cover: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
        },
      );
    }

    await position.save();
  } else if (position && position.quantity > 0) {
    // Adding to existing long position
    position.addQuantity(order.quantity, executionPrice, order._id);
    await position.save();

    // Settle additional payment
    const actualAmount2 = order.quantity * executionPrice; // Actual cost without margin
    await fundManager.settleOrderPayment(order.userId, order.reservedAmount, actualAmount2, order._id, {
      reason: 'stock_buy',
      description: `Intraday buy: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
    });
  } else {
    // Create new long position
    position = await Position.create({
      userId: order.userId,
      walletId: wallet._id,
      symbol: order.symbol,
      exchange: order.exchange,
      positionType: 'intraday',
      quantity: order.quantity,
      averagePrice: executionPrice,
      totalValue: order.quantity * executionPrice,
      currentPrice: executionPrice,
      orderIds: [order._id],
      expiresAt: calculateExpiryTime('intraday'),
    });

    // Settle payment from reserved funds
    const actualAmount3 = order.quantity * executionPrice; // Actual cost without margin
    await fundManager.settleOrderPayment(order.userId, order.reservedAmount, actualAmount3, order._id, {
      reason: 'stock_buy',
      description: `Intraday buy: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
    });
  }

  return { position };
};

/**
 * Handle INTRADAY SELL execution
 * @param {Object} order - Order to execute
 * @param {number} executionPrice - Execution price
 * @returns {Promise<Object>}
 */
const handleIntradaySell = async (order, executionPrice) => {
  const wallet = await walletService.getWalletByUserId(order.userId);

  // Check existing position
  let position = await Position.findOne({
    userId: order.userId,
    symbol: order.symbol,
    exchange: order.exchange,
    positionType: 'intraday',
    isSquaredOff: false,
  });

  if (position && position.quantity > 0) {
    // Reducing/closing long position
    const newQuantity = position.quantity - order.quantity;

    if (newQuantity === 0) {
      // Position fully squared off
      const proceeds = order.quantity * executionPrice - order.totalCharges;
      position.markAsSquaredOff(order._id);

      // Credit proceeds
      await fundManager.creditSaleProceeds(order.userId, proceeds, order._id, {
        reason: 'stock_sell',
        description: `Intraday sell: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
      });

      // Release any remaining locked funds
      await releaseUpToLocked(order.userId, Math.abs(position.totalValue), order._id, 'Position squared off');
    } else if (newQuantity > 0) {
      // Partial sell, still long
      const proceeds = order.quantity * executionPrice - order.totalCharges;
      position.quantity = newQuantity;
      position.totalValue = newQuantity * position.averagePrice;
      position.orderIds.push(order._id);

      await fundManager.creditSaleProceeds(order.userId, proceeds, order._id, {
        reason: 'stock_sell',
        description: `Intraday sell: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
      });
    } else {
      // Sold more than held - now short
      position.quantity = newQuantity;
      position.averagePrice = executionPrice;
      position.totalValue = Math.abs(newQuantity) * executionPrice;
      position.orderIds.push(order._id);

      // Note: Margin was already reserved at order placement time
      // Just credit the sale proceeds
      const proceeds = order.quantity * executionPrice - order.totalCharges;
      await fundManager.creditSaleProceeds(order.userId, proceeds, order._id, {
        reason: 'stock_sell',
        description: `Intraday sell (short): ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
      });
    }

    await position.save();
  } else if (position && position.quantity < 0) {
    // Adding to short position
    position.addQuantity(-order.quantity, executionPrice, order._id);
    await position.save();

    // Note: Margin was already reserved at order placement time
    // Just credit the sale proceeds
    const proceeds = order.quantity * executionPrice - order.totalCharges;
    await fundManager.creditSaleProceeds(order.userId, proceeds, order._id, {
      reason: 'stock_sell',
      description: `Intraday sell (add to short): ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
    });
  } else {
    // New short position (short selling)
    position = await Position.create({
      userId: order.userId,
      walletId: wallet._id,
      symbol: order.symbol,
      exchange: order.exchange,
      positionType: 'intraday',
      quantity: -order.quantity,
      averagePrice: executionPrice,
      totalValue: order.quantity * executionPrice,
      currentPrice: executionPrice,
      orderIds: [order._id],
      expiresAt: calculateExpiryTime('intraday'),
    });

    // Margin already reserved at order placement time
    // Credit sale proceeds after short sell execution
    const proceeds = order.quantity * executionPrice - order.totalCharges;
    await fundManager.creditSaleProceeds(order.userId, proceeds, order._id, {
      reason: 'stock_sell',
      description: `Intraday sell (new short): ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
    });
  }

  return { position };
};

/**
 * Handle DELIVERY BUY execution
 * @param {Object} order - Order to execute
 * @param {number} executionPrice - Execution price
 * @returns {Promise<Object>}
 */
const handleDeliveryBuy = async (order, executionPrice) => {
  const wallet = await walletService.getWalletByUserId(order.userId);

  // Funds already deducted during order placement
  // Delivery flow requirement:
  // 1) Keep delivery position open for tracking
  // 2) Also create/update holding instantly on BUY execution

  let position = await Position.findOne({
    userId: order.userId,
    symbol: order.symbol,
    exchange: order.exchange,
    positionType: 'delivery',
    isSquaredOff: false,
    quantity: { $ne: 0 },
  });

  if (position) {
    position.addQuantity(order.quantity, executionPrice, order._id);
    position.currentPrice = executionPrice;
  } else {
    position = await Position.create({
      userId: order.userId,
      walletId: wallet._id,
      symbol: order.symbol,
      exchange: order.exchange,
      positionType: 'delivery',
      quantity: order.quantity,
      averagePrice: executionPrice,
      totalValue: order.quantity * executionPrice,
      currentPrice: executionPrice,
      orderIds: [order._id],
      expiresAt: calculateExpiryTime('delivery'),
    });
  }

  let holding = await Holding.findOne({
    userId: order.userId,
    symbol: order.symbol,
    exchange: order.exchange,
    holdingType: 'delivery',
  });

  if (holding) {
    holding.addQuantity(order.quantity, executionPrice, order._id);
  } else {
    holding = await Holding.create({
      userId: order.userId,
      walletId: wallet._id,
      symbol: order.symbol,
      exchange: order.exchange,
      holdingType: 'delivery',
      quantity: order.quantity,
      averageBuyPrice: executionPrice,
      totalInvestment: order.quantity * executionPrice,
      currentPrice: executionPrice,
      currentValue: order.quantity * executionPrice,
      unrealizedPL: 0,
      unrealizedPLPercentage: 0,
      orderIds: [order._id],
    });
  }

  await holding.save();

  position.convertedToHolding = true;
  position.holdingId = holding._id;
  await position.save();

  return { position, holding };
};

/**
 * Handle DELIVERY SELL execution
 * @param {Object} order - Order to execute
 * @param {number} executionPrice - Execution price
 * @returns {Promise<Object>}
 */
const handleDeliverySell = async (order, executionPrice) => {
  // Check if holdings exist
  const holding = await Holding.findOne({
    userId: order.userId,
    symbol: order.symbol,
    exchange: order.exchange,
    holdingType: 'delivery',
  });

  if (!holding) {
    throw new ApiError(httpStatus.BAD_REQUEST, `No holdings found for ${order.symbol}. Cannot sell delivery.`);
  }

  if (holding.quantity < order.quantity) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient holdings. Available: ${holding.quantity}, Requested: ${order.quantity}`,
    );
  }

  let position = await Position.findOne({
    userId: order.userId,
    symbol: order.symbol,
    exchange: order.exchange,
    positionType: 'delivery',
    isSquaredOff: false,
    quantity: { $ne: 0 },
  });

  // Calculate proceeds
  const proceeds = order.quantity * executionPrice - order.totalCharges;

  // Update or remove holding
  if (holding.quantity === order.quantity) {
    // Sell all - remove holding
    await Holding.findByIdAndDelete(holding._id);
  } else {
    // Partial sell
    holding.quantity -= order.quantity;
    holding.totalInvestment = holding.quantity * holding.averageBuyPrice;
    holding.orderIds.push(order._id);
    await holding.save();
  }

  // Update/close delivery position in sync with holding updates
  if (position) {
    if (position.quantity <= order.quantity) {
      position.markAsSquaredOff(order._id);
    } else {
      position.quantity -= order.quantity;
      position.totalValue = position.quantity * position.averagePrice;
      position.orderIds.push(order._id);
      position.currentPrice = executionPrice;
    }

    await position.save();
  }

  // Credit proceeds to wallet
  await fundManager.creditSaleProceeds(order.userId, proceeds, order._id, {
    reason: 'stock_sell',
    description: `Delivery sell: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
  });

  return { holding, position };
};

/**
 * Main order execution function
 * Handles all order types and variants
 * @param {ObjectId} orderId - Order ID to execute
 * @returns {Promise<Order>} Executed order
 */
const executeOrder = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (order.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot execute order with status: ${order.status}`);
  }

  console.log(`Order data:`, {
    id: order._id,
    orderType: order.orderType,
    transactionType: order.transactionType,
    netAmount: order.netAmount,
    reservedAmount: order.reservedAmount,
  });

  // Get current market price
  const executionPrice = await getCurrentMarketPrice(order.symbol, order.exchange);

  // Execute based on order type and transaction type
  let result;

  if (order.orderType === 'intraday') {
    if (order.transactionType === 'buy') {
      result = await handleIntradayBuy(order, executionPrice);
    } else {
      result = await handleIntradaySell(order, executionPrice);
    }
  } else if (order.orderType === 'delivery') {
    if (order.transactionType === 'buy') {
      result = await handleDeliveryBuy(order, executionPrice);
    } else {
      result = await handleDeliverySell(order, executionPrice);
    }
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, `Unsupported order type: ${order.orderType}`);
  }

  // Mark order as executed
  order.markAsExecuted(executionPrice, order.quantity);
  await order.save();

  console.log(
    `Order ${orderId} executed: ${order.orderType.toUpperCase()} ${order.transactionType.toUpperCase()} ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
  );

  return order;
};

/**
 * Execute a limit order (called when price condition is met)
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order|null>} Order if executed, null if conditions not met
 */
const executeLimitOrder = async (orderId) => {
  return await executeOrder(orderId);
};

/**
 * Execute a stop loss order (SL or SL-M)
 * For BUY: Triggers when market price >= triggerPrice (stop loss to limit upside)
 * For SELL: Triggers when market price <= triggerPrice (stop loss to limit downside)
 * @param {ObjectId} orderId - Order ID
 * @returns {Promise<Order|null>} Order if executed, null if conditions not met
 */
const executeStopLossOrder = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    console.error('Order not found:', orderId);
    return null;
  }

  // Validate order status and variant
  if (order.status !== 'pending') {
    console.log(`Stop loss order ${orderId} already processed with status: ${order.status}`);
    return order;
  }

  if (order.orderVariant !== 'sl' && order.orderVariant !== 'slm') {
    console.error(`Order ${orderId} is not a stop loss order (variant: ${order.orderVariant})`);
    return null;
  }

  // Get current market price
  const currentPrice = await getCurrentMarketPrice(order.symbol, order.exchange);
  if (!currentPrice) {
    console.error(`Cannot get market price for ${order.symbol} on ${order.exchange}`);
    return null;
  }

  // Check if trigger condition is met
  let triggerMet = false;
  if (order.transactionType === 'buy') {
    // For BUY stop loss: trigger when price goes UP to/above trigger price
    triggerMet = currentPrice >= order.triggerPrice;
  } else if (order.transactionType === 'sell') {
    // For SELL stop loss: trigger when price goes DOWN to/below trigger price
    triggerMet = currentPrice <= order.triggerPrice;
  }

  if (!triggerMet) {
    console.log(
      `Stop loss trigger not met for ${order.symbol}: Current ${currentPrice}, Trigger ${order.triggerPrice}, Type ${order.transactionType}`,
    );
    return null;
  }

  console.log(
    `Stop loss TRIGGERED for ${order.symbol}: Current ${currentPrice}, Trigger ${order.triggerPrice}, Type ${order.transactionType}`,
  );

  // Execute based on variant
  if (order.orderVariant === 'slm') {
    // SL-M: Execute immediately at current market price
    console.log(`Executing SL-M order ${orderId} at market price ${currentPrice}`);
    return await executeOrder(orderId);
  } else if (order.orderVariant === 'sl') {
    // SL: Execute as limit order at specified price
    // Check if limit price condition is also met
    let limitMet = false;
    if (order.transactionType === 'buy') {
      // For BUY: execute if market price <= limit price
      limitMet = currentPrice <= order.price;
    } else if (order.transactionType === 'sell') {
      // For SELL: execute if market price >= limit price
      limitMet = currentPrice >= order.price;
    }

    if (limitMet) {
      console.log(`Executing SL order ${orderId} at limit price ${order.price} (market: ${currentPrice})`);
      return await executeOrder(orderId);
    } else {
      console.log(
        `SL order ${orderId} triggered but limit price not met: Market ${currentPrice}, Limit ${order.price}, Type ${order.transactionType}`,
      );
      return null;
    }
  }

  return null;
};

module.exports = {
  getCurrentMarketPrice,
  executeOrder,
  executeLimitOrder,
  executeStopLossOrder,
};
