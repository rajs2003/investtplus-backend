/**
 * Mock Market Configuration
 * This config controls the entire mock market behavior
 */

module.exports = {
  // Market Trading Hours (IST)
  // Schedule: Market open all day EXCEPT 03:00–05:00 (maintenance window)
  //   04:45–05:00  → Pre-Open  (15 min)
  //   05:00–03:00  → Regular   (22 hrs, crosses midnight — handled in marketData.service)
  //   03:00–03:15  → Post-Close (15 min)
  //   03:15–04:45  → Fully Closed
  marketHours: {
    preOpen: {
      start: '04:45',
      end: '05:00',
    },
    regular: {
      start: '05:00',
      end: '03:00', // crosses midnight — 05:00 today → 03:00 next day
    },
    postClose: {
      start: '03:00',
      end: '03:15',
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
    volatility: {
      low: 0.003, // 0.3% change
      medium: 0.002, // 0.2% change
      high: 0.01, // 1% change
    },

    updateInterval: 1000, // 1 second
    maxPriceChangePerTick: 0.002, // 0.2%
    movementProbability: 0.2, // 20% chance of price change
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
    allowedOrderTypes: ['MARKET', 'LIMIT', 'SL', 'SL-M'],
    allowedProductTypes: ['DELIVERY', 'INTRADAY', 'MIS'],
    minQuantity: 1,
    maxQuantity: 10000,
    allowedValidity: ['DAY', 'IOC'],
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
  // Fires 15 min before market closes (regular.end = 03:00)
  autoSquareOff: {
    intraday: {
      time: '02:45', // Auto square-off time for intraday (HH:mm format)
      enabled: true,
    },
  },

  // Scheduled Jobs Configuration
  // Cron expressions used by marketSettlement.job.js
  scheduledJobs: {
    positionConversion: {
      // Convert expired delivery positions to holdings — runs every hour
      cronExpression: '0 * * * *',
    },
  },

  // Position Settings
  positions: {
    delivery: {
      displayDuration: 24, // Hours - Show delivery positions for 24 hours before converting to holdings
    },
  },

  // WebSocket Configuration
  webSocket: {
    tickInterval: 1000, // 1 second
    heartbeatInterval: 30000, // 30 seconds
    maxSubscriptions: 100,
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
