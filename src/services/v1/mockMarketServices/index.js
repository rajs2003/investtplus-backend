/**
 * Mock Market Services
 * Export all mock market-related services
 */

const mockService = require('./mock.service');
const marketService = require('./market.service');
const stockService = require('./stock.service');
const webSocketService = require('./websocket.service');
const dataGenerator = require('./dataGenerator.service');

module.exports = {
  mockService,
  marketService,
  stockService,
  webSocketService,
  dataGenerator,
};
