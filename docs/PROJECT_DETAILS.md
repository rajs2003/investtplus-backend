# 🎯 Stock Market Simulation Platform - Project Details

## 📋 Project Overview

**Project Name:** InvesttPlus - Stock Market Simulation Platform  
**Type:** Paper Trading / Virtual Trading Application  
**Scale:** Production-ready, handles 20k-30k concurrent users  
**Tech Stack:** Node.js, Express, MongoDB, Redis, AngelOne SmartAPI (data feed only)

---

## 🎨 Core Concept

Ek complete stock market simulation platform jahan users real market experience kar sakte hain bina actual money invest kiye. Sab transactions, orders, holdings virtual hain lekin market data real-time hai.

---

## ✨ Key Features

### 1. User Management
- **Registration & Login**
  - Email/Phone based registration
  - OTP verification
  - Password management
  - JWT authentication
  
- **Account Setup Process**
  - Basic information form
  - Terms & Conditions acceptance
  - Risk disclosure agreement
  - Virtual wallet creation with initial balance

### 2. Virtual Wallet System
- **Initial Balance:** ₹10,00,000 (configurable)
- **Wallet Operations:**
  - View balance
  - Transaction history
  - Fund addition (virtual)
  - Withdrawal (virtual)
  - Balance locked in orders
  - Available balance tracking

### 3. Dashboard
- **Market Overview**
  - Nifty/Sensex indices
  - Top gainers/losers
  - Most active stocks
  - Market status (open/closed)
  
- **Popular Stocks List**
  - Stock name, symbol
  - Current price (real-time)
  - Change percentage
  - Volume
  
- **Search Functionality**
  - Search by stock name/symbol
  - Auto-suggestions
  - Recent searches
  - Watchlist quick add

### 4. Stock Trading (Real Market Scenario)

#### Order Types
1. **Intraday Trading**
   - Same-day buy and sell
   - Auto square-off at market close
   - Higher margin available
   
2. **Delivery/Equity Trading**
   - Long-term holdings
   - T+2 settlement
   - Full payment required

#### Order Placement Flow
```
User selects stock
  ↓
Choose order type (Intraday/Delivery)
  ↓
Select quantity OR amount (₹100 worth)
  ↓
Choose order variant (Market/Limit)
  ↓
Set price (if limit order)
  ↓
Review order
  ↓
Place order (balance check)
  ↓
Order created (pending)
  ↓
Order execution (based on market timing)
  ↓
Balance deduction
  ↓
Holdings updated
```

#### Order Variants
- **Market Order:** Instant execution at current market price
- **Limit Order:** Execute when price reaches specified level
- **Stop Loss:** Risk management order
- **Cover Order:** Intraday with mandatory stop loss
- **Bracket Order:** Target + Stop loss together

#### Calculation & Charges
Real market calculations:
- **Brokerage:** ₹20 per order or 0.03% (whichever lower)
- **STT:** 0.025% on sell side (delivery), 0.025% on both sides (intraday)
- **Transaction Charges:** 0.00325% (NSE), 0.00375% (BSE)
- **GST:** 18% on brokerage + transaction charges
- **SEBI Charges:** ₹10 per crore
- **Stamp Duty:** 0.015% on buy side

### 5. Portfolio Management

#### Holdings
- **Delivery Holdings:**
  - Stock name, quantity
  - Average buy price
  - Current price
  - P&L (absolute & percentage)
  - Investment value vs Current value
  
- **Intraday Positions:**
  - Open positions
  - Unrealized P&L
  - Auto square-off time countdown

#### Orders
- **Pending Orders:** Limit orders waiting for execution
- **Executed Orders:** Completed transactions
- **Cancelled Orders:** User cancelled or rejected
- **Order History:** Complete order book

### 6. Watchlist
- Create multiple watchlists
- Add/remove stocks
- Quick view of watched stocks prices
- Price alerts (optional)

### 7. Reports & Analytics
- **P&L Statement:** Daily/Weekly/Monthly
- **Trade History:** All executed trades
- **Tax Reports:** Capital gains (virtual)
- **Performance Charts:** Portfolio growth
- **Stock-wise Analysis:** Best/worst performers

---

## 🏗️ Technical Architecture

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)              │
│  Dashboard | Trading | Portfolio | Orders | Watchlist   │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ REST APIs + WebSocket
                         │
┌────────────────────────▼────────────────────────────────┐
│                  API Gateway / Load Balancer             │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼─────────┐          ┌─────────▼──────────┐
│   Auth Service   │          │   Trading Service   │
│  - Registration  │          │   - Order Placement │
│  - Login/Logout  │          │   - Order Execution │
│  - JWT Tokens    │          │   - Holdings Update │
└──────────────────┘          └────────────────────┘
         │                               │
