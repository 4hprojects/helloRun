const mongoose = require('mongoose');

// One admin-started pass over existing run-proof entries to cut OCR training candidates
// (owner decision 2026-10-18: notice + objection basis). Resumable: the cursor is the last
// processed _id per collection. `activeLock` allows a single active run system-wide.
const BACKFILL_STATUSES = ['running', 'paused', 'completed', 'cancelled', 'failed'];

const ocrBackfillRunSchema = new mongoose.Schema(
  {
    status: { type: String, enum: BACKFILL_STATUSES, default: 'running', index: true },
    activeLock: { type: String, default: 'active' },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    noticePolicyVersion: { type: String, default: '', maxlength: 40 },
    dailyCap: { type: Number, required: true },
    cursor: {
      submissions: { type: mongoose.Schema.Types.ObjectId, default: null },
      accumulatedactivitysubmissions: { type: mongoose.Schema.Types.ObjectId, default: null }
    },
    exhausted: {
      submissions: { type: Boolean, default: false },
      accumulatedactivitysubmissions: { type: Boolean, default: false }
    },
    counts: {
      scanned: { type: Number, default: 0 },
      queued: { type: Number, default: 0 },
      reused: { type: Number, default: 0 },
      alreadySampled: { type: Number, default: 0 },
      candidates: { type: Number, default: 0 },
      excluded: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    today: {
      dateKey: { type: String, default: '' },
      processed: { type: Number, default: 0 }
    },
    lastStepAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    errorSummary: { type: String, default: '', maxlength: 300 }
  },
  { timestamps: true, minimize: false }
);

ocrBackfillRunSchema.index({ activeLock: 1 }, { unique: true, partialFilterExpression: { activeLock: 'active' } });
ocrBackfillRunSchema.index({ createdAt: -1 });

module.exports = mongoose.models.OcrBackfillRun || mongoose.model('OcrBackfillRun', ocrBackfillRunSchema);
module.exports.BACKFILL_STATUSES = BACKFILL_STATUSES;
