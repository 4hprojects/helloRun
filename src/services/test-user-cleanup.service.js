'use strict';

const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const SubmissionIdempotencyKey = require('../models/SubmissionIdempotencyKey');
const OrganiserApplication = require('../models/OrganiserApplication');
const StravaConnection = require('../models/StravaConnection');
const Notification = require('../models/Notification');
const CommunicationLog = require('../models/CommunicationLog');
const Blog = require('../models/Blog');
const BlogComment = require('../models/BlogComment');
const BlogLike = require('../models/BlogLike');
const BlogView = require('../models/BlogView');
const BlogRevision = require('../models/BlogRevision');
const BlogReport = require('../models/BlogReport');
const RunningGroup = require('../models/RunningGroup');
const RunningGroupActivity = require('../models/RunningGroupActivity');
const EventPromotion = require('../models/EventPromotion');
const CertificateTemplate = require('../models/CertificateTemplate');
const { getPostgresClient } = require('../db/postgres');
const criticalAuditService = require('./critical-audit.service');
const { purgePostgresShadowData, cascadeDeleteEventsMongo } = require('./test-data-cleanup.service');

// @example.com is never used for a real account anywhere in production code (verified by
// full-tree grep — the only two hits in src/ are placeholder text in form inputs). It's the
// fixture-email domain used throughout the integration test suite, so it's a reliable,
// always-current signal without needing a stored flag (unlike Event.isTestData).
const TEST_USER_EMAIL_PATTERN = /@example\.com$/i;

function buildTestUserQuery(excludeUserId) {
  const query = { email: TEST_USER_EMAIL_PATTERN, role: { $ne: 'admin' } };
  if (excludeUserId) query._id = { $ne: excludeUserId };
  return query;
}

async function getTestUserIds(excludeUserId) {
  const users = await User.find(buildTestUserQuery(excludeUserId)).select('_id').lean();
  return users.map((user) => user._id);
}

// Postgres columns that reference app_users but must be NULLed (not deleted) before
// app_users can go — these are "who acted on this row" columns where the row itself may
// belong to real data, mirroring the Mongo actor/reviewer split below. All are
// RESTRICT/no-ON-DELETE-action columns; without this they'd block the final app_users delete.
const POSTGRES_APP_USER_ACTOR_COLUMNS = [
  { table: 'submissions_core', column: 'reviewed_by' },
  { table: 'certificates', column: 'issued_by' },
  { table: 'certificates', column: 'organizer_user_id' },
  { table: 'certificate_audit_logs', column: 'actor_user_id' },
  { table: 'result_imports', column: 'imported_by' },
  { table: 'products_core', column: 'created_by' },
  { table: 'products_core', column: 'updated_by' },
  { table: 'inventory_movements', column: 'created_by' }
];

// Postgres rows that belong to the user and should be deleted outright, in FK-safe order
// (each table listed before anything it would otherwise block deletion of). Tables with
// ON DELETE CASCADE/SET NULL off app_users (payments, user_badges, badge_progress,
// badge_audit_logs, check_ins.checked_in_by, onsite_results.entered_by, organisers via
// CASCADE-free SET NULL, audit_critical, shop_payments, shop_fulfilment_logs,
// badge_definitions.created_by) don't need an explicit entry — Postgres clears them
// automatically when app_users is deleted last.
const POSTGRES_APP_USER_OWNERSHIP_COLUMNS = [
  { table: 'onsite_results', column: 'runner_user_id' },
  { table: 'check_ins', column: 'runner_user_id' },
  { table: 'bib_assignments', column: 'runner_user_id' },
  { table: 'certificates', column: 'runner_user_id' },
  { table: 'submissions_core', column: 'runner_user_id' },
  { table: 'rankings', column: 'runner_user_id' },
  { table: 'organisers', column: 'app_user_id' },
  { table: 'policy_consents', column: 'app_user_id' }
];

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function isMissingTableOrColumnError(error) {
  const code = String(error?.code || '');
  return code === '42P01' || code === '42703'; // undefined_table / undefined_column
}

async function runIgnoringMissing(tx, sqlText, values) {
  try {
    await tx.unsafe(sqlText, values);
  } catch (error) {
    if (!isMissingTableOrColumnError(error)) throw error;
  }
}

