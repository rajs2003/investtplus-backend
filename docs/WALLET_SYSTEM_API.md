# 💰 Wallet System API Documentation

## Overview
Complete wallet system for virtual trading with automatic creation on user registration.

---

## Features Implemented

✅ **Wallet Model**
- Balance tracking (total, available, locked)
- Initial balance: ₹10,00,000
- Profit/Loss tracking
- Return percentage calculation

✅ **Transaction Model**
- Complete transaction history
- Transaction types: credit/debit
- Detailed reasons tracking
- Order-linked transactions

✅ **Auto Wallet Creation**
- Wallet automatically created on user registration
- Initial balance credited
- Transaction record maintained

---

## API Endpoints

### 1. Get Wallet Balance
```http
GET /api/v1/wallet
Authorization: Bearer <token>
```

**Response:**
```json
{
  "balance": 1000000,
  "availableBalance": 1000000,
  "lockedAmount": 0,
  "initialBalance": 1000000,
  "totalProfit": 0,
  "totalLoss": 0,
  "netPL": 0,
  "returnPercentage": 0
}
```

### 2. Get Wallet Details
```http
GET /api/v1/wallet/details
Authorization: Bearer <token>
```

**Response:**
```json
{
  "balance": 1000000,
  "availableBalance": 1000000,
  "lockedAmount": 0,
  "initialBalance": 1000000,
  "totalProfit": 0,
  "totalLoss": 0,
  "netPL": 0,
  "returnPercentage": 0,
  "createdAt": "2025-12-14T10:00:00.000Z",
  "updatedAt": "2025-12-14T10:00:00.000Z"
}
```

### 3. Get Transaction History
```http
GET /api/v1/wallet/transactions
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: credit | debit
- `reason`: initial_deposit | bonus | stock_buy | stock_sell | charges | refund | order_cancelled | profit_realized | loss_realized | admin_credit | admin_debit
- `orderId`: Filter by specific order
- `startDate`: ISO date (2025-12-01)
- `endDate`: ISO date (2025-12-31)
- `sortBy`: createdAt:desc (default)
- `limit`: 10 (default), max 100
- `page`: 1 (default)

**Example:**
```http
GET /api/v1/wallet/transactions?type=debit&limit=20&page=1
```

**Response:**
```json
{
  "results": [
    {
      "id": "67...",
      "userId": "67...",
      "walletId": "67...",
      "type": "credit",
      "amount": 1000000,
      "reason": "initial_deposit",
      "orderId": null,
      "balanceBefore": 0,
      "balanceAfter": 1000000,
      "description": "Initial virtual balance credited",
      "metadata": {},
      "createdAt": "2025-12-14T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

### 4. Get Transaction Summary
```http
GET /api/v1/wallet/transactions/summary
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate`: ISO date (optional)
- `endDate`: ISO date (optional)

**Response:**
```json
{
  "credit": {
    "totalAmount": 1000000,
    "count": 1
  },
  "debit": {
    "totalAmount": 0,
    "count": 0
  }
}
```

### 5. Get Single Transaction
```http
GET /api/v1/wallet/transactions/:transactionId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "67...",
  "userId": "67...",
  "walletId": "67...",
  "type": "credit",
  "amount": 1000000,
  "reason": "initial_deposit",
  "orderId": null,
  "balanceBefore": 0,
  "balanceAfter": 1000000,
  "description": "Initial virtual balance credited",
  "metadata": {},
  "createdAt": "2025-12-14T10:00:00.000Z"
}
```

### 6. Add Funds (Admin Only)
```http
POST /api/v1/wallet/add-funds
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "userId": "67...",
  "amount": 50000,
  "reason": "bonus",
  "description": "Welcome bonus"
}
```

**Response:**
```json
{
  "message": "Funds added successfully",
  "wallet": {
    "balance": 1050000,
    "availableBalance": 1050000
  }
}
```

---

## Testing Flow

### 1. Register New User
```bash
POST http://localhost:3000/api/v1/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test@123",
  "ldap": "test123",
  "phoneNumber": "+919876543210"
}
```

**✅ Wallet automatically created with ₹10,00,000**

### 2. Login
```bash
POST http://localhost:3000/api/v1/auth/login
{
  "phone": "+919876543210",
  "password": "Test@123"
}
```

Copy the `access.token` from response.

### 3. Check Wallet Balance
```bash
GET http://localhost:3000/api/v1/wallet
Authorization: Bearer <your-token>
```

### 4. Check Transaction History
```bash
GET http://localhost:3000/api/v1/wallet/transactions
Authorization: Bearer <your-token>
```

You should see initial deposit transaction of ₹10,00,000.

---

## Wallet Service Functions

### For Order System (Internal Use)

#### Lock Funds (When Order Placed)
```javascript
await walletService.lockFunds(userId, amount, orderId);
```

#### Execute Order Payment (When Order Executed)
```javascript
await walletService.executeOrderPayment(userId, lockedAmount, actualAmount, orderId);
```

#### Unlock Funds (When Order Cancelled)
```javascript
await walletService.unlockFunds(userId, amount, orderId);
```

#### Credit Sale Proceeds (When Stock Sold)
```javascript
await walletService.creditSaleProceeds(userId, amount, orderId, isProfit);
```

---

## Transaction Reasons

| Reason | Description |
|--------|-------------|
| `initial_deposit` | Initial virtual balance |
| `bonus` | Promotional bonus |
| `stock_buy` | Stock purchase |
| `stock_sell` | Stock sale |
| `charges` | Brokerage/charges deduction |
| `refund` | Order cancellation refund |
| `order_cancelled` | Unlocked amount from cancelled order |
| `profit_realized` | Profit from stock sale |
| `loss_realized` | Loss from stock sale |
| `admin_credit` | Admin credited funds |
| `admin_debit` | Admin deducted funds |

---

## Wallet Calculations

### Available Balance
```
availableBalance = balance - lockedAmount
```

### Net P&L
```
netPL = totalProfit - totalLoss
```

### Return Percentage
```
returnPercentage = ((balance - initialBalance) / initialBalance) * 100
```

---

## Error Handling

### Common Errors

#### Insufficient Balance
```json
{
  "code": 400,
  "message": "Insufficient balance"
}
```

#### Wallet Not Found
```json
{
  "code": 404,
  "message": "Wallet not found"
}
```

#### Wallet Already Exists
```json
{
  "code": 400,
  "message": "Wallet already exists for this user"
}
```

---

## Database Models

### Wallet Schema
```javascript
{
  userId: ObjectId (ref: User, unique, indexed),
  balance: Number (min: 0),
  lockedAmount: Number (min: 0),
  availableBalance: Number (min: 0),
  initialBalance: Number (default: 1000000),
  totalProfit: Number,
  totalLoss: Number,
  timestamps: true
}
```

### Transaction Schema
```javascript
{
  userId: ObjectId (ref: User, indexed),
  walletId: ObjectId (ref: Wallet, indexed),
  type: Enum ['credit', 'debit'],
  amount: Number (min: 0),
  reason: Enum [...],
  orderId: ObjectId (ref: Order, optional),
  balanceBefore: Number,
  balanceAfter: Number,
  description: String,
  metadata: Mixed,
  timestamps: true
}
```

---

## Next Steps

1. ✅ **Wallet System** - COMPLETED
2. 🔄 **Order System** - Next Phase
3. ⏳ **Holdings & Portfolio**
4. ⏳ **Watchlist**
5. ⏳ **Dashboard & Analytics**

---

**Status:** ✅ Production Ready  
**Last Updated:** December 14, 2025
