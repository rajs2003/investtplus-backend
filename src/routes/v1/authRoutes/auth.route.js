const express = require('express');
const validate = require('../../../middlewares/validate');
const { authValidation } = require('../../../validations');
const authController = require('../../../controllers/v1/authController/auth.controller');
const auth = require('../../../middlewares/auth');

const router = express.Router();

router.post('/register', validate(authValidation.register), authController.register); // Admin can register users
router.post('/login', validate(authValidation.login), authController.login); // Users can log in
router.post('/logout', validate(authValidation.logout), authController.logout); // Users can log out
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens); // Refresh user tokens
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword); // Initiate password reset
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword); // Reset user password
router.post(
  '/send-verification-email',
  auth(),
  validate(authValidation.sendVerificationEmail),
  authController.sendVerificationEmail,
); // Send email verification
router.post('/verify-email/:token', auth(), validate(authValidation.verifyEmail), authController.verifyEmail); // Verify user email
router.get('/verify-role', auth(), authController.validator); // Verify user role
module.exports = router;