// Clears every Postgres shadow row/reference tied to the given Mongo user IDs, in one
// transaction, before any MongoDB deletion happens.
async function purgePostgresUserData(mongoUserIds, options = {}) {
  if (!mongoUserIds.length) return;
  const sql = options.sql || getPostgresClient();

  await sql.begin(async (tx) => {
    let appUserIds = [];
    try {
      const rows = await tx.unsafe('select id from app_users where mongo_user_id = any($1)', [mongoUserIds]);
      appUserIds = rows.map((row) => row.id);
    } catch (error) {
      if (!isMissingTableOrColumnError(error)) throw error;
    }
    if (!appUserIds.length) return;

    // Orders/order_items: buyer_user_id is RESTRICT and order_items has no direct
    // app_users FK, so clear order_items via a subquery before deleting orders.
    await runIgnoringMissing(
      tx,
      'delete from order_items where order_id in (select id from orders where buyer_user_id = any($1))',
      [appUserIds]
    );
    await runIgnoringMissing(tx, 'delete from orders where buyer_user_id = any($1)', [appUserIds]);

    for (const { table, column } of POSTGRES_APP_USER_ACTOR_COLUMNS) {
      await runIgnoringMissing(
        tx,
        `update ${quoteIdentifier(table)} set ${quoteIdentifier(column)} = null where ${quoteIdentifier(column)} = any($1)`,
        [appUserIds]
      );
    }

    for (const { table, column } of POSTGRES_APP_USER_OWNERSHIP_COLUMNS) {
      await runIgnoringMissing(
        tx,
        `delete from ${quoteIdentifier(table)} where ${quoteIdentifier(column)} = any($1)`,
        [appUserIds]
      );
    }

    // registrations carries mongo_user_id directly, so this also catches rows even if
    // app_users sync never ran for this particular user.
    await runIgnoringMissing(tx, 'delete from registrations where mongo_user_id = any($1)', [mongoUserIds]);

    await runIgnoringMissing(tx, 'delete from app_users where id = any($1)', [appUserIds]);
  });
}

function addCounts(base, extra) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(extra || {})) {
    merged[key] = (merged[key] || 0) + (value || 0);
  }
  return merged;
}

const EMPTY_TEST_USER_SUMMARY = {
  usersDeleted: 0,
  registrationsDeleted: 0,
  submissionsDeleted: 0,
  accumulatedSubmissionsDeleted: 0,
  submissionIdempotencyKeysDeleted: 0,
  organiserApplicationsDeleted: 0,
  stravaConnectionsDeleted: 0,
  notificationsDeleted: 0,
  communicationLogsDeleted: 0,
  blogPostsDeleted: 0,
  blogCommentsDeleted: 0,
  blogLikesDeleted: 0,
  blogViewsDeleted: 0,
  blogRevisionsDeleted: 0,
  blogReportsDeleted: 0,
  runningGroupsDeleted: 0,
  runningGroupActivitiesDeleted: 0,
  eventPromotionsDeleted: 0,
  certificateTemplatesDeleted: 0,
  eventsDeleted: 0
};

