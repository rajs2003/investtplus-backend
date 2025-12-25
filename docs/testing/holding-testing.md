# Holdings & Portfolio API Testing Guide (Phase 3)

## Overview
This document provides comprehensive testing scenarios for the Holdings & Portfolio System API endpoints in the InvesttPlus Backend. The holdings module manages stock positions, portfolio tracking, P&L calculations, and trade history. This is Phase 3 of the trading simulation system.

## Base URL
```
http://localhost:3000/v1/holdings
```

## Authentication
All holdings endpoints require authentication.
```
Authorization: Bearer {accessToken}
```

---

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/` | GET | Yes | Get all holdings (intraday + delivery) |
| `/intraday` | GET | Yes | Get intraday holdings only |
| `/delivery` | GET | Yes | Get delivery holdings only |
| `/:symbol` | GET | Yes | Get specific holding by symbol |
| `/portfolio/summary` | GET | Yes | Get portfolio summary with P&L |
| `/trades` | GET | Yes | Get trade history with filters |
| `/trades/stats` | GET | Yes | Get trade statistics |
| `/trades/today` | GET | Yes | Get today's completed trades |
| `/trades/:tradeId` | GET | Yes | Get specific trade details |

---

## Holding Types

### Intraday Holdings
- **Type**: MIS (Margin Intraday Square-off)
- **Characteristics**: Must be squared off by market close
- **Leverage**: Available
- **Settlement**: Same day

### Delivery Holdings
- **Type**: CNC (Cash and Carry)
- **Characteristics**: Can be held for any duration
- **Leverage**: No leverage
- **Settlement**: T+2 days

---

## 1. Get All Holdings

### Endpoint
```
GET /v1/holdings
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "holdings": [
      {
        "id": "holding_001",
        "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
        "exchange": "NSE",
        "token": "3045",
        "symbol": "SBIN",
        "holdingType": "INTRADAY",
        "quantity": 10,
        "averagePrice": 625.40,
        "currentPrice": 628.50,
        "investedValue": 6254.00,
        "currentValue": 6285.00,
        "pnl": 31.00,
        "pnlPercent": 0.50,
        "dayChange": 3.10,
        "dayChangePercent": 0.49,
        "lastUpdated": "2025-12-24T10:30:00.000Z",
        "createdAt": "2025-12-24T09:15:00.000Z"
      },
      {
        "id": "holding_002",
        "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
        "exchange": "NSE",
        "token": "2885",
        "symbol": "RELIANCE",
        "holdingType": "DELIVERY",
        "quantity": 5,
        "averagePrice": 2450.00,
        "currentPrice": 2456.75,
        "investedValue": 12250.00,
        "currentValue": 12283.75,
        "pnl": 33.75,
        "pnlPercent": 0.28,
        "dayChange": 6.75,
        "dayChangePercent": 0.28,
        "lastUpdated": "2025-12-24T10:30:00.000Z",
        "createdAt": "2025-12-20T11:00:00.000Z"
      }
    ],
    "summary": {
      "totalHoldings": 2,
      "totalInvested": 18504.00,
      "totalCurrent": 18568.75,
      "totalPnl": 64.75,
      "totalPnlPercent": 0.35,
      "intradayCount": 1,
      "deliveryCount": 1
    }
  }
}
```

### Error Responses
```json
// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/holdings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 2. Get Intraday Holdings

