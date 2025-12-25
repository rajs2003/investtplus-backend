const Twilio = require('twilio');
const config = require('../../../config/config');
const { generateTempUserKey } = require('../../../utils/redisUtil'); // Import from redisUtil.js
const { getRedisClient } = require('../../../db/redis'); // Import from redis.js
const logger = require('../../../config/logger');

/**
 *  Redis Client
 */
const redisClient = getRedisClient();

/**
 * Twilio client
 */
const twilioClient = new Twilio(config.twilio.accountSid, config.twilio.authToken, {
  lazyLoading: false,
});
/**
 * Store temporary user details in Redis
 * @param {object} userDetails
 * @returns {Promise<void>}
 */

const storeTempUserDetails = async (userDetails, otp) => {
  const UserKey = generateTempUserKey(userDetails.phoneNumber);
  const userData = JSON.stringify({ ...userDetails, otp });
  await redisClient.set(UserKey, JSON.stringify(userData), 'EX', 300);
};
/**
 * Store temporary other details in Redis
 * @param {object} otherDetails
 * @returns {Promise<void>}
 * */
const storeTempOtherDetails = async (otherDetails) => {
  const otherKey = generateTempUserKey(otherDetails.phoneNumber);
  const otherData = JSON.stringify({ ...otherDetails });
  await redisClient.set(otherKey, JSON.stringify(otherData), 'EX', 300);
};

/**
 *
 * @param {string} phoneNumber
 * @returns {Promise<null|{email: string, phoneNumber: string, otp: string}>}
 */
const retrieveTempUserDetails = async (phoneNumber) => {
  const UserKey = generateTempUserKey(phoneNumber);
  const userData = await redisClient.get(UserKey);
  return userData ? JSON.parse(userData) : null;
};
/**
 *
 * @param {string} phoneNumber
 */
const clearTempUserDetails = async (phoneNumber) => {
  const UserKey = generateTempUserKey(phoneNumber);
  await redisClient.del(UserKey);
};

const createOtp = async () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp;
};

/**
 * Send OTP via SMS
 * @param {string} phoneNumber
 * @param {string} otp
 */
const sendOTPSMS = async (phoneNumber, otp) => {
  console.log(otp);
  await twilioClient.messages
    .create({
      body: `Your otp for Dhanvantari Account is ${otp}`,
      from: config.twilio.phoneNumber,
      to: `+91${phoneNumber}`,
    })
    .then((message) => {
      logger.info('Message sent successfully:', message.sid);
    })
    .catch((error) => {
      logger.error('Error sending message:', error);
    });
};

/**
 *
 * @param {NUMBER} inputOtp
 * @param {NUMBER} storedOtp
 * @returns
 */
const verifyOtp = async (inputOtp, storedOtp) => {
  if (parseInt(inputOtp) === storedOtp) {
    return true;
  } else {
    throw new Error('Invalid OTP');
  }
};

module.exports = {
  sendOTPSMS,
  verifyOtp,
  createOtp,
  storeTempUserDetails,
  retrieveTempUserDetails,
  clearTempUserDetails,
  storeTempOtherDetails,
};
