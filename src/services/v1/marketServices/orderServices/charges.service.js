/**
 * Charges Calculator Service
 * Calculates all trading charges based on market configuration
 * Uses values from market.config.js for accurate and configurable charge calculation
 */

const marketConfig = require('../../../../config/market.config');

/**
 * Calculate brokerage charges
 * @param {number} orderValue - Total order value (quantity × price)
 * @param {string} orderType - Order type (delivery/intraday/mis)
 * @returns {number} Brokerage amount
 */
const calculateBrokerage = (orderValue, orderType = 'delivery') => {
  const brokerageConfig = marketConfig.charges.brokerage[orderType.toLowerCase()] || marketConfig.charges.brokerage.delivery;

  if (brokerageConfig.type === 'percentage') {
    const percentageBased = orderValue * brokerageConfig.value;
    return Math.min(percentageBased, brokerageConfig.max);
  }
  return brokerageConfig.value;
};

/**
 * Calculate STT (Securities Transaction Tax)
 * @param {string} orderType - 'intraday', 'delivery', or 'mis'
 * @param {string} transactionType - 'buy' or 'sell'
 * @param {number} orderValue - Total order value
 * @returns {number} STT amount
 */
const calculateSTT = (orderType, transactionType, orderValue) => {
  const sttConfig = marketConfig.charges.stt[orderType.toLowerCase()] || marketConfig.charges.stt.delivery;

  if (transactionType === 'buy') {
    return orderValue * sttConfig.buy;
  }
  return orderValue * sttConfig.sell;
};

/**
 * Calculate exchange transaction charges
 * @param {number} orderValue - Total order value
 * @param {string} exchange - Exchange (NSE/BSE)
 * @returns {number} Transaction charges amount
 */
const calculateTransactionCharges = (orderValue, exchange = 'NSE') => {
  const exchangeKey = exchange.toLowerCase();
  const exchangeChargeRate = marketConfig.charges.exchangeCharges[exchangeKey] || marketConfig.charges.exchangeCharges.nse;
  return orderValue * exchangeChargeRate;
};

/**
 * Calculate GST on brokerage and transaction charges
 * @param {number} brokerage - Brokerage amount
 * @param {number} transactionCharges - Transaction charges amount
 * @returns {number} GST amount
 */
const calculateGST = (brokerage, transactionCharges) => {
  const gstRate = marketConfig.charges.gst;
  return (brokerage + transactionCharges) * gstRate;
};

/**
 * Calculate SEBI turnover charges
 * @param {number} orderValue - Total order value
 * @returns {number} SEBI charges amount
 */
const calculateSEBICharges = (orderValue) => {
  const sebiChargeRate = marketConfig.charges.sebiCharges;
  return orderValue * sebiChargeRate;
};

/**
 * Calculate stamp duty
 * @param {string} transactionType - 'buy' or 'sell'
 * @param {number} orderValue - Total order value
 * @returns {number} Stamp duty amount
 */
const calculateStampDuty = (transactionType, orderValue) => {
  const stampDutyRate = marketConfig.charges.stampDuty;
  if (transactionType === 'buy') {
    return orderValue * stampDutyRate;
  }
  return 0;
};

/**
 * Calculate all charges for an order
 * @param {Object} params - Order parameters
 * @param {string} params.orderType - 'intraday', 'delivery', or 'mis'
 * @param {string} params.transactionType - 'buy' or 'sell'
 * @param {number} params.quantity - Number of shares
 * @param {number} params.price - Price per share
 * @param {string} params.exchange - Exchange (NSE/BSE) - optional, defaults to NSE
 * @returns {Object} Breakdown of all charges
 */
const calculateCharges = ({ orderType, transactionType, quantity, price, exchange = 'NSE' }) => {
  // Validate inputs
  if (!orderType || !transactionType || !quantity || !price) {
    throw new Error('Missing required parameters for charges calculation');
  }

  if (quantity <= 0 || price <= 0) {
    throw new Error('Quantity and price must be greater than 0');
  }

  // Calculate order value
  const orderValue = quantity * price;

  // Calculate individual charges using config-based functions
  const brokerage = calculateBrokerage(orderValue, orderType);
  const stt = calculateSTT(orderType, transactionType, orderValue);
  const transactionCharges = calculateTransactionCharges(orderValue, exchange);
  const gst = calculateGST(brokerage, transactionCharges);
  const sebiCharges = calculateSEBICharges(orderValue);
  const stampDuty = calculateStampDuty(transactionType, orderValue);

  // Calculate total charges
  const totalCharges = brokerage + stt + transactionCharges + gst + sebiCharges + stampDuty;

  // Calculate net amount
  const netAmount = transactionType === 'buy' ? orderValue + totalCharges : orderValue - totalCharges;

  // Round all values to 2 decimal places
  const roundToTwo = (num) => Math.round(num * 100) / 100;

  return {
    orderValue: roundToTwo(orderValue),
    brokerage: roundToTwo(brokerage),
    stt: roundToTwo(stt),
    transactionCharges: roundToTwo(transactionCharges),
    gst: roundToTwo(gst),
    sebiCharges: roundToTwo(sebiCharges),
    stampDuty: roundToTwo(stampDuty),
    totalCharges: roundToTwo(totalCharges),
    netAmount: roundToTwo(netAmount),
    breakdown: {
      orderValue: `₹${roundToTwo(orderValue).toLocaleString('en-IN')}`,
      brokerage: `₹${roundToTwo(brokerage).toLocaleString('en-IN')}`,
      stt: `₹${roundToTwo(stt).toLocaleString('en-IN')}`,
      transactionCharges: `₹${roundToTwo(transactionCharges).toLocaleString('en-IN')}`,
      gst: `₹${roundToTwo(gst).toLocaleString('en-IN')}`,
      sebiCharges: `₹${roundToTwo(sebiCharges).toLocaleString('en-IN')}`,
      stampDuty: `₹${roundToTwo(stampDuty).toLocaleString('en-IN')}`,
      totalCharges: `₹${roundToTwo(totalCharges).toLocaleString('en-IN')}`,
      netAmount: `₹${roundToTwo(netAmount).toLocaleString('en-IN')}`,
    },
  };
};

/**
 * Get charges estimation for UI display
 * @param {Object} params - Order parameters
 * @returns {Object} User-friendly charges breakdown
 */
const getChargesEstimate = (params) => {
  try {
    const charges = calculateCharges(params);
    return {
      success: true,
      charges: charges.breakdown,
      raw: {
        orderValue: charges.orderValue,
        totalCharges: charges.totalCharges,
        netAmount: charges.netAmount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  calculateCharges,
  calculateBrokerage,
  calculateSTT,
  calculateTransactionCharges,
  calculateGST,
  calculateSEBICharges,
  calculateStampDuty,
  getChargesEstimate,
};
