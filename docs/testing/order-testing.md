# Order System API Testing Guide (Phase 2)

## Overview
This document provides comprehensive testing scenarios for the Order System API endpoints in the InvesttPlus Backend. The order module handles order placement, modification, cancellation, execution, and order history management. This is Phase 2 of the trading simulation system.

## Base URL
```
http://localhost:3000/v1/orders
```

## Authentication
All order endpoints require authentication.
```
Authorization: Bearer {accessToken}
```

---

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/place` | POST | Yes | Place a new order |
| `/:orderId/cancel` | POST | Yes | Cancel an existing order |
| `/pending` | GET | Yes | Get all pending orders |
| `/history` | GET | Yes | Get order history |
| `/` | GET | Yes | Get all orders with filters |
| `/:orderId` | GET | Yes | Get single order details |
| `/:orderId/execute` | POST | Yes | Manually execute order (testing/admin) |

---

## Order Types & Statuses

### Order Types
- **MARKET**: Market order (executed at current market price)
- **LIMIT**: Limit order (executed at specified price or better)
- **STOP_LOSS**: Stop loss order (triggered when price reaches stop price)
- **STOP_LOSS_MARKET**: Stop loss market order

### Transaction Types
- **BUY**: Purchase stock
- **SELL**: Sell stock

### Product Types
- **INTRADAY**: Intraday trading (MIS - Margin Intraday Square-off)
- **DELIVERY**: Delivery trading (CNC - Cash and Carry)

### Order Status
- **PENDING**: Order placed, waiting for execution
- **EXECUTED**: Order successfully executed
- **CANCELLED**: Order cancelled by user
- **REJECTED**: Order rejected by system
- **EXPIRED**: Order expired (not executed within validity period)

---

## 1. Place Order

### Endpoint
```
POST /v1/orders/place
```

### Request Body
```json
{
  "exchange": "NSE",
  "token": "3045",
  "symbol": "SBIN",
  "transactionType": "BUY",
  "orderType": "LIMIT",
  "productType": "INTRADAY",
  "quantity": 10,
  "price": 625.50,
  "triggerPrice": null,
  "validity": "DAY",
  "disclosedQuantity": 0
}
```

### Field Validations
- **exchange**: Required, string (e.g., "NSE", "BSE", "NFO")
- **token**: Required, string (stock token)
- **symbol**: Required, string (stock symbol)
- **transactionType**: Required, enum ["BUY", "SELL"]
- **orderType**: Required, enum ["MARKET", "LIMIT", "STOP_LOSS", "STOP_LOSS_MARKET"]
- **productType**: Required, enum ["INTRADAY", "DELIVERY"]
- **quantity**: Required, positive integer, min: 1
- **price**: Required for LIMIT orders, number, positive
- **triggerPrice**: Required for STOP_LOSS orders, number, positive
- **validity**: Optional, enum ["DAY", "IOC"], default: "DAY"
- **disclosedQuantity**: Optional, number, default: 0

### Success Response (201)
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "id": "order_123abc",
      "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
      "exchange": "NSE",
      "token": "3045",
      "symbol": "SBIN",
      "transactionType": "BUY",
      "orderType": "LIMIT",
      "productType": "INTRADAY",
      "quantity": 10,
      "price": 625.50,
      "triggerPrice": null,
      "disclosedQuantity": 0,
      "validity": "DAY",
      "status": "PENDING",
      "filledQuantity": 0,
      "averagePrice": 0,
      "orderValue": 6255.00,
      "blockedAmount": 6255.00,
      "createdAt": "2025-12-24T10:30:00.000Z",
      "updatedAt": "2025-12-24T10:30:00.000Z"
    },
    "wallet": {
      "balance": 100000.00,
      "blockedAmount": 21255.00,
      "availableBalance": 78745.00
    }
  }
}
```

### Market Order Example
```json
{
  "exchange": "NSE",
  "token": "3045",
  "symbol": "SBIN",
  "transactionType": "BUY",
  "orderType": "MARKET",
  "productType": "INTRADAY",
  "quantity": 10,
  "validity": "DAY"
}
```

