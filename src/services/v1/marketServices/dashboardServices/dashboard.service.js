const httpStatus = require('http-status');
const { Holding, Order, Transaction, Wallet, User } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const logger = require('../../../../config/logger');
const { getRedisClient } = require('../../../../utils/redisUtil');
const { marketService } = require('../../../../services');

/**
 * Get market overview (indices, market status)
 * @returns {Promise<Object>}
 */
const getMarketOverview = async () => {
  try {
    // Check cache first (5 minutes TTL)
    const cacheKey = 'dashboard:market-overview';
    const redis = getRedisClient();

    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Market overview retrieved from cache');
        return JSON.parse(cachedData);
      }
    }

    // Fetch major indices (NIFTY 50, SENSEX, BANK NIFTY)
    const indices = await Promise.all([
      marketService.getLTP('NSE', '99926000', 'NIFTY 50').catch(() => null), // Nifty 50
      marketService.getLTP('NSE', '99926009', 'NIFTY BANK').catch(() => null), // Bank Nifty
      marketService.getLTP('BSE', '99919000', 'SENSEX').catch(() => null), // Sensex
    ]);

    const marketOverview = {
      timestamp: new Date(),
      marketStatus: getMarketStatus(),
      indices: [
        {
          name: 'NIFTY 50',
          symbol: 'NIFTY50',
          exchange: 'NSE',
          ltp: indices[0]?.ltp || 0,
          change: indices[0]?.change || 0,
          changePercent: indices[0]?.changePercent || 0,
          open: indices[0]?.open || 0,
          high: indices[0]?.high || 0,
          low: indices[0]?.low || 0,
          previousClose: indices[0]?.close || 0,
        },
        {
          name: 'NIFTY BANK',
          symbol: 'BANKNIFTY',
          exchange: 'NSE',
          ltp: indices[1]?.ltp || 0,
          change: indices[1]?.change || 0,
          changePercent: indices[1]?.changePercent || 0,
          open: indices[1]?.open || 0,
          high: indices[1]?.high || 0,
          low: indices[1]?.low || 0,
          previousClose: indices[1]?.close || 0,
        },
        {
          name: 'SENSEX',
          symbol: 'SENSEX',
          exchange: 'BSE',
          ltp: indices[2]?.ltp || 0,
          change: indices[2]?.change || 0,
          changePercent: indices[2]?.changePercent || 0,
          open: indices[2]?.open || 0,
          high: indices[2]?.high || 0,
          low: indices[2]?.low || 0,
          previousClose: indices[2]?.close || 0,
        },
      ],
    };

    // Cache for 5 minutes
    if (redis) {
      await redis.setEx(cacheKey, 300, JSON.stringify(marketOverview));
    }

    return marketOverview;
  } catch (error) {
    logger.error('Failed to get market overview', { error: error.message });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch market overview');
  }
};

/**
 * Get popular stocks (most traded/viewed)
 * @param {number} limit - Number of stocks to return
 * @returns {Promise<Array>}
 */
