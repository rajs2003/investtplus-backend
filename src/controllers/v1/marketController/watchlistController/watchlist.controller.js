const httpStatus = require('http-status');
const catchAsync = require('../../../../utils/catchAsync');
const { watchlistService } = require('../../../../services');

/**
 * @desc    Create a new watchlist
 * @route   POST /v1/watchlists
 * @access  Private
 */
const createWatchlist = catchAsync(async (req, res) => {
  const watchlist = await watchlistService.createWatchlist(req.user._id, req.body);
  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Watchlist created successfully',
    data: watchlist,
  });
});

/**
 * @desc    Get all watchlists for logged-in user
 * @route   GET /v1/watchlists
 * @access  Private
 */
const getUserWatchlists = catchAsync(async (req, res) => {
  const watchlists = await watchlistService.getUserWatchlists(req.user._id);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Watchlists retrieved successfully',
    data: watchlists,
  });
});

/**
 * @desc    Get watchlist by ID
 * @route   GET /v1/watchlists/:watchlistId
 * @access  Private
 */
const getWatchlist = catchAsync(async (req, res) => {
  const { watchlistId } = req.params;
  const { withPrices } = req.query;

  let watchlist;
  if (withPrices === 'true') {
    watchlist = await watchlistService.getWatchlistWithPrices(watchlistId, req.user._id);
  } else {
    watchlist = await watchlistService.getWatchlistById(watchlistId, req.user._id);
  }

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Watchlist retrieved successfully',
    data: watchlist,
  });
});

/**
 * @desc    Update watchlist details
 * @route   PATCH /v1/watchlists/:watchlistId
 * @access  Private
 */
const updateWatchlist = catchAsync(async (req, res) => {
  const { watchlistId } = req.params;
  const watchlist = await watchlistService.updateWatchlist(watchlistId, req.user._id, req.body);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Watchlist updated successfully',
    data: watchlist,
  });
});

/**
 * @desc    Delete watchlist
 * @route   DELETE /v1/watchlists/:watchlistId
 * @access  Private
 */
const deleteWatchlist = catchAsync(async (req, res) => {
  const { watchlistId } = req.params;
  await watchlistService.deleteWatchlist(watchlistId, req.user._id);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Watchlist deleted successfully',
  });
});

/**
 * @desc    Add stock to watchlist
 * @route   POST /v1/watchlists/:watchlistId/stocks
 * @access  Private
 */
const addStock = catchAsync(async (req, res) => {
  const { watchlistId } = req.params;
  const watchlist = await watchlistService.addStockToWatchlist(watchlistId, req.user._id, req.body);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Stock added to watchlist successfully',
    data: watchlist,
  });
});

/**
 * @desc    Remove stock from watchlist
 * @route   DELETE /v1/watchlists/:watchlistId/stocks/:symbol
 * @access  Private
 */
const removeStock = catchAsync(async (req, res) => {
  const { watchlistId, symbol } = req.params;
  const { exchange } = req.query;

  const watchlist = await watchlistService.removeStockFromWatchlist(watchlistId, req.user._id, symbol, exchange);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Stock removed from watchlist successfully',
    data: watchlist,
  });
});

/**
 * @desc    Reorder stocks in watchlist
 * @route   PUT /v1/watchlists/:watchlistId/reorder
 * @access  Private
 */
const reorderStocks = catchAsync(async (req, res) => {
  const { watchlistId } = req.params;
  const { order } = req.body;

  const watchlist = await watchlistService.reorderStocks(watchlistId, req.user._id, order);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Stocks reordered successfully',
    data: watchlist,
  });
});

/**
 * @desc    Search for stock in user's watchlists
 * @route   GET /v1/watchlists/search
 * @access  Private
 */
const searchStock = catchAsync(async (req, res) => {
  const { symbol } = req.query;
  const results = await watchlistService.findStockInWatchlists(req.user._id, symbol);

  res.status(httpStatus.OK).json({
    success: true,
    message: results.length > 0 ? 'Stock found in watchlists' : 'Stock not found in any watchlist',
    data: results,
  });
});

module.exports = {
  createWatchlist,
  getUserWatchlists,
  getWatchlist,
  updateWatchlist,
  deleteWatchlist,
  addStock,
  removeStock,
  reorderStocks,
  searchStock,
};