┌────────▼─────────┐          ┌─────────▼──────────┐
│  Wallet Service  │          │  Portfolio Service  │
│  - Balance Mgmt  │          │   - P&L Calculation │
│  - Transactions  │          │   - Reports         │
└──────────────────┘          └────────────────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    Database Layer                        │
│  MongoDB (Primary) + Redis (Cache) + Bull Queue (Jobs)  │
└─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              AngelOne SmartAPI (Read-Only)               │
│         Real-time Market Data Feed via WebSocket        │
└─────────────────────────────────────────────────────────┘
```

### Database Schema Design

#### User Model
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  phone: String (unique, indexed),
  password: String (hashed),
  name: String,
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean,
  accountStatus: Enum ['pending', 'active', 'suspended'],
  kycCompleted: Boolean,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

#### Wallet Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, indexed),
  balance: Number,
  lockedAmount: Number, // In pending orders
  availableBalance: Number, // balance - lockedAmount
  initialBalance: Number,
  totalProfit: Number,
  totalLoss: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Transaction Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (indexed),
  walletId: ObjectId,
  type: Enum ['credit', 'debit'],
  amount: Number,
  reason: Enum ['initial_deposit', 'stock_buy', 'stock_sell', 'charges', 'refund'],
  orderId: ObjectId (optional),
  balanceBefore: Number,
  balanceAfter: Number,
  description: String,
  createdAt: Date (indexed)
}
```

#### Order Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (indexed),
  symbol: String (indexed),
  exchange: String,
  tradingSymbol: String,
  symbolToken: String,
  
  // Order Details
  orderType: Enum ['intraday', 'delivery'],
  orderVariant: Enum ['market', 'limit', 'sl', 'slm'],
  transactionType: Enum ['buy', 'sell'],
  quantity: Number,
  price: Number, // For limit orders
  triggerPrice: Number, // For SL orders
  
  // Order Status
  status: Enum ['pending', 'executed', 'cancelled', 'rejected', 'partial'],
  executedQuantity: Number,
  executedPrice: Number,
  executedAt: Date,
  
  // Financial Details
  orderValue: Number,
  brokerage: Number,
  stt: Number,
  transactionCharges: Number,
  gst: Number,
  stampDuty: Number,
  totalCharges: Number,
  netAmount: Number, // orderValue + totalCharges
  
  // Metadata
  createdAt: Date (indexed),
  updatedAt: Date,
  cancelledAt: Date,
  cancellationReason: String
}
```

#### Holding Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (indexed),
  symbol: String (indexed),
  exchange: String,
  tradingSymbol: String,
  
  // Holding Details
  holdingType: Enum ['intraday', 'delivery'],
  quantity: Number,
  averageBuyPrice: Number,
  totalInvestment: Number,
  
  // P&L Tracking
  currentPrice: Number (updated real-time),
  currentValue: Number,
  unrealizedPL: Number,
  unrealizedPLPercentage: Number,
  
  // For Intraday
  autoSquareOffTime: Date, // 3:20 PM
  isSquaredOff: Boolean,
  
  // Metadata
  buyOrders: [ObjectId], // Array of order IDs
  createdAt: Date,
  updatedAt: Date
}
```

#### Trade Model (Completed Transactions)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (indexed),
  symbol: String (indexed),
  
  // Trade Details
  buyOrderId: ObjectId,
  sellOrderId: ObjectId,
  quantity: Number,
  buyPrice: Number,
  sellPrice: Number,
  tradeType: Enum ['intraday', 'delivery'],
  
  // P&L
  grossPL: Number,
  totalCharges: Number,
  netPL: Number,
  plPercentage: Number,
  
  // Timestamps
  buyDate: Date,
  sellDate: Date,
  createdAt: Date (indexed)
}
```

#### Watchlist Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (indexed),
  name: String,
  stocks: [{
    symbol: String,
    exchange: String,
    tradingSymbol: String,
    symbolToken: String,
    addedAt: Date
  }],
  isDefault: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔄 Business Logic Flow

### Order Execution Logic

```javascript
// Pseudo-code for order execution