const getPopularStocks = async (limit = 10) => {
  try {
    // Check cache first (10 minutes TTL)
    const cacheKey = `dashboard:popular-stocks:${limit}`;
    const redis = getRedisClient();

    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Popular stocks retrieved from cache');
        return JSON.parse(cachedData);
      }
    }

    // Get most frequently traded stocks from orders/holdings
    const popularSymbols = [
      { symbol: 'RELIANCE', symbolToken: '2885', exchange: 'NSE', companyName: 'Reliance Industries Ltd' },
      { symbol: 'TCS', symbolToken: '11536', exchange: 'NSE', companyName: 'Tata Consultancy Services Ltd' },
      { symbol: 'HDFCBANK', symbolToken: '1333', exchange: 'NSE', companyName: 'HDFC Bank Ltd' },
      { symbol: 'INFY', symbolToken: '1594', exchange: 'NSE', companyName: 'Infosys Ltd' },
      { symbol: 'ICICIBANK', symbolToken: '4963', exchange: 'NSE', companyName: 'ICICI Bank Ltd' },
      { symbol: 'HINDUNILVR', symbolToken: '1394', exchange: 'NSE', companyName: 'Hindustan Unilever Ltd' },
      { symbol: 'ITC', symbolToken: '1660', exchange: 'NSE', companyName: 'ITC Ltd' },
      { symbol: 'SBIN', symbolToken: '3045', exchange: 'NSE', companyName: 'State Bank of India' },
      { symbol: 'BHARTIARTL', symbolToken: '10604', exchange: 'NSE', companyName: 'Bharti Airtel Ltd' },
      { symbol: 'KOTAKBANK', symbolToken: '1922', exchange: 'NSE', companyName: 'Kotak Mahindra Bank Ltd' },
    ].slice(0, limit);

    // Fetch live prices in parallel
    const popularStocks = await Promise.all(
      popularSymbols.map(async (stock) => {
        try {
          const liveData = await marketService.getLTP(stock.exchange, stock.symbolToken, stock.symbol);
          return {
            symbol: stock.symbol,
            symbolToken: stock.symbolToken,
            exchange: stock.exchange,
            companyName: stock.companyName,
            ltp: liveData.ltp || 0,
            change: liveData.change || 0,
            changePercent: liveData.changePercent || 0,
            volume: liveData.volume || 0,
            high: liveData.high || 0,
            low: liveData.low || 0,
          };
        } catch (error) {
          logger.warn(`Failed to fetch price for ${stock.symbol}`, error);
          return {
            symbol: stock.symbol,
            symbolToken: stock.symbolToken,
            exchange: stock.exchange,
            companyName: stock.companyName,
            ltp: 0,
            change: 0,
            changePercent: 0,
            error: 'Price unavailable',
          };
        }
      }),
    );

    // Cache for 10 minutes
    if (redis) {
      await redis.setEx(cacheKey, 600, JSON.stringify(popularStocks));
    }

    return popularStocks;
  } catch (error) {
    logger.error('Failed to get popular stocks', { error: error.message });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch popular stocks');
  }
};

/**
 * Get top gainers
 * @param {number} limit - Number of stocks to return
 * @returns {Promise<Array>}
 */
const getTopGainers = async (limit = 10) => {
  try {
    // Check cache first (5 minutes TTL)
    const cacheKey = `dashboard:top-gainers:${limit}`;
    const redis = getRedisClient();

    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Top gainers retrieved from cache');
        return JSON.parse(cachedData);
      }
    }

    // Fetch popular stocks and sort by gain
    const stocks = await getPopularStocks(20); // Get more to filter

    // Sort by changePercent descending
    const topGainers = stocks
      .filter((stock) => stock.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, limit);

    // Cache for 5 minutes
    if (redis) {
      await redis.setEx(cacheKey, 300, JSON.stringify(topGainers));
    }

    return topGainers;
  } catch (error) {
    logger.error('Failed to get top gainers', { error: error.message });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch top gainers');
  }
};

/**
 * Get top losers
 * @param {number} limit - Number of stocks to return
 * @returns {Promise<Array>}
 */
const getTopLosers = async (limit = 10) => {
  try {
    // Check cache first (5 minutes TTL)
    const cacheKey = `dashboard:top-losers:${limit}`;
    const redis = getRedisClient();

    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Top losers retrieved from cache');
        return JSON.parse(cachedData);
      }
    }

    // Fetch popular stocks and sort by loss
    const stocks = await getPopularStocks(20); // Get more to filter

    // Sort by changePercent ascending (most negative first)
    const topLosers = stocks
      .filter((stock) => stock.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, limit);

    // Cache for 5 minutes
    if (redis) {
      await redis.setEx(cacheKey, 300, JSON.stringify(topLosers));
    }

    return topLosers;
  } catch (error) {
    logger.error('Failed to get top losers', { error: error.message });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch top losers');
  }
};

/**
 * Get sector performance
 * @returns {Promise<Array>}
 */
