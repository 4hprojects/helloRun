'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'hr.cookie_preferences';
const SCHEMA_VERSION = 1;
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const OPTIONAL_CATEGORIES = Object.freeze(['functional', 'analytics', 'advertising']);

function defaultPreferences() {
  return {
    essential: true,
    functional: false,
    analytics: false,
    advertising: false,
    schemaVersion: SCHEMA_VERSION,
    savedAt: null,
    hasChoice: false
  };
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on' || value === 'yes';
}

function normalizePreferences(input = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const preset = String(input.action || input.preset || '').trim().toLowerCase();
  const allEnabled = preset === 'accept_all';
  const allDisabled = preset === 'reject_optional';
  const normalized = defaultPreferences();

  OPTIONAL_CATEGORIES.forEach((category) => {
    normalized[category] = allEnabled ? true : allDisabled ? false : normalizeBoolean(input[category]);
  });
  normalized.savedAt = now.toISOString();
  normalized.hasChoice = true;
  return normalized;
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', String(secret || '')).update(payload).digest('base64url');
}

function serializePreferences(preferences, secret) {
  if (!secret) throw new Error('A cookie preference signing secret is required.');
  const normalized = normalizePreferences(preferences, { now: preferences?.savedAt || new Date() });
  const payload = Buffer.from(JSON.stringify({
    v: SCHEMA_VERSION,
    f: normalized.functional ? 1 : 0,
    a: normalized.analytics ? 1 : 0,
    d: normalized.advertising ? 1 : 0,
    t: normalized.savedAt
  })).toString('base64url');
  return `${payload}.${signPayload(payload, secret)}`;
}

function parseCookieHeader(header = '') {
  return String(header || '').split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    if (!key) return cookies;
    const value = part.slice(separator + 1).trim();
    try { cookies[key] = decodeURIComponent(value); } catch (_error) { cookies[key] = value; }
    return cookies;
  }, {});
}

function readPreferences(cookieHeader, secret, options = {}) {
  const fallback = defaultPreferences();
  if (!secret) return fallback;
  const value = parseCookieHeader(cookieHeader)[COOKIE_NAME];
  if (!value) return fallback;
  const [payload, signature, extra] = String(value).split('.');
  if (!payload || !signature || extra) return fallback;
  const expected = signPayload(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fallback;

  try {
    const stored = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Number(stored.v) !== SCHEMA_VERSION) return fallback;
    const savedAt = new Date(stored.t);
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    if (Number.isNaN(savedAt.getTime()) || savedAt > now || now - savedAt > MAX_AGE_MS) return fallback;
    return {
      essential: true,
      functional: stored.f === 1,
      analytics: stored.a === 1,
      advertising: stored.d === 1,
      schemaVersion: SCHEMA_VERSION,
      savedAt: savedAt.toISOString(),
      hasChoice: true
    };
  } catch (_error) {
    return fallback;
  }
}

function cookieOptions(isProduction) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(isProduction),
    path: '/',
    maxAge: MAX_AGE_MS
  };
}

module.exports = {
  COOKIE_NAME,
  MAX_AGE_MS,
  OPTIONAL_CATEGORIES,
  SCHEMA_VERSION,
  cookieOptions,
  defaultPreferences,
  normalizePreferences,
  parseCookieHeader,
  readPreferences,
  serializePreferences
};
