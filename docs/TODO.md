# 📝 Stock Market Simulation Platform - TODO List

## 🎯 Implementation Roadmap

**Start Date:** December 14, 2025  
**Target:** Production-ready MVP

---

## ✅ COMPLETED

### Phase 0: Initial Setup
- [x] Project structure created
- [x] Basic Express.js setup
- [x] MongoDB connection
- [x] Redis setup
- [x] User authentication (register/login)
- [x] JWT token management
- [x] AngelOne SmartAPI integration (market data feed)
- [x] Real-time WebSocket for market data
- [x] Basic API documentation

---

## 🚀 PHASE 1: WALLET SYSTEM (CURRENT PRIORITY)

### 1.1 Database Models
- [ ] **Wallet Model** - Core wallet schema
  - userId reference
  - balance, lockedAmount, availableBalance
  - initialBalance, totalProfit, totalLoss
  - Timestamps
  
- [ ] **Transaction Model** - Transaction history
  - userId, walletId references
  - type (credit/debit)
  - amount, reason
  - orderId reference (optional)
  - balanceBefore, balanceAfter
  - description, timestamps

### 1.2 Wallet Service
- [ ] **createWallet()** - Auto-create wallet on user registration
  - Set initial balance (₹10,00,000 default)
  - Create initial transaction record
  
- [ ] **getWalletBalance()** - Get current wallet details
  - Available balance
  - Locked amount
  - Total balance
  
- [ ] **addFunds()** - Add virtual funds (admin/bonus)
  - Validate amount
  - Update balance
  - Create transaction record
  
- [ ] **deductFunds()** - Deduct for order placement
  - Check sufficient balance
  - Lock amount for pending orders
  - Update availableBalance
  - Create transaction record
  
- [ ] **unlockFunds()** - Unlock if order cancelled
  - Move from locked to available
  - Create transaction record
  
- [ ] **getTransactionHistory()** - Get all transactions
  - Pagination support
  - Filter by date range
  - Filter by transaction type

### 1.3 Wallet Controller
- [ ] **GET /api/v1/wallet** - Get wallet details
- [ ] **GET /api/v1/wallet/transactions** - Transaction history
- [ ] **POST /api/v1/wallet/add-funds** - Add virtual funds (admin)

### 1.4 Wallet Validation
- [ ] Joi schemas for all wallet endpoints
- [ ] Amount validation (positive, max limits)

### 1.5 Integration
- [ ] Auto-create wallet on user registration
- [ ] Update User model to include walletId reference
- [ ] Test wallet creation flow

---

## 📈 PHASE 2: ORDER MANAGEMENT SYSTEM

### 2.1 Database Models
- [ ] **Order Model** - Complete order schema
  - User, stock details
  - Order type (intraday/delivery)
  - Order variant (market/limit/sl/slm)
  - Transaction type (buy/sell)
  - Quantity, price, trigger price
  - Status tracking
  - Charges breakdown
  - Execution details
  - Timestamps

### 2.2 Order Service
- [ ] **placeOrder()** - Place buy/sell order
  - Validate market timing
  - Check wallet balance
  - Calculate estimated charges
  - Lock required funds
  - Create order record with 'pending' status
  
- [ ] **executeOrder()** - Execute pending order
  - Get real-time price from AngelOne
  - For limit orders, check if price reached
  - Calculate actual charges
  - Deduct from wallet
  - Update order status to 'executed'
  - Create transaction record
  - Update holdings
  
- [ ] **cancelOrder()** - Cancel pending order
  - Unlock funds
  - Update order status
  - Create transaction record
  
- [ ] **getOrders()** - Get user orders
  - Filter by status (pending/executed/cancelled)
  - Filter by type (intraday/delivery)
  - Pagination
  
- [ ] **getOrderById()** - Get single order details

### 2.3 Order Controller
- [ ] **POST /api/v1/orders/place** - Place new order
- [ ] **POST /api/v1/orders/:orderId/cancel** - Cancel order
- [ ] **GET /api/v1/orders** - Get all orders
- [ ] **GET /api/v1/orders/:orderId** - Get order details
- [ ] **GET /api/v1/orders/pending** - Get pending orders
- [ ] **GET /api/v1/orders/history** - Order history

### 2.4 Order Validation
- [ ] Joi schemas for order placement
  - Symbol, exchange validation
  - Order type, variant validation
  - Quantity validation (min/max)
  - Price validation

