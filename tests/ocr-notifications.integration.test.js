'use strict';

// Phase 5 against a disposable LOCAL MongoDB: RBAC recipients, dedupe under duplicate
// schedulers, retries, suppression, digest actionability and analytics/export output.
// The email provider and budget are injected; nothing is sent.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const TEST_URI = String(process.env.OCR_TEST_MONGODB_URI || '');
const skip = !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(TEST_URI) || String(process.env.DATABASE_URL || '').trim()
  ? 'set OCR_TEST_MONGODB_URI to a local mongodb:// URI and leave DATABASE_URL empty'
  : false;

const User = require('../src/models/User');
const OcrNotificationEvent = require('../src/models/OcrNotificationEvent');
const OcrSettings = require('../src/models/OcrSettings');
const TrainingSample = require('../src/models/TrainingSample');
const Submission = require('../src/models/Submission');
const notifications = require('../src/services/ocr/ocr-notification.service');
const { clearOcrSettingsCache, updateOcrSettings } = require('../src/services/ocr/ocr-settings.service');
const { getOcrAnalytics, buildResearchExportCsv } = require('../src/services/ocr/ocr-analytics.service');

const sent = [];
function makeDeps({ fail = false, allowed = true } = {}) {
  return {
    send: async ({ to, subject }) => {
      if (fail) throw new Error('provider down');
      sent.push({ to, subject });
      return { id: `msg-${sent.length}` };
    },
    getCommunicationSetting: async () => ({}),
    decideEmailSend: async () => (allowed ? { allowed: true } : { allowed: false, status: 'skipped' }),
    incrementSentEmail: async () => {}
  };
}

