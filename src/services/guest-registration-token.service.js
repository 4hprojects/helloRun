// src/services/guest-registration-token.service.js
// Issuing and checking the links a guest uses to reach their own registration.
//
// A guest has no account, so the link is the credential. That makes three things
// non-negotiable: only the hash is stored, the raw token is returned exactly once, and
// the registration reference — which is printed and spoken aloud — never grants access.

const crypto = require('node:crypto');
const mongoose = require('mongoose');
const GuestRegistrationToken = require('../models/GuestRegistrationToken');
const { generateToken, hashToken } = require('./token.service');
const logger = require('../utils/logger');

// A claim link converts a guest registration into an account's, so it is short-lived.
const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Mint a link for a registration.
 *
 * @returns {Promise<{token: string, expiresAt: Date|null}>} the raw token, returned once
 */
async function issueToken(registrationId, eventId, purpose = 'manage') {
  const token = generateToken(32);
  const expiresAt = purpose === 'claim' ? new Date(Date.now() + CLAIM_TOKEN_TTL_MS) : null;

  await GuestRegistrationToken.create({
    registrationId,
    eventId,
    tokenHash: hashToken(token),
    purpose,
    expiresAt
  });

  return { token, expiresAt };
}

/**
 * Resolve a raw token to its registration, or explain why not.
 *
 * Returns a reason rather than throwing so callers can distinguish "expired, ask for a
 * new link" from "never existed", without leaking which is which to the visitor.
 */
async function resolveToken(rawToken, purpose = 'manage') {
  const token = String(rawToken || '').trim();
  if (!token) return { ok: false, reason: 'missing' };

  // Length-checked before hashing so a malformed value is cheap to reject.
  if (!/^[a-f0-9]{64}$/i.test(token)) return { ok: false, reason: 'malformed' };

  const record = await GuestRegistrationToken.findOne({
    tokenHash: hashToken(token),
    purpose
  }).lean();

  if (!record) return { ok: false, reason: 'unknown' };
  if (record.revokedAt) return { ok: false, reason: 'revoked' };
  if (record.usedAt && purpose === 'claim') return { ok: false, reason: 'used' };
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, registrationId: record.registrationId, eventId: record.eventId, record };
}

async function touchLastUsed(tokenId) {
  try {
    await GuestRegistrationToken.updateOne({ _id: tokenId }, { $set: { lastUsedAt: new Date() } });
  } catch (error) {
    // Access bookkeeping must never block the page it is recording.
    logger.error(`[GuestToken] Could not record use: ${error.message}`);
  }
}

/**
 * Withdraw every live link for a registration — on cancellation, or once a guest
 * registration has been claimed and the account owns it instead.
 */
async function revokeTokensForRegistration(registrationId, purpose = null) {
  if (!mongoose.Types.ObjectId.isValid(String(registrationId || ''))) return 0;
  const filter = { registrationId, revokedAt: null };
  if (purpose) filter.purpose = purpose;

  try {
    const result = await GuestRegistrationToken.updateMany(filter, {
      $set: { revokedAt: new Date() }
    });
    return result.modifiedCount || 0;
  } catch (error) {
    logger.error(`[GuestToken] Could not revoke tokens for ${registrationId}: ${error.message}`);
    return 0;
  }
}

/**
 * Compare a reference code without leaking how much of it matched.
 */
function referenceMatches(expected, provided) {
  const a = Buffer.from(String(expected || '').trim().toUpperCase());
  const b = Buffer.from(String(provided || '').trim().toUpperCase());
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  issueToken,
  resolveToken,
  touchLastUsed,
  revokeTokensForRegistration,
  referenceMatches,
  CLAIM_TOKEN_TTL_MS
};
