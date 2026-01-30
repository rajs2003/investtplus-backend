# Vercel Deployment Guide

## Important Notes for Vercel Deployment

### 1. Environment Variables

Make sure to set these in Vercel Dashboard (Settings > Environment Variables):

- `MONGODB_URL` - Your MongoDB connection string
- `JWT_SECRET` - Your JWT secret key
- `JWT_ACCESS_EXPIRATION_MINUTES`
- `JWT_REFRESH_EXPIRATION_DAYS`
- `REDIS_URL` (if using Redis)
- All other environment variables from your .env file

### 2. Limitations on Vercel

- **WebSockets**: Vercel doesn't support traditional WebSocket connections
  - Solution: Use Vercel's Edge Functions or external WebSocket service (Ably, Pusher, Socket.io with Redis adapter)
- **Background Jobs**: Bull queues and cron jobs won't work on serverless
  - Solution: Use Vercel Cron Jobs or external services (AWS Lambda, Google Cloud Functions)
- **Stateless**: Each request is independent, no persistent connections

### 3. What's Fixed

- ✅ Serverless function entry point created (`api/index.js`)
- ✅ Database connection optimized for cold starts
- ✅ Background jobs disabled on Vercel (won't crash the app)
- ✅ Express app properly exported

### 4. Deploy Command

```bash
vercel --prod
```

### 5. Testing Locally

```bash
npm install -g vercel
vercel dev
```

### 6. For Full Features (WebSocket + Background Jobs)

Consider using:

- Railway.app
- Render.com
- Heroku
- DigitalOcean App Platform
- AWS EC2/Elastic Beanstalk

These platforms support long-running processes and WebSocket connections.
