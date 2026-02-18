/* eslint-disable no-unused-vars */
const httpStatus = require('http-status');
const { Position, Holding, Order } = require('../../../../models');
const ApiError = require('../../../../utils/ApiError');
const fundManager = require('../walletServices/fundManager.service');
const walletService = require('../walletServices/wallet.service');
const { marketDataService } = require('../../mockMarket');
const orderExecutionService = require('../orderServices/orderExecution.service');

/**
 * Position Settlement Service
 * Handles post-market operations:
 * 1. Auto square-off intraday positions at market close
 * 2. Convert delivery positions to holdings after 24 hours
 */

/**
 * Get current market price
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Exchange
 * @returns {Promise<number>}
 */
const getCurrentMarketPrice = async (symbol, exchange = 'NSE') => {
  try {
    const priceData = marketDataService.getCurrentPrice(symbol.toUpperCase(), exchange);
    return priceData.data.ltp;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error.message);
    return 0;
  }
};

/**
 * Auto square-off a single intraday position
 * @param {Object} position - Position to square off
 * @returns {Promise<Object>}
 */
const squareOffIntradayPosition = async (position) => {
  try {
    console.log(`Auto square-off for position ${position._id}: ${position.symbol} Qty: ${position.quantity}`);

    // Get current market price
    const currentPrice = await getCurrentMarketPrice(position.symbol, position.exchange);

    if (!currentPrice || currentPrice === 0) {
      console.error(`Cannot square-off ${position.symbol} - unable to fetch price`);
      return { success: false, error: 'Price unavailable' };
    }

    // Create opposite order for square-off
    const squareOffTransactionType = position.quantity > 0 ? 'sell' : 'buy';
    const squareOffQuantity = Math.abs(position.quantity);

    // Calculate charges for square-off
    const orderValue = squareOffQuantity * currentPrice;
    const brokerage = orderValue * 0.0003;
    const stt = squareOffTransactionType === 'sell' ? orderValue * 0.00025 : 0;
    const transactionCharges = orderValue * 0.000325;
    const gst = (brokerage + transactionCharges) * 0.18;
    const sebiCharges = orderValue * 0.00001;
    const stampDuty = squareOffTransactionType === 'buy' ? orderValue * 0.00015 : 0;
    const totalCharges = brokerage + stt + transactionCharges + gst + sebiCharges + stampDuty;
    const netAmount =
      squareOffTransactionType === 'buy' ? orderValue + totalCharges : Math.max(0, orderValue - totalCharges);

    // Create square-off order
    const squareOffOrder = await Order.create({
      userId: position.userId,
      symbol: position.symbol,
      exchange: position.exchange,
      tradingSymbol: `${position.symbol}-EQ`,
      orderType: 'intraday',
      orderVariant: 'market',
      transactionType: squareOffTransactionType,
      quantity: squareOffQuantity,
      price: currentPrice,
      status: 'pending',
      orderValue,
      brokerage,
      stt,
      transactionCharges,
      gst,
      sebiCharges,
      stampDuty,
      totalCharges,
      netAmount,
      description: `Auto square-off: ${squareOffQuantity} ${position.symbol} @ Rs ${currentPrice}`,
    });

    // Execute the square-off order
    await orderExecutionService.executeOrder(squareOffOrder._id);

    // Mark position as squared off
    position.markAsSquaredOff(squareOffOrder._id);
    await position.save();

    console.log(
      `Auto square-off completed for ${position.symbol}: ${squareOffTransactionType.toUpperCase()} ${squareOffQuantity} @ Rs ${currentPrice}`,
    );

    return {
      success: true,
      position,
      squareOffOrder,
      executionPrice: currentPrice,
    };
  } catch (error) {
    console.error(`Failed to square-off position ${position._id}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Auto square-off all intraday positions (called at market close)
 * @returns {Promise<Object>} Summary of square-off operations
 */
const autoSquareOffIntradayPositions = async () => {
  try {
    console.log('Starting auto square-off for intraday positions...');

    const positions = await Position.getIntradayPositionsForSquareOff();

    if (positions.length === 0) {
      console.log('No intraday positions to square-off');
      return {
        success: true,
        total: 0,
        squared: 0,
        failed: 0,
        results: [],
      };
    }

    console.log(`Found ${positions.length} intraday positions to square-off`);

    const results = {
      success: true,
      total: positions.length,
      squared: 0,
      failed: 0,
      results: [],
    };

    // Square-off all positions
    for (const position of positions) {
      const result = await squareOffIntradayPosition(position);

      if (result.success) {
        results.squared++;
      } else {
        results.failed++;
      }

      results.results.push({
        positionId: position._id,
        symbol: position.symbol,
        quantity: position.quantity,
        ...result,
      });
    }

    console.log(
      `Auto square-off completed: ${results.squared} squared-off, ${results.failed} failed out of ${results.total}`,
    );

    return results;
  } catch (error) {
    console.error('Auto square-off failed:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Auto square-off failed: ${error.message}`);
  }
};

