# 📋 Phase 2: Order Management System - Requirements Document

**Created:** December 14, 2025  
**Status:** Ready for Implementation  
**Priority:** High - Core Trading Functionality

---

## 🎯 Overview

Complete order management system jo real market scenario simulate kare with proper charges, order types, execution logic aur wallet integration.

---

## ✅ Prerequisites (Already Completed)

- ✅ Phase 1: Wallet System (Production Ready)
- ✅ User Authentication & Authorization
- ✅ AngelOne SmartAPI Integration (Market Data)
- ✅ WebSocket for Real-time Prices
- ✅ MongoDB & Redis Setup

---

## 📊 Functional Requirements

### 1. Order Placement
**User Story:** User should be able to place buy/sell orders for stocks with different order types

#### Order Types (Mandatory)
1. **Intraday Trading**
   - Same-day buy and sell
   - Position auto-squares off at 3:20 PM
   - Higher leverage (margin available)
   - Both sides ka STT charge

2. **Delivery Trading**
   - Long-term holdings
   - T+2 settlement (simulated)
   - Full payment required upfront
   - Only sell side ka STT

#### Order Variants (Priority Implementation)
1. **Market Order** (Phase 2.1 - Highest Priority)
   - Instant execution at current market price
   - No price specification required
   - Guaranteed execution (if market open)

2. **Limit Order** (Phase 2.2)
   - Execute only when price reaches specified level
   - Background job for price monitoring
   - Partial execution support

3. **Stop Loss (SL)** (Phase 2.3)
   - Risk management order
   - Triggers when price hits trigger price
   - Then becomes market order

4. **Stop Loss Market (SLM)** (Phase 2.4)
   - Trigger at price, execute immediately
   - No limit price specification

#### Transaction Types
- **BUY:** Purchase stocks
- **SELL:** Exit positions (holdings must exist)

---

### 2. Order Validation Rules

#### Pre-Order Checks
1. **Market Timing Check**
   - Market open: 9:15 AM - 3:30 PM (Mon-Fri)
   - Pre-market: 9:00 AM - 9:15 AM (optional Phase 2.5)
   - After market: 3:40 PM - 4:00 PM (optional Phase 2.5)
   - Reject orders outside market hours

2. **Stock Validation**
   - Valid symbol and exchange
   - Stock exists in AngelOne data
   - Not in ban list (optional Phase 2.6)

3. **Quantity Validation**
   - Minimum quantity: 1
   - Maximum quantity: 10,000 per order
   - Lot size validation for F&O (future phase)

4. **Balance Validation**
   - Check available wallet balance
   - Calculate total required amount = (quantity × price) + charges
   - For sell orders: check holdings availability

5. **Price Validation**
   - Limit price must be within circuit limits
   - Stop loss price must be logical (below current for sell, above for buy)

---

### 3. Charges Calculator (Real Market Simulation)

#### Charge Components
```javascript
// BUY ORDER EXAMPLE (Intraday)
Stock Price: ₹100
Quantity: 100
Order Value: ₹10,000

1. Brokerage: ₹20 or 0.03% (whichever lower) = ₹20
2. STT (Buy + Sell): 0.025% × 2 = ₹5
3. Transaction Charges: 0.00325% = ₹0.33
4. GST: 18% on (brokerage + transaction) = ₹3.66
5. SEBI Charges: ₹10 per crore = ₹0.01
6. Stamp Duty: 0.015% on buy = ₹1.50

Total Charges: ₹30.50
Net Debit: ₹10,030.50
```

#### Charge Formulas
```javascript
orderValue = quantity × price

brokerage = Math.min(20, orderValue × 0.0003)

stt = {
  intraday: {
    buy: orderValue × 0.00025,
    sell: orderValue × 0.00025
  },
  delivery: {
    buy: 0,
    sell: orderValue × 0.001
  }
}

transactionCharges = orderValue × 0.0000325
gst = (brokerage + transactionCharges) × 0.18
sebiCharges = orderValue × 0.0000001
stampDuty = {
  buy: orderValue × 0.00015,
  sell: 0
}

totalCharges = brokerage + stt + transactionCharges + gst + sebiCharges + stampDuty
netAmount = orderValue + totalCharges
```

---

### 4. Order Execution Logic

#### Market Order Flow
```
User places market order
  ↓
Validate order (timing, stock, quantity, balance)
  ↓
Calculate charges
  ↓
Lock funds in wallet (netAmount)
  ↓
Create order record (status: 'pending')
  ↓
Get current market price from AngelOne
  ↓
Execute order immediately
  ↓
Update order (status: 'executed', executedPrice, executedAt)
  ↓
Deduct locked funds permanently
  ↓
Create transaction record
  ↓
Update/Create holding
  ↓
Return success response
```