### Stop Loss Order Example
```json
{
  "exchange": "NSE",
  "token": "3045",
  "symbol": "SBIN",
  "transactionType": "SELL",
  "orderType": "STOP_LOSS",
  "productType": "INTRADAY",
  "quantity": 10,
  "price": 620.00,
  "triggerPrice": 622.00,
  "validity": "DAY"
}
```

### Error Responses
```json
// 400 - Insufficient Balance
{
  "code": 400,
  "message": "Insufficient balance to place order"
}

// 400 - Invalid Quantity
{
  "code": 400,
  "message": "\"quantity\" must be greater than 0"
}

// 400 - Missing Price for Limit Order
{
  "code": 400,
  "message": "Price is required for LIMIT orders"
}

// 400 - Missing Trigger Price for Stop Loss
{
  "code": 400,
  "message": "Trigger price is required for STOP_LOSS orders"
}

// 400 - Invalid Transaction Type
{
  "code": 400,
  "message": "\"transactionType\" must be one of [BUY, SELL]"
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
# Limit Order
curl -X POST http://localhost:3000/v1/orders/place \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "transactionType": "BUY",
    "orderType": "LIMIT",
    "productType": "INTRADAY",
    "quantity": 10,
    "price": 625.50,
    "validity": "DAY"
  }'

# Market Order
curl -X POST http://localhost:3000/v1/orders/place \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "transactionType": "BUY",
    "orderType": "MARKET",
    "productType": "DELIVERY",
    "quantity": 5
  }'
```

---

## 2. Cancel Order

### Endpoint
```
POST /v1/orders/:orderId/cancel
```

### Path Parameters
- **orderId**: Required, string (order ID)

### Request Example
```
POST /v1/orders/order_123abc/cancel
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "order": {
      "id": "order_123abc",
      "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
      "exchange": "NSE",
      "token": "3045",
      "symbol": "SBIN",
      "transactionType": "BUY",
      "orderType": "LIMIT",
      "productType": "INTRADAY",
      "quantity": 10,
      "price": 625.50,
      "status": "CANCELLED",
      "filledQuantity": 0,
      "averagePrice": 0,
      "orderValue": 6255.00,
      "blockedAmount": 0,
      "cancelledAt": "2025-12-24T10:35:00.000Z",
      "createdAt": "2025-12-24T10:30:00.000Z",
      "updatedAt": "2025-12-24T10:35:00.000Z"
    },
    "refund": {
      "amount": 6255.00,
      "transactionId": "txn_refund_456",
      "message": "Funds unblocked and returned to wallet"
    },
    "wallet": {
      "balance": 100000.00,
      "blockedAmount": 15000.00,
      "availableBalance": 85000.00
    }
  }
}
```

### Error Responses
```json
// 404 - Order Not Found
{
  "code": 404,
  "message": "Order not found"
}

// 400 - Order Already Executed
{
  "code": 400,
  "message": "Cannot cancel executed order"
}

// 400 - Order Already Cancelled
{
  "code": 400,
  "message": "Order is already cancelled"
}

// 403 - Unauthorized User
{
  "code": 403,
  "message": "You are not authorized to cancel this order"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/v1/orders/order_123abc/cancel \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3. Get Pending Orders

### Endpoint
```
GET /v1/orders/pending
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_123abc",
        "exchange": "NSE",
        "token": "3045",
        "symbol": "SBIN",
        "transactionType": "BUY",
        "orderType": "LIMIT",
        "productType": "INTRADAY",
        "quantity": 10,
        "price": 625.50,
        "status": "PENDING",
        "filledQuantity": 0,
        "averagePrice": 0,
        "orderValue": 6255.00,
        "blockedAmount": 6255.00,
        "createdAt": "2025-12-24T10:30:00.000Z"
      },
      {
        "id": "order_456def",
        "exchange": "NSE",
        "token": "2885",
        "symbol": "RELIANCE",
        "transactionType": "BUY",
        "orderType": "LIMIT",
        "productType": "DELIVERY",
        "quantity": 5,
        "price": 2450.00,
        "status": "PENDING",
        "filledQuantity": 0,
        "averagePrice": 0,
        "orderValue": 12250.00,
        "blockedAmount": 12250.00,
        "createdAt": "2025-12-24T10:25:00.000Z"
      }
    ],
    "totalOrders": 2,
    "totalBlockedAmount": 18505.00
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
curl -X GET http://localhost:3000/v1/orders/pending \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 4. Get Order History

