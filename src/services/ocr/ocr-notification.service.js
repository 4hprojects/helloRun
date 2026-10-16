'use strict';

/**
 * OCR administrator reminders and alerts (Phase 5, doc 08).
 *
 * - Two switches: OCR_REMINDERS_ENABLED (operator kill switch) and the admin's
 *   notifications.enabled setting. Both must be on.
 * - Recipients are resolved from RBAC each time: active admins (full tier only for
 *   deployment events), optionally narrowed to selected admins, minus muted ones.
 * - Deduplication: one OcrNotificationEvent per (eventKey, recipient), enforced by a unique
 *   index, so duplicate schedulers, restarts and retries cannot send twice.
 * - Delivery claims a row atomically, respects the shared email budget, retries with
 *   bounded backoff and records sent / failed / suppressed with the provider message id.
 * - Reminders never start training or change models.
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const User = require('../../models/User');
const OcrNotificationEvent = require('../../models/OcrNotificationEvent');
const TrainingJob = require('../../models/TrainingJob');
const TrainingSample = require('../../models/TrainingSample');
const Submission = require('../../models/Submission');
const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');
const { isRemindersEnabled } = require('./ocr-config');
const { getOcrSettings } = require('./ocr-settings.service');
const { getDigestSchedule, isoWeek, localParts } = require('../../utils/ocr/digest-schedule');

const DEPLOY_EVENTS = new Set(['ocr.model_approval_needed', 'ocr.model_activated']);
const RETRY_DELAYS_MS = Object.freeze([5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 12 * 60 * 60_000]);
const MAX_ATTEMPTS = 5;
const LEASE_MS = 2 * 60_000;
const REGRESSION_MIN_SAMPLES = 20;
const REGRESSION_DELTA = 0.15;

function appUrl(pathname) {
  const base = String(process.env.APP_URL || 'https://hellorun.online').replace(/\/+$/, '');
  return `${base}${pathname}`;
}

async function resolveRecipients(eventType, { settings, initiatorId = '' } = {}) {
  const notifications = settings.notifications || {};
  const query = { role: 'admin', accountStatus: { $nin: ['closed', 'suspended'] }, email: { $gt: '' } };
  if (DEPLOY_EVENTS.has(eventType)) query.adminTier = { $ne: 'support' };
  let admins = await User.find(query).select('_id email firstName adminTier').lean();
  const muted = new Set((notifications.mutedUserIds || []).map(String));
  let selected = admins;
  if (notifications.recipientMode === 'selected') {
    const chosen = new Set((notifications.recipientUserIds || []).map(String));
    selected = admins.filter((admin) => chosen.has(String(admin._id)));
  }
  const byId = new Map(selected.map((admin) => [String(admin._id), admin]));
  if (initiatorId && ['ocr.training_completed', 'ocr.training_failed'].includes(eventType)) {
    const initiator = admins.find((admin) => String(admin._id) === String(initiatorId));
    if (initiator) byId.set(String(initiator._id), initiator);
  }
  admins = [...byId.values()].filter((admin) => !muted.has(String(admin._id)));
  return admins;
}

function buildEventKey(eventType, payload) {
  switch (eventType) {
    case 'ocr.review_digest': return `${eventType}:${payload.periodKey}`;
    case 'ocr.dataset_ready': return `${eventType}:${payload.sinceJobId || 'none'}:${payload.threshold}`;
    case 'ocr.training_completed':
    case 'ocr.training_failed': return `${eventType}:${payload.jobId}`;
    case 'ocr.model_approval_needed': return `${eventType}:${payload.modelId}`;
    case 'ocr.model_activated': return `${eventType}:${payload.registryVersion}`;
    case 'ocr.quality_regression': return `${eventType}:${payload.platform}:${payload.periodKey}`;
    case 'ocr.test_email': return `${eventType}:${payload.requestedAt}`;
    default: return '';
  }
}

/** Counts and links only. */
function buildEmail(eventType, summary = {}) {
  const center = appUrl('/admin/ocr-training');
  switch (eventType) {
    case 'ocr.review_digest':
      return {
        subject: 'HelloRun OCR review reminder',
        heading: 'OCR review reminder',
        paragraphs: [
          `There are ${summary.pendingSampleCount} OCR samples awaiting review and ${summary.newEligibleSampleCount} new approved training examples since the last training job.`,
          'Review extraction issues by platform, then decide whether to prepare a dataset or schedule manual training.'
        ],
        ctaHref: appUrl('/admin/ocr-training/samples')
      };
    case 'ocr.dataset_ready':
      return {
        subject: 'HelloRun OCR: enough new verified samples to review a dataset',
        heading: 'New verified samples are available',
        paragraphs: [
          `${summary.newEligibleSampleCount} newly approved samples are eligible since the last training job (threshold ${summary.threshold}).`,
          'This is a prompt to check dataset quality, not a sign that training will succeed. Nothing starts automatically.'
        ],
        ctaHref: appUrl('/admin/ocr-training/samples')
      };
    case 'ocr.training_completed':
      return {
        subject: 'HelloRun OCR training finished',
        heading: 'Training job finished',
        paragraphs: [
          `Training job ${summary.jobId} completed. The candidate ${summary.passed ? 'passed' : 'did not pass'} its evaluation gates.`,
          'Your current production OCR model has not changed. Review the evaluation before approving anything.'
        ],
        ctaHref: appUrl('/admin/ocr-training/models')
      };
    case 'ocr.training_failed':
      return {
        subject: 'HelloRun OCR training failed',
        heading: 'Training job failed',
        paragraphs: [
          `Training job ${summary.jobId} failed (${summary.errorCode || 'unknown error'}). Your current production OCR model has not changed.`,
          'Review the job log through the authenticated admin dashboard.'
        ],
        ctaHref: appUrl('/admin/ocr-training/jobs')
      };
    case 'ocr.model_approval_needed':
      return {
        subject: 'HelloRun OCR: a candidate model needs review',
        heading: 'Candidate model passed its gates',
        paragraphs: ['A candidate model passed its evaluation gates. It is not deployed. A full administrator must review, approve and activate it manually.'],
        ctaHref: appUrl('/admin/ocr-training/models')
      };
    case 'ocr.model_activated':
      return {
        subject: summary.rollback ? 'HelloRun OCR model rolled back' : 'HelloRun OCR model activated',
        heading: summary.rollback ? 'OCR model rolled back' : 'OCR model activated',
        paragraphs: [`The server OCR model changed (registry version ${summary.registryVersion}) at ${new Date().toISOString()}. See the deployment history for who made the change and why.`],
        ctaHref: appUrl('/admin/ocr-training/models')
      };
    case 'ocr.quality_regression':
      return {
        subject: `HelloRun OCR: reading quality dropped for ${summary.platform}`,
        heading: 'Possible OCR quality regression',
        paragraphs: [
          `For ${summary.platform} screenshots, the share of server readings that disagree with what runners entered rose from ${Math.round(summary.baselineRate * 100)}% to ${Math.round(summary.recentRate * 100)}% (last 7 days, ${summary.recentCount} readings).`,
          'Investigate the affected platform profile; the app may have changed its layout.'
        ],
        ctaHref: appUrl('/admin/ocr-training/analytics')
      };
    case 'ocr.test_email':
      return { subject: 'HelloRun OCR test email', heading: 'Test email', paragraphs: ['OCR administrator emails are reaching you.'], ctaHref: center };
    default:
      return { subject: 'HelloRun OCR', heading: 'OCR update', paragraphs: [], ctaHref: center };
  }
}

