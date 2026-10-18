'use strict';

// Server OCR queue + processing against a real, disposable, LOCAL MongoDB.
//
//   docker run -d --name hellorun-ocr-test-mongo --ulimit nofile=64000:64000 -p 127.0.0.1:27018:27017 --tmpfs /data/db mongo:7.0
//   OCR_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/hellorun_ocr_test MONGODB_URI= DATABASE_URL= REDIS_URL= \
//     node src/scripts/run-test-group.js tests/ocr-server-pipeline.integration.test.js
//
// Skips unless OCR_TEST_MONGODB_URI points at localhost. It never reads .env, never touches
// Postgres (DATABASE_URL must be empty), R2 or email: proof bytes and the OCR engine are
// injected.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const sharp = require('sharp');

const TEST_URI = String(process.env.OCR_TEST_MONGODB_URI || '');
const isLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(TEST_URI);
const postgresDisabled = !String(process.env.DATABASE_URL || '').trim();
const skip = !isLocal || !postgresDisabled
  ? 'set OCR_TEST_MONGODB_URI to a local mongodb:// URI and leave DATABASE_URL empty'
  : false;

const OcrJob = require('../src/models/OcrJob');
const OcrExtraction = require('../src/models/OcrExtraction');
const Submission = require('../src/models/Submission');
const User = require('../src/models/User');
const jobs = require('../src/services/ocr/ocr-job.service');
const { processExtractionJob, queueProofExtraction } = require('../src/services/ocr/server-ocr.service');
const { processOcrJobBatch } = require('../src/workers/ocr-extraction-worker');

const STRAVA_TEXT = 'STRAVA\nJuan Dela Cruz\nApr 25, 2026 at 6:10 AM\nMorning Run\nDistance 5.02 km\nMoving Time 28:30\nAvg Pace 5:41 /km';

function fakeEngine(text = STRAVA_TEXT) {
  return {
    isBusy: () => false,
    async recognize() {
      return {
        text,
        confidence: 88,
        lines: [{ text: 'Distance 5.02 km', confidence: 90, bbox: { x0: 10, y0: 10, x1: 200, y1: 40 } }],
        modelVersionId: 'base-eng'
      };
    }
  };
}

let proofImage;
let runner;

async function makeSubmission(overrides = {}) {
  return Submission.create({
    registrationId: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    runnerId: runner._id,
    raceDistance: '5K',
    distanceKm: 5.02,
    elapsedMs: 1_710_000,
    runDate: new Date('2026-04-25T00:00:00.000Z'),
    runType: 'run',
    proof: { url: '', key: `results/proofs/${new mongoose.Types.ObjectId()}.webp`, mimeType: 'image/webp', size: 10, hash: 'a'.repeat(64) },
    status: 'submitted',
    // A forged browser reading: would auto-approve on its own before Phase 1.
    ocrData: { extractedDistanceKm: 5.02, extractedTimeMs: 1_710_000, confidence: 1, nameMatchStatus: 'matched' },
    validation: { method: 'ocr', autoApprovalEligible: false, reviewRequired: true, reviewReason: 'server_ocr_pending' },
    ...overrides
  });
}

