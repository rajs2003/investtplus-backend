# WebSocket API Testing Guide

## Test Date
December 24, 2025

---

## 📡 WebSocket Endpoints

Base URL: `http://localhost:3000/v1/websocket`

---

## 1. Connect to WebSocket

**Endpoint:** `POST /v1/websocket/connect`

**Description:** Establishes WebSocket connection for real-time market data streaming

### Request

```bash
POST http://localhost:3000/v1/websocket/connect
Content-Type: application/json
```

**Body:** None required

### Expected Response (Success - 200)

```json
{
  "success": true,
  "message": "WebSocket connection established",
  "data": {
    "connected": true,
    "timestamp": "2025-12-24T10:30:00.000Z"
  }
}
```

### Expected Response (Error - 500)

```json
{
  "success": false,
  "message": "Failed to establish WebSocket connection",
  "error": "Connection error details"
}
```

### Test Cases

- [ ] **TC-WS-01:** Connect successfully without authentication
- [ ] **TC-WS-02:** Handle connection when already connected
- [ ] **TC-WS-03:** Handle connection failure (invalid credentials)
- [ ] **TC-WS-04:** Verify connection timeout handling

### cURL Command

```bash
curl -X POST http://localhost:3000/v1/websocket/connect \
  -H "Content-Type: application/json"
```

---

## 2. Subscribe to Market Data

**Endpoint:** `POST /v1/websocket/subscribe`

**Description:** Subscribe to real-time market data for specific stock tokens

### Request

```bash
POST http://localhost:3000/v1/websocket/subscribe
Content-Type: application/json
```

**Body:**

```json
{
  "mode": 1,
  "tokens": [
    {
      "exchangeType": 1,
      "tokens": ["2885", "1594", "11536"]
    }
  ]
}
```

**Parameters:**
- `mode` (number, required): 
  - `1` = LTP (Last Traded Price)
  - `2` = Quote (OHLC + LTP)
  - `3` = Snap Quote (Full market depth)
- `tokens` (array, required): Array of exchange-wise tokens
  - `exchangeType` (number): 
    - `1` = NSE
    - `2` = BSE
    - `3` = NFO (Futures & Options)
    - `4` = MCX (Commodities)
  - `tokens` (array): Stock symbol tokens

### Expected Response (Success - 200)

```json
{
  "success": true,
  "message": "Subscribed to market data",
  "data": {
    "subscribed": true,
    "mode": 1,
    "tokenCount": 3,
    "tokens": ["2885", "1594", "11536"]
  }
}
```

### Expected Response (Validation Error - 400)

```json
{
  "code": 400,
  "message": "Validation error",
  "errors": [
    {
      "field": "mode",
      "message": "mode must be a number between 1 and 3"
    }
  ]
}
```

### Test Cases

- [ ] **TC-WS-05:** Subscribe with mode 1 (LTP)
- [ ] **TC-WS-06:** Subscribe with mode 2 (Quote)
- [ ] **TC-WS-07:** Subscribe with mode 3 (Snap Quote)
- [ ] **TC-WS-08:** Subscribe to NSE stocks
- [ ] **TC-WS-09:** Subscribe to BSE stocks
- [ ] **TC-WS-10:** Subscribe to multiple exchanges
- [ ] **TC-WS-11:** Validation error - missing mode
- [ ] **TC-WS-12:** Validation error - invalid mode (0 or 4+)
- [ ] **TC-WS-13:** Validation error - missing tokens
- [ ] **TC-WS-14:** Validation error - empty tokens array
- [ ] **TC-WS-15:** Subscribe without connection
- [ ] **TC-WS-16:** Subscribe to 50+ tokens (bulk)
- [ ] **TC-WS-17:** Subscribe to already subscribed tokens

### cURL Command

