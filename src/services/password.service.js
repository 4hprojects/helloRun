const bcrypt = require('bcryptjs');
const crypto = require('crypto');

exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

exports.comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

exports.validatePassword = (password) => {
  if (typeof password !== 'string') return false;
  const checks = exports.getPasswordStrength(password);
  return checks.minLength && checks.hasUppercase && checks.hasLowercase && checks.hasNumber;
};

exports.getPasswordStrength = (password) => {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password)
  };
  return checks;
};

// Password-reset token lifetime in ms. PASSWORD_RESET_EXPIRY must be a positive
// number of milliseconds; anything else (unset, non-numeric) falls back to 1 hour —
// a NaN here would produce an Invalid Date expiry and silently break every reset link.
const DEFAULT_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
exports.getResetTokenTtlMs = () => {
  const ttl = Number(process.env.PASSWORD_RESET_EXPIRY);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_RESET_TOKEN_TTL_MS;
};

// Generate secure password reset token
exports.generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash reset token for storage
exports.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
