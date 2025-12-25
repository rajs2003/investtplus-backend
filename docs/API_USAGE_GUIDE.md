# 📘 AngelOne SmartAPI - Complete Usage Guide

## 🎯 Overview

Yeh guide aapko step-by-step batayegi ki AngelOne SmartAPI integration ka use kaise karein apne stock market simulation app mein.

---

## 🔧 Initial Setup

### 1. Environment Variables Setup

Sabse pehle `.env` file mein apne AngelOne credentials add karein:

```env
# AngelOne SmartAPI Configuration
ANGELONE_API_KEY=your_api_key_here
ANGELONE_CLIENT_CODE=A123456
ANGELONE_PASSWORD=your_password
ANGELONE_TOTP_SECRET=JBSWY3DPEHPK3PXP
```

**Credentials kaise milenge:**
1. AngelOne account banao: https://www.angelone.in/
2. SmartAPI activate karo
3. API Key generate karo
4. TOTP Secret setup karo (Google Authenticator ya similar app use karke)

### 2. Server Start Karo

```bash
npm run dev
```

Server `http://localhost:3000` pe start ho jayega.

---

## 📊 API Endpoints Usage

### Base URL
```
http://localhost:3000/api/v1
```

---

## 1️⃣ Stock Price APIs

### 1.1 Realtime Stock Price (IST Based)

**Endpoint:** `GET /stocks/price`

**Use Case:** Kisi bhi stock ka current price dekhna hai, IST time ke according.

**Parameters:**
- `symbol` (required): Trading symbol (e.g., "RELIANCE-EQ")
- `exchange` (required): Exchange name (NSE, BSE, NFO, MCX, CDS, BFO)
- `token` (required): Symbol token

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/stocks/price?symbol=RELIANCE-EQ&exchange=NSE&token=2885"
```

**Example Response:**
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

**JavaScript Example:**
```javascript
const axios = require('axios');

async function getStockPrice(symbol, exchange, token) {
  try {
    const response = await axios.get('http://localhost:3000/api/v1/stocks/price', {
      params: { symbol, exchange, token }
    });
    
    console.log('Stock Price:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage
getStockPrice('RELIANCE-EQ', 'NSE', '2885');
```

---

### 1.2 Stock Details with Market Depth

**Endpoint:** `GET /stocks/details`

**Use Case:** Stock ka complete detail chahiye including order book (market depth).

**Parameters:**
- `symbol` (required)
- `exchange` (required)
- `token` (required)

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/stocks/details?symbol=TCS-EQ&exchange=NSE&token=11536"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "TCS-EQ",
    "symbolToken": "11536",
    "exchange": "NSE",
    "lastPrice": 3250.75,
    "open": 3240.00,
    "high": 3270.00,
    "low": 3230.00,
    "close": 3245.00,
    "volume": 987654,
    "averagePrice": 3250.30,
    "upperCircuitLimit": 3568.95,
    "lowerCircuitLimit": 2921.05,
    "marketDepth": {
      "buy": [...],
      "sell": [...]
    },
    "marketStatus": "OPEN",
    "timestamp": "2025-12-13 15:30:00",
    "timezone": "Asia/Kolkata"
  }
}
```

---

### 1.3 Multiple Stocks Prices

**Endpoint:** `POST /stocks/multiple`

**Use Case:** Ek hi request mein multiple stocks ka price fetch karna.

**Request Body:**
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
    },
    {
      "tradingSymbol": "INFY-EQ",
      "exchange": "NSE",
      "symbolToken": "1594"
    }
  ]
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v1/stocks/multiple \
  -H "Content-Type: application/json" \
  -d '{
    "stocks": [
      {"tradingSymbol": "RELIANCE-EQ", "exchange": "NSE", "symbolToken": "2885"},
      {"tradingSymbol": "TCS-EQ", "exchange": "NSE", "symbolToken": "11536"}
    ]
  }'
