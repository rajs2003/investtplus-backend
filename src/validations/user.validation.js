const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    role: Joi.string().required().valid('superadmin', 'admin', 'user'),
    // ldap: Joi.string().required().alphanum(),
    phoneNumber: Joi.string()
      .required()
      .pattern(/^[0-9]{10}$/),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      phoneNumber: Joi.string().pattern(/^[0-9]{10}$/),
      role: Joi.string().valid('superadmin', 'admin', 'user'),
      isEmailVerified: Joi.boolean(),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateCurrentUser = {
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      // password: Joi.string().custom(password),
      name: Joi.string(),
      phoneNumber: Joi.string().pattern(/^[0-9]{10}$/),
    })
    .min(1),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateCurrentUser,
};
