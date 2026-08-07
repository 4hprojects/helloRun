// src/services/bib-qr-token.service.js
// The revocable layer over bib QR codes.
//
// qr-code.service.js handles encoding: it can prove a scanned code came from us and has
// not been altered. What it cannot do is withdraw one, because a purely stateless token
// is valid for as long as the key is. Cancelling a registration or reissuing a bib has to
// make the old code stop working, so identity lives here.

const crypto = require('node:crypto');
const mongoose = require('mongoose');
const BibQrToken = require('../models/BibQrToken');
const { generateBibQRCode, resolveScannedQr } = require('./qr-code.service');
const logger = require('../utils/logger');

/**
 * The live token identity for a bib, creating one if this is the first time.
 *
 * Stable on purpose. The race pass regenerates its image on every page load, so minting
 * a fresh identity per view would kill a runner's screenshot the moment they reopened the
 * page. The rendered image still differs each time — the encryption uses a random IV —
 * but it resolves to the same identity.
 */
async function getOrCreateLiveToken(eventId, bibNumber, registrationId = null) {
  const bib = String(bibNumber || '').trim();
  if (!bib) throw new Error('A bib number is required to issue a QR token.');

  const existing = await BibQrToken.findOne({ eventId, bibNumber: bib, revokedAt: null })
    .select('tokenId')
    .lean();
  if (existing) return existing.tokenId;

  const tokenId = crypto.randomBytes(16).toString('base64url');
  try {
    await BibQrToken.create({ eventId, bibNumber: bib, registrationId, tokenId });
    return tokenId;
  } catch (error) {
    // Two concurrent first renders race on the partial unique index; whoever lost simply
    // adopts the winner's identity rather than failing the page.
    if (error?.code === 11000) {
      const winner = await BibQrToken.findOne({ eventId, bibNumber: bib, revokedAt: null })
        .select('tokenId')
        .lean();
      if (winner) return winner.tokenId;
    }
    throw error;
  }
}

/**
 * Render the QR for a bib, issuing its identity if needed.
 */
async function renderBibQrCode(eventId, bibNumber, registrationId = null, options = {}) {
  const tokenId = await getOrCreateLiveToken(eventId, bibNumber, registrationId);
  return generateBibQRCode(eventId, bibNumber, { ...options, tokenId });
}

/**
 * Resolve a scanned code, taking revocation into account.
 *
 * Outcomes mirror what staff need to be told apart:
 *   invalid   — not ours, or altered
 *   revoked   — was ours, has been withdrawn
 *   unknown   — carries an identity we have no record of
 *   ok        — usable; `legacy` marks a code minted before revocation existed
 */
async function verifyScannedBibCode(eventId, scanned) {
  const resolved = resolveScannedQr(scanned);
  if (!resolved.success) {
    return { outcome: 'invalid', error: resolved.error };
  }

  if (String(resolved.eventId) !== String(eventId)) {
    return { outcome: 'wrong_event', bibNumber: resolved.bibNumber };
  }

  // Codes printed before revocation existed carry no identity. Refusing them would
  // invalidate everything already in circulation, so they are accepted and flagged.
  if (!resolved.tokenId) {
    return {
      outcome: 'ok',
      bibNumber: resolved.bibNumber,
      format: resolved.format,
      legacy: true
    };
  }

  const record = await BibQrToken.findOne({ tokenId: resolved.tokenId })
    .select('revokedAt revokedReason bibNumber eventId')
    .lean();

  if (!record) {
    // A well-formed identity we never issued. Only reachable with the key, but treat it
    // as untrusted rather than assuming it is fine.
    return { outcome: 'unknown', bibNumber: resolved.bibNumber };
  }
  if (record.revokedAt) {
    return {
      outcome: 'revoked',
      bibNumber: resolved.bibNumber,
      reason: record.revokedReason || ''
    };
  }

  return {
    outcome: 'ok',
    bibNumber: resolved.bibNumber,
    format: resolved.format,
    legacy: false
  };
}

async function revokeTokens(filter, reason) {
  const result = await BibQrToken.updateMany(
    { ...filter, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: String(reason || '').slice(0, 200) } }
  );
  return result.modifiedCount || 0;
}

/**
 * Withdraw every live code for a registration. Used when a registration is cancelled.
 * Best effort: losing a revocation must not fail the cancellation that triggered it,
 * but it is logged loudly because a live code for a cancelled runner is a real problem.
 */
async function revokeTokensForRegistration(registrationId, reason = 'Registration cancelled') {
  if (!mongoose.Types.ObjectId.isValid(String(registrationId || ''))) return 0;
  try {
    return await revokeTokens({ registrationId }, reason);
  } catch (error) {
    logger.error(`[QR] Could not revoke tokens for registration ${registrationId}: ${error.message}`);
    return 0;
  }
}

/**
 * Withdraw the live code for a bib. Used when a bib is reassigned or voided, so the
 * previous holder's printed code stops working.
 */
async function revokeTokensForBib(eventId, bibNumber, reason = 'Bib reissued') {
  const bib = String(bibNumber || '').trim();
  if (!bib) return 0;
  try {
    return await revokeTokens({ eventId, bibNumber: bib }, reason);
  } catch (error) {
    logger.error(`[QR] Could not revoke tokens for bib ${bib}: ${error.message}`);
    return 0;
  }
}

module.exports = {
  getOrCreateLiveToken,
  renderBibQrCode,
  verifyScannedBibCode,
  revokeTokensForRegistration,
  revokeTokensForBib
};
