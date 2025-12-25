const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth');
const orderValidation = require('../../../validations/order.validation');
const { orderController } = require('../../../controllers');

const router = express.Router();

/**
 * @route   POST /v1/orders/place
 * @desc    Place a new order
 * @access  Private
 */
router.post('/place', auth('user', 'admin', 'superadmin'), validate(orderValidation.placeOrder), orderController.placeOrder);

/**
 * @route   POST /v1/orders/:orderId/cancel
 * @desc    Cancel an order
 * @access  Private
 */
router.post('/:orderId/cancel', auth('user', 'admin', 'superadmin'), validate(orderValidation.cancelOrder), orderController.cancelOrder);

/**
 * @route   GET /v1/orders/pending
 * @desc    Get all pending orders
 * @access  Private
 */
router.get('/pending', auth('user', 'admin', 'superadmin'), orderController.getPendingOrders);

/**
 * @route   GET /v1/orders/history
 * @desc    Get order history
 * @access  Private
 */
router.get('/history', auth('user', 'admin', 'superadmin'), validate(orderValidation.getOrders), orderController.getOrderHistory);

/**
 * @route   GET /v1/orders
 * @desc    Get all orders
 * @access  Private
 */
router.get('/', auth('user', 'admin', 'superadmin'), validate(orderValidation.getOrders), orderController.getOrders);

/**
 * @route   GET /v1/orders/:orderId
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:orderId', auth('user', 'admin', 'superadmin'), validate(orderValidation.getOrderById), orderController.getOrderById);

/**
 * @route   POST /v1/orders/:orderId/execute
 * @desc    Execute order manually (for testing/admin)
 * @access  Private
 */
router.post('/:orderId/execute', auth('user', 'admin', 'superadmin'), validate(orderValidation.executeOrder), orderController.executeOrder);

module.exports = router;
