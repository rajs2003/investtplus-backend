const config = require('../config/config');
const setAccessTokenCookie = (res, accessToken, expires) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.env === 'production',
    expires: new Date(expires),
  });
};

module.exports = setAccessTokenCookie;
