const mongoose = require('mongoose');

// One manually started Tesseract fine-tuning run (doc 02 "TrainingJob", doc 07).
// Status: queued -> preparing -> training -> evaluating -> completed | failed | cancelled | interrupted.
// `activeLock` is set while a job is queued or running; its unique index means at most one
// active training job exists at any time, whatever the number of admins or processes.
const TRAINING_JOB_STATUSES = ['queued', 'preparing', 'training', 'evaluating', 'completed', 'failed', 'cancelled', 'interrupted'];
const ACTIVE_TRAINING_STATUSES = ['queued', 'preparing', 'training', 'evaluating'];

const trainingJobSchema = new mongoose.Schema(
  {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    idempotencyKey: { type: String, trim: true, required: true, maxlength: 100 },
    datasetVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DatasetVersion', required: true },
    datasetManifestHash: { type: String, trim: true, required: true, maxlength: 64 },
    startModelVersionId: { type: String, trim: true, default: 'base-eng', maxlength: 60 },
    config: {
      maxIterations: { type: Number, required: true },
      timeoutMinutes: { type: Number, required: true },
      cpuQuotaPercent: { type: Number, required: true },
      memoryMaxMb: { type: Number, required: true },
      minFreeDiskMb: { type: Number, required: true }
    },
    configHash: { type: String, trim: true, required: true, maxlength: 64 },
    status: { type: String, enum: TRAINING_JOB_STATUSES, default: 'queued', index: true },
    activeLock: { type: String, default: 'active' },
    progress: {
      phase: { type: String, default: '', maxlength: 40 },
      percent: { type: Number, default: 0 },
      message: { type: String, default: '', maxlength: 300 }
    },
    cancelRequested: { type: Boolean, default: false },
    cancelRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    claimedBy: { type: String, trim: true, default: '', maxlength: 120 },
    heartbeatAt: { type: Date, default: null },
    leaseExpiresAt: { type: Date, default: null },
    preflight: { type: mongoose.Schema.Types.Mixed, default: null },
    resources: {
      peakRssMb: { type: Number, default: null },
      durationSeconds: { type: Number, default: null },
      diskUsedMb: { type: Number, default: null },
      limiter: { type: String, default: '', maxlength: 40 }
    },
    environment: { type: mongoose.Schema.Types.Mixed, default: null },
    logsKey: { type: String, trim: true, default: '', maxlength: 300 },
    resultModelVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OcrModelVersion', default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    errorCode: { type: String, trim: true, default: '', maxlength: 60 },
    errorSummary: { type: String, trim: true, default: '', maxlength: 500 }
  },
  { timestamps: true, minimize: false }
);

trainingJobSchema.index({ idempotencyKey: 1 }, { unique: true });
trainingJobSchema.index({ activeLock: 1 }, { unique: true, partialFilterExpression: { activeLock: 'active' } });
trainingJobSchema.index({ createdAt: -1 });

module.exports = mongoose.models.TrainingJob || mongoose.model('TrainingJob', trainingJobSchema);
module.exports.TRAINING_JOB_STATUSES = TRAINING_JOB_STATUSES;
module.exports.ACTIVE_TRAINING_STATUSES = ACTIVE_TRAINING_STATUSES;