async function claim(rowId, now) {
  return OcrNotificationEvent.findOneAndUpdate(
    {
      _id: rowId,
      $or: [
        { status: 'queued', nextAttemptAt: { $lte: now } },
        { status: 'sending', leaseExpiresAt: { $lte: now } }
      ]
    },
    { $set: { status: 'sending', leaseExpiresAt: new Date(now.getTime() + LEASE_MS) }, $inc: { attempts: 1 } },
    { new: true }
  );
}

function defaultDeps() {
  const email = require('../email.service');
  const budget = require('../email-budget.service');
  const communication = require('../communication.service');
  return {
    send: email.sendOcrAdminNotificationEmail,
    getCommunicationSetting: communication.getCommunicationSetting,
    decideEmailSend: budget.decideEmailSend,
    incrementSentEmail: budget.incrementSentEmail
  };
}

/** Deliver one row. Returns its final status for this attempt. */
async function deliverNotification(rowId, { now = new Date(), deps = null } = {}) {
  const row = await claim(rowId, now);
  if (!row) return 'not_due';
  const d = deps || defaultDeps();
  const user = await User.findById(row.recipientId).select('email firstName role accountStatus').lean();
  if (!user || user.role !== 'admin' || ['closed', 'suspended'].includes(user.accountStatus) || !user.email) {
    await OcrNotificationEvent.updateOne({ _id: row._id }, { $set: { status: 'suppressed', errorCode: 'recipient_ineligible', leaseExpiresAt: null } });
    return 'suppressed';
  }
  try {
    const communicationSettings = await d.getCommunicationSetting();
    const decision = await d.decideEmailSend({ settings: communicationSettings, eventSetting: { priority: 'medium', emailEnabled: true } });
    if (!decision.allowed) {
      // Budget or maintenance mode: try again later, within the attempt limit.
      return scheduleRetry(row, decision.status === 'suppressed' ? 'email_suppressed' : 'email_budget', now);
    }
    const content = buildEmail(row.eventType, row.summary || {});
    const data = await d.send({ to: user.email, firstName: user.firstName, ...content });
    await d.incrementSentEmail({ settings: communicationSettings, priority: 'medium' }).catch(() => {});
    await OcrNotificationEvent.updateOne(
      { _id: row._id },
      { $set: { status: 'sent', sentAt: now, providerMessageId: String(data?.id || '').slice(0, 120), errorCode: '', leaseExpiresAt: null } }
    );
    return 'sent';
  } catch (error) {
    logger.warn('[ocr-notification] delivery failed', { eventType: row.eventType, attempt: row.attempts, error: error?.message });
    return scheduleRetry(row, 'provider_error', now);
  }
}