### Endpoint
```
GET /v1/holdings/intraday
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "holdings": [
      {
        "id": "holding_001",
        "exchange": "NSE",
        "token": "3045",
        "symbol": "SBIN",
        "holdingType": "INTRADAY",
        "quantity": 10,
        "averagePrice": 625.40,
        "currentPrice": 628.50,
        "investedValue": 6254.00,
        "currentValue": 6285.00,
        "pnl": 31.00,
        "pnlPercent": 0.50,
        "dayChange": 3.10,
        "dayChangePercent": 0.49,
        "lastUpdated": "2025-12-24T10:30:00.000Z",
        "createdAt": "2025-12-24T09:15:00.000Z"
      },
      {
        "id": "holding_003",
        "exchange": "NSE",
        "token": "1660",
        "symbol": "TATASTEEL",
        "holdingType": "INTRADAY",
        "quantity": 20,
        "averagePrice": 141.50,
        "currentPrice": 142.35,
        "investedValue": 2830.00,
        "currentValue": 2847.00,
        "pnl": 17.00,
        "pnlPercent": 0.60,
        "dayChange": 0.85,
        "dayChangePercent": 0.60,
        "lastUpdated": "2025-12-24T10:30:00.000Z",
        "createdAt": "2025-12-24T09:30:00.000Z"
      }
    ],
    "summary": {
      "totalHoldings": 2,
      "totalInvested": 9084.00,
      "totalCurrent": 9132.00,
      "totalPnl": 48.00,
      "totalPnlPercent": 0.53
    }
  }
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/holdings/intraday \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3. Get Delivery Holdings

### Endpoint
```
GET /v1/holdings/delivery
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "holdings": [
      {
        "id": "holding_002",
        "exchange": "NSE",
        "token": "2885",
        "symbol": "RELIANCE",
        "holdingType": "DELIVERY",
        "quantity": 5,
        "averagePrice": 2450.00,
        "currentPrice": 2456.75,
        "investedValue": 12250.00,
        "currentValue": 12283.75,
        "pnl": 33.75,
        "pnlPercent": 0.28,
        "dayChange": 6.75,
        "dayChangePercent": 0.28,
        "lastUpdated": "2025-12-24T10:30:00.000Z",
        "createdAt": "2025-12-20T11:00:00.000Z",
        "holdingDays": 4
      },
      {
        "id": "holding_004",
        "exchange": "NSE",
        "token": "11536",
        "symbol": "TCS",
        "holdingType": "DELIVERY",
        "quantity": 3,
        "averagePrice": 3500.00,
        "currentPrice": 3525.00,
        "investedValue": 10500.00,
        "currentValue": 10575.00,
        "pnl": 75.00,
        "pnlPercent": 0.71,
        "dayChange": 25.00,
        "dayChangePercent": 0.71,
        "lastUpdated": "2025-12-24T10:30:00.000Z",
        "createdAt": "2025-12-15T14:20:00.000Z",
        "holdingDays": 9
      }
    ],
    "summary": {
      "totalHoldings": 2,
      "totalInvested": 22750.00,
      "totalCurrent": 22858.75,
      "totalPnl": 108.75,
      "totalPnlPercent": 0.48
    }
  }
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/holdings/delivery \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 4. Get Holding by Symbol

### Endpoint
```
GET /v1/holdings/:symbol
```

### Path Parameters
- **symbol**: Required, string (stock symbol)

### Query Parameters
- **holdingType**: Optional, string ("INTRADAY" or "DELIVERY")

### Request Example
```
GET /v1/holdings/SBIN?holdingType=INTRADAY
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "holding_001",
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "holdingType": "INTRADAY",
    "quantity": 10,
    "averagePrice": 625.40,
    "currentPrice": 628.50,
    "investedValue": 6254.00,
    "currentValue": 6285.00,
    "pnl": 31.00,
    "pnlPercent": 0.50,
    "dayChange": 3.10,
    "dayChangePercent": 0.49,
    "buyOrders": [
      {
        "orderId": "order_123",
        "quantity": 10,
        "price": 625.40,
        "timestamp": "2025-12-24T09:15:00.000Z"
      }
    ],
    "lastUpdated": "2025-12-24T10:30:00.000Z",
    "createdAt": "2025-12-24T09:15:00.000Z"
  }
}
```

### Error Responses
```json
// 404 - Holding Not Found
{
  "code": 404,
  "message": "Holding not found"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Command
```bash
# Get specific holding type
curl -X GET "http://localhost:3000/v1/holdings/SBIN?holdingType=INTRADAY" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get any holding for symbol
curl -X GET http://localhost:3000/v1/holdings/RELIANCE \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 5. Get Portfolio Summary

