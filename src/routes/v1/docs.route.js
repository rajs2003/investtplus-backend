const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('../../docs/swaggerDef');

const router = express.Router();

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: [
    'src/docs/*.yml',
    'src/routes/v1/authRoutes/*.js',
    'src/routes/v1/userRoutes/*.js',
    'src/routes/v1/stockRoutes/*.js',
    'src/routes/v1/marketRoutes/*.js',
    'src/routes/v1/websocketRoutes/*.js',
  ],
});

router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(specs, {
    explorer: true,
  }),
);

module.exports = router;
