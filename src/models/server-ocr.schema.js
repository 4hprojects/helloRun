const mongoose = require('mongoose');

// Server-side OCR summary attached to a run-proof entry
// (docs/improvement-plan/ocr-platform-aware). The full, immutable extraction lives in
// OcrExtraction; this is the small projection reviewers and auto-approval read.
//
// Kept apart from `ocrData`, which stays the browser's prefill record exactly as before.
// Both stay Mongo-only: neither is synced to the Supabase shadow tables.
const SERVER_OCR_STATUSES = ['not_run', 'queued', 'processing', 'complete', 'partial', 'failed'];

const serverOcrAutoApprovalSchema = new mongoose.Schema(
  {
    extractedDistanceKm: { type: Number, default: null },
    extractedTimeMs: { type: Number, default: null },
    extractedRunDate: { type: String, default: '', maxlength: 10 },
    extractedRunType: { type: String, trim: true, default: '', maxlength: 20 },
    extractedElevationGain: { type: Number, default: null },
    extractedSteps: { type: Number, default: null },
    extractedName: { type: String, trim: true, default: '', maxlength: 120 },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    nameMatchStatus: { type: String, trim: true, default: 'not_checked', maxlength: 20 },
    distanceMismatch: { type: Boolean, default: false },
    timeMismatch: { type: Boolean, default: false },
    elevationMismatch: { type: Boolean, default: false },
    stepsMismatch: { type: Boolean, default: false },
    dateMismatch: { type: Boolean, default: false },
    locationMismatch: { type: Boolean, default: false },
    runTypeMismatch: { type: Boolean, default: false }
  },
  { _id: false }
);

const serverOcrSchema = new mongoose.Schema(
  {
    status: { type: String, enum: SERVER_OCR_STATUSES, default: 'not_run' },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'OcrJob', default: null },
    extractionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OcrExtraction', default: null },
    // The proof this reading belongs to. A resubmitted proof makes the summary stale.
    proofKey: { type: String, trim: true, default: '', maxlength: 500 },
    platform: { type: String, trim: true, default: '', maxlength: 20 },
    platformStatus: { type: String, trim: true, default: '', maxlength: 20 },
    profileId: { type: String, trim: true, default: '', maxlength: 40 },
    profileVersion: { type: String, trim: true, default: '', maxlength: 40 },
    modelVersionId: { type: String, trim: true, default: '', maxlength: 60 },
    layoutId: { type: String, trim: true, default: '', maxlength: 80 },
    timeKind: { type: String, trim: true, default: '', maxlength: 20 },
    validationFlags: [{ type: String, trim: true, maxlength: 60 }],
    suspicious: { type: Boolean, default: false },
    suspiciousReasons: { type: String, trim: true, default: '', maxlength: 500 },
    autoApproval: { type: serverOcrAutoApprovalSchema, default: null },
    errorCode: { type: String, trim: true, default: '', maxlength: 60 },
    queuedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { _id: false }
);

module.exports = { SERVER_OCR_STATUSES, serverOcrSchema };
