const mongoose = require('mongoose');

// Immutable dataset snapshot (doc 02 "DatasetVersion"). The manifest lists every sample
// with its split, crop checksum and literal transcription; manifestHash is the SHA-256 of
// that canonical JSON, so the same inputs always give the same hash and any change gives a
// new version. Rows are never updated after creation.
const datasetVersionSchema = new mongoose.Schema(
  {
    schemaVersion: { type: Number, default: 1 },
    name: { type: String, trim: true, required: true, maxlength: 80 },
    manifestHash: { type: String, trim: true, required: true, maxlength: 64 },
    splitRule: { type: String, trim: true, required: true, maxlength: 60 },
    manifest: {
      type: [new mongoose.Schema({
        sampleId: { type: mongoose.Schema.Types.ObjectId, required: true },
        split: { type: String, enum: ['train', 'validation', 'test'], required: true },
        activityGroupId: { type: String, required: true },
        cropKey: { type: String, required: true },
        cropChecksum: { type: String, required: true },
        transcribedText: { type: String, required: true },
        platform: { type: String, default: 'unknown' },
        layoutId: { type: String, default: '' },
        fieldKey: { type: String, default: '' }
      }, { _id: false })],
      default: []
    },
    counts: {
      total: { type: Number, default: 0 },
      train: { type: Number, default: 0 },
      validation: { type: Number, default: 0 },
      test: { type: Number, default: 0 },
      groups: { type: Number, default: 0 }
    },
    platformDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
    qualityReport: {
      checks: { type: [mongoose.Schema.Types.Mixed], default: [] },
      thresholds: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    consentCheck: {
      allConsented: { type: Boolean, default: false },
      bases: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    validationStatus: { type: String, enum: ['ready', 'not_ready'], required: true },
    notReadyReasons: [{ type: String, trim: true, maxlength: 200 }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false }
);

datasetVersionSchema.index({ createdAt: -1 });
datasetVersionSchema.index({ manifestHash: 1 });

function refuseUpdate(next) {
  next(new Error('DatasetVersion rows are immutable; create a new version instead.'));
}
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace']) {
  datasetVersionSchema.pre(hook, refuseUpdate);
}
datasetVersionSchema.pre('save', function preventResave(next) {
  if (!this.isNew) return next(new Error('DatasetVersion rows are immutable; create a new version instead.'));
  return next();
});

module.exports = mongoose.models.DatasetVersion || mongoose.model('DatasetVersion', datasetVersionSchema);
