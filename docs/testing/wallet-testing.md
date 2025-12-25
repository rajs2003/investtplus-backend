# Wallet API Testing Guide (Phase 1)

## Overview
This document provides comprehensive testing scenarios for the Wallet System API endpoints in the InvesttPlus Backend. The wallet module handles user wallet balance management, fund deposits, withdrawals, transaction history, and transaction summaries. This is Phase 1 of the trading simulation system.

## Base URL
```
http://localhost:3000/v1/wallet
```

## Authentication
All wallet endpoints require authentication.
```
Authorization: Bearer {accessToken}
```

---

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/` | GET | Yes | Get wallet balance |
| `/details` | GET | Yes | Get complete wallet information |
| `/transactions` | GET | Yes | Get transaction history with filters |
| `/transactions/summary` | GET | Yes | Get transaction summary |
| `/transactions/:transactionId` | GET | Yes | Get single transaction details |
| `/add-funds` | POST | Yes (Admin) | Add funds to user wallet |

---

## 1. Get Wallet Balance

### Endpoint
```
GET /v1/wallet
```

### Headers
```
Authorization: Bearer {accessToken}
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "balance": 100000.00,
    "totalDeposits": 150000.00,
    "totalWithdrawals": 50000.00,
    "blockedAmount": 15000.00,
    "availableBalance": 85000.00,
    "currency": "INR",
    "lastUpdated": "2025-12-24T10:30:00.000Z"
  }
}
```

### Response Fields
- **balance**: Total wallet balance (deposits - withdrawals)
- **totalDeposits**: Cumulative deposits
- **totalWithdrawals**: Cumulative withdrawals
- **blockedAmount**: Amount blocked in pending orders
- **availableBalance**: Balance available for trading (balance - blockedAmount)
- **currency**: Currency code (INR)
- **lastUpdated**: Last transaction timestamp

### Error Responses
```json
// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}

