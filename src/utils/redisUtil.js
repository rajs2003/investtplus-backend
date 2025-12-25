const crypto = require('crypto');

// Generate a unique key for Redis based on phone number
function generateTempUserKey(data) {
  return `user:${crypto.createHash('sha256').update(data).digest('hex')}`;
}

module.exports = {
  generateTempUserKey,
};
