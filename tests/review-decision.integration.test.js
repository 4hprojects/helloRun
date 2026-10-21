'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const ReviewDecision = require('../src/models/ReviewDecision');
const Submission = require('../src/models/Submission');
const { recordReviewDecisionInBackground } = require('../src/services/review-decision.service');

const cleanup = { decisionIds: [], submissionIds: [] };

test.before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required for review-decision integration tests.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
  await Promise.all([
    ReviewDecision.deleteMany({ _id: { $in: cleanup.decisionIds } }),
    Submission.deleteMany({ _id: { $in: cleanup.submissionIds } })
  ]);
  await mongoose.disconnect();
});

test('review decisions persist evidence, rejection codes, and linked multi-event history', async () => {
  const runnerId = new mongoose.Types.ObjectId();
  const reviewerId = new mongoose.Types.ObjectId();
  const sourceEventId = new mongoose.Types.ObjectId();
  const siblingEventId = new mongoose.Types.ObjectId();
  const registrationId = new mongoose.Types.ObjectId();
  const sourceId = new mongoose.Types.ObjectId();
  const linkedStandardId = new mongoose.Types.ObjectId();
  const linkedAccumulatedId = new mongoose.Types.ObjectId();
  const decidedAt = new Date('2026-10-20T08:30:00.000Z');

  const sourceEntry = {
    _id: sourceId,
    registrationId,
    eventId: sourceEventId,
    runnerId,
    submissionCount: 2,
    raceDistance: '10K',
    distanceKm: 10.04,
    elapsedMs: 3_600_000,
    runDate: new Date('2026-10-19T22:00:00.000Z'),
    runType: 'run',
    proofType: 'photo',
    proof: { key: `rel-02/${sourceId}.webp`, mimeType: 'image/webp' },
    validation: { method: 'ocr', reviewRequired: true },
    organizerCorrections: []
  };
  const linkedFrom = { kind: 'run_submission', targetId: sourceId, eventId: sourceEventId };

  const decisions = await Promise.all([
    recordReviewDecisionInBackground({
      kind: 'run_submission',
      entry: sourceEntry,
      event: { _id: sourceEventId, submissionReviewMode: 'manual' },
      decision: 'rejected',
      statusFrom: 'submitted',
      statusTo: 'rejected',
      decidedBy: reviewerId,
      reviewerRole: 'organizer',
      decidedAt,
      rejectionCode: 'unclear_proof',
      rejectionReason: 'The submitted screenshot is not readable.'
    }),
    recordReviewDecisionInBackground({
      kind: 'run_submission',
      entry: { ...sourceEntry, _id: linkedStandardId, eventId: siblingEventId },
      event: { _id: siblingEventId, submissionReviewMode: 'manual' },
      decision: 'rejected',
      statusFrom: 'submitted',
      statusTo: 'rejected',
      decidedBy: reviewerId,
      reviewerRole: 'organizer',
      decidedAt,
      rejectionCode: 'unclear_proof',
      linkedFrom
    }),
    recordReviewDecisionInBackground({
      kind: 'accumulated_activity',
      entry: {
        ...sourceEntry,
        _id: linkedAccumulatedId,
        registrationId: new mongoose.Types.ObjectId(),
        eventId: siblingEventId
      },
      event: { _id: siblingEventId, submissionReviewMode: 'manual' },
      decision: 'rejected',
      statusFrom: 'submitted',
      statusTo: 'rejected',
      decidedBy: reviewerId,
      reviewerRole: 'organizer',
      decidedAt,
      rejectionCode: 'unclear_proof',
      linkedFrom
    })
  ]);

  assert.ok(decisions.every(Boolean));
  cleanup.decisionIds.push(...decisions.map((decision) => decision._id));

  const stored = await ReviewDecision.find({ _id: { $in: cleanup.decisionIds } }).lean();
  assert.equal(stored.length, 3);
  const sourceDecision = stored.find((decision) => String(decision.targetId) === String(sourceId));
  const standardDecision = stored.find((decision) => String(decision.targetId) === String(linkedStandardId));
  const accumulatedDecision = stored.find((decision) => String(decision.targetId) === String(linkedAccumulatedId));

  assert.equal(sourceDecision.rejectionCode, 'unclear_proof');
  assert.equal(sourceDecision.linkedFrom, null);
  assert.equal(sourceDecision.evidence.proof.key, `rel-02/${sourceId}.webp`);
  assert.equal(sourceDecision.evidence.distanceKm, 10.04);
  assert.equal(sourceDecision.attemptNumber, 2);
  for (const linkedDecision of [standardDecision, accumulatedDecision]) {
    assert.equal(String(linkedDecision.linkedFrom.targetId), String(sourceId));
    assert.equal(linkedDecision.linkedFrom.kind, 'run_submission');
    assert.equal(String(linkedDecision.linkedFrom.eventId), String(sourceEventId));
    assert.equal(linkedDecision.rejectionCode, 'unclear_proof');
  }

  const submission = new Submission({
    _id: new mongoose.Types.ObjectId(),
    registrationId: new mongoose.Types.ObjectId(),
    eventId: sourceEventId,
    runnerId,
    raceDistance: '10K',
    distanceKm: 10.04,
    elapsedMs: 3_600_000,
    status: 'submitted'
  });
  await submission.validate();
  await Submission.collection.insertOne(submission.toObject());
  cleanup.submissionIds.push(submission._id);

  await Submission.updateOne(
    { _id: submission._id },
    {
      $set: {
        status: 'rejected',
        rejectionCode: 'unclear_proof',
        rejectionReason: 'The submitted screenshot is not readable.'
      }
    }
  );
  const rejected = await Submission.findById(submission._id).lean();
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.rejectionCode, 'unclear_proof');
  assert.equal(rejected.rejectionReason, 'The submitted screenshot is not readable.');
});