// 404 - Wallet Not Found
{
  "code": 404,
  "message": "Wallet not found"
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/wallet \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 2. Get Wallet Details

### Endpoint
```
GET /v1/wallet/details
```

### Headers
```
Authorization: Bearer {accessToken}
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "userName": "John Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "9876543210",
    "balance": 100000.00,
    "totalDeposits": 150000.00,
    "totalWithdrawals": 50000.00,
    "blockedAmount": 15000.00,
    "availableBalance": 85000.00,
    "currency": "INR",
    "walletStatus": "active",
    "createdAt": "2025-01-15T08:00:00.000Z",
    "lastUpdated": "2025-12-24T10:30:00.000Z",
    "recentTransactions": [
      {
        "id": "txn_123abc",
        "type": "debit",
        "amount": 5000.00,
        "reason": "order_placement",
        "timestamp": "2025-12-24T10:25:00.000Z"
      },
      {
        "id": "txn_456def",
        "type": "credit",
        "amount": 4500.00,
        "reason": "order_completion",
        "timestamp": "2025-12-24T10:20:00.000Z"
      }
    ],
    "statistics": {
      "totalTransactions": 156,
      "totalOrders": 45,
      "avgOrderValue": 8500.00
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

// 404 - Wallet Not Found
{
  "code": 404,
  "message": "Wallet not found"
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/wallet/details \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3. Get Transaction History

### Endpoint
```
GET /v1/wallet/transactions
```

### Query Parameters
- **type**: Optional, string (filter by "credit" or "debit")
- **reason**: Optional, string (e.g., "deposit", "withdrawal", "order_placement", "order_completion", "order_cancellation")
- **orderId**: Optional, string (filter by specific order)
- **startDate**: Optional, ISO date string (filter from date)
- **endDate**: Optional, ISO date string (filter to date)
- **sortBy**: Optional, string (e.g., "timestamp:desc", "amount:desc")
- **limit**: Optional, number (default: 10, max: 100)
- **page**: Optional, number (default: 1)

### Request Example
```
GET /v1/wallet/transactions?type=credit&limit=20&page=1&sortBy=timestamp:desc
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "txn_789ghi",
        "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
        "type": "credit",
        "amount": 10000.00,
        "reason": "deposit",
        "description": "Wallet deposit via admin",
        "balanceBefore": 90000.00,
        "balanceAfter": 100000.00,
        "orderId": null,
        "status": "completed",
        "timestamp": "2025-12-24T09:00:00.000Z",
        "metadata": {
          "addedBy": "admin_user_id",
          "note": "Initial deposit"
        }
      },
      {
        "id": "txn_456def",
        "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
        "type": "credit",
        "amount": 4500.00,
        "reason": "order_completion",
        "description": "Order profit credited",
        "balanceBefore": 85500.00,
        "balanceAfter": 90000.00,
        "orderId": "order_123",
        "status": "completed",
        "timestamp": "2025-12-24T10:20:00.000Z",
        "metadata": {
          "orderType": "BUY",
          "stockSymbol": "RELIANCE",
          "quantity": 10,
          "profit": 4500.00
        }
      },
      {
        "id": "txn_123abc",
        "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
        "type": "credit",
        "amount": 3000.00,
        "reason": "order_cancellation_refund",
        "description": "Order cancelled, funds refunded",
        "balanceBefore": 82500.00,
        "balanceAfter": 85500.00,
        "orderId": "order_456",
        "status": "completed",
        "timestamp": "2025-12-24T09:30:00.000Z",
        "metadata": {
          "orderType": "BUY",
          "stockSymbol": "SBIN",
          "quantity": 50
        }
      }
    ],
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "totalResults": 156
  }
}
```

### Transaction Types
- **credit**: Money added to wallet
  - `deposit` - Admin added funds
  - `order_completion` - Order executed with profit
  - `order_cancellation_refund` - Order cancelled, funds returned
  - `dividend` - Dividend received
  - `refund` - General refund

- **debit**: Money deducted from wallet
  - `withdrawal` - User withdrawal
  - `order_placement` - Funds blocked for order
  - `order_completion` - Order executed with loss
  - `fee` - Transaction or platform fees
  - `charge` - Other charges

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
# Get all transactions (paginated)
curl -X GET "http://localhost:3000/v1/wallet/transactions?limit=20&page=1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get credit transactions only
curl -X GET "http://localhost:3000/v1/wallet/transactions?type=credit" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get transactions by reason
curl -X GET "http://localhost:3000/v1/wallet/transactions?reason=order_completion" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get transactions for specific order
curl -X GET "http://localhost:3000/v1/wallet/transactions?orderId=order_123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get transactions in date range
curl -X GET "http://localhost:3000/v1/wallet/transactions?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-24T23:59:59.000Z" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get sorted transactions
curl -X GET "http://localhost:3000/v1/wallet/transactions?sortBy=amount:desc&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 4. Get Transaction Summary

### Endpoint
```
GET /v1/wallet/transactions/summary
```

### Query Parameters
- **startDate**: Optional, ISO date string (summary from date)
- **endDate**: Optional, ISO date string (summary to date)

### Request Example
```
GET /v1/wallet/transactions/summary?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-24T23:59:59.000Z
```

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
    "summary": {
      "totalTransactions": 156,
      "totalCredits": 125000.00,
      "totalDebits": 75000.00,
      "netChange": 50000.00,
      "openingBalance": 50000.00,
      "closingBalance": 100000.00
    },
    "byType": {
      "credits": {
        "count": 89,
        "amount": 125000.00,
        "avgAmount": 1404.49,
        "maxAmount": 15000.00,
        "minAmount": 250.00
      },
      "debits": {
        "count": 67,
        "amount": 75000.00,
        "avgAmount": 1119.40,
        "maxAmount": 10000.00,
        "minAmount": 500.00
      }
    },
    "byReason": {
      "deposit": {
        "count": 5,
        "amount": 50000.00
      },
      "order_placement": {
        "count": 45,
        "amount": 75000.00
      },
      "order_completion": {
        "count": 40,
        "amount": 68000.00
      },
      "order_cancellation_refund": {
        "count": 5,
        "amount": 7000.00
      }
    },
    "dailyBreakdown": [
      {
        "date": "2025-12-24",
        "credits": 8500.00,
        "debits": 5000.00,
        "netChange": 3500.00,
        "transactionCount": 12
      },
      {
        "date": "2025-12-23",
        "credits": 12000.00,
        "debits": 8000.00,
        "netChange": 4000.00,
        "transactionCount": 18
      }
    ]
  }
}
```

