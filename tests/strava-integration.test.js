const test = require('node:test');
const assert = require('node:assert/strict');

test('Strava token encryption round trips without storing plaintext', () => {
  process.env.STRAVA_ENCRYPTION_KEY = 'test-strava-encryption-key-for-local-runs';
  const { encryptToken, decryptToken } = require('../src/services/token-encryption.service');

  const encrypted = encryptToken('secret-access-token');

  assert.notEqual(encrypted, 'secret-access-token');
  assert.match(encrypted, /^v1\./);
  assert.equal(decryptToken(encrypted), 'secret-access-token');
});

test('Strava activity normalization exposes only submit UI fields', () => {
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

test('Strava run type mapping supports MVP activity types', () => {
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_test_key';
  const { normalizeStravaRunType, _private } = require('../src/services/strava-submission.service');

  assert.equal(normalizeStravaRunType('Run'), 'run');
  assert.equal(normalizeStravaRunType('Walk'), 'walk');
  assert.equal(normalizeStravaRunType('Hike'), 'hike');
  assert.equal(normalizeStravaRunType('TrailRun'), 'trail_run');
  assert.equal(normalizeStravaRunType('Ride'), '');
  assert.equal(_private.PERSONAL_RECORD_EVENT_ID, 'personal-record');
});
