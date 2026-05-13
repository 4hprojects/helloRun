const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function getEncryptionKey() {
  const raw = String(process.env.STRAVA_ENCRYPTION_KEY || '').trim();
  if (!raw) {
    throw new Error('STRAVA_ENCRYPTION_KEY is not configured.');
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  try {
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 32) return decoded;
  } catch (_error) {
    // Fall through to hash-based derivation for passphrase-style local keys.
  }

  return crypto.createHash('sha256').update(raw).digest();
}

function encryptToken(value) {
  const plain = String(value || '');
  if (!plain) {
    throw new Error('Token value is required.');
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join('.');
}

function decryptToken(value) {
  const raw = String(value || '').trim();
  const [version, ivPart, tagPart, encryptedPart] = raw.split('.');
  if (version !== 'v1' || !ivPart || !tagPart || !encryptedPart) {
    throw new Error('Encrypted token format is invalid.');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivPart, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  encryptToken,
  decryptToken
};
