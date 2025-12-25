const httpStatus = require('http-status');
const { Holding, Order, Trade } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const { orderExecutionService } = require('../orderServices/orderExecution.service');
const logger = require('../../../../config/logger');
const { getRedisClient } = require('../../../../utils/redisUtil');

/**
 * Create or update holding after buy order execution
 * @param {Object} order - Executed buy order
 * @returns {Promise<Holding>}
 */
const createOrUpdateHolding = async (order) => {
  try {
    if (order.transactionType !== 'buy' || order.status !== 'executed') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Only executed buy orders can create holdings');
    }

    // Calculate auto square-off time for intraday (3:20 PM same day)
    let autoSquareOffTime = null;
    if (order.orderType === 'intraday') {
      autoSquareOffTime = new Date();
      autoSquareOffTime.setHours(15, 20, 0, 0); // 3:20 PM

      // If current time is after 3:20 PM, set for next trading day
      if (new Date() > autoSquareOffTime) {
        autoSquareOffTime.setDate(autoSquareOffTime.getDate() + 1);
      }
    }

    // Check if holding already exists
    const existingHolding = await Holding.findOne({
      userId: order.userId,
      symbol: order.symbol,
      holdingType: order.orderType,
      quantity: { $gt: 0 },
    });

    if (existingHolding) {
      // Add to existing holding (averaging)
      existingHolding.addQuantity(order.executedQuantity, order.executedPrice, order._id);
      await existingHolding.save();

      logger.info('Holding updated with new quantity', {
        holdingId: existingHolding._id,
        symbol: order.symbol,
        newQuantity: existingHolding.quantity,
        newAvgPrice: existingHolding.averageBuyPrice,
      });

      return existingHolding;
    }

    // Create new holding
    const holding = await Holding.create({
      userId: order.userId,
      walletId: order.walletId,
      symbol: order.symbol,
      exchange: order.exchange || 'NSE',
      holdingType: order.orderType,
      quantity: order.executedQuantity,
      averageBuyPrice: order.executedPrice,
      totalInvestment: order.executedQuantity * order.executedPrice,
      currentPrice: order.executedPrice,
      currentValue: order.executedQuantity * order.executedPrice,
      unrealizedPL: 0,
      unrealizedPLPercentage: 0,
      orderIds: [order._id],
      autoSquareOffTime,
    });

    logger.info('New holding created', {
      holdingId: holding._id,
      symbol: order.symbol,
      quantity: holding.quantity,
      avgPrice: holding.averageBuyPrice,
    });

    // Invalidate cache
    await invalidateHoldingCache(order.userId);

    return holding;
  } catch (error) {
    logger.error('Failed to create/update holding', {
      orderId: order._id,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get all active holdings for a user (with Redis caching for performance)
 * @param {ObjectId} userId
 * @param {Object} filter - { holdingType }
 * @returns {Promise<Array<Holding>>}
 */
const getHoldings = async (userId, filter = {}) => {
  try {
    // Try to get from cache first (30 seconds TTL)
    const cacheKey = `holdings:${userId}:${filter.holdingType || 'all'}`;
    const redis = getRedisClient();
    
    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Holdings retrieved from cache', { userId, cacheKey });
        return JSON.parse(cachedData);
      }
    }

    // Get from database
    const holdings = await Holding.getActiveHoldings(userId, filter.holdingType);

    if (holdings.length === 0) {
      return [];
    }

    // Batch fetch market prices for all symbols
    const symbols = [...new Set(holdings.map(h => h.symbol))];
    const priceMap = {};
    
    // Get current prices for all symbols in parallel
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const exchange = holdings.find(h => h.symbol === symbol)?.exchange || 'NSE';
          priceMap[symbol] = orderExecutionService.getCurrentMarketPrice(symbol, exchange);
        } catch (error) {
          logger.warn(`Failed to get price for ${symbol}`, error);
          priceMap[symbol] = 0;
        }
      })
    );

    // Update prices in bulk
    const updatedHoldings = holdings.map((holding) => {
      if (priceMap[holding.symbol]) {
        holding.updateCurrentPrice(priceMap[holding.symbol]);
      }
      return holding;
    });

    // Batch save all holdings
    await Promise.all(updatedHoldings.map((h) => h.save()));

    // Cache the results
    if (redis) {
      await redis.setEx(cacheKey, 30, JSON.stringify(updatedHoldings)); // 30 seconds cache
    }

    return updatedHoldings;
  } catch (error) {
    logger.error('Failed to get holdings', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get specific holding by symbol
 * @param {ObjectId} userId
 * @param {string} symbol
 * @param {string} holdingType
 * @returns {Promise<Holding>}
 */
const getHoldingBySymbol = async (userId, symbol, holdingType) => {
  const holding = await Holding.findOne({
    userId,
    symbol: symbol.toUpperCase(),
    holdingType,
    quantity: { $gt: 0 },
  });

  if (!holding) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Holding not found');
  }

  // Update current price
  const currentPrice = orderExecutionService.getCurrentMarketPrice(holding.symbol, holding.exchange);
  holding.updateCurrentPrice(currentPrice);
  await holding.save();

  return holding;
};

/**
 * Process sell order and update/close holding
 * @param {Object} order - Executed sell order
 * @returns {Promise<Object>} - { holding, trade }
 */
const processSellOrder = async (order) => {
  try {
    if (order.transactionType !== 'sell' || order.status !== 'executed') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Only executed sell orders can be processed');
    }

    // Find the holding
    const holding = await Holding.findOne({
      userId: order.userId,
      symbol: order.symbol,
      holdingType: order.orderType,
      quantity: { $gt: 0 },
    });

    if (!holding) {
      throw new ApiError(httpStatus.NOT_FOUND, `No ${order.orderType} holding found for ${order.symbol}`);
    }

    if (order.executedQuantity > holding.quantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cannot sell ${order.executedQuantity} shares. Only ${holding.quantity} shares available`
      );
    }

    // Reduce quantity and calculate realized P&L
    const plDetails = holding.reduceQuantity(order.executedQuantity, order.executedPrice);
    await holding.save();

    logger.info('Holding updated after sell', {
      holdingId: holding._id,
      symbol: order.symbol,
      soldQuantity: order.executedQuantity,
      remainingQuantity: holding.quantity,
      realizedPL: plDetails.realizedPL,
    });

    // Find matching buy order(s) for trade record
    const buyOrders = await Order.find({
      _id: { $in: holding.orderIds },
      transactionType: 'buy',
      status: 'executed',
    }).sort({ executedAt: 1 });

    if (buyOrders.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'No matching buy order found for trade record');
    }

    // Use the first/oldest buy order for trade record (FIFO)
    const buyOrder = buyOrders[0];

    // Create trade record
    const trade = await Trade.createFromOrders({
      userId: order.userId,
      walletId: order.walletId,
      holdingId: holding._id,
      symbol: order.symbol,
      exchange: order.exchange,
      tradeType: order.orderType,
      buyOrder,
      sellOrder: order,
      quantity: order.executedQuantity,
      isAutoSquareOff: false,
    });

    logger.info('Trade record created', {
      tradeId: trade._id,
      symbol: order.symbol,
      netPL: trade.netPL,
      plPercentage: trade.plPercentage,
    });

    // Invalidate cache after sell
    await invalidateHoldingCache(order.userId);

    return { holding, trade };
  } catch (error) {
    logger.error('Failed to process sell order', {
      orderId: order._id,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get portfolio summary for a user (Optimized with parallel queries)
 * @param {ObjectId} userId
 * @returns {Promise<Object>}
 */
const getPortfolioSummary = async (userId) => {
  try {
    // Check cache first (60 seconds TTL)
    const cacheKey = `portfolio:summary:${userId}`;
    const redis = getRedisClient();
    
    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Portfolio summary retrieved from cache', { userId });
        return JSON.parse(cachedData);
      }
    }

    // Parallel execution of all queries for better performance
    const [portfolioValue, tradeStats, todayTrades, intradayHoldings, deliveryHoldings] = await Promise.all([
      Holding.getPortfolioValue(userId),
      Trade.getTradeStats(userId),
      Trade.getTodayTrades(userId),
      Holding.getActiveHoldings(userId, 'intraday'),
      Holding.getActiveHoldings(userId, 'delivery'),
    ]);

    // Calculate today's P&L
    const todayPL = todayTrades.reduce((sum, trade) => sum + trade.netPL, 0);

    const summary = {
      // Portfolio overview
      totalInvestment: portfolioValue.totalInvestment || 0,
      currentValue: portfolioValue.totalCurrentValue || 0,
      unrealizedPL: portfolioValue.totalUnrealizedPL || 0,
      unrealizedPLPercentage: portfolioValue.totalUnrealizedPLPercentage || 0,
      holdingsCount: portfolioValue.holdingsCount || 0,

      // Today's performance
      todayPL,
      todayTrades: todayTrades.length,

      // Trade statistics
      totalTrades: tradeStats.totalTrades || 0,
      realizedPL: tradeStats.totalNetPL || 0,
      winRate: tradeStats.winRate || 0,
      profitableTrades: tradeStats.profitableTrades || 0,
      losingTrades: tradeStats.losingTrades || 0,

      // Holdings breakdown
      intradayPositions: intradayHoldings.length,
      deliveryPositions: deliveryHoldings.length,

      // Additional metrics
      averagePLPerTrade: tradeStats.totalTrades > 0 ? tradeStats.totalNetPL / tradeStats.totalTrades : 0,
      totalPositions: intradayHoldings.length + deliveryHoldings.length,
    };

    // Cache for 60 seconds
    if (redis) {
      await redis.setEx(cacheKey, 60, JSON.stringify(summary));
    }

    return summary;
  } catch (error) {
    logger.error('Failed to get portfolio summary', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Auto square-off intraday positions
 * Called at 3:20 PM daily
 * @returns {Promise<Object>}
 */
const autoSquareOffIntraday = async () => {
  try {
    logger.info('Starting auto square-off for intraday positions');

    // Get all pending square-offs
    const holdings = await Holding.getPendingSquareOffs();

    if (holdings.length === 0) {
      logger.info('No intraday positions to square-off');
      return { squaredOff: 0, failed: 0 };
    }

    logger.info(`Found ${holdings.length} intraday positions to square-off`);

    const results = {
      squaredOff: 0,
      failed: 0,
      errors: [],
    };

    for (const holding of holdings) {
      try {
        // Create market sell order
        const sellOrderData = {
          userId: holding.userId,
          walletId: holding.walletId,
          symbol: holding.symbol,
          exchange: holding.exchange,
          orderType: 'intraday',
          orderVariant: 'market',
          transactionType: 'sell',
          quantity: holding.quantity,
        };

        // Import orderService dynamically to avoid circular dependency
        const orderService = require('../orderServices/order.service');
        const sellOrder = await orderService.placeOrder(holding.userId, sellOrderData);

        // Mark holding as squared off
        holding.markAsSquaredOff(sellOrder._id);
        await holding.save();

        // Create trade record
        const buyOrders = await Order.find({
          _id: { $in: holding.orderIds },
          transactionType: 'buy',
          status: 'executed',
        }).sort({ executedAt: 1 });

        if (buyOrders.length > 0) {
          await Trade.createFromOrders({
            userId: holding.userId,
            walletId: holding.walletId,
            holdingId: holding._id,
            symbol: holding.symbol,
            exchange: holding.exchange,
            tradeType: 'intraday',
            buyOrder: buyOrders[0],
            sellOrder,
            quantity: holding.quantity,
            isAutoSquareOff: true,
          });
        }

        // Invalidate cache
        await invalidateHoldingCache(holding.userId);

        results.squaredOff++;
        logger.info(`Auto squared-off holding ${holding._id}`, {
          symbol: holding.symbol,
          quantity: holding.quantity,
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          holdingId: holding._id,
          symbol: holding.symbol,
          error: error.message,
        });
        logger.error(`Failed to square-off holding ${holding._id}`, {
          symbol: holding.symbol,
          error: error.message,
        });
      }
    }

    logger.info('Auto square-off completed', results);
    return results;
  } catch (error) {
    logger.error('Auto square-off job failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Invalidate holding cache for a user (Performance helper)
 * @param {ObjectId} userId
 */
const invalidateHoldingCache = async (userId) => {
  try {
    const redis = getRedisClient();
    if (redis) {
      const keys = [
        `holdings:${userId}:all`,
        `holdings:${userId}:intraday`,
        `holdings:${userId}:delivery`,
        `portfolio:summary:${userId}`,
      ];
      await Promise.all(keys.map(key => redis.del(key)));
      logger.debug('Holdings cache invalidated', { userId });
    }
  } catch (error) {
    logger.warn('Failed to invalidate cache', { userId, error: error.message });
  }
};

/**
 * Batch update current prices for multiple holdings (Performance optimized)
 * @param {Array<Holding>} holdings
 * @returns {Promise<Array<Holding>>}
 */
const batchUpdatePrices = async (holdings) => {
  if (!holdings || holdings.length === 0) {
    return [];
  }

  try {
    // Group by symbol to avoid duplicate price fetches
    const symbolMap = new Map();
    holdings.forEach(holding => {
      if (!symbolMap.has(holding.symbol)) {
        symbolMap.set(holding.symbol, {
          exchange: holding.exchange,
          holdings: []
        });
      }
      symbolMap.get(holding.symbol).holdings.push(holding);
    });

    // Fetch all prices in parallel
    const pricePromises = Array.from(symbolMap.entries()).map(async ([symbol, data]) => {
      try {
        const price = orderExecutionService.getCurrentMarketPrice(symbol, data.exchange);
        return { symbol, price };
      } catch (error) {
        logger.warn(`Failed to fetch price for ${symbol}`, error);
        return { symbol, price: 0 };
      }
    });

    const prices = await Promise.all(pricePromises);

    // Update all holdings with fetched prices
    const priceMap = new Map(prices.map(p => [p.symbol, p.price]));
    
    holdings.forEach(holding => {
      const price = priceMap.get(holding.symbol);
      if (price && price > 0) {
        holding.updateCurrentPrice(price);
      }
    });

    // Batch save
    await Promise.all(holdings.map(h => h.save()));

    return holdings;
  } catch (error) {
    logger.error('Batch price update failed', error);
    throw error;
  }
};

module.exports = {
  createOrUpdateHolding,
  getHoldings,
  getHoldingBySymbol,
  processSellOrder,
  getPortfolioSummary,
  autoSquareOffIntraday,
  invalidateHoldingCache,
  batchUpdatePrices,
};
