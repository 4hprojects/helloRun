'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = '';

const { ageBucket, buildRetentionInventory, laterDate } = require('../src/scripts/audit-review-evidence-retention');

const NOW = new Date('2026-10-27T00:00:00.000Z');

test('retention anchor uses the latest valid lifecycle date', () => {
  assert.equal(
    laterDate('2025-01-01T00:00:00Z', '2025-03-01T00:00:00Z').toISOString(),
    '2025-03-01T00:00:00.000Z'
  );
  assert.equal(laterDate(null, 'invalid'), null);
});

test('age bands are inventory boundaries, including exact endpoints', () => {
  assert.equal(ageBucket(new Date(NOW.getTime() - 180 * 86400000), NOW), '0-180_days');
  assert.equal(ageBucket(new Date(NOW.getTime() - 181 * 86400000), NOW), '181-730_days');
  assert.equal(ageBucket(new Date(NOW.getTime() - 731 * 86400000), NOW), '731-3650_days');
  assert.equal(ageBucket(new Date(NOW.getTime() - 3651 * 86400000), NOW), 'over_3650_days');
  assert.equal(ageBucket(null, NOW), 'unknown');
});

test('inventory counts lifecycle state without exposing object keys', () => {
  const decisions = [
    {
      kind: 'run_submission', decision: 'approved', eventId: 'event-1', runnerId: 'runner-1',
      decidedAt: '2024-01-01T00:00:00Z', evidence: { proof: { key: 'private/runner-1/proof.png' } }
    },
    {
      kind: 'payment_proof', decision: 'rejected', eventId: 'event-missing', runnerId: 'runner-missing',
      decidedAt: '2026-10-01T00:00:00Z', evidence: { paymentProof: { key: 'private/runner-1/proof.png' } }
    },
    {
      kind: 'accumulated_activity', decision: 'approved', eventId: null, runnerId: null,
      createdAt: '2026-01-01T00:00:00Z', evidence: {}
    }
  ];
  const report = buildRetentionInventory(
    decisions,
    [{ _id: 'event-1', eventEndAt: '2025-01-01T00:00:00Z' }],
    [{ _id: 'runner-1' }],
    NOW
  );

  assert.equal(report.total, 3);
  assert.deepEqual(report.byKind, { run_submission: 1, payment_proof: 1, accumulated_activity: 1 });
  assert.deepEqual(report.proofReferences, { decisionRows: 2, uniqueObjectKeys: 1 });
  assert.deepEqual(report.eventLinks, { activeOrFuture: 0, ended: 1, missing: 1, unset: 1 });
  assert.deepEqual(report.runnerLinks, { present: 1, missing: 1, unset: 1 });
  assert.doesNotMatch(JSON.stringify(report), /private\/runner-1/);
});