### Endpoint
```
GET /v1/orders/history
```

### Query Parameters
- **status**: Optional, string (filter by status - "EXECUTED", "CANCELLED", "REJECTED")
- **transactionType**: Optional, string (filter by "BUY" or "SELL")
- **symbol**: Optional, string (filter by stock symbol)
- **startDate**: Optional, ISO date string
- **endDate**: Optional, ISO date string
- **sortBy**: Optional, string (e.g., "createdAt:desc", "orderValue:desc")
- **limit**: Optional, number (default: 10, max: 100)
- **page**: Optional, number (default: 1)

### Request Example
```
GET /v1/orders/history?status=EXECUTED&limit=20&page=1
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "order_789ghi",
        "exchange": "NSE",
        "token": "3045",
        "symbol": "SBIN",
        "transactionType": "BUY",
        "orderType": "MARKET",
        "productType": "INTRADAY",
        "quantity": 10,
        "price": null,
        "status": "EXECUTED",
        "filledQuantity": 10,
        "averagePrice": 625.30,
        "orderValue": 6253.00,
        "blockedAmount": 0,
        "executedAt": "2025-12-24T10:30:15.000Z",
        "createdAt": "2025-12-24T10:30:00.000Z",
        "updatedAt": "2025-12-24T10:30:15.000Z",
        "profit": 0,
        "profitPercent": 0
      },
      {
        "id": "order_456def",
        "exchange": "NSE",
        "token": "3045",
        "symbol": "SBIN",
        "transactionType": "SELL",
        "orderType": "LIMIT",
        "productType": "INTRADAY",
        "quantity": 10,
        "price": 628.00,
        "status": "EXECUTED",
        "filledQuantity": 10,
        "averagePrice": 628.00,
        "orderValue": 6280.00,
        "blockedAmount": 0,
        "executedAt": "2025-12-24T11:15:30.000Z",
        "createdAt": "2025-12-24T11:15:00.000Z",
        "updatedAt": "2025-12-24T11:15:30.000Z",
        "profit": 27.00,
        "profitPercent": 0.43
      }
    ],
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalResults": 89
  }
}
```

### Error Responses
```json
// 400 - Invalid Query Parameters
{
  "code": 400,
  "message": "\"limit\" must be less than or equal to 100"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Commands
```bash
# Get all executed orders
curl -X GET "http://localhost:3000/v1/orders/history?status=EXECUTED&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get cancelled orders
curl -X GET "http://localhost:3000/v1/orders/history?status=CANCELLED" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get orders for specific stock
curl -X GET "http://localhost:3000/v1/orders/history?symbol=SBIN" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get orders in date range
curl -X GET "http://localhost:3000/v1/orders/history?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-24T23:59:59.000Z" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get BUY orders only
curl -X GET "http://localhost:3000/v1/orders/history?transactionType=BUY" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 5. Get All Orders

### Endpoint
```
GET /v1/orders
```

### Query Parameters
Same as order history endpoint, plus:
- **status**: Can include "PENDING" to get all orders including pending

### Request Example
```
GET /v1/orders?limit=50&page=1&sortBy=createdAt:desc
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "order_123abc",
        "exchange": "NSE",
        "token": "3045",
        "symbol": "SBIN",
        "transactionType": "BUY",
        "orderType": "LIMIT",
        "productType": "INTRADAY",
        "quantity": 10,
        "price": 625.50,
        "status": "PENDING",
        "filledQuantity": 0,
        "averagePrice": 0,
        "orderValue": 6255.00,
        "blockedAmount": 6255.00,
        "createdAt": "2025-12-24T10:30:00.000Z",
        "updatedAt": "2025-12-24T10:30:00.000Z"
      },
      {
        "id": "order_789ghi",
        "exchange": "NSE",
        "token": "2885",
        "symbol": "RELIANCE",
        "transactionType": "BUY",
        "orderType": "MARKET",
        "productType": "DELIVERY",
        "quantity": 5,
        "price": null,
        "status": "EXECUTED",
        "filledQuantity": 5,
        "averagePrice": 2455.00,
        "orderValue": 12275.00,
        "blockedAmount": 0,
        "executedAt": "2025-12-24T10:25:30.000Z",
        "createdAt": "2025-12-24T10:25:00.000Z",
        "updatedAt": "2025-12-24T10:25:30.000Z"
      }
    ],
    "page": 1,
    "limit": 50,
    "totalPages": 3,
    "totalResults": 125
  }
}
```

