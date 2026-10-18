const mongoose = require('mongoose');

// One OCR administrator email per (eventKey, recipient) (doc 08). The unique index is the
// duplicate guard: a second scheduler, a restart or a retry can never create a second row
// for the same event and recipient. Rows hold counts and links only, never screenshots,
// raw OCR text or activity data.
const OCR_NOTIFICATION_TYPES = [
  'ocr.review_digest',
  'ocr.dataset_ready',
  'ocr.training_completed',
  'ocr.training_failed',
  'ocr.model_approval_needed',
  'ocr.model_activated',
  'ocr.quality_regression'
];

const ocrNotificationEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, enum: [...OCR_NOTIFICATION_TYPES, 'ocr.test_email'], required: true },
    eventKey: { type: String, trim: true, required: true, maxlength: 200 },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['queued', 'sending', 'sent', 'failed', 'suppressed'], default: 'queued', index: true },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseExpiresAt: { type: Date, default: null },
    providerMessageId: { type: String, trim: true, default: '', maxlength: 120 },
    errorCode: { type: String, trim: true, default: '', maxlength: 60 },
    sentAt: { type: Date, default: null }
  },
  { timestamps: true, minimize: false }
);

ocrNotificationEventSchema.index({ eventKey: 1, recipientId: 1 }, { unique: true });
ocrNotificationEventSchema.index({ status: 1, nextAttemptAt: 1 });
ocrNotificationEventSchema.index({ createdAt: -1 });

module.exports = mongoose.models.OcrNotificationEvent || mongoose.model('OcrNotificationEvent', ocrNotificationEventSchema);
module.exports.OCR_NOTIFICATION_TYPES = OCR_NOTIFICATION_TYPES;
