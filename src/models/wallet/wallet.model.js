const mongoose = require('mongoose');
const { toJSON, paginate } = require('../plugins');

const walletSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lockedAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    availableBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    initialBalance: {
      type: Number,
      required: true,
      default: 1000000, // ₹10,00,000
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    totalLoss: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Add plugins
walletSchema.plugin(toJSON);
walletSchema.plugin(paginate);

// Virtual for net P&L
walletSchema.virtual('netPL').get(function () {
  return this.totalProfit - this.totalLoss;
});

// Virtual for portfolio return percentage
walletSchema.virtual('returnPercentage').get(function () {
  if (this.initialBalance === 0) return 0;
  return ((this.balance - this.initialBalance) / this.initialBalance) * 100;
});

// Method to update available balance
walletSchema.methods.updateAvailableBalance = function () {
  this.availableBalance = this.balance - this.lockedAmount;
  return this.availableBalance;
};

// Method to check if sufficient balance
walletSchema.methods.hasSufficientBalance = function (amount) {
  return this.availableBalance >= amount;
};

// Method to lock amount for order
walletSchema.methods.lockAmount = function (amount) {
  if (!this.hasSufficientBalance(amount)) {
    throw new Error('Insufficient available balance');
  }
  this.lockedAmount += amount;
  this.updateAvailableBalance();
};

// Method to unlock amount
walletSchema.methods.unlockAmount = function (amount) {
  this.lockedAmount = Math.max(0, this.lockedAmount - amount);
  this.updateAvailableBalance();
};

// Method to deduct from balance
walletSchema.methods.deduct = function (amount) {
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }
  this.balance -= amount;
  this.updateAvailableBalance();
};

// Method to add to balance
walletSchema.methods.credit = function (amount) {
  this.balance += amount;
  this.updateAvailableBalance();
};

// Pre-save hook to ensure availableBalance is always correct
walletSchema.pre('save', function (next) {
  this.updateAvailableBalance();
  next();
});

/**
 * @typedef Wallet
 */
const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
