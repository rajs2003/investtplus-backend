# 🚂 Railway.app Deployment Guide (RECOMMENDED)

## Why Railway Instead of Vercel?

✅ **Supports WebSocket** - Your market data WebSocket will work perfectly  
✅ **Background Jobs** - Bull queues and cron jobs work  
✅ **Traditional Server** - No serverless limitations  
✅ **Free Tier** - $5 free credits per month  
✅ **Auto Deploy** - GitHub integration

## Quick Setup (5 Minutes)

### Step 1: Sign Up

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Deploy

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `investtplus-backend` repository
4. Railway will auto-detect Node.js project

### Step 3: Add Environment Variables

Click on your project → Variables → Add these:

```
MONGODB_URL=mongodb+srv://your-connection-string
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=30
NODE_ENV=production
PORT=3000
REDIS_URL=your-redis-url (if needed)
```

### Step 4: Generate Domain

1. Go to Settings
2. Click "Generate Domain"
3. Your app will be live at: `your-app.up.railway.app`

### Step 5: Enable WebSocket

Railway automatically supports WebSocket - no extra config needed! 🎉

## Features That Will Work on Railway

✅ REST API endpoints  
✅ WebSocket connections (`socket.io`)  
✅ Background jobs (Bull queues)  
✅ Cron jobs (order execution, auto square-off)  
✅ MongoDB connections  
✅ Redis connections  
✅ File uploads  
✅ Long-running processes

## Auto Deploy from Git

Every push to `main` branch will automatically deploy! 🚀

```bash
git add .
git commit -m "deploy: Railway setup"
git push
```

## Cost

- **Free Tier**: $5 credits/month (enough for development)
- **Pro**: $20/month (unlimited usage)

## Alternative: Render.com

If Railway doesn't work, try [render.com](https://render.com):

- Also supports WebSocket
- Free tier available
- Similar setup process

---

## ⚠️ DO NOT USE VERCEL for this project

Vercel is **serverless only** - your WebSocket and background jobs will NOT work!
