const httpStatus = require('http-status');
const { Position, Order } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const logger = require('../../../../config/logger');
const { marketDataService } = require('../../mockMarket');
const positionSettlement = require('./positionSettlement.service');

const getCurrentMarketPrice = async (symbol, exchange = 'NSE') => {
  try {
    const priceData = marketDataService.getCurrentPrice(symbol.toUpperCase(), exchange);
    return priceData.data.ltp;
  } catch (error) {
    logger.warn(`Failed to fetch price for ${symbol}: ${error.message}`);
    return 0;
  }
};

const formatPosition = (position) => {
  const quantity = position.quantity;
  let side = 'flat';

  if (quantity > 0) {
    side = 'long';
  } else if (quantity < 0) {
    side = 'short';
  }

  return {
    id: position.id,
    userId: position.userId,
    walletId: position.walletId,
    symbol: position.symbol,
    exchange: position.exchange,
    positionType: position.positionType,
    side,
    quantity: position.quantity,
    averagePrice: position.averagePrice,
    totalValue: position.totalValue,
    currentPrice: position.currentPrice,
    currentValue: position.currentValue,
    unrealizedPL: position.unrealizedPL,
    unrealizedPLPercentage: position.unrealizedPLPercentage,
    orderIds: position.orderIds,
    expiresAt: position.expiresAt,
    isSquaredOff: position.isSquaredOff,
    squareOffOrderId: position.squareOffOrderId,
    convertedToHolding: position.convertedToHolding,
    holdingId: position.holdingId,
    createdAt: position.createdAt,
    updatedAt: position.updatedAt,
  };
};

const updatePositionsWithLivePrice = async (positions) => {
  if (!positions || positions.length === 0) {
    return [];
  }

  await Promise.all(
    positions.map(async (position) => {
      const currentPrice = await getCurrentMarketPrice(position.symbol, position.exchange);
      if (currentPrice > 0) {
        position.updatePrice(currentPrice);
        await position.save();
      }
    }),
  );

  return positions;
};

const getPositions = async (userId, filter = {}) => {
  const query = {
    userId,
    isSquaredOff: false,
    quantity: { $ne: 0 },
  };

  if (filter.positionType) {
    query.positionType = filter.positionType;
  }

  if (filter.symbol) {
    query.symbol = filter.symbol.toUpperCase();
  }

  const positions = await Position.find(query).sort({ createdAt: -1 });
  await updatePositionsWithLivePrice(positions);

  return positions.map(formatPosition);
};

const getPositionById = async (userId, positionId) => {
  const position = await Position.findById(positionId);

  if (!position) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Position not found');
  }

  if (position.userId.toString() !== userId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to view this position');
  }

  const currentPrice = await getCurrentMarketPrice(position.symbol, position.exchange);
  if (currentPrice > 0) {
    position.updatePrice(currentPrice);
    await position.save();
  }

  return formatPosition(position);
};

const getPositionSummary = async (userId) => {
  const activePositions = await Position.find({
    userId,
    isSquaredOff: false,
    quantity: { $ne: 0 },
  });

  await updatePositionsWithLivePrice(activePositions);

  const now = new Date();

  const summary = activePositions.reduce(
    (acc, position) => {
      acc.totalOpenPositions += 1;

      if (position.positionType === 'intraday') {
        acc.intradayPositions += 1;
        if (position.expiresAt <= now) {
          acc.intradayPendingSquareOff += 1;
        }
      } else if (position.positionType === 'delivery') {
        acc.deliveryPositions += 1;
      }

      if (position.quantity > 0) {
        acc.longPositions += 1;
      } else if (position.quantity < 0) {
        acc.shortPositions += 1;
      }

      acc.totalInvested += Math.abs(position.totalValue || 0);
      acc.totalCurrentValue += Math.abs(position.currentValue || 0);
      acc.totalUnrealizedPL += position.unrealizedPL || 0;

      return acc;
    },
    {
      totalOpenPositions: 0,
      intradayPositions: 0,
      deliveryPositions: 0,
      longPositions: 0,
      shortPositions: 0,
      intradayPendingSquareOff: 0,
      totalInvested: 0,
      totalCurrentValue: 0,
      totalUnrealizedPL: 0,
    },
  );

  summary.totalUnrealizedPLPercentage =
    summary.totalInvested > 0 ? (summary.totalUnrealizedPL / summary.totalInvested) * 100 : 0;

  return {
    ...summary,
    totalInvested: parseFloat(summary.totalInvested.toFixed(2)),
    totalCurrentValue: parseFloat(summary.totalCurrentValue.toFixed(2)),
    totalUnrealizedPL: parseFloat(summary.totalUnrealizedPL.toFixed(2)),
    totalUnrealizedPLPercentage: parseFloat(summary.totalUnrealizedPLPercentage.toFixed(2)),
  };
};

const getPositionHistory = async (userId, filter = {}, options = {}) => {
  const query = {
    userId,
    isSquaredOff: true,
  };

  if (filter.positionType) {
    query.positionType = filter.positionType;
  }

  if (filter.symbol) {
    query.symbol = filter.symbol.toUpperCase();
  }

  if (filter.startDate || filter.endDate) {
    query.createdAt = {};

    if (filter.startDate) {
      query.createdAt.$gte = new Date(filter.startDate);
    }

    if (filter.endDate) {
      query.createdAt.$lte = new Date(filter.endDate);
    }
  }

  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [positions, total] = await Promise.all([
    Position.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Position.countDocuments(query),
  ]);

  return {
    results: positions.map(formatPosition),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const squareOffPosition = async (userId, positionId) => {
  const position = await Position.findById(positionId);

  if (!position) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Position not found');
  }

  if (position.userId.toString() !== userId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to square-off this position');
  }

  if (position.isSquaredOff || position.quantity === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Position is already squared off');
  }

  if (position.positionType !== 'intraday') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Manual square-off is currently supported only for intraday positions');
  }

  const result = await positionSettlement.squareOffIntradayPosition(position);
  if (!result.success) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, result.error || 'Failed to square-off position');
  }

  let squareOffOrder = null;
  if (result.squareOffOrder?._id) {
    squareOffOrder = await Order.findById(result.squareOffOrder._id);
  }

  const updatedPosition = await Position.findById(positionId);

  return {
    position: formatPosition(updatedPosition),
    squareOffOrder: squareOffOrder
      ? {
          id: squareOffOrder.id,
          symbol: squareOffOrder.symbol,
          transactionType: squareOffOrder.transactionType,
          quantity: squareOffOrder.quantity,
          executedPrice: squareOffOrder.executedPrice,
          status: squareOffOrder.status,
          executedAt: squareOffOrder.executedAt,
          createdAt: squareOffOrder.createdAt,
        }
      : null,
  };
};

module.exports = {
  getPositions,
  getPositionById,
  getPositionSummary,
  getPositionHistory,
  squareOffPosition,
};
