// DB-free unit tests: this project has no staging database (single .env, matches
// production APP_URL), so an integration test that writes real documents has no safe
// place to run. Every Mongoose model call and the Postgres `sql` client are mocked here
// instead — nothing in this file ever opens a real MongoDB or Postgres connection.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const EventPromotion = require('../src/models/EventPromotion');
const CertificateTemplate = require('../src/models/CertificateTemplate');
const User = require('../src/models/User');
const criticalAuditService = require('../src/services/critical-audit.service');
const {
  getTestDataCounts,
  purgeTestData,
  purgePostgresShadowData,
  POSTGRES_EVENT_TABLES
} = require('../src/services/test-data-cleanup.service');

function chainableLean(result) {
  return { select() { return this; }, lean: async () => result };
}

function patch(obj, key, impl) {
  const original = obj[key];
  obj[key] = impl;
  return () => { obj[key] = original; };
}

function buildMockSql({ eventCoreRows = [] } = {}) {
  const calls = [];
  const tx = {
    unsafe: async (query, values) => {
      calls.push({ query, values });
      if (query.includes('select id from events_core')) return eventCoreRows;
      return [];
    }
  };
  return {
    calls,
    sql: {
      begin: async (callback) => callback(tx)
    }
  };
}

test('purgePostgresShadowData deletes every table in POSTGRES_EVENT_TABLES order, events_core last', async () => {
  const eventCoreRows = [{ id: 'core-1' }, { id: 'core-2' }];
  const { calls, sql } = buildMockSql({ eventCoreRows });
  const mongoEventIds = ['mongo-1', 'mongo-2'];

  await purgePostgresShadowData(mongoEventIds, { sql });

  const deleteCalls = calls.filter((c) => c.query.startsWith('delete from'));
  const deletedTablesInOrder = deleteCalls.map((c) => c.query.match(/delete from "([^"]+)"/)[1]);

  const expectedOrder = [...POSTGRES_EVENT_TABLES.map((t) => t.table), 'events_core'];
  assert.deepEqual(deletedTablesInOrder, expectedOrder);

  const eventCoreDelete = deleteCalls.find((c) => c.query.includes('"events_core"'));
  assert.deepEqual(eventCoreDelete.values, [['core-1', 'core-2']]);

  const registrationsDelete = deleteCalls.find((c) => c.query.includes('"registrations"'));
  assert.deepEqual(registrationsDelete.values, [mongoEventIds], 'registrations should be filtered by mongo_event_id directly, not event_core_id');

  const certificatesDelete = deleteCalls.find((c) => c.query.includes('"certificates"'));
  assert.deepEqual(certificatesDelete.values, [['core-1', 'core-2']], 'certificates should be filtered via resolved event_core_id');
});

test('purgePostgresShadowData skips tables when a table/column is missing (undefined_table/undefined_column)', async () => {
  const calls = [];
  const tx = {
    unsafe: async (query) => {
      calls.push(query);
      if (query.includes('select id from events_core')) return [{ id: 'core-1' }];
      const error = new Error('relation does not exist');
      error.code = '42P01';
      throw error;
    }
  };
  const sql = { begin: async (callback) => callback(tx) };

  await assert.doesNotReject(() => purgePostgresShadowData(['mongo-1'], { sql }));
});

test('purgePostgresShadowData is a no-op for an empty event list', async () => {
  let beginCalled = false;
  const sql = { begin: async () => { beginCalled = true; } };
  await purgePostgresShadowData([], { sql });
  assert.equal(beginCalled, false);
});

test('getTestDataCounts returns zeroed counts when no test-data events exist', async () => {
  const restoreFind = patch(Event, 'find', () => chainableLean([]));
  try {
    const counts = await getTestDataCounts();
    assert.deepEqual(counts, {
      events: 0,
      registrations: 0,
      submissions: 0,
      accumulatedSubmissions: 0,
      promotions: 0,
      certificateTemplates: 0
    });
  } finally {
    restoreFind();
  }
});