### Endpoint
```
GET /v1/holdings/portfolio/summary
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "totalInvested": 31834.00,
      "currentValue": 32132.75,
      "totalPnl": 298.75,
      "totalPnlPercent": 0.94,
      "dayPnl": 45.50,
      "dayPnlPercent": 0.14,
      "totalHoldings": 4
    },
    "breakdown": {
      "intraday": {
        "count": 2,
        "invested": 9084.00,
        "currentValue": 9132.00,
        "pnl": 48.00,
        "pnlPercent": 0.53
      },
      "delivery": {
        "count": 2,
        "invested": 22750.00,
        "currentValue": 23000.75,
        "pnl": 250.75,
        "pnlPercent": 1.10
      }
    },
    "topGainers": [
      {
        "symbol": "TCS",
        "pnl": 75.00,
        "pnlPercent": 0.71
      },
      {
        "symbol": "RELIANCE",
        "pnl": 33.75,
        "pnlPercent": 0.28
      }
    ],
    "topLosers": [],
    "allocation": [
      {
        "symbol": "RELIANCE",
        "percentage": 38.44,
        "value": 12283.75
      },
      {
        "symbol": "TCS",
        "percentage": 32.93,
        "value": 10575.00
      },
      {
        "symbol": "SBIN",
        "percentage": 19.56,
        "value": 6285.00
      },
      {
        "symbol": "TATASTEEL",
        "percentage": 8.86,
        "value": 2847.00
      }
    ],
    "performance": {
      "bestDay": {
        "date": "2025-12-24",
        "pnl": 45.50
      },
      "worstDay": {
        "date": "2025-12-20",
        "pnl": -12.00
      },
      "totalTrades": 156,
      "winningTrades": 89,
      "losingTrades": 67,
      "winRate": 57.05
    }
  }
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/holdings/portfolio/summary \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 6. Get Trade History

### Endpoint
```
GET /v1/holdings/trades
```

### Query Parameters
- **symbol**: Optional, string (filter by stock symbol)
- **transactionType**: Optional, string ("BUY" or "SELL")
- **holdingType**: Optional, string ("INTRADAY" or "DELIVERY")
- **startDate**: Optional, ISO date string
- **endDate**: Optional, ISO date string
- **sortBy**: Optional, string (e.g., "timestamp:desc", "profit:desc")
- **limit**: Optional, number (default: 10, max: 100)
- **page**: Optional, number (default: 1)

### Request Example
```
GET /v1/holdings/trades?symbol=SBIN&limit=20&page=1
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "trade_001",
        "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
        "orderId": "order_123",
        "exchange": "NSE",
        "token": "3045",
        "symbol": "SBIN",
        "transactionType": "BUY",
        "holdingType": "INTRADAY",
        "quantity": 10,
        "price": 625.40,
        "totalValue": 6254.00,
        "fees": 0,
        "netValue": 6254.00,
        "timestamp": "2025-12-24T09:15:30.000Z"
      },
      {
        "id": "trade_002",
        "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
        "orderId": "order_456",
        "exchange": "NSE",
        "token": "3045",
        "symbol": "SBIN",
        "transactionType": "SELL",
        "holdingType": "INTRADAY",
        "quantity": 10,
        "price": 628.50,
        "totalValue": 6285.00,
        "fees": 0,
        "netValue": 6285.00,
        "profit": 31.00,
        "profitPercent": 0.50,
        "timestamp": "2025-12-24T11:30:15.000Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "totalResults": 156
  }
}
```

### cURL Commands
```bash
# Get all trades
curl -X GET "http://localhost:3000/v1/holdings/trades?limit=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get trades for specific stock
curl -X GET "http://localhost:3000/v1/holdings/trades?symbol=SBIN" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get BUY trades only
curl -X GET "http://localhost:3000/v1/holdings/trades?transactionType=BUY" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get trades in date range
curl -X GET "http://localhost:3000/v1/holdings/trades?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-24T23:59:59.000Z" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get sorted by profit
curl -X GET "http://localhost:3000/v1/holdings/trades?sortBy=profit:desc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 7. Get Trade Statistics

### Endpoint
```
GET /v1/holdings/trades/stats
```

