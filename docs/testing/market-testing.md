# Market Data API Testing Guide

## Overview
This document provides comprehensive testing scenarios for all market data endpoints in the InvesttPlus Backend API. The market module handles real-time stock data, price information, market depth, quotes, candlestick data, and stock search functionality.

## Base URL
```
http://localhost:3000/v1/market
```

## Authentication
All market endpoints require authentication.
```
Authorization: Bearer {accessToken}
```

---

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/ltp` | GET | Yes | Get Last Traded Price |
| `/depth` | GET | Yes | Get Market Depth (Order Book) |
| `/quotes` | POST | Yes | Get Full Quotes for Multiple Stocks |
| `/search` | GET | Yes | Search Stocks by Name/Symbol |
| `/candles` | POST | Yes | Get Candlestick/OHLC Data |

---

## 1. Get Last Traded Price (LTP)

### Endpoint
```
GET /v1/market/ltp
```

### Query Parameters
- **exchange**: Required, string (e.g., "NSE", "BSE", "NFO")
- **token**: Required, string (stock token/instrument token)
- **symbol**: Optional, string (stock symbol for reference)

### Request Example
```
GET /v1/market/ltp?exchange=NSE&token=3045&symbol=SBIN
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "ltp": 625.50,
    "timestamp": "2025-12-24T10:30:00.000Z"
  }
}
```

### Error Responses
```json
// 400 - Missing Required Parameters
{
  "code": 400,
  "message": "\"exchange\" is required"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}

// 404 - Stock Not Found
{
  "code": 404,
  "message": "Stock not found"
}
```

### cURL Command
```bash
curl -X GET "http://localhost:3000/v1/market/ltp?exchange=NSE&token=3045&symbol=SBIN" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 2. Get Market Depth

### Endpoint
```
GET /v1/market/depth
```

### Query Parameters
- **exchange**: Required, string (e.g., "NSE", "BSE", "NFO")
- **token**: Required, string (stock token/instrument token)
- **symbol**: Optional, string (stock symbol for reference)

### Request Example
```
GET /v1/market/depth?exchange=NSE&token=3045&symbol=SBIN
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "depth": {
      "buy": [
        {
          "price": 625.45,
          "quantity": 500,
          "orders": 5
        },
        {
          "price": 625.40,
          "quantity": 1200,
          "orders": 8
        },
        {
          "price": 625.35,
          "quantity": 800,
          "orders": 6
        },
        {
          "price": 625.30,
          "quantity": 1500,
          "orders": 12
        },
        {
          "price": 625.25,
          "quantity": 2000,
          "orders": 15
        }
      ],
      "sell": [
        {
          "price": 625.50,
          "quantity": 600,
          "orders": 7
        },
        {
          "price": 625.55,
          "quantity": 900,
          "orders": 9
        },
        {
          "price": 625.60,
          "quantity": 1100,
          "orders": 10
        },
        {
          "price": 625.65,
          "quantity": 1800,
          "orders": 14
        },
        {
          "price": 625.70,
          "quantity": 2200,
          "orders": 18
        }
      ]
    },
    "timestamp": "2025-12-24T10:30:00.000Z"
  }
}
```

### Error Responses
```json
// 400 - Missing Required Parameters
{
  "code": 400,
  "message": "\"token\" is required"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Command
```bash
curl -X GET "http://localhost:3000/v1/market/depth?exchange=NSE&token=3045&symbol=SBIN" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3. Get Stock Quotes

### Endpoint
```
POST /v1/market/quotes
```

### Request Body
```json
{
  "exchange": "NSE",
  "tokens": ["3045", "1660", "2885"]
}
```

### Field Validations
- **exchange**: Required, string (e.g., "NSE", "BSE", "NFO")
- **tokens**: Required, array of strings (stock tokens)

### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "exchange": "NSE",
      "token": "3045",
      "symbol": "SBIN",
      "ltp": 625.50,
      "open": 623.00,
      "high": 628.00,
      "low": 622.50,
      "close": 624.00,
      "volume": 15678900,
      "change": 1.50,
      "changePercent": 0.24,
      "timestamp": "2025-12-24T10:30:00.000Z"
    },
    {
      "exchange": "NSE",
      "token": "1660",
      "symbol": "TATASTEEL",
      "ltp": 142.35,
      "open": 141.00,
      "high": 143.50,
      "low": 140.80,
      "close": 141.50,
      "volume": 23456780,
      "change": 0.85,
      "changePercent": 0.60,
      "timestamp": "2025-12-24T10:30:00.000Z"
    },
    {
      "exchange": "NSE",
      "token": "2885",
      "symbol": "RELIANCE",
      "ltp": 2456.75,
      "open": 2450.00,
      "high": 2465.00,
      "low": 2448.00,
      "close": 2455.00,
      "volume": 8901234,
      "change": 1.75,
      "changePercent": 0.07,
      "timestamp": "2025-12-24T10:30:00.000Z"
    }
  ]
}
```

### Error Responses
```json
// 400 - Missing Required Fields
{
  "code": 400,
  "message": "\"tokens\" is required"
}