### cURL Command
```bash
curl -X GET "http://localhost:3000/v1/orders?limit=50&page=1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 6. Get Order by ID

### Endpoint
```
GET /v1/orders/:orderId
```

### Path Parameters
- **orderId**: Required, string (order ID)

### Request Example
```
GET /v1/orders/order_123abc
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "order_123abc",
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "transactionType": "BUY",
    "orderType": "LIMIT",
    "productType": "INTRADAY",
    "quantity": 10,
    "price": 625.50,
    "triggerPrice": null,
    "disclosedQuantity": 0,
    "validity": "DAY",
    "status": "EXECUTED",
    "filledQuantity": 10,
    "averagePrice": 625.40,
    "orderValue": 6254.00,
    "blockedAmount": 0,
    "executedAt": "2025-12-24T10:31:00.000Z",
    "createdAt": "2025-12-24T10:30:00.000Z",
    "updatedAt": "2025-12-24T10:31:00.000Z",
    "trades": [
      {
        "id": "trade_001",
        "quantity": 10,
        "price": 625.40,
        "timestamp": "2025-12-24T10:31:00.000Z"
      }
    ],
    "relatedTransactions": [
      {
        "id": "txn_block_123",
        "type": "debit",
        "amount": 6255.00,
        "reason": "order_placement",
        "timestamp": "2025-12-24T10:30:00.000Z"
      },
      {
        "id": "txn_execute_456",
        "type": "debit",
        "amount": 6254.00,
        "reason": "order_completion",
        "timestamp": "2025-12-24T10:31:00.000Z"
      }
    ]
  }
}
```

### Error Responses
```json
// 404 - Order Not Found
{
  "code": 404,
  "message": "Order not found"
}