### 2.5 Order Execution Logic
- [ ] **Market Order Execution**
  - Instant execution at current price
  
- [ ] **Limit Order Execution**
  - Background job to check price
  - Execute when condition met
  
- [ ] **Stop Loss Order Execution**
  - Trigger when price hits stop loss
  
- [ ] **Charges Calculator**
  - Brokerage: ₹20 or 0.03%
  - STT: 0.025%
  - Transaction charges: 0.00325%
  - GST: 18% on brokerage
  - SEBI: ₹10 per crore
  - Stamp duty: 0.015%

### 2.6 Background Jobs (Bull Queue)
- [ ] Setup Bull queue with Redis
- [ ] **Order Execution Job** - Process pending orders
  - Check limit orders every 1-2 seconds
  - Execute if conditions met
- [ ] Job retry logic on failure
- [ ] Job monitoring dashboard

---

## 📊 PHASE 3: HOLDINGS & PORTFOLIO

### 3.1 Database Models
- [ ] **Holding Model** - Current positions
  - User, stock details
  - Holding type (intraday/delivery)
  - Quantity, average buy price
  - Current price, P&L calculations
  - Auto square-off time (intraday)
  - Related order IDs

- [ ] **Trade Model** - Completed trades
  - Buy and sell order IDs
  - P&L calculations
  - Trade dates

### 3.2 Holding Service
- [ ] **createOrUpdateHolding()** - After order execution
  - For buy orders: create/update holding
  - Calculate average price
  
- [ ] **getHoldings()** - Get all holdings
  - Update current prices from AngelOne
  - Calculate real-time P&L
  - Separate intraday and delivery
  
- [ ] **getHoldingBySymbol()** - Get specific stock holding
  
- [ ] **sellHolding()** - Process sell order
  - Reduce quantity or close holding
  - Calculate realized P&L
  - Create Trade record
  
- [ ] **calculatePortfolioValue()** - Total portfolio value
  - Sum of all holdings current value
  - Total P&L
  - Portfolio performance percentage

### 3.3 Holding Controller
- [ ] **GET /api/v1/holdings** - All holdings
- [ ] **GET /api/v1/holdings/intraday** - Intraday positions
- [ ] **GET /api/v1/holdings/delivery** - Delivery holdings
- [ ] **GET /api/v1/holdings/:symbol** - Specific stock holding
- [ ] **GET /api/v1/portfolio/summary** - Portfolio overview

### 3.4 Auto Square-off (Intraday)
- [ ] **Cron Job** - Run at 3:20 PM daily
  - Get all open intraday positions
  - Create market sell orders
  - Execute immediately
  - Calculate and record P&L
  - Update holdings
  - Send notifications

### 3.5 Trade History
- [ ] **recordTrade()** - After sell order execution
  - Match with buy orders
  - Calculate P&L
  - Create Trade record
  
- [ ] **getTradeHistory()** - Get completed trades
  - Filter by date range
  - Filter by stock
  - Show P&L

---

## 📋 PHASE 4: WATCHLIST

### 4.1 Database Model
- [ ] **Watchlist Model**
  - userId reference
  - Watchlist name
  - Array of stocks (symbol, exchange, token)
  - isDefault flag
  - Timestamps

### 4.2 Watchlist Service
- [ ] **createWatchlist()** - Create new watchlist
- [ ] **addStockToWatchlist()** - Add stock
- [ ] **removeStockFromWatchlist()** - Remove stock
- [ ] **getWatchlists()** - Get all user watchlists
- [ ] **getWatchlistStocks()** - Get stocks with current prices
- [ ] **deleteWatchlist()** - Delete watchlist
- [ ] **updateWatchlistName()** - Rename watchlist

### 4.3 Watchlist Controller
- [ ] **POST /api/v1/watchlists** - Create watchlist
- [ ] **GET /api/v1/watchlists** - Get all watchlists
- [ ] **GET /api/v1/watchlists/:id** - Get watchlist details
- [ ] **POST /api/v1/watchlists/:id/stocks** - Add stock
- [ ] **DELETE /api/v1/watchlists/:id/stocks/:symbol** - Remove stock
- [ ] **PUT /api/v1/watchlists/:id** - Update name
- [ ] **DELETE /api/v1/watchlists/:id** - Delete watchlist

### 4.4 Validation
- [ ] Joi schemas for watchlist operations

---

## 📱 PHASE 5: DASHBOARD & ANALYTICS

### 5.1 Dashboard Service
- [ ] **getMarketOverview()** - Market summary
  - Nifty/Sensex indices
  - Market status
  