// 400 - Invalid Tokens Format
{
  "code": 400,
  "message": "\"tokens\" must be an array"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/v1/market/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "exchange": "NSE",
    "tokens": ["3045", "1660", "2885"]
  }'
```

---

## 4. Search Stocks

### Endpoint
```
GET /v1/market/search
```

### Query Parameters
- **q**: Required, string (search query - stock name or symbol)
- **exchange**: Optional, string (filter by exchange - "NSE", "BSE", "NFO")

### Request Example
```
GET /v1/market/search?q=RELIANCE&exchange=NSE
```

### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "token": "2885",
      "symbol": "RELIANCE",
      "name": "Reliance Industries Ltd",
      "exchange": "NSE",
      "instrumentType": "EQ",
      "isin": "INE002A01018",
      "lotSize": 1
    },
    {
      "token": "500325",
      "symbol": "RELIANCE",
      "name": "Reliance Industries Ltd",
      "exchange": "BSE",
      "instrumentType": "EQ",
      "isin": "INE002A01018",
      "lotSize": 1
    }
  ],
  "totalResults": 2
}
```

### Search by Partial Name
```
GET /v1/market/search?q=TATA
```

### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "token": "1660",
      "symbol": "TATASTEEL",
      "name": "Tata Steel Ltd",
      "exchange": "NSE",
      "instrumentType": "EQ",
      "isin": "INE081A01012",
      "lotSize": 1
    },
    {
      "token": "3456",
      "symbol": "TATAMOTORS",
      "name": "Tata Motors Ltd",
      "exchange": "NSE",
      "instrumentType": "EQ",
      "isin": "INE155A01022",
      "lotSize": 1
    },
    {
      "token": "6514",
      "symbol": "TCS",
      "name": "Tata Consultancy Services Ltd",
      "exchange": "NSE",
      "instrumentType": "EQ",
      "isin": "INE467B01029",
      "lotSize": 1
    }
  ],
  "totalResults": 3
}
```

### Error Responses
```json
// 400 - Missing Search Query
{
  "code": 400,
  "message": "\"q\" is required"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}

// 404 - No Results Found
{
  "code": 404,
  "message": "No stocks found matching your search"
}
```

### cURL Command
```bash
# Search by symbol
curl -X GET "http://localhost:3000/v1/market/search?q=RELIANCE&exchange=NSE" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Search by partial name
curl -X GET "http://localhost:3000/v1/market/search?q=TATA" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 5. Get Candlestick Data (OHLC)

### Endpoint
```
POST /v1/market/candles
```

### Request Body
```json
{
  "exchange": "NSE",
  "token": "3045",
  "interval": "5minute",
  "fromDate": "2025-12-20T00:00:00.000Z",
  "toDate": "2025-12-24T23:59:59.000Z"
}
```

### Field Validations
- **exchange**: Required, string (e.g., "NSE", "BSE", "NFO")
- **token**: Required, string (stock token)
- **interval**: Required, string (e.g., "1minute", "5minute", "15minute", "30minute", "60minute", "day")
- **fromDate**: Required, ISO date string
- **toDate**: Required, ISO date string

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "interval": "5minute",
    "candles": [
      {
        "timestamp": "2025-12-24T09:15:00.000Z",
        "open": 623.00,
        "high": 624.50,
        "low": 622.80,
        "close": 624.00,
        "volume": 156789
      },
      {
        "timestamp": "2025-12-24T09:20:00.000Z",
        "open": 624.00,
        "high": 625.20,
        "low": 623.50,
        "close": 625.00,
        "volume": 178900
      },
      {
        "timestamp": "2025-12-24T09:25:00.000Z",
        "open": 625.00,
        "high": 626.00,
        "low": 624.50,
        "close": 625.50,
        "volume": 198765
      },
      {
        "timestamp": "2025-12-24T09:30:00.000Z",
        "open": 625.50,
        "high": 626.50,
        "low": 625.00,
        "close": 626.00,
        "volume": 210345
      }
    ],
    "fromDate": "2025-12-20T00:00:00.000Z",
    "toDate": "2025-12-24T23:59:59.000Z"
  }
}
```

### Available Intervals
- `1minute` - 1 minute candles
- `5minute` - 5 minute candles
- `15minute` - 15 minute candles
- `30minute` - 30 minute candles
- `60minute` - 1 hour candles
- `day` - Daily candles

### Error Responses
```json
// 400 - Missing Required Fields
{
  "code": 400,
  "message": "\"interval\" is required"
}

