/**
 * Mock Market Configuration
 * This config controls the entire mock market behavior
 */

module.exports = {
  // Market Trading Hours (IST)
  marketHours: {
    preOpen: {
      start: '09:00',
      end: '09:15',
    },
    regular: {
      start: '09:15',
      end: '23:30',
    },
    postClose: {
      start: '23:30',
      end: '00:00',
    },
    timezone: 'Asia/Kolkata',
  },

  // Market Open Days (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  tradingDays: [1, 2, 3, 4, 5, 6, 0], // Monday to friday

  // Market Holidays (YYYY-MM-DD format)
  holidays: [
    '2026-01-26', // Republic Day
    '2026-03-14', // Holi
    '2026-04-02', // Ram Navami
    '2026-04-10', // Mahavir Jayanti
    '2026-04-14', // Ambedkar Jayanti
    '2026-05-01', // Maharashtra Day
    '2026-08-15', // Independence Day
    '2026-10-02', // Gandhi Jayanti
    '2026-11-04', // Diwali
    '2026-12-25', // Christmas
  ],

  // Price Generation Settings
  priceSimulation: {
    // Volatility settings (how much price can change)
    volatility: {
      low: 0.002, // 0.2% change
      medium: 0.005, // 0.5% change
      high: 0.01, // 1% change
    },

    // Update interval for price changes (in milliseconds)
    updateInterval: 1000, // 1 second

    // Maximum price change per update (percentage)
    maxPriceChangePerTick: 0.002, // 0.2%

    // Probability of price movement (0-1)
    movementProbability: 0.7, // 70% chance of price change

    // Circuit limits (percentage from previous close)
    circuitLimits: {
      upper: 0.2, // 20% upper circuit
      lower: 0.2, // 20% lower circuit
    },
  },

  // Market Depth Configuration
  marketDepth: {
    levels: 5, // Show 5 levels of bid/ask
    spreadPercentage: 0.001, // 0.1% spread between bid and ask
    volumeRange: {
      min: 100,
      max: 10000,
    },
  },

  // Order Configuration
  orderSettings: {
    // Order types allowed
    allowedOrderTypes: ['MARKET', 'LIMIT', 'SL', 'SL-M'],

    // Product types
    allowedProductTypes: ['DELIVERY', 'INTRADAY', 'MIS'],

    // Minimum order quantity
    minQuantity: 1,

    // Maximum order quantity per order
    maxQuantity: 10000,

    // Order validity
    allowedValidity: ['DAY', 'IOC'],

    // Slippage for market orders (percentage)
    marketOrderSlippage: 0.001, // 0.1%
  },

  // Trading Charges Configuration
  charges: {
    brokerage: {
      delivery: {
        type: 'percentage',
        value: 0.0005, // 0.05%
        max: 20, // Max ₹20 per order
      },
      intraday: {
        type: 'percentage',
        value: 0.0003, // 0.03%
        max: 20,
      },
    },

    stt: {
      // Securities Transaction Tax
      delivery: {
        buy: 0,
        sell: 0.001, // 0.1% on sell
      },
      intraday: {
        buy: 0.00025, // 0.025%
        sell: 0.00025,
      },
    },

    exchangeCharges: {
      nse: 0.0000325, // 0.00325%
      bse: 0.0000375, // 0.00375%
    },

    gst: 0.18, // 18% on brokerage + exchange charges

    sebiCharges: 0.0000001, // ₹10 per crore

    stampDuty: 0.00015, // 0.015% on buy side
  },

  // Margin Requirements
  margins: {
    delivery: {
      required: 1.0, // 100% margin required
    },
    intraday: {
      required: 0.2, // 20% margin required (5x leverage)
    },
    mis: {
      required: 0.2, // 20% margin required
    },
  },

  // Auto Square-off Settings
  autoSquareOff: {
    intraday: {
      time: '15:20', // Auto square-off time for intraday
      enabled: true,
    },
  },

  // WebSocket Configuration
  webSocket: {
    // Update frequency for streaming data (milliseconds)
    tickInterval: 1000, // 1 second

    // Heartbeat interval
    heartbeatInterval: 30000, // 30 seconds

    // Maximum subscriptions per connection
    maxSubscriptions: 100,

    // Reconnection settings
    reconnection: {
      enabled: true,
      maxAttempts: 5,
      delay: 1000, // 1 second
    },
  },

  // Popular stocks to show by default
  popularStocks: [
    'RELIANCE',
    'TCS',
    'HDFCBANK',
    'INFY',
    'ICICIBANK',
    'HINDUNILVR',
    'ITC',
    'SBIN',
    'BHARTIARTL',
    'KOTAKBANK',
  ],

  // Performance Settings
  performance: {
    // Cache settings
    cache: {
      priceDataTTL: 1000, // 1 second
      marketDepthTTL: 500, // 500ms
    },

    // Rate limiting
    rateLimit: {
      maxRequestsPerMinute: 100,
      maxWebSocketMessages: 1000,
    },
  },
};
