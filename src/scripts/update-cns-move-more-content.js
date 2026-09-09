'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const CertificateTemplate = require('../models/CertificateTemplate');
const { invalidateLeaderboardCache } = require('../services/leaderboard.service');
const { syncAppUserFromMongoUser } = require('../services/user-bridge.service');
const { syncEventShadow } = require('../services/event-shadow.service');
const { syncRegistrationPaymentShadow } = require('../services/registration-payment-shadow.service');
const { syncSubmissionShadow } = require('../services/submission-shadow.service');
const { recordCriticalAuditEvent } = require('../services/critical-audit.service');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const {
  SLUG,
  buildCnsMoveMoreChallengeEventPayload,
  DATES,
  RACE_CATEGORIES
} = require('../content/events/cns-move-more-challenge-2026');

const APPLY = process.argv.includes('--apply');
const TEST_RUN_ID = 'cns-leaderboard-demo-v1';
const EXPECTED_INITIAL = Object.freeze({ registrations: 10, activities: 7, demoRegistrations: 15, demoActivities: 15 });
const EARLY_REVIEW_NOTE = 'Event schedule updated: this activity predates the official September 14, 2026 start. A coordinator must manually approve an exception before it counts.';
const CATEGORY = RACE_CATEGORIES[0];
const LEGACY_CERTIFICATE_BODY = 'This certifies that {{runnerName}} completed the CNS Move More Challenge 2026, {{eventTitle}}, through consistent movement and effort.';
const OFFICIAL_FINISHER_CERTIFICATE_BODY = 'Completed the {{goalDistance}} goal at {{eventTitle}} with {{verifiedDistance}} verified.';

const EVENT_UPDATE_FIELDS = [
  'title', 'shortTitle', 'organiserName', 'description', 'eventDetailsMarkdown', 'posterImageUrl', 'status', 'eventType', 'eventTypesAllowed',
  'raceDistances', 'raceCategories', 'registrationOpenAt', 'registrationCloseAt', 'publicListingAvailableAt', 'eventStartAt',
  'eventEndAt', 'virtualWindow', 'venueName', 'awardingAt', 'awardingVenue', 'proofTypesAllowed', 'requireActivityScreenshot',
  'requireTrackingAppDevice', 'suppressDailyGuidance', 'virtualCompletionMode', 'challengeMetrics', 'primaryChallengeMetric', 'targetDistanceKm', 'targetSteps',
  'minimumActivityDistanceKm', 'acceptedRunTypes', 'finalSubmissionDeadlineAt', 'milestoneDistancesKm', 'recognitionMode',
  'leaderboardMode', 'awardSettings', 'participationCertificateEnabled', 'noActivityCertificateEnabled', 'requiredRegistrationFields',
  'feeMode', 'feeAmount', 'feeCurrency', 'pricingMode', 'digitalBadgeEnabled', 'digitalCertificateEnabled',
  'leaderboardRecognitionEnabled', 'leaderboardSettings', 'physicalRewardsEnabled', 'internationalRunnersAllowed', 'galleryImageUrls'
];

function selectEventUpdate(payload) {
  return Object.fromEntries(EVENT_UPDATE_FIELDS.map((key) => [key, payload[key]]));
}

function comparableEventValue(value) {
  return JSON.stringify(value, (key, item) => (key === '_id' ? undefined : item));
}

function isPostMigration(counts) {
  return counts.registrations === EXPECTED_INITIAL.registrations && counts.activities === EXPECTED_INITIAL.activities
    && counts.demoRegistrations === 0 && counts.demoActivities === 0;
}

function assertExpectedCounts(counts) {
  const initial = Object.keys(EXPECTED_INITIAL).every((key) => counts[key] === EXPECTED_INITIAL[key]);
  if (!initial && !isPostMigration(counts)) {
    throw new Error(`Unexpected live CNS record counts; review before applying: ${JSON.stringify(counts)}`);
  }
}