// 403 - Unauthorized User
{
  "code": 403,
  "message": "You are not authorized to view this order"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/orders/order_123abc \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 7. Execute Order Manually (Testing/Admin)

### Endpoint
```
POST /v1/orders/:orderId/execute
```

### Path Parameters
- **orderId**: Required, string (order ID)

### Request Body (Optional)
```json
{
  "executionPrice": 625.40
}
```

### Field Validations
- **executionPrice**: Optional, number (if not provided, uses current market price)

### Success Response (200)
```json
{
  "success": true,
  "message": "Order executed successfully",
  "data": {
    "order": {
      "id": "order_123abc",
      "exchange": "NSE",
      "token": "3045",
      "symbol": "SBIN",
      "transactionType": "BUY",
      "orderType": "LIMIT",
      "productType": "INTRADAY",
      "quantity": 10,
      "price": 625.50,
      "status": "EXECUTED",
      "filledQuantity": 10,
      "averagePrice": 625.40,
      "orderValue": 6254.00,
      "executedAt": "2025-12-24T10:31:00.000Z"
    },
    "trade": {
      "id": "trade_001",
      "orderId": "order_123abc",
      "quantity": 10,
      "price": 625.40,
      "totalValue": 6254.00,
      "timestamp": "2025-12-24T10:31:00.000Z"
    },
    "holding": {
      "id": "holding_001",
      "symbol": "SBIN",
      "quantity": 10,
      "averagePrice": 625.40,
      "currentPrice": 625.50,
      "totalValue": 6255.00,
      "investedValue": 6254.00,
      "pnl": 1.00,
      "pnlPercent": 0.02
    }
  }
}
```

### Error Responses
```json
// 404 - Order Not Found
{
  "code": 404,
  "message": "Order not found"
}

// 400 - Order Not Pending
{
  "code": 400,
  "message": "Only pending orders can be executed"
}

// 400 - Invalid Execution Price
{
  "code": 400,
  "message": "Execution price must be positive"
}
```

### cURL Command
```bash
# Execute at market price
curl -X POST http://localhost:3000/v1/orders/order_123abc/execute \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Execute at specific price
curl -X POST http://localhost:3000/v1/orders/order_123abc/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "executionPrice": 625.40
  }'
```

---

## Test Cases

### TC-ORDER-01: Place Market Buy Order
**Objective**: Verify market buy order placement  
**Pre-conditions**: User authenticated, sufficient wallet balance  
**Steps**:
1. Send POST request to `/orders/place` with MARKET order type
2. Verify response status is 201
3. Verify order created with PENDING status
4. Verify wallet balance decreased by order value
5. Verify funds blocked in wallet

**Expected Result**: Market order placed successfully, funds blocked

---

### TC-ORDER-02: Place Limit Buy Order
**Objective**: Verify limit buy order placement  
**Pre-conditions**: User authenticated, sufficient wallet balance  
**Steps**:
1. Send POST request with LIMIT order type and price
2. Verify response status is 201
3. Verify order created with specified price
4. Verify order status is PENDING
5. Verify funds blocked at limit price

**Expected Result**: Limit order placed successfully with specified price

---

### TC-ORDER-03: Place Order with Insufficient Balance
**Objective**: Verify balance validation  
**Pre-conditions**: User wallet balance < order value  
**Steps**:
1. Send POST request for order exceeding available balance
2. Verify response status is 400
3. Verify error message indicates insufficient balance

**Expected Result**: Order rejected with insufficient balance error

---

### TC-ORDER-04: Place Order without Price (Limit Order)
**Objective**: Verify price required for limit orders  
**Steps**:
1. Send POST request with orderType=LIMIT but no price
2. Verify response status is 400
3. Verify validation error for missing price

**Expected Result**: Order rejected with validation error

---

### TC-ORDER-05: Place Stop Loss Order
**Objective**: Verify stop loss order placement  
**Pre-conditions**: User authenticated, sufficient balance  
**Steps**:
1. Send POST request with STOP_LOSS order type
2. Include both price and triggerPrice
3. Verify response status is 201
4. Verify order created with trigger price

**Expected Result**: Stop loss order placed successfully

---

### TC-ORDER-06: Place Order without Trigger Price (Stop Loss)
**Objective**: Verify trigger price required for stop loss  
**Steps**:
1. Send POST request with orderType=STOP_LOSS but no triggerPrice
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Order rejected with validation error

---

### TC-ORDER-07: Place Order with Invalid Quantity
**Objective**: Verify quantity validation  
**Steps**:
1. Send POST request with quantity = 0 or negative
2. Verify response status is 400
3. Verify validation error for quantity

**Expected Result**: Order rejected with validation error

---

### TC-ORDER-08: Place Order with Invalid Transaction Type
**Objective**: Verify transaction type validation  
**Steps**:
1. Send POST request with invalid transactionType
2. Verify response status is 400
3. Verify error lists valid options

**Expected Result**: Order rejected with validation error

---

### TC-ORDER-09: Place Sell Order without Holdings
**Objective**: Verify sell order validation (for delivery)  
**Pre-conditions**: User has no holdings for the stock  
**Steps**:
1. Send POST request for SELL order (DELIVERY product type)
2. Verify response status is 400
3. Verify error indicates insufficient holdings

**Expected Result**: Sell order rejected without holdings

---

### TC-ORDER-10: Cancel Pending Order Successfully
**Objective**: Verify order cancellation  
**Pre-conditions**: User has pending order  
**Steps**:
1. Place an order, get order ID
2. Send POST request to `/orders/:orderId/cancel`
3. Verify response status is 200
4. Verify order status changed to CANCELLED
5. Verify funds unblocked and returned to wallet

**Expected Result**: Order cancelled, funds returned

---

### TC-ORDER-11: Cancel Already Executed Order
**Objective**: Verify cannot cancel executed orders  
**Pre-conditions**: Order already executed  
**Steps**:
1. Try to cancel executed order
2. Verify response status is 400
3. Verify error indicates order cannot be cancelled

**Expected Result**: Cancellation rejected for executed order

---

### TC-ORDER-12: Cancel Already Cancelled Order
**Objective**: Verify cannot cancel already cancelled orders  
**Pre-conditions**: Order already cancelled  
**Steps**:
1. Try to cancel already cancelled order
2. Verify response status is 400
3. Verify error indicates order already cancelled

**Expected Result**: Request rejected with appropriate error

---

### TC-ORDER-13: Cancel Non-existent Order
**Objective**: Verify error handling for missing order  
**Steps**:
1. Send POST request with non-existent orderId
2. Verify response status is 404
3. Verify error message

**Expected Result**: Request rejected with not found error

---

### TC-ORDER-14: Cancel Another User's Order
**Objective**: Verify authorization check  
**Pre-conditions**: Two different users  
**Steps**:
1. User A places order
2. User B tries to cancel User A's order
3. Verify response status is 403
4. Verify forbidden error

**Expected Result**: Cancellation rejected, authorization enforced

---

### TC-ORDER-15: Get All Pending Orders
**Objective**: Verify pending orders retrieval  
**Pre-conditions**: User has pending orders  
**Steps**:
1. Send GET request to `/orders/pending`
2. Verify response status is 200
3. Verify all orders have status PENDING
4. Verify totalBlockedAmount calculated correctly

**Expected Result**: All pending orders returned with summary

---

### TC-ORDER-16: Get Pending Orders (Empty)
**Objective**: Verify empty pending orders list  
**Pre-conditions**: User has no pending orders  
**Steps**:
1. Send GET request to `/orders/pending`
2. Verify response status is 200
3. Verify orders array is empty
4. Verify totalBlockedAmount is 0

**Expected Result**: Empty list returned successfully

---

### TC-ORDER-17: Get Order History with Status Filter
**Objective**: Verify status filtering in history  
**Pre-conditions**: User has orders with different statuses  
**Steps**:
1. Send GET request with status=EXECUTED
2. Verify response status is 200
3. Verify all returned orders have status EXECUTED

**Expected Result**: Only executed orders returned

---

### TC-ORDER-18: Get Order History with Symbol Filter
**Objective**: Verify symbol filtering  
**Pre-conditions**: User has orders for multiple stocks  
**Steps**:
1. Send GET request with symbol=SBIN
2. Verify response status is 200
3. Verify all returned orders are for SBIN

**Expected Result**: Only SBIN orders returned

---

### TC-ORDER-19: Get Order History with Date Range
**Objective**: Verify date range filtering  
**Pre-conditions**: User has orders across multiple dates  
**Steps**:
1. Send GET request with startDate and endDate
2. Verify response status is 200
3. Verify all orders within date range

**Expected Result**: Only orders in date range returned

---

### TC-ORDER-20: Get Order History with Pagination
**Objective**: Verify pagination functionality  
**Pre-conditions**: User has more than 10 orders  
**Steps**:
1. Send GET request with limit=5&page=1
2. Verify response has 5 results
3. Verify pagination info correct
4. Request page 2
5. Verify different orders returned

**Expected Result**: Pagination works correctly

---

### TC-ORDER-21: Get Order History Sorted by Value
**Objective**: Verify sorting functionality  
**Pre-conditions**: User has orders with varying values  
**Steps**:
1. Send GET request with sortBy=orderValue:desc
2. Verify response status is 200
3. Verify orders sorted highest to lowest value

**Expected Result**: Orders sorted correctly by value

---

### TC-ORDER-22: Get All Orders Including Pending
**Objective**: Verify get all orders endpoint  
**Pre-conditions**: User has both pending and executed orders  
**Steps**:
1. Send GET request to `/orders`
2. Verify response status is 200
3. Verify includes both PENDING and EXECUTED orders

**Expected Result**: All orders returned regardless of status

---

### TC-ORDER-23: Get Single Order Details
**Objective**: Verify order details retrieval  
**Pre-conditions**: Valid order exists  
**Steps**:
1. Send GET request to `/orders/:orderId`
2. Verify response status is 200
3. Verify complete order details returned
4. Verify trades array present (if executed)
5. Verify related transactions present

**Expected Result**: Complete order details with trades and transactions

---

### TC-ORDER-24: Get Non-existent Order
**Objective**: Verify error handling for missing order  
**Steps**:
1. Send GET request with non-existent orderId
2. Verify response status is 404
3. Verify error message

**Expected Result**: Request rejected with not found error

---

### TC-ORDER-25: Get Another User's Order
**Objective**: Verify authorization on order details  
**Pre-conditions**: Two different users  
**Steps**:
1. User A places order
2. User B tries to get User A's order details
3. Verify response status is 403
4. Verify forbidden error

**Expected Result**: Request rejected, authorization enforced

---

### TC-ORDER-26: Execute Pending Order Manually
**Objective**: Verify manual order execution  
**Pre-conditions**: Pending order exists  
**Steps**:
1. Send POST request to `/orders/:orderId/execute`
2. Verify response status is 200
3. Verify order status changed to EXECUTED
4. Verify trade created
5. Verify holding created/updated

**Expected Result**: Order executed, holdings updated

---

### TC-ORDER-27: Execute Order at Specific Price
**Objective**: Verify custom execution price  
**Pre-conditions**: Pending order exists  
**Steps**:
1. Send POST request with executionPrice in body
2. Verify response status is 200
3. Verify order executed at specified price
4. Verify averagePrice matches executionPrice

**Expected Result**: Order executed at specified price

---

### TC-ORDER-28: Execute Already Executed Order
**Objective**: Verify cannot re-execute orders  
**Pre-conditions**: Order already executed  
**Steps**:
1. Try to execute already executed order
2. Verify response status is 400
3. Verify error indicates order not pending

**Expected Result**: Execution rejected for non-pending order

---

### TC-ORDER-29: Execute Order with Invalid Price
**Objective**: Verify execution price validation  
**Steps**:
1. Send POST request with negative executionPrice
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Request rejected with validation error

---

### TC-ORDER-30: Complete Order Lifecycle
**Objective**: Verify complete order flow  
**Steps**:
1. Check wallet balance
2. Place limit buy order
3. Verify order pending and funds blocked
4. Get pending orders - verify order present
5. Execute order manually
6. Verify order executed and holding created
7. Get order details - verify complete info
8. Check order history - verify order present
9. Verify wallet balance updated correctly

**Expected Result**: Complete order lifecycle works correctly

---

## Complete Workflow Test Scenarios

### Scenario: Intraday Buy-Sell Cycle

```bash
# Assume USER_TOKEN is set

# Step 1: Check initial wallet balance
curl -X GET http://localhost:3000/v1/wallet \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 2: Place buy order
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

# Save ORDER_ID from response

# Step 3: Execute buy order
curl -X POST "http://localhost:3000/v1/orders/${ORDER_ID}/execute" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 4: Check holdings
curl -X GET http://localhost:3000/v1/holdings \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 5: Place sell order (take profit)
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

# Step 6: Execute sell order
curl -X POST "http://localhost:3000/v1/orders/${SELL_ORDER_ID}/execute" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 7: Check final balance and profit
curl -X GET http://localhost:3000/v1/wallet \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 8: Get order history to see profit
curl -X GET "http://localhost:3000/v1/orders/history?symbol=SBIN" \
  -H "Authorization: Bearer ${USER_TOKEN}"
```

### Scenario: Multiple Orders Management

```bash
# Place multiple orders
for symbol in SBIN RELIANCE TATASTEEL; do
  curl -X POST http://localhost:3000/v1/orders/place \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${USER_TOKEN}" \
    -d "{
      \"exchange\": \"NSE\",
      \"token\": \"3045\",
      \"symbol\": \"${symbol}\",
      \"transactionType\": \"BUY\",
      \"orderType\": \"LIMIT\",
      \"productType\": \"DELIVERY\",
      \"quantity\": 5,
      \"price\": 600.00
    }"
done

# Get all pending orders
curl -X GET http://localhost:3000/v1/orders/pending \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Cancel specific order
curl -X POST "http://localhost:3000/v1/orders/${ORDER_ID}/cancel" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get updated pending orders
curl -X GET http://localhost:3000/v1/orders/pending \
  -H "Authorization: Bearer ${USER_TOKEN}"
```

### Scenario: Stop Loss Order

```bash
# Step 1: Buy stock
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

# Execute buy order
curl -X POST "http://localhost:3000/v1/orders/${BUY_ORDER_ID}/execute" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 2: Place stop loss order
curl -X POST http://localhost:3000/v1/orders/place \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -d '{
    "exchange": "NSE",
    "token": "3045",
    "symbol": "SBIN",
    "transactionType": "SELL",
    "orderType": "STOP_LOSS",
    "productType": "INTRADAY",
    "quantity": 10,
    "price": 620.00,
    "triggerPrice": 622.00
  }'

# Stop loss order will trigger automatically if price hits 622.00
```

---

## Test Execution Checklist

### Environment Setup
- [ ] Backend server running
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] Market data provider configured
- [ ] User authenticated with balance
- [ ] Order execution job running