async function scheduleRetry(row, errorCode, now) {
  if (row.attempts >= MAX_ATTEMPTS) {
    await OcrNotificationEvent.updateOne({ _id: row._id }, { $set: { status: 'failed', errorCode, leaseExpiresAt: null } });
    return 'failed';
  }
  const delay = RETRY_DELAYS_MS[Math.min(row.attempts - 1, RETRY_DELAYS_MS.length - 1)];
  await OcrNotificationEvent.updateOne({ _id: row._id }, { $set: { status: 'queued', errorCode, nextAttemptAt: new Date(now.getTime() + delay), leaseExpiresAt: null } });
  return 'retry_scheduled';
}

/**
 * Record (and try to deliver) one event for every eligible recipient.
 * @returns {{ skipped?: string, queued: number, duplicates: number, delivered: object }}
 */
async function emitOcrEvent(eventType, payload = {}, { now = new Date(), deps = null, force = false } = {}) {
  if (!force && !isRemindersEnabled()) return { skipped: 'disabled', queued: 0, duplicates: 0 };
  const settings = await getOcrSettings({ fresh: true });
  const notifications = settings.notifications || {};
  if (!force && !notifications.enabled) return { skipped: 'settings_disabled', queued: 0, duplicates: 0 };
  if (!force && !(notifications.eventTypes || []).includes(eventType)) return { skipped: 'not_subscribed', queued: 0, duplicates: 0 };
  const eventKey = buildEventKey(eventType, payload);
  if (!eventKey) return { skipped: 'unknown_event', queued: 0, duplicates: 0 };
  const recipients = payload.recipientIds
    ? await User.find({ _id: { $in: payload.recipientIds.filter((id) => mongoose.isValidObjectId(id)) }, role: 'admin' }).select('_id').lean()
    : await resolveRecipients(eventType, { settings, initiatorId: payload.requestedBy });
  if (!recipients.length) return { skipped: 'no_recipients', queued: 0, duplicates: 0 };

  const summary = { ...payload };
  delete summary.recipientIds;
  let queued = 0;
  let duplicates = 0;
  const delivered = {};
  for (const recipient of recipients) {
    let row;
    try {
      row = await OcrNotificationEvent.create({ eventType, eventKey, recipientId: recipient._id, summary, status: 'queued', nextAttemptAt: now });
      queued += 1;
    } catch (error) {
      if (error?.code === 11000) {
        duplicates += 1;
        continue;
      }
      throw error;
    }
    const status = await deliverNotification(row._id, { now, deps });
    delivered[status] = (delivered[status] || 0) + 1;
  }
  return { queued, duplicates, delivered };
}

/** Retry rows whose next attempt is due (multi-instance safe through claim()). */
async function processDueNotifications({ now = new Date(), limit = 20, deps = null } = {}) {
  const due = await OcrNotificationEvent.find({
    $or: [{ status: 'queued', nextAttemptAt: { $lte: now } }, { status: 'sending', leaseExpiresAt: { $lte: now } }]
  }).sort({ nextAttemptAt: 1 }).limit(limit).select('_id').lean();
  const results = {};
  for (const row of due) {
    const status = await deliverNotification(row._id, { now, deps });
    results[status] = (results[status] || 0) + 1;
  }
  return results;
}

async function getSinceLastTraining() {
  const last = await TrainingJob.findOne({ status: 'completed' }).sort({ finishedAt: -1 }).select('_id finishedAt').lean();
  return { since: last?.finishedAt || new Date(0), sinceJobId: last ? String(last._id) : '' };
}

async function getActionableCounts() {
  const { since, sinceJobId } = await getSinceLastTraining();
  const [pendingSampleCount, newEligibleSampleCount] = await Promise.all([
    TrainingSample.countDocuments({ status: 'pending' }),
    TrainingSample.countDocuments({ status: 'approved', eligibility: 'eligible', reviewedAt: { $gt: since } })
  ]);
  return { pendingSampleCount, newEligibleSampleCount, sinceJobId };
}