const getSectorPerformance = async () => {
  try {
    // Check cache first (10 minutes TTL)
    const cacheKey = 'dashboard:sector-performance';
    const redis = getRedisClient();

    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Sector performance retrieved from cache');
        return JSON.parse(cachedData);
      }
    }

    // Sector indices on NSE
    const sectorIndices = [
      { name: 'Bank', symbol: 'BANKNIFTY', token: '99926009' },
      { name: 'IT', symbol: 'NIFTYIT', token: '99926012' },
      { name: 'Pharma', symbol: 'NIFTYPHARMA', token: '99926020' },
      { name: 'Auto', symbol: 'NIFTYAUTO', token: '99926003' },
      { name: 'FMCG', symbol: 'NIFTYFMCG', token: '99926008' },
      { name: 'Metal', symbol: 'NIFTYMETAL', token: '99926015' },
      { name: 'Realty', symbol: 'NIFTYREALTY', token: '99926021' },
      { name: 'Energy', symbol: 'NIFTYENERGY', token: '99926006' },
    ];

    // Fetch sector data in parallel
    const sectorData = await Promise.all(
      sectorIndices.map(async (sector) => {
        try {
          const liveData = await marketService.getLTP('NSE', sector.token, sector.symbol);
          return {
            sector: sector.name,
            symbol: sector.symbol,
            ltp: liveData.ltp || 0,
            change: liveData.change || 0,
            changePercent: liveData.changePercent || 0,
          };
        } catch (error) {
          logger.warn(`Failed to fetch ${sector.name} sector data`, error);
          return {
            sector: sector.name,
            symbol: sector.symbol,
            ltp: 0,
            change: 0,
            changePercent: 0,
            error: 'Data unavailable',
          };
        }
      }),
    );

    // Sort by performance (descending)
    const sortedSectors = sectorData.sort((a, b) => b.changePercent - a.changePercent);

    // Cache for 10 minutes
    if (redis) {
      await redis.setEx(cacheKey, 600, JSON.stringify(sortedSectors));
    }

    return sortedSectors;
  } catch (error) {
    logger.error('Failed to get sector performance', { error: error.message });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch sector performance');
  }
};

/**
 * Get user's portfolio analytics
 * @param {ObjectId} userId
 * @returns {Promise<Object>}
 */
