const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Strava token encryption round trips without storing plaintext', () => {
  process.env.STRAVA_ENCRYPTION_KEY = 'test-strava-encryption-key-for-local-runs';
  const { encryptToken, decryptToken } = require('../src/services/token-encryption.service');

  const encrypted = encryptToken('secret-access-token');

  assert.notEqual(encrypted, 'secret-access-token');
  assert.match(encrypted, /^v1\./);
  assert.equal(decryptToken(encrypted), 'secret-access-token');
});

test('Strava activity normalization exposes only private viewer fields', () => {
  const { normalizeActivitySummary } = require('../src/services/strava.service');

  const normalized = normalizeActivitySummary({
    id: 123,
    name: 'Morning Run',
    type: 'Run',
    sport_type: 'Run',
    distance: 5123.4,
    moving_time: 1500,
    elapsed_time: 1600,
    start_date: '2026-01-05T00:30:00Z',
    start_date_local: '2026-01-05T08:30:00Z',
    total_elevation_gain: 25,
    average_speed: 3.2,
    private: true,
    access_token: 'should-not-leak'
  });

  assert.deepEqual(Object.keys(normalized).sort(), [
    'averageSpeed',
    'distanceKm',
    'distanceMeters',
    'elapsedTimeSeconds',
    'elevationGain',
    'id',
    'movingTimeSeconds',
    'name',
    'sportType',
    'startDate',
    'startDateLocal',
    'stravaUrl',
    'timezone',
    'type'
  ].sort());
  assert.equal(normalized.distanceKm, 5.12);
  assert.equal(normalized.stravaUrl, 'https://www.strava.com/activities/123');
  assert.equal(normalized.access_token, undefined);
});

test('Strava OAuth scopes, activity bounds, and quota headers are hardened', () => {
  const { _private } = require('../src/services/strava.service');

  assert.equal(_private.normalizeAcceptedScopes('activity:read,read,activity:read'), 'activity:read,read');
  assert.throws(() => _private.normalizeAcceptedScopes('read'), /permission was not granted/i);
  assert.equal(_private.normalizeActivityQuery({ page: 999, per_page: 500 }).get('page'), '100');
  assert.equal(_private.normalizeActivityQuery({ page: -1, per_page: 0 }).get('per_page'), '1');
  assert.deepEqual(_private.parseQuotaHeader('100,2000'), { short: 100, daily: 2000 });
  assert.equal(_private.parseQuotaHeader('invalid'), null);
  _private.resetProviderThrottleForTests();
  _private.applyQuotaHeaders({ get: (name) => name === 'x-ratelimit-limit' ? '100,2000' : name === 'x-ratelimit-usage' ? '100,20' : null }, 200, 1000);
  assert.throws(() => _private.assertProviderCapacity(1001), (error) => error.status === 429 && error.code === 'strava_rate_limited');
  _private.resetProviderThrottleForTests();
});

test('Strava routes expose owner-only interfaces and hard-block official submission', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/strava.routes.js'), 'utf8');
  const submissionSource = fs.readFileSync(path.resolve(__dirname, '../src/services/strava-submission.service.js'), 'utf8');

  assert.match(source, /stravaActivityFetchLimiter/);
  assert.match(source, /stravaProviderLimiter/);
  assert.match(source, /\/api\/integrations\/strava\/status/);
  assert.match(source, /\/api\/integrations\/strava\/activities/);
  assert.match(source, /router\.delete\('\/api\/integrations\/strava\/connection'/);
  assert.match(source, /\/api\/strava\/activities'[\s\S]*stravaActivityFetchLimiter/);
  assert.match(source, /\/api\/events\/:eventId\/submissions\/strava'[\s\S]*status\(403\)[\s\S]*external_use_blocked/);
  assert.doesNotMatch(source, /submitStravaActivity/);
  assert.ok(submissionSource.indexOf("throw blocked") < submissionSource.indexOf('fetchActivityById'));
});

test('OAuth state and webhook challenge comparisons are bounded and constant-time', () => {
  process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = 'verify-me';
  const routeHelpers = require('../src/routes/strava.routes')._private;
  const webhook = require('../src/services/strava-webhook.service');

  assert.equal(routeHelpers.OAUTH_STATE_TTL_MS, 10 * 60 * 1000);
  assert.equal(routeHelpers.safeEqual('same', 'same'), true);
  assert.equal(routeHelpers.safeEqual('same', 'different'), false);
  assert.equal(routeHelpers.boundedString('x'.repeat(129), 128), '');
  assert.equal(webhook.verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': 'challenge' }), 'challenge');
  assert.equal(webhook.verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'challenge' }), null);
  assert.equal(webhook._private.boundedString('x'.repeat(257), 256), '');
});
