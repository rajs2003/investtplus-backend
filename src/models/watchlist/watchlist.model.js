const mongoose = require('mongoose');
const { toJSON, paginate } = require('../plugins');

const stockItemSchema = mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  symbolToken: {
    type: String,
    required: true,
  },
  exchange: {
    type: String,
    enum: ['NSE', 'BSE', 'NFO'],
    default: 'NSE',
  },
  companyName: {
    type: String,
    trim: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  // Cache last known price for quick display
  lastPrice: {
    type: Number,
    default: 0,
  },
  lastPriceUpdateAt: {
    type: Date,
  },
});

const watchlistSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    stocks: [stockItemSchema],
    isDefault: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#3B82F6', // Blue
    },
    icon: {
      type: String,
      default: '📊',
    },
  },
  {
    timestamps: true,
  },
);

// Add plugins
watchlistSchema.plugin(toJSON);
watchlistSchema.plugin(paginate);

// Indexes for performance
watchlistSchema.index({ userId: 1, name: 1 }, { unique: true });
watchlistSchema.index({ userId: 1, isDefault: 1 });
watchlistSchema.index({ userId: 1, sortOrder: 1 });
watchlistSchema.index({ 'stocks.symbol': 1 });

// Virtual for stock count
watchlistSchema.virtual('stockCount').get(function () {
  return this.stocks ? this.stocks.length : 0;
});

// Ensure virtuals are included in JSON
watchlistSchema.set('toJSON', { virtuals: true });
watchlistSchema.set('toObject', { virtuals: true });

/**
 * Check if stock already exists in watchlist
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange
 * @returns {boolean}
 */
watchlistSchema.methods.hasStock = function (symbol, exchange = 'NSE') {
  return this.stocks.some((stock) => stock.symbol === symbol.toUpperCase() && stock.exchange === exchange);
};

/**
 * Add stock to watchlist
 * @param {Object} stockData - Stock details
 * @returns {Object} Updated watchlist
 */
watchlistSchema.methods.addStock = function (stockData) {
  // Check if stock already exists
  if (this.hasStock(stockData.symbol, stockData.exchange)) {
    throw new Error(`${stockData.symbol} is already in this watchlist`);
  }

  // Check watchlist limit (max 50 stocks per watchlist)
  if (this.stocks.length >= 50) {
    throw new Error('Watchlist limit reached. Maximum 50 stocks allowed per watchlist.');
  }

  this.stocks.push({
    symbol: stockData.symbol.toUpperCase(),
    symbolToken: stockData.symbolToken,
    exchange: stockData.exchange || 'NSE',
    companyName: stockData.companyName,
    lastPrice: stockData.lastPrice || 0,
    lastPriceUpdateAt: new Date(),
  });

  return this;
};

/**
 * Remove stock from watchlist
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange
 * @returns {Object} Updated watchlist
 */
watchlistSchema.methods.removeStock = function (symbol, exchange = 'NSE') {
  const initialLength = this.stocks.length;
  this.stocks = this.stocks.filter((stock) => !(stock.symbol === symbol.toUpperCase() && stock.exchange === exchange));

  if (this.stocks.length === initialLength) {
    throw new Error(`${symbol} not found in this watchlist`);
  }

  return this;
};

/**
 * Update stock price in watchlist (for caching)
 * @param {string} symbol - Stock symbol
 * @param {number} price - Current price
 * @param {string} exchange - Exchange
 */
watchlistSchema.methods.updateStockPrice = function (symbol, price, exchange = 'NSE') {
  const stock = this.stocks.find((s) => s.symbol === symbol.toUpperCase() && s.exchange === exchange);

  if (stock) {
    stock.lastPrice = price;
    stock.lastPriceUpdateAt = new Date();
  }

  return this;
};

/**
 * Reorder stocks in watchlist
 * @param {Array} newOrder - Array of symbols in new order
 */
watchlistSchema.methods.reorderStocks = function (newOrder) {
  const reorderedStocks = [];

  newOrder.forEach((symbol) => {
    const stock = this.stocks.find((s) => s.symbol === symbol.toUpperCase());
    if (stock) {
      reorderedStocks.push(stock);
    }
  });

  // Add any remaining stocks not in newOrder
  this.stocks.forEach((stock) => {
    if (!reorderedStocks.find((s) => s.symbol === stock.symbol)) {
      reorderedStocks.push(stock);
    }
  });

  this.stocks = reorderedStocks;
  return this;
};

/**
 * Get user's watchlists (static method)
 * @param {ObjectId} userId
 * @returns {Promise<Array>}
 */
watchlistSchema.statics.getUserWatchlists = async function (userId) {
  return this.find({ userId }).sort({ sortOrder: 1, createdAt: 1 }).lean();
};

/**
 * Get default watchlist for user
 * @param {ObjectId} userId
 * @returns {Promise<Object>}
 */
watchlistSchema.statics.getDefaultWatchlist = async function (userId) {
  return this.findOne({ userId, isDefault: true });
};

/**
 * Create default watchlist for new user
 * @param {ObjectId} userId
 * @returns {Promise<Object>}
 */
watchlistSchema.statics.createDefaultWatchlist = async function (userId) {
  // Check if default already exists
  const existing = await this.findOne({ userId, isDefault: true });
  if (existing) {
    return existing;
  }

  // Create default watchlist with popular stocks
  const defaultStocks = [
    { symbol: 'RELIANCE', symbolToken: '2885', exchange: 'NSE', companyName: 'Reliance Industries Ltd' },
    { symbol: 'TCS', symbolToken: '11536', exchange: 'NSE', companyName: 'Tata Consultancy Services Ltd' },
    { symbol: 'HDFCBANK', symbolToken: '1333', exchange: 'NSE', companyName: 'HDFC Bank Ltd' },
    { symbol: 'INFY', symbolToken: '1594', exchange: 'NSE', companyName: 'Infosys Ltd' },
    { symbol: 'ICICIBANK', symbolToken: '4963', exchange: 'NSE', companyName: 'ICICI Bank Ltd' },
  ];

  return this.create({
    userId,
    name: 'My Watchlist',
    stocks: defaultStocks,
    isDefault: true,
    sortOrder: 0,
    color: '#3B82F6',
    icon: '⭐',
  });
};

/**
 * Search stocks across all user watchlists
 * @param {ObjectId} userId
 * @param {string} symbol
 * @returns {Promise<Array>}
 */
watchlistSchema.statics.findStockInWatchlists = async function (userId, symbol) {
  return this.find({
    userId,
    'stocks.symbol': symbol.toUpperCase(),
  }).select('name stocks.$');
};

const Watchlist = mongoose.model('Watchlist', watchlistSchema);

module.exports = Watchlist;
