/**
 * Sample usage examples for AngelOne SmartAPI integration
 * Yeh file testing aur reference ke liye hai
 */

const { angelOneService, stockService, marketService, webSocketService } = require('../services/v1/angeloneServices');
const { isMarketOpen, getCurrentISTTime } = require('../utils/marketUtils');

/**
 * Example 1: Check market status
 */
const checkMarketStatus = () => {
  const marketOpen = isMarketOpen();
  const currentTime = getCurrentISTTime();

  console.log('Market Status:', marketOpen ? 'OPEN' : 'CLOSED');
  console.log('Current IST Time:', currentTime.format('YYYY-MM-DD HH:mm:ss'));
};

/**
 * Example 2: Get realtime stock price
 */
const getRealtimePrice = async () => {
  try {
    // Example: Reliance stock
    const result = await stockService.getRealtimeStockPrice('RELIANCE-EQ', 'NSE', '2885');

    console.log('Reliance Stock Price:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error fetching stock price:', error.message);
  }
};

/**
 * Example 3: Get stock details with market depth
 */
const getStockDetails = async () => {
  try {
    const result = await stockService.getStockDetails('TCS-EQ', 'NSE', '11536');

    console.log('TCS Stock Details:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error fetching stock details:', error.message);
  }
};

/**
 * Example 4: Get multiple stocks prices
 */
const getMultipleStocks = async () => {
  try {
    const stocks = [
      { tradingSymbol: 'RELIANCE-EQ', exchange: 'NSE', symbolToken: '2885' },
      { tradingSymbol: 'TCS-EQ', exchange: 'NSE', symbolToken: '11536' },
      { tradingSymbol: 'INFY-EQ', exchange: 'NSE', symbolToken: '1594' },
    ];

    const result = await stockService.getMultipleStocksPrices(stocks);

    console.log('Multiple Stocks Prices:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error fetching multiple stocks:', error.message);
  }
};

/**
 * Example 5: Search for stocks
 */
const searchStock = async () => {
  try {
    const result = await marketService.searchStocks('RELIANCE', 'NSE');

    console.log('Search Results for RELIANCE:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error searching stocks:', error.message);
  }
};

/**
 * Example 6: Get LTP
 */
const getLTP = async () => {
  try {
    const result = await marketService.getLTP('NSE', '2885', 'RELIANCE-EQ');

    console.log('LTP for Reliance:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error fetching LTP:', error.message);
  }
};

/**
 * Example 7: Get candle data (historical)
 */
const getCandleData = async () => {
  try {
    const result = await marketService.getCandleData({
      exchange: 'NSE',
      symbolToken: '2885',
      interval: 'FIVE_MINUTE',
      fromDate: '2025-12-13 09:15',
      toDate: '2025-12-13 15:30',
    });

    console.log('Candle Data:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error fetching candle data:', error.message);
  }
};

/**
 * Example 8: WebSocket connection and subscription
 */
const testWebSocket = async () => {
  try {
    // Connect to WebSocket
    await webSocketService.connect();
    console.log('WebSocket connected');

    // Wait for connection to establish
    setTimeout(() => {
      // Subscribe to tokens
      const tokens = [
        {
          exchangeType: 1, // NSE
          tokens: ['2885', '11536'], // Reliance and TCS
        },
      ];

      webSocketService.subscribe(1, tokens); // Mode 1 = LTP
      console.log('Subscribed to tokens');
    }, 2000);

    // Unsubscribe and disconnect after 30 seconds
    setTimeout(() => {
      const tokens = [
        {
          exchangeType: 1,
          tokens: ['2885', '11536'],
        },
      ];

      webSocketService.unsubscribe(1, tokens);
      webSocketService.disconnect();
      console.log('Unsubscribed and disconnected');
    }, 30000);
  } catch (error) {
    console.error('Error with WebSocket:', error.message);
  }
};

/**
 * Example 9: Login manually (usually automatic)
 */
const manualLogin = async () => {
  try {
    const sessionData = await angelOneService.login();
    console.log('Logged in successfully');
    console.log('Session Data:', sessionData);
  } catch (error) {
    console.error('Login error:', error.message);
  }
};

/**
 * Example 10: Get user profile
 */
const getUserProfile = async () => {
  try {
    const profile = await angelOneService.getProfile();
    console.log('User Profile:');
    console.log(JSON.stringify(profile, null, 2));
  } catch (error) {
    console.error('Error fetching profile:', error.message);
  }
};

// Run examples
const runExamples = async () => {
  console.log('=== AngelOne SmartAPI Integration Examples ===\n');

  // Example 1: Market Status
  console.log('--- Example 1: Market Status ---');
  checkMarketStatus();
  console.log('\n');

  // Example 2: Get realtime price
  console.log('--- Example 2: Realtime Stock Price ---');
  await getRealtimePrice();
  console.log('\n');

  // Example 3: Stock details
  console.log('--- Example 3: Stock Details ---');
  await getStockDetails();
  console.log('\n');

  // Example 4: Multiple stocks
  console.log('--- Example 4: Multiple Stocks ---');
  await getMultipleStocks();
  console.log('\n');

  // Example 5: Search
  console.log('--- Example 5: Search Stocks ---');
  await searchStock();
  console.log('\n');

  // You can uncomment and run other examples as needed
  // await getLTP();
  // await getCandleData();
  // await testWebSocket();
  // await getUserProfile();
};

// Export for use in other files or testing
module.exports = {
  checkMarketStatus,
  getRealtimePrice,
  getStockDetails,
  getMultipleStocks,
  searchStock,
  getLTP,
  getCandleData,
  testWebSocket,
  manualLogin,
  getUserProfile,
  runExamples,
};

// Uncomment to run examples directly
// runExamples().catch(console.error);
