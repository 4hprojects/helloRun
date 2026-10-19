const mongoose = require('mongoose');

// Single settings document for the OCR Training Center (/admin/ocr-training/settings).
// Dataset thresholds ship as conservative placeholders, marked unapproved: doc 07 requires
// the project owner to set readiness and non-regression rules after a real baseline, and no
// value here is a scientific minimum.
const ocrSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    dataset: {
      minApprovedSamples: { type: Number, default: 50, min: 1 },
      minTestSamples: { type: Number, default: 10, min: 1 },
      minValidationSamples: { type: Number, default: 5, min: 0 },
      minSamplesPerPlatform: { type: Number, default: 0, min: 0 },
      thresholdsApprovedByOwner: { type: Boolean, default: false }
    },
    evaluation: {
      // Allowed CER increase per platform/layout before a candidate fails its gate.
      maxPlatformCerRegression: { type: Number, default: 0, min: 0 },
      minEvaluationSamplesPerPlatform: { type: Number, default: 5, min: 1 },
      gatesApprovedByOwner: { type: Boolean, default: false }
    },
    retention: {
      sampleRetentionDays: { type: Number, default: 730, min: 30 },
      consentNoticeVersion: { type: String, default: '', maxlength: 40 }
    },
    training: {
      maxIterations: { type: Number, default: 2000, min: 100, max: 100000 },
      timeoutMinutes: { type: Number, default: 240, min: 10, max: 1440 },
      cpuQuotaPercent: { type: Number, default: 100, min: 10, max: 400 },
      memoryMaxMb: { type: Number, default: 2048, min: 256, max: 16384 },
      minFreeDiskMb: { type: Number, default: 5120, min: 512 },
      // Legal basis for using entries as training material. `opt_in`: only entries whose runner
      // ticked the box. `notice_opt_out`: every eligible entry, past and future, unless the runner
      // objects; allowed only after the revised policy is published (owner decision 2026-10-18).
      basis: { type: String, enum: ['opt_in', 'notice_opt_out'], default: 'opt_in' },
      noticePublishedAt: { type: Date, default: null },
      noticePolicyVersion: { type: String, default: '', maxlength: 40 },
      // Earliest date the backfill of existing entries may start (objection period).
      backfillNotBefore: { type: Date, default: null },
      backfillDailyCap: { type: Number, default: 500, min: 1, max: 20000 }
    },
    notifications: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['off', 'weekly', 'biweekly', 'monthly'], default: 'weekly' },
      // Owner choice (2026-10-18): Friday 16:00 in the timezone below. Admins can change it.
      dayOfWeek: { type: Number, default: 5, min: 0, max: 6 },
      hour: { type: Number, default: 16, min: 0, max: 23 },
      timezone: { type: String, default: 'Asia/Manila', maxlength: 60 },
      minimumNewSamples: { type: Number, default: 100, min: 1 },
      recipientMode: { type: String, enum: ['all_admins', 'selected'], default: 'all_admins' },
      recipientUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      mutedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      eventTypes: {
        type: [String],
        default: ['ocr.review_digest', 'ocr.dataset_ready', 'ocr.training_completed', 'ocr.training_failed', 'ocr.model_approval_needed', 'ocr.model_activated', 'ocr.quality_regression']
      },
      lastDigestPeriodKey: { type: String, default: '', maxlength: 40 }
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.models.OcrSettings || mongoose.model('OcrSettings', ocrSettingsSchema);
