'use strict';

// Phase 3 against a disposable LOCAL MongoDB. Storage is injected; nothing reaches R2.
// Same command and safety rules as tests/ocr-server-pipeline.integration.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const sharp = require('sharp');

const TEST_URI = String(process.env.OCR_TEST_MONGODB_URI || '');
const skip = !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(TEST_URI) || String(process.env.DATABASE_URL || '').trim()
  ? 'set OCR_TEST_MONGODB_URI to a local mongodb:// URI and leave DATABASE_URL empty'
  : false;

const TrainingSample = require('../src/models/TrainingSample');
const DatasetVersion = require('../src/models/DatasetVersion');
const Submission = require('../src/models/Submission');
const OcrSettings = require('../src/models/OcrSettings');
const User = require('../src/models/User');
const samples = require('../src/services/ocr/training-sample.service');
const datasets = require('../src/services/ocr/dataset.service');
const { clearOcrSettingsCache, updateOcrSettings } = require('../src/services/ocr/ocr-settings.service');
const jobs = require('../src/services/ocr/ocr-job.service');
const { queueProofExtraction, processExtractionJob } = require('../src/services/ocr/server-ocr.service');
const { withdrawOcrTrainingConsent } = require('../src/controllers/runner-ocr-consent.controller');

const stored = new Map();
const fakePut = async ({ key, body }) => { stored.set(key, body); return { key }; };

let image;

function fakeExtraction(proofHash = 'h'.repeat(64)) {
  return {
    _id: new mongoose.Types.ObjectId(),
    proofHash,
    detection: { platform: 'strava' },
    layout: { id: 'strava/tall-light' },
    profile: { version: 'p1' },
    modelVersionId: 'base-eng',
    fields: {
      distance: { value: { valueKm: 5.02, value: 5.02, unit: 'km' }, location: { rawText: 'Distance 5.02 km', boundingBox: { left: 20, top: 20, width: 160, height: 30 } } },
      time: { value: { totalMs: 1_710_000 }, location: { rawText: 'Moving Time 28:30', boundingBox: { left: 20, top: 80, width: 160, height: 30 } } },
      pace: { value: null, location: null }
    }
  };
}

