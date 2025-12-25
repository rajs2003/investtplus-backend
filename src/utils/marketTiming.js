/**
 * Market Timing Utility
 * Handles market open/close timing validations
 * 
 * Market Hours:
 * - Regular Session: 9:15 AM - 3:30 PM (Mon-Fri)
 * - Pre-Market: 9:00 AM - 9:15 AM (optional)
 * - After Market: 3:40 PM - 4:00 PM (optional)
 * - Closed: Saturday, Sunday, and holidays
 */

/**
 * Check if market is currently open
 * @returns {boolean} True if market is open
 */
const isMarketOpen = () => {
  // FOR TESTING: Always return true
  // TODO: Re-enable market timing validation in production
  return true;
  
  /* Production code:
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes; // Convert to minutes

  // Check if weekend
  if (day === 0 || day === 6) {
    return false;
  }

  // Market hours: 9:15 AM (555 minutes) to 3:30 PM (930 minutes)
  const marketOpen = 9 * 60 + 15; // 555 minutes (9:15 AM)
  const marketClose = 15 * 60 + 30; // 930 minutes (3:30 PM)

  return currentTime >= marketOpen && currentTime <= marketClose;
  */
};

/**
 * Check if it's a trading day (Mon-Fri)
 * @returns {boolean} True if it's a trading day
 */
const isTradingDay = () => {
  const now = new Date();
  const day = now.getDay();
  return day >= 1 && day <= 5; // Monday to Friday
};

/**
 * Check if current time is in pre-market session
 * @returns {boolean} True if in pre-market
 */
const isPreMarket = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  if (day === 0 || day === 6) return false;

  const preMarketStart = 9 * 60; // 9:00 AM
  const preMarketEnd = 9 * 60 + 15; // 9:15 AM

  return currentTime >= preMarketStart && currentTime < preMarketEnd;
};

/**
 * Check if current time is in after-market session
 * @returns {boolean} True if in after-market
 */
const isAfterMarket = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  if (day === 0 || day === 6) return false;

  const afterMarketStart = 15 * 60 + 40; // 3:40 PM
  const afterMarketEnd = 16 * 60; // 4:00 PM

  return currentTime >= afterMarketStart && currentTime <= afterMarketEnd;
};

/**
 * Get detailed market status
 * @returns {Object} Market status with timings
 */
