const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAuditIdempotencyKey,
  recordCriticalAuditEvent,
  recordCriticalAuditEvents
} = require('../src/services/critical-audit.service');

function createSqlMock(returnedRows = []) {
  const calls = { bulk: [], queries: [] };

  function sql(first, ...values) {
    if (Array.isArray(first) && first.raw) {
      calls.queries.push({ strings: first, values });
      return Promise.resolve(returnedRows);
    }
    calls.bulk.push({ rows: first, columns: values });
    return { type: 'bulk-values' };
  }

  return { sql, calls };
}

test('critical audit batch inserts all events with one SQL query', async () => {
  const occurredAt = new Date('2026-07-20T01:02:03.000Z');
  const returnedRows = [{ target_id: 'user-1' }, { target_id: 'user-2' }];
  const { sql, calls } = createSqlMock(returnedRows);
  const inputs = ['user-1', 'user-2'].map((targetId) => ({
    action: 'admin.user.deleted',
    targetType: 'user',
    targetId,
    notes: `Deleted ${targetId}`,
    occurredAt
  }));

  const result = await recordCriticalAuditEvents(inputs, { sql });

  assert.deepEqual(result, returnedRows);
  assert.equal(calls.queries.length, 1);
  assert.equal(calls.bulk.length, 1);
  assert.equal(calls.bulk[0].rows.length, 2);
  assert.deepEqual(calls.bulk[0].rows.map((row) => row.target_id), ['user-1', 'user-2']);
  assert.equal(calls.bulk[0].rows[0].created_at.toISOString(), occurredAt.toISOString());
  assert.equal(
    calls.bulk[0].rows[0].idempotency_key,
    buildAuditIdempotencyKey({ ...inputs[0], actorMongoUserId: '', occurredAt })
  );
});

test('single critical audit writes through the batch interface and returns one row', async () => {
  const returnedRow = { target_id: 'user-1' };
  const { sql, calls } = createSqlMock([returnedRow]);

  const result = await recordCriticalAuditEvent({
    action: 'admin.user.deleted',
    targetType: 'user',
    targetId: 'user-1'
  }, { sql });

  assert.deepEqual(result, returnedRow);
  assert.equal(calls.queries.length, 1);
  assert.equal(calls.bulk[0].rows.length, 1);
});

test('critical audit batch rejects mixed actors before writing', async () => {
  const { sql, calls } = createSqlMock();

  await assert.rejects(
    recordCriticalAuditEvents([
      { action: 'one', targetType: 'user', targetId: '1', actorMongoUserId: 'actor-1' },
      { action: 'two', targetType: 'user', targetId: '2', actorMongoUserId: 'actor-2' }
    ], { sql }),
    /one common actor/i
  );
  assert.equal(calls.queries.length, 0);
  assert.equal(calls.bulk.length, 0);
});

test('empty critical audit batch is a no-op', async () => {
  const { sql, calls } = createSqlMock();
  assert.deepEqual(await recordCriticalAuditEvents([], { sql }), []);
  assert.equal(calls.queries.length, 0);
  assert.equal(calls.bulk.length, 0);
});
