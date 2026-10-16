'use strict';

// Phase 2 against a disposable LOCAL MongoDB: duplicate review signals and reviewer link
// checks. Same safety rules and command as tests/ocr-server-pipeline.integration.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const sharp = require('sharp');

const TEST_URI = String(process.env.OCR_TEST_MONGODB_URI || '');
const skip = !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(TEST_URI) || String(process.env.DATABASE_URL || '').trim()
  ? 'set OCR_TEST_MONGODB_URI to a local mongodb:// URI and leave DATABASE_URL empty'
  : false;

const Submission = require('../src/models/Submission');
const ActivityUrlVerification = require('../src/models/ActivityUrlVerification');
const User = require('../src/models/User');
const jobs = require('../src/services/ocr/ocr-job.service');
const { findProviderActivityDuplicates } = require('../src/services/ocr/activity-duplicate.service');
const { buildActivityEvidence } = require('../src/services/ocr/activity-evidence.service');
const { recordManualUrlCheck } = require('../src/services/ocr/activity-url-verification.service');
const { queueProofExtraction, processExtractionJob } = require('../src/services/ocr/server-ocr.service');
const { sanitizeActivityEvidence } = require('../src/utils/ocr/activity-evidence');
const { parseActivityUrl } = require('../src/utils/ocr/activity-url');

const engine = {
  isBusy: () => false,
  async recognize() {
    return { text: 'Distance 5.02 km\nMoving Time 28:30', confidence: 80, lines: [], modelVersionId: 'base-eng' };
  }
};

async function entry({ runnerId, eventId = new mongoose.Types.ObjectId(), attempt = '', url = '', extra = {} }) {
  const evidence = url ? sanitizeActivityEvidence({ parsed: parseActivityUrl(url), duplicateSignals: [] }) : {};
  return Submission.create({
    registrationId: new mongoose.Types.ObjectId(),
    eventId,
    runnerId,
    raceDistance: '5K',
    distanceKm: 5.02,
    elapsedMs: 1_710_000,
    runDate: new Date('2026-04-25T00:00:00.000Z'),
    proof: { key: `results/proofs/${new mongoose.Types.ObjectId()}.webp`, hash: 'c'.repeat(64) },
    submissionAttemptId: attempt,
    ...evidence,
    ...extra
  });
}