### Query Parameters
- **startDate**: Optional, ISO date string
- **endDate**: Optional, ISO date string

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-12-01T00:00:00.000Z",
      "endDate": "2025-12-24T23:59:59.000Z",
      "days": 24
    },
    "overall": {
      "totalTrades": 156,
      "buyTrades": 78,
      "sellTrades": 78,
      "winningTrades": 45,
      "losingTrades": 33,
      "breakEvenTrades": 0,
      "winRate": 57.69,
      "avgWin": 45.50,
      "avgLoss": -28.30,
      "largestWin": 250.00,
      "largestLoss": -120.00,
      "profitFactor": 1.61
    },
    "profitLoss": {
      "totalProfit": 2047.50,
      "totalLoss": -933.90,
      "netPnl": 1113.60,
      "avgPnl": 14.28,
      "avgPnlPercent": 0.52
    },
    "byType": {
      "intraday": {
        "trades": 98,
        "profit": 856.40,
        "avgProfit": 8.74
      },
      "delivery": {
        "trades": 58,
        "profit": 257.20,
        "avgProfit": 4.43
      }
    },
    "byStock": [
      {
        "symbol": "SBIN",
        "trades": 45,
        "profit": 450.50,
        "winRate": 62.22
      },
      {
        "symbol": "RELIANCE",
        "trades": 38,
        "profit": 380.00,
        "winRate": 55.26
      }
    ],
    "dailyStats": [
      {
        "date": "2025-12-24",
        "trades": 12,
        "profit": 95.50,
        "winRate": 66.67
      },
      {
        "date": "2025-12-23",
        "trades": 15,
        "profit": 125.00,
        "winRate": 60.00
      }
    ]
  }
}
```

### cURL Command
```bash
# Get all-time stats
curl -X GET http://localhost:3000/v1/holdings/trades/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get stats for specific period
curl -X GET "http://localhost:3000/v1/holdings/trades/stats?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-24T23:59:59.000Z" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 8. Get Today's Trades

### Endpoint
```
GET /v1/holdings/trades/today
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "trade_001",
        "symbol": "SBIN",
        "transactionType": "BUY",
        "quantity": 10,
        "price": 625.40,
        "totalValue": 6254.00,
        "timestamp": "2025-12-24T09:15:30.000Z"
      },
      {
        "id": "trade_002",
        "symbol": "SBIN",
        "transactionType": "SELL",
        "quantity": 10,
        "price": 628.50,
        "totalValue": 6285.00,
        "profit": 31.00,
        "profitPercent": 0.50,
        "timestamp": "2025-12-24T11:30:15.000Z"
      }
    ],
    "summary": {
      "totalTrades": 12,
      "buyTrades": 6,
      "sellTrades": 6,
      "totalVolume": 45000.00,
      "totalProfit": 95.50,
      "winningTrades": 8,
      "losingTrades": 4,
      "winRate": 66.67
    }
  }
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/holdings/trades/today \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 9. Get Trade by ID

### Endpoint
```
GET /v1/holdings/trades/:tradeId
```

### Path Parameters
- **tradeId**: Required, string (trade ID)

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "trade_001",
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "orderId": "order_123",
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "transactionType": "BUY",
    "holdingType": "INTRADAY",
    "quantity": 10,
    "price": 625.40,
    "totalValue": 6254.00,
    "fees": 0,
    "netValue": 6254.00,
    "timestamp": "2025-12-24T09:15:30.000Z",
    "order": {
      "id": "order_123",
      "orderType": "MARKET",
      "status": "EXECUTED"
    },
    "relatedTrades": [
      {
        "id": "trade_002",
        "transactionType": "SELL",
        "quantity": 10,
        "price": 628.50,
        "profit": 31.00,
        "timestamp": "2025-12-24T11:30:15.000Z"
      }
    ]
  }
}
```