```

**JavaScript Example:**
```javascript
async function getMultipleStocksPrices(stocks) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/v1/stocks/multiple',
      { stocks }
    );
    
    console.log('Multiple Stocks:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage
getMultipleStocksPrices([
  { tradingSymbol: 'RELIANCE-EQ', exchange: 'NSE', symbolToken: '2885' },
  { tradingSymbol: 'TCS-EQ', exchange: 'NSE', symbolToken: '11536' }
]);
```

---

### 1.4 Market Status

**Endpoint:** `GET /stocks/market-status`

**Use Case:** Check karna hai ki market open hai ya close (IST time ke basis pe).

**Example Request:**
```bash
curl http://localhost:3000/api/v1/stocks/market-status
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "isOpen": true,
    "status": "OPEN",
    "timezone": "Asia/Kolkata"
  }
}
```

**Market Hours:**
- **Open:** 9:15 AM - 3:30 PM IST
- **Days:** Monday to Friday
- **Closed:** Weekends and public holidays

---

## 2️⃣ Market Data APIs

### 2.1 Last Traded Price (LTP)

**Endpoint:** `GET /market/ltp`

**Use Case:** Sirf last traded price chahiye, baki details nahi.

**Parameters:**
- `exchange` (required)
- `token` (required)
- `symbol` (optional)

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/market/ltp?exchange=NSE&token=2885&symbol=RELIANCE-EQ"
```

---

### 2.2 Market Depth (Order Book)

**Endpoint:** `GET /market/depth`

**Use Case:** Stock ka order book dekhna hai (bid/ask prices).

**Parameters:**
- `exchange` (required)
- `token` (required)

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/market/depth?exchange=NSE&token=2885"
```

---

### 2.3 Get Quotes for Multiple Tokens

**Endpoint:** `POST /market/quotes`

**Use Case:** Same exchange ke multiple stocks ka quote ek sath fetch karna.

**Request Body:**
```json
{
  "exchange": "NSE",
  "tokens": ["2885", "11536", "1594"]
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v1/market/quotes \
  -H "Content-Type: application/json" \
  -d '{"exchange": "NSE", "tokens": ["2885", "11536"]}'
```

---

### 2.4 Search Stocks

**Endpoint:** `GET /market/search`

**Use Case:** Stock ka symbol ya token nahi pata, naam se search karna hai.

**Parameters:**
- `q` (required): Search query
- `exchange` (optional): Specific exchange mein search karna

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/market/search?q=RELIANCE&exchange=NSE"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "RELIANCE-EQ",
      "name": "Reliance Industries Ltd",
      "token": "2885",
      "exchange": "NSE",
      "instrumentType": "EQ"
    }
  ]
}
```

**JavaScript Example:**
```javascript
async function searchStock(query, exchange = '') {
  try {
    const response = await axios.get('http://localhost:3000/api/v1/market/search', {
      params: { q: query, exchange }
    });
    
    console.log('Search Results:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage
searchStock('RELIANCE', 'NSE');
```

---

### 2.5 Historical Candle Data (OHLC)

**Endpoint:** `POST /market/candles`

**Use Case:** Historical data chahiye for charts and analysis.

**Request Body:**
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
- `ONE_MINUTE`
- `THREE_MINUTE`
- `FIVE_MINUTE`
- `TEN_MINUTE`
- `FIFTEEN_MINUTE`
- `THIRTY_MINUTE`
- `ONE_HOUR`
- `ONE_DAY`

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v1/market/candles \
  -H "Content-Type: application/json" \
  -d '{
    "exchange": "NSE",
    "token": "2885",
    "interval": "FIVE_MINUTE",
    "fromDate": "2025-12-13 09:15",
    "toDate": "2025-12-13 15:30"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-12-13 09:15:00",
      "open": 2440.00,
      "high": 2445.00,
      "low": 2438.00,
      "close": 2442.50,
      "volume": 12345
    },
    // ... more candles
  ]
}
```

---

## 3️⃣ WebSocket APIs (Real-time Streaming)

### 3.1 Connect to WebSocket

**Endpoint:** `POST /websocket/connect`

**Use Case:** Real-time data streaming ke liye WebSocket connection establish karna.

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v1/websocket/connect
```