test.describe('ground truth and datasets against local MongoDB', { skip }, () => {
  test.before(async () => {
    await mongoose.connect(TEST_URI, { autoIndex: true });
    await mongoose.connection.db.dropDatabase();
    await Promise.all([TrainingSample.syncIndexes(), DatasetVersion.syncIndexes(), OcrSettings.syncIndexes(), Submission.syncIndexes()]);
    clearOcrSettingsCache();
    image = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#ffffff' } })
      .composite([{ input: await sharp({ create: { width: 120, height: 20, channels: 3, background: '#000' } }).png().toBuffer(), left: 30, top: 25 }])
      .png().toBuffer();
  });

  test.after(async () => {
    await mongoose.connection.db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  });

  test('candidates need a consent basis, start pending and ineligible, and are not duplicated', async () => {
    await assert.rejects(samples.createCandidatesFromExtraction({ extraction: fakeExtraction(), buffer: image, consentBasis: '', source: 'admin_upload' }), { code: 'consent_required' });
    const created = await samples.createCandidatesFromExtraction({ extraction: fakeExtraction(), buffer: image, consentBasis: 'owner_own_activity', source: 'admin_upload' }, { putPrivateObject: fakePut });
    assert.equal(created.length, 2);
    for (const row of created) {
      assert.equal(row.status, 'pending');
      assert.equal(row.eligibility, 'ineligible');
      assert.equal(row.transcribedText, '', 'ground truth is never pre-filled from OCR');
      assert.ok(stored.has(row.cropKey));
      assert.match(row.cropKey, /^ocr-training\/crops\/[0-9a-f]{32}\.png$/);
      assert.ok(row.retentionExpiry > new Date());
    }
    const again = await samples.createCandidatesFromExtraction({ extraction: fakeExtraction(), buffer: image, consentBasis: 'owner_own_activity', source: 'admin_upload' }, { putPrivateObject: fakePut });
    assert.equal(again.length, 0, 'identical crops are not stored twice');
  });

  test('approval needs literal text and alignment; stale versions conflict; exclusion needs a reason', async () => {
    const [sample] = await TrainingSample.find({ fieldKey: 'distance' }).limit(1);
    await assert.rejects(samples.reviewSample({ sampleId: sample._id, version: sample.__v, action: 'approve', transcribedText: '', alignmentConfirmed: true }), { code: 'transcription_required' });
    await assert.rejects(samples.reviewSample({ sampleId: sample._id, version: sample.__v, action: 'approve', transcribedText: 'Distance 5.02 km', alignmentConfirmed: false }), { code: 'alignment_required' });
    const approved = await samples.reviewSample({ sampleId: sample._id, version: sample.__v, action: 'approve', transcribedText: 'Distance 5.02 km', alignmentConfirmed: true });
    assert.equal(approved.sample.status, 'approved');
    assert.equal(approved.sample.eligibility, 'eligible');
    await assert.rejects(
      samples.reviewSample({ sampleId: sample._id, version: sample.__v, action: 'save', transcribedText: 'x' }),
      (error) => error.code === 'version_conflict' && error.status === 409
    );
    const other = await TrainingSample.findOne({ fieldKey: 'time' });
    await assert.rejects(samples.reviewSample({ sampleId: other._id, version: other.__v, action: 'exclude', reason: 'no' }), { code: 'reason_required' });
    const excluded = await samples.reviewSample({ sampleId: other._id, version: other.__v, action: 'exclude', reason: 'Two lines in crop' });
    assert.equal(excluded.sample.status, 'excluded');
  });

  test('snapshots include only eligible samples, are immutable, and record membership', async () => {
    await updateOcrSettings({ 'dataset.minApprovedSamples': 1, 'dataset.minTestSamples': 1, 'dataset.thresholdsApprovedByOwner': true });
    const dataset = await datasets.createDatasetVersion({ name: 'it-1' });
    assert.equal(dataset.counts.total, 1, 'the excluded sample is not included');
    assert.equal(datasets.verifyDatasetIntegrity(dataset.toObject()), true);
    const member = await TrainingSample.findOne({ status: 'approved' }).lean();
    assert.deepEqual(member.datasetMemberships.map(String), [String(dataset._id)]);
    await assert.rejects(DatasetVersion.updateOne({ _id: dataset._id }, { $set: { name: 'changed' } }), /immutable/);
    const same = await datasets.createDatasetVersion({ name: 'it-2' });
    assert.equal(same.manifestHash, dataset.manifestHash, 'same inputs reproduce the same hash');
  });

  test('opted-in proofs produce candidates via the OCR worker; withdrawal excludes them', async () => {
    const previous = { ...process.env };
    process.env.OCR_SERVER_PIPELINE_ENABLED = 'true';
    try {
      const runnerId = (await User.collection.insertOne({ firstName: 'Ana', lastName: 'Reyes', email: `c-${Date.now()}@example.test` })).insertedId;
      const submission = await Submission.create({
        registrationId: new mongoose.Types.ObjectId(), eventId: new mongoose.Types.ObjectId(), runnerId, raceDistance: '5K',
        distanceKm: 5.02, elapsedMs: 1_710_000, runDate: new Date('2026-04-25T00:00:00.000Z'),
        proof: { key: 'results/proofs/opt-in.webp', hash: 'e'.repeat(64) },
        ocrTrainingConsent: { granted: true, recordedAt: new Date(), noticeVersion: '2026-10-v1' }
      });
      await queueProofExtraction({ entries: [{ kind: 'run_submission', submission }] });
      const engine = {
        isBusy: () => false,
        async recognize() {
          return { text: 'Distance 5.02 km\nMoving Time 28:30', confidence: 80, modelVersionId: 'base-eng', lines: [
            { text: 'Distance 5.02 km', confidence: 90, bbox: { x0: 30, y0: 25, x1: 150, y1: 45 } },
            { text: 'Moving Time 28:30', confidence: 90, bbox: { x0: 30, y0: 120, x1: 200, y1: 140 } }
          ] };
        }
      };
      const outcome = await processExtractionJob(await jobs.claimNextJob(), {
        readProof: async () => image,
        engine,
        enabledProfileIds: ['generic'],
        createTrainingCandidates: (input) => samples.createCandidatesFromExtraction(input, { putPrivateObject: fakePut })
      });
      assert.equal(outcome.trainingCandidates, 2);
      const rows = await TrainingSample.find({ 'sourceEntry.id': submission._id }).lean();
      assert.equal(rows.length, 2);
      assert.ok(rows.every((row) => row.consentBasis === 'participant_opt_in' && row.consentNoticeVersion === '2026-10-v1'));

      const res = { redirected: '', redirect(to) { this.redirected = to; return this; }, status() { return this; }, render() { return this; } };
      await withdrawOcrTrainingConsent({ params: { submissionId: String(submission._id) }, session: { userId: String(runnerId) }, ip: '127.0.0.1', get: () => '' }, res);
      assert.equal(res.redirected, `/runner/submissions/${submission._id}`);
      const after = await TrainingSample.find({ 'sourceEntry.id': submission._id }).lean();
      assert.ok(after.every((row) => row.status === 'excluded' && row.exclusionReason === 'consent_withdrawn'));
      const entry = await Submission.findById(submission._id).lean();
      assert.equal(entry.ocrTrainingConsent.granted, false);
      assert.ok(entry.ocrTrainingConsent.withdrawnAt);
    } finally {
      process.env = previous;
    }
  });

  test('another runner cannot withdraw consent on an entry they do not own', async () => {
    const owner = new mongoose.Types.ObjectId();
    const submission = await Submission.create({
      registrationId: new mongoose.Types.ObjectId(), eventId: new mongoose.Types.ObjectId(), runnerId: owner, raceDistance: '5K',
      distanceKm: 5, elapsedMs: 1_500_000, runDate: new Date('2026-04-25T00:00:00.000Z'),
      ocrTrainingConsent: { granted: true, recordedAt: new Date() }
    });
    const res = { redirect() { return this; }, status() { return this; }, render() { return this; } };
    await withdrawOcrTrainingConsent({ params: { submissionId: String(submission._id) }, session: { userId: String(new mongoose.Types.ObjectId()) }, get: () => '' }, res);
    assert.equal((await Submission.findById(submission._id).lean()).ocrTrainingConsent.granted, true);
  });

  test('retention expiry excludes samples and deletes their crops', async () => {
    const deleted = [];
    const [row] = await TrainingSample.find({ status: 'approved' }).limit(1);
    await TrainingSample.collection.updateOne({ _id: row._id }, { $set: { retentionExpiry: new Date(Date.now() - 1000) } });
    const count = await samples.expireSamples({}, { deletePrivateObject: async (key) => deleted.push(key) });
    assert.equal(count, 1);
    assert.deepEqual(deleted, [row.cropKey]);
    const after = await TrainingSample.findById(row._id).lean();
    assert.equal(after.status, 'excluded');
    assert.ok(after.cropDeletedAt);
    const next = await datasets.createDatasetVersion({ name: 'it-3' });
    assert.equal(next.counts.total, 0, 'expired samples never enter later snapshots');
  });
});
