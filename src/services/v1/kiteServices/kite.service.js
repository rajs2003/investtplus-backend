const { KiteConnect } = require('kiteconnect');
const { authenticator } = require('otplib');
const config = require('../../../config/config');
const logger = require('../../../config/logger');

class KiteService {
  constructor() {
    this.kc = new KiteConnect({
      api_key: config.kite.apiKey,
    });
    this.isLoggedIn = false;
    this.accessToken = null;
    this.profile = null;
  }

  /**
   * Generate TOTP token for login
   * @returns {string} TOTP token
   */
  generateTOTP() {
    try {
      if (!config.kite.totpSecret) {
        throw new Error('TOTP secret not configured');
      }
      const token = authenticator.generate(config.kite.totpSecret);
      return token;
    } catch (error) {
      logger.error('Error generating TOTP:', error);
      throw error;
    }
  }

  /**
   * Set access token (for manual authentication)
   * @param {string} accessToken - Access token from Kite
   */
  setAccessToken(accessToken) {
    this.accessToken = accessToken;
    this.kc.setAccessToken(accessToken);
    this.isLoggedIn = true;
    logger.info('Access token set for Kite Connect');
  }

  /**
   * Generate session using request token
   * @param {string} requestToken - Request token from Kite login
   * @returns {Promise<Object>} Session data with access token
   */
  async generateSession(requestToken) {
    try {
      const response = await this.kc.generateSession(requestToken, config.kite.apiSecret);
      this.accessToken = response.access_token;
      this.kc.setAccessToken(response.access_token);
      this.isLoggedIn = true;
      logger.info('Successfully generated Kite Connect session');
      return response;
    } catch (error) {
      logger.error('Kite session generation error:', error);
      this.isLoggedIn = false;
      throw error;
    }
  }

  /**
   * Login to Kite Connect (requires manual authentication flow)
   * @returns {Promise<Object>} Login information
   */
  async login() {
    try {
      if (this.isLoggedIn && this.accessToken) {
        logger.info('Already logged in to Kite Connect');
        return { 
          success: true, 
          message: 'Already logged in',
          accessToken: this.accessToken 
        };
      }

      // Note: Kite Connect requires a web-based login flow
      // This is a placeholder - actual implementation would need:
      // 1. Redirect user to login URL
      // 2. Get request token from callback
      // 3. Generate session with request token
      
      const loginUrl = this.kc.getLoginURL();
      logger.info('Kite Connect login URL generated');
      
      return {
        success: false,
        requiresManualAuth: true,
        loginUrl,
        message: 'Please complete login at the provided URL and call generateSession with request token'
      };
    } catch (error) {
      logger.error('Kite login error:', error);
      this.isLoggedIn = false;
      throw error;
    }
  }

  /**
   * Logout from Kite Connect
   * @returns {Promise<Object>} Logout response
   */
  async logout() {
    try {
      if (!this.isLoggedIn) {
        logger.info('Not logged in to Kite Connect');
        return { message: 'Not logged in' };
      }

      const response = await this.kc.invalidateAccessToken(this.accessToken);
      this.isLoggedIn = false;
      this.accessToken = null;
      this.profile = null;
      logger.info('Successfully logged out from Kite Connect');
      return response;
    } catch (error) {
      logger.error('Kite logout error:', error);
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
      const profile = await this.kc.getProfile();
      this.profile = profile;
      return profile;
    } catch (error) {
      logger.error('Error fetching Kite profile:', error);
      throw error;
    }
  }

  /**
   * Ensure user is logged in
   * @returns {Promise<void>}
   */
  async ensureLoggedIn() {
    if (!this.isLoggedIn || !this.accessToken) {
      throw new Error('Not logged in to Kite Connect. Please authenticate first.');
    }
  }

  /**
   * Get Kite Connect instance
   * @returns {KiteConnect} Kite Connect instance
   */
  getKiteInstance() {
    return this.kc;
  }

  /**
   * Get session data
   * @returns {Object|null} Current session data
   */
  getSessionData() {
    return {
      isLoggedIn: this.isLoggedIn,
      accessToken: this.accessToken,
      profile: this.profile,
    };
  }
}

// Create singleton instance
const kiteService = new KiteService();

module.exports = kiteService;
