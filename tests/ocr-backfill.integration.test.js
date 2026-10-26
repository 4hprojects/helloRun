'use strict';

// Backfill of existing entries under the notice + objection basis, against a disposable LOCAL
// MongoDB. Storage and OCR are injected; nothing reaches R2 or production.
// Same command and safety rules as tests/ocr-server-pipeline.integration.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const sharp = require('sharp');

const TEST_URI = String(process.env.OCR_TEST_MONGODB_URI || '');
const skip = !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(TEST_URI) || String(process.env.DATABASE_URL || '').trim()
  ? 'set OCR_TEST_MONGODB_URI to a local mongodb:// URI and leave DATABASE_URL empty'
  : false;

const Submission = require('../src/models/Submission');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const OcrJob = require('../src/models/OcrJob');
const OcrExtraction = require('../src/models/OcrExtraction');
const OcrBackfillRun = require('../src/models/OcrBackfillRun');
const OcrSettings = require('../src/models/OcrSettings');
const TrainingSample = require('../src/models/TrainingSample');
const backfill = require('../src/services/ocr/ocr-backfill.service');
const jobs = require('../src/services/ocr/ocr-job.service');
const { processExtractionJob } = require('../src/services/ocr/server-ocr.service');
const { createCandidatesFromExtraction } = require('../src/services/ocr/training-sample.service');
const { clearOcrSettingsCache, updateOcrSettings } = require('../src/services/ocr/ocr-settings.service');
const { updateOcrTrainingPreference } = require('../src/controllers/runner-ocr-consent.controller');

// Eligibility inside the OCR worker uses the real clock, so the test dates are relative to it.
const NOW = new Date();
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(NOW.getTime() + days * DAY);
const stored = new Map();
const fakePut = async ({ key, body }) => { stored.set(key, body); return { key }; };
const engine = {
  isBusy: () => false,
  async recognize() {
    return { text: 'Distance 5.02 km\nMoving Time 28:30', confidence: 80, modelVersionId: 'base-eng', lines: [
      { text: 'Distance 5.02 km', confidence: 90, bbox: { x0: 30, y0: 25, x1: 150, y1: 45 } },
      { text: 'Moving Time 28:30', confidence: 90, bbox: { x0: 30, y0: 120, x1: 200, y1: 140 } }
    ] };
  }
};
// A distinct image per proof key, so identical-crop deduplication does not hide entries.
const imagesByKey = new Map();
let defaultEventId;
async function imageFor(key) {
  if (!imagesByKey.has(key)) {
    const width = 40 + (imagesByKey.size * 9) % 100;
    imagesByKey.set(key, await sharp({ create: { width: 400, height: 300, channels: 3, background: '#fff' } })
      .composite([{ input: await sharp({ create: { width, height: 18, channels: 3, background: '#000' } }).png().toBuffer(), left: 32, top: 26 }])
      .png().toBuffer());
  }
  return imagesByKey.get(key);
}
const deps = () => ({
  readProof: (key) => imageFor(key),
  engine,
  enabledProfileIds: ['generic'],
  createTrainingCandidates: (input) => createCandidatesFromExtraction(input, { putPrivateObject: fakePut })
});

async function addRunner(overrides = {}) {
  const doc = { email: `r-${new mongoose.Types.ObjectId()}@example.test`, firstName: 'R', lastName: 'Unner', role: 'runner', accountStatus: 'active', ...overrides };
  return (await User.collection.insertOne(doc)).insertedId;
}

async function addEntry(runnerId, overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  await Submission.collection.insertOne({
    _id: id, registrationId: new mongoose.Types.ObjectId(), eventId: defaultEventId, runnerId,
    raceDistance: '5K', distanceKm: 5.02, elapsedMs: 1_710_000, runDate: new Date('2026-04-25'), status: 'approved',
    proof: { key: `results/proofs/${id}.webp`, mimeType: 'image/webp', hash: String(id).padEnd(64, '0') },
    ...overrides
  });
  return id;
}

async function drain(maxSteps = 50) {
  for (let i = 0; i < maxSteps; i += 1) {
    const step = await backfill.stepBackfill({ now: NOW, deps: deps() });
    for (let job = await jobs.claimNextJob({ now: NOW }); job; job = await jobs.claimNextJob({ now: NOW })) {
      await processExtractionJob(job, deps());
    }
    if (step.reason === 'completed' || step.reason === 'daily_cap_reached' || step.reason === 'no_running_backfill') return step;
  }
  return null;
}