test.describe('server OCR against local MongoDB', { skip }, () => {
  test.before(async () => {
    await mongoose.connect(TEST_URI, { autoIndex: true });
    await mongoose.connection.db.dropDatabase();
    await Promise.all([OcrJob.syncIndexes(), OcrExtraction.syncIndexes(), Submission.syncIndexes()]);
    const inserted = await User.collection.insertOne({ firstName: 'Juan', lastName: 'Dela Cruz', email: `ocr-${Date.now()}@example.test`, role: 'runner' });
    runner = { _id: inserted.insertedId };
    proofImage = await sharp({ create: { width: 600, height: 900, channels: 3, background: '#ffffff' } }).png().toBuffer();
  });

  test.after(async () => {
    await mongoose.connection.db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  });

  test('enqueue is idempotent under concurrent calls', async () => {
    const targets = [{ kind: 'run_submission', id: new mongoose.Types.ObjectId() }];
    const results = await Promise.all(Array.from({ length: 6 }, () => jobs.enqueueExtraction({
      proofKey: 'results/proofs/same.webp', proofHash: 'b'.repeat(64), targets, submissionAttemptId: 'attempt-1'
    }).catch((error) => {
      // A concurrent upsert can lose the unique-index race; Mongo reports it as E11000.
      if (error?.code === 11000) return { job: null, created: false, raced: true };
      throw error;
    })));
    const count = await OcrJob.countDocuments({ proofKey: 'results/proofs/same.webp' });
    assert.equal(count, 1);
    assert.ok(results.filter((result) => result.created).length <= 1);
  });

  test('exactly one of several concurrent workers claims a job', async () => {
    await OcrJob.deleteMany({});
    await jobs.enqueueExtraction({ proofKey: 'k1', targets: [{ kind: 'run_submission', id: new mongoose.Types.ObjectId() }] });
    const claims = await Promise.all(Array.from({ length: 5 }, (_, index) => jobs.claimNextJob({ workerId: `w${index}` })));
    assert.equal(claims.filter(Boolean).length, 1);
    const claimed = claims.find(Boolean);
    assert.equal(claimed.status, 'running');
    assert.equal(claimed.attempts, 1);
  });

  test('an expired lease is reclaimed, and exhausted jobs are closed', async () => {
    await OcrJob.deleteMany({});
    await jobs.enqueueExtraction({ proofKey: 'k2', targets: [{ kind: 'run_submission', id: new mongoose.Types.ObjectId() }] });
    const first = await jobs.claimNextJob({ workerId: 'crashed' });
    assert.equal(await jobs.claimNextJob({ workerId: 'other' }), null, 'lease still held');
    const later = new Date(Date.now() + 60 * 60 * 1000);
    const reclaimed = await jobs.claimNextJob({ workerId: 'other', now: later });
    assert.equal(String(reclaimed._id), String(first._id));
    assert.equal(reclaimed.attempts, 2);
    await OcrJob.updateOne({ _id: first._id }, { $set: { attempts: 3, leaseExpiresAt: new Date(0) } });
    assert.equal(await jobs.failExhaustedJobs({ now: later }), 1);
    const closed = await OcrJob.findById(first._id).lean();
    assert.equal(closed.status, 'failed');
    assert.equal(closed.errorCode, 'lease_expired_after_max_attempts');
  });

  test('retryable failures back off; permanent failures close', async () => {
    await OcrJob.deleteMany({});
    await jobs.enqueueExtraction({ proofKey: 'k3', targets: [{ kind: 'run_submission', id: new mongoose.Types.ObjectId() }] });
    const job = await jobs.claimNextJob();
    const requeued = await jobs.failJob(job, { errorCode: 'ocr_timeout', retryable: true });
    assert.equal(requeued.status, 'queued');
    assert.ok(requeued.nextAttemptAt.getTime() > Date.now() + 30_000);
    assert.equal(await jobs.claimNextJob(), null, 'not due yet');
    const again = await jobs.claimNextJob({ now: new Date(Date.now() + 2 * 60 * 1000) });
    const closed = await jobs.failJob(again, { errorCode: 'image_undecodable', retryable: false });
    assert.equal(closed.status, 'failed');
  });

  test('OcrExtraction rows refuse updates', async () => {
    const row = await OcrExtraction.create({ source: 'submission', status: 'complete', targets: [] });
    await assert.rejects(OcrExtraction.updateOne({ _id: row._id }, { $set: { status: 'failed' } }), /immutable/);
    row.status = 'failed';
    await assert.rejects(row.save(), /immutable/);
  });

  test('flags on: a forged browser reading waits; the server reading approves on its own evidence', async () => {
    const previous = { ...process.env };
    process.env.OCR_SERVER_PIPELINE_ENABLED = 'true';
    process.env.OCR_SERVER_AUTO_APPROVAL_ENABLED = 'true';
    try {
      const submission = await makeSubmission();
      const { applyAutoApprovalIfEligible } = require('../src/services/submission.service');
      const untouched = await applyAutoApprovalIfEligible(await Submission.findById(submission._id));
      assert.equal(untouched.status, 'submitted', 'browser values alone do not approve');

      const queued = await queueProofExtraction({ entries: [{ kind: 'run_submission', submission }], submissionAttemptId: 'a1' });
      assert.equal(queued.queued, true);
      const pending = await Submission.findById(submission._id).lean();
      assert.equal(pending.serverOcr.status, 'queued');
      assert.equal(pending.serverOcr.proofKey, submission.proof.key);

      const job = await jobs.claimNextJob();
      const outcome = await processExtractionJob(job, {
        readProof: async (key) => {
          assert.equal(key, submission.proof.key);
          return proofImage;
        },
        engine: fakeEngine(),
        enabledProfileIds: ['generic', 'strava']
      });
      assert.equal(outcome.status, 'complete');
      assert.deepEqual(outcome.targets.map((target) => target.result), ['auto_approved']);

      const done = await Submission.findById(submission._id).lean();
      assert.equal(done.status, 'approved');
      assert.equal(done.serverOcr.status, 'complete');
      assert.equal(done.serverOcr.platform, 'strava');
      assert.equal(done.serverOcr.autoApproval.nameMatchStatus, 'matched');
      assert.match(done.proofDifferenceHash, /^[0-9a-f]{16}$/);
      const extraction = await OcrExtraction.findById(done.serverOcr.extractionId).lean();
      assert.equal(extraction.revision, 1);
      assert.equal(extraction.fields.distance.value.valueKm, 5.02);
      assert.equal((await OcrJob.findById(job._id).lean()).status, 'completed');
    } finally {
      process.env = previous;
    }
  });

  test('a server reading that disagrees with the entry leaves it on review with a reason', async () => {
    const previous = { ...process.env };
    process.env.OCR_SERVER_PIPELINE_ENABLED = 'true';
    process.env.OCR_SERVER_AUTO_APPROVAL_ENABLED = 'true';
    try {
      const submission = await makeSubmission({ distanceKm: 10 });
      await queueProofExtraction({ entries: [{ kind: 'run_submission', submission }] });
      const job = await jobs.claimNextJob();
      const outcome = await processExtractionJob(job, { readProof: async () => proofImage, engine: fakeEngine(), enabledProfileIds: ['generic'] });
      assert.deepEqual(outcome.targets.map((target) => target.result), ['review']);
      const after = await Submission.findById(submission._id).lean();
      assert.equal(after.status, 'submitted');
      assert.equal(after.serverOcr.autoApproval.distanceMismatch, true);
      assert.equal(after.serverOcr.platform, 'unknown', 'strava profile not enabled → not confirmed');
      assert.notEqual(after.validation.reviewReason, 'server_ocr_pending');
    } finally {
      process.env = previous;
    }
  });

  test('a resubmitted proof makes an in-flight reading stale', async () => {
    const previous = { ...process.env };
    process.env.OCR_SERVER_PIPELINE_ENABLED = 'true';
    process.env.OCR_SERVER_AUTO_APPROVAL_ENABLED = 'true';
    try {
      const submission = await makeSubmission();
      await queueProofExtraction({ entries: [{ kind: 'run_submission', submission }] });
      await Submission.updateOne({ _id: submission._id }, { $set: { 'proof.key': 'results/proofs/new-proof.webp' } });
      const job = await jobs.claimNextJob();
      const outcome = await processExtractionJob(job, { readProof: async () => proofImage, engine: fakeEngine() });
      assert.deepEqual(outcome.targets.map((target) => target.result), ['stale_proof']);
      assert.equal((await Submission.findById(submission._id).lean()).status, 'submitted');
    } finally {
      process.env = previous;
    }
  });

  test('unreadable proofs fail permanently and mark the entry for manual review', async () => {
    const previous = { ...process.env };
    process.env.OCR_SERVER_PIPELINE_ENABLED = 'true';
    try {
      const submission = await makeSubmission();
      await queueProofExtraction({ entries: [{ kind: 'run_submission', submission }] });
      const result = await processOcrJobBatch({
        maxJobs: 1,
        deps: { readProof: async () => Buffer.from('definitely not an image'), engine: fakeEngine() }
      });
      assert.equal(result.processed, 1);
      const after = await Submission.findById(submission._id).lean();
      assert.equal(after.serverOcr.status, 'failed');
      assert.equal(after.serverOcr.errorCode, 'image_undecodable');
      assert.equal(after.validation.reviewReason, 'server_ocr_failed');
      const job = await OcrJob.findById(after.serverOcr.jobId).lean();
      assert.equal(job.status, 'failed');
    } finally {
      process.env = previous;
    }
  });

  test('flags off: nothing is queued and existing behaviour is unchanged', async () => {
    const previous = { ...process.env };
    delete process.env.OCR_SERVER_PIPELINE_ENABLED;
    delete process.env.OCR_SERVER_AUTO_APPROVAL_ENABLED;
    try {
      const before = await OcrJob.countDocuments({});
      const submission = await makeSubmission();
      const result = await queueProofExtraction({ entries: [{ kind: 'run_submission', submission }] });
      assert.equal(result.queued, false);
      assert.equal(await OcrJob.countDocuments({}), before);
      assert.equal((await Submission.findById(submission._id).lean()).serverOcr, undefined);
    } finally {
      process.env = previous;
    }
  });
});
