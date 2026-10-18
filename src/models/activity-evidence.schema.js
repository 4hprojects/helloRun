const mongoose = require('mongoose');
const {
  URL_VERIFICATION_STATUSES,
  URL_VERIFICATION_METHODS,
  DUPLICATE_SIGNAL_KINDS
} = require('../utils/ocr/activity-evidence');

// Optional activity link and duplicate review signals on a run-proof entry
// (docs/improvement-plan/ocr-platform-aware, Phase 2). Only the normalised link rebuilt
// from the provider's activity id is kept, never the raw URL the runner pasted.
const activityUrlSchema = new mongoose.Schema(
  {
    normalizedUrl: { type: String, trim: true, required: true, maxlength: 300 },
    provider: { type: String, enum: ['strava', 'garmin', 'coros'], required: true },
    providerActivityId: { type: String, trim: true, required: true, maxlength: 64 },
    patternStatus: { type: String, trim: true, default: '', maxlength: 30 },
    submittedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const activityUrlVerificationSchema = new mongoose.Schema(
  {
    status: { type: String, enum: URL_VERIFICATION_STATUSES, default: 'not_provided' },
    method: { type: String, enum: [...URL_VERIFICATION_METHODS, ''], default: '' },
    checkedAt: { type: Date, default: null },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, trim: true, default: '', maxlength: 500 },
    comparedFields: {
      distance: { type: String, enum: ['matched', 'mismatched', 'not_compared', ''], default: '' },
      duration: { type: String, enum: ['matched', 'mismatched', 'not_compared', ''], default: '' },
      date: { type: String, enum: ['matched', 'mismatched', 'not_compared', ''], default: '' }
    }
  },
  { _id: false }
);

const duplicateSignalSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: DUPLICATE_SIGNAL_KINDS, required: true },
    otherEntryKind: { type: String, trim: true, default: '', maxlength: 40 },
    otherEntryId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sameRunner: { type: Boolean, default: false },
    sameEvent: { type: Boolean, default: false },
    distance: { type: Number, default: null },
    detectedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

// Opt-in to using cropped text lines of this screenshot to improve OCR (Phase 3).
const ocrTrainingConsentSchema = new mongoose.Schema(
  {
    granted: { type: Boolean, default: false },
    recordedAt: { type: Date, default: Date.now },
    noticeVersion: { type: String, trim: true, default: '', maxlength: 40 },
    withdrawnAt: { type: Date, default: null }
  },
  { _id: false }
);

module.exports = { activityUrlSchema, activityUrlVerificationSchema, duplicateSignalSchema, ocrTrainingConsentSchema };