test.describe('training backfill against local MongoDB', { skip }, () => {
  const people = {};

  test.before(async () => {
    await mongoose.connect(TEST_URI, { autoIndex: true });
    await mongoose.connection.db.dropDatabase();
    await Promise.all([Submission, OcrJob, OcrExtraction, OcrBackfillRun, OcrSettings, TrainingSample].map((Model) => Model.syncIndexes()));
    clearOcrSettingsCache();
    defaultEventId = new mongoose.Types.ObjectId();
    const deletedEventId = new mongoose.Types.ObjectId();
    await Event.collection.insertMany([
      { _id: defaultEventId, title: 'OCR backfill event', slug: `ocr-backfill-${defaultEventId}`, isDeleted: false },
      { _id: deletedEventId, title: 'Deleted OCR event', slug: `ocr-backfill-deleted-${deletedEventId}`, isDeleted: true }
    ]);
    people.adult = await addRunner({ dateOfBirth: new Date('1990-05-05') });
    people.objector = await addRunner({ ocrTrainingOptOut: { optedOut: true, at: new Date() } });
    people.minor = await addRunner({ dateOfBirth: new Date('2012-01-01') });
    people.closed = await addRunner({ accountStatus: 'closed' });
    people.late = await addRunner();
    await addEntry(people.adult, { status: 'approved' });
    await addEntry(people.adult, { status: 'rejected' });
    await addEntry(people.objector);
    await addEntry(people.minor);
    await addEntry(people.closed);
    await addEntry(null); // guest / onsite entry
    await addEntry(people.adult, { proof: { key: 'results/proofs/x.pdf', mimeType: 'application/pdf' } });
    await addEntry(people.adult, { eventId: new mongoose.Types.ObjectId() });
    await addEntry(people.adult, { eventId: deletedEventId });
    people.lateEntry = await addEntry(people.late);
    process.env.OCR_SERVER_PIPELINE_ENABLED = 'true';
  });

  test.after(async () => {
    delete process.env.OCR_SERVER_PIPELINE_ENABLED;
    await mongoose.connection.db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  });

  test('cannot start under opt-in, before the objection period, or twice', async () => {
    await assert.rejects(backfill.startBackfill({ actorId: people.adult, now: NOW }), (error) => error.code === 'gate_closed' && /notice and objection/.test(error.message));
    await updateOcrSettings({ 'training.basis': 'notice_opt_out', 'training.noticePublishedAt': daysFromNow(-40), 'training.noticePolicyVersion': '1.6', 'training.backfillNotBefore': daysFromNow(5), 'training.backfillDailyCap': 3 });
    await assert.rejects(backfill.startBackfill({ actorId: people.adult, now: NOW }), /objection period has not ended/);
    await updateOcrSettings({ 'training.backfillNotBefore': daysFromNow(-10) });
    await backfill.startBackfill({ actorId: people.adult, now: NOW });
    await assert.rejects(backfill.startBackfill({ actorId: people.adult, now: NOW }), { code: 'backfill_active' });
  });

  test('the dry run counts usable entries (approved and rejected) and explains the rest', async () => {
    const plan = await backfill.planBackfill({ now: NOW });
    assert.equal(plan.total, 10);
    assert.equal(plan.usable, 3, 'two adult entries plus the late runner');
    assert.deepEqual(plan.byStatus, { approved: 2, rejected: 1 });
    assert.deepEqual(plan.excluded, { runner_objected: 1, known_minor: 1, account_inactive: 1, no_runner_account: 1, not_an_image: 1, event_unavailable: 2 });
    assert.equal(await TrainingSample.countDocuments({}), 0, 'a dry run writes nothing');
  });

  test('yields while a submission job waits', async () => {
    const { job } = await jobs.enqueueExtraction({ proofKey: 'results/proofs/live.webp', targets: [{ kind: 'run_submission', id: new mongoose.Types.ObjectId() }] });
    assert.equal((await backfill.stepBackfill({ now: NOW, deps: deps() })).reason, 'yielding_to_submissions');
    await OcrJob.deleteOne({ _id: job._id });
  });

  test('respects the daily cap, then resumes the next day from its cursor', async () => {
    const first = await drain();
    assert.equal(first.reason, 'daily_cap_reached');
    let run = await OcrBackfillRun.findOne({}).lean();
    assert.equal(run.today.processed, 3);
    // Simulated restart: nothing in memory; the next day continues from the persisted cursor.
    const nextDay = daysFromNow(1);
    for (let i = 0; i < 10; i += 1) {
      const step = await backfill.stepBackfill({ now: nextDay, deps: deps() });
      for (let job = await jobs.claimNextJob({ now: nextDay }); job; job = await jobs.claimNextJob({ now: nextDay })) await processExtractionJob(job, deps());
      if (step.reason === 'completed') break;
    }
    run = await OcrBackfillRun.findById(run._id).lean();
    assert.equal(run.status, 'completed');
    assert.equal(run.counts.scanned, 10);
    assert.equal(run.counts.excluded.runner_objected, 1);
    assert.equal(run.counts.excluded.known_minor, 1);
    assert.equal(run.counts.excluded.event_unavailable, 2);
    const samples = await TrainingSample.find({}).lean();
    const entries = new Set(samples.map((sample) => String(sample.sourceEntry.id)));
    assert.equal(entries.size, 3, 'samples only from the three usable entries');
    assert.ok(samples.every((sample) => sample.consentBasis === 'notice_legitimate_interest' && sample.consentNoticeVersion === '1.6'));
    assert.ok(samples.every((sample) => sample.status === 'pending' && sample.eligibility === 'ineligible'), 'still need human transcription and approval');
    assert.ok(samples.every((sample) => sample.source === 'backfill'));
  });

  test('an objection afterwards excludes that runner\'s samples', async () => {
    const res = { redirect() { return this; }, status() { return this; }, render() { return this; } };
    await updateOcrTrainingPreference({ body: { optedOut: '1' }, session: { userId: String(people.late) }, get: () => '' }, res);
    const rows = await TrainingSample.find({ runnerId: people.late }).lean();
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.status === 'excluded' && row.exclusionReason === 'participant_objected'));
    assert.equal((await User.findById(people.late).lean()).ocrTrainingOptOut.optedOut, true);
  });

  test('an existing current server reading is reused instead of running OCR again', async () => {
    const runnerId = await addRunner();
    const entryId = await addEntry(runnerId);
    const entry = await Submission.findById(entryId).lean();
    const extraction = await OcrExtraction.create({
      source: 'submission', status: 'complete', proofKey: entry.proof.key, proofHash: entry.proof.hash, targets: [{ kind: 'run_submission', id: entryId }],
      fields: { distance: { value: { valueKm: 5.02 }, location: { rawText: 'Distance 5.02 km', boundingBox: { left: 30, top: 25, width: 120, height: 20 } } } }
    });
    await Submission.collection.updateOne({ _id: entryId }, { $set: { serverOcr: { status: 'complete', extractionId: extraction._id, proofKey: entry.proof.key } } });
    await OcrBackfillRun.collection.updateMany({}, { $unset: { activeLock: 1 } });
    await backfill.startBackfill({ actorId: runnerId, now: NOW });
    const before = await OcrJob.countDocuments({});
    await drain();
    assert.equal(await OcrJob.countDocuments({}), before, 'no OCR job queued');
    const run = await OcrBackfillRun.findOne({ status: { $in: ['completed', 'running'] } }).sort({ createdAt: -1 }).lean();
    assert.equal(run.counts.reused, 1);
    assert.equal(await TrainingSample.countDocuments({ 'sourceEntry.id': entryId }), 1);
  });

  test('withdrawing the basis pauses a running backfill', async () => {
    await OcrBackfillRun.collection.updateMany({}, { $unset: { activeLock: 1 }, $set: { status: 'completed' } });
    const run = await backfill.startBackfill({ actorId: people.adult, now: NOW });
    await updateOcrSettings({ 'training.basis': 'opt_in' });
    assert.equal((await backfill.stepBackfill({ now: NOW, deps: deps() })).reason, 'gate_closed');
    const after = await OcrBackfillRun.findById(run._id).lean();
    assert.equal(after.status, 'paused');
    assert.match(after.errorSummary, /notice and objection/);
  });
});
