# Market Data Provider Configuration Guide

This application now supports multiple market data providers. You can choose between **AngelOne SmartAPI** and **Zerodha Kite Connect** as your market data source.

## 🎯 Quick Setup

### Step 1: Choose Your Provider

In your `.env` file, set the `MARKET_DATA_PROVIDER` variable:

```env
# For AngelOne
MARKET_DATA_PROVIDER=angelone

# OR for Zerodha Kite Connect
MARKET_DATA_PROVIDER=kite
```

### Step 2: Configure Provider Credentials

#### For AngelOne SmartAPI

```env
MARKET_DATA_PROVIDER=angelone

ANGELONE_API_KEY=your_api_key_here
ANGELONE_CLIENT_CODE=your_client_code_here
ANGELONE_PASSWORD=your_password_here
ANGELONE_TOTP_SECRET=your_totp_secret_here
```

#### For Zerodha Kite Connect

```env
MARKET_DATA_PROVIDER=kite

KITE_API_KEY=your_kite_api_key_here
KITE_API_SECRET=your_kite_api_secret_here
KITE_USER_ID=your_kite_user_id_here
KITE_PASSWORD=your_kite_password_here
KITE_TOTP_SECRET=your_kite_totp_secret_here
```

### Step 3: Install Required Packages

```bash
# For AngelOne
npm install smartapi-javascript

# For Zerodha Kite Connect
npm install kiteconnect

# For TOTP (required for both)
npm install otplib
```

### Step 4: Restart Your Application

```bash
npm start
# or
npm run dev
```

## 📦 Architecture

The system uses a **Factory Pattern** to dynamically load the appropriate market data provider:

```
src/services/v1/
├── marketProviderFactory.js    # Factory to select provider
├── angeloneServices/            # AngelOne implementation
│   ├── angelone.service.js
│   ├── market.service.js
│   ├── stock.service.js
│   └── websocket.service.js
└── kiteServices/                # Kite Connect implementation
    ├── kite.service.js
    ├── market.service.js
    ├── stock.service.js
    └── websocket.service.js
```

## 🔄 How It Works

1. **At Application Startup**: The `marketProviderFactory` reads `MARKET_DATA_PROVIDER` from config
2. **Service Loading**: Loads the appropriate service implementations (AngelOne or Kite)
3. **Unified Interface**: All controllers use the same interface, regardless of provider
4. **Zero Code Changes**: Switch providers by just changing the env variable!

## 💻 Usage in Code

Services are automatically loaded based on configuration:

```javascript
const { 
  providerService,    // angelOneService or kiteService
  marketService,      // market data functions
  stockService,       // stock-related functions
  webSocketService    // real-time data
} = require('./services');

// Example: Get stock price
const price = await stockService.getRealtimeStockPrice('RELIANCE', 'NSE', '2885');

// Works with both providers!
```

## 🔑 Getting API Keys

### AngelOne SmartAPI
1. Visit: https://smartapi.angelbroking.com/
2. Create an account and generate API credentials
3. Enable API access and get TOTP secret

### Zerodha Kite Connect
1. Visit: https://kite.trade/
2. Create a Kite Connect app at: https://developers.kite.trade/
3. Get your API Key and Secret
4. Note your User ID and set up TOTP

## ⚠️ Important Notes

### AngelOne
- ✅ Direct login with credentials possible
- ✅ Automatic session management
- ✅ Real-time WebSocket support
- ✅ No manual authentication flow needed

### Zerodha Kite Connect
- ⚠️ Requires web-based authentication flow
- ⚠️ Access token needs to be manually set after first login
- ✅ Powerful API with extensive features
- ✅ Real-time WebSocket with KiteTicker

## 🔄 Switching Providers

To switch from one provider to another:

1. Update `.env`:
   ```env
   MARKET_DATA_PROVIDER=kite  # Changed from angelone
   ```

2. Add required credentials for new provider

3. Restart application:
   ```bash
   npm restart
   ```

That's it! The application will automatically use the new provider.

## 🐛 Troubleshooting

### Provider Not Loading
- Check `MARKET_DATA_PROVIDER` value in `.env` (must be 'angelone' or 'kite')
- Ensure all required credentials are set
- Check application logs for initialization errors

### Authentication Fails
- Verify API credentials are correct
- For TOTP issues, ensure time sync is correct
- Check if API subscription is active

### WebSocket Issues
- Ensure you're logged in before connecting to WebSocket
- Check if market is open (for live data)
- Verify network/firewall settings

## 📚 API Compatibility

Both providers support:
- ✅ Real-time stock prices
- ✅ Market depth data
- ✅ Historical data (candles)
- ✅ Stock search
- ✅ Holdings
- ✅ WebSocket for live data

## 🎓 Examples

See the documentation:
- AngelOne: `docs/ANGELONE_INTEGRATION.md`
- Kite Connect: Check Kite Connect API docs at https://kite.trade/docs/connect/v3/

## 🤝 Support

For issues or questions:
- AngelOne: https://smartapi.angelbroking.com/docs
- Kite Connect: https://kite.trade/docs/connect/v3/

---

**Pro Tip**: You can keep credentials for both providers in your `.env` file and switch between them anytime by just changing the `MARKET_DATA_PROVIDER` value! 🚀