### Error Responses
```json
// 400 - Invalid Date Range
{
  "code": 400,
  "message": "\"endDate\" must be greater than \"startDate\""
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Commands
```bash
# Get summary for all time
curl -X GET http://localhost:3000/v1/wallet/transactions/summary \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get summary for specific period
curl -X GET "http://localhost:3000/v1/wallet/transactions/summary?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-24T23:59:59.000Z" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get current month summary
curl -X GET "http://localhost:3000/v1/wallet/transactions/summary?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-31T23:59:59.000Z" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 5. Get Single Transaction Details

### Endpoint
```
GET /v1/wallet/transactions/:transactionId
```

### Path Parameters
- **transactionId**: Required, string (transaction ID)

### Request Example
```
GET /v1/wallet/transactions/txn_789ghi
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "txn_789ghi",
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "type": "credit",
    "amount": 10000.00,
    "reason": "deposit",
    "description": "Wallet deposit via admin",
    "balanceBefore": 90000.00,
    "balanceAfter": 100000.00,
    "orderId": null,
    "status": "completed",
    "timestamp": "2025-12-24T09:00:00.000Z",
    "metadata": {
      "addedBy": "admin_user_id",
      "adminName": "Admin User",
      "note": "Initial deposit",
      "ipAddress": "192.168.1.100"
    },
    "relatedTransactions": []
  }
}
```

### Error Responses
```json
// 404 - Transaction Not Found
{
  "code": 404,
  "message": "Transaction not found"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}

// 400 - Invalid Transaction ID
{
  "code": 400,
  "message": "\"transactionId\" must be a valid mongo id"
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/wallet/transactions/txn_789ghi \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 6. Add Funds (Admin Only)

### Endpoint
```
POST /v1/wallet/add-funds
```

### Headers
```
Authorization: Bearer {adminAccessToken}
```

### Request Body
```json
{
  "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "amount": 50000.00,
  "note": "Initial funding for trading simulation"
}
```

### Field Validations
- **userId**: Required, valid MongoDB ObjectId
- **amount**: Required, number, must be positive, min: 1, max: 10000000
- **note**: Optional, string, max length: 500

### Success Response (200)
```json
{
  "success": true,
  "message": "Funds added successfully",
  "data": {
    "transaction": {
      "id": "txn_new123",
      "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
      "type": "credit",
      "amount": 50000.00,
      "reason": "deposit",
      "description": "Wallet deposit via admin",
      "balanceBefore": 100000.00,
      "balanceAfter": 150000.00,
      "status": "completed",
      "timestamp": "2025-12-24T11:00:00.000Z",
      "metadata": {
        "addedBy": "admin_user_id",
        "note": "Initial funding for trading simulation"
      }
    },
    "wallet": {
      "balance": 150000.00,
      "availableBalance": 135000.00,
      "totalDeposits": 200000.00
    }
  }
}
```

### Error Responses
```json
// 403 - Forbidden (Not Admin)
{
  "code": 403,
  "message": "Forbidden"
}

// 400 - Invalid Amount
{
  "code": 400,
  "message": "\"amount\" must be greater than 0"
}

// 400 - Amount Too Large
{
  "code": 400,
  "message": "\"amount\" must be less than or equal to 10000000"
}

// 404 - User Not Found
{
  "code": 404,
  "message": "User not found"
}

// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/v1/wallet/add-funds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "amount": 50000.00,
    "note": "Initial funding for trading simulation"
  }'
