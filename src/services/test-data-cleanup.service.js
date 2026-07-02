'use strict';

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const EventPromotion = require('../models/EventPromotion');
const CertificateTemplate = require('../models/CertificateTemplate');
const User = require('../models/User');
const { getPostgresClient } = require('../db/postgres');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');

// Postgres tables that reference events_core (directly or via event_core_id/event_id),
// in FK-safe delete order. Mirrors the ordering approach in
// src/scripts/cleanup-smoke-tests.js's POSTGRES_TABLES, but scoped to event linkage
// (isTestData events never carried isSmokeTest/testRunId, so that script's filter
// doesn't reach them).
// `viaEventCoreId: true` means the column holds an events_core.id (uuid); resolve those
// first from the mongo_event_id list. `false` means the column holds a mongo_event_id
// (text) directly.
const POSTGRES_EVENT_TABLES = [
  { table: 'certificate_audit_logs', column: 'event_id', viaEventCoreId: true },
  { table: 'badge_audit_logs', column: 'event_core_id', viaEventCoreId: true },
  { table: 'user_badges', column: 'event_core_id', viaEventCoreId: true },
  { table: 'event_badges', column: 'event_core_id', viaEventCoreId: true },
  { table: 'badge_progress', column: 'event_core_id', viaEventCoreId: true },
  { table: 'onsite_results', column: 'event_core_id', viaEventCoreId: true },
  { table: 'result_imports', column: 'event_core_id', viaEventCoreId: true },
  { table: 'check_ins', column: 'event_core_id', viaEventCoreId: true },
  { table: 'bib_assignments', column: 'event_core_id', viaEventCoreId: true },
  { table: 'race_kits', column: 'event_core_id', viaEventCoreId: true },
  // certificates/submissions_core have no ON DELETE action on event_id (RESTRICT-like),
  // and certificates.submission_id/registration_id are also RESTRICT-like, so they must
  // be gone before submissions_core and registrations are deleted below.
  { table: 'certificates', column: 'event_id', viaEventCoreId: true },
  { table: 'submissions_core', column: 'event_id', viaEventCoreId: true },
  { table: 'rankings', column: 'event_core_id', viaEventCoreId: true },
  // registrations/event_distances/event_categories carry mongo_event_id directly.
  { table: 'registrations', column: 'mongo_event_id', viaEventCoreId: false },
  { table: 'event_distances', column: 'mongo_event_id', viaEventCoreId: false },
  { table: 'event_categories', column: 'mongo_event_id', viaEventCoreId: false }
  // events_core itself is deleted last, outside this list, once every table above is clear.
  // `payments` cascades automatically off `registrations` (ON DELETE CASCADE) and needs no
  // explicit row here.
];

