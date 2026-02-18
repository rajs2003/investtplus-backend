const { Position } = require('../../../../models');
const logger = require('../../../../config/logger');
const marketConfig = require('../../../../config/market.config');
const positionSettlement = require('./positionSettlement.service');

const processingPositionIds = new Set();

const calculateRemainingMargin = (position, currentPrice) => {
  const quantity = Math.abs(position.quantity);
  const marginRequiredPercent = marketConfig.margins?.intraday?.required || 0.2;
  const initialMargin = Math.abs(position.totalValue) * marginRequiredPercent;

  let adverseLoss = 0;

  if (position.quantity > 0) {
    adverseLoss = Math.max(0, (position.averagePrice - currentPrice) * quantity);
  } else if (position.quantity < 0) {
    adverseLoss = Math.max(0, (currentPrice - position.averagePrice) * quantity);
  }

  const remainingMargin = initialMargin - adverseLoss;

  return {
    marginRequiredPercent,
    initialMargin,
    adverseLoss,
    remainingMargin,
  };
};

const processIntradayRiskForPrice = async (symbol, exchange, currentPrice) => {
  const positions = await Position.find({
    symbol: symbol.toUpperCase(),
    exchange,
    positionType: 'intraday',
    isSquaredOff: false,
    quantity: { $ne: 0 },
  });

  if (positions.length === 0) {
    return { checked: 0, squaredOff: 0 };
  }

  let squaredOff = 0;

  for (const position of positions) {
    if (processingPositionIds.has(position.id)) {
      continue;
    }

    try {
      processingPositionIds.add(position.id);

      position.updatePrice(currentPrice);
      await position.save();

      const { initialMargin, adverseLoss, remainingMargin } = calculateRemainingMargin(position, currentPrice);

      if (remainingMargin <= 0) {
        logger.warn('Intraday position hit margin threshold; auto square-off triggered', {
          positionId: position.id,
          userId: position.userId,
          symbol: position.symbol,
          quantity: position.quantity,
          averagePrice: position.averagePrice,
          currentPrice,
          initialMargin,
          adverseLoss,
          remainingMargin,
        });

        const squareOffResult = await positionSettlement.squareOffIntradayPosition(position);

        if (squareOffResult.success) {
          squaredOff += 1;
        }
      }
    } catch (error) {
      logger.error('Failed intraday margin risk processing', {
        positionId: position.id,
        symbol: position.symbol,
        error: error.message,
      });
    } finally {
      processingPositionIds.delete(position.id);
    }
  }

  return {
    checked: positions.length,
    squaredOff,
  };
};

const processAllIntradayRisk = async (getPriceFn) => {
  const positions = await Position.find({
    positionType: 'intraday',
    isSquaredOff: false,
    quantity: { $ne: 0 },
  }).select('symbol exchange');

  if (positions.length === 0) {
    return { checked: 0, squaredOff: 0 };
  }

  const uniqueSymbolKeys = [...new Set(positions.map((p) => `${p.exchange}:${p.symbol}`))];

  let totalChecked = 0;
  let totalSquaredOff = 0;

  for (const key of uniqueSymbolKeys) {
    const [exchange, symbol] = key.split(':');

    try {
      const currentPrice = await getPriceFn(symbol, exchange);
      if (!currentPrice || currentPrice <= 0) {
        continue;
      }

      const result = await processIntradayRiskForPrice(symbol, exchange, currentPrice);
      totalChecked += result.checked;
      totalSquaredOff += result.squaredOff;
    } catch (error) {
      logger.warn('Risk processing skipped for symbol', { symbol, exchange, error: error.message });
    }
  }

  return {
    checked: totalChecked,
    squaredOff: totalSquaredOff,
  };
};

module.exports = {
  calculateRemainingMargin,
  processIntradayRiskForPrice,
  processAllIntradayRisk,
};
