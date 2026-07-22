'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeDateLabel,
  parseArguments,
  reconcileEventText
} = require('../src/scripts/reconcile-event-date-copy');

const event = {
  registrationOpenAt: new Date('2025-12-31T16:00:00.000Z'),
  registrationCloseAt: new Date('2026-11-30T15:59:00.000Z'),
  eventStartAt: new Date('2025-12-31T16:00:00.000Z'),
  eventEndAt: new Date('2026-12-31T15:59:00.000Z'),
  finalSubmissionDeadlineAt: new Date('2027-01-14T15:59:00.000Z')
};

test('date-copy reconciliation defaults to dry-run and rejects conflicting flags', () => {
  assert.deepEqual(parseArguments([]), { mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--apply']), { mode: 'apply' });
  assert.throws(() => parseArguments(['--apply', '--dry-run']), /either --dry-run or --apply/i);
  assert.throws(() => parseArguments(['--unknown']), /unknown argument/i);
});

test('normalizes abbreviated and full month labels without timezone drift', () => {
  assert.equal(normalizeDateLabel('November 30, 2026'), '2026-11-30');
  assert.equal(normalizeDateLabel('Nov. 30, 2026'), '2026-11-30');
});

test('reconciles labelled dates and event ranges to structured platform dates', () => {
  const input = 'Challenge scheduled from Jan 1, 2026 to Dec 31, 2026. Registration closes June 30, 2026. Final submissions are due by Jan 14, 2027.';
  const result = reconcileEventText(event, input);
  assert.match(result.value, /Registration closes Nov 30, 2026/);
  assert.match(result.value, /scheduled from Jan 1, 2026 to Dec 31, 2026/);
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].field, 'registrationCloseAt');
});

test('leaves already consistent copy unchanged', () => {
  const result = reconcileEventText(event, 'Registration closes Nov 30, 2026. Event ends: Dec 31, 2026.');
  assert.equal(result.changes.length, 0);
});