**Example Response:**
```json
{
  "success": true,
  "message": "WebSocket connected successfully"
}
```

---

### 3.2 Subscribe to Real-time Data

**Endpoint:** `POST /websocket/subscribe`

**Use Case:** Specific stocks ka live data stream karna.

**Request Body:**
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

**Mode Types:**
- `1`: LTP (Last Traded Price)
- `2`: Quote (OHLC + LTP)
- `3`: Snap Quote (Full market depth)

**Exchange Types:**
- `1`: NSE
- `2`: NFO
- `3`: BSE
- `4`: MCX
- `5`: CDS

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v1/websocket/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "mode": 1,
    "tokens": [
      {
        "exchangeType": 1,
        "tokens": ["2885", "11536"]
      }
    ]
  }'
```

**JavaScript Example (Complete WebSocket Flow):**
```javascript
const axios = require('axios');

class StockWebSocket {
  async connect() {
    try {
      const response = await axios.post('http://localhost:3000/api/v1/websocket/connect');
      console.log('Connected:', response.data);
      return response.data;
    } catch (error) {
      console.error('Connection Error:', error.response?.data);
    }
  }

  async subscribe(mode, tokens) {
    try {
      const response = await axios.post('http://localhost:3000/api/v1/websocket/subscribe', {
        mode,
        tokens
      });
      console.log('Subscribed:', response.data);
      return response.data;
    } catch (error) {
      console.error('Subscribe Error:', error.response?.data);
    }
  }

  async unsubscribe(mode, tokens) {
    try {
      const response = await axios.post('http://localhost:3000/api/v1/websocket/unsubscribe', {
        mode,
        tokens
      });
      console.log('Unsubscribed:', response.data);
      return response.data;
    } catch (error) {
      console.error('Unsubscribe Error:', error.response?.data);
    }
  }

  async disconnect() {
    try {
      const response = await axios.post('http://localhost:3000/api/v1/websocket/disconnect');
      console.log('Disconnected:', response.data);
      return response.data;
    } catch (error) {
      console.error('Disconnect Error:', error.response?.data);
    }
  }

  async getStatus() {
    try {
      const response = await axios.get('http://localhost:3000/api/v1/websocket/status');
      console.log('Status:', response.data);
      return response.data;
    } catch (error) {
      console.error('Status Error:', error.response?.data);
    }
  }
}

// Usage
async function main() {
  const ws = new StockWebSocket();
  
  // Connect
  await ws.connect();
  
  // Subscribe to Reliance and TCS
  await ws.subscribe(1, [
    { exchangeType: 1, tokens: ['2885', '11536'] }
  ]);
  
  // Check status
  await ws.getStatus();
  
  // After some time, unsubscribe
  setTimeout(async () => {
    await ws.unsubscribe(1, [
      { exchangeType: 1, tokens: ['2885', '11536'] }
    ]);
    await ws.disconnect();
  }, 30000); // 30 seconds
}

main();
```

---

### 3.3 Unsubscribe from Data

**Endpoint:** `POST /websocket/unsubscribe`

**Request Body:** Same as subscribe

---

### 3.4 Check WebSocket Status

**Endpoint:** `GET /websocket/status`

**Example Request:**
```bash
curl http://localhost:3000/api/v1/websocket/status
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "status": "CONNECTED"
  }
}
```

---

### 3.5 Disconnect WebSocket

**Endpoint:** `POST /websocket/disconnect`

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v1/websocket/disconnect
```

---

## 🔍 Common Stock Symbols & Tokens

| Stock Name | Symbol | Exchange | Token |
|------------|--------|----------|-------|
| Reliance Industries | RELIANCE-EQ | NSE | 2885 |
| TCS | TCS-EQ | NSE | 11536 |
| Infosys | INFY-EQ | NSE | 1594 |
| HDFC Bank | HDFCBANK-EQ | NSE | 1333 |
| ITC | ITC-EQ | NSE | 424 |

**Note:** Symbol token find karne ke liye `/market/search` API use karein.

---

