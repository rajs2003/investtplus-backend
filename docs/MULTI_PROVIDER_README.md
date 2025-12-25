# 🚀 Multi-Provider Market Data Support

## ✨ What's New?

Tumhara application ab **AngelOne** aur **Zerodha Kite Connect** dono ko support karta hai! Bas `.env` file mein ek variable change karo aur tumhara provider switch ho jayega! 🎉

## 📝 Quick Start

### Step 1: Install Package

```bash
npm install
```

### Step 2: Configure .env

Apni `.env` file mein ye add karo:

#### Option A: AngelOne Use Karna Hai

```env
MARKET_DATA_PROVIDER=angelone

ANGELONE_API_KEY=your_api_key
ANGELONE_CLIENT_CODE=your_client_code
ANGELONE_PASSWORD=your_password
ANGELONE_TOTP_SECRET=your_totp_secret
```

#### Option B: Kite Connect Use Karna Hai

```env
MARKET_DATA_PROVIDER=kite

KITE_API_KEY=your_kite_api_key
KITE_API_SECRET=your_kite_api_secret
KITE_USER_ID=your_user_id
KITE_PASSWORD=your_password
KITE_TOTP_SECRET=your_totp_secret
```

### Step 3: Start Application

```bash
npm start
# ya
npm run dev
```

## 🎯 Switching Providers

Provider change karna bahut easy hai:

1. `.env` file kholo
2. `MARKET_DATA_PROVIDER` ki value change karo (`angelone` ya `kite`)
3. Application restart karo
4. Done! ✅

## 📁 Project Structure

```
src/services/v1/
├── marketProviderFactory.js     # Provider selector
├── angeloneServices/             # AngelOne services
│   ├── angelone.service.js
│   ├── market.service.js
│   ├── stock.service.js
│   └── websocket.service.js
└── kiteServices/                 # Kite Connect services
    ├── kite.service.js
    ├── market.service.js
    ├── stock.service.js
    └── websocket.service.js
```

## 🔥 Features

- ✅ **Dynamic Provider Loading**: Automatically loads correct provider based on config
- ✅ **Unified Interface**: Same code works with both providers
- ✅ **Hot Switching**: Change provider without code changes
- ✅ **Backward Compatible**: Existing code still works
- ✅ **Factory Pattern**: Clean architecture with provider factory

## 📖 Detailed Documentation

Complete guide dekho: [MARKET_PROVIDER_SETUP.md](./MARKET_PROVIDER_SETUP.md)

## 🎓 Usage Example

```javascript
const { stockService, marketService } = require('./services');

// Get stock price - works with both AngelOne and Kite!
const price = await stockService.getRealtimeStockPrice('RELIANCE', 'NSE', '2885');

// Get market data
const marketData = await marketService.getLTP('NSE', '2885', 'RELIANCE');

// WebSocket real-time data
const { webSocketService } = require('./services');
await webSocketService.connect();
await webSocketService.subscribe(['2885'], (data) => {
  console.log('Real-time data:', data);
});
```

## 🛠️ Configuration Files Modified

1. ✅ `src/config/config.js` - Added provider config
2. ✅ `src/services/v1/marketProviderFactory.js` - New factory
3. ✅ `src/services/v1/kiteServices/*` - New Kite services
4. ✅ `src/services/index.js` - Dynamic service exports
5. ✅ `.env.example` - Updated with both providers
6. ✅ `package.json` - Added kiteconnect package

## ⚡ Performance

- No overhead when using single provider
- Services loaded only once at startup
- Zero runtime provider detection cost

## 🤝 Contributing

Agar koi issue hai ya suggestion hai, feel free to create an issue!

## 📞 Support

Questions? Check:
- [Market Provider Setup Guide](./MARKET_PROVIDER_SETUP.md)
- [AngelOne Integration](./ANGELONE_INTEGRATION.md)
- Kite Connect Docs: https://kite.trade/docs/connect/v3/

---

**Made with ❤️ for easy provider switching!**