- [ ] **getPopularStocks()** - Top stocks list
  - Cache in Redis (5 min TTL)
  - Configurable list of popular stocks
  
- [ ] **getTopGainers()** - Top 10 gainers
  - Use AngelOne API or maintain in DB
  
- [ ] **getTopLosers()** - Top 10 losers
  
- [ ] **getMostActive()** - Highest volume stocks

### 5.2 Dashboard Controller
- [ ] **GET /api/v1/dashboard** - Complete dashboard data
- [ ] **GET /api/v1/dashboard/market-overview** - Market summary
- [ ] **GET /api/v1/dashboard/popular-stocks** - Popular stocks
- [ ] **GET /api/v1/dashboard/top-gainers** - Gainers
- [ ] **GET /api/v1/dashboard/top-losers** - Losers
- [ ] **GET /api/v1/dashboard/most-active** - High volume

### 5.3 Analytics Service
- [ ] **getUserPerformance()** - User's overall performance
  - Total P&L
  - Win rate
  - Best/worst trades
  - Performance chart data
  
- [ ] **getStockwiseAnalysis()** - Stock-wise breakdown
  - P&L per stock
  - Success rate per stock
  
- [ ] **getDailyPL()** - Day-wise P&L
  - Chart data for last 30 days
  
- [ ] **getMonthlyReport()** - Monthly summary

### 5.4 Analytics Controller
- [ ] **GET /api/v1/analytics/performance** - User performance
- [ ] **GET /api/v1/analytics/stockwise** - Stock analysis
- [ ] **GET /api/v1/analytics/daily-pl** - Daily P&L
- [ ] **GET /api/v1/analytics/monthly-report** - Monthly report

---

## 🔍 PHASE 6: SEARCH & DISCOVERY

### 6.1 Search Service
- [ ] **searchStocks()** - Search by name/symbol
  - Use AngelOne searchStocks API
  - Cache popular searches
  
- [ ] **getRecentSearches()** - User's recent searches
  - Store in MongoDB or Redis
  
- [ ] **getStockInfo()** - Detailed stock info
  - Real-time price
  - Day's high/low
  - 52-week high/low
  - Volume
  - Market cap (if available)

### 6.2 Search Controller
- [ ] **GET /api/v1/search** - Search stocks
- [ ] **GET /api/v1/search/recent** - Recent searches
- [ ] **GET /api/v1/stocks/:symbol/info** - Stock details

---

## 🔔 PHASE 7: NOTIFICATIONS

### 7.1 Notification Service
- [ ] **sendOrderExecutedNotification()** - Order executed
- [ ] **sendOrderRejectedNotification()** - Order rejected
- [ ] **sendAutoSquareOffNotification()** - Intraday squared off
- [ ] **sendLowBalanceAlert()** - Balance below threshold

### 7.2 Notification Channels
- [ ] Email notifications (NodeMailer)
- [ ] In-app notifications (store in DB)
- [ ] SMS notifications (optional)

### 7.3 Notification Controller
- [ ] **GET /api/v1/notifications** - Get all notifications
- [ ] **PUT /api/v1/notifications/:id/read** - Mark as read
- [ ] **DELETE /api/v1/notifications/:id** - Delete notification

---

## 🔒 PHASE 8: ACCOUNT SETUP & KYC

### 8.1 Account Setup Flow
- [ ] **Account Setup Model**
  - Personal details
  - Risk tolerance
  - Trading experience
  - Terms acceptance
  - Setup status

### 8.2 Account Setup Service
- [ ] **initiateAccountSetup()** - Start setup process
- [ ] **savePersonalDetails()** - Save user info
- [ ] **acceptTermsAndConditions()** - T&C acceptance
- [ ] **completeAccountSetup()** - Finalize and create wallet
- [ ] **getSetupStatus()** - Check setup completion

### 8.3 Account Setup Controller
- [ ] **POST /api/v1/account-setup/start** - Initiate setup
- [ ] **POST /api/v1/account-setup/personal-details** - Save details
- [ ] **POST /api/v1/account-setup/accept-terms** - Accept T&C
- [ ] **POST /api/v1/account-setup/complete** - Complete setup
- [ ] **GET /api/v1/account-setup/status** - Get status

### 8.4 User Model Updates
- [ ] Add accountSetupCompleted field
- [ ] Add setupStep field (for multi-step tracking)
- [ ] Add middleware to check setup before trading

