const mongoose = require('mongoose');

const DELIVERY_STATUSES = ['pending', 'sending', 'sent', 'failed', 'skipped', 'suppressed', 'queued'];

const deliverySchema = new mongoose.Schema(
  {
    email: { type: String, default: '', trim: true },
    status: { type: String, enum: DELIVERY_STATUSES, default: 'pending' },
    reason: { type: String, default: '', trim: true },
    updatedAt: { type: Date, default: null }
  },
  { _id: false }
);

const eventPromotionSchema = new mongoose.Schema(
  {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    audience: {
      type: String,
      enum: ['previous_participants', 'non_participants', 'all_runners', 'selected_emails'],
      required: true
    },
    recipientCount: { type: Number, default: 0 },
    selectedCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    suppressedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    queuedCount: { type: Number, default: 0 },
    processedCount: { type: Number, default: 0 },
    deliveries: { type: [deliverySchema], default: [] },
    deliveryListTruncated: { type: Boolean, default: false },
    lastProgressAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    dateKey: { type: String, required: true },
    status: { type: String, enum: ['sending', 'completed', 'partial', 'failed'], default: 'sending' },
    adminTriggered: { type: Boolean, default: false },
    source: {
      type: String,
      enum: ['manual', 'automatic_publish'],
      default: 'manual'
    },
    automaticKey: {
      type: String,
      trim: true,
      default: null
    },
    sentAt: { type: Date }
  },
  { timestamps: true }
);

eventPromotionSchema.index({ organizerId: 1, dateKey: 1 });
eventPromotionSchema.index({ eventId: 1, dateKey: 1 });
eventPromotionSchema.index({ status: 1, createdAt: -1 });
eventPromotionSchema.index(
  { automaticKey: 1 },
  { unique: true, partialFilterExpression: { automaticKey: { $type: 'string' } } }
);

module.exports = mongoose.model('EventPromotion', eventPromotionSchema);
module.exports.DELIVERY_STATUSES = DELIVERY_STATUSES;
