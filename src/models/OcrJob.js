const mongoose = require('mongoose');

// Durable OCR work queue (docs/improvement-plan/ocr-platform-aware, Phase 1).
//
// Production has no Redis, so this follows the atomic-claim pattern already proven in
// event-promotion-worker.js: a worker claims one job with findOneAndUpdate, holds a lease,
// and a job whose lease expired can be reclaimed after a crash or restart. Training jobs
// have their own collection (TrainingJob); this one is for inference-class work only.
const OCR_JOB_TYPES = ['extract_proof'];
const OCR_JOB_STATUSES = ['queued', 'running', 'completed', 'failed', 'cancelled'];
const OCR_TARGET_KINDS = ['run_submission', 'accumulated_activity'];

const ocrJobTargetSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: OCR_TARGET_KINDS, required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true }
  },
  { _id: false }
);

const ocrJobSchema = new mongoose.Schema(
  {
    type: { type: String, enum: OCR_JOB_TYPES, required: true },
    status: { type: String, enum: OCR_JOB_STATUSES, default: 'queued', index: true },
    // Lower runs first. Submission extraction is 10; admin reprocessing 20.
    priority: { type: Number, default: 10 },
    idempotencyKey: { type: String, trim: true, required: true, maxlength: 200 },
    proofKey: { type: String, trim: true, required: true, maxlength: 500 },
    proofHash: { type: String, trim: true, default: '', maxlength: 64 },
    runnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targets: { type: [ocrJobTargetSchema], default: [] },
    options: {
      profileOverride: { type: String, trim: true, default: '', maxlength: 40 },
      reason: { type: String, trim: true, default: '', maxlength: 60 }
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseExpiresAt: { type: Date, default: null },
    claimedBy: { type: String, trim: true, default: '', maxlength: 120 },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    extractionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OcrExtraction', default: null },
    elapsedMs: { type: Number, default: null },
    errorCode: { type: String, trim: true, default: '', maxlength: 60 }
  },
  { timestamps: true }
);

ocrJobSchema.index({ idempotencyKey: 1 }, { unique: true });
ocrJobSchema.index({ status: 1, priority: 1, nextAttemptAt: 1, createdAt: 1 });
ocrJobSchema.index({ status: 1, leaseExpiresAt: 1 });
ocrJobSchema.index({ 'targets.id': 1, createdAt: -1 });
ocrJobSchema.index({ createdAt: -1 });

module.exports = mongoose.models.OcrJob || mongoose.model('OcrJob', ocrJobSchema);
module.exports.OCR_JOB_TYPES = OCR_JOB_TYPES;
module.exports.OCR_JOB_STATUSES = OCR_JOB_STATUSES;
module.exports.OCR_TARGET_KINDS = OCR_TARGET_KINDS;