#### Limit Order Flow
```
User places limit order
  ↓
Validate order
  ↓
Calculate estimated charges
  ↓
Lock funds (based on limit price)
  ↓
Create order record (status: 'pending')
  ↓
Background job starts monitoring
  ↓
Every 2 seconds: Check if market price reached limit price
  ↓
If condition met:
  - Execute order
  - Update holdings
  - Mark order as 'executed'
  ↓
If not met after 24 hours or user cancels:
  - Unlock funds
  - Mark order as 'cancelled' or 'expired'
```

#### Stop Loss Order Flow
```
User places SL order with trigger price
  ↓
Validate order
  ↓
Lock funds (based on limit price)
  ↓
Create order (status: 'pending')
  ↓
Background job monitors trigger price
  ↓
When price hits trigger:
  - Convert to market order
  - Execute at current price
  - Update order status
  - Update holdings
```

---

### 5. Order Status Lifecycle

```
PENDING → Order placed, waiting for execution
   ↓
EXECUTED → Successfully executed
   ↓
COMPLETED → Holdings updated, wallet settled

PENDING → User cancels
   ↓
CANCELLED → Funds unlocked, order cancelled

PENDING → System rejects (insufficient balance, invalid stock)
   ↓
REJECTED → Funds unlocked (if any)

PENDING → Limit order expires
   ↓
EXPIRED → Funds unlocked
```

---

### 6. Order Priority & Execution Sequence

#### Market Open (9:15 AM)
1. Execute all pending market orders
2. Start monitoring limit orders
3. Start monitoring stop loss orders

#### During Market Hours
- Market orders: Execute immediately
- Limit orders: Check every 2 seconds
- Stop loss: Check every 2 seconds

#### Market Close (3:30 PM)
1. Stop accepting new orders
2. Square off all intraday positions at 3:20 PM
3. Cancel all pending intraday orders at 3:30 PM
4. Keep delivery pending orders for next day

---

### 7. Wallet Integration

#### For BUY Orders
```javascript
availableBalance >= (quantity × price) + totalCharges
  ↓
Lock amount = netAmount
  ↓
On execution:
  - wallet.lockedAmount -= netAmount
  - wallet.balance -= netAmount
  - wallet.updateAvailableBalance()
  ↓
Create transaction (type: 'debit', reason: 'stock_buy')
```

#### For SELL Orders
```javascript
Check holdings: quantity <= holdingQuantity
  ↓
No balance lock required (already own stocks)
  ↓
On execution:
  - proceeds = (quantity × executedPrice) - totalCharges
  - wallet.balance += proceeds
  - wallet.updateAvailableBalance()
  ↓
Create transaction (type: 'credit', reason: 'stock_sell')
  ↓
Update P&L: totalProfit or totalLoss
```

---

### 8. Error Handling

#### Common Errors
1. **Insufficient Balance**
   - Message: "Insufficient balance. Required: ₹10,500, Available: ₹8,000"
   - Status: 400
   - Action: Reject order

2. **Market Closed**
   - Message: "Market is closed. Trading hours: 9:15 AM - 3:30 PM"
   - Status: 400
   - Action: Reject order

3. **Invalid Stock**
   - Message: "Stock symbol 'XYZ' not found"
   - Status: 404
   - Action: Reject order

4. **Insufficient Holdings**
   - Message: "Cannot sell 100 shares. You only hold 50 shares of RELIANCE"
   - Status: 400
   - Action: Reject order

5. **Order Execution Failed**
   - Rollback: Unlock funds, revert wallet balance
   - Message: "Order execution failed: [reason]"
   - Status: 500

---

## 🏗️ Technical Requirements

### Database Indexes
```javascript
// Order Model Indexes
{userId: 1, createdAt: -1}  // User's order history
{userId: 1, status: 1}       // Filter by status
{symbol: 1, status: 1}       // Symbol-wise orders
{status: 1, createdAt: 1}    // Pending orders processing
```

### API Response Time Targets
- Place order: < 500ms
- Get orders list: < 200ms
- Cancel order: < 300ms
- Order execution (market): < 1 second
- Limit order check: Every 2 seconds

### Concurrency Handling
- Use MongoDB transactions for atomic operations
- Lock wallet during order placement
- Retry logic for failed executions (max 3 attempts)
- Queue-based order processing (Bull Queue)

---

## 📦 Deliverables

