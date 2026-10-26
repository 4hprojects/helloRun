const test = require('node:test');
const assert = require('node:assert/strict');

const { _private } = require('../src/services/strava-submission.service');

test('Strava eligibility uses the exact UTC instant, not the source-local wall clock', () => {
  const event = {
    eventStartAt: new Date('2026-10-01T00:00:00Z'),
    eventEndAt: new Date('2026-10-01T02:00:00Z'),
    acceptedRunTypes: ['run']
  };
  const activity = {
    startDate: '2026-10-01T01:00:00Z',
    // Interpreting this ambiguous string in a server timezone could move it
    // outside the window; it is evidence text, not the eligibility instant.
    startDateLocal: '2026-09-30T21:00:00',
    type: 'Run',
    distanceKm: 5,
    elapsedTimeSeconds: 1800
  };
  assert.doesNotThrow(() => _private.validateAgainstEvent(activity, event));
});

test('Strava activity without an authoritative instant cannot be auto-accepted', () => {
  const event = {
    eventStartAt: new Date('2026-10-01T00:00:00Z'),
    eventEndAt: new Date('2026-10-02T00:00:00Z'),
    acceptedRunTypes: ['run']
  };
  assert.throws(() => _private.validateAgainstEvent({
    startDateLocal: '2026-10-01T08:00:00',
    type: 'Run',
    distanceKm: 5,
    elapsedTimeSeconds: 1800
  }, event), /exact start time is missing/);
});

test('Strava metadata preserves exact and source-local representations separately', () => {
  const input = _private.buildSubmissionInput({
    registration: { _id: 'registration-1', userId: 'runner-1' },
    connection: { stravaAthleteId: 123 },
    activity: {
      id: 456,
      name: 'Morning Run',
      type: 'Run',
      distanceKm: 5,
      distanceMeters: 5000,
      elapsedTimeSeconds: 1800,
      startDate: '2026-10-01T00:30:00Z',
      startDateLocal: '2026-10-01T08:30:00',
      timezone: '(GMT+08:00) Asia/Manila'
    }
  });
  assert.equal(input.stravaActivity.startDate.toISOString(), '2026-10-01T00:30:00.000Z');
  assert.equal(input.stravaActivity.startDateLocalText, '2026-10-01T08:30:00');
  assert.equal(input.stravaActivity.timezone, '(GMT+08:00) Asia/Manila');
});
