const mongoose = require('mongoose');

// One server OCR result for one proof image, written once and never updated
// (doc 02 "OCRExtraction": write original recognition immutably). Reprocessing writes a
// new row with a higher revision; reviewer edits live on the entry's organizerCorrections
// and, for training text, on TrainingSample. Mongo-only, like ocrData.
const EXTRACTION_SOURCES = ['submission', 'reprocess', 'backfill', 'admin_test'];

const boundingBoxSchema = new mongoose.Schema(
  {
    left: { type: Number, required: true },
    top: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  { _id: false }
);

const fieldLocationSchema = new mongoose.Schema(
  {
    rawText: { type: String, default: '', maxlength: 200 },
    confidence: { type: Number, default: 0 },
    boundingBox: { type: boundingBoxSchema, default: null },
    sourcePass: { type: String, default: '', maxlength: 30 },
    locator: { type: String, default: '', maxlength: 40 }
  },
  { _id: false }
);

const extractedFieldSchema = new mongoose.Schema(
  {
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    unit: { type: String, default: '', maxlength: 10 },
    kind: { type: String, default: '', maxlength: 20 },
    sourcePass: { type: String, default: '', maxlength: 30 },
    location: { type: fieldLocationSchema, default: null }
  },
  { _id: false }
);

const ocrExtractionSchema = new mongoose.Schema(
  {
    schemaVersion: { type: Number, default: 1 },
    source: { type: String, enum: EXTRACTION_SOURCES, required: true },
    revision: { type: Number, default: 1 },
    supersedesId: { type: mongoose.Schema.Types.ObjectId, ref: 'OcrExtraction', default: null },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'OcrJob', default: null },
    proofKey: { type: String, trim: true, default: '', maxlength: 500 },
    proofHash: { type: String, trim: true, default: '', maxlength: 64 },
    differenceHash: { type: String, trim: true, default: '', maxlength: 16 },
    runnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targets: {
      type: [new mongoose.Schema({
        kind: { type: String, required: true, maxlength: 40 },
        id: { type: mongoose.Schema.Types.ObjectId, required: true }
      }, { _id: false })],
      default: []
    },
    status: { type: String, enum: ['complete', 'partial', 'failed'], required: true },
    errorCode: { type: String, trim: true, default: '', maxlength: 60 },
    pipelineVersion: { type: String, trim: true, default: '', maxlength: 40 },
    parserVersion: { type: String, trim: true, default: '', maxlength: 40 },
    modelVersionId: { type: String, trim: true, default: '', maxlength: 60 },
    profile: {
      id: { type: String, default: '', maxlength: 40 },
      version: { type: String, default: '', maxlength: 40 },
      status: { type: String, default: '', maxlength: 20 }
    },
    detection: {
      detectorVersion: { type: String, default: '', maxlength: 40 },
      status: { type: String, default: '', maxlength: 20 },
      platform: { type: String, default: '', maxlength: 20 },
      platformCandidate: { type: String, default: '', maxlength: 20 },
      confidence: { type: Number, default: 0 },
      urlProvider: { type: String, default: '', maxlength: 20 },
      urlProviderMismatch: { type: Boolean, default: false },
      signals: {
        type: [new mongoose.Schema({
          kind: { type: String, maxlength: 30 },
          confidence: { type: Number, default: 0 },
          evidence: { type: String, default: '', maxlength: 80 },
          pattern: { type: String, default: '', maxlength: 120 }
        }, { _id: false })],
        default: []
      },
      candidates: { type: [mongoose.Schema.Types.Mixed], default: [] }
    },
    layout: {
      id: { type: String, default: '', maxlength: 80 },
      orientation: { type: String, default: '', maxlength: 20 },
      theme: { type: String, default: '', maxlength: 20 }
    },
    image: {
      format: { type: String, default: '', maxlength: 10 },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      meanBrightness: { type: Number, default: null }
    },
    fields: {
      distance: { type: extractedFieldSchema, default: null },
      time: { type: extractedFieldSchema, default: null },
      pace: { type: extractedFieldSchema, default: null },
      date: { type: extractedFieldSchema, default: null },
      runType: { type: extractedFieldSchema, default: null },
      elevationGain: { type: extractedFieldSchema, default: null },
      steps: { type: extractedFieldSchema, default: null },
      name: { type: extractedFieldSchema, default: null },
      location: { type: extractedFieldSchema, default: null }
    },
    confidence: { type: Number, default: 0 },
    engineConfidence: { type: Number, default: 0 },
    rawText: { type: String, default: '', maxlength: 4000 },
    passes: { type: [mongoose.Schema.Types.Mixed], default: [] },
    validationFlags: [{ type: String, trim: true, maxlength: 60 }],
    elapsedMs: { type: Number, default: null }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    minimize: false
  }
);

ocrExtractionSchema.index({ 'targets.id': 1, createdAt: -1 });
ocrExtractionSchema.index({ proofHash: 1, createdAt: -1 });
ocrExtractionSchema.index({ differenceHash: 1 }, { sparse: true });
ocrExtractionSchema.index({ 'detection.platform': 1, createdAt: -1 });
ocrExtractionSchema.index({ source: 1, createdAt: -1 });

// Immutability: updates are refused at the model layer.
function refuseUpdate(next) {
  next(new Error('OcrExtraction rows are immutable; write a new revision instead.'));
}
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace']) {
  ocrExtractionSchema.pre(hook, refuseUpdate);
}
ocrExtractionSchema.pre('save', function preventResave(next) {
  if (!this.isNew) return next(new Error('OcrExtraction rows are immutable; write a new revision instead.'));
  return next();
});

module.exports = mongoose.models.OcrExtraction || mongoose.model('OcrExtraction', ocrExtractionSchema);
module.exports.EXTRACTION_SOURCES = EXTRACTION_SOURCES;