const getPortfolioAnalytics = async (userId) => {
  try {
    // Check cache first (2 minutes TTL)
    const cacheKey = `dashboard:portfolio-analytics:${userId}`;
    const redis = getRedisClient();

    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Portfolio analytics retrieved from cache', { userId });
        return JSON.parse(cachedData);
      }
    }

    // Fetch wallet, holdings, and orders in parallel
    const [wallet, holdings, todayOrders, totalOrders] = await Promise.all([
      Wallet.findOne({ userId }),
      Holding.find({ userId }),
      Order.countDocuments({
        userId,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      Order.countDocuments({ userId }),
    ]);

    if (!wallet) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Wallet not found');
    }

    // Calculate portfolio metrics
    let totalInvested = 0;
    let currentValue = 0;
    let totalPnL = 0;
    let dayPnL = 0;

    // Fetch live prices for all holdings
    if (holdings && holdings.length > 0) {
      const holdingsWithPrices = await Promise.all(
        holdings.map(async (holding) => {
          try {
            const liveData = await marketService.getLTP(holding.exchange, holding.symbolToken, holding.symbol);
            const currentPrice = liveData.ltp || holding.averagePrice;
            const holdingValue = holding.quantity * currentPrice;
            const invested = holding.quantity * holding.averagePrice;
            const pnl = holdingValue - invested;

            totalInvested += invested;
            currentValue += holdingValue;
            totalPnL += pnl;

            // Day's P&L calculation (simplified)
            const previousClose = liveData.close || currentPrice;
            const dayChange = (currentPrice - previousClose) * holding.quantity;
            dayPnL += dayChange;

            return {
              symbol: holding.symbol,
              quantity: holding.quantity,
              averagePrice: holding.averagePrice,
              currentPrice,
              invested,
              currentValue: holdingValue,
              pnl,
              pnlPercent: ((pnl / invested) * 100).toFixed(2),
            };
          } catch (error) {
            logger.warn(`Failed to fetch price for ${holding.symbol}`, error);
            return null;
          }
        }),
      );

      // Filter out failed fetches
      const validHoldings = holdingsWithPrices.filter((h) => h !== null);

      const analytics = {
        userId,
        timestamp: new Date(),
        wallet: {
          balance: wallet.balance,
          totalDeposits: wallet.totalDeposits || 0,
          totalWithdrawals: wallet.totalWithdrawals || 0,
        },
        portfolio: {
          totalInvested: parseFloat(totalInvested.toFixed(2)),
          currentValue: parseFloat(currentValue.toFixed(2)),
          totalPnL: parseFloat(totalPnL.toFixed(2)),
          totalPnLPercent: totalInvested > 0 ? parseFloat(((totalPnL / totalInvested) * 100).toFixed(2)) : 0,
          dayPnL: parseFloat(dayPnL.toFixed(2)),
          dayPnLPercent: currentValue > 0 ? parseFloat(((dayPnL / currentValue) * 100).toFixed(2)) : 0,
          totalValue: parseFloat((wallet.balance + currentValue).toFixed(2)),
        },
        holdings: {
          count: holdings.length,
          stocks: validHoldings,
        },
        orders: {
          today: todayOrders,
          total: totalOrders,
        },
      };

      // Cache for 2 minutes
      if (redis) {
        await redis.setEx(cacheKey, 120, JSON.stringify(analytics));
      }

      return analytics;
    }

    // No holdings case
    const analytics = {
      userId,
      timestamp: new Date(),
      wallet: {
        balance: wallet.balance,
        totalDeposits: wallet.totalDeposits || 0,
        totalWithdrawals: wallet.totalWithdrawals || 0,
      },
      portfolio: {
        totalInvested: 0,
        currentValue: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        dayPnL: 0,
        dayPnLPercent: 0,
        totalValue: wallet.balance,
      },
      holdings: {
        count: 0,
        stocks: [],
      },
      orders: {
        today: todayOrders,
        total: totalOrders,
      },
    };

    // Cache for 2 minutes
    if (redis) {
      await redis.setEx(cacheKey, 120, JSON.stringify(analytics));
    }

    return analytics;
  } catch (error) {
    logger.error('Failed to get portfolio analytics', { userId, error: error.message });
    throw error;
  }
};

/**
 * Get user activity summary
 * @param {ObjectId} userId
 * @returns {Promise<Object>}
 */
const getUserActivitySummary = async (userId) => {
  try {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfWeek = new Date(new Date().setDate(new Date().getDate() - 7));
    const startOfMonth = new Date(new Date().setDate(1));

    const [todayActivity, weekActivity, monthActivity] = await Promise.all([
      // Today's activity
      Promise.all([
        Order.countDocuments({ userId, createdAt: { $gte: startOfDay } }),
        Transaction.countDocuments({ userId, createdAt: { $gte: startOfDay } }),
      ]),
      // This week's activity
      Promise.all([
        Order.countDocuments({ userId, createdAt: { $gte: startOfWeek } }),
        Transaction.countDocuments({ userId, createdAt: { $gte: startOfWeek } }),
      ]),
      // This month's activity
      Promise.all([
        Order.countDocuments({ userId, createdAt: { $gte: startOfMonth } }),
        Transaction.countDocuments({ userId, createdAt: { $gte: startOfMonth } }),
      ]),
    ]);

    return {
      today: {
        orders: todayActivity[0],
        transactions: todayActivity[1],
      },
      thisWeek: {
        orders: weekActivity[0],
        transactions: weekActivity[1],
      },
      thisMonth: {
        orders: monthActivity[0],
        transactions: monthActivity[1],
      },
    };
  } catch (error) {
    logger.error('Failed to get user activity summary', { userId, error: error.message });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch activity summary');
  }
};

