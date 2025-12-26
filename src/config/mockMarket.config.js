/**
 * Mock Market Configuration
 * Central configuration for simulated market data
 * Customize stocks, prices, timings, and fluctuations here
 */

module.exports = {
  // Market Timing Configuration
  marketTiming: {
    openTime: '09:15', // Market open time (HH:mm format)
    closeTime: '15:30', // Market close time (HH:mm format)
    timezone: 'Asia/Kolkata',
    // Days when market is closed (0 = Sunday, 6 = Saturday)
    closedDays: [0, 6],
  },

  // Data Update Intervals (in milliseconds)
  updateIntervals: {
    tick: 1000, // Price tick updates every 1 second
    ohlc: 60000, // OHLC updates every minute
    quote: 5000, // Full quote updates every 5 seconds
  },

  // Price Fluctuation Settings
  fluctuation: {
    maxChangePercent: 2.0, // Maximum price change per tick (in percentage)
    minChangePercent: 0.01, // Minimum price change per tick
    volatilityFactor: 0.5, // Controls randomness (0-1, higher = more volatile)
    trendDuration: 30, // How many ticks before trend reversal (bullish/bearish)
  },

  // Volume Settings
  volume: {
    baseMultiplier: 1000, // Base multiplier for random volume
    maxVolume: 10000000, // Maximum volume per stock
    minVolume: 1000, // Minimum volume per stock
  },

  // Mock Stock List with Initial Configuration
  stocks: [
    {
      tradingSymbol: 'RELIANCE',
      exchangeToken: 738561,
      instrumentToken: 738561,
      exchange: 'NSE',
      name: 'Reliance Industries Ltd',
      initialPrice: 2450.5,
      minPrice: 2300.0,
      maxPrice: 2600.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'Energy',
    },
    {
      tradingSymbol: 'TCS',
      exchangeToken: 2953217,
      instrumentToken: 2953217,
      exchange: 'NSE',
      name: 'Tata Consultancy Services Ltd',
      initialPrice: 3850.75,
      minPrice: 3700.0,
      maxPrice: 4000.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'IT',
    },
    {
      tradingSymbol: 'INFY',
      exchangeToken: 408065,
      instrumentToken: 408065,
      exchange: 'NSE',
      name: 'Infosys Ltd',
      initialPrice: 1520.3,
      minPrice: 1450.0,
      maxPrice: 1600.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'IT',
    },
    {
      tradingSymbol: 'HDFCBANK',
      exchangeToken: 341249,
      instrumentToken: 341249,
      exchange: 'NSE',
      name: 'HDFC Bank Ltd',
      initialPrice: 1650.25,
      minPrice: 1550.0,
      maxPrice: 1750.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'Banking',
    },
    {
      tradingSymbol: 'ICICIBANK',
      exchangeToken: 1270529,
      instrumentToken: 1270529,
      exchange: 'NSE',
      name: 'ICICI Bank Ltd',
      initialPrice: 985.6,
      minPrice: 920.0,
      maxPrice: 1050.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'Banking',
    },
    {
      tradingSymbol: 'SBIN',
      exchangeToken: 779521,
      instrumentToken: 779521,
      exchange: 'NSE',
      name: 'State Bank of India',
      initialPrice: 625.8,
      minPrice: 580.0,
      maxPrice: 670.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'Banking',
    },
    {
      tradingSymbol: 'BHARTIARTL',
      exchangeToken: 2714625,
      instrumentToken: 2714625,
      exchange: 'NSE',
      name: 'Bharti Airtel Ltd',
      initialPrice: 1180.45,
      minPrice: 1100.0,
      maxPrice: 1250.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'Telecom',
    },
    {
      tradingSymbol: 'WIPRO',
      exchangeToken: 969473,
      instrumentToken: 969473,
      exchange: 'NSE',
      name: 'Wipro Ltd',
      initialPrice: 445.9,
      minPrice: 420.0,
      maxPrice: 470.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'IT',
    },
    {
      tradingSymbol: 'ITC',
      exchangeToken: 424961,
      instrumentToken: 424961,
      exchange: 'NSE',
      name: 'ITC Ltd',
      initialPrice: 465.2,
      minPrice: 440.0,
      maxPrice: 490.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'FMCG',
    },
    {
      tradingSymbol: 'LT',
      exchangeToken: 2939649,
      instrumentToken: 2939649,
      exchange: 'NSE',
      name: 'Larsen & Toubro Ltd',
      initialPrice: 3520.65,
      minPrice: 3400.0,
      maxPrice: 3650.0,
      lotSize: 1,
      tickSize: 0.05,
      sector: 'Infrastructure',
    },
  ],

  // Market Indices Configuration
  indices: [
    {
      tradingSymbol: 'NIFTY 50',
      instrumentToken: 256265,
      exchange: 'NSE',
      name: 'Nifty 50',
      initialValue: 21800.5,
      minValue: 21500.0,
      maxValue: 22200.0,
    },
    {
      tradingSymbol: 'NIFTY BANK',
      instrumentToken: 260105,
      exchange: 'NSE',
      name: 'Nifty Bank',
      initialValue: 46500.75,
      minValue: 46000.0,
      maxValue: 47200.0,
    },
  ],

  // Additional Settings
  settings: {
    enablePreMarket: false, // Simulate pre-market session
    enablePostMarket: false, // Simulate post-market session
    enableCircuitBreakers: true, // Respect min/max price limits
    enableMarketDepth: true, // Generate mock market depth data
    depthLevels: 5, // Number of depth levels (buy/sell orders)
  },

  // Custom Events (optional - for future enhancement)
  events: {
    enableNewsImpact: false, // Random news events affecting prices
    newsImpactChance: 0.05, // 5% chance of news event per minute
    newsImpactMultiplier: 5.0, // Multiplier for price change during news
  },
};
