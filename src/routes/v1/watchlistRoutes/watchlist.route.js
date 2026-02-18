const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const watchlistValidation = require('../../../validations/watchlist.validation');
const { watchlistController } = require('../../../controllers');

const router = express.Router();

router.post('/', auth('user'), validate(watchlistValidation.createWatchlist), watchlistController.createWatchlist);

router.get('/', auth('user'), validate(watchlistValidation.getWatchlists), watchlistController.getUserWatchlists);

router.get('/search', auth('user'), validate(watchlistValidation.searchStock), watchlistController.searchStock);

router.get('/:watchlistId', auth('user'), validate(watchlistValidation.getWatchlist), watchlistController.getWatchlist);

router.patch(
  '/:watchlistId',
  auth('user'),
  validate(watchlistValidation.updateWatchlist),
  watchlistController.updateWatchlist,
);

router.delete(
  '/:watchlistId',
  auth('user'),
  validate(watchlistValidation.deleteWatchlist),
  watchlistController.deleteWatchlist,
);

router.post('/:watchlistId/stocks', auth('user'), validate(watchlistValidation.addStock), watchlistController.addStock);

router.delete(
  '/:watchlistId/stocks/:symbol',
  auth('user'),
  validate(watchlistValidation.removeStock),
  watchlistController.removeStock,
);

router.put(
  '/:watchlistId/reorder',
  auth('user'),
  validate(watchlistValidation.reorderStocks),
  watchlistController.reorderStocks,
);

module.exports = router;
