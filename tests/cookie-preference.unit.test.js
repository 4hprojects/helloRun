'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  COOKIE_NAME,
  LEGACY_SCHEMA_VERSION,
  MAX_AGE_MS,
  SCHEMA_VERSION,
  cookieOptions,
  defaultPreferences,
  normalizePreferences,
  readPreferences,
  serializePreferences
} = require('../src/services/cookie-preference.service');

const secret = 'test-cookie-preference-secret';
const now = new Date('2026-07-19T12:00:00Z');

test('optional categories default off and normalize independently', () => {
  assert.deepEqual(defaultPreferences(), {
    essential: true, functional: false, analytics: false,
    schemaVersion: SCHEMA_VERSION, savedAt: null, hasChoice: false
  });
  const custom = normalizePreferences({ functional: 'on', analytics: '', advertising: '1' }, { now });
  assert.equal(custom.functional, true);
  assert.equal(custom.analytics, false);
  assert.equal(Object.hasOwn(custom, 'advertising'), false);
  assert.equal(custom.essential, true);
  assert.equal(custom.savedAt, now.toISOString());
  const accepted = normalizePreferences({ action: 'accept_all' }, { now });
  assert.equal(accepted.functional, true);
  assert.equal(accepted.analytics, true);
  const rejected = normalizePreferences({ action: 'reject_optional' }, { now });
  assert.equal(rejected.functional, false);
  assert.equal(rejected.analytics, false);
});

test('signed browser choices round-trip and malformed or expired values fail closed', () => {
  const value = serializePreferences(normalizePreferences({ functional: 1 }, { now }), secret);
  const parsed = readPreferences(`${COOKIE_NAME}=${encodeURIComponent(value)}; other=value`, secret, { now: new Date(now.getTime() + 1000) });
  assert.equal(parsed.hasChoice, true);
  assert.equal(parsed.functional, true);
  assert.equal(parsed.analytics, false);
  assert.equal(parsed.schemaVersion, SCHEMA_VERSION);
  assert.equal(Object.hasOwn(parsed, 'advertising'), false);

  assert.equal(readPreferences(`${COOKIE_NAME}=${value}x`, secret, { now }).hasChoice, false);
  assert.equal(readPreferences(`${COOKIE_NAME}=${value}`, 'wrong-secret', { now }).hasChoice, false);
  assert.equal(readPreferences(`${COOKIE_NAME}=${value}`, secret, { now: new Date(now.getTime() + MAX_AGE_MS + 1) }).hasChoice, false);
});

test('legacy schema cookies remain readable but their advertising bit is ignored', () => {
  const payload = Buffer.from(JSON.stringify({
    v: LEGACY_SCHEMA_VERSION,
    f: 1,
    a: 0,
    d: 1,
    t: now.toISOString()
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const parsed = readPreferences(`${COOKIE_NAME}=${payload}.${signature}`, secret, { now });

  assert.equal(parsed.hasChoice, true);
  assert.equal(parsed.functional, true);
  assert.equal(parsed.analytics, false);
  assert.equal(parsed.schemaVersion, SCHEMA_VERSION);
  assert.equal(Object.hasOwn(parsed, 'advertising'), false);
});

test('preference cookie is browser-wide, HttpOnly, one-year, and secure in production', () => {
  const production = cookieOptions(true);
  assert.equal(production.httpOnly, true);
  assert.equal(production.sameSite, 'lax');
  assert.equal(production.secure, true);
  assert.equal(production.path, '/');
  assert.equal(production.maxAge, MAX_AGE_MS);
  assert.equal(cookieOptions(false).secure, false);
});
