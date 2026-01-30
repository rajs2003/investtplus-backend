/**
 * Mock Market Data Service
 * Generates realistic market data based on config
 */

const stocksData = require('../../../data/stocks.json');
const marketConfig = require('../../../config/market.config');
const logger = require('../../../config/logger');

// In-memory storage for current prices and market state
const marketState = {
  prices: new Map(),
  marketDepth: new Map(),
  lastUpdate: new Map(),
  dailyData: new Map(),
};

/**
 * Initialize market with base prices
 */
const initializeMarket = () => {
  // Initialize stocks
  stocksData.stocks.forEach((stock) => {
    const key = `${stock.exchange}:${stock.symbol}`;
    marketState.prices.set(key, {
      symbol: stock.symbol,
      symbolToken: stock.symbolToken,
      exchange: stock.exchange,
      companyName: stock.companyName,
      ltp: stock.basePrice,
      open: stock.basePrice,
      high: stock.basePrice * 1.02,
      low: stock.basePrice * 0.98,
      close: stock.basePrice,
      previousClose: stock.basePrice,
      volume: Math.floor(Math.random() * 10000000),
      change: 0,
      changePercent: 0,
      lastUpdateTime: new Date(),
    });
  });

  // Initialize indices
  stocksData.indices.forEach((index) => {
    const key = `${index.exchange}:${index.symbol}`;
    marketState.prices.set(key, {
      symbol: index.symbol,
      symbolToken: index.symbolToken,
      exchange: index.exchange,
      name: index.name,
      ltp: index.basePrice,
      open: index.basePrice,
      high: index.basePrice * 1.01,
      low: index.basePrice * 0.99,
      close: index.basePrice,
      previousClose: index.basePrice,
      change: 0,
      changePercent: 0,
      lastUpdateTime: new Date(),
    });
  });

  logger.info('Market initialized with base prices');
};

/**
 * Check if market is currently open
 */
const isMarketOpen = () => {
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: marketConfig.marketHours.timezone,
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentDay = now.getDay();
  const currentDate = now.toISOString().split('T')[0];

  // Check if it's a trading day
  if (!marketConfig.tradingDays.includes(currentDay)) {
    return false;
  }

  // Check if it's a holiday
  if (marketConfig.holidays.includes(currentDate)) {
    return false;
  }

  // Check market hours
  const marketStart = marketConfig.marketHours.regular.start;
  const marketEnd = marketConfig.marketHours.regular.end;

  return currentTime >= marketStart && currentTime <= marketEnd;
};

/**
 * Get market status
 */
const getMarketStatus = () => {
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: marketConfig.marketHours.timezone,
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentDay = now.getDay();
  const currentDate = now.toISOString().split('T')[0];

  // Check if it's a trading day
  if (!marketConfig.tradingDays.includes(currentDay)) {
    return { status: 'CLOSED', reason: 'Weekend' };
  }

  // Check if it's a holiday
  if (marketConfig.holidays.includes(currentDate)) {
    return { status: 'CLOSED', reason: 'Market Holiday' };
  }

  // Check market session
  if (currentTime >= marketConfig.marketHours.preOpen.start && currentTime < marketConfig.marketHours.preOpen.end) {
    return { status: 'PRE_OPEN', reason: 'Pre-market session' };
  }

  if (currentTime >= marketConfig.marketHours.regular.start && currentTime <= marketConfig.marketHours.regular.end) {
    return { status: 'OPEN', reason: 'Market is open' };
  }

  if (currentTime > marketConfig.marketHours.regular.end && currentTime <= marketConfig.marketHours.postClose.end) {
    return { status: 'POST_CLOSE', reason: 'Post-market session' };
  }

  return { status: 'CLOSED', reason: 'Market hours ended' };
};

/**
 * Generate realistic price movement
 */
const generatePriceMovement = (currentPrice) => {
  const { movementProbability, maxPriceChangePerTick } = marketConfig.priceSimulation;

  // Random chance of price movement
  if (Math.random() > movementProbability) {
    return currentPrice;
  }

  // Generate random price change within limits
  const changePercent = (Math.random() - 0.5) * 2 * maxPriceChangePerTick;
  const priceChange = currentPrice * changePercent;

  return currentPrice + priceChange;
};

/**
 * Update market prices (called periodically)
 */
