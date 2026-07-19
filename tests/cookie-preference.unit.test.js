'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  COOKIE_NAME,
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
    essential: true, functional: false, analytics: false, advertising: false,
    schemaVersion: SCHEMA_VERSION, savedAt: null, hasChoice: false
  });
  const custom = normalizePreferences({ functional: 'on', analytics: '', advertising: '1' }, { now });
  assert.equal(custom.functional, true);
  assert.equal(custom.analytics, false);
  assert.equal(custom.advertising, true);
  assert.equal(custom.essential, true);
  assert.equal(custom.savedAt, now.toISOString());
  assert.equal(normalizePreferences({ action: 'accept_all' }, { now }).analytics, true);
  assert.equal(normalizePreferences({ action: 'reject_optional' }, { now }).functional, false);
});

test('signed browser choices round-trip and malformed or expired values fail closed', () => {
  const value = serializePreferences(normalizePreferences({ functional: 1, advertising: 1 }, { now }), secret);
  const parsed = readPreferences(`${COOKIE_NAME}=${encodeURIComponent(value)}; other=value`, secret, { now: new Date(now.getTime() + 1000) });
  assert.equal(parsed.hasChoice, true);
  assert.equal(parsed.functional, true);
  assert.equal(parsed.analytics, false);
  assert.equal(parsed.advertising, true);

  assert.equal(readPreferences(`${COOKIE_NAME}=${value}x`, secret, { now }).hasChoice, false);
  assert.equal(readPreferences(`${COOKIE_NAME}=${value}`, 'wrong-secret', { now }).hasChoice, false);
  assert.equal(readPreferences(`${COOKIE_NAME}=${value}`, secret, { now: new Date(now.getTime() + MAX_AGE_MS + 1) }).hasChoice, false);
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