// Deletes everything a set of test users own directly in MongoDB (not Postgres, not the
// Users themselves, not events they organize — those are handled by the caller). Exported
// so getTestUserCounts (read-only, via dry counting) and purgeTestUsers share one cascade
// definition.
async function cascadeDeleteOwnedMongoData(userIds) {
  if (!userIds.length) return { ...EMPTY_TEST_USER_SUMMARY };

  const testBlogs = await Blog.find({ authorId: { $in: userIds } }).select('_id').lean();
  const testBlogIds = testBlogs.map((blog) => blog._id);
  const testGroups = await RunningGroup.find({ createdBy: { $in: userIds } }).select('_id').lean();
  const testGroupIds = testGroups.map((group) => group._id);

  const [
    registrationsResult, submissionsResult, accumulatedResult, idempotencyKeysResult,
    applicationsResult, stravaResult, notificationsResult, communicationLogsResult,
    blogCommentsResult, blogLikesResult, blogViewsResult, blogRevisionsResult, blogReportsResult,
    runningGroupActivitiesResult, promotionsResult, certTemplatesResult
  ] = await Promise.all([
    Registration.deleteMany({ userId: { $in: userIds } }),
    Submission.deleteMany({ runnerId: { $in: userIds } }),
    AccumulatedActivitySubmission.deleteMany({ runnerId: { $in: userIds } }),
    SubmissionIdempotencyKey.deleteMany({ runnerId: { $in: userIds } }),
    OrganiserApplication.deleteMany({ userId: { $in: userIds } }),
    StravaConnection.deleteMany({ userId: { $in: userIds } }),
    Notification.deleteMany({ userId: { $in: userIds } }),
    CommunicationLog.deleteMany({ recipientUserId: { $in: userIds } }),
    BlogComment.deleteMany({ $or: [{ blogId: { $in: testBlogIds } }, { authorId: { $in: userIds } }] }),
    BlogLike.deleteMany({ $or: [{ blogId: { $in: testBlogIds } }, { userId: { $in: userIds } }] }),
    BlogView.deleteMany({ $or: [{ blogId: { $in: testBlogIds } }, { userId: { $in: userIds } }] }),
    BlogRevision.deleteMany({ postId: { $in: testBlogIds } }),
    BlogReport.deleteMany({ $or: [{ blogId: { $in: testBlogIds } }, { reporterId: { $in: userIds } }] }),
    RunningGroupActivity.deleteMany({ $or: [{ groupId: { $in: testGroupIds } }, { actorUserId: { $in: userIds } }] }),
    EventPromotion.deleteMany({ organizerId: { $in: userIds } }),
    CertificateTemplate.deleteMany({ organizerId: { $in: userIds } })
  ]);

  const blogsResult = await Blog.deleteMany({ authorId: { $in: userIds } });
  const runningGroupsResult = await RunningGroup.deleteMany({ createdBy: { $in: userIds } });

  return {
    usersDeleted: 0,
    registrationsDeleted: registrationsResult.deletedCount || 0,
    submissionsDeleted: submissionsResult.deletedCount || 0,
    accumulatedSubmissionsDeleted: accumulatedResult.deletedCount || 0,
    submissionIdempotencyKeysDeleted: idempotencyKeysResult.deletedCount || 0,
    organiserApplicationsDeleted: applicationsResult.deletedCount || 0,
    stravaConnectionsDeleted: stravaResult.deletedCount || 0,
    notificationsDeleted: notificationsResult.deletedCount || 0,
    communicationLogsDeleted: communicationLogsResult.deletedCount || 0,
    blogPostsDeleted: blogsResult.deletedCount || 0,
    blogCommentsDeleted: blogCommentsResult.deletedCount || 0,
    blogLikesDeleted: blogLikesResult.deletedCount || 0,
    blogViewsDeleted: blogViewsResult.deletedCount || 0,
    blogRevisionsDeleted: blogRevisionsResult.deletedCount || 0,
    blogReportsDeleted: blogReportsResult.deletedCount || 0,
    runningGroupsDeleted: runningGroupsResult.deletedCount || 0,
    runningGroupActivitiesDeleted: runningGroupActivitiesResult.deletedCount || 0,
    eventPromotionsDeleted: promotionsResult.deletedCount || 0,
    certificateTemplatesDeleted: certTemplatesResult.deletedCount || 0,
    eventsDeleted: 0
  };
}

// Nulls "acted on this row" references (never deletes the parent document — it may be
// real data). Submission.reviewedBy, AccumulatedActivitySubmission.reviewedBy,
// OrganiserApplication.reviewedBy, Registration.paymentProof.submittedBy/paymentReviewedBy,
// Event.approvedBy/archivedBy/deletedBy.
async function clearActorReferences(userIds) {
  if (!userIds.length) return;
  await Promise.all([
    Submission.updateMany({ reviewedBy: { $in: userIds } }, { $set: { reviewedBy: null } }),
    AccumulatedActivitySubmission.updateMany({ reviewedBy: { $in: userIds } }, { $set: { reviewedBy: null } }),
    OrganiserApplication.updateMany({ reviewedBy: { $in: userIds } }, { $set: { reviewedBy: null } }),
    Registration.updateMany({ 'paymentProof.submittedBy': { $in: userIds } }, { $set: { 'paymentProof.submittedBy': null } }),
    Registration.updateMany({ paymentReviewedBy: { $in: userIds } }, { $set: { paymentReviewedBy: null } }),
    Event.updateMany({ approvedBy: { $in: userIds } }, { $set: { approvedBy: null } }),
    Event.updateMany({ archivedBy: { $in: userIds } }, { $set: { archivedBy: null } }),
    Event.updateMany({ deletedBy: { $in: userIds } }, { $set: { deletedBy: null } })
  ]);
}

