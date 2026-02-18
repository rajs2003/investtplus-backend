const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const { positionValidation } = require('../../../validations');
const { positionController } = require('../../../controllers');

const router = express.Router();

router.get('/', auth('user'), validate(positionValidation.getPositions), positionController.getPositions);

router.get('/intraday', auth('user'), validate(positionValidation.getPositions), positionController.getIntradayPositions);

router.get('/delivery', auth('user'), validate(positionValidation.getPositions), positionController.getDeliveryPositions);

router.get('/summary', auth('user'), validate(positionValidation.getPositionSummary), positionController.getPositionSummary);

router.get('/history', auth('user'), validate(positionValidation.getPositionHistory), positionController.getPositionHistory);

router.get('/:positionId', auth('user'), validate(positionValidation.getPositionById), positionController.getPositionById);

router.post(
  '/:positionId/square-off',
  auth('user'),
  validate(positionValidation.squareOffPosition),
  positionController.squareOffPosition,
);

module.exports = router;