---

## 🔧 PHASE 9: PERFORMANCE OPTIMIZATION

### 9.1 Database Optimization
- [ ] Create indexes on frequently queried fields
  - User.email, User.phone
  - Order.userId, Order.status, Order.createdAt
  - Holding.userId, Holding.symbol
  - Transaction.userId, Transaction.createdAt
  - Wallet.userId
  
- [ ] Setup MongoDB connection pooling
- [ ] Query optimization and explain analysis
- [ ] Consider read replicas for heavy queries

### 9.2 Caching Strategy (Redis)
- [ ] Cache market data (1-2 sec TTL)
- [ ] Cache user sessions (JWT)
- [ ] Cache popular stocks list (5 min TTL)
- [ ] Cache watchlists
- [ ] Cache dashboard data (1 min TTL)
- [ ] Implement cache invalidation strategy

### 9.3 API Optimization
- [ ] Implement response compression (gzip)
- [ ] Pagination for all list endpoints
- [ ] Field selection/projection for large documents
- [ ] Batch API for multiple operations
- [ ] GraphQL consideration (optional)

### 9.4 WebSocket Optimization
- [ ] Separate WebSocket server instance
- [ ] Redis pub/sub for multi-server sync
- [ ] Connection throttling (max per user)
- [ ] Heartbeat mechanism
- [ ] Automatic reconnection

### 9.5 Background Jobs
- [ ] Setup Bull queue with Redis
- [ ] Order execution worker
- [ ] Auto square-off worker
- [ ] Notification worker
- [ ] P&L calculation worker
- [ ] Job monitoring and error handling

---

## 🛡️ PHASE 10: SECURITY & VALIDATION

### 10.1 Enhanced Security
- [ ] Rate limiting (express-rate-limit)
  - Per user: 100 requests/minute
  - Per IP: 500 requests/minute
  - Order placement: 10 orders/minute
  
- [ ] Request size limits
- [ ] SQL/NoSQL injection prevention
- [ ] XSS protection (helmet.js)
- [ ] CORS configuration
- [ ] API versioning
- [ ] Input sanitization

### 10.2 Enhanced Validation
- [ ] Comprehensive Joi schemas for all endpoints
- [ ] Custom validators for:
  - Stock symbols (format validation)
  - Exchange validation
  - Quantity limits (min: 1, max: 10000)
  - Price limits
  - Date range validation
  
- [ ] Business logic validation:
  - Sufficient balance check
  - Market timing check
  - Minimum order value (₹500)
  - Maximum order value per transaction

### 10.3 Error Handling
- [ ] Centralized error handler
- [ ] Custom error classes
- [ ] User-friendly error messages
- [ ] Error logging (Winston)
- [ ] Error monitoring (Sentry integration)

---

## 📊 PHASE 11: MONITORING & LOGGING

### 11.1 Application Logging
- [ ] Winston logger configuration
  - Info level: General logs
  - Error level: Errors and exceptions
  - Debug level: Development debugging
  
- [ ] Log rotation (daily/size-based)
- [ ] Structured logging (JSON format)
- [ ] Request/response logging
- [ ] Performance logging

### 11.2 Monitoring
- [ ] Health check endpoint (/health)
- [ ] Metrics endpoint (/metrics)
- [ ] Database connection monitoring
- [ ] Redis connection monitoring
- [ ] API response time tracking
- [ ] Error rate tracking
- [ ] Order execution time tracking

### 11.3 Alerting
- [ ] Critical error alerts
- [ ] High error rate alerts
- [ ] Server down alerts
- [ ] Database connection failure alerts
- [ ] High response time alerts

---

## 🧪 PHASE 12: TESTING

### 12.1 Unit Tests (Jest)
- [ ] Service layer tests
  - Wallet service (>80% coverage)
  - Order service (>80% coverage)
  - Holding service (>80% coverage)
  - Market service
  
- [ ] Utility function tests
- [ ] Validation tests

### 12.2 Integration Tests
- [ ] API endpoint tests
  - Authentication flow
  - Wallet operations
  - Order placement flow
  - Order execution flow
  - Holdings update
  - Watchlist operations
  
- [ ] Database integration tests
- [ ] WebSocket tests

### 12.3 Load Testing
- [ ] Artillery/K6 setup
- [ ] Test scenarios:
  - 10k concurrent users
  - 20k concurrent users
  - 30k concurrent users
  
- [ ] Stress testing
- [ ] Spike testing
- [ ] Endurance testing

