const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const eventReminderDeliverySchema = new mongoose.Schema({
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reminderType: { type: String, enum: ['event_started', 'submission_due'], required: true, index: true },
  scheduledFor: { type: Date, required: true, index: true },
  deadlineAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'suppressed', 'failed'], default: 'pending', index: true },
  claimedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null, index: true },
  suppressionReason: { type: String, trim: true, default: '', maxlength: 120 },
  inAppStatus: { type: String, trim: true, default: '', maxlength: 40 },
  emailStatus: { type: String, trim: true, default: '', maxlength: 40 },
  lastError: { type: String, trim: true, default: '', maxlength: 1000 },
  attemptCount: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

eventReminderDeliverySchema.index(
  { registrationId: 1, reminderType: 1 },
  { unique: true, name: 'idx_event_reminder_registration_type' }
);
eventReminderDeliverySchema.index({ reminderType: 1, deliveredAt: 1, status: 1 });
applySmokeTestSchema(eventReminderDeliverySchema);

module.exports = mongoose.models.EventReminderDelivery
  || mongoose.model('EventReminderDelivery', eventReminderDeliverySchema);
