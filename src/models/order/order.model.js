const mongoose = require('mongoose');
const { toJSON, paginate } = require('../plugins');

const orderSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Stock Details
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    exchange: {
      type: String,
      required: true,
      enum: ['NSE', 'BSE'],
      default: 'NSE',
    },
    tradingSymbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    symbolToken: {
      type: String,
      trim: true,
    },

    // Order Configuration
    orderType: {
      type: String,
      required: true,
      enum: ['intraday', 'delivery'],
      default: 'intraday',
    },
    orderVariant: {
      type: String,
      required: true,
      enum: ['market', 'limit', 'sl', 'slm'],
      default: 'market',
    },
    transactionType: {
      type: String,
      required: true,
      enum: ['buy', 'sell'],
    },

    // Quantity & Price
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    triggerPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Order Status
    status: {
      type: String,
      required: true,
      enum: ['pending', 'executed', 'cancelled', 'rejected', 'expired', 'partial'],
      default: 'pending',
      index: true,
    },

    // Execution Details
    executedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    executedPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    executedAt: {
      type: Date,
    },

    // Financial Details
    orderValue: {
      type: Number,
      required: true,
      default: 0,
    },

    // Charges Breakdown
    brokerage: {
      type: Number,
      default: 0,
      min: 0,
    },
    stt: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactionCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    gst: {
      type: Number,
      default: 0,
      min: 0,
    },
    sebiCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    stampDuty: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    reservedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Metadata
    rejectionReason: {
      type: String,
      trim: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    expiredAt: {
      type: Date,
    },

    // Additional Info
    description: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.SchemaTypes.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Plugins
orderSchema.plugin(toJSON);
orderSchema.plugin(paginate);

// Compound Indexes for Performance
orderSchema.index({ userId: 1, createdAt: -1 }); // User's order history
orderSchema.index({ userId: 1, status: 1 }); // Filter by status
orderSchema.index({ symbol: 1, status: 1 }); // Symbol-wise orders
orderSchema.index({ status: 1, createdAt: 1 }); // Pending orders processing
orderSchema.index({ userId: 1, orderType: 1 }); // Intraday/Delivery filter
orderSchema.index({ createdAt: -1 }); // Recent orders

// Virtual Fields
orderSchema.virtual('isExecuted').get(function () {
  return this.status === 'executed';
});

orderSchema.virtual('isPending').get(function () {
  return this.status === 'pending';
});

orderSchema.virtual('isCancelled').get(function () {
  return this.status === 'cancelled';
});

orderSchema.virtual('executionPercentage').get(function () {
  if (this.quantity === 0) return 0;
  return (this.executedQuantity / this.quantity) * 100;
});

// Instance Methods
orderSchema.methods.markAsExecuted = function (executedPrice, executedQuantity = null) {
  this.status = 'executed';
  this.executedPrice = executedPrice;
  this.executedQuantity = executedQuantity || this.quantity;
  this.executedAt = new Date();
  return this;
};

orderSchema.methods.markAsCancelled = function (reason) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  return this;
};

orderSchema.methods.markAsRejected = function (reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  return this;
};

orderSchema.methods.markAsExpired = function () {
  this.status = 'expired';
  this.expiredAt = new Date();
  return this;
};

// Static Methods
orderSchema.statics.getPendingOrders = function (userId = null) {
  const query = { status: 'pending' };
  if (userId) {
    query.userId = userId;
  }
  return this.find(query).sort({ createdAt: 1 });
};

orderSchema.statics.getExecutedOrders = function (userId, startDate = null, endDate = null) {
  const query = { userId, status: 'executed' };

  if (startDate || endDate) {
    query.executedAt = {};
    if (startDate) query.executedAt.$gte = new Date(startDate);
    if (endDate) query.executedAt.$lte = new Date(endDate);
  }

  return this.find(query).sort({ executedAt: -1 });
};

orderSchema.statics.getOrdersBySymbol = function (userId, symbol) {
  return this.find({ userId, symbol }).sort({ createdAt: -1 });
};

orderSchema.statics.getTodayOrders = function (userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    userId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ createdAt: -1 });
};

// Pre-save Hooks
orderSchema.pre('save', function (next) {
  // Calculate order value if not set
  if (!this.orderValue) {
    const priceToUse = this.price || this.executedPrice || 0;
    this.orderValue = this.quantity * priceToUse;
  }

  // Calculate net amount if not set
  if (!this.netAmount) {
    this.netAmount = this.orderValue + this.totalCharges;
  }

  next();
});

/**
 * @typedef Order
 */
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