const getMarketStatus = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  // Format time helper
  const formatTime = (hour, minute) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${ampm}`;
  };

  const marketOpenTime = formatTime(9, 15);
  const marketCloseTime = formatTime(15, 30);

  // Weekend check
  if (day === 0 || day === 6) {
    return {
      isOpen: false,
      status: 'weekend',
      message: 'Market is closed on weekends',
      nextOpen: 'Monday 9:15 AM',
      currentTime: now.toLocaleTimeString('en-IN'),
      marketHours: `${marketOpenTime} - ${marketCloseTime}`,
    };
  }

  // Pre-market
  if (currentTime >= 9 * 60 && currentTime < 9 * 60 + 15) {
    return {
      isOpen: false,
      status: 'pre-market',
      message: 'Pre-market session. Regular trading starts at 9:15 AM',
      nextOpen: marketOpenTime,
      currentTime: now.toLocaleTimeString('en-IN'),
      marketHours: `${marketOpenTime} - ${marketCloseTime}`,
    };
  }

  // Regular market hours
  if (currentTime >= 9 * 60 + 15 && currentTime <= 15 * 60 + 30) {
    const closeMinutes = 15 * 60 + 30 - currentTime;
    const closeHours = Math.floor(closeMinutes / 60);
    const closeMins = closeMinutes % 60;
    
    return {
      isOpen: true,
      status: 'open',
      message: 'Market is open for trading',
      closesIn: `${closeHours}h ${closeMins}m`,
      closingTime: marketCloseTime,
      currentTime: now.toLocaleTimeString('en-IN'),
      marketHours: `${marketOpenTime} - ${marketCloseTime}`,
    };
  }

  // After market
  if (currentTime > 15 * 60 + 30 && currentTime <= 16 * 60) {
    return {
      isOpen: false,
      status: 'after-market',
      message: 'Market is closed. After-market session active',
      nextOpen: 'Tomorrow 9:15 AM',
      currentTime: now.toLocaleTimeString('en-IN'),
      marketHours: `${marketOpenTime} - ${marketCloseTime}`,
    };
  }

  // Before market opens or after market closes
  if (currentTime < 9 * 60) {
    return {
      isOpen: false,
      status: 'before-market',
      message: 'Market has not opened yet',
      nextOpen: `Today ${marketOpenTime}`,
      currentTime: now.toLocaleTimeString('en-IN'),
      marketHours: `${marketOpenTime} - ${marketCloseTime}`,
    };
  }

  // After market closed
  return {
    isOpen: false,
    status: 'closed',
    message: 'Market is closed for the day',
    nextOpen: 'Tomorrow 9:15 AM',
    currentTime: now.toLocaleTimeString('en-IN'),
    marketHours: `${marketOpenTime} - ${marketCloseTime}`,
  };
};

/**
 * Get time until market opens
 * @returns {Object} Time until next market open
 */
const getTimeUntilMarketOpen = () => {
  const now = new Date();
  const marketOpen = new Date();
  marketOpen.setHours(9, 15, 0, 0);

  // If market opening time has passed today, set to tomorrow
  if (now >= marketOpen) {
    marketOpen.setDate(marketOpen.getDate() + 1);
  }

  // Skip weekends
  while (marketOpen.getDay() === 0 || marketOpen.getDay() === 6) {
    marketOpen.setDate(marketOpen.getDate() + 1);
  }

  const diff = marketOpen - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    hours,
    minutes,
    timestamp: marketOpen.toISOString(),
    formatted: `${hours}h ${minutes}m`,
  };
};

/**
 * Get time until market closes
 * @returns {Object|null} Time until market closes or null if market is closed
 */
const getTimeUntilMarketClose = () => {
  if (!isMarketOpen()) {
    return null;
  }

  const now = new Date();
  const marketClose = new Date();
  marketClose.setHours(15, 30, 0, 0);

  const diff = marketClose - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    hours,
    minutes,
    timestamp: marketClose.toISOString(),
    formatted: `${hours}h ${minutes}m`,
  };
};

/**
 * Check if intraday position should be squared off
 * Auto square-off time: 3:20 PM
 * @returns {boolean} True if it's time to square off
 */
const isSquareOffTime = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const squareOffTime = 15 * 60 + 20; // 3:20 PM (920 minutes)

  return currentTime >= squareOffTime;
};

/**
 * Get next trading day
 * @returns {Date} Next trading day
 */
const getNextTradingDay = () => {
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);

  // Skip weekends
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return nextDay;
};

/**
 * Validate if order can be placed now
 * @param {string} orderType - 'intraday' or 'delivery'
 * @returns {Object} Validation result
 */
const validateOrderTiming = (orderType) => {
  const marketStatus = getMarketStatus();

  if (!marketStatus.isOpen) {
    return {
      allowed: false,
      reason: marketStatus.message,
      marketStatus,
    };
  }

  // For intraday orders, check if it's too close to closing
  if (orderType === 'intraday' && isSquareOffTime()) {
    return {
      allowed: false,
      reason: 'Cannot place intraday orders after 3:20 PM. Market closes at 3:30 PM',
      marketStatus,
    };
  }

  return {
    allowed: true,
    marketStatus,
  };
};

module.exports = {
  isMarketOpen,
  isTradingDay,
  isPreMarket,
  isAfterMarket,
  getMarketStatus,
  getTimeUntilMarketOpen,
  getTimeUntilMarketClose,
  isSquareOffTime,
  getNextTradingDay,
  validateOrderTiming,
};