// 400 - Invalid Interval
{
  "code": 400,
  "message": "\"interval\" must be one of [1minute, 5minute, 15minute, 30minute, 60minute, day]"
}

// 400 - Invalid Date Range
{
  "code": 400,
  "message": "\"toDate\" must be greater than \"fromDate\""
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/v1/market/candles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "exchange": "NSE",
    "token": "3045",
    "interval": "5minute",
    "fromDate": "2025-12-20T00:00:00.000Z",
    "toDate": "2025-12-24T23:59:59.000Z"
  }'
```

---

## Test Cases

### TC-MARKET-01: Get LTP for Valid Stock
**Objective**: Verify LTP retrieval for valid stock  
**Pre-conditions**: User authenticated, valid stock token  
**Steps**:
1. Send GET request to `/ltp` with NSE exchange and valid token
2. Verify response status is 200
3. Verify LTP value is returned
4. Verify timestamp is present

**Expected Result**: LTP data returned successfully

---

### TC-MARKET-02: Get LTP without Exchange
**Objective**: Verify exchange parameter is required  
**Steps**:
1. Send GET request without exchange parameter
2. Verify response status is 400
3. Verify error message indicates missing exchange

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-03: Get LTP without Token
**Objective**: Verify token parameter is required  
**Steps**:
1. Send GET request without token parameter
2. Verify response status is 400
3. Verify error message indicates missing token

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-04: Get LTP without Authentication
**Objective**: Verify authentication is required  
**Steps**:
1. Send GET request without Authorization header
2. Verify response status is 401
3. Verify authentication error

**Expected Result**: Request rejected with unauthorized error

---

### TC-MARKET-05: Get LTP for Invalid Token
**Objective**: Verify error handling for non-existent stock  
**Steps**:
1. Send GET request with invalid/non-existent token
2. Verify response status is 404
3. Verify error message

**Expected Result**: Request rejected with not found error

---

### TC-MARKET-06: Get Market Depth for Valid Stock
**Objective**: Verify market depth retrieval  
**Pre-conditions**: User authenticated, valid stock token  
**Steps**:
1. Send GET request to `/depth` with valid parameters
2. Verify response status is 200
3. Verify buy orders array is present (5 levels)
4. Verify sell orders array is present (5 levels)
5. Verify each level has price, quantity, orders

**Expected Result**: Market depth data returned with buy/sell orders

---

### TC-MARKET-07: Market Depth without Parameters
**Objective**: Verify required parameters for market depth  
**Steps**:
1. Send GET request without exchange or token
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Request rejected with missing parameter error

---

### TC-MARKET-08: Get Quotes for Single Stock
**Objective**: Verify quotes retrieval for single stock  
**Pre-conditions**: User authenticated  
**Steps**:
1. Send POST request to `/quotes` with single token
2. Verify response status is 200
3. Verify quote data includes ltp, open, high, low, close, volume
4. Verify change and changePercent calculated

**Expected Result**: Full quote data returned for stock

---

### TC-MARKET-09: Get Quotes for Multiple Stocks
**Objective**: Verify batch quotes retrieval  
**Pre-conditions**: User authenticated  
**Steps**:
1. Send POST request with array of 5-10 tokens
2. Verify response status is 200
3. Verify response contains data for all tokens
4. Verify each stock has complete quote data

**Expected Result**: Quotes returned for all requested stocks

---

### TC-MARKET-10: Get Quotes without Tokens
**Objective**: Verify tokens parameter is required  
**Steps**:
1. Send POST request without tokens field
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-11: Get Quotes with Empty Tokens Array
**Objective**: Verify tokens array validation  
**Steps**:
1. Send POST request with empty tokens array
2. Verify response status is 400
3. Verify error indicates empty array not allowed

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-12: Get Quotes with Invalid Token Format
**Objective**: Verify token format validation  
**Steps**:
1. Send POST request with non-string tokens
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-13: Search Stock by Exact Symbol
**Objective**: Verify stock search by exact symbol  
**Pre-conditions**: User authenticated  
**Steps**:
1. Send GET request to `/search` with exact symbol (e.g., "RELIANCE")
2. Verify response status is 200
3. Verify matching stocks returned
4. Verify each result has token, symbol, name, exchange

**Expected Result**: Stock found with complete details

---

### TC-MARKET-14: Search Stock by Partial Name
**Objective**: Verify stock search by partial match  
**Pre-conditions**: User authenticated  
**Steps**:
1. Send GET request with partial name (e.g., "TATA")
2. Verify response status is 200
3. Verify multiple matching stocks returned
4. Verify all results contain search term

**Expected Result**: All matching stocks returned

---

### TC-MARKET-15: Search Stock with Exchange Filter
**Objective**: Verify exchange filtering in search  
**Pre-conditions**: User authenticated  
**Steps**:
1. Send GET request with query and exchange="NSE"
2. Verify response status is 200
3. Verify all results are from NSE only

**Expected Result**: Only NSE stocks returned

---

### TC-MARKET-16: Search without Query Parameter
**Objective**: Verify query parameter is required  
**Steps**:
1. Send GET request without 'q' parameter
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-17: Search with No Results
**Objective**: Verify handling of no search results  
**Steps**:
1. Send GET request with non-existent stock name
2. Verify response status is 404
3. Verify error message indicates no results

**Expected Result**: Not found error with appropriate message

---

### TC-MARKET-18: Search Case Insensitivity
**Objective**: Verify search is case-insensitive  
**Pre-conditions**: User authenticated  
**Steps**:
1. Search with lowercase "reliance"
2. Search with uppercase "RELIANCE"
3. Search with mixed case "ReLiAnCe"
4. Verify all return same results

**Expected Result**: All searches return identical results

---

### TC-MARKET-19: Get 5-Minute Candles
**Objective**: Verify 5-minute candlestick data retrieval  
**Pre-conditions**: User authenticated  
**Steps**:
1. Send POST request to `/candles` with interval="5minute"
2. Verify response status is 200
3. Verify candles array returned
4. Verify each candle has timestamp, open, high, low, close, volume
5. Verify timestamps are 5 minutes apart

**Expected Result**: 5-minute candles returned correctly

---

### TC-MARKET-20: Get Daily Candles
**Objective**: Verify daily candlestick data retrieval  
**Pre-conditions**: User authenticated  
**Steps**:
1. Send POST request with interval="day"
2. Verify response status is 200
3. Verify daily candles returned
4. Verify timestamps are 1 day apart

**Expected Result**: Daily candles returned correctly

---

### TC-MARKET-21: Get Candles for Date Range
**Objective**: Verify date range filtering  
**Pre-conditions**: User authenticated  
**Steps**:
1. Send POST request with fromDate and toDate (1 week range)
2. Verify response status is 200
3. Verify all candles are within date range
4. Verify no candles outside range

**Expected Result**: Only candles within range returned

---

### TC-MARKET-22: Candles without Required Fields
**Objective**: Verify all required fields validated  
**Steps**:
1. Send POST request missing exchange, token, or interval
2. Verify response status is 400
3. Verify validation error for missing field

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-23: Candles with Invalid Interval
**Objective**: Verify interval validation  
**Steps**:
1. Send POST request with invalid interval (e.g., "10minute")
2. Verify response status is 400
3. Verify error lists valid interval options

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-24: Candles with Invalid Date Range
**Objective**: Verify date range validation  
**Steps**:
1. Send POST request with toDate before fromDate
2. Verify response status is 400
3. Verify error indicates invalid date range

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-25: Candles with Invalid Date Format
**Objective**: Verify date format validation  
**Steps**:
1. Send POST request with non-ISO date format
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Request rejected with validation error

---

### TC-MARKET-26: LTP for Multiple Exchanges
**Objective**: Verify LTP retrieval across exchanges  
**Pre-conditions**: User authenticated  
**Steps**:
1. Get LTP for stock on NSE
2. Get LTP for same stock on BSE
3. Verify both return successfully
4. Verify prices may differ between exchanges

**Expected Result**: LTP returned for both exchanges independently

---

### TC-MARKET-27: Market Depth Bid-Ask Spread
**Objective**: Verify market depth shows proper bid-ask spread  
**Pre-conditions**: User authenticated  
**Steps**:
1. Get market depth for liquid stock
2. Verify highest buy price < lowest sell price
3. Verify orders are sorted by price
4. Calculate spread = lowest sell - highest buy

**Expected Result**: Valid bid-ask spread with sorted orders

---

### TC-MARKET-28: Quotes Performance with Large Batch
**Objective**: Verify quotes endpoint handles large requests  
**Pre-conditions**: User authenticated  
**Steps**:
1. Send POST request with 50 tokens
2. Verify response status is 200
3. Verify response time is acceptable (<2 seconds)
4. Verify all 50 quotes returned

**Expected Result**: All quotes returned within acceptable time

---

### TC-MARKET-29: Real-time Data Freshness
**Objective**: Verify data is real-time/recent  
**Pre-conditions**: User authenticated, market hours  
**Steps**:
1. Get LTP for active stock
2. Check timestamp in response
3. Verify timestamp is within last 5 seconds
4. Wait 10 seconds and request again
5. Verify LTP or timestamp updated

**Expected Result**: Data is recent and updates regularly

---

### TC-MARKET-30: Complete Market Data Workflow
**Objective**: Verify complete market data usage flow  
**Steps**:
1. Search for stock "RELIANCE"
2. Get token from search results
3. Get LTP using token
4. Get market depth using token
5. Get full quote using token
6. Get 5-minute candles for last day
7. Verify all steps succeed

**Expected Result**: Complete workflow executes successfully

---

## Popular Stocks for Testing

### NSE Stocks
| Symbol | Token | Name | Exchange |
|--------|-------|------|----------|
| RELIANCE | 2885 | Reliance Industries Ltd | NSE |
| TCS | 11536 | Tata Consultancy Services | NSE |
| HDFCBANK | 1333 | HDFC Bank Ltd | NSE |
| INFY | 1594 | Infosys Ltd | NSE |
| ICICIBANK | 1330 | ICICI Bank Ltd | NSE |
| SBIN | 3045 | State Bank of India | NSE |
| BHARTIARTL | 10604 | Bharti Airtel Ltd | NSE |
| ITC | 1660 | ITC Ltd | NSE |
| KOTAKBANK | 1922 | Kotak Mahindra Bank Ltd | NSE |
| LT | 11483 | Larsen & Toubro Ltd | NSE |

### BSE Stocks
| Symbol | Token | Name | Exchange |
|--------|-------|------|----------|
| RELIANCE | 500325 | Reliance Industries Ltd | BSE |
| TCS | 532540 | Tata Consultancy Services | BSE |
| HDFCBANK | 500180 | HDFC Bank Ltd | BSE |
| INFY | 500209 | Infosys Ltd | BSE |

---

## Complete Workflow Test Scenario

### Scenario: Find and Analyze Stock

```bash
# Step 1: Get access token (from auth)
# Assume ACCESS_TOKEN is set

