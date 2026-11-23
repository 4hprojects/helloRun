'use strict';

const mongoose = require('mongoose');

const OCR_PRODUCT_EVENTS = Object.freeze([
  'modal_opened',
  'screenshot_selected',
  'analysis_started',
  'analysis_completed',
  'analysis_failed',
  'analysis_cancelled',
  'fields_corrected',
  'review_opened',
  'submission_succeeded',
  'submission_failed',
  'consent_shown',
  'consent_granted',
  'flow_completed'
]);
const OCR_TARGET_KINDS = Object.freeze([
  'standard', 'accumulated', 'personal_record', 'resubmission', 'event_multi', 'unknown'
]);
const OCR_DEVICE_CLASSES = Object.freeze(['mobile', 'tablet', 'desktop', 'unknown']);
const OCR_RESULT_STATUSES = Object.freeze([
  'none', 'complete', 'partial', 'failed', 'cancelled', 'submitted', 'rejected', 'timeout', 'unknown'
]);
const OCR_PLATFORM_BUCKETS = Object.freeze([
  'strava', 'nike', 'garmin', 'apple', 'google', 'coros', 'unknown'
]);
const OCR_DETECTED_FIELDS = Object.freeze([
  'distance', 'duration', 'date', 'type', 'elevation', 'steps', 'location', 'name'
]);

const ocrProductEventSchema = new mongoose.Schema({
  flowId: { type: String, trim: true, required: true, maxlength: 64, index: true },
  event: { type: String, enum: OCR_PRODUCT_EVENTS, required: true, index: true },
  latencyMs: { type: Number, min: 0, max: 300000, default: null },
  targetKind: { type: String, enum: OCR_TARGET_KINDS, default: 'unknown' },
  deviceClass: { type: String, enum: OCR_DEVICE_CLASSES, default: 'unknown' },
  resultStatus: { type: String, enum: OCR_RESULT_STATUSES, default: 'none' },
  detectedPlatform: { type: String, enum: OCR_PLATFORM_BUCKETS, default: 'unknown' },
  fieldsDetected: [{ type: String, enum: OCR_DETECTED_FIELDS }],
  occurredAt: { type: Date, required: true, default: Date.now, index: true },
  expiresAt: { type: Date, required: true }
}, {
  versionKey: false,
  strict: 'throw'
});

ocrProductEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ocrProductEventSchema.index({ event: 1, occurredAt: -1 });

module.exports = mongoose.models.OcrProductEvent || mongoose.model('OcrProductEvent', ocrProductEventSchema);
module.exports.OCR_PRODUCT_EVENTS = OCR_PRODUCT_EVENTS;
module.exports.OCR_TARGET_KINDS = OCR_TARGET_KINDS;
module.exports.OCR_DEVICE_CLASSES = OCR_DEVICE_CLASSES;
module.exports.OCR_RESULT_STATUSES = OCR_RESULT_STATUSES;
module.exports.OCR_PLATFORM_BUCKETS = OCR_PLATFORM_BUCKETS;
module.exports.OCR_DETECTED_FIELDS = OCR_DETECTED_FIELDS;