### Error Responses
```json
// 404 - Trade Not Found
{
  "code": 404,
  "message": "Trade not found"
}

// 403 - Unauthorized
{
  "code": 403,
  "message": "You are not authorized to view this trade"
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/holdings/trades/trade_001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Test Cases

### TC-HOLDING-01: Get All Holdings
**Objective**: Verify all holdings retrieval  
**Pre-conditions**: User has both intraday and delivery holdings  
**Steps**:
1. Send GET request to `/holdings`
2. Verify response status is 200
3. Verify holdings array contains both types
4. Verify summary includes totals
5. Verify P&L calculated correctly

**Expected Result**: All holdings returned with accurate summary

---

### TC-HOLDING-02: Get Holdings (Empty Portfolio)
**Objective**: Verify empty holdings response  
**Pre-conditions**: User has no holdings  
**Steps**:
1. Send GET request to `/holdings`
2. Verify response status is 200
3. Verify holdings array is empty
4. Verify summary shows zero values

**Expected Result**: Empty holdings list with zero summary

---

### TC-HOLDING-03: Get Intraday Holdings Only
**Objective**: Verify intraday holdings filtering  
**Pre-conditions**: User has intraday holdings  
**Steps**:
1. Send GET request to `/holdings/intraday`
2. Verify response status is 200
3. Verify all holdings are type INTRADAY
4. Verify no delivery holdings returned

**Expected Result**: Only intraday holdings returned

---

### TC-HOLDING-04: Get Delivery Holdings Only
**Objective**: Verify delivery holdings filtering  
**Pre-conditions**: User has delivery holdings  
**Steps**:
1. Send GET request to `/holdings/delivery`
2. Verify response status is 200
3. Verify all holdings are type DELIVERY
4. Verify holdingDays calculated correctly

**Expected Result**: Only delivery holdings returned

---

### TC-HOLDING-05: Get Holding by Symbol
**Objective**: Verify specific holding retrieval  
**Pre-conditions**: User has holding for specific stock  
**Steps**:
1. Send GET request to `/holdings/SBIN`
2. Verify response status is 200
3. Verify holding details for SBIN returned
4. Verify buy orders history included

**Expected Result**: Specific holding details returned

---

### TC-HOLDING-06: Get Holding by Symbol with Type
**Objective**: Verify holding retrieval with type filter  
**Pre-conditions**: User has both intraday and delivery holdings for same stock  
**Steps**:
1. Send GET request to `/holdings/SBIN?holdingType=INTRADAY`
2. Verify response status is 200
3. Verify only intraday holding returned

**Expected Result**: Correct holding type returned

---

### TC-HOLDING-07: Get Non-existent Holding
**Objective**: Verify error for non-existent holding  
**Steps**:
1. Send GET request for stock user doesn't hold
2. Verify response status is 404
3. Verify error message

**Expected Result**: Not found error returned

---

### TC-HOLDING-08: Verify P&L Calculation
**Objective**: Verify P&L accuracy  
**Pre-conditions**: User has holdings with known values  
**Steps**:
1. Get holdings
2. Calculate P&L manually: (currentPrice - averagePrice) × quantity
3. Verify matches response P&L
4. Verify P&L percent: (P&L / investedValue) × 100

**Expected Result**: P&L calculations are accurate

---

### TC-HOLDING-09: Verify Current Value Update
**Objective**: Verify current value reflects live prices  
**Pre-conditions**: User has holdings  
**Steps**:
1. Get holdings, note current price
2. Wait for market price update
3. Get holdings again
4. Verify current price and value updated

**Expected Result**: Current values reflect latest market prices

---

### TC-HOLDING-10: Get Portfolio Summary
**Objective**: Verify portfolio summary generation  
**Pre-conditions**: User has multiple holdings  
**Steps**:
1. Send GET request to `/holdings/portfolio/summary`
2. Verify response status is 200
3. Verify total invested, current value, P&L
4. Verify breakdown by type
5. Verify top gainers/losers lists
6. Verify allocation percentages sum to 100%

**Expected Result**: Complete portfolio summary with accurate data

---

### TC-HOLDING-11: Portfolio Summary Calculations
**Objective**: Verify summary calculations  
**Pre-conditions**: User has known holdings  
**Steps**:
1. Get portfolio summary
2. Manually sum invested and current values
3. Calculate total P&L
4. Verify all values match

**Expected Result**: All calculations are accurate

---

### TC-HOLDING-12: Top Gainers/Losers
**Objective**: Verify top performers identification  
**Pre-conditions**: User has holdings with varied P&L  
**Steps**:
1. Get portfolio summary
2. Verify top gainers sorted by P&L descending
3. Verify top losers sorted by P&L ascending
4. Verify limit applied (top 5)

**Expected Result**: Correct stocks identified as gainers/losers

---

### TC-HOLDING-13: Portfolio Allocation
**Objective**: Verify portfolio allocation calculation  
**Pre-conditions**: User has multiple holdings  
**Steps**:
1. Get portfolio summary
2. Verify each stock's allocation percentage
3. Calculate: (stock value / total value) × 100
4. Verify sum of all percentages = 100%

**Expected Result**: Allocation percentages are accurate

---

### TC-HOLDING-14: Get All Trade History
**Objective**: Verify trade history retrieval  
**Pre-conditions**: User has completed trades  
**Steps**:
1. Send GET request to `/holdings/trades`
2. Verify response status is 200
3. Verify trades array returned
4. Verify pagination info present

**Expected Result**: Trade history returned with pagination

---

### TC-HOLDING-15: Filter Trades by Symbol
**Objective**: Verify symbol filtering  
**Pre-conditions**: User has trades for multiple stocks  
**Steps**:
1. Send GET request with symbol=SBIN
2. Verify response status is 200
3. Verify all trades are for SBIN

**Expected Result**: Only SBIN trades returned

---

### TC-HOLDING-16: Filter Trades by Transaction Type
**Objective**: Verify transaction type filtering  
**Pre-conditions**: User has both BUY and SELL trades  
**Steps**:
1. Send GET request with transactionType=BUY
2. Verify response status is 200
3. Verify all trades are BUY type

**Expected Result**: Only BUY trades returned

---

### TC-HOLDING-17: Filter Trades by Date Range
**Objective**: Verify date range filtering  
**Pre-conditions**: User has trades across multiple dates  
**Steps**:
1. Send GET request with startDate and endDate
2. Verify response status is 200
3. Verify all trades within date range

**Expected Result**: Only trades in range returned

---

### TC-HOLDING-18: Sort Trades by Profit
**Objective**: Verify sorting functionality  
**Pre-conditions**: User has completed trades with profit/loss  
**Steps**:
1. Send GET request with sortBy=profit:desc
2. Verify response status is 200
3. Verify trades sorted by profit descending

**Expected Result**: Trades sorted correctly by profit

---

### TC-HOLDING-19: Paginate Trade History
**Objective**: Verify pagination  
**Pre-conditions**: User has more than 10 trades  
**Steps**:
1. Send GET request with limit=5&page=1
2. Verify 5 trades returned
3. Request page 2
4. Verify different trades returned

**Expected Result**: Pagination works correctly

---

### TC-HOLDING-20: Get Trade Statistics
**Objective**: Verify trade statistics calculation  
**Pre-conditions**: User has completed trades  
**Steps**:
1. Send GET request to `/holdings/trades/stats`
2. Verify response status is 200
3. Verify overall stats (total trades, win rate, etc.)
4. Verify P&L stats
5. Verify breakdown by type and stock

**Expected Result**: Complete trade statistics returned

---

### TC-HOLDING-21: Win Rate Calculation
**Objective**: Verify win rate accuracy  
**Pre-conditions**: User has winning and losing trades  
**Steps**:
1. Get trade statistics
2. Calculate: (winningTrades / totalTrades) × 100
3. Verify matches response win rate

**Expected Result**: Win rate calculated correctly

---

### TC-HOLDING-22: Profit Factor Calculation
**Objective**: Verify profit factor  
**Pre-conditions**: User has both profits and losses  
**Steps**:
1. Get trade statistics
2. Calculate: totalProfit / abs(totalLoss)
3. Verify matches response profit factor

**Expected Result**: Profit factor calculated correctly

---

### TC-HOLDING-23: Trade Stats by Stock
**Objective**: Verify per-stock statistics  
**Pre-conditions**: User has trades for multiple stocks  
**Steps**:
1. Get trade statistics
2. Verify byStock array present
3. Verify each stock has trades, profit, winRate
4. Verify stocks sorted by profit

**Expected Result**: Accurate per-stock statistics

---

### TC-HOLDING-24: Get Today's Trades
**Objective**: Verify today's trades retrieval  
**Pre-conditions**: User has trades today  
**Steps**:
1. Send GET request to `/holdings/trades/today`
2. Verify response status is 200
3. Verify all trades are from today
4. Verify summary includes today's stats

**Expected Result**: Only today's trades returned with summary

---

### TC-HOLDING-25: Today's Trades (No Trades)
**Objective**: Verify empty today's trades  
**Pre-conditions**: User has no trades today  
**Steps**:
1. Send GET request to `/holdings/trades/today`
2. Verify response status is 200
3. Verify trades array empty
4. Verify summary shows zero values

**Expected Result**: Empty list with zero summary

---

### TC-HOLDING-26: Get Trade by ID
**Objective**: Verify single trade retrieval  
**Pre-conditions**: Valid trade ID exists  
**Steps**:
1. Send GET request to `/holdings/trades/:tradeId`
2. Verify response status is 200
3. Verify complete trade details
4. Verify related order info included
5. Verify related trades (if paired BUY/SELL)

**Expected Result**: Complete trade details returned

---

### TC-HOLDING-27: Get Non-existent Trade
**Objective**: Verify error for missing trade  
**Steps**:
1. Send GET request with non-existent tradeId
2. Verify response status is 404
3. Verify error message

**Expected Result**: Not found error returned

---

### TC-HOLDING-28: Get Another User's Trade
**Objective**: Verify authorization  
**Pre-conditions**: Two different users  
**Steps**:
1. User A completes trade
2. User B tries to get User A's trade
3. Verify response status is 403

**Expected Result**: Forbidden error, authorization enforced

---

### TC-HOLDING-29: Holding Updates After Trade
**Objective**: Verify holdings update with trades  
**Pre-conditions**: User has no holdings  
**Steps**:
1. Get holdings - verify empty
2. Execute BUY order
3. Get holdings - verify new holding created
4. Verify quantity and average price correct
5. Execute another BUY order (same stock)
6. Get holdings - verify quantity increased, avg price updated

**Expected Result**: Holdings updated correctly after trades

---

### TC-HOLDING-30: Complete Trading Cycle
**Objective**: Verify complete buy-sell cycle  
**Steps**:
1. Check initial holdings (empty)
2. Place and execute BUY order
3. Get holdings - verify position created
4. Get portfolio summary - verify investment
5. Place and execute SELL order
6. Get holdings - verify position closed (if full quantity sold)
7. Get trade history - verify BUY and SELL trades
8. Get trade stats - verify profit recorded
9. Verify wallet balance updated with profit/loss

**Expected Result**: Complete cycle works correctly

---

## Complete Workflow Test Scenarios

### Scenario: Intraday Trading Cycle

```bash
# Assume USER_TOKEN is set

