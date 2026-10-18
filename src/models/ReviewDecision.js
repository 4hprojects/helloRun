const mongoose = require('mongoose');

// One row per review decision on a runner entry, written once and never updated.
//
// The entry itself (Submission, AccumulatedActivitySubmission, Registration payment proof)
// only holds its *current* state: a resubmission overwrites the proof, OCR payload and
// validation in place, and a manual approval clears the suspicion flag. This collection
// keeps what each decision was made on, so past decisions stay explainable and can be used
// to tune auto-approval, OCR and fraud rules later.
//
// Mongo rather than the Postgres audit trail, because the evidence (OCR payload, validation
// metadata) is deliberately Mongo-only; see the header comment in Submission.js. The
// critical audit row is still written alongside, and stays the official record.
const REVIEW_DECISION_KINDS = ['run_submission', 'accumulated_activity', 'payment_proof'];
const REVIEW_DECISIONS = [
  'approved',
  'rejected',
  'auto_approved',
  'approval_reversed',
  'needs_clarification'
];

const reviewDecisionSchema = new mongoose.Schema(
  {
    schemaVersion: { type: Number, default: 1 },
    kind: { type: String, enum: REVIEW_DECISION_KINDS, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    runnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // submissionCount / paymentSubmissionCount at the time, so attempts on one entry can be
    // told apart. Null where the entry has no counter.
    attemptNumber: { type: Number, default: null },
    decision: { type: String, enum: REVIEW_DECISIONS, required: true },
    statusFrom: { type: String, trim: true, default: '', maxlength: 40 },
    statusTo: { type: String, trim: true, default: '', maxlength: 40 },
    // Null for system decisions (auto-approval).
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewerRole: { type: String, trim: true, default: '', maxlength: 40 },
    isSelfReview: { type: Boolean, default: false },
    decidedAt: { type: Date, required: true },
    rejectionCode: { type: String, trim: true, default: '', maxlength: 80 },
    rejectionReason: { type: String, trim: true, default: '', maxlength: 500 },
    reviewNotes: { type: String, trim: true, default: '', maxlength: 1200 },
    manualReviewChecklist: { type: mongoose.Schema.Types.Mixed, default: null },
    // What the entry looked like *before* the decision was applied. Shape depends on kind;
    // see buildEvidenceSnapshot in review-decision.service.js.
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    // The event's acceptance rules in force at decision time.
    eventRules: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Set when this decision followed one made on an entry submitted together with this one
    // (same submissionAttemptId), possibly by a reviewer of another event. Null otherwise.
    linkedFrom: {
      type: new mongoose.Schema(
        {
          kind: { type: String, enum: REVIEW_DECISION_KINDS, required: true },
          targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
          eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null }
        },
        { _id: false }
      ),
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    minimize: false
  }
);

reviewDecisionSchema.index({ targetId: 1, decidedAt: -1 });
reviewDecisionSchema.index({ eventId: 1, decidedAt: -1 });
reviewDecisionSchema.index({ runnerId: 1, decidedAt: -1 });
reviewDecisionSchema.index({ kind: 1, decision: 1, rejectionCode: 1 });
reviewDecisionSchema.index({ 'linkedFrom.targetId': 1 }, { sparse: true });
// Proof cleanup checks these before deleting a replaced file.
reviewDecisionSchema.index({ 'evidence.proof.key': 1 }, { sparse: true });
reviewDecisionSchema.index({ 'evidence.paymentProof.key': 1 }, { sparse: true });

module.exports = mongoose.models.ReviewDecision || mongoose.model('ReviewDecision', reviewDecisionSchema);
module.exports.REVIEW_DECISION_KINDS = REVIEW_DECISION_KINDS;
module.exports.REVIEW_DECISIONS = REVIEW_DECISIONS;
