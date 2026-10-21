'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BUSINESS_TIME_ZONE,
  isValidTimeZone,
  normalizeTimeZone,
  getSupportedTimeZones,
  getTimeZoneOffsetMinutes,
  formatUtcOffset,
  getTimeZoneOptions,
  suggestTimeZoneForCountry,
  formatInTimeZone,
  parseWallClock,
  parseExplicitInstant,
  parseBusinessDateTime,
  formatDateTimeInput,
  buildCriticalTimeDisplay
} = require('../src/utils/timezone');

test('uses Asia/Manila as the business timezone', () => {
  assert.equal(BUSINESS_TIME_ZONE, 'Asia/Manila');
  assert.equal(suggestTimeZoneForCountry('PH'), BUSINESS_TIME_ZONE);
  assert.equal(suggestTimeZoneForCountry('US'), '');
});

test('validates IANA timezone identifiers and rejects ambiguous values', () => {
  assert.equal(isValidTimeZone('America/New_York'), true);
  assert.equal(isValidTimeZone('Asia/Manila'), true);
  assert.equal(isValidTimeZone('PST'), false);
  assert.equal(isValidTimeZone('+08:00'), false);
  assert.equal(normalizeTimeZone(' Invalid/Zone '), '');
});

test('supported timezone choices include the business timezone', () => {
  assert.ok(getSupportedTimeZones().includes('Asia/Manila'));
});

test('formats an instant in an explicitly selected timezone', () => {
  const instant = '2026-10-01T00:00:00.000Z';
  assert.match(formatInTimeZone(instant, 'Asia/Manila'), /Oct 1, 2026/);
  assert.match(formatInTimeZone(instant, 'America/New_York'), /Sep 30, 2026/);
});

test('builds offset-first labels while retaining IANA values', () => {
  const options = getTimeZoneOptions(new Date('2026-01-15T00:00:00Z'));
  const manila = options.find((option) => option.value === 'Asia/Manila');
  const newYork = options.find((option) => option.value === 'America/New_York');
  assert.equal(manila.label, 'UTC+08:00 — Manila');
  assert.equal(newYork.label, 'UTC−05:00 — New York');
});

test('calculates daylight-saving and fractional offsets', () => {
  assert.equal(getTimeZoneOffsetMinutes('America/New_York', new Date('2026-01-15T00:00:00Z')), -300);
  assert.equal(getTimeZoneOffsetMinutes('America/New_York', new Date('2026-07-15T00:00:00Z')), -240);
  assert.equal(getTimeZoneOffsetMinutes('Asia/Kolkata', new Date('2026-01-15T00:00:00Z')), 330);
  assert.equal(getTimeZoneOffsetMinutes('Asia/Kathmandu', new Date('2026-01-15T00:00:00Z')), 345);
  assert.equal(formatUtcOffset(-210), 'UTC−03:30');
});

test('sorts timezone options by numeric offset then city', () => {
  const options = getTimeZoneOptions(new Date('2026-01-15T00:00:00Z'));
  const numeric = options.filter((option) => option.offsetMinutes != null);
  for (let index = 1; index < numeric.length; index += 1) {
    assert.ok(numeric[index - 1].offsetMinutes <= numeric[index].offsetMinutes);
  }
});

test('parses Manila wall-clock input into one UTC instant', () => {
  assert.equal(parseWallClock('2026-10-01T08:00', 'Asia/Manila').toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(parseBusinessDateTime('2026-10-01T08:00').toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(formatDateTimeInput('2026-10-01T00:00:00Z'), '2026-10-01T08:00');
  assert.equal(parseWallClock('2026-02-30T08:00', 'Asia/Manila'), null);
});

test('requires an explicit offset for interchange instants', () => {
  assert.equal(parseExplicitInstant('2026-10-01T08:00'), null);
  assert.equal(parseExplicitInstant('2026-10-01T08:00+08:00').toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(parseExplicitInstant('2026-10-01T00:00:00Z').toISOString(), '2026-10-01T00:00:00.000Z');
});

test('builds paired critical-time labels and collapses the Manila duplicate', () => {
  const instant = '2026-10-01T00:00:00Z';
  const newYork = buildCriticalTimeDisplay(instant, 'America/New_York');
  assert.equal(newYork.sameZone, false);
  assert.equal(newYork.local.timeZone, 'America/New_York');
  assert.equal(newYork.official.timeZone, 'Asia/Manila');
  assert.match(newYork.local.label, /Sep 30, 2026/);
  assert.match(newYork.official.label, /Oct 1, 2026/);
  assert.equal(buildCriticalTimeDisplay(instant, 'Asia/Manila').sameZone, true);
});