# Step 1: Check initial holdings
curl -X GET http://localhost:3000/v1/holdings \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 2: Buy stock (intraday)
curl -X POST http://localhost:3000/v1/orders/place \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -d '{
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "transactionType": "BUY",
    "orderType": "MARKET",
    "productType": "INTRADAY",
    "quantity": 10
  }'

# Execute order
curl -X POST "http://localhost:3000/v1/orders/${ORDER_ID}/execute" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 3: Check holdings after buy
curl -X GET http://localhost:3000/v1/holdings/intraday \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 4: Sell stock
curl -X POST http://localhost:3000/v1/orders/place \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -d '{
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "transactionType": "SELL",
    "orderType": "LIMIT",
    "productType": "INTRADAY",
    "quantity": 10,
    "price": 630.00
  }'

# Execute sell order
curl -X POST "http://localhost:3000/v1/orders/${SELL_ORDER_ID}/execute" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 5: Check holdings after sell (should be empty for SBIN)
curl -X GET http://localhost:3000/v1/holdings \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 6: Get trade history
curl -X GET "http://localhost:3000/v1/holdings/trades?symbol=SBIN" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 7: Get today's trades summary
curl -X GET http://localhost:3000/v1/holdings/trades/today \
  -H "Authorization: Bearer ${USER_TOKEN}"
