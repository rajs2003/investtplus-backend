const Joi = require('joi');
const { password } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    role: Joi.string().required(),
    ldap: Joi.string().required().alphanum(),
    phoneNumber: Joi.string()
      .required()
      .pattern(/^[0-9]{10}$/),
  }),
};

const login = {
  body: Joi.object().keys({
    phone: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

const verifyEmail = {
  params: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const verifyOtp = {
  body: Joi.object().keys({
    otp: Joi.string().required(),
    phoneNumber: Joi.string()
      .required()
      .pattern(/^[0-9]{10}$/),
  }),
};
const hospitalOtp = {
  body: Joi.object().keys({
    otp: Joi.string().required(),
    phoneNumber: Joi.string()
      .required()
      .pattern(/^[0-9]{10}$/),
    posContact: Joi.string()
      .required()
      .pattern(/^[0-9]{10}$/),
  }),
};
const operatorOtp = {
  body: Joi.object().keys({
    otp: Joi.string().required(),
    phoneNumber: Joi.string()
      .required()
      .pattern(/^[0-9]{10}$/),
    alternateContact: Joi.string()
      .required()
      .pattern(/^[0-9]{10}$/),
  }),
};
const patientOtp = {
  body: Joi.object().keys({
    otp: Joi.string().required(),
    phoneNumber: Joi.string()
      .required()
      .pattern(/^[0-9]{10}$/),
    alternateContact: Joi.string()
      .required()
      .pattern(/^[0-9]{10}$/),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyOtp,
  hospitalOtp,
  operatorOtp,
  patientOtp,
};