test('getTestDataCounts aggregates counts across every linked collection', async () => {
  const eventIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  const restores = [
    patch(Event, 'find', () => chainableLean(eventIds.map((_id) => ({ _id })))),
    patch(Registration, 'countDocuments', async () => 4),
    patch(Submission, 'countDocuments', async () => 3),
    patch(AccumulatedActivitySubmission, 'countDocuments', async () => 2),
    patch(EventPromotion, 'countDocuments', async () => 1),
    patch(CertificateTemplate, 'countDocuments', async () => 5)
  ];
  try {
    const counts = await getTestDataCounts();
    assert.deepEqual(counts, {
      events: 2,
      registrations: 4,
      submissions: 3,
      accumulatedSubmissions: 2,
      promotions: 1,
      certificateTemplates: 5
    });
  } finally {
    restores.forEach((restore) => restore());
  }
});

test('purgeTestData returns the empty summary and touches nothing when there are no test-data events', async () => {
  let postgresTouched = false;
  const sql = { begin: async () => { postgresTouched = true; } };
  const restoreFind = patch(Event, 'find', () => chainableLean([]));
  try {
    const summary = await purgeTestData({ sql });
    assert.deepEqual(summary, {
      eventsDeleted: 0,
      registrationsDeleted: 0,
      submissionsDeleted: 0,
      accumulatedSubmissionsDeleted: 0,
      promotionsDeleted: 0,
      certificateTemplatesDeleted: 0
    });
    assert.equal(postgresTouched, false, 'Postgres should never be touched when there is nothing to purge');
  } finally {
    restoreFind();
  }
});

test('purgeTestData deletes Postgres first, then every Mongo collection, then audits once', async () => {
  const eventIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  const { sql } = buildMockSql({ eventCoreRows: [{ id: 'core-1' }] });

  const deleteManyCalls = [];
  function mockDeleteMany(model, name, deletedCount) {
    return patch(model, 'deleteMany', async (filter) => {
      deleteManyCalls.push({ name, filter });
      return { deletedCount };
    });
  }

  let updateManyFilter = null;
  let auditInput = null;

  const restores = [
    patch(Event, 'find', () => chainableLean(eventIds.map((_id) => ({ _id })))),
    mockDeleteMany(Registration, 'Registration', 4),
    mockDeleteMany(Submission, 'Submission', 3),
    mockDeleteMany(AccumulatedActivitySubmission, 'AccumulatedActivitySubmission', 2),
    mockDeleteMany(EventPromotion, 'EventPromotion', 1),
    mockDeleteMany(CertificateTemplate, 'CertificateTemplate', 5),
    patch(User, 'updateMany', async (filter) => { updateManyFilter = filter; return { modifiedCount: 1 }; }),
    mockDeleteMany(Event, 'Event', 2),
    patch(criticalAuditService, 'recordCriticalAuditEventInBackground', (input) => { auditInput = input; })
  ];

  try {
    const summary = await purgeTestData({ actorUserId: 'admin-1', ipAddress: '1.2.3.4', userAgent: 'test-agent', sql });

    assert.deepEqual(summary, {
      eventsDeleted: 2,
      registrationsDeleted: 4,
      submissionsDeleted: 3,
      accumulatedSubmissionsDeleted: 2,
      promotionsDeleted: 1,
      certificateTemplatesDeleted: 5
    });

    const deletedModelNames = deleteManyCalls.map((c) => c.name);
    assert.ok(deletedModelNames.includes('Event'), 'Event.deleteMany should run');
    const eventDeleteIndex = deletedModelNames.indexOf('Event');
    assert.equal(eventDeleteIndex, deletedModelNames.length - 1, 'Event should be deleted after every child collection');

    assert.deepEqual(updateManyFilter, { savedEvents: { $in: eventIds } });

    assert.ok(auditInput, 'audit should be recorded');
    assert.equal(auditInput.action, 'admin.test_data.purged');
    assert.equal(auditInput.targetType, 'test_data_purge');
    assert.equal(auditInput.actorMongoUserId, 'admin-1');
    assert.deepEqual(JSON.parse(auditInput.notes), summary);
  } finally {
    restores.forEach((restore) => restore());
  }
});
