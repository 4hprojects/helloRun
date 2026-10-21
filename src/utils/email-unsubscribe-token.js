const crypto = require('crypto');

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ALLOWED_KEYS = new Set([
  'event.promotion',
  'event.started_reminder',
  'result.submission_reminder'
]);

function getSecret(secret) {
  return String(secret || process.env.SESSION_SECRET || '').trim();
}

function sign(encodedPayload, secret) {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function createEmailUnsubscribeToken({ userId, key, expiresAt, ttlMs = DEFAULT_TTL_MS } = {}, secret) {
  const signingSecret = getSecret(secret);
  const normalizedUserId = String(userId || '').trim();
  const normalizedKey = String(key || '').trim();
  if (!signingSecret || !normalizedUserId || !ALLOWED_KEYS.has(normalizedKey)) return '';

  const expiry = Number(expiresAt || (Date.now() + ttlMs));
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return '';
  const payload = Buffer.from(JSON.stringify({ u: normalizedUserId, k: normalizedKey, e: expiry })).toString('base64url');
  return `${payload}.${sign(payload, signingSecret)}`;
}

function verifyEmailUnsubscribeToken(token, secret, now = Date.now()) {
  const signingSecret = getSecret(secret);
  const [payload, signature, ...extra] = String(token || '').split('.');
  if (!signingSecret || !payload || !signature || extra.length) return null;

  const expected = Buffer.from(sign(payload, signingSecret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const userId = String(decoded.u || '').trim();
    const key = String(decoded.k || '').trim();
    const expiresAt = Number(decoded.e || 0);
    if (!userId || !ALLOWED_KEYS.has(key) || !Number.isFinite(expiresAt) || expiresAt <= Number(now)) return null;
    return { userId, key, expiresAt };
  } catch (_) {
    return null;
  }
}

module.exports = {
  ALLOWED_KEYS,
  DEFAULT_TTL_MS,
  createEmailUnsubscribeToken,
  verifyEmailUnsubscribeToken
};
