const httpStatus = require('http-status');
const catchAsync = require('../../../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../../../services');
const ApiError = require('../../../utils/ApiError');
const setAccessTokenCookie = require('../../../utils/cookieUtil');

const register = catchAsync(async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(httpStatus.CREATED).send({ user });
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `User registration aborted. ${err.message}`);
  }
});

const login = catchAsync(async (req, res) => {
  const { phone, password } = req.body;
  const user = await authService.loginUserWithPhoneAndPassword(phone, password);
  const tokens = await tokenService.generateAuthTokens(user);
  setAccessTokenCookie(res, tokens.access.token, tokens.access.expires);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.params.token);
  res.status(httpStatus.NO_CONTENT).send();
});

const validator = catchAsync(async (req, res) => {
  const userPerson = await req.user;
  res.send({ user: userPerson });
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  validator,
};
