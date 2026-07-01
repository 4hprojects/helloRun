const mongoose = require('mongoose');

const eventPromotionSchema = new mongoose.Schema(
  {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    audience: {
      type: String,
      enum: ['previous_participants', 'non_participants', 'all_runners'],
      required: true
    },
    recipientCount: { type: Number, default: 0 },
    dateKey: { type: String, required: true },
    status: { type: String, enum: ['sending', 'completed', 'failed'], default: 'sending' },
    adminTriggered: { type: Boolean, default: false },
    sentAt: { type: Date }
  },
  { timestamps: true }
);

eventPromotionSchema.index({ organizerId: 1, dateKey: 1 });
eventPromotionSchema.index({ eventId: 1, dateKey: 1 });

module.exports = mongoose.model('EventPromotion', eventPromotionSchema);
