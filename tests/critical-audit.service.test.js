const test = require('node:test');
const assert = require('node:assert/strict');

const { buildAuditIdempotencyKey } = require('../src/services/critical-audit.service');

test('buildAuditIdempotencyKey is stable for same critical action inputs', () => {
  const input = {
    action: 'organiser.application.approved',
    targetType: 'organiser_application',
    targetId: '507f1f77bcf86cd799439011',
    statusFrom: 'pending',
    statusTo: 'approved',
    actorMongoUserId: '507f1f77bcf86cd799439012',
    occurredAt: '2026-05-15T00:00:00.000Z'
  };

  assert.equal(buildAuditIdempotencyKey(input), buildAuditIdempotencyKey({ ...input }));
});

test('buildAuditIdempotencyKey changes when status transition changes', () => {
  const base = {
    action: 'organiser.application.reviewed',
    targetType: 'organiser_application',
    targetId: '507f1f77bcf86cd799439011',
    statusFrom: 'pending',
    actorMongoUserId: '507f1f77bcf86cd799439012',
    occurredAt: '2026-05-15T00:00:00.000Z'
  };

  assert.notEqual(
    buildAuditIdempotencyKey({ ...base, statusTo: 'approved' }),
    buildAuditIdempotencyKey({ ...base, statusTo: 'rejected' })
  );
});
