'use strict';

// The link a guest uses to reach their own registration.
//
// A guest has no account, so the link is the credential. Only its hash is stored, the raw
// token is returned once, and the registration reference — printed on confirmations and
// read aloud at desks — must never grant access on its own.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  referenceMatches,
  CLAIM_TOKEN_TTL_MS
} = require('../src/services/guest-registration-token.service');
const { hashToken, generateToken } = require('../src/services/token.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/guest-registration-token.service.js');
const model = read('src/models/GuestRegistrationToken.js');

test('only the hash is stored, never the token', () => {
  assert.match(service, /tokenHash: hashToken\(token\)/);
  assert.match(model, /Only its SHA-256 hash is stored/);
  // Storing the raw token would make a database dump directly usable.
  assert.doesNotMatch(model, /token: \{\s*type: String,\s*required: true,\s*unique/);
});

test('a token is unguessable and its hash is stable', () => {
  const a = generateToken(32);
  const b = generateToken(32);
  assert.notEqual(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.equal(hashToken(a), hashToken(a));
  assert.notEqual(hashToken(a), hashToken(b));
});

test('a malformed token is rejected before it is hashed', () => {
  // Cheap rejection, and it keeps junk out of the index lookup.
  assert.match(service, /\^\[a-f0-9\]\{64\}\$/);
  assert.match(service, /reason: 'malformed'/);
});

test('every refusal has a distinguishable reason', () => {
  ['missing', 'malformed', 'unknown', 'revoked', 'used', 'expired'].forEach((reason) => {
    assert.match(service, new RegExp(`reason: '${reason}'`), `${reason} should be a reason`);
  });
});

test('a claim link expires; a manage link does not', () => {
  // A claim link converts a guest registration into an account's, so it is short-lived.
  assert.equal(CLAIM_TOKEN_TTL_MS, 7 * 24 * 60 * 60 * 1000);
  assert.match(service, /purpose === 'claim' \? new Date\(Date\.now\(\) \+ CLAIM_TOKEN_TTL_MS\) : null/);
});

test('two requests racing the same claim link cannot both win', () => {
  // The update is conditional on the token still being unused, so the loser gets nothing.
  assert.match(service, /\{ _id: resolved\.record\._id, usedAt: null \}/);
  assert.match(service, /return \{ ok: false, reason: 'used' \}/);
});

test('the registration reference is compared without leaking how far it matched', () => {
  assert.equal(referenceMatches('HR-ABC123', 'HR-ABC123'), true);
  assert.equal(referenceMatches('HR-ABC123', 'hr-abc123'), true, 'case should not matter');
  assert.equal(referenceMatches('HR-ABC123', 'HR-ABC124'), false);
  // A length mismatch must not throw, which timingSafeEqual does on unequal buffers.
  assert.equal(referenceMatches('HR-ABC123', 'HR-AB'), false);
  assert.equal(referenceMatches('HR-ABC123', ''), false);
  assert.equal(referenceMatches('', 'HR-ABC123'), false);
  assert.match(service, /timingSafeEqual/);
});

test('the reference is documented as not being a credential', () => {
  // It is printed on confirmations and read out at desks.
  assert.match(model, /deliberately NOT the credential/);
});

test('links can be withdrawn for a registration', () => {
  assert.match(service, /revokeTokensForRegistration/);
  assert.match(service, /revokedAt: null/);
  // Bookkeeping must not block the page it records.
  assert.match(service, /must never block the page it is recording/);
});
