const mongoose = require('mongoose');

/**
 * Race-day staff assigned to a single event.
 *
 * Deliberately *not* a new value on `User.role`. That field is global and is checked in
 * dozens of places; widening it would grant something everywhere to solve a problem that
 * exists in one event. An assignment here grants named permissions on one event and
 * nothing else, and revoking it is a single write.
 *
 * The permissions map to the onsite jobs that actually get delegated on race day.
 */
const STAFF_PERMISSIONS = Object.freeze([
  'check_in',
  'race_kit',
  'results'
]);

const eventStaffSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    permissions: {
      type: [String],
      enum: STAFF_PERMISSIONS,
      default: []
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    // Revoking keeps the row, so who-had-access-when stays answerable after the event.
    revokedAt: {
      type: Date,
      default: null
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

// One assignment per person per event; re-assigning updates the existing row.
eventStaffSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventStaffSchema.index({ eventId: 1, revokedAt: 1 });

module.exports =
  mongoose.models.EventStaff || mongoose.model('EventStaff', eventStaffSchema);
module.exports.STAFF_PERMISSIONS = STAFF_PERMISSIONS;