const EMPTY_TEST_USER_COUNTS = {
  users: 0,
  registrations: 0,
  submissions: 0,
  accumulatedSubmissions: 0,
  submissionIdempotencyKeys: 0,
  organiserApplications: 0,
  stravaConnections: 0,
  notifications: 0,
  communicationLogs: 0,
  blogPosts: 0,
  blogComments: 0,
  blogLikes: 0,
  blogViews: 0,
  blogRevisions: 0,
  blogReports: 0,
  runningGroups: 0,
  runningGroupActivities: 0,
  eventPromotions: 0,
  certificateTemplates: 0,
  events: 0
};

// Read-only counts for the admin confirmation UI (Mongo-only, same philosophy as
// getTestDataCounts — Postgres shadow rows are cleaned up transparently, not surfaced here).
async function getTestUserCounts(excludeUserId) {
  const userIds = await getTestUserIds(excludeUserId);
  if (!userIds.length) return { ...EMPTY_TEST_USER_COUNTS };

  const owned = await cascadeDeleteOwnedMongoDataDryRun(userIds);
  const organizedEvents = await Event.countDocuments({ organizerId: { $in: userIds } });

  return {
    users: userIds.length,
    registrations: owned.registrationsDeleted,
    submissions: owned.submissionsDeleted,
    accumulatedSubmissions: owned.accumulatedSubmissionsDeleted,
    submissionIdempotencyKeys: owned.submissionIdempotencyKeysDeleted,
    organiserApplications: owned.organiserApplicationsDeleted,
    stravaConnections: owned.stravaConnectionsDeleted,
    notifications: owned.notificationsDeleted,
    communicationLogs: owned.communicationLogsDeleted,
    blogPosts: owned.blogPostsDeleted,
    blogComments: owned.blogCommentsDeleted,
    blogLikes: owned.blogLikesDeleted,
    blogViews: owned.blogViewsDeleted,
    blogRevisions: owned.blogRevisionsDeleted,
    blogReports: owned.blogReportsDeleted,
    runningGroups: owned.runningGroupsDeleted,
    runningGroupActivities: owned.runningGroupActivitiesDeleted,
    eventPromotions: owned.eventPromotionsDeleted,
    certificateTemplates: owned.certificateTemplatesDeleted,
    events: organizedEvents
  };
}

// Count-only mirror of cascadeDeleteOwnedMongoData — same query shapes, countDocuments
// instead of deleteMany, so the preview never mutates anything.
async function cascadeDeleteOwnedMongoDataDryRun(userIds) {
  const testBlogIds = (await Blog.find({ authorId: { $in: userIds } }).select('_id').lean()).map((b) => b._id);
  const testGroupIds = (await RunningGroup.find({ createdBy: { $in: userIds } }).select('_id').lean()).map((g) => g._id);

  const [
    registrations, submissions, accumulated, idempotencyKeys, applications, strava,
    notifications, communicationLogs, blogComments, blogLikes, blogViews, blogRevisions,
    blogReports, blogPosts, runningGroups, runningGroupActivities, promotions, certTemplates
  ] = await Promise.all([
    Registration.countDocuments({ userId: { $in: userIds } }),
    Submission.countDocuments({ runnerId: { $in: userIds } }),
    AccumulatedActivitySubmission.countDocuments({ runnerId: { $in: userIds } }),
    SubmissionIdempotencyKey.countDocuments({ runnerId: { $in: userIds } }),
    OrganiserApplication.countDocuments({ userId: { $in: userIds } }),
    StravaConnection.countDocuments({ userId: { $in: userIds } }),
    Notification.countDocuments({ userId: { $in: userIds } }),
    CommunicationLog.countDocuments({ recipientUserId: { $in: userIds } }),
    BlogComment.countDocuments({ $or: [{ blogId: { $in: testBlogIds } }, { authorId: { $in: userIds } }] }),
    BlogLike.countDocuments({ $or: [{ blogId: { $in: testBlogIds } }, { userId: { $in: userIds } }] }),
    BlogView.countDocuments({ $or: [{ blogId: { $in: testBlogIds } }, { userId: { $in: userIds } }] }),
    BlogRevision.countDocuments({ postId: { $in: testBlogIds } }),
    BlogReport.countDocuments({ $or: [{ blogId: { $in: testBlogIds } }, { reporterId: { $in: userIds } }] }),
    Blog.countDocuments({ authorId: { $in: userIds } }),
    RunningGroup.countDocuments({ createdBy: { $in: userIds } }),
    RunningGroupActivity.countDocuments({ $or: [{ groupId: { $in: testGroupIds } }, { actorUserId: { $in: userIds } }] }),
    EventPromotion.countDocuments({ organizerId: { $in: userIds } }),
    CertificateTemplate.countDocuments({ organizerId: { $in: userIds } })
  ]);

  return {
    registrationsDeleted: registrations,
    submissionsDeleted: submissions,
    accumulatedSubmissionsDeleted: accumulated,
    submissionIdempotencyKeysDeleted: idempotencyKeys,
    organiserApplicationsDeleted: applications,
    stravaConnectionsDeleted: strava,
    notificationsDeleted: notifications,
    communicationLogsDeleted: communicationLogs,
    blogPostsDeleted: blogPosts,
    blogCommentsDeleted: blogComments,
    blogLikesDeleted: blogLikes,
    blogViewsDeleted: blogViews,
    blogRevisionsDeleted: blogRevisions,
    blogReportsDeleted: blogReports,
    runningGroupsDeleted: runningGroups,
    runningGroupActivitiesDeleted: runningGroupActivities,
    eventPromotionsDeleted: promotions,
    certificateTemplatesDeleted: certTemplates
  };
}

