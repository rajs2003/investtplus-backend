const authValidation = require('./auth.validation');
const customValidation = require('./custom.validation');
const userValidation = require('./user.validation');
const walletValidation = require('./wallet.validation');
const watchlistValidation = require('./watchlist.validation');
const dashboardValidation = require('./dashboard.validation');
const holdingValidation = require('./holding.validation');
const orderValidation = require('./order.validation');

module.exports = {
  authValidation,
  customValidation,
  userValidation,
  walletValidation,
  watchlistValidation,
  dashboardValidation,
  holdingValidation,
  orderValidation,
};