### Models
1. ✅ Order Model (order.model.js)
   - Complete schema with all fields
   - Indexes on userId, status, symbol
   - Virtual fields for calculations

### Services
2. ✅ Order Service (order.service.js)
   - placeOrder()
   - executeOrder()
   - cancelOrder()
   - getOrders()
   - getOrderById()
   - getPendingOrders()

3. ✅ Charges Calculator Service (charges.service.js)
   - calculateCharges()
   - calculateBrokerage()
   - calculateSTT()
   - calculateTotalCharges()

4. ✅ Order Execution Service (orderExecution.service.js)
   - executeMarketOrder()
   - executeLimitOrder()
   - executeStopLossOrder()
   - validateMarketTiming()
   - getMarketPrice()

### Controllers
5. ✅ Order Controller (order.controller.js)
   - placeOrder
   - cancelOrder
   - getOrders
   - getOrderById
   - getPendingOrders
   - getOrderHistory

### Routes
6. ✅ Order Routes (order.route.js)
   - POST /v1/orders/place
   - POST /v1/orders/:orderId/cancel
   - GET /v1/orders
   - GET /v1/orders/pending
   - GET /v1/orders/history
   - GET /v1/orders/:orderId

### Validations
7. ✅ Order Validation (order.validation.js)
   - placeOrder schema
   - getOrders schema
   - cancelOrder schema

### Background Jobs
8. ✅ Bull Queue Setup
   - Order execution queue
   - Limit order monitoring job
   - Stop loss monitoring job
   - Auto square-off job (3:20 PM)

### Documentation
9. ✅ API Documentation
   - All endpoints with examples
   - cURL commands
   - JavaScript examples
   - Error codes reference

### Testing
10. ✅ Manual Testing Checklist
    - Place market order (buy)
    - Place limit order
    - Cancel pending order
    - Execute limit order when price met
    - Insufficient balance scenario
    - Market closed scenario
    - Sell without holdings scenario

---

## 🎯 Success Criteria

### Functional
- ✅ User can place market buy/sell orders
- ✅ User can place limit orders
- ✅ Orders execute at correct prices
- ✅ Charges calculated accurately
- ✅ Wallet balance updates correctly
- ✅ Holdings created/updated after execution
- ✅ Pending orders can be cancelled
- ✅ Limit orders execute when condition met

### Technical
- ✅ All endpoints respond within target time
- ✅ Zero data inconsistency (wallet + order + holding)
- ✅ Proper error handling with rollback
- ✅ Transaction atomicity maintained
- ✅ Background jobs running reliably
- ✅ No memory leaks in long-running processes

### Production Readiness
- ✅ Comprehensive input validation
- ✅ Detailed error messages
- ✅ Proper logging for debugging
- ✅ API documentation complete
- ✅ Testing checklist completed
- ✅ Code quality score: 95+/100

---

## 📈 Implementation Phases

### Phase 2.1: Market Orders (Day 1)
- Order Model
- Order Service (market orders only)
- Charges Calculator
- Order Controller & Routes
- Validations
- Testing

### Phase 2.2: Limit Orders (Day 1)
- Bull Queue Setup
- Limit order execution job
- Order monitoring service
- Testing

### Phase 2.3: Order Management (Day 1)
- Cancel order functionality
- Order history & filtering
- Pending orders view
- Edge case handling

### Phase 2.4: Stop Loss Orders (Optional - Day 2)
- SL/SLM order variants
- Trigger monitoring job
- Testing

---

## 🔐 Security Considerations

1. **Authorization**
   - User can only view/cancel own orders
   - Admin can view all orders
   - No order modification after execution

2. **Data Validation**
   - Sanitize all inputs
   - Validate stock symbols against whitelist
   - Prevent SQL/NoSQL injection
   - Rate limiting on order placement (max 10 orders/minute)

3. **Financial Integrity**
   - Use MongoDB transactions
   - Atomic wallet updates
   - Audit trail for all order operations
   - Daily reconciliation jobs

---

## 📊 Monitoring & Alerts

### Metrics to Track
- Orders placed per minute
- Order execution success rate
- Average execution time
- Failed orders count
- Wallet balance mismatches
- Background job failures

### Alerts Setup
- Alert if order execution > 2 seconds
- Alert if wallet mismatch detected
- Alert if background job fails
- Alert if order success rate < 95%

---

## 🚀 Ready to Implement!

**Next Step:** Create detailed TODO list and start implementation

**Estimated Time:** 6-8 hours for complete Phase 2

**Team Required:** 1 Backend Developer (You! 💪)

