'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BUSINESS_TIME_ZONE,
  isValidTimeZone,
  normalizeTimeZone,
  getSupportedTimeZones,
  suggestTimeZoneForCountry,
  formatInTimeZone
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