### Order Placement Tests
- [ ] TC-ORDER-01: Market buy order
- [ ] TC-ORDER-02: Limit buy order
- [ ] TC-ORDER-03: Insufficient balance
- [ ] TC-ORDER-04: Limit order without price
- [ ] TC-ORDER-05: Stop loss order
- [ ] TC-ORDER-06: Stop loss without trigger
- [ ] TC-ORDER-07: Invalid quantity
- [ ] TC-ORDER-08: Invalid transaction type
- [ ] TC-ORDER-09: Sell without holdings

### Order Cancellation Tests
- [ ] TC-ORDER-10: Cancel pending order
- [ ] TC-ORDER-11: Cancel executed order
- [ ] TC-ORDER-12: Cancel cancelled order
- [ ] TC-ORDER-13: Cancel non-existent order
- [ ] TC-ORDER-14: Cancel other user's order

### Order Retrieval Tests
- [ ] TC-ORDER-15: Get pending orders
- [ ] TC-ORDER-16: Get pending (empty)
- [ ] TC-ORDER-17: History status filter
- [ ] TC-ORDER-18: History symbol filter
- [ ] TC-ORDER-19: History date range
- [ ] TC-ORDER-20: History pagination
- [ ] TC-ORDER-21: History sorting
- [ ] TC-ORDER-22: Get all orders
- [ ] TC-ORDER-23: Get order details
- [ ] TC-ORDER-24: Get non-existent order
- [ ] TC-ORDER-25: Get other user's order

