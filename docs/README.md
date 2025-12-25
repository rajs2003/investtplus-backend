# 📁 Documentation Index

Welcome to the Stock Market Simulation API Documentation!

## 📚 Available Documentation

### 🚀 Getting Started
1. **[API Usage Guide](API_USAGE_GUIDE.md)** - START HERE! 
   - Complete API usage with real examples
   - Frontend integration examples (React, JavaScript)
   - Error handling and best practices
   - Common stock symbols and tokens

### ⚡ Quick References
2. **[Quick Start Guide](QUICKSTART.md)**
   - Fast setup instructions
   - Quick testing examples
   - 5-minute setup guide

3. **[AngelOne Integration](ANGELONE_INTEGRATION.md)**
   - Detailed technical documentation
   - All API endpoints with parameters
   - WebSocket documentation
   - Service architecture

### 📊 Technical Details
4. **[Integration Summary](INTEGRATION_SUMMARY.md)**
   - Complete implementation overview
   - Files created/modified
   - Code quality metrics
   - Architecture diagrams

5. **[Development Checklist](CHECKLIST.md)**
   - Implementation checklist
   - Testing checklist
   - Deployment checklist
   - Future enhancements

---

## 🎯 Quick Navigation by Use Case

### "Main APIs use karna hai"
→ Start with [API Usage Guide](API_USAGE_GUIDE.md)

### "Project setup karna hai"
→ Start with [Quick Start Guide](QUICKSTART.md)

### "Technical details chahiye"
→ Check [AngelOne Integration](ANGELONE_INTEGRATION.md)

### "Deployment karna hai"
→ Check [Development Checklist](CHECKLIST.md)

### "Implementation summary chahiye"
→ Check [Integration Summary](INTEGRATION_SUMMARY.md)

---

## 📦 Project Structure

```
investtplus-backend/
├── docs/                           # 📚 All documentation
│   ├── README.md                   # This file
│   ├── API_USAGE_GUIDE.md         # ⭐ Main usage guide
│   ├── QUICKSTART.md              # Quick setup
│   ├── ANGELONE_INTEGRATION.md    # Technical docs
│   ├── INTEGRATION_SUMMARY.md     # Implementation summary
│   └── CHECKLIST.md               # Checklists
│
├── src/
│   ├── services/                   # Business logic
│   │   ├── index.js               # All services export
│   │   └── v1/
│   │       └── angeloneServices/
│   │           ├── index.js       # AngelOne services export
│   │           ├── angelone.service.js
│   │           ├── market.service.js
│   │           ├── stock.service.js
│   │           └── websocket.service.js
│   │
│   ├── controllers/                # Request handlers
│   │   ├── index.js               # All controllers export
│   │   └── v1/
│   │       ├── marketController/
│   │       │   ├── index.js
│   │       │   └── market.controller.js
│   │       ├── stockController/
│   │       │   ├── index.js
│   │       │   └── stock.controller.js
│   │       └── websocketController/
│   │           ├── index.js
│   │           └── websocket.controller.js
│   │
│   ├── routes/                     # API routes
│   │   └── v1/
│   │       ├── index.js
│   │       ├── marketRoutes/
│   │       ├── stockRoutes/
│   │       └── websocketRoutes/
│   │
│   ├── validations/                # Input validation
│   │   ├── index.js               # All validations export
│   │   └── stock.validation.js
│   │
│   ├── utils/                      # Utility functions
│   │   └── marketUtils.js
│   │
│   └── examples/                   # Code examples
│       └── angelone.examples.js
│
├── .env                            # Environment variables
└── README.md                       # Main readme

```

---

## 🔗 API Endpoints Quick Reference

### Stock APIs (`/api/v1/stocks`)
- `GET /price` - Realtime stock price
- `GET /details` - Stock details with market depth
- `POST /multiple` - Multiple stocks prices
- `GET /market-status` - Market open/close status

### Market APIs (`/api/v1/market`)
- `GET /ltp` - Last Traded Price
- `GET /depth` - Market depth
- `POST /quotes` - Multiple quotes
- `GET /search` - Search stocks
- `POST /candles` - Historical data

### WebSocket APIs (`/api/v1/websocket`)
- `POST /connect` - Connect
- `POST /subscribe` - Subscribe to data
- `POST /unsubscribe` - Unsubscribe
- `GET /status` - Connection status
- `POST /disconnect` - Disconnect

---

## ✨ Key Features

✅ Real-time stock prices (IST based)  
✅ Market data feed (LTP, quotes, depth)  
✅ WebSocket streaming  
✅ Market hours detection  
✅ Stock search  
✅ Historical candle data  
✅ Multiple exchanges support  

---

## 🔧 Technologies Used

- **Backend:** Node.js + Express.js
- **Database:** MongoDB
- **Cache:** Redis
- **API Integration:** AngelOne SmartAPI
- **WebSocket:** ws library
- **Validation:** Joi
- **Time Management:** moment-timezone
- **2FA:** otplib

---

## 🚀 Getting Started in 3 Steps

1. **Setup Environment**
   ```bash
   cp .env.example .env
   # Add your AngelOne credentials in .env
   ```

2. **Install & Run**
   ```bash
   npm install
   npm run dev
   ```

3. **Test API**
   ```bash
   curl http://localhost:3000/api/v1/stocks/market-status
   ```

---

## 📞 Need Help?

1. Check [API Usage Guide](API_USAGE_GUIDE.md) for examples
2. Review [Quick Start Guide](QUICKSTART.md) for setup
3. See `src/examples/angelone.examples.js` for code samples
4. Visit [AngelOne Docs](https://smartapi.angelbroking.com/docs)

---

## 🎯 Best Practices

### Modular Import Structure
Sab kuch index.js se export/import hota hai:

```javascript
// ✅ Good - Import from index
const { marketController, stockController } = require('../controllers');
const { marketService, stockService } = require('../services');
const { stockValidation } = require('../validations');

// ❌ Bad - Direct import
const marketController = require('../controllers/v1/marketController/market.controller');
```

### Error Handling
Always use try-catch and proper error responses:

```javascript
try {
  const result = await service.getData();
  res.json({ success: true, data: result });
} catch (error) {
  logger.error('Error:', error);
  res.status(500).json({ success: false, message: error.message });
}
```

---

## 📝 Contributing

Agar aap is project mein contribute karna chahte hain:
1. New feature ke liye proper folder structure follow karein
2. Services aur controllers ko index.js se export karein
3. Validation schemas add karein
4. Documentation update karein

---

**Status:** ✅ Ready to Use  
**Version:** 1.0.0  
**Last Updated:** December 2025

---

**Happy Coding! 🚀📈**