function assertExpectedRecordShape(counts, registrations, activities) {
  const registrationCategories = registrations.reduce((result, row) => {
    const key = String(row.raceDistance || '');
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  const activityCategories = activities.reduce((result, row) => {
    const key = String(row.raceDistance || '');
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  const statusCounts = activities.reduce((result, row) => {
    const key = String(row.status || '');
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  const registrationIds = new Set(registrations.map((row) => String(row._id)));
  if (activities.some((row) => !registrationIds.has(String(row.registrationId)))) {
    throw new Error('Unexpected CNS activity without a legitimate event registration.');
  }
  if (activities.some((row) => new Date(row.runDate) >= DATES.activityStartAt)) {
    throw new Error('Expected all seven legacy CNS activities to predate the official activity window.');
  }
  if (counts.demoRegistrations === EXPECTED_INITIAL.demoRegistrations) {
    if (Object.keys(registrationCategories).length !== 2 || registrationCategories['50K'] !== 6 || registrationCategories['25K'] !== 4
      || Object.keys(activityCategories).length !== 2 || activityCategories['25K'] !== 6 || activityCategories['50K'] !== 1
      || Object.keys(statusCounts).length !== 2 || statusCounts.approved !== 6 || statusCounts.submitted !== 1) {
      throw new Error(`Unexpected pre-migration CNS record shape: ${JSON.stringify({ registrationCategories, activityCategories, statusCounts })}`);
    }
  } else if (registrations.some((row) => row.raceDistance !== '50K')
    || activities.some((row) => row.raceDistance !== '50K' || row.status !== 'needs_clarification')) {
    throw new Error('Post-migration CNS records are not in the expected single-category review state.');
  }
}

function inferLegacyTrackingAppDevice(activity) {
  const detected = String(activity.ocrData?.detectedSource || '').trim().toLowerCase();
  if (detected && detected !== 'unknown') return detected.charAt(0).toUpperCase() + detected.slice(1);
  return 'Legacy submission — tracker not recorded';
}

async function assertShadowSchemaReady() {
  const sql = getPostgresClient();
  const rows = await sql`
    select pg_get_constraintdef(oid) as definition
    from pg_constraint
    where conrelid = 'submissions_core'::regclass
      and conname in ('submissions_core_submission_status_check', 'submissions_core_run_type_check')
  `;
  const definitions = rows.map((row) => String(row.definition || '')).join('\n');
  if (!definitions.includes('needs_clarification') || !definitions.includes('treadmill')) {
    throw new Error('PostgreSQL shadow schema is not ready. Apply migration 026 before the CNS event migration.');
  }
}

async function getCounts(eventId) {
  const [registrations, activities, demoRegistrations, demoActivities] = await Promise.all([
    Registration.countDocuments({ eventId, testRunId: { $ne: TEST_RUN_ID } }),
    AccumulatedActivitySubmission.countDocuments({ eventId, testRunId: { $ne: TEST_RUN_ID } }),
    Registration.collection.countDocuments({ eventId, testRunId: TEST_RUN_ID }),
    AccumulatedActivitySubmission.collection.countDocuments({ eventId, testRunId: TEST_RUN_ID })
  ]);
  return { registrations, activities, demoRegistrations, demoActivities };
}

async function writeBackup(event, registrations, activities, demoRegistrations, demoActivities, certificateTemplates) {
  const backupDir = path.resolve(__dirname, '../../tmp/cns-migration-backups');
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${SLUG}-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ createdAt: new Date(), event, registrations, activities, demoRegistrations, demoActivities, certificateTemplates }, null, 2), { mode: 0o600, flag: 'wx' });
  return backupPath;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const event = await Event.findOne({ slug: SLUG, isDeleted: { $ne: true } });
  if (!event) throw new Error(`Event not found: ${SLUG}`);
  const countsBefore = await getCounts(event._id);
  assertExpectedCounts(countsBefore);

  const legitimateFilter = { eventId: event._id, testRunId: { $ne: TEST_RUN_ID } };
  const [registrations, activities, demoRegistrations, demoActivities, certificateTemplates] = await Promise.all([
    Registration.find(legitimateFilter).lean(),
    AccumulatedActivitySubmission.find(legitimateFilter).lean(),
    Registration.collection.find({ eventId: event._id, testRunId: TEST_RUN_ID }).toArray(),
    AccumulatedActivitySubmission.collection.find({ eventId: event._id, testRunId: TEST_RUN_ID }).toArray(),
    CertificateTemplate.find({ eventId: event._id }).lean()
  ]);
  if (certificateTemplates.length !== 1
    || ![LEGACY_CERTIFICATE_BODY, OFFICIAL_FINISHER_CERTIFICATE_BODY].includes(String(certificateTemplates[0].content?.bodyText || ''))) {
    throw new Error('Unexpected CNS certificate template; review it before applying the migration.');
  }
  const earlyActivities = activities.filter((activity) => new Date(activity.runDate) < DATES.activityStartAt);
  assertExpectedRecordShape(countsBefore, registrations, activities);
  const payload = buildCnsMoveMoreChallengeEventPayload({ organizerId: event.organizerId, approvedBy: event.approvedBy || event.organizerId, referenceCode: event.referenceCode, now: event.approvedAt || new Date() });

  const preview = {
    mode: APPLY ? 'apply' : 'dry-run',
    slug: event.slug,
    countsBefore,
    eventWillChange: EVENT_UPDATE_FIELDS.some((key) => comparableEventValue(event.get(key)) !== comparableEventValue(payload[key])),
    registrationsToMap: registrations.filter((row) => row.raceDistance !== '50K' || row.pricingSnapshot?.raceCategoryId !== CATEGORY.categoryId).length,
    activitiesToMap: activities.filter((row) => row.raceDistance !== '50K').length,
    earlyActivitiesToRequeue: earlyActivities.filter((row) => row.status !== 'needs_clarification' || row.reviewNotes !== EARLY_REVIEW_NOTE).length,
    certificateTemplateWillChange: certificateTemplates[0].content?.bodyText !== OFFICIAL_FINISHER_CERTIFICATE_BODY,
    demoRegistrationsToRemove: countsBefore.demoRegistrations,
    demoActivitiesToRemove: countsBefore.demoActivities,
    mutationApplied: false
  };
  if (!APPLY) {
    console.log(JSON.stringify(preview, null, 2));
    return;
  }
  const needsMutation = preview.eventWillChange || preview.registrationsToMap || preview.activitiesToMap
    || preview.earlyActivitiesToRequeue || preview.certificateTemplateWillChange || preview.demoRegistrationsToRemove || preview.demoActivitiesToRemove;
  await assertShadowSchemaReady();

  let backupPath = null;
  if (needsMutation) {
    backupPath = await writeBackup(event.toObject(), registrations, activities, demoRegistrations, demoActivities, certificateTemplates);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Event.updateOne({ _id: event._id }, { $set: selectEventUpdate(payload) }, { session, runValidators: true });
        await Registration.updateMany(legitimateFilter, { $set: {
          raceDistance: '50K',
          'pricingSnapshot.raceCategoryId': CATEGORY.categoryId,
          'pricingSnapshot.raceCategoryName': CATEGORY.name,
          'pricingSnapshot.raceCategoryType': CATEGORY.type,
          'pricingSnapshot.raceDistance': '50K',
          'accumulatedCertificateFinalization.state': '',
          'accumulatedCertificateFinalization.activityId': null,
          'accumulatedCertificateFinalization.certificateNumber': '',
          'accumulatedCertificateFinalization.lockedAt': null,
          'accumulatedCertificateFinalization.finalizedAt': null,
          'accumulatedCertificateFinalization.lastAttemptAt': null,
          'accumulatedCertificateFinalization.error': ''
        } }, { session, runValidators: true });
        await AccumulatedActivitySubmission.bulkWrite(activities.map((activity) => ({
          updateOne: {
            filter: { _id: activity._id, eventId: event._id },
            update: { $set: {
              raceDistance: '50K',
              trackingAppDevice: String(activity.trackingAppDevice || '').trim() || inferLegacyTrackingAppDevice(activity)
            } }
          }
        })), { session });
        await AccumulatedActivitySubmission.updateMany({ ...legitimateFilter, runDate: { $lt: DATES.activityStartAt } }, { $set: {
          status: 'needs_clarification',
          reviewNotes: EARLY_REVIEW_NOTE,
          'certificate.type': '',
          'certificate.status': '',
          'certificate.revokedAt': null,
          'certificate.finalizedAt': null
        } }, { session, runValidators: true });
        await CertificateTemplate.updateOne({ _id: certificateTemplates[0]._id, eventId: event._id }, { $set: {
          name: 'CNS Wellness In Motion Certificate',
          'content.heading': 'Certificate of Completion',
          'content.bodyText': OFFICIAL_FINISHER_CERTIFICATE_BODY
        } }, { session, runValidators: true });
        await Registration.collection.deleteMany({ eventId: event._id, testRunId: TEST_RUN_ID }, { session });
        await AccumulatedActivitySubmission.collection.deleteMany({ eventId: event._id, testRunId: TEST_RUN_ID }, { session });
      });
    } finally {
      await session.endSession();
    }
  }

  const updatedEvent = await Event.findById(event._id);
  const updatedRegistrations = await Registration.find({ eventId: event._id, testRunId: { $ne: TEST_RUN_ID } });
  const updatedActivities = await AccumulatedActivitySubmission.find({ eventId: event._id, testRunId: { $ne: TEST_RUN_ID } });
  const referencedUserIds = [...new Set([
    ...updatedRegistrations.map((registration) => registration.userId),
    ...updatedActivities.flatMap((activity) => [activity.runnerId, activity.reviewedBy])
  ].filter(Boolean).map(String))];
  const referencedUsers = await User.find({ _id: { $in: referencedUserIds } });
  if (referencedUsers.length !== referencedUserIds.length) {
    throw new Error(`CNS migration cannot reconcile shadows: expected ${referencedUserIds.length} referenced MongoDB users, found ${referencedUsers.length}.`);
  }
  for (const user of referencedUsers) await syncAppUserFromMongoUser(user, { operation: 'repair' });
  await syncEventShadow(updatedEvent, { operation: 'repair' });
  for (const registration of updatedRegistrations) await syncRegistrationPaymentShadow(registration, { operation: 'repair' });
  for (const activity of updatedActivities) await syncSubmissionShadow(activity, { operation: 'repair' });
  await invalidateLeaderboardCache(SLUG);
  const countsAfter = await getCounts(event._id);
  if (!isPostMigration(countsAfter)) throw new Error(`CNS migration verification failed: ${JSON.stringify(countsAfter)}`);
  const updatedTemplate = await CertificateTemplate.findOne({ eventId: event._id }).select('content.bodyText').lean();
  if (updatedTemplate?.content?.bodyText !== OFFICIAL_FINISHER_CERTIFICATE_BODY) {
    throw new Error('CNS migration verification failed for the certificate template.');
  }
  await recordCriticalAuditEvent({
    actorMongoUserId: event.approvedBy || event.organizerId,
    action: 'event.cns_wellness_migrated',
    targetType: 'event',
    targetId: String(event._id),
    notes: JSON.stringify({ countsBefore, countsAfter, backupPath, earlyActivitiesRequeued: earlyActivities.length }),
    idempotencyKey: `event:cns-wellness-migration:${event._id}`
  });
  console.log(JSON.stringify({ ...preview, backupPath, countsAfter, mutationApplied: Boolean(needsMutation), shadowReconciliationApplied: true }, null, 2));
}

if (require.main === module) {
  main().catch((error) => { console.error(error?.stack || error); process.exitCode = 1; })
    .finally(async () => {
      await closePostgresClient().catch(() => {});
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}

module.exports = { selectEventUpdate, comparableEventValue, assertExpectedCounts, assertExpectedRecordShape, inferLegacyTrackingAppDevice, assertShadowSchemaReady, isPostMigration, EARLY_REVIEW_NOTE, EXPECTED_INITIAL };