/**
 * Get platform statistics (admin)
 * @returns {Promise<Object>}
 */
const getPlatformStatistics = async () => {
  try {
    // Check cache first (10 minutes TTL)
    const cacheKey = 'dashboard:platform-stats';
    const redis = getRedisClient();

    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Platform statistics retrieved from cache');
        return JSON.parse(cachedData);
      }
    }

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));

    const [totalUsers, activeUsersToday, totalOrders, todayOrders, totalHoldings, totalTransactions] = await Promise.all([
      User.countDocuments(),
      Order.distinct('userId', { createdAt: { $gte: startOfDay } }).then((users) => users.length),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Holding.countDocuments(),
      Transaction.countDocuments(),
    ]);

    // Calculate total wallet balance
    const walletStats = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balance' },
          totalDeposits: { $sum: '$totalDeposits' },
        },
      },
    ]);

    const stats = {
      timestamp: new Date(),
      users: {
        total: totalUsers,
        activeToday: activeUsersToday,
      },
      orders: {
        total: totalOrders,
        today: todayOrders,
      },
      holdings: {
        total: totalHoldings,
      },
      transactions: {
        total: totalTransactions,
      },
      wallet: {
        totalBalance: walletStats[0]?.totalBalance || 0,
        totalDeposits: walletStats[0]?.totalDeposits || 0,
      },
    };

    // Cache for 10 minutes
    if (redis) {
      await redis.setEx(cacheKey, 600, JSON.stringify(stats));
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get platform statistics', { error: error.message });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch platform statistics');
  }
};

/**
 * Helper: Get market status
 * @returns {Object}
 */
function getMarketStatus() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time = hours * 60 + minutes; // Minutes since midnight

  // Weekend check
  if (day === 0 || day === 6) {
    return {
      status: 'CLOSED',
      message: 'Market is closed (Weekend)',
      nextOpen: 'Monday 09:15 AM',
    };
  }

  // Market timings: 9:15 AM - 3:30 PM (555 minutes - 930 minutes)
  const marketOpen = 9 * 60 + 15; // 555 minutes (9:15 AM)
  const marketClose = 15 * 60 + 30; // 930 minutes (3:30 PM)

  if (time < marketOpen) {
    return {
      status: 'PRE_OPEN',
      message: 'Market opens at 09:15 AM',
      nextOpen: 'Today 09:15 AM',
    };
  } else if (time >= marketOpen && time <= marketClose) {
    return {
      status: 'OPEN',
      message: 'Market is open',
      nextClose: 'Today 03:30 PM',
    };
  } else {
    return {
      status: 'CLOSED',
      message: 'Market is closed',
      nextOpen: 'Tomorrow 09:15 AM',
    };
  }
}

/**
 * Invalidate dashboard cache
 * @param {ObjectId} userId - Optional, to invalidate user-specific cache
 */
const invalidateDashboardCache = async (userId = null) => {
  try {
    const redis = getRedisClient();
    if (redis) {
      const keys = [
        'dashboard:market-overview',
        'dashboard:popular-stocks:*',
        'dashboard:top-gainers:*',
        'dashboard:top-losers:*',
        'dashboard:sector-performance',
        'dashboard:platform-stats',
      ];

      if (userId) {
        keys.push(`dashboard:portfolio-analytics:${userId}`);
      }

      // Delete all matching keys
      for (const key of keys) {
        if (key.includes('*')) {
          const matchingKeys = await redis.keys(key);
          if (matchingKeys.length > 0) {
            await redis.del(...matchingKeys);
          }
        } else {
          await redis.del(key);
        }
      }

      logger.debug('Dashboard cache invalidated', { userId });
    }
  } catch (error) {
    logger.warn('Failed to invalidate dashboard cache', { userId, error: error.message });
  }
};

module.exports = {
  getMarketOverview,
  getPopularStocks,
  getTopGainers,
  getTopLosers,
  getSectorPerformance,
  getPortfolioAnalytics,
  getUserActivitySummary,
  getPlatformStatistics,
  invalidateDashboardCache,
};
