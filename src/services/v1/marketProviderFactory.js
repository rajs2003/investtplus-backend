const config = require('../../config/config');
const logger = require('../../config/logger');

/**
 * Market Data Provider Factory
 * Dynamically loads the appropriate market data service provider (AngelOne or Kite)
 * based on the MARKET_DATA_PROVIDER environment variable
 */
class MarketProviderFactory {
  constructor() {
    this.provider = null;
    this.services = null;
    this.initialize();
  }

  /**
   * Initialize the market provider based on config
   */
  initialize() {
    const providerType = config.marketDataProvider;

    logger.info(`Initializing market data provider: ${providerType}`);

    try {
      if (providerType === 'kite') {
        this.provider = 'kite';
        const kiteServices = require('./kiteServices');
        this.services = {
          providerService: kiteServices.kiteService,
          marketService: kiteServices.marketService,
          stockService: kiteServices.stockService,
          webSocketService: kiteServices.webSocketService,
        };
        logger.info('Kite Connect services loaded successfully');
      } else if (providerType === 'angelone') {
        this.provider = 'angelone';
        const angeloneServices = require('./angeloneServices');
        this.services = {
          providerService: angeloneServices.angelOneService,
          marketService: angeloneServices.marketService,
          stockService: angeloneServices.stockService,
          webSocketService: angeloneServices.webSocketService,
        };
        logger.info('AngelOne services loaded successfully');
      } else {
        throw new Error(`Unknown market data provider: ${providerType}`);
      }
    } catch (error) {
      logger.error('Error initializing market provider:', error);
      throw error;
    }
  }

  /**
   * Get the current provider type
   * @returns {string} Provider type (angelone or kite)
   */
  getProviderType() {
    return this.provider;
  }

  /**
   * Get the main provider service (AngelOne or Kite service)
   * @returns {Object} Provider service instance
   */
  getProviderService() {
    return this.services.providerService;
  }

  /**
   * Get the market service
   * @returns {Object} Market service instance
   */
  getMarketService() {
    return this.services.marketService;
  }

  /**
   * Get the stock service
   * @returns {Object} Stock service instance
   */
  getStockService() {
    return this.services.stockService;
  }

  /**
   * Get the WebSocket service
   * @returns {Object} WebSocket service instance
   */
  getWebSocketService() {
    return this.services.webSocketService;
  }

  /**
   * Get all services
   * @returns {Object} All service instances
   */
  getAllServices() {
    return {
      providerType: this.provider,
      ...this.services,
    };
  }

  /**
   * Switch to a different provider (requires restart or re-initialization)
   * @param {string} newProvider - New provider type (angelone or kite)
   */
  switchProvider(newProvider) {
    if (newProvider !== 'angelone' && newProvider !== 'kite') {
      throw new Error(`Invalid provider: ${newProvider}. Must be 'angelone' or 'kite'`);
    }

    logger.warn(`Switching market data provider from ${this.provider} to ${newProvider}`);
    config.marketDataProvider = newProvider;
    this.initialize();
  }
}

// Create singleton instance
const marketProviderFactory = new MarketProviderFactory();

module.exports = marketProviderFactory;