### Order Execution Tests
- [ ] TC-ORDER-26: Execute order
- [ ] TC-ORDER-27: Execute at price
- [ ] TC-ORDER-28: Execute executed order
- [ ] TC-ORDER-29: Execute invalid price

### Integration Tests
- [ ] TC-ORDER-30: Complete lifecycle
- [ ] Intraday buy-sell cycle
- [ ] Multiple orders management
- [ ] Stop loss workflow

---

## Notes
- All endpoints require authentication
- Order placement blocks funds in wallet
- Cancelled orders release blocked funds
- Executed orders create trades and holdings
- Market orders execute immediately (if system allows)
- Limit orders execute when price condition met
- Stop loss orders trigger at specified price
- Intraday positions must be squared off by market close
- Delivery orders require T+2 settlement
- Order value = quantity × price (+ fees if applicable)

---

## Common Issues & Solutions

### Issue 1: Order Not Executing
**Error**: Order stuck in PENDING  
**Solution**: Check order execution job running, verify market conditions match order type

### Issue 2: Insufficient Balance Error
**Error**: Cannot place order  
**Solution**: Check available balance (not blocked amount), cancel pending orders if needed

### Issue 3: Cannot Cancel Order
**Error**: Order already executed/cancelled  
**Solution**: Verify order status before cancellation, check order history

### Issue 4: Sell Order Rejected
**Error**: Insufficient holdings  
**Solution**: Verify holdings quantity, ensure product type matches (INTRADAY vs DELIVERY)

### Issue 5: Blocked Amount Not Released
**Error**: Funds remain blocked after cancellation  
**Solution**: Check transaction history, verify wallet updated, contact support if issue persists

---

## Performance Considerations
- Place Order: ~200-400ms (includes wallet update, validation)
- Cancel Order: ~150-300ms (releases funds)
- Get Pending Orders: ~100-200ms (indexed query)
- Order History: ~150-300ms (paginated, filtered)
- Get Order Details: ~100-150ms (includes trades)
- Execute Order: ~300-500ms (creates trade, updates holding)

---

## Database Indexes
- Orders: userId, status, symbol, createdAt
- Composite: userId + status (for pending orders)
- Composite: userId + createdAt (for history)

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Related Documentation**: 
- [WebSocket Testing Guide](./websocket-testing.md)
- [Auth Testing Guide](./auth-testing.md)
- [Market Testing Guide](./market-testing.md)
- [Wallet Testing Guide](./wallet-testing.md)
- [Phase 2 Order System Requirements](../PHASE2_ORDER_SYSTEM_REQUIREMENTS.md)
