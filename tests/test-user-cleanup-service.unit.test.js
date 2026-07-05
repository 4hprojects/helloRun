// DB-free unit tests — same rationale as tests/test-data-cleanup-service.unit.test.js:
// this project has no staging database, so every Mongoose model call and the Postgres
// `sql` client are mocked here. Nothing in this file opens a real connection.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const SubmissionIdempotencyKey = require('../src/models/SubmissionIdempotencyKey');
const OrganiserApplication = require('../src/models/OrganiserApplication');
const StravaConnection = require('../src/models/StravaConnection');
const Notification = require('../src/models/Notification');
const CommunicationLog = require('../src/models/CommunicationLog');
const Blog = require('../src/models/Blog');
const BlogComment = require('../src/models/BlogComment');
const BlogLike = require('../src/models/BlogLike');
const BlogView = require('../src/models/BlogView');
const BlogRevision = require('../src/models/BlogRevision');
const BlogReport = require('../src/models/BlogReport');
const RunningGroup = require('../src/models/RunningGroup');
const RunningGroupActivity = require('../src/models/RunningGroupActivity');
const EventPromotion = require('../src/models/EventPromotion');
const CertificateTemplate = require('../src/models/CertificateTemplate');
const CertificateTemplateModel = CertificateTemplate;
const criticalAuditService = require('../src/services/critical-audit.service');
const {
  getTestUserCounts,
  purgeTestUsers,
  purgePostgresUserData,
  TEST_USER_EMAIL_PATTERN,
  POSTGRES_APP_USER_ACTOR_COLUMNS,
  POSTGRES_APP_USER_OWNERSHIP_COLUMNS
} = require('../src/services/test-user-cleanup.service');

function chainableLean(result) {
  return { select() { return this; }, lean: async () => result };
}

function patch(obj, key, impl) {
  const original = obj[key];
  obj[key] = impl;
  return () => { obj[key] = original; };
}

function buildMockSql({ appUserRows = [] } = {}) {
  const calls = [];
  const tx = {
    unsafe: async (query, values) => {
      calls.push({ query, values });
      if (query.includes('select id from app_users')) return appUserRows;
      return [];
    }
  };
  return { calls, sql: { begin: async (callback) => callback(tx) } };
}

test('TEST_USER_EMAIL_PATTERN matches @example.com and nothing else', () => {
  assert.match('purge.runner.123@example.com', TEST_USER_EMAIL_PATTERN);
  assert.match('PHASE5.ORGANIZER@EXAMPLE.COM', TEST_USER_EMAIL_PATTERN);
  assert.doesNotMatch('henzoom8@gmail.com', TEST_USER_EMAIL_PATTERN);
  assert.doesNotMatch('admin@hellorun.online', TEST_USER_EMAIL_PATTERN);
});

test('getTestUserCounts queries User.find excluding admin-role accounts and the acting admin', async () => {
  let capturedQuery = null;
  const restoreFind = patch(User, 'find', (query) => { capturedQuery = query; return chainableLean([]); });
  try {
    await getTestUserCounts('excluded-admin-id');
    assert.equal(capturedQuery.email, TEST_USER_EMAIL_PATTERN);
    assert.deepEqual(capturedQuery.role, { $ne: 'admin' });
    assert.deepEqual(capturedQuery._id, { $ne: 'excluded-admin-id' });
  } finally {
    restoreFind();
  }
});

test('purgePostgresUserData nulls actor columns then deletes ownership rows then app_users last', async () => {
  const appUserRows = [{ id: 'app-user-1' }];
  const { calls, sql } = buildMockSql({ appUserRows });

  await purgePostgresUserData(['mongo-user-1'], { sql });

  const orderItemsIdx = calls.findIndex((c) => c.query.includes('order_items'));
  const ordersIdx = calls.findIndex((c) => c.query.startsWith('delete from orders'));
  assert.ok(orderItemsIdx >= 0 && ordersIdx >= 0 && orderItemsIdx < ordersIdx, 'order_items must be cleared before orders');

  for (const { table, column } of POSTGRES_APP_USER_ACTOR_COLUMNS) {
    const updateCall = calls.find((c) => c.query.startsWith('update') && c.query.includes(`"${table}"`) && c.query.includes(`"${column}"`));
    assert.ok(updateCall, `expected an UPDATE...SET NULL for ${table}.${column}`);
    assert.deepEqual(updateCall.values, [['app-user-1']]);
  }

  for (const { table, column } of POSTGRES_APP_USER_OWNERSHIP_COLUMNS) {
    const deleteCall = calls.find((c) => c.query.startsWith('delete from') && c.query.includes(`"${table}"`) && c.query.includes(`"${column}"`));
    assert.ok(deleteCall, `expected a DELETE for ${table}.${column}`);
    assert.deepEqual(deleteCall.values, [['app-user-1']]);
  }

  const registrationsCall = calls.find((c) => c.query.includes('delete from registrations'));
  assert.deepEqual(registrationsCall.values, [['mongo-user-1']], 'registrations should be filtered by mongo_user_id directly');

  const appUsersDeleteIdx = calls.findIndex((c) => c.query === 'delete from app_users where id = any($1)');
  assert.ok(appUsersDeleteIdx === calls.length - 1, 'app_users must be deleted last');
});

