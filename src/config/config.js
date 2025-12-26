const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });
const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    BASE_URL: Joi.string().default('http://localhost:5000'),
    REDIS_HOST: Joi.string().description('Redis host url'),
    REDIS_PORT: Joi.number().description('Redis port'),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    TWILIO_ACCOUNT_SID: Joi.string().description('SID account details from TWILIO'),
    TWILIO_AUTH_TOKEN: Joi.string().description('Auth Token from TWILIO'),
    TWILIO_PHONE_NUMBER: Joi.number().description('phone number from which call will take place'),
    TWILIO_VERIFY_SERVICE_SID: Joi.string().description('SID service details from TWILIO'),
    // Market Data Provider Configuration
    MARKET_DATA_PROVIDER: Joi.string()
      .valid('angelone', 'kite', 'mock')
      .default('angelone')
      .description('Market data provider (angelone, kite, or mock for testing)'),
    // AngelOne Configuration
    ANGELONE_API_KEY: Joi.string().description('AngelOne SmartAPI Key'),
    ANGELONE_CLIENT_CODE: Joi.string().description('AngelOne Client Code'),
    ANGELONE_PASSWORD: Joi.string().description('AngelOne Password'),
    ANGELONE_TOTP_SECRET: Joi.string().description('AngelOne TOTP Secret'),
    // Kite Connect Configuration
    KITE_API_KEY: Joi.string().description('Zerodha Kite Connect API Key'),
    KITE_API_SECRET: Joi.string().description('Zerodha Kite Connect API Secret'),
    KITE_USER_ID: Joi.string().description('Zerodha Kite User ID'),
    KITE_PASSWORD: Joi.string().description('Zerodha Kite Password'),
    KITE_TOTP_SECRET: Joi.string().description('Zerodha Kite TOTP Secret'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  base_url: envVars.BASE_URL,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    // options: {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    // },
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  twilio: {
    accountSid: envVars.TWILIO_ACCOUNT_SID,
    authToken: envVars.TWILIO_AUTH_TOKEN,
    phoneNumber: envVars.TWILIO_PHONE_NUMBER,
    verifyServiceSid: envVars.TWILIO_VERIFY_SERVICE_SID,
  },
  marketDataProvider: envVars.MARKET_DATA_PROVIDER || 'kite',
  angelone: {
    apiKey: envVars.ANGELONE_API_KEY,
    clientCode: envVars.ANGELONE_CLIENT_CODE,
    password: envVars.ANGELONE_PASSWORD,
    totpSecret: envVars.ANGELONE_TOTP_SECRET,
  },
  kite: {
    apiKey: envVars.KITE_API_KEY,
    apiSecret: envVars.KITE_API_SECRET,
    userId: envVars.KITE_USER_ID,
    password: envVars.KITE_PASSWORD,
    totpSecret: envVars.KITE_TOTP_SECRET,
  },
};