async function executeOrder(orderId) {
  const order = await Order.findById(orderId);
  const user = await User.findById(order.userId);
  const wallet = await Wallet.findOne({ userId: user._id });
  
  // 1. Market timing check
  if (!isMarketOpen()) {
    return rejectOrder(orderId, 'Market closed');
  }
  
  // 2. Get current market price (from AngelOne)
  const currentPrice = await getRealtimePrice(order.symbol, order.exchange);
  
  // 3. For limit orders, check if price reached
  if (order.orderVariant === 'limit') {
    if (order.transactionType === 'buy' && currentPrice > order.price) {
      return; // Wait for price to come down
    }
    if (order.transactionType === 'sell' && currentPrice < order.price) {
      return; // Wait for price to go up
    }
  }
  
  // 4. Calculate charges
  const charges = calculateCharges(order, currentPrice);
  
  // 5. Check wallet balance
  const requiredAmount = (order.quantity * currentPrice) + charges.total;
  if (wallet.availableBalance < requiredAmount) {
    return rejectOrder(orderId, 'Insufficient balance');
  }
  
  // 6. Execute order
  order.status = 'executed';
  order.executedPrice = currentPrice;
  order.executedQuantity = order.quantity;
  order.executedAt = new Date();
  order.totalCharges = charges.total;
  order.netAmount = requiredAmount;
  await order.save();
  
  // 7. Update wallet
  wallet.balance -= requiredAmount;
  wallet.lockedAmount -= requiredAmount; // Was locked when order placed
  await wallet.save();
  
  // 8. Create transaction record
  await Transaction.create({
    userId: user._id,
    walletId: wallet._id,
    type: 'debit',
    amount: requiredAmount,
    reason: 'stock_buy',
    orderId: order._id,
    balanceBefore: wallet.balance + requiredAmount,
    balanceAfter: wallet.balance
  });
  
  // 9. Update or create holding
  await updateHolding(order, currentPrice);
  
  // 10. Send notification
  await sendOrderExecutedNotification(user, order);
}
```

### Auto Square-off (Intraday)

```javascript
// Cron job runs at 3:20 PM daily
async function autoSquareOffIntradayPositions() {
  const openIntradayHoldings = await Holding.find({
    holdingType: 'intraday',
    isSquaredOff: false,
    quantity: { $gt: 0 }
  });
  
  for (const holding of openIntradayHoldings) {
    // Create sell order at market price
    const currentPrice = await getRealtimePrice(holding.symbol, holding.exchange);
    
    const sellOrder = await Order.create({
      userId: holding.userId,
      symbol: holding.symbol,
      exchange: holding.exchange,
      tradingSymbol: holding.tradingSymbol,
      orderType: 'intraday',
      orderVariant: 'market',
      transactionType: 'sell',
      quantity: holding.quantity,
      status: 'pending'
    });
    
    // Execute immediately
    await executeOrder(sellOrder._id);
    
    // Mark holding as squared off
    holding.isSquaredOff = true;
    await holding.save();
    
    // Calculate and record P&L
    await calculateAndRecordTrade(holding, sellOrder);
  }
}
```

---

## 🚀 Performance Optimization

### For 20k-30k Concurrent Users

1. **Database Optimization**
   - Proper indexing on frequently queried fields
   - MongoDB sharding for horizontal scaling
   - Connection pooling
   - Query optimization

2. **Caching Strategy (Redis)**
   - Cache market data (1-2 second TTL)
   - Cache user sessions
   - Cache popular stocks list
   - Cache watchlists

3. **Load Balancing**
   - Nginx reverse proxy
   - Multiple Node.js instances (PM2 cluster mode)
   - Horizontal scaling with Docker/Kubernetes

4. **WebSocket Optimization**
   - Separate WebSocket server
   - Redis pub/sub for multi-server WebSocket sync
   - Connection throttling

5. **Background Jobs (Bull Queue)**
   - Order execution queue
   - Auto square-off jobs
   - P&L calculation jobs
   - Notification jobs

6. **API Rate Limiting**
   - Per-user rate limits
   - IP-based rate limits
   - Prevent DDoS

---

## 🔒 Security Measures

1. **Authentication**
   - JWT with refresh tokens
   - Password hashing (bcrypt)
   - 2FA (optional)

2. **Data Protection**
   - Input validation (Joi)
   - SQL/NoSQL injection prevention
   - XSS protection
   - CORS configuration

3. **API Security**
   - Rate limiting
   - Request size limits
   - Helmet.js headers
   - API versioning

4. **Audit Trail**
   - All transactions logged
   - Order history maintained
   - Failed login attempts tracked

---

## 📊 Monitoring & Logging

1. **Application Monitoring**
   - Winston logger
   - Error tracking (Sentry)
   - Performance monitoring (New Relic/DataDog)

2. **Database Monitoring**
   - MongoDB Atlas monitoring
   - Query performance tracking
   - Connection pool monitoring

3. **Server Monitoring**
   - CPU/Memory usage
   - Disk I/O
   - Network bandwidth
   - Uptime monitoring

---

## 🧪 Testing Strategy

1. **Unit Tests:** Jest for service functions
2. **Integration Tests:** API endpoint testing
3. **Load Tests:** Artillery/K6 for 30k concurrent users
4. **E2E Tests:** Cypress for critical flows

---

## 📦 Deployment

1. **Development:** Local + Docker
2. **Staging:** AWS/Azure with CI/CD
3. **Production:** 
   - Load balanced servers
   - Auto-scaling groups
   - CDN for static assets
   - Database replication

---

## 🎯 Success Metrics

1. Order execution time < 500ms
2. API response time < 200ms
3. 99.9% uptime
4. Handle 30k concurrent users
5. Real-time price updates < 1s latency

---

**Status:** Ready for Implementation  
**Priority:** High  
**Timeline:** 4-6 weeks for MVP
