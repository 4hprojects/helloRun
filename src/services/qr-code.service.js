// src/services/qr-code.service.js
// QR code generation for bib scanning

const QRCode = require('qrcode');
const { encryptForPurpose, decryptForPurpose } = require('./token-encryption.service');

// Bump the purpose when the payload shape changes; old tokens stop verifying.
const QR_TOKEN_PURPOSE = 'hellorun.qr.bib.v1';
const QR_TOKEN_PREFIX = 'HRQ1:';

/**
 * A dedicated secret is preferred, but SESSION_SECRET is a required variable so the
 * token always has key material. It is never used raw — deriveKeyForPurpose hashes it
 * with a purpose label, so this key is unrelated to the session key.
 */
function getQrSecret() {
  return process.env.QR_TOKEN_SECRET || process.env.SESSION_SECRET || '';
}

/**
 * Build the opaque payload a bib QR actually carries.
 *
 * The previous format was `EVENT:{mongoId}|BIB:{n}|TIME:{ts}` — plaintext, so anyone who
 * photographed a bib learned a live database id, and nothing stopped them editing it.
 * This is encrypted and authenticated, so it reveals nothing and cannot be altered.
 */
function createBibToken(eventId, bibNumber, tokenId = '') {
  const payload = JSON.stringify({
    e: String(eventId),
    b: String(bibNumber),
    t: Math.floor(Date.now() / 1000),
    // Identity of the revocable token, when one has been issued. Absent for codes
    // minted before revocation existed, which still decode and are reported as such.
    ...(tokenId ? { j: String(tokenId) } : {})
  });
  return QR_TOKEN_PREFIX + encryptForPurpose(payload, {
    secret: getQrSecret(),
    purpose: QR_TOKEN_PURPOSE
  });
}

/**
 * Read a token minted by createBibToken. Returns the same shape as decodeQRData so
 * callers can treat both formats alike.
 */
function readBibToken(token) {
  const raw = String(token || '').trim();
  if (!raw.startsWith(QR_TOKEN_PREFIX)) {
    return { success: false, error: 'Not a HelloRun bib token' };
  }

  try {
    const decrypted = decryptForPurpose(raw.slice(QR_TOKEN_PREFIX.length), {
      secret: getQrSecret(),
      purpose: QR_TOKEN_PURPOSE
    });
    const parsed = JSON.parse(decrypted);
    if (!parsed.e || !parsed.b) {
      return { success: false, error: 'Bib token is missing its event or bib' };
    }
    return {
      success: true,
      eventId: String(parsed.e),
      bibNumber: String(parsed.b),
      timestamp: Number.parseInt(parsed.t, 10) || 0,
      tokenId: parsed.j ? String(parsed.j) : '',
      format: 'token'
    };
  } catch (_error) {
    // Any tampering fails the GCM auth tag and lands here.
    return { success: false, error: 'Bib token is invalid or was not issued by this site' };
  }
}

/**
 * Resolve a scanned string in either format.
 *
 * Codes printed before the token format existed are still in circulation, so the legacy
 * plaintext payload is accepted and reported as such. Callers that care can refuse it.
 */
function resolveScannedQr(scanned) {
  const asToken = readBibToken(scanned);
  if (asToken.success) return asToken;

  const asLegacy = decodeQRData(scanned);
  if (asLegacy.success) return { ...asLegacy, format: 'legacy' };

  return { success: false, error: asLegacy.error || asToken.error };
}

/**
 * Generate QR code for bib scanning.
 * Carries an opaque encrypted token — see createBibToken.
 */
async function generateBibQRCode(eventId, bibNumber, options = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const qrData = createBibToken(eventId, bibNumber, options.tokenId);

  try {
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: options.width || 300,
      margin: options.margin || 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return {
      success: true,
      data_url: qrDataUrl,
      encoded_data: qrData,
      format: 'data:image/png;base64',
      timestamp
    };
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Decode the legacy plaintext QR payload.
 * Retained only for codes printed before the token format; prefer resolveScannedQr.
 */
function decodeQRData(qrData) {
  if (typeof qrData !== 'string' || qrData.trim() === '') {
    return { success: false, error: 'Invalid QR data format: empty payload' };
  }

  const decoded = {};
  for (const part of qrData.split('|')) {
    // Split on the first colon only, so a value containing one is preserved.
    const separatorIndex = part.indexOf(':');
    if (separatorIndex === -1) continue;
    decoded[part.slice(0, separatorIndex)] = part.slice(separatorIndex + 1);
  }

  // Every field must be present. Without this the function reported success for any
  // input that merely failed to throw, handing callers undefined ids and a NaN time.
  const timestamp = Number.parseInt(decoded.TIME, 10);
  if (!decoded.EVENT || !decoded.BIB || !Number.isFinite(timestamp)) {
    return { success: false, error: 'Invalid QR data format: expected EVENT, BIB and TIME' };
  }

  return {
    success: true,
    eventId: decoded.EVENT,
    bibNumber: decoded.BIB,
    timestamp,
    raw: decoded
  };
}

/**
 * Generate batch QR codes for all bibs in event
 */
async function generateBatchQRCodes(eventId, bibAssignments) {
  const results = [];

  for (const assignment of bibAssignments) {
    try {
      const qr = await generateBibQRCode(eventId, assignment.bib_number);
      results.push({
        bib_number: assignment.bib_number,
        success: true,
        qr_data_url: qr.data_url
      });
    } catch (error) {
      results.push({
        bib_number: assignment.bib_number,
        success: false,
        error: error.message
      });
    }
  }

  return {
    total: bibAssignments.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}

module.exports = {
  createBibToken,
  readBibToken,
  resolveScannedQr,
  generateBibQRCode,
  decodeQRData,
  generateBatchQRCodes
};
