'use strict';

// Real coverage for the onsite result-import validator and the QR helpers.
//
// This replaces tests/phase7-extended.unit.test.js and phase7-extended-fixed.unit.test.js,
// which together were 621 lines that imported no application code — they built mock
// objects and asserted on those mocks, so they passed regardless of what the services did.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateResultRow,
  validateResultBatch,
  categorizeErrors,
  isValidTimeFormat,
  timeToMilliseconds,
  generateErrorCSV
} = require('../src/services/result-import-validation.service');

const { decodeQRData } = require('../src/services/qr-code.service');

test('validateResultRow flags missing required fields', () => {
  const result = validateResultRow({ bib_number: '101' }, ['bib_number', 'elapsed_time'], 3);

  assert.equal(result.valid, false);
  assert.equal(result.row_index, 3);
  const missing = result.errors.filter((error) => error.category === 'missing_field');
  assert.equal(missing.length, 1);
  assert.equal(missing[0].field, 'elapsed_time');
});

test('validateResultRow accepts a well-formed row', () => {
  const result = validateResultRow({ bib_number: '101', elapsed_time: '01:23:45', distance_km: 10 });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validateResultRow rejects bad time and non-positive distance', () => {
  const result = validateResultRow({
    bib_number: '101',
    elapsed_time: '1:2:3:4',
    distance_km: '0'
  });

  assert.equal(result.valid, false);
  const fields = result.errors.map((error) => error.field);
  assert.ok(fields.includes('elapsed_time'));
  assert.ok(fields.includes('distance_km'));
  assert.ok(result.errors.every((error) => error.category === 'invalid_format'));
});

test('validateResultRow treats an empty row as invalid rather than throwing', () => {
  const result = validateResultRow(null, ['bib_number'], 7);
  assert.equal(result.valid, false);
  assert.equal(result.row_index, 7);
  assert.equal(result.errors[0].category, 'missing_field');
});

test('isValidTimeFormat accepts HH:MM:SS and MM:SS, rejects out-of-range parts', () => {
  ['01:23:45', '00:00:00', '9:59:59', '12:34', '01:23:45.678'].forEach((value) => {
    assert.equal(isValidTimeFormat(value), true, `${value} should be valid`);
  });

  // Minutes and seconds are bounded, and non-strings must not slip through.
  ['01:60:00', '01:23:60', 'abc', '', '1', 123, null, undefined].forEach((value) => {
    assert.equal(isValidTimeFormat(value), false, `${JSON.stringify(value)} should be invalid`);
  });
});

test('timeToMilliseconds converts both supported shapes and refuses invalid input', () => {
  assert.equal(timeToMilliseconds('01:00:00'), 3600000);
  assert.equal(timeToMilliseconds('00:52:10'), 52 * 60000 + 10000);
  assert.equal(timeToMilliseconds('12:34'), 12 * 60000 + 34000);
  assert.equal(timeToMilliseconds('00:00:01.5'), 1500);

  assert.throws(() => timeToMilliseconds('nope'), /Invalid time format/);
  assert.throws(() => timeToMilliseconds('01:60:00'), /Invalid time format/);
});

test('categorizeErrors groups by category and falls back to other', () => {
  const summary = categorizeErrors([
    { category: 'missing_field' },
    { category: 'missing_field' },
    { category: 'invalid_format' },
    { category: 'something_unmapped' },
    {}
  ]);

  assert.equal(summary.total, 5);
  assert.equal(summary.by_category.missing_field.length, 2);
  assert.equal(summary.by_category.invalid_format.length, 1);
  assert.equal(summary.by_category.other.length, 2);
  assert.match(summary.summary, /2 missing field/);
});

test('validateResultBatch separates valid rows and reports 1-based row indexes', () => {
  const batch = validateResultBatch([
    { bib_number: '1', elapsed_time: '00:30:00' },
    { bib_number: '2', elapsed_time: 'bad' },
    { bib_number: '3', elapsed_time: '00:31:00' }
  ]);

  assert.equal(batch.total_rows, 3);
  assert.equal(batch.valid_rows, 2);
  assert.equal(batch.failed_rows, 1);
  assert.equal(batch.invalid_rows[0].row_index, 2);
  assert.deepEqual(
    batch.valid_rows_data.map((row) => row.row_index),
    [1, 3]
  );
  assert.equal(batch.can_retry, true);
});

test('generateErrorCSV escapes quotes so a message cannot break the columns', () => {
  const csv = generateErrorCSV([
    { row_index: 2, field: 'elapsed_time', category: 'invalid_format', message: 'Got "bad"' }
  ]);

  assert.match(csv, /^"Row","Field","Category","Message","Suggestion"\n/);
  assert.match(csv, /"Got ""bad"""/);
  assert.equal(generateErrorCSV([]), 'No errors');
});

test('decodeQRData round-trips the current payload and rejects malformed input', () => {
  const decoded = decodeQRData('EVENT:abc123|BIB:204|TIME:1000');
  assert.equal(decoded.success, true);
  assert.equal(decoded.eventId, 'abc123');
  assert.equal(decoded.bibNumber, '204');

  // Anything missing a field must fail rather than yielding undefined ids and a NaN time.
  ['garbage', '', 'EVENT:abc123', 'EVENT:abc123|BIB:204', 'EVENT:abc123|BIB:204|TIME:x', null, 42]
    .forEach((value) => {
      assert.equal(
        decodeQRData(value).success,
        false,
        `${JSON.stringify(value)} should not decode`
      );
    });
});