test.describe('activity evidence against local MongoDB', { skip }, () => {
  let runnerA;
  let runnerB;
  let image;

  test.before(async () => {
    await mongoose.connect(TEST_URI, { autoIndex: true });
    await mongoose.connection.db.dropDatabase();
    await Promise.all([Submission.syncIndexes(), ActivityUrlVerification.syncIndexes()]);
    runnerA = (await User.collection.insertOne({ firstName: 'Ana', lastName: 'Reyes', email: `a-${Date.now()}@example.test` })).insertedId;
    runnerB = (await User.collection.insertOne({ firstName: 'Ben', lastName: 'Cruz', email: `b-${Date.now()}@example.test` })).insertedId;
    // A deterministic, non-uniform test image so its difference hash is meaningful.
    image = await sharp({ create: { width: 400, height: 700, channels: 3, background: '#ffffff' } })
      .composite([{ input: await sharp({ create: { width: 200, height: 350, channels: 3, background: '#222222' } }).png().toBuffer(), left: 0, top: 0 }])
      .png().toBuffer();
  });

  test.after(async () => {
    await mongoose.connection.db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  });

  test('the same provider activity on another runner is flagged; linked siblings are not', async () => {
    const event = new mongoose.Types.ObjectId();
    await entry({ runnerId: runnerA, eventId: event, attempt: 'attempt-a', url: 'https://www.strava.com/activities/111' });
    const sibling = await findProviderActivityDuplicates({ provider: 'strava', providerActivityId: '111', runnerId: runnerA, submissionAttemptId: 'attempt-a', eventIds: [event] });
    assert.equal(sibling.length, 0, 'entries submitted together share an activity by design');
    const other = await findProviderActivityDuplicates({ provider: 'strava', providerActivityId: '111', runnerId: runnerB, submissionAttemptId: 'attempt-b', eventIds: [event] });
    assert.equal(other.length, 1);
    assert.equal(other[0].sameRunner, false);
    assert.equal(other[0].sameEvent, true);
  });

  test('buildActivityEvidence carries the signal into the stored entry and blocks auto-approval', async () => {
    const previous = process.env.ACTIVITY_URL_ENABLED;
    process.env.ACTIVITY_URL_ENABLED = 'true';
    try {
      const result = await buildActivityEvidence({ rawUrl: 'https://strava.com/activities/111?share=1', runnerId: runnerB, submissionAttemptId: 'attempt-c' });
      assert.equal(result.ok, true);
      assert.equal(result.evidence.duplicateSignals.length, 1);
      const stored = sanitizeActivityEvidence(result.evidence);
      const saved = await entry({ runnerId: runnerB, attempt: 'attempt-c', extra: stored });
      const fresh = await Submission.findById(saved._id).lean();
      assert.equal(fresh.activityUrl.normalizedUrl, 'https://www.strava.com/activities/111');
      assert.equal(fresh.duplicateSignals.length, 1);
      const { isAutoApprovableSubmission } = require('../src/services/submission-validation.service');
      assert.equal(isAutoApprovableSubmission({ ...fresh, ocrData: { extractedDistanceKm: 5, extractedTimeMs: 1, confidence: 1, nameMatchStatus: 'matched' } }), false);
    } finally {
      if (previous === undefined) delete process.env.ACTIVITY_URL_ENABLED;
      else process.env.ACTIVITY_URL_ENABLED = previous;
    }
  });

  test('a near-identical screenshot from another runner is flagged by the OCR worker', async () => {
    const previous = { ...process.env };
    process.env.OCR_SERVER_PIPELINE_ENABLED = 'true';
    process.env.OCR_SERVER_AUTO_APPROVAL_ENABLED = 'true';
    try {
      const event = new mongoose.Types.ObjectId();
      const first = await entry({ runnerId: runnerA, eventId: event, attempt: 'p1' });
      await queueProofExtraction({ entries: [{ kind: 'run_submission', submission: first }], submissionAttemptId: 'p1' });
      await processExtractionJob(await jobs.claimNextJob(), { readProof: async () => image, engine, enabledProfileIds: ['generic'] });
      const recompressed = await sharp(image).jpeg({ quality: 70 }).toBuffer();
      const second = await entry({ runnerId: runnerB, eventId: event, attempt: 'p2' });
      await queueProofExtraction({ entries: [{ kind: 'run_submission', submission: second }], submissionAttemptId: 'p2' });
      const outcome = await processExtractionJob(await jobs.claimNextJob(), { readProof: async () => recompressed, engine, enabledProfileIds: ['generic'] });
      assert.deepEqual(outcome.targets.map((target) => target.result), ['review']);
      const flagged = await Submission.findById(second._id).lean();
      assert.equal(flagged.duplicateSignals.length, 1);
      assert.equal(flagged.duplicateSignals[0].kind, 'near_duplicate_screenshot');
      assert.equal(String(flagged.duplicateSignals[0].otherEntryId), String(first._id));
      assert.equal(flagged.status, 'submitted');
    } finally {
      process.env = previous;
    }
  });

  test('a reviewer link check is event-scoped, append-only and never records a field mismatch as a match', async () => {
    const event = new mongoose.Types.ObjectId();
    const target = await entry({ runnerId: runnerA, eventId: event, url: 'https://connect.garmin.com/modern/activity/999' });
    await assert.rejects(
      recordManualUrlCheck({ kind: 'run_submission', entryId: target._id, eventId: new mongoose.Types.ObjectId(), status: 'matched', reviewerId: runnerB }),
      { code: 'not_found' }
    );
    const result = await recordManualUrlCheck({
      kind: 'run_submission', entryId: target._id, eventId: event, status: 'matched',
      comparedFields: { distance: 'matched', duration: 'mismatched', date: 'bogus' }, notes: 'Moving time differs', reviewerId: runnerB
    });
    assert.equal(result.status, 'mismatched');
    const fresh = await Submission.findById(target._id).lean();
    assert.equal(fresh.activityUrlVerification.status, 'mismatched');
    assert.equal(fresh.activityUrlVerification.method, 'manual_open');
    assert.equal(fresh.activityUrlVerification.comparedFields.date, 'not_compared');
    await assert.rejects(ActivityUrlVerification.updateOne({ _id: result.row._id }, { $set: { status: 'matched' } }), /append-only/);
    const noLink = await entry({ runnerId: runnerA, eventId: event });
    await assert.rejects(recordManualUrlCheck({ kind: 'run_submission', entryId: noLink._id, eventId: event, status: 'matched' }), { code: 'no_activity_url' });
  });
});
