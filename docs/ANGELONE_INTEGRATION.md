# AngelOne SmartAPI Integration Documentation

## Overview

Yeh documentation AngelOne SmartAPI integration ko explain karti hai jo is stock market simulation app mein implement kiya gaya hai. Sirf market data feed ke liye use ho raha hai, trading functionality nahi hai.

## Setup Instructions

### 1. Environment Variables

`.env` file mein following credentials add karein:

```env
ANGELONE_API_KEY=your_angelone_api_key_here
ANGELONE_CLIENT_CODE=your_client_code_here
ANGELONE_PASSWORD=your_password_here
ANGELONE_TOTP_SECRET=your_totp_secret_here
```

### 2. AngelOne Account Setup

1. AngelOne account create karein: https://www.angelone.in/
2. SmartAPI credentials generate karein
3. TOTP secret key setup karein 2FA ke liye
4. API key aur client code ko `.env` mein add karein

## Features Implemented

### 1. Real-time Stock Prices

**Endpoint:** `GET /api/v1/stocks/price`

**Parameters:**
- `symbol`: Trading symbol (e.g., "RELIANCE-EQ")
- `exchange`: Exchange name (NSE, BSE)
- `token`: Symbol token

**Example:**
```bash
GET /api/v1/stocks/price?symbol=RELIANCE-EQ&exchange=NSE&token=2885
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "RELIANCE-EQ",
    "symbolToken": "2885",
    "exchange": "NSE",
    "lastPrice": 2450.50,
    "open": 2440.00,
    "high": 2460.00,
    "low": 2435.00,
    "close": 2445.00,
    "volume": 1234567,
    "marketStatus": "OPEN",
    "timestamp": "2025-12-13 15:30:00",
    "timezone": "Asia/Kolkata"
  }
}
```

### 2. Stock Details with Market Depth

**Endpoint:** `GET /api/v1/stocks/details`

**Parameters:**
- `symbol`: Trading symbol
- `exchange`: Exchange name
- `token`: Symbol token

**Example:**
```bash
GET /api/v1/stocks/details?symbol=TCS-EQ&exchange=NSE&token=11536
```

### 3. Multiple Stocks Prices

**Endpoint:** `POST /api/v1/stocks/multiple`

**Body:**
```json
{
  "stocks": [
    {
      "tradingSymbol": "RELIANCE-EQ",
      "exchange": "NSE",
      "symbolToken": "2885"
    },
    {
      "tradingSymbol": "TCS-EQ",
      "exchange": "NSE",
      "symbolToken": "11536"
    }
  ]
}
```

### 4. Market Status

**Endpoint:** `GET /api/v1/stocks/market-status`

Market open/close status check karne ke liye (IST time basis pe).

### 5. Search Stocks

**Endpoint:** `GET /api/v1/market/search`

**Parameters:**
- `q`: Search query
- `exchange`: Exchange (optional)

**Example:**
```bash
GET /api/v1/market/search?q=RELIANCE&exchange=NSE
```

### 6. Get LTP (Last Traded Price)

**Endpoint:** `GET /api/v1/market/ltp`

### 7. Market Depth

**Endpoint:** `GET /api/v1/market/depth`

Order book aur bid/ask data ke liye.

### 8. Historical Candle Data

**Endpoint:** `POST /api/v1/market/candles`

**Body:**
```json
{
  "exchange": "NSE",
  "token": "2885",
  "interval": "FIVE_MINUTE",
  "fromDate": "2025-12-13 09:15",
  "toDate": "2025-12-13 15:30"
}
```

**Available Intervals:**
- ONE_MINUTE
- THREE_MINUTE
- FIVE_MINUTE
- TEN_MINUTE
- FIFTEEN_MINUTE
- THIRTY_MINUTE
- ONE_HOUR
- ONE_DAY

## WebSocket Integration

Real-time data streaming ke liye WebSocket service implement hai.

### 1. Connect to WebSocket

**Endpoint:** `POST /api/v1/websocket/connect`

### 2. Subscribe to Tokens

**Endpoint:** `POST /api/v1/websocket/subscribe`

**Body:**
```json
{
  "mode": 1,
  "tokens": [
    {
      "exchangeType": 1,
      "tokens": ["2885", "11536"]
    }
  ]
}
```

**Modes:**
- `1`: LTP (Last Traded Price)
- `2`: Quote
- `3`: Snap Quote

**Exchange Types:**
- `1`: NSE
- `2`: NFO
- `3`: BSE
- `4`: MCX
- `5`: CDS

### 3. Unsubscribe from Tokens

**Endpoint:** `POST /api/v1/websocket/unsubscribe`

### 4. WebSocket Status

**Endpoint:** `GET /api/v1/websocket/status`

### 5. Disconnect WebSocket

**Endpoint:** `POST /api/v1/websocket/disconnect`

## Utilities

### Market Time Checking

`isMarketOpen()` function automatically check karta hai ki current IST time mein market open hai ya nahi.

**Market Hours:**
- Monday to Friday
- 9:15 AM to 3:30 PM IST
- Weekends closed

### Data Formatting

Sabhi services mein data formatting utilities use ho rahi hain:
- `formatMarketData()`: Market data ko standardize format mein convert karta hai
- `formatTopMovers()`: Top gainers/losers data format karta hai
- `parseExchange()`: Exchange names ko standardize karta hai

## Service Structure

```
src/
├── services/
│   └── v1/
│       └── angeloneServices/
│           ├── angelone.service.js      # Login, logout, session management
│           ├── market.service.js        # Market data functions
│           ├── stock.service.js         # Stock specific functions
│           ├── websocket.service.js     # WebSocket management
│           └── index.js                 # Export all services
│
├── controllers/
│   └── v1/
│       ├── stockController/
│       ├── marketController/
│       └── websocketController/
│
├── routes/
│   └── v1/
│       ├── stockRoutes/
│       ├── marketRoutes/
│       └── websocketRoutes/
│
└── utils/
    └── marketUtils.js                   # Time, formatting utilities
```

## Authentication Flow

1. `angelone.service.js` automatically login handle karta hai
2. TOTP token generate hota hai `totpSecret` se
3. Session data save hota hai
4. Sabhi API calls automatically ensure karenge ki user logged in hai

## Error Handling

Sabhi services `try-catch` blocks use karti hain aur errors ko logger ke through log karti hain. Errors automatically client ko proper format mein return hoti hain.

## Important Notes

1. **Credentials Security**: `.env` file ko kabhi bhi git mein commit na karein
2. **Rate Limiting**: AngelOne API ki rate limits dhyan mein rakhein
3. **Market Hours**: Market closed hours mein live data nahi milega
4. **WebSocket**: Long-running WebSocket connections ke liye proper error handling aur reconnection logic implement hai
5. **TOTP**: TOTP secret accurate hona chahiye, warna login fail ho jayega

## Testing

```bash
# Development mode run karein
npm run dev

# Test API using curl or Postman
curl http://localhost:3000/api/v1/stocks/market-status
```

## Future Enhancements

1. Top gainers/losers endpoints
2. Index data (Nifty, Sensex)
3. Sector-wise analysis
4. Real-time alerts
5. Portfolio tracking (paper trading ke liye)

## Support

Issues ke liye logger check karein aur AngelOne SmartAPI documentation refer karein:
https://smartapi.angelbroking.com/docs