# Step 2: Search for stock
curl -X GET "http://localhost:3000/v1/market/search?q=RELIANCE&exchange=NSE" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Response: Extract token
# TOKEN=2885

# Step 3: Get current LTP
curl -X GET "http://localhost:3000/v1/market/ltp?exchange=NSE&token=2885&symbol=RELIANCE" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Step 4: Get market depth to see order book
curl -X GET "http://localhost:3000/v1/market/depth?exchange=NSE&token=2885&symbol=RELIANCE" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Step 5: Get full quote with OHLC
curl -X POST http://localhost:3000/v1/market/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "exchange": "NSE",
    "tokens": ["2885"]
  }'

# Step 6: Get 5-minute candles for chart
curl -X POST http://localhost:3000/v1/market/candles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "exchange": "NSE",
    "token": "2885",
    "interval": "5minute",
    "fromDate": "2025-12-24T00:00:00.000Z",
    "toDate": "2025-12-24T23:59:59.000Z"
  }'
```

### Scenario: Compare Multiple Stocks

```bash
# Get quotes for multiple stocks at once
curl -X POST http://localhost:3000/v1/market/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "exchange": "NSE",
    "tokens": ["2885", "11536", "1333", "1594", "1330"]
  }'

# Response: Compare LTP, volume, change% across stocks
```

### Scenario: Technical Analysis Data Collection

```bash
# Get daily candles for last 30 days
curl -X POST http://localhost:3000/v1/market/candles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "exchange": "NSE",
    "token": "2885",
    "interval": "day",
    "fromDate": "2025-11-24T00:00:00.000Z",
    "toDate": "2025-12-24T23:59:59.000Z"
  }'