const updateMarketPrices = () => {
  if (!isMarketOpen()) {
    return;
  }

  marketState.prices.forEach((priceData, key) => {
    const newPrice = generatePriceMovement(priceData.ltp);

    // Update high and low
    const high = Math.max(priceData.high, newPrice);
    const low = Math.min(priceData.low, newPrice);

    // Calculate change
    const change = newPrice - priceData.previousClose;
    const changePercent = (change / priceData.previousClose) * 100;

    // Update volume
    const volumeIncrease = Math.floor(Math.random() * 100000);

    marketState.prices.set(key, {
      ...priceData,
      ltp: parseFloat(newPrice.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: priceData.volume + volumeIncrease,
      lastUpdateTime: new Date(),
    });
  });
};

/**
 * Generate market depth (bid/ask levels)
 */
const generateMarketDepth = (symbol, exchange, currentPrice) => {
  const { levels, spreadPercentage, volumeRange } = marketConfig.marketDepth;
  const spread = currentPrice * spreadPercentage;

  const bids = [];
  const asks = [];

  for (let i = 0; i < levels; i++) {
    const bidPrice = currentPrice - spread * (i + 1);
    const askPrice = currentPrice + spread * (i + 1);

    bids.push({
      price: parseFloat(bidPrice.toFixed(2)),
      quantity: Math.floor(Math.random() * (volumeRange.max - volumeRange.min) + volumeRange.min),
      orders: Math.floor(Math.random() * 50) + 1,
    });

    asks.push({
      price: parseFloat(askPrice.toFixed(2)),
      quantity: Math.floor(Math.random() * (volumeRange.max - volumeRange.min) + volumeRange.min),
      orders: Math.floor(Math.random() * 50) + 1,
    });
  }

  return {
    symbol,
    exchange,
    bids,
    asks,
    timestamp: new Date(),
  };
};

/**
 * Get current price for a symbol
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange (NSE/BSE)
 * @returns {Object} Current price data
 */
const getCurrentPrice = (symbol, exchange = 'NSE') => {
  const key = `${exchange}:${symbol}`;
  const priceData = marketState.prices.get(key);

  if (!priceData) {
    throw new Error(`Stock not found: ${symbol} on ${exchange}`);
  }

  return {
    success: true,
    data: priceData,
  };
};

/**
 * Get LTP (Last Traded Price)
 */
const getLTP = (exchange, symbolToken, symbol) => {
  const key = `${exchange}:${symbol}`;
  const priceData = marketState.prices.get(key);

  if (!priceData) {
    throw new Error(`Stock not found: ${symbol} on ${exchange}`);
  }

  return priceData;
};

/**
 * Get market depth for a symbol
 */
const getMarketDepth = (symbol, exchange = 'NSE') => {
  const priceData = getCurrentPrice(symbol, exchange);
  if (!priceData.success) {
    throw new Error(`Stock not found: ${symbol} on ${exchange}`);
  }

  const depth = generateMarketDepth(symbol, exchange, priceData.data.ltp);
  return {
    success: true,
    data: depth,
  };
};

/**
 * Search stocks by symbol or company name
 */
const searchStocks = (query, limit = 10) => {
  const searchQuery = query.toLowerCase();

  const results = stocksData.stocks
    .filter(
      (stock) => stock.symbol.toLowerCase().includes(searchQuery) || stock.companyName.toLowerCase().includes(searchQuery),
    )
    .slice(0, limit)
    .map((stock) => {
      const priceData = getCurrentPrice(stock.symbol, stock.exchange);
      return {
        symbol: stock.symbol,
        symbolToken: stock.symbolToken,
        exchange: stock.exchange,
        companyName: stock.companyName,
        sector: stock.sector,
        ...priceData.data,
      };
    });

  return {
    success: true,
    data: results,
    count: results.length,
  };
};

/**
 * Get all stocks with current prices
 */
const getAllStocks = () => {
  const stocks = stocksData.stocks.map((stock) => {
    const key = `${stock.exchange}:${stock.symbol}`;
    const priceData = marketState.prices.get(key);

    return {
      symbol: stock.symbol,
      symbolToken: stock.symbolToken,
      exchange: stock.exchange,
      companyName: stock.companyName,
      sector: stock.sector,
      ...priceData,
    };
  });

  return {
    success: true,
    data: stocks,
  };
};

/**
 * Get popular stocks
 */
const getPopularStocks = () => {
  const popular = marketConfig.popularStocks
    .map((symbol) => {
      try {
        const stock = stocksData.stocks.find((s) => s.symbol === symbol);
        if (!stock) return null;

        const priceData = getCurrentPrice(symbol, stock.exchange);
        return {
          symbol: stock.symbol,
          symbolToken: stock.symbolToken,
          exchange: stock.exchange,
          companyName: stock.companyName,
          sector: stock.sector,
          ...priceData.data,
        };
      } catch {
        return null;
      }
    })
    .filter((stock) => stock !== null);

  return {
    success: true,
    data: popular,
  };
};

/**
 * Get indices data
 */
const getIndices = () => {
  const indices = stocksData.indices.map((index) => {
    const key = `${index.exchange}:${index.symbol}`;
    const priceData = marketState.prices.get(key);

    return {
      ...index,
      ...priceData,
    };
  });

  return {
    success: true,
    data: indices,
  };
};

// Initialize market on module load
initializeMarket();

// Start price update interval
setInterval(updateMarketPrices, marketConfig.priceSimulation.updateInterval);

module.exports = {
  isMarketOpen,
  getMarketStatus,
  getCurrentPrice,
  getLTP,
  getMarketDepth,
  searchStocks,
  getAllStocks,
  getPopularStocks,
  getIndices,
  updateMarketPrices,
  marketState,
};
