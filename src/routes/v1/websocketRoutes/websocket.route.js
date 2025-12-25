const express = require('express');
const { websocketController } = require('../../../controllers');
const validate = require('../../../middlewares/validate');
const { stockValidation } = require('../../../validations');

const router = express.Router();

router.route('/connect').post(websocketController.connect);

router.route('/disconnect').post(websocketController.disconnect);

router.route('/subscribe').post(validate(stockValidation.wsSubscribe), websocketController.subscribe);

router.route('/unsubscribe').post(validate(stockValidation.wsUnsubscribe), websocketController.unsubscribe);

router.route('/status').get(websocketController.getStatus);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: WebSocket
 *   description: WebSocket connection management
 */

/**
 * @swagger
 * /websocket/connect:
 *   post:
 *     summary: Connect to WebSocket
 *     description: Establishes WebSocket connection for real-time data
 *     tags: [WebSocket]
 *     responses:
 *       "200":
 *         description: OK
 */

/**
 * @swagger
 * /websocket/subscribe:
 *   post:
 *     summary: Subscribe to market data
 *     description: Subscribe to real-time market data for specific tokens
 *     tags: [WebSocket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode:
 *                 type: number
 *                 description: Mode (1=LTP, 2=Quote, 3=Snap Quote)
 *               tokens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     exchangeType:
 *                       type: number
 *                     tokens:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       "200":
 *         description: OK
 */