function isMissingTableOrColumnError(error) {
  const code = String(error?.code || '');
  return code === '42P01' || code === '42703'; // undefined_table / undefined_column
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function deletePostgresRows(tx, table, column, ids) {
  if (!ids.length) return;
  try {
    await tx.unsafe(
      `delete from ${quoteIdentifier(table)} where ${quoteIdentifier(column)} = any($1)`,
      [ids]
    );
  } catch (error) {
    if (isMissingTableOrColumnError(error)) return;
    throw error;
  }
}

// Removes every Postgres shadow row tied to the given Mongo event IDs, in one
// transaction, before any MongoDB deletion happens — if this fails, nothing is deleted
// anywhere, so we never end up with Postgres rows referencing an Event that Mongo has
// already forgotten.
async function purgePostgresShadowData(mongoEventIds) {
  if (!mongoEventIds.length) return;
  const sql = getPostgresClient();

  await sql.begin(async (tx) => {
    let eventCoreIds = [];
    try {
      const rows = await tx.unsafe(
        'select id from events_core where mongo_event_id = any($1)',
        [mongoEventIds]
      );
      eventCoreIds = rows.map((row) => row.id);
    } catch (error) {
      if (!isMissingTableOrColumnError(error)) throw error;
    }

    for (const { table, column, viaEventCoreId } of POSTGRES_EVENT_TABLES) {
      const ids = viaEventCoreId ? eventCoreIds : mongoEventIds;
      await deletePostgresRows(tx, table, column, ids);
    }

    await deletePostgresRows(tx, 'events_core', 'id', eventCoreIds);
  });
}

async function getTestDataEventIds() {
  const events = await Event.find({ isTestData: true }).select('_id').lean();
  return events.map((event) => event._id);
}

// Read-only counts for the admin confirmation UI. Mongo-only — these are the numbers an
// admin recognizes; Postgres/Supabase shadow rows are cleaned up transparently as part of
// the same purge and aren't surfaced separately here.
async function getTestDataCounts() {
  const eventIds = await getTestDataEventIds();
  if (!eventIds.length) {
    return {
      events: 0,
      registrations: 0,
      submissions: 0,
      accumulatedSubmissions: 0,
      promotions: 0,
      certificateTemplates: 0
    };
  }

  const [registrations, submissions, accumulatedSubmissions, promotions, certificateTemplates] = await Promise.all([
    Registration.countDocuments({ eventId: { $in: eventIds } }),
    Submission.countDocuments({ eventId: { $in: eventIds } }),
    AccumulatedActivitySubmission.countDocuments({ eventId: { $in: eventIds } }),
    EventPromotion.countDocuments({ eventId: { $in: eventIds } }),
    CertificateTemplate.countDocuments({ eventId: { $in: eventIds } })
  ]);

  return {
    events: eventIds.length,
    registrations,
    submissions,
    accumulatedSubmissions,
    promotions,
    certificateTemplates
  };
}

// Permanently deletes every Event flagged isTestData plus everything that hangs off it,
// in both MongoDB and the Postgres/Supabase shadow tables. Irreversible.
async function purgeTestData({ actorUserId, ipAddress, userAgent } = {}) {
  const eventIds = await getTestDataEventIds();
  const emptySummary = {
    eventsDeleted: 0,
    registrationsDeleted: 0,
    submissionsDeleted: 0,
    accumulatedSubmissionsDeleted: 0,
    promotionsDeleted: 0,
    certificateTemplatesDeleted: 0
  };
  if (!eventIds.length) return emptySummary;

  const mongoEventIds = eventIds.map((id) => String(id));

  // Postgres first and fully transactional: if it fails, abort before any Mongo writes.
  await purgePostgresShadowData(mongoEventIds);

  const [registrationsResult, submissionsResult, accumulatedResult, promotionsResult, certTemplatesResult] = await Promise.all([
    Registration.deleteMany({ eventId: { $in: eventIds } }),
    Submission.deleteMany({ eventId: { $in: eventIds } }),
    AccumulatedActivitySubmission.deleteMany({ eventId: { $in: eventIds } }),
    EventPromotion.deleteMany({ eventId: { $in: eventIds } }),
    CertificateTemplate.deleteMany({ eventId: { $in: eventIds } })
  ]);
  await User.updateMany(
    { savedEvents: { $in: eventIds } },
    { $pull: { savedEvents: { $in: eventIds } } }
  );
  const eventsResult = await Event.deleteMany({ _id: { $in: eventIds } });

  const summary = {
    eventsDeleted: eventsResult.deletedCount || 0,
    registrationsDeleted: registrationsResult.deletedCount || 0,
    submissionsDeleted: submissionsResult.deletedCount || 0,
    accumulatedSubmissionsDeleted: accumulatedResult.deletedCount || 0,
    promotionsDeleted: promotionsResult.deletedCount || 0,
    certificateTemplatesDeleted: certTemplatesResult.deletedCount || 0
  };

  recordCriticalAuditEventInBackground({
    actorMongoUserId: actorUserId,
    action: 'admin.test_data.purged',
    targetType: 'test_data_purge',
    targetId: 'bulk',
    notes: JSON.stringify(summary),
    ipAddress,
    userAgent,
    occurredAt: new Date()
  });

  return summary;
}

module.exports = {
  getTestDataCounts,
  purgeTestData,
  POSTGRES_EVENT_TABLES
};