test('purgePostgresUserData is a no-op when no app_users rows resolve', async () => {
  const { calls, sql } = buildMockSql({ appUserRows: [] });
  await purgePostgresUserData(['mongo-user-1'], { sql });
  assert.equal(calls.length, 1, 'only the initial app_users lookup should run');
});

test('purgePostgresUserData is a no-op for an empty user list', async () => {
  let beginCalled = false;
  const sql = { begin: async () => { beginCalled = true; } };
  await purgePostgresUserData([], { sql });
  assert.equal(beginCalled, false);
});

test('purgePostgresUserData skips tables that are missing (undefined_table/undefined_column)', async () => {
  const tx = {
    unsafe: async (query) => {
      if (query.includes('select id from app_users')) return [{ id: 'app-user-1' }];
      const error = new Error('relation does not exist');
      error.code = '42P01';
      throw error;
    }
  };
  const sql = { begin: async (callback) => callback(tx) };
  await assert.doesNotReject(() => purgePostgresUserData(['mongo-user-1'], { sql }));
});

function patchAllOwnedCounters(value) {
  return [
    patch(Registration, 'countDocuments', async () => value),
    patch(Submission, 'countDocuments', async () => value),
    patch(AccumulatedActivitySubmission, 'countDocuments', async () => value),
    patch(SubmissionIdempotencyKey, 'countDocuments', async () => value),
    patch(OrganiserApplication, 'countDocuments', async () => value),
    patch(StravaConnection, 'countDocuments', async () => value),
    patch(Notification, 'countDocuments', async () => value),
    patch(CommunicationLog, 'countDocuments', async () => value),
    patch(BlogComment, 'countDocuments', async () => value),
    patch(BlogLike, 'countDocuments', async () => value),
    patch(BlogView, 'countDocuments', async () => value),
    patch(BlogRevision, 'countDocuments', async () => value),
    patch(BlogReport, 'countDocuments', async () => value),
    patch(Blog, 'countDocuments', async () => value),
    patch(RunningGroup, 'countDocuments', async () => value),
    patch(RunningGroupActivity, 'countDocuments', async () => value),
    patch(EventPromotion, 'countDocuments', async () => value),
    patch(CertificateTemplateModel, 'countDocuments', async () => value)
  ];
}

test('getTestUserCounts returns zeroed counts when no test-fixture users exist', async () => {
  const restoreFind = patch(User, 'find', () => chainableLean([]));
  try {
    const counts = await getTestUserCounts();
    assert.equal(counts.users, 0);
    assert.equal(counts.registrations, 0);
    assert.equal(counts.events, 0);
  } finally {
    restoreFind();
  }
});

test('getTestUserCounts aggregates counts across every owned collection plus organized events', async () => {
  const userIds = [new mongoose.Types.ObjectId()];
  const restores = [
    patch(User, 'find', () => chainableLean(userIds.map((_id) => ({ _id })))),
    patch(Blog, 'find', () => chainableLean([])),
    patch(RunningGroup, 'find', () => chainableLean([])),
    patch(Event, 'countDocuments', async () => 1),
    ...patchAllOwnedCounters(3)
  ];
  try {
    const counts = await getTestUserCounts();
    assert.equal(counts.users, 1);
    assert.equal(counts.registrations, 3);
    assert.equal(counts.blogPosts, 3);
    assert.equal(counts.events, 1);
  } finally {
    restores.forEach((restore) => restore());
  }
});

test('purgeTestUsers returns the empty summary and touches nothing when there are no test-fixture users', async () => {
  let postgresTouched = false;
  const sql = { begin: async () => { postgresTouched = true; } };
  const restoreFind = patch(User, 'find', () => chainableLean([]));
  try {
    const summary = await purgeTestUsers({ sql });
    assert.equal(summary.usersDeleted, 0);
    assert.equal(summary.eventsDeleted, 0);
    assert.equal(postgresTouched, false);
  } finally {
    restoreFind();
  }
});