test.describe('OCR notifications against local MongoDB', { skip }, () => {
  const ids = {};

  test.before(async () => {
    await mongoose.connect(TEST_URI, { autoIndex: true });
    await mongoose.connection.db.dropDatabase();
    await Promise.all([OcrNotificationEvent.syncIndexes(), OcrSettings.syncIndexes(), TrainingSample.syncIndexes(), Submission.syncIndexes()]);
    const insert = async (key, doc) => { ids[key] = (await User.collection.insertOne({ email: `${key}@example.test`, firstName: key, ...doc })).insertedId; };
    await insert('full', { role: 'admin', adminTier: 'full', accountStatus: 'active' });
    await insert('support', { role: 'admin', adminTier: 'support', accountStatus: 'active' });
    await insert('closed', { role: 'admin', adminTier: 'full', accountStatus: 'closed' });
    await insert('runner', { role: 'runner', accountStatus: 'active' });
    clearOcrSettingsCache();
    process.env.OCR_REMINDERS_ENABLED = 'true';
  });

  test.after(async () => {
    delete process.env.OCR_REMINDERS_ENABLED;
    await mongoose.connection.db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  });

  test('nothing is sent while either switch is off', async () => {
    delete process.env.OCR_REMINDERS_ENABLED;
    assert.equal((await notifications.emitOcrEvent('ocr.training_failed', { jobId: 'j0' }, { deps: makeDeps() })).skipped, 'disabled');
    process.env.OCR_REMINDERS_ENABLED = 'true';
    assert.equal((await notifications.emitOcrEvent('ocr.training_failed', { jobId: 'j0' }, { deps: makeDeps() })).skipped, 'settings_disabled');
    await updateOcrSettings({ 'notifications.enabled': true });
    assert.equal(await OcrNotificationEvent.countDocuments({}), 0);
  });

  test('recipients come from RBAC: active admins only, deploy events to full admins only', async () => {
    const settings = await OcrSettings.findOne({ key: 'global' }).lean();
    const general = (await notifications.resolveRecipients('ocr.review_digest', { settings })).map((user) => String(user.firstName)).sort();
    assert.deepEqual(general, ['full', 'support']);
    const deploy = (await notifications.resolveRecipients('ocr.model_activated', { settings })).map((user) => user.firstName);
    assert.deepEqual(deploy, ['full']);
    const muted = { ...settings, notifications: { ...settings.notifications, mutedUserIds: [ids.support] } };
    assert.deepEqual((await notifications.resolveRecipients('ocr.review_digest', { settings: muted })).map((user) => user.firstName), ['full']);
    const selected = { ...settings, notifications: { ...settings.notifications, recipientMode: 'selected', recipientUserIds: [ids.support, ids.runner] } };
    assert.deepEqual((await notifications.resolveRecipients('ocr.review_digest', { settings: selected })).map((user) => user.firstName), ['support']);
  });

  test('duplicate schedulers and repeated emits produce one email per recipient', async () => {
    const deps = makeDeps();
    const before = sent.length;
    const results = await Promise.all([1, 2, 3].map(() => notifications.emitOcrEvent('ocr.training_failed', { jobId: 'job-dup', errorCode: 'timeout' }, { deps })));
    const queued = results.reduce((sum, result) => sum + result.queued, 0);
    assert.equal(queued, 2, 'one row each for the two eligible admins');
    assert.equal(sent.length - before, 2);
    const again = await notifications.emitOcrEvent('ocr.training_failed', { jobId: 'job-dup' }, { deps });
    assert.equal(again.queued, 0);
    assert.equal(again.duplicates, 2);
    const rows = await OcrNotificationEvent.find({ eventKey: 'ocr.training_failed:job-dup' }).lean();
    assert.ok(rows.every((row) => row.status === 'sent' && row.providerMessageId.startsWith('msg-')));
  });

  test('failed delivery retries with backoff and stops after the attempt limit', async () => {
    const start = new Date();
    await notifications.emitOcrEvent('ocr.training_failed', { jobId: 'job-retry' }, { deps: makeDeps({ fail: true }), now: start });
    const [row] = await OcrNotificationEvent.find({ eventKey: 'ocr.training_failed:job-retry', recipientId: ids.full }).lean();
    assert.equal(row.status, 'queued');
    assert.ok(row.nextAttemptAt > start);
    assert.deepEqual(await notifications.processDueNotifications({ now: start, deps: makeDeps({ fail: true }) }), {}, 'not due yet');
    let clock = start.getTime();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      clock += 13 * 60 * 60 * 1000;
      await notifications.processDueNotifications({ now: new Date(clock), deps: makeDeps({ fail: true }) });
    }
    const final = await OcrNotificationEvent.findById(row._id).lean();
    assert.equal(final.status, 'failed');
    assert.equal(final.attempts, notifications.MAX_ATTEMPTS);
  });

  test('an over-budget send waits; a recipient who lost admin rights is suppressed', async () => {
    await notifications.emitOcrEvent('ocr.training_completed', { jobId: 'job-budget', passed: false }, { deps: makeDeps({ allowed: false }) });
    const waiting = await OcrNotificationEvent.findOne({ eventKey: 'ocr.training_completed:job-budget', recipientId: ids.full }).lean();
    assert.equal(waiting.status, 'queued');
    assert.equal(waiting.errorCode, 'email_budget');
    await User.collection.updateOne({ _id: ids.support }, { $set: { role: 'runner' } });
    const later = new Date(Date.now() + 60 * 60 * 1000);
    await notifications.processDueNotifications({ now: later, deps: makeDeps() });
    const supportRow = await OcrNotificationEvent.findOne({ eventKey: 'ocr.training_completed:job-budget', recipientId: ids.support }).lean();
    assert.equal(supportRow.status, 'suppressed');
    assert.equal((await OcrNotificationEvent.findById(waiting._id).lean()).status, 'sent');
    await User.collection.updateOne({ _id: ids.support }, { $set: { role: 'admin' } });
  });

  test('the digest sends only when actionable, once per period, and survives a restart', async () => {
    await updateOcrSettings({ 'notifications.dayOfWeek': 1, 'notifications.hour': 8, 'notifications.frequency': 'weekly', 'notifications.timezone': 'Asia/Manila', 'notifications.minimumNewSamples': 100 });
    const due = new Date('2026-10-19T01:00:00Z'); // Monday 09:00 Manila
    assert.equal((await notifications.runDigestCheck({ now: new Date('2026-10-18T22:00:00Z'), deps: makeDeps() })).reason, 'before_scheduled_time');
    assert.equal((await notifications.runDigestCheck({ now: due, deps: makeDeps() })).reason, 'not_actionable');
    await TrainingSample.collection.insertOne({ status: 'pending', activityGroupId: 'g', fieldKey: 'distance', cropKey: 'k', cropChecksum: 'c', source: 'admin_upload', createdAt: new Date() });
    const first = await notifications.runDigestCheck({ now: due, deps: makeDeps() });
    assert.equal(first.sent, true);
    // A second scheduler (or the same one after a restart) in the same week.
    clearOcrSettingsCache();
    const second = await notifications.runDigestCheck({ now: new Date('2026-10-21T03:00:00Z'), deps: makeDeps() });
    assert.equal(second.sent, false);
    assert.equal(await OcrNotificationEvent.countDocuments({ eventType: 'ocr.review_digest' }), 2, 'two admins, one row each, one period');
  });

  test('analytics report N/A without data and the research export carries no identifiers', async () => {
    const empty = await getOcrAnalytics({ days: 7 });
    assert.deepEqual(empty.groundTruth, []);
    const runnerId = new mongoose.Types.ObjectId();
    await Submission.collection.insertMany([0, 1, 2].map((index) => ({
      registrationId: new mongoose.Types.ObjectId(), eventId: new mongoose.Types.ObjectId(), runnerId, raceDistance: '5K', distanceKm: 5, elapsedMs: 1, runDate: new Date(),
      status: index === 0 ? 'approved' : 'submitted', reviewedAt: index === 0 ? new Date() : null, reviewedBy: index === 0 ? ids.full : null, submittedAt: new Date(Date.now() - 3600_000),
      organizerCorrections: index === 0 ? [{ editedBy: ids.full, reason: 'fix', changes: [{ field: 'distanceKm', from: 5, to: 5.1 }] }] : [],
      serverOcr: { status: 'complete', platform: 'strava', completedAt: new Date(), autoApproval: { distanceMismatch: index === 1, timeMismatch: false } },
      runLocation: 'Secret Street 1'
    })));
    await TrainingSample.collection.insertOne({ status: 'approved', reviewedAt: new Date(), platform: 'strava', fieldKey: 'distance', ocrText: '5.O2 km', transcribedText: '5.02 km', activityGroupId: 'x', cropKey: 'k2', cropChecksum: 'c2', source: 'admin_upload' });
    const analytics = await getOcrAnalytics({ days: 7 });
    const strava = analytics.entries.find((row) => row.platform === 'strava');
    assert.equal(strava.readings, 3);
    assert.equal(strava.disagreementRate, Number((1 / 3).toFixed(4)));
    assert.equal(strava.correctionRate, 1);
    const gt = analytics.groundTruth.find((row) => row.platform === 'strava');
    assert.equal(gt.cer, Number((1 / 7).toFixed(4)));
    const csv = await buildResearchExportCsv({ days: 7, experimentId: 'capstone-A' });
    assert.match(csv.split('\n')[0], /^experiment_id,generated_at,window_days/);
    assert.match(csv, /capstone-A,.*,ground_truth,strava,distance,1,cer,0\.1429/);
    assert.doesNotMatch(csv, new RegExp(String(runnerId)));
    assert.doesNotMatch(csv, /@example\.test|Secret Street/);
  });
});
