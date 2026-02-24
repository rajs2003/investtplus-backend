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
      // Short fully squared off via cover buy
      // Release the margin that was locked when the short was opened (20% of full position value)
      const marginRequired = marketConfig.margins.intraday.required;
      const shortMarginReserved = shortMarginBeforeCover * marginRequired;
      position.markAsSquaredOff(order._id);
      await releaseUpToLocked(order.userId, shortMarginReserved, order._id, 'Intraday short position squared off');

      // Settle P&L: short profit = sell high, buy low
      const pnl = (position.averagePrice - executionPrice) * order.quantity - order.totalCharges;
      if (pnl > 0) {
        await fundManager.creditSaleProceeds(order.userId, pnl, order._id, {
          reason: 'stock_sell',
          description: `Intraday short cover profit: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
          isProfit: true,
          profitAmount: pnl,
        });
      } else if (pnl < 0) {
        await fundManager.deductFunds(order.userId, Math.abs(pnl), order._id, {
          reason: 'intraday_loss',
          description: `Intraday short cover loss: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
        });
      }
    } else if (newQuantity > 0) {
      // Short fully covered and now net long with remaining quantity
      const marginRequired = marketConfig.margins.intraday.required;
      const shortMarginReserved = shortMarginBeforeCover * marginRequired;

      // P&L on the short portion (shortQuantityBeforeCover shares)
      const pnlOnShort =
        (position.averagePrice - executionPrice) * shortQuantityBeforeCover -
        order.totalCharges * (shortQuantityBeforeCover / order.quantity);

      // Release short margin
      await releaseUpToLocked(order.userId, shortMarginReserved, order._id, 'Intraday short position covered');

      if (pnlOnShort > 0) {
        await fundManager.creditSaleProceeds(order.userId, pnlOnShort, order._id, {
          reason: 'stock_sell',
          description: `Intraday short cover profit (net long): ${order.symbol} @ Rs ${executionPrice}`,
          isProfit: true,
          profitAmount: pnlOnShort,
        });
      } else if (pnlOnShort < 0) {
        await fundManager.deductFunds(order.userId, Math.abs(pnlOnShort), order._id, {
          reason: 'intraday_loss',
          description: `Intraday short cover loss (net long): ${order.symbol} @ Rs ${executionPrice}`,
        });
      }

      // Reserve margin for the new net long position
      const netLongMargin = newQuantity * executionPrice * marginRequired;
      try {
        await fundManager.reserveFunds(order.userId, netLongMargin, null);
      } catch (e) {
        console.warn(`Could not reserve margin for net long after short cover (${order.symbol}): ${e.message}`);
      }

      position.quantity = newQuantity;
      position.averagePrice = executionPrice;
      position.totalValue = newQuantity * executionPrice;
      position.orderIds.push(order._id);
    } else {
      // Still short, just reduced (partial cover)
      const marginRequired = marketConfig.margins.intraday.required;
      // Release margin proportional to how many short shares were covered
      const proportionalMarginRelease = marginToRelease * marginRequired;

      // P&L on the covered portion
      const pnl = (position.averagePrice - executionPrice) * order.quantity - order.totalCharges;

      position.quantity = newQuantity;
      position.totalValue = Math.abs(newQuantity * position.averagePrice);
      position.orderIds.push(order._id);

      await releaseUpToLocked(
        order.userId,
        proportionalMarginRelease,
        order._id,
        'Intraday short position partially covered',
      );

      if (pnl > 0) {
        await fundManager.creditSaleProceeds(order.userId, pnl, order._id, {
          reason: 'stock_sell',
          description: `Intraday short partial cover profit: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
          isProfit: true,
          profitAmount: pnl,
        });
      } else if (pnl < 0) {
        await fundManager.deductFunds(order.userId, Math.abs(pnl), order._id, {
          reason: 'intraday_loss',
          description: `Intraday short partial cover loss: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
        });
      }
    }

    await position.save();
  } else if (position && position.quantity > 0) {
    // Adding to existing long position
    // Margin for this additional quantity was already locked at order placement — no wallet change
    position.addQuantity(order.quantity, executionPrice, order._id);
    await position.save();
  } else {
    // Create new long position — margin (20%) was locked at order placement, no wallet deduction at execution
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
    // Margin stays locked until squareoff — no further wallet change at execution
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
      // Long position fully squared off
      const marginRequired = marketConfig.margins.intraday.required;
      // Release the margin that was locked when this long was opened (20% of full position value)
      const marginReserved = position.totalValue * marginRequired;
      // P&L = (exit − entry) × qty − charges
      const pnl = (executionPrice - position.averagePrice) * order.quantity - order.totalCharges;

      position.markAsSquaredOff(order._id);
      await releaseUpToLocked(order.userId, marginReserved, order._id, 'Intraday long squared off');

      if (pnl > 0) {
        await fundManager.creditSaleProceeds(order.userId, pnl, order._id, {
          reason: 'stock_sell',
          description: `Intraday squareoff profit: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
          isProfit: true,
          profitAmount: pnl,
        });
      } else if (pnl < 0) {
        await fundManager.deductFunds(order.userId, Math.abs(pnl), order._id, {
          reason: 'intraday_loss',
          description: `Intraday squareoff loss: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
        });
      }
    } else if (newQuantity > 0) {
      // Partial sell, long position still open
      const marginRequired = marketConfig.margins.intraday.required;
      // Release margin proportional to the quantity being sold
      const marginToRelease = order.quantity * position.averagePrice * marginRequired;
      // P&L on the sold portion
      const pnl = (executionPrice - position.averagePrice) * order.quantity - order.totalCharges;

      position.quantity = newQuantity;
      position.totalValue = newQuantity * position.averagePrice;
      position.orderIds.push(order._id);

      await releaseUpToLocked(order.userId, marginToRelease, order._id, 'Intraday partial squareoff');

      if (pnl > 0) {
        await fundManager.creditSaleProceeds(order.userId, pnl, order._id, {
          reason: 'stock_sell',
          description: `Intraday partial squareoff profit: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
          isProfit: true,
          profitAmount: pnl,
        });
      } else if (pnl < 0) {
        await fundManager.deductFunds(order.userId, Math.abs(pnl), order._id, {
          reason: 'intraday_loss',
          description: `Intraday partial squareoff loss: ${order.quantity} ${order.symbol} @ Rs ${executionPrice}`,
        });
      }
    } else {
      // Oversell: long fully closed + excess creates a net short position
      const marginRequired = marketConfig.margins.intraday.required;
      const originalLongQty = position.quantity;
      const netShortQty = Math.abs(newQuantity);

      // Release long margin fully
      const longMarginReserved = position.totalValue * marginRequired;
      await releaseUpToLocked(order.userId, longMarginReserved, order._id, 'Intraday long squared off (oversell)');

      // P&L on the long portion only
      const pnlOnLong =
        (executionPrice - position.averagePrice) * originalLongQty - order.totalCharges * (originalLongQty / order.quantity);
      if (pnlOnLong > 0) {
        await fundManager.creditSaleProceeds(order.userId, pnlOnLong, order._id, {
          reason: 'stock_sell',
          description: `Intraday squareoff profit (oversell): ${order.symbol} @ Rs ${executionPrice}`,
          isProfit: true,
          profitAmount: pnlOnLong,
        });
      } else if (pnlOnLong < 0) {
        await fundManager.deductFunds(order.userId, Math.abs(pnlOnLong), order._id, {
          reason: 'intraday_loss',
          description: `Intraday squareoff loss (oversell): ${order.symbol} @ Rs ${executionPrice}`,
        });
      }

      // Reserve margin for the net short portion
      const shortMarginNeeded = netShortQty * executionPrice * marginRequired;
      try {
        await fundManager.reserveFunds(order.userId, shortMarginNeeded, null);
      } catch (e) {
        console.warn(`Could not reserve margin for net short after oversell (${order.symbol}): ${e.message}`);
      }

      position.quantity = newQuantity;
      position.averagePrice = executionPrice;
      position.totalValue = netShortQty * executionPrice;
      position.orderIds.push(order._id);
    }

    await position.save();
  } else if (position && position.quantity < 0) {
    // Adding to existing short position
    // Margin for this additional quantity was already locked at order placement — no wallet change
    position.addQuantity(-order.quantity, executionPrice, order._id);
    await position.save();
  } else {
    // New short position — margin (20%) was locked at order placement, no wallet change at execution
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
    // Margin stays locked until squareoff — no further wallet change at execution
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