```

---

## Test Cases

### TC-WALLET-01: Get Wallet Balance for Authenticated User
**Objective**: Verify wallet balance retrieval  
**Pre-conditions**: User authenticated, wallet exists  
**Steps**:
1. Send GET request to `/wallet`
2. Verify response status is 200
3. Verify balance, available balance, blocked amount returned
4. Verify totalDeposits and totalWithdrawals present

**Expected Result**: Wallet balance data returned successfully

---

### TC-WALLET-02: Get Wallet Balance without Authentication
**Objective**: Verify authentication is required  
**Steps**:
1. Send GET request without Authorization header
2. Verify response status is 401
3. Verify authentication error message

**Expected Result**: Request rejected with unauthorized error

---

### TC-WALLET-03: Get Wallet Balance for Non-existent User
**Objective**: Verify error handling for missing wallet  
**Pre-conditions**: User authenticated but no wallet exists  
**Steps**:
1. Send GET request to `/wallet`
2. Verify response status is 404
3. Verify error message

**Expected Result**: Request rejected with not found error

---

### TC-WALLET-04: Get Complete Wallet Details
**Objective**: Verify detailed wallet information retrieval  
**Pre-conditions**: User authenticated, wallet exists  
**Steps**:
1. Send GET request to `/wallet/details`
2. Verify response status is 200
3. Verify user info, balance, statistics included
4. Verify recent transactions included
5. Verify wallet status is present

**Expected Result**: Complete wallet details returned with all sections

---

### TC-WALLET-05: Verify Available Balance Calculation
**Objective**: Verify available balance = balance - blocked amount  
**Pre-conditions**: User has pending orders with blocked funds  
**Steps**:
1. Get wallet balance
2. Calculate: availableBalance = balance - blockedAmount
3. Verify calculation matches response

**Expected Result**: Available balance correctly calculated

---

### TC-WALLET-06: Get All Transactions (No Filters)
**Objective**: Verify transaction history retrieval  
**Pre-conditions**: User has transaction history  
**Steps**:
1. Send GET request to `/wallet/transactions`
2. Verify response status is 200
3. Verify results array contains transactions
4. Verify pagination info (page, limit, totalPages, totalResults)
5. Verify default limit is 10

**Expected Result**: Paginated transaction history returned

---

### TC-WALLET-07: Filter Transactions by Type (Credit)
**Objective**: Verify type filtering  
**Pre-conditions**: User has both credit and debit transactions  
**Steps**:
1. Send GET request with `type=credit`
2. Verify response status is 200
3. Verify all returned transactions are type "credit"
4. Verify no debit transactions returned

**Expected Result**: Only credit transactions returned

---

### TC-WALLET-08: Filter Transactions by Type (Debit)
**Objective**: Verify type filtering for debits  
**Pre-conditions**: User has both credit and debit transactions  
**Steps**:
1. Send GET request with `type=debit`
2. Verify response status is 200
3. Verify all returned transactions are type "debit"

**Expected Result**: Only debit transactions returned

---

### TC-WALLET-09: Filter Transactions by Reason
**Objective**: Verify reason filtering  
**Pre-conditions**: User has transactions with different reasons  
**Steps**:
1. Send GET request with `reason=order_completion`
2. Verify response status is 200
3. Verify all returned transactions have reason "order_completion"

**Expected Result**: Only matching reason transactions returned

---

### TC-WALLET-10: Filter Transactions by Order ID
**Objective**: Verify order-specific transaction filtering  
**Pre-conditions**: User has order-related transactions  
**Steps**:
1. Send GET request with `orderId=order_123`
2. Verify response status is 200
3. Verify all transactions are linked to order_123

**Expected Result**: Only transactions for specific order returned

---

### TC-WALLET-11: Filter Transactions by Date Range
**Objective**: Verify date range filtering  
**Pre-conditions**: User has transactions across multiple dates  
**Steps**:
1. Send GET request with startDate and endDate
2. Verify response status is 200
3. Verify all transaction timestamps are within date range
4. Verify no transactions outside range

**Expected Result**: Only transactions within date range returned

---

### TC-WALLET-12: Sort Transactions by Timestamp Descending
**Objective**: Verify sorting functionality  
**Pre-conditions**: User has multiple transactions  
**Steps**:
1. Send GET request with `sortBy=timestamp:desc`
2. Verify response status is 200
3. Verify transactions are sorted newest to oldest

**Expected Result**: Transactions returned in descending timestamp order

---

### TC-WALLET-13: Sort Transactions by Amount Descending
**Objective**: Verify sorting by amount  
**Pre-conditions**: User has transactions with varying amounts  
**Steps**:
1. Send GET request with `sortBy=amount:desc`
2. Verify response status is 200
3. Verify transactions sorted by highest to lowest amount

**Expected Result**: Transactions returned in descending amount order

---

### TC-WALLET-14: Paginate Transaction History
**Objective**: Verify pagination functionality  
**Pre-conditions**: User has more than 10 transactions  
**Steps**:
1. Send GET request with `limit=5&page=1`
2. Verify response has 5 results
3. Verify totalPages and totalResults accurate
4. Request page 2 with same limit
5. Verify different transactions returned

**Expected Result**: Pagination works correctly across pages

---

### TC-WALLET-15: Transaction History with Maximum Limit
**Objective**: Verify limit validation  
**Steps**:
1. Send GET request with `limit=100`
2. Verify response status is 200
3. Verify up to 100 results returned
4. Try with `limit=101`
5. Verify response status is 400

**Expected Result**: Max 100 limit enforced

---

### TC-WALLET-16: Transaction History with Invalid Filters
**Objective**: Verify filter validation  
**Steps**:
1. Send GET request with invalid type (e.g., "invalid")
2. Verify response status is 400
3. Verify validation error message

**Expected Result**: Invalid filters rejected with validation error

---

### TC-WALLET-17: Get Transaction Summary for All Time
**Objective**: Verify summary without date filters  
**Pre-conditions**: User has transaction history  
**Steps**:
1. Send GET request to `/wallet/transactions/summary`
2. Verify response status is 200
3. Verify summary includes totalCredits, totalDebits, netChange
4. Verify byType breakdown present
5. Verify byReason breakdown present

**Expected Result**: Complete transaction summary returned

---

### TC-WALLET-18: Get Transaction Summary for Date Range
**Objective**: Verify summary for specific period  
**Pre-conditions**: User has transactions across multiple dates  
**Steps**:
1. Send GET request with startDate and endDate
2. Verify response status is 200
3. Verify period info matches request
4. Verify summary calculations only include date range
5. Verify dailyBreakdown present

**Expected Result**: Summary calculated only for specified date range

---

### TC-WALLET-19: Transaction Summary Calculations
**Objective**: Verify summary calculations are accurate  
**Pre-conditions**: User has known transaction history  
**Steps**:
1. Get transaction summary
2. Manually calculate total credits, debits, net change
3. Verify summary values match manual calculations
4. Verify netChange = totalCredits - totalDebits

**Expected Result**: All summary calculations are accurate

---

### TC-WALLET-20: Transaction Summary with Invalid Date Range
**Objective**: Verify date range validation  
**Steps**:
1. Send GET request with endDate before startDate
2. Verify response status is 400
3. Verify validation error message

**Expected Result**: Invalid date range rejected

---

### TC-WALLET-21: Get Single Transaction Details
**Objective**: Verify individual transaction retrieval  
**Pre-conditions**: Valid transaction ID exists  
**Steps**:
1. Send GET request to `/wallet/transactions/:transactionId`
2. Verify response status is 200
3. Verify complete transaction details returned
4. Verify metadata included

**Expected Result**: Full transaction details returned

---

### TC-WALLET-22: Get Transaction with Invalid ID
**Objective**: Verify transaction ID validation  
**Steps**:
1. Send GET request with invalid transaction ID format
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Invalid ID rejected with validation error

---

### TC-WALLET-23: Get Non-existent Transaction
**Objective**: Verify error handling for missing transaction  
**Steps**:
1. Send GET request with valid format but non-existent ID
2. Verify response status is 404
3. Verify error message

**Expected Result**: Request rejected with not found error

---

### TC-WALLET-24: Admin Add Funds Successfully
**Objective**: Verify admin can add funds to user wallet  
**Pre-conditions**: Admin authenticated, target user exists  
**Steps**:
1. Send POST request to `/wallet/add-funds` as admin
2. Include userId, amount, and note
3. Verify response status is 200
4. Verify transaction created with type "credit"
5. Verify wallet balance increased
6. Get user wallet balance to confirm update

**Expected Result**: Funds added successfully, balance updated

---

### TC-WALLET-25: Add Funds with Negative Amount
**Objective**: Verify amount validation  
**Pre-conditions**: Admin authenticated  
**Steps**:
1. Send POST request with negative amount
2. Verify response status is 400
3. Verify validation error for amount

**Expected Result**: Negative amount rejected

---

### TC-WALLET-26: Add Funds with Zero Amount
**Objective**: Verify zero amount validation  
**Pre-conditions**: Admin authenticated  
**Steps**:
1. Send POST request with amount = 0
2. Verify response status is 400
3. Verify error message

**Expected Result**: Zero amount rejected

---

### TC-WALLET-27: Add Funds Exceeding Maximum
**Objective**: Verify maximum amount limit  
**Pre-conditions**: Admin authenticated  
**Steps**:
1. Send POST request with amount > 10000000
2. Verify response status is 400
3. Verify validation error for maximum limit

**Expected Result**: Amount exceeding limit rejected

---

### TC-WALLET-28: Add Funds as Non-Admin User
**Objective**: Verify permission enforcement  
**Pre-conditions**: Regular user authenticated (not admin)  
**Steps**:
1. Send POST request to `/wallet/add-funds`
2. Verify response status is 403
3. Verify forbidden error message

**Expected Result**: Non-admin user cannot add funds

---

### TC-WALLET-29: Add Funds to Non-existent User
**Objective**: Verify user existence validation  
**Pre-conditions**: Admin authenticated  
**Steps**:
1. Send POST request with non-existent userId
2. Verify response status is 404
3. Verify error message

**Expected Result**: Request rejected with user not found error

---

### TC-WALLET-30: Complete Wallet Workflow
**Objective**: Verify complete wallet operation flow  
**Steps**:
1. Login as admin
2. Add funds to user wallet
3. Login as user
4. Get wallet balance - verify funds added
5. Get wallet details
6. Get transaction history - verify deposit transaction
7. Get transaction summary - verify totals updated
8. Get specific transaction details

**Expected Result**: All wallet operations work together correctly

---

## Complete Workflow Test Scenario

### Scenario: New User Wallet Setup and First Transaction

```bash
# Step 1: Admin login
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "1111111111",
    "password": "Admin@123"
  }'