/**
 * Convert a single delivery position to holding
 * @param {Object} position - Position to convert
 * @returns {Promise<Object>}
 */
const convertPositionToHolding = async (position) => {
  try {
    console.log(`Converting position ${position._id} to holding: ${position.symbol} Qty: ${position.quantity}`);

    // Check if holding already exists
    let holding = await Holding.findOne({
      userId: position.userId,
      symbol: position.symbol,
      exchange: position.exchange,
      holdingType: 'delivery',
    });

    if (holding) {
      // Add to existing holding
      holding.addQuantity(position.quantity, position.averagePrice, null);
      holding.orderIds.push(...position.orderIds);
      await holding.save();
      console.log(`Added to existing holding for ${position.symbol}`);
    } else {
      // Create new holding
      const wallet = await walletService.getWalletByUserId(position.userId);

      holding = await Holding.create({
        userId: position.userId,
        walletId: wallet._id,
        symbol: position.symbol,
        exchange: position.exchange,
        holdingType: 'delivery',
        quantity: position.quantity,
        averageBuyPrice: position.averagePrice,
        totalInvestment: position.totalValue,
        currentPrice: position.currentPrice,
        orderIds: position.orderIds,
      });
      console.log(`Created new holding for ${position.symbol}`);
    }

    // Mark position as converted
    position.convertedToHolding = true;
    position.holdingId = holding._id;
    await position.save();

    console.log(`Position ${position._id} converted to holding ${holding._id}`);

    return {
      success: true,
      position,
      holding,
    };
  } catch (error) {
    console.error(`Failed to convert position ${position._id} to holding:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Convert all expired delivery positions to holdings (24hr+ old)
 * @returns {Promise<Object>} Summary of conversion operations
 */
const convertExpiredDeliveryPositions = async () => {
  try {
    console.log('Starting conversion of expired delivery positions to holdings...');

    const positions = await Position.getExpiredPositions();

    if (positions.length === 0) {
      console.log('No expired delivery positions to convert');
      return {
        success: true,
        total: 0,
        converted: 0,
        failed: 0,
        results: [],
      };
    }

    console.log(`Found ${positions.length} expired delivery positions to convert`);

    const results = {
      success: true,
      total: positions.length,
      converted: 0,
      failed: 0,
      results: [],
    };

    // Convert all positions
    for (const position of positions) {
      const result = await convertPositionToHolding(position);

      if (result.success) {
        results.converted++;
      } else {
        results.failed++;
      }

      results.results.push({
        positionId: position._id,
        symbol: position.symbol,
        quantity: position.quantity,
        ...result,
      });
    }

    console.log(
      `Position conversion completed: ${results.converted} converted, ${results.failed} failed out of ${results.total}`,
    );

    return results;
  } catch (error) {
    console.error('Position conversion failed:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Position conversion failed: ${error.message}`);
  }
};

/**
 * Run all post-market settlement operations
 * @returns {Promise<Object>}
 */
const runPostMarketSettlement = async () => {
  try {
    console.log('========== POST-MARKET SETTLEMENT STARTED ==========');

    const results = {
      timestamp: new Date(),
      intradaySquareOff: null,
      positionConversion: null,
      success: true,
    };

    // 1. Auto square-off intraday positions
    try {
      results.intradaySquareOff = await autoSquareOffIntradayPositions();
    } catch (error) {
      console.error('Intraday square-off failed:', error.message);
      results.intradaySquareOff = { success: false, error: error.message };
      results.success = false;
    }

    // 2. Convert expired delivery positions to holdings
    try {
      results.positionConversion = await convertExpiredDeliveryPositions();
    } catch (error) {
      console.error('Position conversion failed:', error.message);
      results.positionConversion = { success: false, error: error.message };
      results.success = false;
    }

    console.log('========== POST-MARKET SETTLEMENT COMPLETED ==========');

    return results;
  } catch (error) {
    console.error('Post-market settlement failed:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Post-market settlement failed: ${error.message}`);
  }
};

module.exports = {
  autoSquareOffIntradayPositions,
  convertExpiredDeliveryPositions,
  squareOffIntradayPosition,
  convertPositionToHolding,
  runPostMarketSettlement,
};
