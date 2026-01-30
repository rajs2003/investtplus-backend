const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const userValidation = require('../../../validations/user.validation');
const { userController } = require('../../../controllers/');

const router = express.Router();

router
  .use(auth('admin'))
  .route('/')
  .post(validate(userValidation.createUser), userController.createUser)
  .get(validate(userValidation.getUsers), userController.getUsers);

router
  .use(auth('user'))
  .route('/profile')
  .get(userController.getCurrentUser)
  .put(validate(userValidation.updateCurrentUser), userController.updateCurrentUser);

router
  .use(auth('admin'))
  .route('/:userId')
  .get(validate(userValidation.getUser), userController.getUser)
  .patch(validate(userValidation.updateUser), userController.updateUser)
  .delete(validate(userValidation.deleteUser), userController.deleteUser);
module.exports = router;
