# AngelOne SmartAPI Integration - Quick Start Guide

## 🚀 Integration Complete!

AngelOne SmartAPI successfully integrate ho gaya hai aapke stock market simulation app mein!

## 📋 What's Been Implemented

### ✅ Services Created
1. **angelone.service.js** - Login, logout, session management
2. **market.service.js** - Market data functions (LTP, quotes, search, candles)
3. **stock.service.js** - Stock-specific functions (realtime prices, details)
4. **websocket.service.js** - Real-time data streaming via WebSocket

### ✅ REST API Endpoints

#### Stock Endpoints (`/api/v1/stocks/`)
- `GET /price` - Get realtime stock price (IST time-based)
- `GET /details` - Get stock details with market depth
- `POST /multiple` - Get multiple stocks prices at once
- `GET /market-status` - Check if market is open/closed

#### Market Endpoints (`/api/v1/market/`)
- `GET /ltp` - Get Last Traded Price
- `GET /depth` - Get market depth (order book)
- `POST /quotes` - Get quotes for multiple tokens
- `GET /search` - Search stocks by name/symbol
- `POST /candles` - Get historical OHLC data

#### WebSocket Endpoints (`/api/v1/websocket/`)
- `POST /connect` - Connect to WebSocket
- `POST /disconnect` - Disconnect WebSocket
- `POST /subscribe` - Subscribe to real-time data
- `POST /unsubscribe` - Unsubscribe from data
- `GET /status` - Check connection status

### ✅ Utilities
- **marketUtils.js** - IST time checking, market hours validation, data formatting

### ✅ Validations
- All endpoints have proper Joi validation
- Input sanitization and error handling

## 🔧 Setup Steps

### 1. Environment Variables
`.env` file mein apne AngelOne credentials add karein:

```env
ANGELONE_API_KEY=your_api_key
ANGELONE_CLIENT_CODE=your_client_code
ANGELONE_PASSWORD=your_password
ANGELONE_TOTP_SECRET=your_totp_secret
```

### 2. Install Dependencies (Already Done ✅)
```bash
npm install smartapi-javascript ws otplib moment-timezone --legacy-peer-deps
```

### 3. Start Server
```bash
npm run dev
```

## 🧪 Testing

### Test Market Status
```bash
curl http://localhost:3000/api/v1/stocks/market-status
```

### Test Stock Price
```bash
curl "http://localhost:3000/api/v1/stocks/price?symbol=RELIANCE-EQ&exchange=NSE&token=2885"
```

### Test Search
```bash
curl "http://localhost:3000/api/v1/market/search?q=RELIANCE&exchange=NSE"
```

## 📁 File Structure

```
src/
├── config/
│   └── config.js                    ✅ Updated with AngelOne config
│
├── services/
│   └── v1/
│       └── angeloneServices/        ✅ NEW
│           ├── angelone.service.js
│           ├── market.service.js
│           ├── stock.service.js
│           ├── websocket.service.js
│           └── index.js
│
├── controllers/
│   └── v1/
│       ├── stockController/         ✅ NEW
│       ├── marketController/        ✅ NEW
│       └── websocketController/     ✅ NEW
│
├── routes/
│   └── v1/
│       ├── stockRoutes/             ✅ NEW
│       ├── marketRoutes/            ✅ NEW
│       ├── websocketRoutes/         ✅ NEW
│       └── index.js                 ✅ Updated
│
├── validations/
│   └── stock.validation.js          ✅ NEW
│
├── utils/
│   └── marketUtils.js               ✅ NEW
│
└── examples/
    └── angelone.examples.js         ✅ NEW (Testing reference)
```

## 🔑 Key Features

### 1. **Automatic Authentication**
- Services automatically login karte hain jab needed ho
- TOTP generation automatic hai
- Session management built-in

### 2. **Market Hours Detection**
- IST timezone ke basis pe market open/close detect hota hai
- Market hours: 9:15 AM - 3:30 PM (Mon-Fri)

### 3. **Real-time WebSocket**
- Live market data streaming
- Automatic reconnection on disconnect
- Heartbeat to keep connection alive

### 4. **Error Handling**
- Comprehensive error handling in all services
- Proper logging via Winston logger
- User-friendly error messages

### 5. **Input Validation**
- Joi validation for all endpoints
- Exchange validation (NSE, BSE, NFO, MCX, etc.)
- Proper error responses

## 📖 Documentation

Detailed documentation dekhen:
- **ANGELONE_INTEGRATION.md** - Complete API documentation
- **src/examples/angelone.examples.js** - Code examples

## 🎯 Next Steps

1. **Get AngelOne Credentials**
   - AngelOne account create karein
   - SmartAPI activate karein
   - Credentials ko `.env` mein add karein

2. **Test the APIs**
   - Postman collection banaye
   - Example endpoints test karein

3. **Implement Top Gainers/Losers** (Optional)
   - Market data se top performers calculate karein
   - Custom endpoints banaye

4. **Add Nifty/Sensex Indices** (Optional)
   - Index data fetch karne ke functions add karein

## ⚠️ Important Notes

1. **Rate Limits**: AngelOne API ki rate limits exist karti hain
2. **Market Data**: Live data sirf market hours mein milega
3. **TOTP Secret**: Accurate hona chahiye, else login fail
4. **WebSocket**: Production mein proper monitoring setup karein
5. **Credentials**: Kabhi bhi `.env` file ko git mein commit na karein

## 🆘 Troubleshooting

### Login Failed?
- TOTP secret check karein
- Credentials verify karein
- AngelOne account status check karein

### WebSocket Not Connecting?
- Pehle REST API se login test karein
- Session data verify karein
- Network/firewall check karein

### No Market Data?
- Market hours check karein
- Symbol token verify karein
- Exchange code correct hai check karein

## 📞 Support Resources

- AngelOne SmartAPI Docs: https://smartapi.angelbroking.com/docs
- Example Code: `src/examples/angelone.examples.js`
- Integration Guide: `ANGELONE_INTEGRATION.md`

---

**Status: ✅ Ready to Use!**

Bas credentials add karein aur testing start karein! 🚀
