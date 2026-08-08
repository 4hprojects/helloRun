const crypto = require('crypto');

/**
 * Generate a secure random token
 * @param {Number} length - Token length (default 32 bytes = 64 hex chars)
 * @returns {String} - Random token
 */
exports.generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token for storage (optional security layer)
 * @param {String} token - Plain token
 * @returns {String} - Hashed token
 */
exports.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};