# Save admin token
# ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Step 2: Admin adds funds to user
curl -X POST http://localhost:3000/v1/wallet/add-funds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "amount": 100000.00,
    "note": "Initial trading capital"
  }'

# Step 3: User login
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "password": "User@123"
  }'

# Save user token
# USER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Step 4: User checks wallet balance
curl -X GET http://localhost:3000/v1/wallet \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Response should show 100000.00 balance

# Step 5: User gets wallet details
curl -X GET http://localhost:3000/v1/wallet/details \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 6: User views transaction history
curl -X GET "http://localhost:3000/v1/wallet/transactions?limit=10" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 7: User gets transaction summary
curl -X GET http://localhost:3000/v1/wallet/transactions/summary \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Step 8: User gets specific transaction details
# Extract transaction ID from history
curl -X GET http://localhost:3000/v1/wallet/transactions/txn_123 \
  -H "Authorization: Bearer ${USER_TOKEN}"
```

### Scenario: Transaction History Analysis

```bash
# Get all credit transactions
curl -X GET "http://localhost:3000/v1/wallet/transactions?type=credit&limit=50" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get all debit transactions
curl -X GET "http://localhost:3000/v1/wallet/transactions?type=debit&limit=50" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get order-related transactions
curl -X GET "http://localhost:3000/v1/wallet/transactions?reason=order_completion" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get this month's transactions
curl -X GET "http://localhost:3000/v1/wallet/transactions?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-31T23:59:59.000Z" \
  -H "Authorization: Bearer ${USER_TOKEN}"

