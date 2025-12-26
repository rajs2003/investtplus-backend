/**
 * Charges Calculator Service
 * Calculates all trading charges as per real market standards
 *
 * Formulas based on:
 * - Brokerage: ₹20 or 0.03% (whichever is lower)
 * - STT: 0.025% (varies by order type)
 * - Transaction Charges: 0.00325% (NSE)
 * - GST: 18% on (brokerage + transaction charges)
 * - SEBI Charges: ₹10 per crore
 * - Stamp Duty: 0.015% on buy side
 */

/**
 * Calculate brokerage charges
 * @param {number} orderValue - Total order value (quantity × price)
 * @returns {number} Brokerage amount
 */
const calculateBrokerage = (orderValue) => {
  const percentageBased = orderValue * 0.0003; // 0.03%
  const flatRate = 20;
  return Math.min(percentageBased, flatRate);
};

/**
 * Calculate STT (Securities Transaction Tax)
 * @param {string} orderType - 'intraday' or 'delivery'
 * @param {string} transactionType - 'buy' or 'sell'
 * @param {number} orderValue - Total order value
 * @returns {number} STT amount
 */
const calculateSTT = (orderType, transactionType, orderValue) => {
  if (orderType === 'intraday') {
    // Intraday: 0.025% on both buy and sell
    return orderValue * 0.00025;
  } else if (orderType === 'delivery') {
    // Delivery: 0.1% only on sell side
    if (transactionType === 'sell') {
      return orderValue * 0.001;
    }
    return 0;
  }
  return 0;
};

/**
 * Calculate exchange transaction charges
 * @param {number} orderValue - Total order value
 * @returns {number} Transaction charges amount
 */
const calculateTransactionCharges = (orderValue) => {
  // NSE: 0.00325%
  return orderValue * 0.0000325;
};

/**
 * Calculate GST on brokerage and transaction charges
 * @param {number} brokerage - Brokerage amount
 * @param {number} transactionCharges - Transaction charges amount
 * @returns {number} GST amount
 */
const calculateGST = (brokerage, transactionCharges) => {
  // 18% GST on (brokerage + transaction charges)
  return (brokerage + transactionCharges) * 0.18;
};

/**
 * Calculate SEBI turnover charges
 * @param {number} orderValue - Total order value
 * @returns {number} SEBI charges amount
 */
const calculateSEBICharges = (orderValue) => {
  // ₹10 per crore (₹1,00,00,000)
  return (orderValue / 10000000) * 10;
};

/**
 * Calculate stamp duty
 * @param {string} transactionType - 'buy' or 'sell'
 * @param {number} orderValue - Total order value
 * @returns {number} Stamp duty amount
 */
const calculateStampDuty = (transactionType, orderValue) => {
  // 0.015% only on buy side
  if (transactionType === 'buy') {
    return orderValue * 0.00015;
  }
  return 0;
};

/**
 * Calculate all charges for an order
 * @param {Object} params - Order parameters
 * @param {string} params.orderType - 'intraday' or 'delivery'
 * @param {string} params.transactionType - 'buy' or 'sell'
 * @param {number} params.quantity - Number of shares
 * @param {number} params.price - Price per share
 * @returns {Object} Breakdown of all charges
 */
const calculateCharges = ({ orderType, transactionType, quantity, price }) => {
  // Validate inputs
  if (!orderType || !transactionType || !quantity || !price) {
    throw new Error('Missing required parameters for charges calculation');
  }

  if (quantity <= 0 || price <= 0) {
    throw new Error('Quantity and price must be greater than 0');
  }

  // Calculate order value
  const orderValue = quantity * price;

  // Calculate individual charges
  const brokerage = calculateBrokerage(orderValue);
  const stt = calculateSTT(orderType, transactionType, orderValue);
  const transactionCharges = calculateTransactionCharges(orderValue);
  const gst = calculateGST(brokerage, transactionCharges);
  const sebiCharges = calculateSEBICharges(orderValue);
  const stampDuty = calculateStampDuty(transactionType, orderValue);

  // Calculate total charges
  const totalCharges = brokerage + stt + transactionCharges + gst + sebiCharges + stampDuty;

  // Calculate net amount
  const netAmount = orderValue + totalCharges;

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