/** Weekly / fortnightly / monthly digest, only when there is something to act on. */
async function runDigestCheck({ now = new Date(), deps = null } = {}) {
  const settings = await getOcrSettings({ fresh: true });
  const notifications = settings.notifications || {};
  const schedule = getDigestSchedule(now, notifications);
  if (!schedule.due) return { sent: false, reason: schedule.reason };
  const counts = await getActionableCounts();
  const threshold = Number(notifications.minimumNewSamples || 100);
  if (counts.pendingSampleCount === 0 && counts.newEligibleSampleCount < threshold) return { sent: false, reason: 'not_actionable' };
  const result = await emitOcrEvent('ocr.review_digest', { periodKey: schedule.periodKey, ...counts }, { now, deps });
  return { sent: Boolean(result.queued), reason: result.skipped || (result.duplicates && !result.queued ? 'already_sent' : 'sent'), result };
}

async function runDatasetReadyCheck({ now = new Date(), deps = null } = {}) {
  const settings = await getOcrSettings({ fresh: true });
  const threshold = Number(settings.notifications?.minimumNewSamples || 100);
  const counts = await getActionableCounts();
  if (counts.newEligibleSampleCount < threshold) return { sent: false, reason: 'below_threshold' };
  const result = await emitOcrEvent('ocr.dataset_ready', { sinceJobId: counts.sinceJobId, threshold, newEligibleSampleCount: counts.newEligibleSampleCount }, { now, deps });
  return { sent: Boolean(result.queued), result };
}

/** Disagreement rate between server readings and runner entries, by platform. */
async function serverMismatchRates(from, to) {
  const pipeline = [
    { $match: { 'serverOcr.status': 'complete', 'serverOcr.completedAt': { $gte: from, $lt: to } } },
    {
      $group: {
        _id: '$serverOcr.platform',
        total: { $sum: 1 },
        mismatched: { $sum: { $cond: [{ $or: ['$serverOcr.autoApproval.distanceMismatch', '$serverOcr.autoApproval.timeMismatch'] }, 1, 0] } }
      }
    }
  ];
  const merged = {};
  for (const Model of [Submission, AccumulatedActivitySubmission]) {
    for (const row of await Model.aggregate(pipeline)) {
      const key = row._id || 'unknown';
      merged[key] = merged[key] || { total: 0, mismatched: 0 };
      merged[key].total += row.total;
      merged[key].mismatched += row.mismatched;
    }
  }
  return merged;
}

async function runQualityRegressionCheck({ now = new Date(), deps = null } = {}) {
  const day = 24 * 60 * 60 * 1000;
  const recent = await serverMismatchRates(new Date(now.getTime() - 7 * day), now);
  const baseline = await serverMismatchRates(new Date(now.getTime() - 35 * day), new Date(now.getTime() - 7 * day));
  const local = localParts(now, 'Asia/Manila');
  const { isoYear, week } = isoWeek(local.year, local.month, local.day);
  const periodKey = `${isoYear}-W${String(week).padStart(2, '0')}`;
  const alerts = [];
  for (const [platform, stats] of Object.entries(recent)) {
    const base = baseline[platform];
    if (!base || stats.total < REGRESSION_MIN_SAMPLES || base.total < REGRESSION_MIN_SAMPLES) continue;
    const recentRate = stats.mismatched / stats.total;
    const baselineRate = base.mismatched / base.total;
    if (recentRate - baselineRate < REGRESSION_DELTA) continue;
    alerts.push(platform);
    await emitOcrEvent('ocr.quality_regression', { platform, periodKey, recentRate, baselineRate, recentCount: stats.total }, { now, deps });
  }
  return { alerts };
}

async function sendTestEmail({ actorId, deps = null, now = new Date() }) {
  return emitOcrEvent('ocr.test_email', { requestedAt: now.toISOString(), recipientIds: [String(actorId)] }, { now, deps, force: true });
}

async function listDeliveries(limit = 30) {
  return OcrNotificationEvent.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  DEPLOY_EVENTS,
  MAX_ATTEMPTS,
  REGRESSION_DELTA,
  REGRESSION_MIN_SAMPLES,
  resolveRecipients,
  buildEventKey,
  buildEmail,
  deliverNotification,
  emitOcrEvent,
  processDueNotifications,
  getActionableCounts,
  runDigestCheck,
  runDatasetReadyCheck,
  runQualityRegressionCheck,
  serverMismatchRates,
  sendTestEmail,
  listDeliveries
};
