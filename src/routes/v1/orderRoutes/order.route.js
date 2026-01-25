const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth');
const orderValidation = require('../../../validations/order.validation');
const { orderController } = require('../../../controllers');

const router = express.Router();

router.get('/', auth('user'), validate(orderValidation.getOrders), orderController.getOrders);

router.post('/place', auth('user'), validate(orderValidation.placeOrder), orderController.placeOrder);

router.post('/buy', auth('user'), orderController.buyStock);

router.get('/pending', auth('user'), orderController.getPendingOrders);

router.get('/history', auth('user'), validate(orderValidation.getOrders), orderController.getOrderHistory);

router.get('/:orderId', auth('user'), validate(orderValidation.getOrderById), orderController.getOrderById);

router.post('/:orderId/cancel', auth('user'), validate(orderValidation.cancelOrder), orderController.cancelOrder);

router.post('/:orderId/execute', auth('user'), validate(orderValidation.executeOrder), orderController.executeOrder);

module.exports = router;
