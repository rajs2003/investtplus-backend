const express = require('express');
const authRoute = require('./authRoutes/auth.route');
const userRoute = require('./userRoutes/user.route');
const walletRoute = require('./walletRoutes/wallet.route');
const orderRoute = require('./orderRoutes/order.route');
const holdingRoute = require('./holdingRoutes/holding.route');
const watchlistRoute = require('./watchlistRoutes');
const dashboardRoute = require('./dashboardRoutes');
const stockRoute = require('./stockRoutes/stock.route');
const marketRoute = require('./marketRoutes/market.route');
const websocketRoute = require('./websocketRoutes/websocket.route');
const docsRoute = require('./docs.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/wallet',
    route: walletRoute,
  },
  {
    path: '/orders',
    route: orderRoute,
  },
  {
    path: '/holdings',
    route: holdingRoute,
  },
  {
    path: '/watchlists',
    route: watchlistRoute,
  },
  {
    path: '/dashboard',
    route: dashboardRoute,
  },
  {
    path: '/stocks',
    route: stockRoute,
  },
  {
    path: '/market',
    route: marketRoute,
  },
  {
    path: '/websocket',
    route: websocketRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
