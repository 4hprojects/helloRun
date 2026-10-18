const mongoose = require('mongoose');

// One candidate OCR ground-truth line: a cropped text line from a proof image and the
// literal text shown in it (doc 02 "TrainingSample", doc 07 "Ground-truth preparation").
//
// Ground truth is what the pixels show, entered or confirmed by an OCR admin. It is never
// an entry's corrected activity value (organizerCorrections), never an unreviewed OCR
// reading, and never provider API data. Only `approved` + `eligible` samples with a
// recorded consent basis can enter a DatasetVersion.
const SAMPLE_STATUSES = ['pending', 'approved', 'excluded'];
const SAMPLE_FIELD_KEYS = ['distance', 'time', 'pace', 'date', 'other'];
const CONSENT_BASES = ['participant_opt_in', 'owner_own_activity', 'synthetic'];
const SAMPLE_SOURCES = ['submission_opt_in', 'admin_upload'];

const trainingSampleSchema = new mongoose.Schema(
  {
    schemaVersion: { type: Number, default: 1 },
    source: { type: String, enum: SAMPLE_SOURCES, required: true },
    sourceEntry: {
      kind: { type: String, default: '', maxlength: 40 },
      id: { type: mongoose.Schema.Types.ObjectId, default: null }
    },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    // Kept so a participant's withdrawal can exclude their samples; never exported.
    runnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    extractionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OcrExtraction', default: null },
    originalProofHash: { type: String, trim: true, default: '', maxlength: 64 },
    // Samples from one screenshot/activity always share a split (doc 01 "Baseline dataset").
    activityGroupId: { type: String, trim: true, required: true, maxlength: 80 },
    fieldKey: { type: String, enum: SAMPLE_FIELD_KEYS, required: true },
    cropKey: { type: String, trim: true, required: true, maxlength: 300 },
    cropChecksum: { type: String, trim: true, required: true, maxlength: 64 },
    cropBoundingBox: {
      left: { type: Number, default: 0 },
      top: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 }
    },
    cropWidth: { type: Number, default: 0 },
    cropHeight: { type: Number, default: 0 },
    platform: { type: String, trim: true, default: 'unknown', maxlength: 20 },
    layoutId: { type: String, trim: true, default: '', maxlength: 80 },
    profileVersion: { type: String, trim: true, default: '', maxlength: 40 },
    modelVersionId: { type: String, trim: true, default: '', maxlength: 60 },
    // What the engine read from this line, and the literal transcription a reviewer confirmed.
    ocrText: { type: String, default: '', maxlength: 200 },
    transcribedText: { type: String, default: '', maxlength: 200 },
    // Normalised activity value the line represents (e.g. "5.02 km"); informational only.
    normalizedValue: { type: String, default: '', maxlength: 80 },
    status: { type: String, enum: SAMPLE_STATUSES, default: 'pending', index: true },
    eligibility: { type: String, enum: ['eligible', 'ineligible'], default: 'ineligible' },
    ineligibleReasons: [{ type: String, trim: true, maxlength: 60 }],
    consentBasis: { type: String, enum: [...CONSENT_BASES, ''], default: '' },
    consentRecordedAt: { type: Date, default: null },
    consentNoticeVersion: { type: String, trim: true, default: '', maxlength: 40 },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    alignmentConfirmed: { type: Boolean, default: false },
    exclusionReason: { type: String, trim: true, default: '', maxlength: 300 },
    retentionExpiry: { type: Date, default: null },
    cropDeletedAt: { type: Date, default: null },
    datasetMemberships: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DatasetVersion' }]
  },
  { timestamps: true, optimisticConcurrency: true }
);

trainingSampleSchema.index({ status: 1, eligibility: 1, platform: 1, layoutId: 1, createdAt: -1 });
trainingSampleSchema.index({ cropChecksum: 1 });
trainingSampleSchema.index({ runnerId: 1 });
trainingSampleSchema.index({ retentionExpiry: 1 }, { partialFilterExpression: { cropDeletedAt: null } });
trainingSampleSchema.index({ 'sourceEntry.id': 1, fieldKey: 1 });

module.exports = mongoose.models.TrainingSample || mongoose.model('TrainingSample', trainingSampleSchema);
module.exports.SAMPLE_STATUSES = SAMPLE_STATUSES;
module.exports.SAMPLE_FIELD_KEYS = SAMPLE_FIELD_KEYS;
module.exports.CONSENT_BASES = CONSENT_BASES;