# Get summary for current month
curl -X GET "http://localhost:3000/v1/wallet/transactions/summary?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-31T23:59:59.000Z" \
  -H "Authorization: Bearer ${USER_TOKEN}"
```

---

## Test Execution Checklist

### Environment Setup
- [ ] Backend server running
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] Admin user exists
- [ ] Test users created
- [ ] Wallets initialized

### Wallet Balance Tests
- [ ] TC-WALLET-01: Get balance (authenticated)
- [ ] TC-WALLET-02: Get balance (no auth)
- [ ] TC-WALLET-03: Non-existent wallet
- [ ] TC-WALLET-04: Get detailed info
- [ ] TC-WALLET-05: Available balance calculation

### Transaction History Tests
- [ ] TC-WALLET-06: Get all transactions
- [ ] TC-WALLET-07: Filter by credit
- [ ] TC-WALLET-08: Filter by debit
- [ ] TC-WALLET-09: Filter by reason
- [ ] TC-WALLET-10: Filter by order ID
- [ ] TC-WALLET-11: Date range filter
- [ ] TC-WALLET-12: Sort by timestamp
- [ ] TC-WALLET-13: Sort by amount
- [ ] TC-WALLET-14: Pagination
- [ ] TC-WALLET-15: Maximum limit
- [ ] TC-WALLET-16: Invalid filters

### Transaction Summary Tests
- [ ] TC-WALLET-17: Summary all time
- [ ] TC-WALLET-18: Summary date range
- [ ] TC-WALLET-19: Calculation accuracy
- [ ] TC-WALLET-20: Invalid date range

### Single Transaction Tests
- [ ] TC-WALLET-21: Get transaction details
- [ ] TC-WALLET-22: Invalid transaction ID
- [ ] TC-WALLET-23: Non-existent transaction

### Add Funds Tests (Admin)
- [ ] TC-WALLET-24: Add funds successfully
- [ ] TC-WALLET-25: Negative amount
- [ ] TC-WALLET-26: Zero amount
- [ ] TC-WALLET-27: Exceeding maximum
- [ ] TC-WALLET-28: Non-admin user
- [ ] TC-WALLET-29: Non-existent user

### Integration Tests
- [ ] TC-WALLET-30: Complete workflow
- [ ] Admin add funds → User check balance
- [ ] Transaction history after multiple operations
- [ ] Summary accuracy across operations

---

## Notes
- All endpoints require authentication except admin endpoints also require admin permission
- Wallet balance = totalDeposits - totalWithdrawals
- Available balance = balance - blockedAmount (funds in pending orders)
- Blocked amount is updated when orders are placed/cancelled/executed
- Transaction history supports pagination (default: 10 per page, max: 100)
- Transactions are immutable once created
- All amounts are in INR (Indian Rupees)
- Minimum deposit: ₹1, Maximum: ₹10,000,000
- Transaction reasons: deposit, withdrawal, order_placement, order_completion, order_cancellation_refund
- Admin can add funds but cannot withdraw

---

## Common Issues & Solutions

### Issue 1: Available Balance Incorrect
**Error**: Available balance doesn't match expected value  
**Solution**: Check for pending orders blocking funds, refresh wallet data

### Issue 2: Transaction Not Showing
**Error**: Recent transaction not in history  
**Solution**: Verify transaction completed, check filters/pagination, refresh query

### Issue 3: Summary Totals Mismatch
**Error**: Summary totals don't match transaction sum  
**Solution**: Verify date range includes all transactions, check for timezone issues

### Issue 4: Cannot Add Funds
**Error**: Admin add funds fails  
**Solution**: Verify admin role, check user exists, validate amount within limits

### Issue 5: Blocked Amount Not Releasing
**Error**: Funds remain blocked after order cancellation  
**Solution**: Verify order status updated, check order cancellation workflow

---

## Performance Considerations
- Get Balance: ~50-100ms (cached in Redis)
- Get Details: ~100-150ms (includes aggregations)
- Transaction History: ~100-200ms (paginated, indexed)
- Transaction Summary: ~200-500ms (aggregation pipeline)
- Single Transaction: ~50-100ms (direct query)
- Add Funds: ~150-300ms (creates transaction + updates wallet)

---

## Database Indexes
- Wallet: userId (unique)
- Transactions: userId, timestamp, type, reason, orderId
- Composite: userId + timestamp (for history queries)

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Related Documentation**: 
- [WebSocket Testing Guide](./websocket-testing.md)
- [Auth Testing Guide](./auth-testing.md)
- [Market Testing Guide](./market-testing.md)
- [Wallet System API](../WALLET_SYSTEM_API.md)
