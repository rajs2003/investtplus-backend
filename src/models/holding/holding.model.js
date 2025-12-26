const mongoose = require('mongoose');
const { toJSON, paginate } = require('../plugins');

const holdingSchema = mongoose.Schema(
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
    holdingType: {
      type: String,
      enum: ['intraday', 'delivery'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    averageBuyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalInvestment: {
      type: Number,
      required: true,
      min: 0,
    },
    currentPrice: {
      type: Number,
      default: 0,
    },
    currentValue: {
      type: Number,
      default: 0,
    },
    unrealizedPL: {
      type: Number,
      default: 0,
    },
    unrealizedPLPercentage: {
      type: Number,
      default: 0,
    },
    // Related order IDs for tracking
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    // Auto square-off time for intraday positions (3:20 PM)
    autoSquareOffTime: {
      type: Date,
    },
    isSquaredOff: {
      type: Boolean,
      default: false,
    },
    squareOffOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
  },
  {
    timestamps: true,
  },
);

// Add plugins
holdingSchema.plugin(toJSON);
holdingSchema.plugin(paginate);

// Indexes for performance
holdingSchema.index({ userId: 1, symbol: 1, holdingType: 1 });
holdingSchema.index({ userId: 1, holdingType: 1 });
holdingSchema.index({ userId: 1, isSquaredOff: 1 });
holdingSchema.index({ holdingType: 1, autoSquareOffTime: 1 });

// Virtual for determining if position is profitable
holdingSchema.virtual('isProfit').get(function () {
  return this.unrealizedPL > 0;
});

// Virtual for determining if position is in loss
holdingSchema.virtual('isLoss').get(function () {
  return this.unrealizedPL < 0;
});

/**
 * Update current price and recalculate P&L
 * @param {number} price - Current market price
 */
holdingSchema.methods.updateCurrentPrice = function (price) {
  this.currentPrice = price;
  this.currentValue = this.quantity * price;
  this.unrealizedPL = this.currentValue - this.totalInvestment;
  this.unrealizedPLPercentage = this.totalInvestment > 0 ? (this.unrealizedPL / this.totalInvestment) * 100 : 0;
  return this;
};

/**
 * Add more quantity to existing holding (averaging)
 * @param {number} quantity - Additional quantity
 * @param {number} price - Buy price
 */
holdingSchema.methods.addQuantity = function (quantity, price, orderId) {
  const newTotalInvestment = this.totalInvestment + quantity * price;
  const newTotalQuantity = this.quantity + quantity;
  this.averageBuyPrice = newTotalInvestment / newTotalQuantity;
  this.quantity = newTotalQuantity;
  this.totalInvestment = newTotalInvestment;

  if (orderId) {
    this.orderIds.push(orderId);
  }

  // Recalculate P&L with current price
  if (this.currentPrice > 0) {
    this.updateCurrentPrice(this.currentPrice);
  }

  return this;
};

/**
 * Reduce quantity (for partial sell)
 * @param {number} quantity - Quantity to reduce
 * @returns {Object} - Realized P&L details
 */
holdingSchema.methods.reduceQuantity = function (quantity, sellPrice) {
  if (quantity > this.quantity) {
    throw new Error('Cannot sell more than available quantity');
  }

  // Calculate realized P&L for sold quantity
  const soldInvestment = quantity * this.averageBuyPrice;
  const soldValue = quantity * sellPrice;
  const realizedPL = soldValue - soldInvestment;
  const realizedPLPercentage = soldInvestment > 0 ? (realizedPL / soldInvestment) * 100 : 0;

  // Update holding
  this.quantity -= quantity;
  this.totalInvestment -= soldInvestment;

  // Recalculate unrealized P&L for remaining quantity
  if (this.quantity > 0 && this.currentPrice > 0) {
    this.updateCurrentPrice(this.currentPrice);
  } else {
    this.currentValue = 0;
    this.unrealizedPL = 0;
    this.unrealizedPLPercentage = 0;
  }

  return {
    soldQuantity: quantity,
    soldInvestment,
    soldValue,
    realizedPL,
    realizedPLPercentage,
    averageBuyPrice: this.averageBuyPrice,
    sellPrice,
  };
};

/**
 * Mark holding as squared off (intraday auto square-off)
 */
holdingSchema.methods.markAsSquaredOff = function (orderId) {
  this.isSquaredOff = true;
  this.squareOffOrderId = orderId;
  return this;
};

/**
 * Get all active holdings for a user
 * @param {ObjectId} userId - User ID
 * @param {string} holdingType - 'intraday' or 'delivery' (optional)
 */
holdingSchema.statics.getActiveHoldings = async function (userId, holdingType = null) {
  const filter = {
    userId,
    quantity: { $gt: 0 },
  };

  if (holdingType) {
    filter.holdingType = holdingType;
  }

  return this.find(filter).sort({ createdAt: -1 });
};

/**
 * Get holdings pending square-off (intraday positions)
 */
holdingSchema.statics.getPendingSquareOffs = async function () {
  const now = new Date();
  return this.find({
    holdingType: 'intraday',
    quantity: { $gt: 0 },
    isSquaredOff: false,
    autoSquareOffTime: { $lte: now },
  });
};

/**
 * Get total portfolio value for a user
 * @param {ObjectId} userId - User ID
 */
holdingSchema.statics.getPortfolioValue = async function (userId) {
  const holdings = await this.getActiveHoldings(userId);

  const totalInvestment = holdings.reduce((sum, holding) => sum + holding.totalInvestment, 0);
  const totalCurrentValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalUnrealizedPL = totalCurrentValue - totalInvestment;
  const totalUnrealizedPLPercentage = totalInvestment > 0 ? (totalUnrealizedPL / totalInvestment) * 100 : 0;

  return {
    totalInvestment,
    totalCurrentValue,
    totalUnrealizedPL,
    totalUnrealizedPLPercentage,
    holdingsCount: holdings.length,
  };
};

/**
 * Find or create holding
 * @param {Object} holdingData - Holding data
 */
holdingSchema.statics.findOrCreate = async function (holdingData) {
  const existing = await this.findOne({
    userId: holdingData.userId,
    symbol: holdingData.symbol,
    holdingType: holdingData.holdingType,
    quantity: { $gt: 0 },
  });

  if (existing) {
    return { holding: existing, isNew: false };
  }

  const holding = await this.create(holdingData);
  return { holding, isNew: true };
};

const Holding = mongoose.model('Holding', holdingSchema);

module.exports = Holding;