// Permanently deletes every test-fixture User (@example.com, non-admin, excluding the
// acting admin) plus everything they own in MongoDB and Postgres, including events they
// organize (reusing the isTestData purge's event cascade). Irreversible.
async function purgeTestUsers({ actorUserId, ipAddress, userAgent, sql } = {}) {
  const userIds = await getTestUserIds(actorUserId);
  if (!userIds.length) return { ...EMPTY_TEST_USER_SUMMARY };

  const mongoUserIds = userIds.map((id) => String(id));

  // Postgres first and fully transactional: if it fails, abort before any Mongo writes.
  await purgePostgresUserData(mongoUserIds, { sql });

  const organizedEvents = await Event.find({ organizerId: { $in: userIds } }).select('_id').lean();
  const organizedEventIds = organizedEvents.map((event) => event._id);
  let eventCascadeSummary = { eventsDeleted: 0, registrationsDeleted: 0, submissionsDeleted: 0, accumulatedSubmissionsDeleted: 0, promotionsDeleted: 0, certificateTemplatesDeleted: 0 };
  if (organizedEventIds.length) {
    await purgePostgresShadowData(organizedEventIds.map(String), { sql });
    eventCascadeSummary = await cascadeDeleteEventsMongo(organizedEventIds);
  }

  await clearActorReferences(userIds);
  const owned = await cascadeDeleteOwnedMongoData(userIds);

  const usersResult = await User.deleteMany({ _id: { $in: userIds } });

  const summary = addCounts(owned, {
    usersDeleted: usersResult.deletedCount || 0,
    registrationsDeleted: eventCascadeSummary.registrationsDeleted,
    submissionsDeleted: eventCascadeSummary.submissionsDeleted,
    accumulatedSubmissionsDeleted: eventCascadeSummary.accumulatedSubmissionsDeleted,
    eventPromotionsDeleted: eventCascadeSummary.promotionsDeleted,
    certificateTemplatesDeleted: eventCascadeSummary.certificateTemplatesDeleted,
    eventsDeleted: eventCascadeSummary.eventsDeleted
  });

  criticalAuditService.recordCriticalAuditEventInBackground({
    actorMongoUserId: actorUserId,
    action: 'admin.test_users.purged',
    targetType: 'test_user_purge',
    targetId: 'bulk',
    notes: JSON.stringify(summary),
    ipAddress,
    userAgent,
    occurredAt: new Date()
  });

  return summary;
}

module.exports = {
  getTestUserCounts,
  purgeTestUsers,
  purgePostgresUserData,
  TEST_USER_EMAIL_PATTERN,
  POSTGRES_APP_USER_ACTOR_COLUMNS,
  POSTGRES_APP_USER_OWNERSHIP_COLUMNS
};
