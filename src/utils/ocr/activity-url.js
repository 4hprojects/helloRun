'use strict';

/**
 * Optional activity URL parsing (docs/improvement-plan/ocr-platform-aware, Phase 2).
 *
 * Pure string handling: this module never resolves DNS, opens a socket or follows a
 * redirect, so a submitted URL cannot be used for SSRF (doc 05 "Optional URL"). Only exact
 * HTTPS hosts and routes of supported providers are accepted. Everything except the
 * activity identifier is discarded, and the stored URL is rebuilt from the identifier, so
 * tracking tokens and lookalike paths never reach a reviewer's browser.
 *
 * A valid link is optional corroboration. It does not prove the activity is the runner's
 * or that it happened as shown.
 */

const MAX_URL_LENGTH = 500;

const PROVIDERS = Object.freeze([
  {
    provider: 'strava',
    label: 'Strava',
    hosts: ['www.strava.com', 'strava.com'],
    patternStatus: 'verified-format',
    match(url) {
      const m = url.pathname.match(/^\/activities\/(\d{1,20})\/?(?:overview|analysis|segments)?\/?$/);
      return m ? m[1] : null;
    },
    build: (id) => `https://www.strava.com/activities/${id}`
  },
  {
    provider: 'garmin',
    label: 'Garmin Connect',
    hosts: ['connect.garmin.com'],
    patternStatus: 'verified-format',
    match(url) {
      const m = url.pathname.match(/^\/(?:modern|app)\/activity\/(\d{1,20})\/?$/);
      return m ? m[1] : null;
    },
    build: (id) => `https://connect.garmin.com/modern/activity/${id}`
  },
  {
    // COROS share links have not been confirmed against real examples in this repository.
    // Only the host is trusted; the identifier is taken from `labelId` when present.
    provider: 'coros',
    label: 'COROS',
    hosts: ['t.coros.com', 'training.coros.com'],
    patternStatus: 'unverified-format',
    match(url) {
      const labelId = url.searchParams.get('labelId') || '';
      return /^[A-Za-z0-9_-]{6,64}$/.test(labelId) ? labelId : null;
    },
    build: (id) => `https://t.coros.com/admin/views/activity?labelId=${encodeURIComponent(id)}`
  }
]);

// Recognised but refused: following them would need a server-side redirect fetch.
const SHORTLINK_HOSTS = new Set(['strava.app.link', 'gar.mn', 'bit.ly', 'tinyurl.com', 't.co', 'goo.gl']);

const ERROR_MESSAGES = Object.freeze({
  too_long: 'That link is too long.',
  invalid_url: 'Enter a full link starting with https://.',
  unsupported_scheme: 'Only https:// links are accepted.',
  credentials_in_url: 'Links with a username or password are not accepted.',
  unsupported_port: 'Links with a custom port are not accepted.',
  unsupported_shortlink: 'Short links cannot be checked. Open it and paste the full activity link instead.',
  unsupported_provider: 'Only Strava, Garmin Connect and COROS activity links are supported. Leave the field empty otherwise.',
  missing_activity_id: 'This does not look like a link to a single activity.'
});

function failure(errorCode) {
  return { ok: false, errorCode, message: ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.invalid_url };
}

/**
 * @returns {{ ok: true, provided: boolean, provider?, providerLabel?, providerActivityId?, normalizedUrl?, patternStatus? }
 *          | { ok: false, errorCode, message }}
 */
function parseActivityUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { ok: true, provided: false };
  if (raw.length > MAX_URL_LENGTH) return failure('too_long');
  // Reject control characters and whitespace inside the value outright.
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return failure('invalid_url');

  let url;
  try {
    url = new URL(raw);
  } catch (_) {
    return failure('invalid_url');
  }
  if (url.protocol !== 'https:') return failure('unsupported_scheme');
  if (url.username || url.password) return failure('credentials_in_url');
  if (url.port && url.port !== '443') return failure('unsupported_port');

  // WHATWG URL already lower-cases and punycode-encodes the host, so a Unicode lookalike
  // (e.g. "strаva.com" with a Cyrillic а) arrives as xn--… and fails the exact match below.
  const host = url.hostname.replace(/\.$/, '');
  if (SHORTLINK_HOSTS.has(host)) return failure('unsupported_shortlink');
  const provider = PROVIDERS.find((candidate) => candidate.hosts.includes(host));
  if (!provider) return failure('unsupported_provider');
  const activityId = provider.match(url);
  if (!activityId) return failure('missing_activity_id');

  return {
    ok: true,
    provided: true,
    provider: provider.provider,
    providerLabel: provider.label,
    providerActivityId: activityId,
    normalizedUrl: provider.build(activityId),
    patternStatus: provider.patternStatus
  };
}

function listSupportedProviders() {
  return PROVIDERS.map(({ provider, label, hosts, patternStatus }) => ({ provider, label, hosts: hosts.slice(), patternStatus }));
}

module.exports = {
  MAX_URL_LENGTH,
  ERROR_MESSAGES,
  parseActivityUrl,
  listSupportedProviders
};