```

### Scenario: Portfolio Analysis

```bash
# Get complete portfolio summary
curl -X GET http://localhost:3000/v1/holdings/portfolio/summary \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get all holdings details
curl -X GET http://localhost:3000/v1/holdings \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get intraday positions
curl -X GET http://localhost:3000/v1/holdings/intraday \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get delivery positions
curl -X GET http://localhost:3000/v1/holdings/delivery \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get trade statistics
curl -X GET http://localhost:3000/v1/holdings/trades/stats \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get recent trades
curl -X GET "http://localhost:3000/v1/holdings/trades?limit=50&sortBy=timestamp:desc" \
  -H "Authorization: Bearer ${USER_TOKEN}"
```

### Scenario: Performance Tracking

```bash
# Get current month statistics
START_DATE="2025-12-01T00:00:00.000Z"
END_DATE="2025-12-31T23:59:59.000Z"

curl -X GET "http://localhost:3000/v1/holdings/trades/stats?startDate=${START_DATE}&endDate=${END_DATE}" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get trades for specific period
curl -X GET "http://localhost:3000/v1/holdings/trades?startDate=${START_DATE}&endDate=${END_DATE}&limit=100" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get winning trades only
curl -X GET "http://localhost:3000/v1/holdings/trades?sortBy=profit:desc&limit=20" \
  -H "Authorization: Bearer ${USER_TOKEN}"