```bash
# Subscribe to LTP for RELIANCE, INFY, TCS
curl -X POST http://localhost:3000/v1/websocket/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "mode": 1,
    "tokens": [
      {
        "exchangeType": 1,
        "tokens": ["2885", "1594", "11536"]
      }
    ]
  }'
```

---

## 3. Unsubscribe from Market Data

**Endpoint:** `POST /v1/websocket/unsubscribe`

**Description:** Unsubscribe from real-time market data for specific tokens

### Request

```bash
POST http://localhost:3000/v1/websocket/unsubscribe
Content-Type: application/json
```

**Body:**

```json
{
  "mode": 1,
  "tokens": [
    {
      "exchangeType": 1,
      "tokens": ["2885"]
    }
  ]
}
```

### Expected Response (Success - 200)

```json
{
  "success": true,
  "message": "Unsubscribed from market data",
  "data": {
    "unsubscribed": true,
    "tokenCount": 1
  }
}
```

### Test Cases

- [ ] **TC-WS-18:** Unsubscribe single token
- [ ] **TC-WS-19:** Unsubscribe multiple tokens
- [ ] **TC-WS-20:** Unsubscribe from non-subscribed token
- [ ] **TC-WS-21:** Unsubscribe all tokens
- [ ] **TC-WS-22:** Validation error - invalid format

### cURL Command

```bash
curl -X POST http://localhost:3000/v1/websocket/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{
    "mode": 1,
    "tokens": [
      {
        "exchangeType": 1,
        "tokens": ["2885"]
      }
    ]
  }'
```

---

## 4. Disconnect WebSocket

**Endpoint:** `POST /v1/websocket/disconnect`

**Description:** Closes WebSocket connection and cleans up subscriptions

### Request

```bash
POST http://localhost:3000/v1/websocket/disconnect
Content-Type: application/json
```

**Body:** None required

### Expected Response (Success - 200)

```json
{
  "success": true,
  "message": "WebSocket disconnected successfully",
  "data": {
    "connected": false,
    "timestamp": "2025-12-24T11:30:00.000Z"
  }
}
```

### Test Cases

- [ ] **TC-WS-23:** Disconnect when connected
- [ ] **TC-WS-24:** Disconnect when already disconnected
- [ ] **TC-WS-25:** Verify all subscriptions cleared after disconnect
- [ ] **TC-WS-26:** Disconnect with active subscriptions

### cURL Command

```bash
curl -X POST http://localhost:3000/v1/websocket/disconnect \
  -H "Content-Type: application/json"
```

---

## 5. Get Connection Status

**Endpoint:** `GET /v1/websocket/status`

**Description:** Get current WebSocket connection status and active subscriptions

### Request

```bash
GET http://localhost:3000/v1/websocket/status
```

### Expected Response (Connected - 200)

```json
{
  "success": true,
  "message": "WebSocket status retrieved",
  "data": {
    "connected": true,
    "subscriptions": {
      "count": 3,
      "mode": 1,
      "tokens": [
        {
          "exchangeType": 1,
          "tokens": ["2885", "1594", "11536"]
        }
      ]
    },
    "connectedAt": "2025-12-24T10:30:00.000Z"
  }
}
```

### Expected Response (Disconnected - 200)

```json
{
  "success": true,
  "message": "WebSocket status retrieved",
  "data": {
    "connected": false,
    "subscriptions": {
      "count": 0
    }
  }
}
```

### Test Cases

- [ ] **TC-WS-27:** Get status when connected
- [ ] **TC-WS-28:** Get status when disconnected
- [ ] **TC-WS-29:** Verify subscription count accuracy
- [ ] **TC-WS-30:** Get status with active subscriptions

### cURL Command

```bash
curl -X GET http://localhost:3000/v1/websocket/status
```

---

## 🔄 Complete Workflow Test

### Scenario: Subscribe to Real-Time Stock Data

**Steps:**

1. **Connect to WebSocket**
   ```bash
   POST /v1/websocket/connect
   ```

