const mongoose = require('mongoose');
const { toJSON, paginate } = require('../plugins');

const positionSchema = mongoose.Schema(
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
    positionType: {
      type: String,
      enum: ['intraday', 'delivery'],
      required: true,
    },
    // Positive = Long position (bought first)
    // Negative = Short position (sold first, need to buy back)
    quantity: {
      type: Number,
      required: true,
    },
    averagePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalValue: {
      type: Number,
      required: true,
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
    // For intraday: Auto square-off time (3:20 PM)
    // For delivery: Expiry time (24 hours from creation)
    expiresAt: {
      type: Date,
      required: true,
    },
    isSquaredOff: {
      type: Boolean,
      default: false,
    },
    squareOffOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    // For delivery positions, track if converted to holding
    convertedToHolding: {
      type: Boolean,
      default: false,
    },
    holdingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Holding',
    },
  },
  {
    timestamps: true,
  },
);

// Add plugins
positionSchema.plugin(toJSON);
positionSchema.plugin(paginate);

// Indexes for performance
positionSchema.index({ userId: 1, symbol: 1, positionType: 1 });
positionSchema.index({ userId: 1, positionType: 1 });
positionSchema.index({ userId: 1, isSquaredOff: 1 });
positionSchema.index({ positionType: 1, expiresAt: 1 });
positionSchema.index({ expiresAt: 1, convertedToHolding: 1 });

/**
 * Update position with current market price and calculate P&L
 * @param {number} currentPrice - Current market price
 */
positionSchema.methods.updatePrice = function (currentPrice) {
  this.currentPrice = currentPrice;

  if (this.quantity > 0) {
    // Long position
    this.currentValue = this.quantity * currentPrice;
    this.unrealizedPL = this.currentValue - this.totalValue;
  } else {
    // Short position (negative quantity)
    this.currentValue = Math.abs(this.quantity) * currentPrice;
    this.unrealizedPL = this.totalValue - this.currentValue;
  }

  this.unrealizedPLPercentage = this.totalValue !== 0 ? (this.unrealizedPL / Math.abs(this.totalValue)) * 100 : 0;
};

/**
 * Add quantity to position (for additional buy/sell)
 * @param {number} quantity - Quantity to add (positive for buy, negative for sell)
 * @param {number} price - Execution price
 * @param {ObjectId} orderId - Order ID
 */
positionSchema.methods.addQuantity = function (quantity, price, orderId) {
  const newTotalValue = this.totalValue + quantity * price;
  const newQuantity = this.quantity + quantity;

  if (newQuantity !== 0) {
    this.averagePrice = Math.abs(newTotalValue / newQuantity);
  }

  this.quantity = newQuantity;
  this.totalValue = Math.abs(newTotalValue);

  if (orderId) {
    this.orderIds.push(orderId);
  }

  this.updatePrice(this.currentPrice || price);
};

/**
 * Mark position as squared off
 * @param {ObjectId} orderId - Square-off order ID
 */
positionSchema.methods.markAsSquaredOff = function (orderId) {
  this.isSquaredOff = true;
  this.quantity = 0;
  this.squareOffOrderId = orderId;
};

/**
 * Check if position is expired
 * @returns {boolean}
 */
positionSchema.methods.isExpired = function () {
  return new Date() >= this.expiresAt;
};

/**
 * Static method: Get active positions for user
 * @param {ObjectId} userId - User ID
 * @param {string} positionType - Position type (optional)
 * @returns {Promise<Array>}
 */
positionSchema.statics.getActivePositions = async function (userId, positionType = null) {
  const query = {
    userId,
    isSquaredOff: false,
    quantity: { $ne: 0 },
  };

  if (positionType) {
    query.positionType = positionType;
  }

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method: Get expired positions that need conversion
 * @returns {Promise<Array>}
 */
positionSchema.statics.getExpiredPositions = async function () {
  return this.find({
    expiresAt: { $lte: new Date() },
    isSquaredOff: false,
    convertedToHolding: false,
    positionType: 'delivery',
    quantity: { $ne: 0 },
  });
};

/**
 * Static method: Get intraday positions for auto square-off
 * @returns {Promise<Array>}
 */
positionSchema.statics.getIntradayPositionsForSquareOff = async function () {
  return this.find({
    positionType: 'intraday',
    isSquaredOff: false,
    expiresAt: { $lte: new Date() },
    quantity: { $ne: 0 },
  });
};

const Position = mongoose.model('Position', positionSchema);

module.exports = Position;
