const httpStatus = require('http-status');
const { Watchlist } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const logger = require('../../../../config/logger');
const { getRedisClient } = require('../../../../utils/redisUtil');
const { marketService, stockService } = require('../../../../services');

/**
 * Create a new watchlist
 * @param {ObjectId} userId
 * @param {Object} watchlistData
 * @returns {Promise<Watchlist>}
 */
const createWatchlist = async (userId, watchlistData) => {
  try {
    // Check if user already has a watchlist with the same name
    const existingWatchlist = await Watchlist.findOne({
      userId,
      name: watchlistData.name,
    });

    if (existingWatchlist) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Watchlist "${watchlistData.name}" already exists`);
    }

    // Count user's watchlists
    const watchlistCount = await Watchlist.countDocuments({ userId });

    // Limit: 10 watchlists per user
    if (watchlistCount >= 10) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Maximum 10 watchlists allowed per user');
    }

    // If this is the first watchlist, make it default
    const isDefault = watchlistCount === 0 ? true : watchlistData.isDefault || false;

    // If setting as default, unset other defaults
    if (isDefault) {
      await Watchlist.updateMany({ userId, isDefault: true }, { isDefault: false });
    }

    const watchlist = await Watchlist.create({
      userId,
      name: watchlistData.name,
      stocks: watchlistData.stocks || [],
      isDefault,
      sortOrder: watchlistData.sortOrder || watchlistCount,
      color: watchlistData.color || '#3B82F6',
      icon: watchlistData.icon || '📊',
    });

    // Invalidate cache
    await invalidateWatchlistCache(userId);

    logger.info('Watchlist created', {
      userId,
      watchlistId: watchlist._id,
      name: watchlist.name,
    });

    return watchlist;
  } catch (error) {
    logger.error('Failed to create watchlist', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get all watchlists for a user (with caching)
 * @param {ObjectId} userId
 * @returns {Promise<Array<Watchlist>>}
 */
const getUserWatchlists = async (userId) => {
  try {
    // Check cache first (2 minutes TTL)
    const cacheKey = `watchlists:${userId}`;
    const redis = getRedisClient();

    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Watchlists retrieved from cache', { userId });
        return JSON.parse(cachedData);
      }
    }

    const watchlists = await Watchlist.getUserWatchlists(userId);

    // Cache for 2 minutes
    if (redis) {
      await redis.setEx(cacheKey, 120, JSON.stringify(watchlists));
    }

    return watchlists;
  } catch (error) {
    logger.error('Failed to get user watchlists', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get watchlist by ID
 * @param {ObjectId} watchlistId
 * @param {ObjectId} userId - For ownership verification
 * @returns {Promise<Watchlist>}
 */
const getWatchlistById = async (watchlistId, userId) => {
  try {
    const watchlist = await Watchlist.findOne({
      _id: watchlistId,
      userId,
    });

    if (!watchlist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Watchlist not found');
    }

    return watchlist;
  } catch (error) {
    logger.error('Failed to get watchlist by ID', {
      watchlistId,
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get watchlist with live stock prices (Performance optimized)
 * @param {ObjectId} watchlistId
 * @param {ObjectId} userId
 * @returns {Promise<Object>}
 */
const getWatchlistWithPrices = async (watchlistId, userId) => {
  try {
    const watchlist = await getWatchlistById(watchlistId, userId);

    if (!watchlist.stocks || watchlist.stocks.length === 0) {
      return {
        ...watchlist.toJSON(),
        stocks: [],
      };
    }

    // Fetch live prices for all stocks in parallel
    const stocksWithPrices = await Promise.all(
      watchlist.stocks.map(async (stock) => {
        try {
          const liveData = await marketService.getLTP(stock.exchange, stock.symbolToken, stock.symbol);

          return {
            symbol: stock.symbol,
            symbolToken: stock.symbolToken,
            exchange: stock.exchange,
            companyName: stock.companyName,
            addedAt: stock.addedAt,
            ltp: liveData.ltp || stock.lastPrice || 0,
            change: liveData.change || 0,
            changePercent: liveData.changePercent || 0,
            open: liveData.open || 0,
            high: liveData.high || 0,
            low: liveData.low || 0,
            close: liveData.close || 0,
            volume: liveData.volume || 0,
          };
        } catch (error) {
          logger.warn(`Failed to fetch price for ${stock.symbol}`, error);
          return {
            symbol: stock.symbol,
            symbolToken: stock.symbolToken,
            exchange: stock.exchange,
            companyName: stock.companyName,
            addedAt: stock.addedAt,
            ltp: stock.lastPrice || 0,
            change: 0,
            changePercent: 0,
            error: 'Price unavailable',
          };
        }
      }),
    );

    return {
      _id: watchlist._id,
      name: watchlist.name,
      isDefault: watchlist.isDefault,
      sortOrder: watchlist.sortOrder,
      color: watchlist.color,
      icon: watchlist.icon,
      stockCount: stocksWithPrices.length,
      stocks: stocksWithPrices,
      createdAt: watchlist.createdAt,
      updatedAt: watchlist.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to get watchlist with prices', {
      watchlistId,
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Add stock to watchlist
 * @param {ObjectId} watchlistId
 * @param {ObjectId} userId
 * @param {Object} stockData
 * @returns {Promise<Watchlist>}
 */
const addStockToWatchlist = async (watchlistId, userId, stockData) => {
  try {
    const watchlist = await getWatchlistById(watchlistId, userId);

    // Validate stock data by fetching from market
    let validatedStock;
    try {
      const stockInfo = await stockService.getRealtimeStockPrice(
        stockData.symbol,
        stockData.exchange || 'NSE',
        stockData.symbolToken,
      );

      validatedStock = {
        symbol: stockData.symbol.toUpperCase(),
        symbolToken: stockData.symbolToken,
        exchange: stockData.exchange || 'NSE',
        companyName: stockData.companyName || stockData.symbol,
        lastPrice: stockInfo.data?.lastPrice || 0,
      };
    } catch (error) {
      logger.warn('Could not validate stock, adding anyway', error);
      validatedStock = {
        symbol: stockData.symbol.toUpperCase(),
        symbolToken: stockData.symbolToken,
        exchange: stockData.exchange || 'NSE',
        companyName: stockData.companyName || stockData.symbol,
        lastPrice: 0,
      };
    }

    watchlist.addStock(validatedStock);
    await watchlist.save();

    // Invalidate cache
    await invalidateWatchlistCache(userId);

    logger.info('Stock added to watchlist', {
      userId,
      watchlistId,
      symbol: validatedStock.symbol,
    });

    return watchlist;
  } catch (error) {
    logger.error('Failed to add stock to watchlist', {
      watchlistId,
      userId,
      stockData,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Remove stock from watchlist
 * @param {ObjectId} watchlistId
 * @param {ObjectId} userId
 * @param {string} symbol
 * @param {string} exchange
 * @returns {Promise<Watchlist>}
 */
const removeStockFromWatchlist = async (watchlistId, userId, symbol, exchange = 'NSE') => {
  try {
    const watchlist = await getWatchlistById(watchlistId, userId);
    watchlist.removeStock(symbol, exchange);
    await watchlist.save();

    // Invalidate cache
    await invalidateWatchlistCache(userId);

    logger.info('Stock removed from watchlist', {
      userId,
      watchlistId,
      symbol,
    });

    return watchlist;
  } catch (error) {
    logger.error('Failed to remove stock from watchlist', {
      watchlistId,
      userId,
      symbol,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Update watchlist details
 * @param {ObjectId} watchlistId
 * @param {ObjectId} userId
 * @param {Object} updateData
 * @returns {Promise<Watchlist>}
 */
const updateWatchlist = async (watchlistId, userId, updateData) => {
  try {
    const watchlist = await getWatchlistById(watchlistId, userId);

    // Update allowed fields
    if (updateData.name) {
      // Check if name already exists for this user
      const existing = await Watchlist.findOne({
        userId,
        name: updateData.name,
        _id: { $ne: watchlistId },
      });

      if (existing) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Watchlist "${updateData.name}" already exists`);
      }

      watchlist.name = updateData.name;
    }

    if (updateData.color) {
      watchlist.color = updateData.color;
    }

    if (updateData.icon) {
      watchlist.icon = updateData.icon;
    }

    if (updateData.sortOrder !== undefined) {
      watchlist.sortOrder = updateData.sortOrder;
    }

    // Handle default flag
    if (updateData.isDefault === true) {
      // Unset other defaults
      await Watchlist.updateMany({ userId, isDefault: true, _id: { $ne: watchlistId } }, { isDefault: false });
      watchlist.isDefault = true;
    } else if (updateData.isDefault === false && watchlist.isDefault) {
      // Cannot unset default without setting another as default
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot remove default flag. Set another watchlist as default first.');
    }

    await watchlist.save();

    // Invalidate cache
    await invalidateWatchlistCache(userId);

    logger.info('Watchlist updated', {
      userId,
      watchlistId,
      updates: Object.keys(updateData),
    });

    return watchlist;
  } catch (error) {
    logger.error('Failed to update watchlist', {
      watchlistId,
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Delete watchlist
 * @param {ObjectId} watchlistId
 * @param {ObjectId} userId
 * @returns {Promise<void>}
 */
const deleteWatchlist = async (watchlistId, userId) => {
  try {
    const watchlist = await getWatchlistById(watchlistId, userId);

    // If this is the default watchlist, prevent deletion or set another as default
    if (watchlist.isDefault) {
      const otherWatchlist = await Watchlist.findOne({
        userId,
        _id: { $ne: watchlistId },
      });

      if (otherWatchlist) {
        otherWatchlist.isDefault = true;
        await otherWatchlist.save();
      }
    }

    await Watchlist.deleteOne({ _id: watchlistId });

    // Invalidate cache
    await invalidateWatchlistCache(userId);

    logger.info('Watchlist deleted', {
      userId,
      watchlistId,
      name: watchlist.name,
    });
  } catch (error) {
    logger.error('Failed to delete watchlist', {
      watchlistId,
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Reorder stocks in a watchlist
 * @param {ObjectId} watchlistId
 * @param {ObjectId} userId
 * @param {Array<string>} newOrder - Array of symbols in new order
 * @returns {Promise<Watchlist>}
 */
const reorderStocks = async (watchlistId, userId, newOrder) => {
  try {
    const watchlist = await getWatchlistById(watchlistId, userId);
    watchlist.reorderStocks(newOrder);
    await watchlist.save();

    // Invalidate cache
    await invalidateWatchlistCache(userId);

    logger.info('Stocks reordered in watchlist', {
      userId,
      watchlistId,
    });

    return watchlist;
  } catch (error) {
    logger.error('Failed to reorder stocks', {
      watchlistId,
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Search for stock across all user watchlists
 * @param {ObjectId} userId
 * @param {string} symbol
 * @returns {Promise<Array>}
 */
const findStockInWatchlists = async (userId, symbol) => {
  try {
    return await Watchlist.findStockInWatchlists(userId, symbol);
  } catch (error) {
    logger.error('Failed to find stock in watchlists', {
      userId,
      symbol,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Invalidate watchlist cache for a user
 * @param {ObjectId} userId
 */
const invalidateWatchlistCache = async (userId) => {
  try {
    const redis = getRedisClient();
    if (redis) {
      const keys = [`watchlists:${userId}`];
      await Promise.all(keys.map((key) => redis.del(key)));
      logger.debug('Watchlist cache invalidated', { userId });
    }
  } catch (error) {
    logger.warn('Failed to invalidate watchlist cache', { userId, error: error.message });
  }
};

/**
 * Batch update prices for all stocks in user's watchlists (Background job)
 * @param {ObjectId} userId
 * @returns {Promise<number>} Number of prices updated
 */
const batchUpdateWatchlistPrices = async (userId) => {
  try {
    const watchlists = await Watchlist.find({ userId });
    let updatedCount = 0;

    for (const watchlist of watchlists) {
      if (watchlist.stocks && watchlist.stocks.length > 0) {
        for (const stock of watchlist.stocks) {
          try {
            const liveData = await marketService.getLTP(stock.exchange, stock.symbolToken, stock.symbol);

            watchlist.updateStockPrice(stock.symbol, liveData.ltp || 0, stock.exchange);
            updatedCount++;
          } catch (error) {
            logger.warn(`Failed to update price for ${stock.symbol}`, error);
          }
        }
        await watchlist.save();
      }
    }

    logger.info('Batch price update completed', { userId, updatedCount });
    return updatedCount;
  } catch (error) {
    logger.error('Batch price update failed', { userId, error: error.message });
    throw error;
  }
};

module.exports = {
  createWatchlist,
  getUserWatchlists,
  getWatchlistById,
  getWatchlistWithPrices,
  addStockToWatchlist,
  removeStockFromWatchlist,
  updateWatchlist,
  deleteWatchlist,
  reorderStocks,
  findStockInWatchlists,
  invalidateWatchlistCache,
  batchUpdateWatchlistPrices,
};
