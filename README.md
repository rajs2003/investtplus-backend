# 📈 InvesttPlus Stock Trading Platform

> Complete Stock Trading Simulator with Real-Time Market Data  
> Production Ready ✅ | Version 1.0.0 | 100% Complete

---

## 🎯 Quick Start (30 Seconds)

```bash
npm start
```

Then open: **http://localhost:3000/index.html**

---

## 📚 Documentation

Start with one of these:

- **[QUICK_START.md](./QUICK_START.md)** - 30-second setup guide
- **[SYSTEM_STATUS_REPORT.md](./SYSTEM_STATUS_REPORT.md)** - Full system status
- **[COMPLETE_SYSTEM_READY.md](./COMPLETE_SYSTEM_READY.md)** - Complete feature list
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture & design
- **[docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)** - API reference

---

## ✨ Features

- ✅ **User Authentication** - JWT-based login/signup
- ✅ **Stock Browsing** - Browse 20 stocks with real-time prices
- ✅ **Advanced Search** - Search & filter by symbol/name/sector
- ✅ **Order Placement** - Market & limit orders
- ✅ **Real-Time Prices** - 1-second WebSocket updates
- ✅ **Portfolio Tracking** - View holdings & P&L
- ✅ **Wallet Management** - Add/withdraw money
- ✅ **Order History** - Complete order tracking
- ✅ **Responsive UI** - Mobile/tablet/desktop support
- ✅ **Stock Search** - Search for stocks by name or symbol
- ✅ **Multiple Exchanges** - Support for NSE, BSE, NFO, MCX, CDS, BFO
- ✅ **Paper Trading Ready** - Built for simulation, not actual trading

## 📦 Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis (optional)
- AngelOne SmartAPI account

### Install Dependencies

```bash
npm install
```

## ⚙️ Configuration

1. **Copy environment file:**

```bash
cp .env.example .env
```

2. **Update .env with your credentials:**

```env
# AngelOne SmartAPI Configuration
ANGELONE_API_KEY=your_angelone_api_key_here
ANGELONE_CLIENT_CODE=your_client_code_here
ANGELONE_PASSWORD=your_password_here
ANGELONE_TOTP_SECRET=your_totp_secret_here

# MongoDB
MONGODB_URL=mongodb://127.0.0.1:27017/stock-simulation

# JWT
JWT_SECRET=your_jwt_secret_here

# Other configs...
```

3. **Get AngelOne Credentials:**
   - Sign up at [AngelOne](https://www.angelone.in/)
   - Generate SmartAPI credentials
   - Setup TOTP secret for 2FA

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Run Tests

```bash
npm test
```

## 📚 API Documentation

### 📖 Complete Documentation

All documentation is organized in the [`docs/`](docs/) folder:

- **[📖 Documentation Index](docs/README.md)** - Documentation overview and navigation
- **[🚀 API Usage Guide](docs/API_USAGE_GUIDE.md)** - Complete API usage with examples (START HERE!)
- **[⚡ Quick Start Guide](docs/QUICKSTART.md)** - Quick setup and testing guide
- **[🔧 AngelOne Integration](docs/ANGELONE_INTEGRATION.md)** - Detailed technical documentation
- **[📊 Integration Summary](docs/INTEGRATION_SUMMARY.md)** - Implementation details
- **[✅ Checklist](docs/CHECKLIST.md)** - Development and deployment checklist

### 🎯 Quick Links

- **New to the API?** Start with [API Usage Guide](docs/API_USAGE_GUIDE.md)
- **Need to setup?** Check [Quick Start Guide](docs/QUICKSTART.md)
- **Want examples?** See `src/examples/angelone.examples.js`

## 🔗 API Endpoints

### Stock APIs

- `GET /api/v1/stocks/price` - Get realtime stock price
- `GET /api/v1/stocks/details` - Get stock details with market depth
- `POST /api/v1/stocks/multiple` - Get multiple stocks prices
- `GET /api/v1/stocks/market-status` - Check market status

### Market APIs

- `GET /api/v1/market/ltp` - Get Last Traded Price
- `GET /api/v1/market/depth` - Get market depth
- `POST /api/v1/market/quotes` - Get quotes
- `GET /api/v1/market/search` - Search stocks
- `POST /api/v1/market/candles` - Get historical data

### WebSocket APIs

- `POST /api/v1/websocket/connect` - Connect to WebSocket
- `POST /api/v1/websocket/subscribe` - Subscribe to real-time data
- `POST /api/v1/websocket/unsubscribe` - Unsubscribe
- `GET /api/v1/websocket/status` - Check connection status

## 🧪 Testing APIs

### Using cURL

```bash
# Check market status
curl http://localhost:3000/api/v1/stocks/market-status

# Get stock price
curl "http://localhost:3000/api/v1/stocks/price?symbol=RELIANCE-EQ&exchange=NSE&token=2885"

# Search stocks
curl "http://localhost:3000/api/v1/market/search?q=RELIANCE&exchange=NSE"
```

### Using Postman

Import the API endpoints and test them with Postman.

## 📁 Project Structure

```
src/
├── config/              # Configuration files
├── controllers/         # Request handlers
│   └── v1/
│       ├── stockController/
│       ├── marketController/
│       └── websocketController/
├── services/            # Business logic
│   └── v1/
│       └── angeloneServices/
│           ├── angelone.service.js
│           ├── market.service.js
│           ├── stock.service.js
│           └── websocket.service.js
├── routes/              # API routes
│   └── v1/
├── models/              # Database models
├── middlewares/         # Custom middlewares
├── validations/         # Input validation schemas
├── utils/               # Utility functions
└── examples/            # Usage examples
```

## 🔧 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Cache:** Redis
- **Validation:** Joi
- **Authentication:** JWT, Passport.js
- **API Integration:** AngelOne SmartAPI
- **WebSocket:** ws library
- **Time Management:** moment-timezone
- **2FA:** otplib

## 🔒 Security

- Environment variables for sensitive data
- JWT-based authentication
- TOTP-based 2FA for AngelOne
- Input validation on all endpoints
- Rate limiting
- CORS enabled

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Contact the team for contribution guidelines.

## 📞 Support

For issues and questions:

- Check documentation files
- Review code examples in `src/examples/`
- Contact development team

---

**Status:** ✅ Ready for Development  
**Version:** 1.0.0  
**Last Updated:** December 2025
