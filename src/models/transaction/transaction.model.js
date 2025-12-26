const mongoose = require('mongoose');
const { toJSON, paginate } = require('../plugins');

const transactionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    walletId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      enum: [
        'initial_deposit',
        'bonus',
        'stock_buy',
        'stock_sell',
        'charges',
        'refund',
        'order_cancelled',
        'profit_realized',
        'loss_realized',
        'admin_credit',
        'admin_debit',
      ],
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Order',
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Add plugins
transactionSchema.plugin(toJSON);
transactionSchema.plugin(paginate);

// Compound index for user transactions with date
transactionSchema.index({ userId: 1, createdAt: -1 });

// Index for wallet transactions
transactionSchema.index({ walletId: 1, createdAt: -1 });

// Index for order-related transactions
transactionSchema.index({ orderId: 1 });

// Static method to get transaction summary
transactionSchema.statics.getTransactionSummary = async function (userId, startDate, endDate) {
  const match = { userId: new mongoose.Types.ObjectId(userId) };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const summary = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = summary.reduce((acc, item) => {
    acc[item._id] = {
      totalAmount: item.totalAmount,
      count: item.count,
    };
    return acc;
  }, {});

  // Ensure both credit and debit keys exist even if no transactions
  return {
    credit: result.credit || { totalAmount: 0, count: 0 },
    debit: result.debit || { totalAmount: 0, count: 0 },
  };
};

/**
 * @typedef Transaction
 */
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