### 12.4 E2E Tests
- [ ] Critical user flows
  - Registration → Setup → Trading
  - Buy order → Execution → Holding update
  - Sell order → P&L calculation
  - Intraday square-off

---

## 📦 PHASE 13: DEPLOYMENT & DEVOPS

### 13.1 Containerization
- [ ] Docker setup
  - Dockerfile optimization
  - Docker compose for local dev
  - Multi-stage builds
  
- [ ] Container registry (Docker Hub/AWS ECR)

### 13.2 CI/CD Pipeline
- [ ] GitHub Actions / GitLab CI
  - Automated testing
  - Code quality checks (ESLint)
  - Security scanning
  - Automated deployment
  
- [ ] Environment-specific configs
  - Development
  - Staging
  - Production

### 13.3 Infrastructure (AWS/Azure/GCP)
- [ ] Setup cloud infrastructure
  - VPC/Virtual Network
  - Load Balancer
  - Auto Scaling Groups
  - Database (MongoDB Atlas/AWS DocumentDB)
  - Redis Cluster
  - Object Storage (S3/Blob)
  
- [ ] CDN setup (CloudFront/Azure CDN)
- [ ] SSL/TLS certificates
- [ ] Domain and DNS configuration

### 13.4 Production Setup
- [ ] PM2 cluster mode (4-8 processes)
- [ ] Nginx reverse proxy
- [ ] Log aggregation (CloudWatch/ELK)
- [ ] Monitoring (New Relic/DataDog)
- [ ] Backup strategy
  - Database: Daily automated backups
  - Redis: Persistence configuration
  
- [ ] Disaster recovery plan

---

## 📚 PHASE 14: DOCUMENTATION

### 14.1 API Documentation
- [ ] Swagger/OpenAPI documentation
- [ ] Postman collection
- [ ] API usage examples

### 14.2 Developer Documentation
- [ ] Setup guide
- [ ] Architecture documentation
- [ ] Database schema documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide

### 14.3 User Documentation
- [ ] User manual
- [ ] Trading guide
- [ ] FAQ section
- [ ] Video tutorials (optional)

---

## 🎨 PHASE 15: ADMIN PANEL (Optional)

### 15.1 Admin Features
- [ ] User management
  - View all users
  - Suspend/activate accounts
  - Reset passwords
  
- [ ] Financial management
  - Add/deduct virtual funds
  - View all transactions
  - System-wide financial reports
  
- [ ] Order management
  - View all orders
  - Manual order execution/cancellation
  
- [ ] System monitoring
  - Real-time metrics dashboard
  - Error logs viewer
  - Performance analytics

### 15.2 Admin API
- [ ] Admin authentication (separate JWT)
- [ ] Role-based access control (RBAC)
- [ ] Admin endpoints with proper authorization

---

## 🚀 PHASE 16: ADVANCED FEATURES (Future)

### 16.1 Advanced Order Types
- [ ] Bracket Orders (Target + SL)
- [ ] Cover Orders (Mandatory SL)
- [ ] AMO (After Market Orders)
- [ ] GTD (Good Till Date)
- [ ] IOC (Immediate or Cancel)

### 16.2 Advanced Analytics
- [ ] Technical indicators
  - Moving averages (SMA, EMA)
  - RSI, MACD, Bollinger Bands
  
- [ ] Chart patterns recognition
- [ ] Trading recommendations

### 16.3 Social Features
- [ ] Leaderboard
- [ ] User profiles (public)
- [ ] Follow top traders
- [ ] Copy trading (virtual)

### 16.4 Gamification
- [ ] Achievements/Badges
- [ ] Trading competitions
- [ ] Referral program
- [ ] Rewards system

---

## 📋 QUICK CHECKLIST FOR NEXT SESSION

### Immediate Next Steps (Wallet Integration)
1. ✅ Create Wallet model (schema)
2. ✅ Create Transaction model (schema)
3. ✅ Implement wallet service functions
4. ✅ Create wallet controller endpoints
5. ✅ Add validation schemas
6. ✅ Update User registration to auto-create wallet
7. ✅ Test wallet creation and balance operations

---

## 🎯 CURRENT STATUS

**Phase:** Phase 1 - Wallet System  
**Priority:** HIGH  
**Estimated Time:** 1-2 days

**Blockers:** None  
**Dependencies:** AngelOne integration (✅ Completed)

---

**Last Updated:** December 14, 2025  
**Next Review:** After wallet integration completion
