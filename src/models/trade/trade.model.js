const mongoose = require('mongoose');
const { toJSON, paginate } = require('../plugins');

const tradeSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    holdingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Holding',
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    exchange: {
      type: String,
      enum: ['NSE', 'BSE', 'NFO'],
      default: 'NSE',
    },
    tradeType: {
      type: String,
      enum: ['intraday', 'delivery'],
      required: true,
    },
    // Buy order details
    buyOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    buyQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    buyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    buyValue: {
      type: Number,
      required: true,
    },
    buyCharges: {
      type: Number,
      default: 0,
    },
    buyDate: {
      type: Date,
      required: true,
    },
    // Sell order details
    sellOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    sellQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    sellPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellValue: {
      type: Number,
      required: true,
    },
    sellCharges: {
      type: Number,
      default: 0,
    },
    sellDate: {
      type: Date,
      required: true,
    },
    // P&L calculations
    totalCharges: {
      type: Number,
      required: true,
      default: 0,
    },
    grossPL: {
      type: Number,
      required: true,
    },
    netPL: {
      type: Number,
      required: true,
    },
    plPercentage: {
      type: Number,
      required: true,
    },
    // Trade status
    isProfit: {
      type: Boolean,
      required: true,
    },
    isAutoSquareOff: {
      type: Boolean,
      default: false,
    },
    // Duration
    holdingDuration: {
      type: Number, // in minutes
    },
  },
  {
    timestamps: true,
  },
);

// Add plugins
tradeSchema.plugin(toJSON);
tradeSchema.plugin(paginate);

// Indexes
tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ userId: 1, symbol: 1 });
tradeSchema.index({ userId: 1, tradeType: 1 });
tradeSchema.index({ userId: 1, isProfit: 1 });
tradeSchema.index({ sellDate: -1 });

/**
 * Calculate holding duration in minutes
 */
tradeSchema.pre('save', function (next) {
  if (this.buyDate && this.sellDate) {
    const durationMs = this.sellDate - this.buyDate;
    this.holdingDuration = Math.floor(durationMs / (1000 * 60)); // Convert to minutes
  }
  next();
});

/**
 * Get trades for a user with filters
 * @param {ObjectId} userId
 * @param {Object} filter - { symbol, tradeType, startDate, endDate }
 * @param {Object} options - Pagination options
 */
tradeSchema.statics.getUserTrades = async function (userId, filter = {}, options = {}) {
  const query = { userId };

  if (filter.symbol) {
    query.symbol = filter.symbol.toUpperCase();
  }

  if (filter.tradeType) {
    query.tradeType = filter.tradeType;
  }

  if (filter.startDate || filter.endDate) {
    query.sellDate = {};
    if (filter.startDate) {
      query.sellDate.$gte = new Date(filter.startDate);
    }
    if (filter.endDate) {
      query.sellDate.$lte = new Date(filter.endDate);
    }
  }

  if (filter.isProfit !== undefined) {
    query.isProfit = filter.isProfit;
  }

  return this.paginate(query, {
    ...options,
    sort: options.sortBy || '-sellDate',
    populate: [
      { path: 'buyOrderId', select: 'orderVariant createdAt' },
      { path: 'sellOrderId', select: 'orderVariant createdAt' },
    ],
  });
};

/**
 * Get trade statistics for a user
 * @param {ObjectId} userId
 * @param {Object} filter - { startDate, endDate, tradeType }
 */
tradeSchema.statics.getTradeStats = async function (userId, filter = {}) {
  const query = { userId };

  if (filter.tradeType) {
    query.tradeType = filter.tradeType;
  }

  if (filter.startDate || filter.endDate) {
    query.sellDate = {};
    if (filter.startDate) {
      query.sellDate.$gte = new Date(filter.startDate);
    }
    if (filter.endDate) {
      query.sellDate.$lte = new Date(filter.endDate);
    }
  }

  const trades = await this.find(query);

  const stats = {
    totalTrades: trades.length,
    profitableTrades: 0,
    losingTrades: 0,
    totalGrossPL: 0,
    totalNetPL: 0,
    totalCharges: 0,
    avgPLPerTrade: 0,
    winRate: 0,
    bestTrade: null,
    worstTrade: null,
  };

  if (trades.length === 0) {
    return stats;
  }

  let bestPL = -Infinity;
  let worstPL = Infinity;

  trades.forEach((trade) => {
    stats.totalGrossPL += trade.grossPL;
    stats.totalNetPL += trade.netPL;
    stats.totalCharges += trade.totalCharges;

    if (trade.isProfit) {
      stats.profitableTrades++;
    } else {
      stats.losingTrades++;
    }

    if (trade.netPL > bestPL) {
      bestPL = trade.netPL;
      stats.bestTrade = {
        symbol: trade.symbol,
        netPL: trade.netPL,
        plPercentage: trade.plPercentage,
        sellDate: trade.sellDate,
      };
    }

    if (trade.netPL < worstPL) {
      worstPL = trade.netPL;
      stats.worstTrade = {
        symbol: trade.symbol,
        netPL: trade.netPL,
        plPercentage: trade.plPercentage,
        sellDate: trade.sellDate,
      };
    }
  });

  stats.avgPLPerTrade = stats.totalNetPL / trades.length;
  stats.winRate = (stats.profitableTrades / stats.totalTrades) * 100;

  return stats;
};

/**
 * Get today's trades
 * @param {ObjectId} userId
 */
tradeSchema.statics.getTodayTrades = async function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    userId,
    sellDate: {
      $gte: today,
      $lt: tomorrow,
    },
  }).sort({ sellDate: -1 });
};

/**
 * Create trade record from order execution
 * @param {Object} tradeData - Trade data
 */
tradeSchema.statics.createFromOrders = async function (tradeData) {
  const { userId, walletId, holdingId, symbol, exchange, tradeType, buyOrder, sellOrder, quantity, isAutoSquareOff } =
    tradeData;

  const buyValue = quantity * buyOrder.executedPrice;
  const sellValue = quantity * sellOrder.executedPrice;
  const totalCharges = (buyOrder.totalCharges || 0) + (sellOrder.totalCharges || 0);
  const grossPL = sellValue - buyValue;
  const netPL = grossPL - totalCharges;
  const plPercentage = buyValue > 0 ? (netPL / buyValue) * 100 : 0;

  const trade = await this.create({
    userId,
    walletId,
    holdingId,
    symbol,
    exchange: exchange || 'NSE',
    tradeType,
    // Buy details
    buyOrderId: buyOrder._id,
    buyQuantity: quantity,
    buyPrice: buyOrder.executedPrice,
    buyValue,
    buyCharges: buyOrder.totalCharges || 0,
    buyDate: buyOrder.executedAt || buyOrder.createdAt,
    // Sell details
    sellOrderId: sellOrder._id,
    sellQuantity: quantity,
    sellPrice: sellOrder.executedPrice,
    sellValue,
    sellCharges: sellOrder.totalCharges || 0,
    sellDate: sellOrder.executedAt || sellOrder.createdAt,
    // P&L
    totalCharges,
    grossPL,
    netPL,
    plPercentage,
    isProfit: netPL > 0,
    isAutoSquareOff: isAutoSquareOff || false,
  });

  return trade;
};

const Trade = mongoose.model('Trade', tradeSchema);

module.exports = Trade;