## 📱 Frontend Integration Examples

### React Example

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

function StockPrice() {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/v1/stocks/price', {
          params: {
            symbol: 'RELIANCE-EQ',
            exchange: 'NSE',
            token: '2885'
          }
        });
        setPrice(response.data.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{price.symbol}</h2>
      <p>Price: ₹{price.lastPrice}</p>
      <p>Status: {price.marketStatus}</p>
      <p>Volume: {price.volume}</p>
    </div>
  );
}
```

---

## ⚠️ Error Handling

### Common Errors

**1. Missing Parameters**
```json
{
  "success": false,
  "message": "Missing required parameters: symbol, exchange, token"
}
```

**2. Invalid Exchange**
```json
{
  "success": false,
  "message": "Validation Error: exchange must be one of [NSE, BSE, NFO, MCX, CDS, BFO]"
}
```

**3. Authentication Error**
```json
{
  "success": false,
  "message": "Login failed: Invalid credentials"
}
```

**4. Market Closed**
- API will still work but data may be stale
- Check `marketStatus` field in response

---

## 🎯 Best Practices

### 1. Rate Limiting
AngelOne API has rate limits. For production:
- Cache responses when possible
- Batch requests using `/stocks/multiple` endpoint
- Use WebSocket for real-time data instead of polling

### 2. Error Handling
Always wrap API calls in try-catch:
```javascript
try {
  const response = await axios.get(url);
  // Handle success
} catch (error) {
  if (error.response) {
    // API returned error
    console.error('API Error:', error.response.data);
  } else {
    // Network error
    console.error('Network Error:', error.message);
  }
}
```

### 3. Market Hours Check
Pehle market status check karo before making bulk requests:
```javascript
const status = await axios.get('http://localhost:3000/api/v1/stocks/market-status');
if (status.data.data.isOpen) {
  // Fetch live data
} else {
  // Use cached data or show message
}
```

### 4. WebSocket Connection Management
- Single WebSocket connection use karo
- Automatically reconnect on disconnect
- Unsubscribe when component unmounts

---

## 🔐 Security Notes

1. **Environment Variables:** Kabhi bhi credentials ko hardcode na karein
2. **API Keys:** Production mein proper secrets management use karein
3. **CORS:** Production mein proper CORS configuration setup karein
4. **Rate Limiting:** Client-side rate limiting implement karein

---

## 🐛 Troubleshooting

### Problem: Login Failed
**Solution:** 
- Check TOTP secret is correct
- Verify credentials in .env file
- Check AngelOne account status

### Problem: WebSocket Not Connecting
**Solution:**
- First call `/websocket/connect` endpoint
- Check session is valid
- Verify network/firewall settings

### Problem: No Data During Market Hours
**Solution:**
- Verify symbol token is correct
- Use `/market/search` to find correct token
- Check exchange is correct

---

## 📞 Support

- **Documentation:** `/docs` folder
- **API Reference:** `ANGELONE_INTEGRATION.md`
- **Examples:** `src/examples/angelone.examples.js`
- **AngelOne Docs:** https://smartapi.angelbroking.com/docs

---

## ✅ Quick Testing Checklist

```bash
# 1. Check market status
curl http://localhost:3000/api/v1/stocks/market-status

# 2. Get stock price
curl "http://localhost:3000/api/v1/stocks/price?symbol=RELIANCE-EQ&exchange=NSE&token=2885"

# 3. Search for a stock
curl "http://localhost:3000/api/v1/market/search?q=RELIANCE&exchange=NSE"

# 4. Get multiple stocks
curl -X POST http://localhost:3000/api/v1/stocks/multiple \
  -H "Content-Type: application/json" \
  -d '{"stocks":[{"tradingSymbol":"RELIANCE-EQ","exchange":"NSE","symbolToken":"2885"}]}'

# 5. Connect WebSocket
curl -X POST http://localhost:3000/api/v1/websocket/connect

# 6. Check WebSocket status
curl http://localhost:3000/api/v1/websocket/status
```

---

**Happy Trading! 🚀📈**
