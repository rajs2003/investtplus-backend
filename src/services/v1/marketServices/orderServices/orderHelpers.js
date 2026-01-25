const httpStatus = require('http-status');
const ApiError = require('../../../../utils/ApiError');
const marketConfig = require('../../../../config/market.config');

/**
 * Order Helper Utilities
 * Clean utility functions for order calculations and validations
 */

/**
 * Calculate order charges
 * @param {Object} params - Order parameters
 * @param {string} params.orderType - intraday, delivery, or MIS
 * @param {string} params.transactionType - buy or sell
 * @param {number} params.quantity - Number of shares
 * @param {number} params.price - Price per share
 * @param {string} exchange - Exchange (NSE/BSE)
 * @returns {Object} Calculated charges breakdown
 */
const calculateOrderCharges = ({ orderType, transactionType, quantity, price }, exchange = 'NSE') => {
  const orderValue = quantity * price;
  const exchangeKey = exchange.toLowerCase();

  // Get config values
  const brokerageConfig = marketConfig.charges.brokerage[orderType.toLowerCase()] || marketConfig.charges.brokerage.delivery;
  const sttConfig = marketConfig.charges.stt[orderType.toLowerCase()] || marketConfig.charges.stt.delivery;
  const exchangeChargeRate = marketConfig.charges.exchangeCharges[exchangeKey] || marketConfig.charges.exchangeCharges.nse;
  const gstRate = marketConfig.charges.gst;
  const sebiChargeRate = marketConfig.charges.sebiCharges;
  const stampDutyRate = marketConfig.charges.stampDuty;

  // Brokerage calculation
  let brokerage = 0;
  if (brokerageConfig.type === 'percentage') {
    brokerage = Math.min(orderValue * brokerageConfig.value, brokerageConfig.max);
  } else {
    brokerage = brokerageConfig.value;
  }

  // STT (Securities Transaction Tax)
  let stt = 0;
  if (orderType.toLowerCase() === 'delivery') {
    stt = transactionType === 'sell' ? orderValue * sttConfig.sell : orderValue * sttConfig.buy;
  } else if (orderType.toLowerCase() === 'intraday' || orderType.toLowerCase() === 'mis') {
    stt = orderValue * (transactionType === 'sell' ? sttConfig.sell : sttConfig.buy);
  }

  // Exchange transaction charges
  const transactionCharges = orderValue * exchangeChargeRate;

  // GST on brokerage and transaction charges
  const gst = (brokerage + transactionCharges) * gstRate;

  // SEBI charges
  const sebiCharges = orderValue * sebiChargeRate;

  // Stamp duty - only on buy side
  const stampDuty = transactionType === 'buy' ? orderValue * stampDutyRate : 0;

  // Total charges
  const totalCharges = brokerage + stt + transactionCharges + gst + sebiCharges + stampDuty;

  // Net amount (for buy: orderValue + charges, for sell: orderValue - charges)
  const netAmount = transactionType === 'buy' ? orderValue + totalCharges : orderValue - totalCharges;

  return {
    orderValue: parseFloat(orderValue.toFixed(2)),
    brokerage: parseFloat(brokerage.toFixed(2)),
    stt: parseFloat(stt.toFixed(2)),
    transactionCharges: parseFloat(transactionCharges.toFixed(2)),
    gst: parseFloat(gst.toFixed(2)),
    sebiCharges: parseFloat(sebiCharges.toFixed(2)),
    stampDuty: parseFloat(stampDuty.toFixed(2)),
    totalCharges: parseFloat(totalCharges.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2)),
  };
};

/**
 * Validate order data
 * @param {Object} orderData - Order data to validate
 * @throws {ApiError} If validation fails
 */
const validateOrderData = (orderData) => {
  const { symbol, quantity, price, orderVariant, triggerPrice, transactionType } = orderData;

  // Validate symbol
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Valid stock symbol is required');
  }

  // Validate quantity
  if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quantity must be a positive integer');
  }

  // Validate with config min/max (will be double-checked in service)
  if (quantity < marketConfig.orderSettings.minQuantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum order quantity is ${marketConfig.orderSettings.minQuantity}`);
  }

  if (quantity > marketConfig.orderSettings.maxQuantity) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Maximum order quantity is ${marketConfig.orderSettings.maxQuantity} shares per order`,
    );
  }

  // Validate price for limit orders
  if (orderVariant === 'limit') {
    if (!price || typeof price !== 'number' || price <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Valid price is required for limit orders');
    }
  }

  // Validate trigger price for SL/SLM orders
  if (orderVariant === 'sl' || orderVariant === 'slm') {
    if (!triggerPrice || typeof triggerPrice !== 'number' || triggerPrice <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Valid trigger price is required for stop loss orders');
    }

    // For SL orders, also validate limit price
    if (orderVariant === 'sl' && (!price || typeof price !== 'number' || price <= 0)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Valid limit price is required for SL orders');
    }

    // Validate trigger price logic
    if (transactionType === 'buy' && orderVariant === 'sl' && price && price < triggerPrice) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'For buy SL orders, limit price must be greater than or equal to trigger price',
      );
    }

    if (transactionType === 'sell' && orderVariant === 'sl' && price && price > triggerPrice) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'For sell SL orders, limit price must be less than or equal to trigger price',
      );
    }
  }
};

