const mongoose = require('mongoose');

// A trained OCR model artifact and its evaluation (doc 02 "ModelVersion"). Artifacts are
// stored once under a version-specific key and never overwritten; activation is a pointer
// change on OcrModelRegistry, verified against `checksum` before any process loads it.
// Status: candidate -> evaluated -> passed_gates | failed_gates -> approved -> (active via registry) | retired.
const MODEL_STATUSES = ['candidate', 'evaluated', 'passed_gates', 'failed_gates', 'approved', 'retired'];

const ocrModelVersionSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, required: true, maxlength: 80 },
    langCode: { type: String, trim: true, required: true, maxlength: 40 },
    artifactKey: { type: String, trim: true, required: true, maxlength: 300 },
    checksum: { type: String, trim: true, required: true, maxlength: 64 },
    sizeBytes: { type: Number, default: 0 },
    parentModelId: { type: String, trim: true, default: 'base-eng', maxlength: 60 },
    datasetVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DatasetVersion', default: null },
    datasetManifestHash: { type: String, trim: true, default: '', maxlength: 64 },
    trainingJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingJob', default: null },
    toolVersions: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: MODEL_STATUSES, default: 'candidate', index: true },
    evaluation: {
      evaluatedAt: { type: Date, default: null },
      baselineModelId: { type: String, default: '', maxlength: 60 },
      testSampleCount: { type: Number, default: 0 },
      overall: { type: mongoose.Schema.Types.Mixed, default: null },
      byPlatformLayout: { type: mongoose.Schema.Types.Mixed, default: null },
      gates: { type: [mongoose.Schema.Types.Mixed], default: [] },
      gateThresholds: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    approvalReason: { type: String, trim: true, default: '', maxlength: 500 }
  },
  { timestamps: true, minimize: false, optimisticConcurrency: true }
);

ocrModelVersionSchema.index({ status: 1, createdAt: -1 });
ocrModelVersionSchema.index({ artifactKey: 1 }, { unique: true });

module.exports = mongoose.models.OcrModelVersion || mongoose.model('OcrModelVersion', ocrModelVersionSchema);
module.exports.MODEL_STATUSES = MODEL_STATUSES;
