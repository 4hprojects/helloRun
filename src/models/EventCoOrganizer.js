const mongoose = require('mongoose');

const CO_ORGANIZER_STATUSES = Object.freeze(['pending', 'active', 'declined', 'cancelled', 'expired', 'revoked']);

const eventCoOrganizerSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  invitedEmail: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  status: { type: String, enum: CO_ORGANIZER_STATUSES, default: 'pending', index: true },
  tokenHash: { type: String, default: '', select: false },
  expiresAt: { type: Date, default: null },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date, default: null },
  declinedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

eventCoOrganizerSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventCoOrganizerSchema.index({ userId: 1, status: 1, eventId: 1 });
eventCoOrganizerSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.models.EventCoOrganizer || mongoose.model('EventCoOrganizer', eventCoOrganizerSchema);
module.exports.CO_ORGANIZER_STATUSES = CO_ORGANIZER_STATUSES;