# Use candle data to calculate:
# - Moving averages (SMA, EMA)
# - RSI (Relative Strength Index)
# - Support/Resistance levels
```

---

## Test Execution Checklist

### Environment Setup
- [ ] Backend server running on http://localhost:3000
- [ ] MongoDB connected
- [ ] Redis connected (for caching)
- [ ] Market data provider configured (AngelOne/Kite)
- [ ] User authenticated with valid access token

### LTP Tests
- [ ] TC-MARKET-01: Valid LTP retrieval
- [ ] TC-MARKET-02: Missing exchange parameter
- [ ] TC-MARKET-03: Missing token parameter
- [ ] TC-MARKET-04: No authentication
- [ ] TC-MARKET-05: Invalid token
- [ ] TC-MARKET-26: Multiple exchanges

### Market Depth Tests
- [ ] TC-MARKET-06: Valid market depth
- [ ] TC-MARKET-07: Missing parameters
- [ ] TC-MARKET-27: Bid-ask spread validation

### Quotes Tests
- [ ] TC-MARKET-08: Single stock quote
- [ ] TC-MARKET-09: Multiple stocks quotes
- [ ] TC-MARKET-10: Missing tokens
- [ ] TC-MARKET-11: Empty tokens array
- [ ] TC-MARKET-12: Invalid token format
- [ ] TC-MARKET-28: Large batch performance

### Search Tests
- [ ] TC-MARKET-13: Exact symbol search
- [ ] TC-MARKET-14: Partial name search
- [ ] TC-MARKET-15: Exchange filter
- [ ] TC-MARKET-16: Missing query
- [ ] TC-MARKET-17: No results
- [ ] TC-MARKET-18: Case insensitivity

### Candle Tests
- [ ] TC-MARKET-19: 5-minute candles
- [ ] TC-MARKET-20: Daily candles
- [ ] TC-MARKET-21: Date range filtering
- [ ] TC-MARKET-22: Missing required fields
- [ ] TC-MARKET-23: Invalid interval
- [ ] TC-MARKET-24: Invalid date range
- [ ] TC-MARKET-25: Invalid date format

### Integration Tests
- [ ] TC-MARKET-29: Real-time data freshness
- [ ] TC-MARKET-30: Complete workflow
- [ ] Search → LTP → Depth → Quote → Candles flow
- [ ] Multiple stock comparison flow
- [ ] Technical analysis data collection

---

## Notes
- All endpoints require authentication via Bearer token
- Market data is cached in Redis for performance
- LTP updates every few seconds during market hours
- Market depth shows top 5 buy/sell orders
- Candle intervals: 1min, 5min, 15min, 30min, 60min, day
- Search supports partial matches and is case-insensitive
- Quotes endpoint supports batch requests up to 100 stocks
- Data is sourced from AngelOne or Kite Connect APIs
- During market hours (9:15 AM - 3:30 PM IST), data is real-time
- Outside market hours, last available data is returned

---

## Common Issues & Solutions

### Issue 1: No Data Returned
**Error**: Empty response or null values  
**Solution**: Verify market hours, check if exchange is open, ensure valid token

### Issue 2: Stale Data
**Error**: Timestamp is old  
**Solution**: Check Redis cache TTL, verify market data provider connection

### Issue 3: Invalid Token Error
**Error**: Stock not found  
**Solution**: Use search endpoint to find correct token, verify exchange matches

### Issue 4: Candles Return Empty Array
**Error**: No candles in date range  
**Solution**: Verify date range includes trading days, check exchange holidays

### Issue 5: Market Depth Empty
**Error**: No buy/sell orders  
**Solution**: Stock may be illiquid or suspended, try different stock

---

## Performance Considerations
- LTP: ~50-100ms (cached in Redis for 30 seconds)
- Market Depth: ~100-200ms (cached for 10 seconds)
- Quotes (single): ~50-100ms (cached for 30 seconds)
- Quotes (batch 10): ~100-150ms (parallel processing)
- Search: ~50-100ms (database indexed)
- Candles: ~200-500ms (depends on data range)

---

## Caching Strategy
- **LTP**: 30 seconds TTL
- **Market Depth**: 10 seconds TTL
- **Quotes**: 30 seconds TTL
- **Search Results**: 5 minutes TTL
- **Candle Data**: 1 minute TTL (intraday), 10 minutes (daily)

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Related Documentation**: 
- [WebSocket Testing Guide](./websocket-testing.md)
- [Auth Testing Guide](./auth-testing.md)
- [API Usage Guide](../API_USAGE_GUIDE.md)
