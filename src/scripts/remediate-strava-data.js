'use strict';

require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const StravaConnection = require('../models/StravaConnection');
const StravaRemediationReceipt = require('../models/StravaRemediationReceipt');
const SubmissionRemediationGrant = require('../models/SubmissionRemediationGrant');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const uploadService = require('../services/upload.service');
const stravaService = require('../services/strava.service');
const communicationService = require('../services/communication.service');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const { invalidateLeaderboardCache } = require('../services/leaderboard.service');
const { syncEventRankingsInBackground } = require('../services/submission.service');
const {
  refreshAccumulatedChallengeProgress,
  refreshGlobalDistanceMilestoneProgress
} = require('../services/badge-progress.service');
const { reconcileAccumulatedCertificateAfterReview } = require('../services/accumulated-activity.service');

const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

async function ensureRecoveryGrant(receipt) {
  if (!receipt.registrationId || !receipt.eventId || !receipt.userId) return null;
  return SubmissionRemediationGrant.findOneAndUpdate(
    { receiptId: receipt._id },
    {
      $setOnInsert: {
        receiptId: receipt._id,
        userId: receipt.userId,
        registrationId: receipt.registrationId,
        eventId: receipt.eventId,
        slotsRemaining: 1,
        expiresAt: new Date(Date.now() + RECOVERY_WINDOW_MS)
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function parseArguments(argv = process.argv.slice(2)) {
  const flags = new Set(argv);
  const allowed = new Set(['--dry-run', '--apply']);
  const unknown = argv.filter((arg) => !allowed.has(arg));
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(', ')}`);
  if (flags.has('--dry-run') && flags.has('--apply')) throw new Error('Choose --dry-run or --apply.');
  return { mode: flags.has('--apply') ? 'apply' : 'dry-run' };
}

function getTargetFingerprint() {
  const target = [
    String(process.env.MONGODB_URI || '').replace(/\/\/[^@/]+@/, '//[credentials]@'),
    String(process.env.DATABASE_URL || '').replace(/\/\/[^@/]+@/, '//[credentials]@'),
    String(process.env.R2_ENDPOINT || ''),
    String(process.env.R2_BUCKET || '')
  ].join('|');
  return crypto.createHash('sha256').update(target).digest('hex').slice(0, 16);
}

function assertApplyApproval(before) {
  const expectedCount = Number.parseInt(process.env.STRAVA_REMEDIATION_APPROVED_COUNT, 10);
  const actualCount = Number(before.standardRecords || 0) + Number(before.accumulatedRecords || 0);
  if (process.env.STRAVA_REMEDIATION_APPROVED !== 'yes') {
    throw new Error('Set STRAVA_REMEDIATION_APPROVED=yes only after reviewing the dry-run report.');
  }
  if (!Number.isSafeInteger(expectedCount) || expectedCount !== actualCount) {
    throw new Error(`STRAVA_REMEDIATION_APPROVED_COUNT must equal the reviewed dry-run record count (${actualCount}).`);
  }
  if (String(process.env.STRAVA_REMEDIATION_TARGET_FINGERPRINT || '') !== getTargetFingerprint()) {
    throw new Error('STRAVA_REMEDIATION_TARGET_FINGERPRINT must match the current dry-run target fingerprint.');
  }
}

async function inventory() {
  const [standard, accumulated, connectionCount, duplicateConnections, pendingReceipts] = await Promise.all([
    Submission.collection.find({ source: 'strava' }).project({ status: 1, eventId: 1, runnerId: 1, certificate: 1 }).toArray(),
    AccumulatedActivitySubmission.collection.find({ source: 'strava' }).project({ status: 1, eventId: 1, runnerId: 1, certificate: 1 }).toArray(),
    StravaConnection.collection.countDocuments({}),
    StravaConnection.collection.aggregate([
      { $group: { _id: '$stravaAthleteId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'groups' }
    ]).toArray(),
    StravaRemediationReceipt.countDocuments({ 'cleanup.mongoRecordDeleted': false })
  ]);
  const records = [...standard, ...accumulated];
  return {
    targetFingerprint: getTargetFingerprint(),
    standardRecords: standard.length,
    accumulatedRecords: accumulated.length,
    affectedConnections: connectionCount,
    affectedUsers: new Set(records.map((row) => String(row.runnerId || '')).filter(Boolean)).size,
    affectedEvents: new Set(records.map((row) => String(row.eventId || '')).filter(Boolean)).size,
    approvedRecords: records.filter((row) => row.status === 'approved').length,
    issuedCertificates: records.filter((row) => Boolean(row.certificate?.issuedAt || row.certificate?.url)).length,
    duplicateAthleteGroups: Number(duplicateConnections[0]?.groups || 0),
    pendingReceipts
  };
}

async function scrubRecord(raw, sourceKind, context) {
  const sourceRecordId = String(raw._id);
  const receipt = await StravaRemediationReceipt.findOneAndUpdate(
    { sourceRecordId },
    {
      $setOnInsert: {
        sourceRecordId,
        sourceKind,
        userId: raw.runnerId,
        registrationId: raw.registrationId || null,
        eventId: raw.eventId || null,
        previousHelloRunStatus: String(raw.status || '')
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const certificateKeys = new Set([String(raw.certificate?.key || '').trim()].filter((key) => key && key !== 'inline'));
  let badgesRevoked = Number(receipt.cleanup?.badgesRevoked || 0);

  if (process.env.DATABASE_URL) {
    await context.sql.begin(async (sql) => {
      const cores = await sql`SELECT id FROM submissions_core WHERE mongo_submission_id = ${sourceRecordId}`;
      if (cores[0]) {
        const certificates = await sql`SELECT certificate_key FROM certificates WHERE submission_id = ${cores[0].id}`;
        certificates.forEach((row) => { if (row.certificate_key && row.certificate_key !== 'inline') certificateKeys.add(row.certificate_key); });
        const revoked = await sql`
          UPDATE user_badges
          SET verification_status = 'revoked',
              revoke_reason = '[strava-remediation] Provider-derived submission removed',
              is_featured = false
          WHERE mongo_submission_id = ${sourceRecordId}
            AND verification_status != 'revoked'
          RETURNING id
        `;
        badgesRevoked += revoked.length;
        await sql`DELETE FROM rankings WHERE mongo_submission_id = ${sourceRecordId}`;
        await sql`DELETE FROM certificates WHERE submission_id = ${cores[0].id}`;
        await sql`DELETE FROM submissions_core WHERE id = ${cores[0].id}`;
      } else {
        await sql`DELETE FROM rankings WHERE mongo_submission_id = ${sourceRecordId}`;
      }
    });
  }

  if (certificateKeys.size) await uploadService.deleteObjects([...certificateKeys]);
  const collection = sourceKind === 'standard' ? Submission.collection : AccumulatedActivitySubmission.collection;
  await collection.deleteOne({ _id: raw._id, source: 'strava' });

  receipt.cleanup = {
    certificateObjectDeleted: true,
    postgresRowsDeleted: true,
    badgesRevoked,
    mongoRecordDeleted: true
  };
  receipt.scrubbedAt = new Date();
  await receipt.save();

  await ensureRecoveryGrant(receipt);

  context.affectedUsers.add(String(raw.runnerId || ''));
  context.affectedEvents.add(String(raw.eventId || ''));
  context.affectedRegistrations.add(String(raw.registrationId || ''));
  return receipt;
}

async function resumeInterruptedReceipts(context) {
  const pending = await StravaRemediationReceipt.find({ scrubbedAt: null });
  let resumed = 0;
  for (const receipt of pending) {
    const collection = receipt.sourceKind === 'standard' ? Submission.collection : AccumulatedActivitySubmission.collection;
    const sourceStillExists = await collection.findOne({
      _id: new mongoose.Types.ObjectId(receipt.sourceRecordId),
      source: 'strava'
    }, { projection: { _id: 1 } });
    if (sourceStillExists) continue;

    receipt.cleanup = {
      certificateObjectDeleted: true,
      postgresRowsDeleted: true,
      badgesRevoked: Number(receipt.cleanup?.badgesRevoked || 0),
      mongoRecordDeleted: true
    };
    receipt.scrubbedAt = new Date();
    await receipt.save();
    await ensureRecoveryGrant(receipt);
    context.affectedUsers.add(String(receipt.userId || ''));
    context.affectedEvents.add(String(receipt.eventId || ''));
    context.affectedRegistrations.add(String(receipt.registrationId || ''));
    resumed += 1;
  }
  return resumed;
}

async function notifyReceipt(receipt) {
  if (receipt.notifiedAt || !receipt.userId) return false;
  const [user, event, grant] = await Promise.all([
    User.findById(receipt.userId).select('firstName email').lean(),
    receipt.eventId ? Event.findById(receipt.eventId).select('title').lean() : null,
    SubmissionRemediationGrant.findOne({ receiptId: receipt._id }).lean()
  ]);
  if (!user) return false;
  const eventTitle = event?.title || 'your HelloRun activity';
  const actionPath = grant && receipt.registrationId
    ? `/my-registrations/${encodeURIComponent(String(receipt.registrationId))}/submit-result`
    : '/runner/submissions';
  await communicationService.notify('result.strava_remediation', {
    notification: {
      userId: user._id,
      type: 'result_strava_remediation',
      title: 'Connected activity record removed',
      message: grant
        ? `Upload permitted screenshot proof for ${eventTitle} within 30 days if you want the activity reconsidered.`
        : `Your connected-provider activity record for ${eventTitle} was removed.`,
      href: actionPath,
      dedupeKey: `strava-remediation:${receipt.sourceRecordId}`,
      metadata: { receiptId: String(receipt._id), recoveryExpiresAt: grant?.expiresAt || null }
    },
    email: user.email ? {
      to: user.email,
      recipientUserId: user._id,
      firstName: user.firstName,
      eventTitle,
      recoveryExpiresAt: grant?.expiresAt || null,
      actionPath,
      metadata: { receiptId: String(receipt._id) }
    } : null
  });
  receipt.notifiedAt = new Date();
  await receipt.save();
  return true;
}

async function disconnectDuplicateAthletes() {
  const groups = await StravaConnection.collection.aggregate([
    { $group: { _id: '$stravaAthleteId', userIds: { $push: '$userId' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  let disconnected = 0;
  for (const group of groups) {
    for (const userId of group.userIds) {
      await stravaService.disconnect(userId);
      disconnected += 1;
    }
  }
  return disconnected;
}

async function recalculate(context) {
  for (const registrationId of context.affectedRegistrations) {
    if (mongoose.Types.ObjectId.isValid(registrationId)) {
      const registration = await Registration.findById(registrationId);
      const event = registration ? await Event.findById(registration.eventId).lean() : null;
      const certificateActivities = await AccumulatedActivitySubmission.find({
        registrationId,
        'certificate.certificateNumber': { $ne: '' },
        'certificate.status': { $in: ['generated', 'regenerated'] }
      });
      for (const activity of certificateActivities) {
        const key = String(activity.certificate?.key || '').trim();
        if (key && key !== 'inline') await uploadService.deleteObjects([key]);
        await context.sql.begin(async (sql) => {
          const cores = await sql`SELECT id FROM submissions_core WHERE mongo_submission_id = ${String(activity._id)}`;
          if (cores[0]) await sql`DELETE FROM certificates WHERE submission_id = ${cores[0].id}`;
        });
        activity.certificate.status = 'revoked';
        activity.certificate.revokedAt = new Date();
        activity.certificate.url = '';
        activity.certificate.key = '';
        activity.certificate.generationError = 'Revoked and recalculated after connected-provider remediation.';
        await activity.save();
      }
      await refreshAccumulatedChallengeProgress(registrationId, { sql: context.sql });
      if (registration && event) {
        await reconcileAccumulatedCertificateAfterReview(registrationId, event);
      }
    }
  }
  for (const userId of context.affectedUsers) {
    if (mongoose.Types.ObjectId.isValid(userId)) {
      await refreshGlobalDistanceMilestoneProgress(userId, { sql: context.sql, revokeUnmet: true });
    }
  }
  for (const eventId of context.affectedEvents) {
    if (!mongoose.Types.ObjectId.isValid(eventId)) continue;
    const event = await Event.findById(eventId).select('slug').lean();
    if (!event?.slug) continue;
    invalidateLeaderboardCache(event.slug);
    await syncEventRankingsInBackground(
      { eventId, runnerId: null, isPersonalRecord: false },
      event.slug,
      { throwOnError: true }
    );
  }
}

async function applyRemediation() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for --apply so shadow rows cannot be left behind.');
  for (const name of ['CLOUDFLARE_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT']) {
    if (!String(process.env[name] || '').trim()) throw new Error(`${name} is required for --apply so certificate objects cannot be left behind.`);
  }
  const sql = getPostgresClient();
  const context = { sql, affectedUsers: new Set(), affectedEvents: new Set(), affectedRegistrations: new Set() };
  const standard = await Submission.collection.find({ source: 'strava' }).toArray();
  const accumulated = await AccumulatedActivitySubmission.collection.find({ source: 'strava' }).toArray();
  let scrubbed = 0;
  for (const raw of standard) { await scrubRecord(raw, 'standard', context); scrubbed += 1; }
  for (const raw of accumulated) { await scrubRecord(raw, 'accumulated', context); scrubbed += 1; }
  const resumed = await resumeInterruptedReceipts(context);

  const disconnectedDuplicateConnections = await disconnectDuplicateAthletes();
  await recalculate(context);
  const receipts = await StravaRemediationReceipt.find({ scrubbedAt: { $ne: null }, notifiedAt: null });
  let notified = 0;
  for (const receipt of receipts) if (await notifyReceipt(receipt)) notified += 1;
  return { scrubbed, resumed, notified, disconnectedDuplicateConnections };
}

async function run({ mode = 'dry-run' } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const before = await inventory();
    if (mode === 'dry-run') return { mode, before };
    assertApplyApproval(before);
    const result = await applyRemediation();
    const after = await inventory();
    return { mode, before, result, after };
  } finally {
    await Promise.allSettled([mongoose.disconnect(), closePostgresClient()]);
  }
}

if (require.main === module) {
  let options;
  try { options = parseArguments(); } catch (error) { console.error(error.message); process.exit(1); }
  run(options).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  RECOVERY_WINDOW_MS,
  parseArguments,
  getTargetFingerprint,
  assertApplyApproval,
  inventory,
  scrubRecord,
  resumeInterruptedReceipts,
  run
};
