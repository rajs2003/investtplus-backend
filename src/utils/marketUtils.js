const moment = require('moment-timezone');

/**
 * Check if current time is within Indian market hours (9:15 AM - 3:30 PM IST)
 * @returns {boolean} True if market is open
 */
const isMarketOpen = () => {
  const now = moment.tz('Asia/Kolkata');
  const currentTime = now.format('HHmm');
  const currentDay = now.day(); // 0 = Sunday, 6 = Saturday

  // Check if it's a weekday (Monday to Friday)
  if (currentDay === 0 || currentDay === 6) {
    return false;
  }

  // Market hours: 09:15 to 15:30
  const marketOpen = '0915';
  const marketClose = '1530';

  return currentTime >= marketOpen && currentTime <= marketClose;
};

/**
 * Get current IST time
 * @returns {moment.Moment} Current IST time
 */
const getCurrentISTTime = () => {
  return moment.tz('Asia/Kolkata');
};

/**
 * Format market data for response
 * @param {Object} data - Raw market data
 * @returns {Object} Formatted data
 */
const formatMarketData = (data) => {
  if (!data) return null;

  return {
    symbol: data.symboltoken || data.symbol,
    exchange: data.exchange,
    lastPrice: parseFloat(data.ltp || data.last_traded_price || 0),
    open: parseFloat(data.open || 0),
    high: parseFloat(data.high || 0),
    low: parseFloat(data.low || 0),
    close: parseFloat(data.close || 0),
    volume: parseInt(data.volume || 0, 10),
    timestamp: data.exchange_timestamp || getCurrentISTTime().format(),
  };
};

/**
 * Format top gainers/losers data
 * @param {Array} data - Array of stock data
 * @param {number} limit - Number of results to return
 * @returns {Array} Formatted top movers
 */
const formatTopMovers = (data, limit = 10) => {
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => ({
      symbol: item.symbol,
      symbolToken: item.symboltoken,
      exchange: item.exchange,
      lastPrice: parseFloat(item.ltp || 0),
      change: parseFloat(item.change || 0),
      changePercent: parseFloat(item.changePercent || 0),
      volume: parseInt(item.volume || 0, 10),
    }))
    .slice(0, limit);
};

/**
 * Parse exchange string to standardized format
 * @param {string} exchange - Exchange name (NSE, BSE, NFO, MCX, etc.)
 * @returns {string} Standardized exchange code
 */
const parseExchange = (exchange) => {
  const exchangeMap = {
    NSE: 'NSE',
    BSE: 'BSE',
    NFO: 'NFO',
    MCX: 'MCX',
    CDS: 'CDS',
    BFO: 'BFO',
    nse: 'NSE',
    bse: 'BSE',
    nfo: 'NFO',
    mcx: 'MCX',
    cds: 'CDS',
    bfo: 'BFO',
  };

  return exchangeMap[exchange] || 'NSE';
};

module.exports = {
  isMarketOpen,
  getCurrentISTTime,
  formatMarketData,
  formatTopMovers,
  parseExchange,
};
