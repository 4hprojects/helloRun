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

/**
 * Generate email verification token and expiry
 * @returns {Object} - { token, expires }
 */
exports.generateEmailVerificationToken = () => {
  const token = this.generateToken();
  const expires = new Date(Date.now() + parseInt(process.env.EMAIL_VERIFICATION_EXPIRY));
  
  return { token, expires };
};

/**
 * Generate password reset token and expiry
 * @returns {Object} - { token, expires }
 */
exports.generatePasswordResetToken = () => {
  const token = this.generateToken();
  const expires = new Date(Date.now() + parseInt(process.env.PASSWORD_RESET_EXPIRY));
  
  return { token, expires };
};

/**
 * Check if token is expired
 * @param {Date} expiryDate - Token expiry date
 * @returns {Boolean} - True if expired
 */
exports.isTokenExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};