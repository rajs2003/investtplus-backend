const httpStatus = require('http-status');
const pick = require('../../../../utils/pick');
const catchAsync = require('../../../../utils/catchAsync');
const { positionService } = require('../../../../services');

const getPositions = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['positionType', 'symbol']);
  const positions = await positionService.getPositions(req.user.id, filter);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Positions retrieved successfully',
    results: positions,
    count: positions.length,
  });
});

const getIntradayPositions = catchAsync(async (req, res) => {
  const positions = await positionService.getPositions(req.user.id, {
    ...pick(req.query, ['symbol']),
    positionType: 'intraday',
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Intraday positions retrieved successfully',
    results: positions,
    count: positions.length,
  });
});

const getDeliveryPositions = catchAsync(async (req, res) => {
  const positions = await positionService.getPositions(req.user.id, {
    ...pick(req.query, ['symbol']),
    positionType: 'delivery',
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Delivery positions retrieved successfully',
    results: positions,
    count: positions.length,
  });
});

const getPositionById = catchAsync(async (req, res) => {
  const position = await positionService.getPositionById(req.user.id, req.params.positionId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Position retrieved successfully',
    position,
  });
});

const getPositionSummary = catchAsync(async (req, res) => {
  const summary = await positionService.getPositionSummary(req.user.id);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Position summary retrieved successfully',
    summary,
  });
});

const getPositionHistory = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['positionType', 'symbol', 'startDate', 'endDate']);
  const options = pick(req.query, ['page', 'limit']);

  const result = await positionService.getPositionHistory(req.user.id, filter, options);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Position history retrieved successfully',
    results: result.results,
    pagination: result.pagination,
  });
});

const squareOffPosition = catchAsync(async (req, res) => {
  const result = await positionService.squareOffPosition(req.user.id, req.params.positionId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Position squared off successfully',
    position: result.position,
    squareOffOrder: result.squareOffOrder,
  });
});

module.exports = {
  getPositions,
  getIntradayPositions,
  getDeliveryPositions,
  getPositionById,
  getPositionSummary,
  getPositionHistory,
  squareOffPosition,
};
