// DB-free unit tests: every Mongoose model call is mocked, and nothing here opens a real
// MongoDB or Postgres connection (see "Test Safety" in CLAUDE.md).
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.DATABASE_URL = '';

const Submission = require('../src/models/Submission');
const Registration = require('../src/models/Registration');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const ReviewDecision = require('../src/models/ReviewDecision');
const criticalAuditService = require('../src/services/critical-audit.service');
const {
  buildEvidenceSnapshot,
  buildReviewDecisionRecord,
  recordReviewDecisionInBackground,
  isProofReferencedByReviewDecision
} = require('../src/services/review-decision.service');
const { formatRejectionAuditNote } = require('../src/utils/rejection-reasons');
const submissionService = require('../src/services/submission.service');

function patch(obj, key, impl) {
  const original = obj[key];
  obj[key] = impl;
  return () => { obj[key] = original; };
}

function chainable(result) {
  const chain = {
    select() { return chain; },
    populate() { return chain; },
    lean: async () => result,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return chain;
}

function buildSubmission(overrides = {}) {
  return new Submission({
    registrationId: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    runnerId: new mongoose.Types.ObjectId(),
    raceDistance: '10K',
    distanceKm: 10.2,
    elapsedMs: 3_600_000,
    source: 'manual_upload',
    proofType: 'photo',
    proof: { url: 'https://cdn.example/proof.png', key: 'proofs/r1/a.png', mimeType: 'image/png', size: 1200, hash: 'abc' },
    submissionCount: 2,
    ocrData: { extractedDistanceKm: 10.1, confidence: 0.82, distanceMismatch: false, nameMatchStatus: 'matched' },
    validation: { method: 'ocr', autoApprovalEligible: false, reviewRequired: true, reviewReason: 'low_confidence' },
    suspiciousFlag: true,
    suspiciousFlagReason: 'Screenshot reused from another runner',
    ...overrides
  });
}

test('Submission schema keeps rejectionCode and manualReviewChecklist (they were silently dropped)', () => {
  const doc = new Submission({ rejectionCode: 'unreadable_proof' });
  assert.equal(doc.rejectionCode, 'unreadable_proof');

  const query = Submission.findOneAndUpdate({}, {
    $set: {
      rejectionCode: 'unreadable_proof',
      manualReviewChecklist: { version: 'v1', confirmedAt: new Date(), confirmedBy: new mongoose.Types.ObjectId() }
    }
  });
  const cast = query._castUpdate(query._update);
  assert.equal(cast.$set.rejectionCode, 'unreadable_proof');
  assert.equal(cast.$set.manualReviewChecklist.version, 'v1');
});

test('run evidence snapshot keeps OCR, validation and suspicion data, detached from the live doc', () => {
  const submission = buildSubmission();
  submission.organizerCorrections = [];
  const evidence = buildEvidenceSnapshot(submission, 'run_submission');

  assert.equal(evidence.distanceKm, 10.2);
  assert.equal(evidence.proof.key, 'proofs/r1/a.png');
  assert.equal(evidence.ocrData.confidence, 0.82);
  assert.equal(evidence.validation.reviewReason, 'low_confidence');
  assert.equal(evidence.suspiciousFlag, true);
  assert.equal(evidence.suspiciousFlagReason, 'Screenshot reused from another runner');
  assert.equal(evidence.organizerCorrectionCount, 0);
  assert.equal(evidence.certificate, undefined, 'unrelated state stays out');

  submission.suspiciousFlag = false;
  submission.ocrData.confidence = 0.1;
  assert.equal(evidence.suspiciousFlag, true);
  assert.equal(evidence.ocrData.confidence, 0.82);
});

test('payment evidence snapshot keeps the receipt and amount but not the waiver', () => {
  const registration = {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    paymentProof: { url: 'u', key: 'payments/1.png', mimeType: 'image/png', size: 10 },
    paymentAmountDue: 850,
    paymentCurrency: 'PHP',
    paymentSubmissionCount: 3,
    waiver: { signature: 'Runner One' }
  };
  const record = buildReviewDecisionRecord({
    kind: 'payment_proof',
    entry: registration,
    decision: 'rejected',
    statusFrom: 'proof_submitted',
    statusTo: 'proof_rejected',
    decidedBy: new mongoose.Types.ObjectId(),
    reviewerRole: 'Organiser',
    rejectionCode: 'amount_mismatch'
  });

  assert.equal(record.registrationId, registration._id);
  assert.equal(record.runnerId, registration.userId);
  assert.equal(record.attemptNumber, 3);
  assert.equal(record.reviewerRole, 'organiser');
  assert.equal(record.evidence.paymentProof.key, 'payments/1.png');
  assert.equal(record.evidence.paymentAmountDue, 850);
  assert.equal(record.evidence.waiver, undefined);
});

test('a failed history write is logged, never thrown', async () => {
  const restore = patch(ReviewDecision, 'create', async () => { throw new Error('mongo down'); });
  try {
    const result = await recordReviewDecisionInBackground({
      kind: 'run_submission',
      entry: buildSubmission(),
      decision: 'approved'
    });
    assert.equal(result, null);
  } finally {
    restore();
  }
});

test('proof cleanup sees a key referenced by a decision, for run and payment proofs', async () => {
  let filter = null;
  const restore = patch(ReviewDecision, 'exists', async (input) => { filter = input; return { _id: 'x' }; });
  try {
    assert.equal(await isProofReferencedByReviewDecision('proofs/r1/a.png'), true);
    assert.deepEqual(filter, {
      $or: [{ 'evidence.proof.key': 'proofs/r1/a.png' }, { 'evidence.paymentProof.key': 'proofs/r1/a.png' }]
    });
    assert.equal(await isProofReferencedByReviewDecision(''), false);
  } finally {
    restore();
  }
});

test('a failed proof lookup keeps the file rather than deleting it', async () => {
  const restore = patch(ReviewDecision, 'exists', async () => { throw new Error('mongo down'); });
  try {
    assert.equal(await isProofReferencedByReviewDecision('proofs/r1/a.png'), true);
  } finally {
    restore();
  }
});

test('rejection audit notes lead with the structured code', () => {
  assert.equal(
    formatRejectionAuditNote({ rejectionCode: 'wrong_date', rejectionReason: 'Wrong date: run after the deadline' }),
    '[wrong_date] Wrong date: run after the deadline'
  );
  assert.equal(formatRejectionAuditNote({ rejectionReason: 'Legacy reason' }), 'Legacy reason');
});

test('reviewSubmission records the decision with the evidence as it was before the review', async () => {
  const submission = buildSubmission();
  const adminId = new mongoose.Types.ObjectId();
  const event = { _id: submission.eventId, title: 'Bayani Run', acceptedRunTypes: ['run'], targetDistanceKm: 10 };
  const created = [];

  criticalAuditService.__setDisableCriticalAuditBackgroundWrites(true);
  submissionService.__setDisableSubmissionSyncBackgroundTasks(true);
  const restores = [
    patch(Submission, 'findById', async () => submission),
    patch(Event, 'findById', () => chainable(event)),
    patch(User, 'findById', () => chainable(null)),
    patch(Registration, 'findById', () => chainable(null)),
    patch(Submission, 'findOneAndUpdate', async (_filter, update) => {
      const next = buildSubmission({ ...submission.toObject(), ...update.$set });
      next._id = submission._id;
      return next;
    }),
    patch(ReviewDecision, 'create', async (record) => { created.push(record); return record; })
  ];

  try {
    await submissionService.reviewSubmission({
      submissionId: submission._id,
      organizerId: adminId,
      reviewerRole: 'admin',
      action: 'reject',
      rejectionCode: 'other',
      rejectionReason: 'The screenshot is cropped above the distance.'
    });

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(created.length, 1);
    const [record] = created;
    assert.equal(record.kind, 'run_submission');
    assert.equal(record.decision, 'rejected');
    assert.equal(record.statusFrom, 'submitted');
    assert.equal(record.statusTo, 'rejected');
    assert.equal(record.rejectionCode, 'other');
    assert.equal(String(record.decidedBy), String(adminId));
    assert.equal(record.attemptNumber, 2);
    assert.equal(record.evidence.suspiciousFlag, true);
    assert.equal(record.eventRules.targetDistanceKm, 10);
  } finally {
    restores.forEach((restore) => restore());
    criticalAuditService.__setDisableCriticalAuditBackgroundWrites(false);
    submissionService.__setDisableSubmissionSyncBackgroundTasks(false);
  }
});