2. **Subscribe to RELIANCE, INFY, TCS (LTP Mode)**
   ```bash
   POST /v1/websocket/subscribe
   Body: {
     "mode": 1,
     "tokens": [{"exchangeType": 1, "tokens": ["2885", "1594", "11536"]}]
   }
   ```

3. **Check Status**
   ```bash
   GET /v1/websocket/status
   ```
   Expected: connected=true, count=3

4. **Unsubscribe from RELIANCE**
   ```bash
   POST /v1/websocket/unsubscribe
   Body: {
     "mode": 1,
     "tokens": [{"exchangeType": 1, "tokens": ["2885"]}]
   }
   ```

5. **Check Status Again**
   ```bash
   GET /v1/websocket/status
   ```
   Expected: count=2

6. **Disconnect**
   ```bash
   POST /v1/websocket/disconnect
   ```

7. **Verify Disconnected**
   ```bash
   GET /v1/websocket/status
   ```
   Expected: connected=false

---

## 📊 Popular Stock Tokens (For Testing)

| Symbol | Token | Exchange | Company Name |
|--------|-------|----------|--------------|
| RELIANCE | 2885 | NSE (1) | Reliance Industries |
| INFY | 1594 | NSE (1) | Infosys |
| TCS | 11536 | NSE (1) | Tata Consultancy Services |
| HDFCBANK | 1333 | NSE (1) | HDFC Bank |
| ICICIBANK | 4963 | NSE (1) | ICICI Bank |
| SBIN | 3045 | NSE (1) | State Bank of India |
| ITC | 1660 | NSE (1) | ITC Ltd |
| HINDUNILVR | 1394 | NSE (1) | Hindustan Unilever |

---

## 🧪 Test Execution Checklist

### Basic Functionality
- [ ] All 5 endpoints respond correctly
- [ ] Success responses match expected format
- [ ] Error responses include proper error messages

### Validation Testing
- [ ] Invalid mode values rejected
- [ ] Missing required fields return 400
- [ ] Empty token arrays rejected
- [ ] Invalid exchangeType rejected

### Connection Management
- [ ] Connect/disconnect cycle works
- [ ] Cannot subscribe without connection
- [ ] Disconnect clears all subscriptions
- [ ] Status reflects current state

### Edge Cases
- [ ] Multiple connect calls handled
- [ ] Duplicate subscriptions handled
- [ ] Unsubscribe non-existent tokens
- [ ] Bulk subscribe (50+ tokens)

### Performance
- [ ] Response time < 500ms
- [ ] Handle concurrent subscriptions
- [ ] Memory cleanup after disconnect

---

## 🐛 Known Issues / Notes

1. **Connection Persistence:** WebSocket connection may timeout after inactivity
2. **Rate Limiting:** Check if provider has subscription limits
3. **Token Validation:** Tokens are not validated against actual market data
4. **Mode Changes:** Need to unsubscribe and resubscribe to change mode

---

## 📝 Test Results Template

```
Test Execution Date: __________
Tester Name: __________

WebSocket Connect:        ✅ / ❌
WebSocket Subscribe:      ✅ / ❌
WebSocket Unsubscribe:    ✅ / ❌
WebSocket Disconnect:     ✅ / ❌
WebSocket Status:         ✅ / ❌

Complete Workflow:        ✅ / ❌
Validation Tests:         ✅ / ❌
Edge Cases:               ✅ / ❌

Issues Found:
1. _______________
2. _______________

Notes:
_______________
```

---

## 🔗 Related Documentation

- WebSocket Controller: `src/controllers/v1/websocketController/`
- WebSocket Service: `src/services/v1/angeloneServices/websocket.service.js`
- Routes: `src/routes/v1/websocketRoutes/websocket.route.js`
- Validation: `src/validations/stock.validation.js`

---

**Status:** Ready for Testing ✅  
**Total Test Cases:** 30  
**Priority:** Medium (Optional Feature)
