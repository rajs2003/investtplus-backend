const authValidation = require('./auth.validation');
const customValidation = require('./custom.validation');
const stockValidation = require('./stock.validation');
const userValidation = require('./user.validation');
const walletValidation = require('./wallet.validation');
const watchlistValidation = require('./watchlist.validation');
const dashboardValidation = require('./dashboard.validation');

module.exports = {
  authValidation,
  customValidation,
  stockValidation,
  userValidation,
  walletValidation,
  watchlistValidation,
  dashboardValidation,
};
