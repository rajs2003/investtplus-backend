const httpStatus = require('http-status');
const catchAsync = require('../../../../utils/catchAsync');
const { dashboardService } = require('../../../../services');

/**
 * @desc    Get market overview (indices, market status)
 * @route   GET /v1/dashboard/market-overview
 * @access  Private
 */
const getMarketOverview = catchAsync(async (req, res) => {
  const marketData = await dashboardService.getMarketOverview();
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Market overview retrieved successfully',
    data: marketData,
  });
});

/**
 * @desc    Get popular stocks
 * @route   GET /v1/dashboard/popular-stocks
 * @access  Private
 */
const getPopularStocks = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const stocks = await dashboardService.getPopularStocks(limit);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Popular stocks retrieved successfully',
    data: stocks,
  });
});

/**
 * @desc    Get top gainers
 * @route   GET /v1/dashboard/top-gainers
 * @access  Private
 */
const getTopGainers = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const gainers = await dashboardService.getTopGainers(limit);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Top gainers retrieved successfully',
    data: gainers,
  });
});

/**
 * @desc    Get top losers
 * @route   GET /v1/dashboard/top-losers
 * @access  Private
 */
const getTopLosers = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const losers = await dashboardService.getTopLosers(limit);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Top losers retrieved successfully',
    data: losers,
  });
});

/**
 * @desc    Get sector performance
 * @route   GET /v1/dashboard/sector-performance
 * @access  Private
 */
const getSectorPerformance = catchAsync(async (req, res) => {
  const sectors = await dashboardService.getSectorPerformance();
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Sector performance retrieved successfully',
    data: sectors,
  });
});

/**
 * @desc    Get user's portfolio analytics
 * @route   GET /v1/dashboard/portfolio-analytics
 * @access  Private
 */
const getPortfolioAnalytics = catchAsync(async (req, res) => {
  const analytics = await dashboardService.getPortfolioAnalytics(req.user._id);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Portfolio analytics retrieved successfully',
    data: analytics,
  });
});

/**
 * @desc    Get user activity summary
 * @route   GET /v1/dashboard/activity-summary
 * @access  Private
 */
const getUserActivitySummary = catchAsync(async (req, res) => {
  const activity = await dashboardService.getUserActivitySummary(req.user._id);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Activity summary retrieved successfully',
    data: activity,
  });
});

/**
 * @desc    Get platform statistics (admin only)
 * @route   GET /v1/dashboard/platform-stats
 * @access  Private/Admin
 */
const getPlatformStatistics = catchAsync(async (req, res) => {
  const stats = await dashboardService.getPlatformStatistics();
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Platform statistics retrieved successfully',
    data: stats,
  });
});

module.exports = {
  getMarketOverview,
  getPopularStocks,
  getTopGainers,
  getTopLosers,
  getSectorPerformance,
  getPortfolioAnalytics,
  getUserActivitySummary,
  getPlatformStatistics,
};
