const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const cookieParser = require('cookie-parser');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const { v1Routes } = require('./routes');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');
const logger = require('./config/logger');
const path = require('path');
const fs = require('fs');

const app = express();

// No background jobs needed - using event-driven limit order execution

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.socket.io', 'https://fonts.googleapis.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws://localhost:3000', 'http://localhost:3000', 'https://cdn.socket.io'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'https://investtplus-simulation-app.onrender.com',
  'https://investtplus-simulation-forntend.vercel.app',
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['Set-Cookie'],
  }),
);

//Header configs
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Credentials', true);

  if (config.env === 'production') {
    // direct ek hi nahi dalte hain, isme apan check karte hain header me origin kya hai, agar origin allowed origins me se hai to hi allow karte hain varna nahi karte hain
    // res.header('Access-Control-Allow-Origin', 'https://investtplus.com');
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  }

  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
  next();
});

// Static files for docs/HTML pages
app.use(express.static(path.join(__dirname, '..', 'static')));

//use cookie parser
app.use(cookieParser());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use(authLimiter);
}

//check the backend
app.get('/', (req, res) => {
  try {
    const templatePath = path.join(__dirname, 'templates', 'status', 'statusDisplay.html');
    let html = fs.readFileSync(templatePath, 'utf8');
    res.send(html);
  } catch (err) {
    // fallback to simple text
    res.status(500).send('Unable to render status page');
    logger.error('Error rendering status page', err);
  }
});

// v1 api routes
app.use('/v1', v1Routes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