```

---

## Test Execution Checklist

### Environment Setup
- [ ] Backend server running
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] Market data provider active
- [ ] User authenticated with holdings

### Holdings Tests
- [ ] TC-HOLDING-01: Get all holdings
- [ ] TC-HOLDING-02: Empty holdings
- [ ] TC-HOLDING-03: Intraday holdings
- [ ] TC-HOLDING-04: Delivery holdings
- [ ] TC-HOLDING-05: Holding by symbol
- [ ] TC-HOLDING-06: Holding by symbol with type
- [ ] TC-HOLDING-07: Non-existent holding
- [ ] TC-HOLDING-08: P&L calculation
- [ ] TC-HOLDING-09: Current value update

### Portfolio Tests
- [ ] TC-HOLDING-10: Portfolio summary
- [ ] TC-HOLDING-11: Summary calculations
- [ ] TC-HOLDING-12: Top gainers/losers
- [ ] TC-HOLDING-13: Portfolio allocation

### Trade History Tests
- [ ] TC-HOLDING-14: All trade history
- [ ] TC-HOLDING-15: Filter by symbol
- [ ] TC-HOLDING-16: Filter by type
- [ ] TC-HOLDING-17: Date range filter
- [ ] TC-HOLDING-18: Sort by profit
- [ ] TC-HOLDING-19: Pagination

### Trade Statistics Tests
- [ ] TC-HOLDING-20: Trade statistics
- [ ] TC-HOLDING-21: Win rate calculation
- [ ] TC-HOLDING-22: Profit factor
- [ ] TC-HOLDING-23: Stats by stock
- [ ] TC-HOLDING-24: Today's trades
- [ ] TC-HOLDING-25: Today (no trades)
- [ ] TC-HOLDING-26: Trade by ID
- [ ] TC-HOLDING-27: Non-existent trade
- [ ] TC-HOLDING-28: Other user's trade

### Integration Tests
- [ ] TC-HOLDING-29: Holdings update after trade
- [ ] TC-HOLDING-30: Complete trading cycle
- [ ] Intraday trading cycle
- [ ] Portfolio analysis workflow
- [ ] Performance tracking workflow

---

## Notes
- Holdings auto-update with real-time market prices
- P&L calculated as: (currentPrice - averagePrice) × quantity
- Average price updates with each new buy order
- Intraday positions must be closed by market close (3:30 PM IST)
- Delivery positions settle on T+2 basis
- Trade history includes all executed orders
- Win rate = (winning trades / total completed trades) × 100
- Profit factor = total profit / abs(total loss)
- Portfolio allocation = (stock value / total portfolio value) × 100

---

## Common Issues & Solutions

### Issue 1: P&L Not Updating
**Error**: P&L shows stale values  
**Solution**: Check market data connection, verify price updates, clear Redis cache

### Issue 2: Holdings Not Showing After Trade
**Error**: Trade executed but no holding created  
**Solution**: Verify order status is EXECUTED, check holding creation logic, review logs

### Issue 3: Incorrect Average Price
**Error**: Average price doesn't match expected  
**Solution**: Check all buy orders for stock, verify weighted average calculation

### Issue 4: Win Rate Incorrect
**Error**: Win rate percentage doesn't match  
**Solution**: Ensure only completed sell trades counted, verify profit/loss calculation

### Issue 5: Portfolio Value Mismatch
**Error**: Portfolio value doesn't sum correctly  
**Solution**: Verify all holdings included, check current price updates, validate calculation logic

---

## Performance Considerations
- Get Holdings: ~100-200ms (includes current price lookup)
- Portfolio Summary: ~200-400ms (aggregation + calculations)
- Trade History: ~150-300ms (paginated, indexed)
- Trade Statistics: ~300-600ms (complex aggregations)
- Today's Trades: ~100-200ms (date-filtered query)
- Trade by ID: ~50-100ms (direct query)

---

## Database Indexes
- Holdings: userId, symbol, holdingType
- Trades: userId, symbol, timestamp, transactionType
- Composite: userId + timestamp (for history)
- Composite: userId + symbol (for stock-specific queries)

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Related Documentation**: 
- [Order Testing Guide](./order-testing.md)
- [Wallet Testing Guide](./wallet-testing.md)
- [Market Testing Guide](./market-testing.md)
- [Auth Testing Guide](./auth-testing.md)
- [WebSocket Testing Guide](./websocket-testing.md)
