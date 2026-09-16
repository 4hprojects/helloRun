'use strict';

// DB-free unit tests for the optional "preferred tracking app or device" option list.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TRACKING_APP_OPTIONS,
  OTHER_OPTION_ID,
  UNDECIDED_OPTION_ID,
  normalizeTrackingApps,
  normalizeTrackingAppOther,
  formatTrackingAppsLabel
} = require('../src/utils/tracking-apps');

test('the option list covers phone-only participants and an explicit escape hatch', () => {
  const ids = TRACKING_APP_OPTIONS.map((option) => option.id);
  assert.ok(ids.includes('strava'));
  assert.ok(ids.includes('phone_pedometer'));
  assert.ok(ids.includes(OTHER_OPTION_ID));
  assert.ok(ids.includes(UNDECIDED_OPTION_ID));
  assert.equal(new Set(ids).size, ids.length, 'option ids must be unique');
  TRACKING_APP_OPTIONS.forEach((option) => assert.ok(option.label.trim().length > 0));
});

test('normalizeTrackingApps accepts both body-parser shapes', () => {
  // One checked box arrives as a string, several arrive as an array.
  assert.deepEqual(normalizeTrackingApps('strava'), ['strava']);
  assert.deepEqual(normalizeTrackingApps(['strava', 'garmin']), ['strava', 'garmin']);
});

test('normalizeTrackingApps drops unknown ids, blanks, and duplicates', () => {
  assert.deepEqual(normalizeTrackingApps(['strava', 'bogus', '', 'strava']), ['strava']);
  assert.deepEqual(normalizeTrackingApps([]), []);
  assert.deepEqual(normalizeTrackingApps(undefined), []);
  assert.deepEqual(normalizeTrackingApps(null), []);
});

test('normalizeTrackingApps returns ids in a stable declared order', () => {
  assert.deepEqual(normalizeTrackingApps(['garmin', 'strava']), ['strava', 'garmin']);
});

test('"Not sure yet" is exclusive because it is an answer, not a qualifier', () => {
  assert.deepEqual(normalizeTrackingApps(['strava', UNDECIDED_OPTION_ID]), [UNDECIDED_OPTION_ID]);
  assert.deepEqual(normalizeTrackingApps([UNDECIDED_OPTION_ID]), [UNDECIDED_OPTION_ID]);
});

test('normalizeTrackingAppOther trims and caps the free text at 80 characters', () => {
  assert.equal(normalizeTrackingAppOther('  Polar Flow  '), 'Polar Flow');
  assert.equal(normalizeTrackingAppOther('x'.repeat(200)).length, 80);
  assert.equal(normalizeTrackingAppOther(undefined), '');
});

test('formatTrackingAppsLabel builds the readable summary stored for CSV exports', () => {
  assert.equal(formatTrackingAppsLabel(['strava', 'garmin']), 'Strava, Garmin Connect');
  assert.equal(formatTrackingAppsLabel(['strava', OTHER_OPTION_ID], 'Polar Flow'), 'Strava, Other: Polar Flow');
  assert.equal(formatTrackingAppsLabel([OTHER_OPTION_ID], ''), 'Other');
  assert.equal(formatTrackingAppsLabel([]), '');
  assert.equal(formatTrackingAppsLabel(undefined), '');
});

test('the stored summary never exceeds the participant field length', () => {
  const everything = TRACKING_APP_OPTIONS.map((option) => option.id);
  assert.ok(formatTrackingAppsLabel(everything, 'x'.repeat(80)).length <= 200);
});