/**
 * Get estimated execution price
 * @param {Object} orderData - Order data
 * @param {number} marketPrice - Current market price
 * @returns {number} Estimated execution price
 */
const getEstimatedExecutionPrice = (orderData, marketPrice) => {
  const { orderVariant, price, triggerPrice } = orderData;

  switch (orderVariant) {
    case 'market':
      return marketPrice;
    case 'limit':
      return price;
    case 'sl':
      return price; // Will execute at limit price when triggered
    case 'slm':
      return triggerPrice; // Will execute at market price when triggered
    default:
      return marketPrice;
  }
};

/**
 * Check if order can be executed based on price conditions
 * @param {Object} order - Order document
 * @param {number} marketPrice - Current market price
 * @returns {Object} { canExecute: boolean, reason: string, executionPrice: number }
 */
const checkExecutionCondition = (order, marketPrice) => {
  const { orderVariant, transactionType, price, triggerPrice } = order;

  // Market orders can always execute immediately
  if (orderVariant === 'market') {
    return {
      canExecute: true,
      reason: 'Market order',
      executionPrice: marketPrice,
    };
  }

  // Limit orders
  if (orderVariant === 'limit') {
    if (transactionType === 'buy') {
      // Buy limit: Execute when market price <= limit price
      if (marketPrice <= price) {
        return {
          canExecute: true,
          reason: `Market price (₹${marketPrice}) is below or equal to limit price (₹${price})`,
          executionPrice: price,
        };
      }
      return {
        canExecute: false,
        reason: `Market price (₹${marketPrice}) is above limit price (₹${price})`,
        executionPrice: null,
      };
    } else {
      // Sell limit: Execute when market price >= limit price
      if (marketPrice >= price) {
        return {
          canExecute: true,
          reason: `Market price (₹${marketPrice}) is above or equal to limit price (₹${price})`,
          executionPrice: price,
        };
      }
      return {
        canExecute: false,
        reason: `Market price (₹${marketPrice}) is below limit price (₹${price})`,
        executionPrice: null,
      };
    }
  }

  // Stop Loss orders (SL and SLM)
  if (orderVariant === 'sl' || orderVariant === 'slm') {
    const isTriggered = transactionType === 'sell' ? marketPrice <= triggerPrice : marketPrice >= triggerPrice;

    if (!isTriggered) {
      return {
        canExecute: false,
        reason: `Trigger price (₹${triggerPrice}) not hit. Current price: ₹${marketPrice}`,
        executionPrice: null,
      };
    }

    // Trigger hit, execute at appropriate price
    const execPrice = orderVariant === 'slm' ? marketPrice : price;
    return {
      canExecute: true,
      reason: `Stop loss triggered at ₹${marketPrice}`,
      executionPrice: execPrice,
    };
  }

  return {
    canExecute: false,
    reason: 'Unknown order variant',
    executionPrice: null,
  };
};

/**
 * Format order description
 * @param {Object} order - Order data
 * @returns {string} Formatted description
 */
const formatOrderDescription = (order) => {
  const { transactionType, quantity, symbol, orderVariant, price, triggerPrice, companyName } = order;

  const action = transactionType.toUpperCase();
  const stockName = companyName || symbol;
  let priceInfo = '';

  switch (orderVariant) {
    case 'market':
      priceInfo = 'at market price';
      break;
    case 'limit':
      priceInfo = `at limit price ₹${price}`;
      break;
    case 'sl':
      priceInfo = `with trigger ₹${triggerPrice} and limit ₹${price}`;
      break;
    case 'slm':
      priceInfo = `with trigger ₹${triggerPrice} at market`;
      break;
    default:
      priceInfo = '';
  }

  return `${action} ${quantity} shares of ${stockName} (${symbol}) ${priceInfo}`;
};

/**
 * Calculate price impact percentage
 * @param {number} estimatedPrice - Estimated price
 * @param {number} actualPrice - Actual execution price
 * @returns {number} Price impact percentage
 */
const calculatePriceImpact = (estimatedPrice, actualPrice) => {
  if (estimatedPrice === 0) return 0;
  return (((actualPrice - estimatedPrice) / estimatedPrice) * 100).toFixed(2);
};

module.exports = {
  calculateOrderCharges,
  validateOrderData,
  getEstimatedExecutionPrice,
  checkExecutionCondition,
  formatOrderDescription,
  calculatePriceImpact,
};
