const mongoose = require('mongoose');

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
    dateKey: { type: String, required: true },
    status: { type: String, enum: ['sending', 'completed', 'partial', 'failed'], default: 'sending' },
    adminTriggered: { type: Boolean, default: false },
    sentAt: { type: Date }
  },
  { timestamps: true }
);

eventPromotionSchema.index({ organizerId: 1, dateKey: 1 });
eventPromotionSchema.index({ eventId: 1, dateKey: 1 });

module.exports = mongoose.model('EventPromotion', eventPromotionSchema);