test('purgeTestUsers sums direct ownership deletes with organizer-owned-event cascade deletes, deletes Users last, and audits once', async () => {
  const userIds = [new mongoose.Types.ObjectId()];
  const eventIds = [new mongoose.Types.ObjectId()];
  const { sql } = buildMockSql({ appUserRows: [{ id: 'app-user-1' }] });

  function mockDeleteMany(model, deletedCount) {
    return patch(model, 'deleteMany', async () => ({ deletedCount }));
  }
  function mockUpdateMany(model) {
    return patch(model, 'updateMany', async () => ({ modifiedCount: 0 }));
  }

  let auditInput = null;
  let userFindCallCount = 0;

  const restores = [
    // First User.find call (getTestUserIds) returns the target users; Event.find
    // (organized events) returns one event owned by them, exercising the reused
    // cascadeDeleteEventsMongo/purgePostgresShadowData path from test-data-cleanup.service.
    patch(User, 'find', () => { userFindCallCount += 1; return chainableLean(userIds.map((_id) => ({ _id }))); }),
    patch(Event, 'find', () => chainableLean(eventIds.map((_id) => ({ _id })))),
    patch(Blog, 'find', () => chainableLean([])),
    patch(RunningGroup, 'find', () => chainableLean([])),
    mockDeleteMany(Registration, 1),
    mockDeleteMany(Submission, 1),
    mockDeleteMany(AccumulatedActivitySubmission, 1),
    mockDeleteMany(SubmissionIdempotencyKey, 1),
    mockDeleteMany(OrganiserApplication, 1),
    mockDeleteMany(StravaConnection, 1),
    mockDeleteMany(Notification, 1),
    mockDeleteMany(CommunicationLog, 1),
    mockDeleteMany(BlogComment, 1),
    mockDeleteMany(BlogLike, 1),
    mockDeleteMany(BlogView, 1),
    mockDeleteMany(BlogRevision, 1),
    mockDeleteMany(BlogReport, 1),
    mockDeleteMany(Blog, 1),
    mockDeleteMany(RunningGroup, 1),
    mockDeleteMany(RunningGroupActivity, 1),
    mockDeleteMany(EventPromotion, 1),
    mockDeleteMany(CertificateTemplateModel, 1),
    mockDeleteMany(Event, 1),
    mockDeleteMany(User, 1),
    mockUpdateMany(Submission),
    mockUpdateMany(AccumulatedActivitySubmission),
    mockUpdateMany(OrganiserApplication),
    mockUpdateMany(Registration),
    mockUpdateMany(Event),
    mockUpdateMany(User),
    patch(criticalAuditService, 'recordCriticalAuditEventInBackground', (input) => { auditInput = input; })
  ];

  try {
    const summary = await purgeTestUsers({ actorUserId: 'admin-1', ipAddress: '1.2.3.4', userAgent: 'test-agent', sql });

    assert.equal(summary.usersDeleted, 1);
    assert.equal(summary.eventsDeleted, 1, 'events are only deleted via the organizer cascade, not double-counted');
    // registrations/submissions/accumulated/promotions/certificateTemplates are each
    // touched once by the event cascade (eventId-scoped) and once by the owned-data
    // cascade (userId/organizerId-scoped) — both mocked to return 1, so the summed
    // total should be 2 for each.
    assert.equal(summary.registrationsDeleted, 2);
    assert.equal(summary.submissionsDeleted, 2);
    assert.equal(summary.accumulatedSubmissionsDeleted, 2);
    assert.equal(summary.eventPromotionsDeleted, 2);
    assert.equal(summary.certificateTemplatesDeleted, 2);
    // Not linked to events, so counted once.
    assert.equal(summary.organiserApplicationsDeleted, 1);
    assert.equal(summary.stravaConnectionsDeleted, 1);
    assert.equal(summary.notificationsDeleted, 1);
    assert.equal(summary.blogPostsDeleted, 1);
    assert.equal(summary.runningGroupsDeleted, 1);

    assert.ok(userFindCallCount >= 1);
    assert.ok(auditInput, 'audit should be recorded');
    assert.equal(auditInput.action, 'admin.test_users.purged');
    assert.equal(auditInput.targetType, 'test_user_purge');
    assert.equal(auditInput.actorMongoUserId, 'admin-1');
    assert.deepEqual(JSON.parse(auditInput.notes), summary);
  } finally {
    restores.forEach((restore) => restore());
  }
});
