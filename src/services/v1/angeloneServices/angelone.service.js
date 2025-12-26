const { SmartAPI } = require('smartapi-javascript');
const { authenticator } = require('otplib');
const config = require('../../../config/config');
const logger = require('../../../config/logger');

class AngelOneService {
  constructor() {
    this.smartApi = new SmartAPI({
      api_key: config.angelone.apiKey,
    });
    this.isLoggedIn = false;
    this.sessionData = null;
  }

  /**
   * Generate TOTP token for login
   * @returns {string} TOTP token
   */
  generateTOTP() {
    try {
      const token = authenticator.generate(config.angelone.totpSecret);
      return token;
    } catch (error) {
      logger.error('Error generating TOTP:', error);
      throw error;
    }
  }

  /**
   * Login to AngelOne SmartAPI
   * @returns {Promise<Object>} Session data
   */
  async login() {
    try {
      if (this.isLoggedIn && this.sessionData) {
        logger.info('Already logged in to AngelOne');
        return this.sessionData;
      }

      const totp = this.generateTOTP();

      const loginResponse = await this.smartApi.generateSession(config.angelone.clientCode, config.angelone.password, totp);

      if (loginResponse.status && loginResponse.data) {
        this.isLoggedIn = true;
        this.sessionData = loginResponse.data;
        logger.info('Successfully logged in to AngelOne SmartAPI');
        return loginResponse.data;
      } else {
        throw new Error('Login failed: ' + (loginResponse.message || 'Unknown error'));
      }
    } catch (error) {
      logger.error('AngelOne login error:', error);
      this.isLoggedIn = false;
      throw error;
    }
  }

  /**
   * Logout from AngelOne SmartAPI
   * @returns {Promise<Object>} Logout response
   */
  async logout() {
    try {
      if (!this.isLoggedIn) {
        logger.info('Not logged in to AngelOne');
        return { message: 'Not logged in' };
      }

      const response = await this.smartApi.terminateSession(config.angelone.clientCode);
      this.isLoggedIn = false;
      this.sessionData = null;
      logger.info('Successfully logged out from AngelOne');
      return response;
    } catch (error) {
      logger.error('AngelOne logout error:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   * @returns {Promise<Object>} User profile data
   */
  async getProfile() {
    try {
      await this.ensureLoggedIn();
      const response = await this.smartApi.getProfile();
      return response.data;
    } catch (error) {
      logger.error('Error fetching profile:', error);
      throw error;
    }
  }

  /**
   * Ensure user is logged in, login if not
   * @returns {Promise<void>}
   */
  async ensureLoggedIn() {
    if (!this.isLoggedIn) {
      await this.login();
    }
  }

  /**
   * Get SmartAPI instance
   * @returns {SmartAPI} SmartAPI instance
   */
  getSmartApiInstance() {
    return this.smartApi;
  }

  /**
   * Get session data
   * @returns {Object|null} Session data
   */
  getSessionData() {
    return this.sessionData;
  }
}

// Create singleton instance
const angelOneService = new AngelOneService();

module.exports = angelOneService;
