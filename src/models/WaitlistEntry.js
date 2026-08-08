// src/models/WaitlistEntry.js
// Somebody waiting for a slot that does not exist yet.
//
// The original spec said a waitlisted person should be a `Registration` carrying a new
// `waitlisted` status. Measured against this codebase that is unsafe: there are 93 places
// that query registrations and only 4 of them filter on `status`, so a new status would
// silently add people who are not registered to rosters, exports, headcounts, the Postgres
// shadow, bib assignment and check-in. Every one of those would have to be found and
// corrected, and anything missed fails in the direction of letting someone onto a start
// line who never got a slot.
//
// A separate collection inverts that: nothing that exists today can see a waitlist entry,
// and promotion goes through the ordinary registration paths, so a promoted person is an
// ordinary registration with no special case anywhere downstream.

const mongoose = require('mongoose');

const OFFER_STATUSES = ['waiting', 'offered', 'promoted', 'expired', 'withdrawn'];

const waitlistEntrySchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },

    // '' means the whole event rather than one category. An event with no capped
    // categories still has a reason to keep a list.
    categoryId: { type: String, trim: true, maxlength: 80, default: '' },
    // Snapshotted so the queue still reads correctly if the organiser renames a category.
    categoryLabel: { type: String, trim: true, maxlength: 100, default: '' },

    // Set when the person was signed in. A waitlist has to accept people with no account —
    // that is most of a public list — so this is optional and the participant block below
    // is what promotion actually uses.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    participant: {
      firstName: { type: String, trim: true, maxlength: 60, required: true },
      lastName: { type: String, trim: true, maxlength: 60, required: true },
      email: { type: String, trim: true, lowercase: true, maxlength: 160, required: true },
      mobileNumber: { type: String, trim: true, maxlength: 40, default: '' }
    },

    status: {
      type: String,
      enum: OFFER_STATUSES,
      default: 'waiting',
      index: true
    },

    // Kept in step with `status` so the unique index below can be partial on it. A
    // partialFilterExpression cannot express "status is one of two values" portably, and
    // the rule being enforced — one live entry per person per category — is exactly this
    // flag. Maintained in one place, in the pre-validate hook.
    isActive: { type: Boolean, default: true },

    // An offer holds a real slot, so it must expire or the slot is lost for good.
    offeredAt: { type: Date, default: null },
    offerExpiresAt: { type: Date, default: null },
    // Only the hash is stored, as with every other emailed link in this codebase.
    offerTokenHash: { type: String, default: '' },
    // Which offer the slot was taken under, so a release can never be applied twice.
    slotHeld: { type: Boolean, default: false },

    promotedAt: { type: Date, default: null },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      default: null
    },

    withdrawnAt: { type: Date, default: null },
    // Who acted, when an organiser did it rather than the participant.
    actedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    notes: { type: String, trim: true, maxlength: 500, default: '' }
  },
  { timestamps: true }
);

// `isActive` is derived, never set by callers, so the index cannot drift from the status.
waitlistEntrySchema.pre('validate', function setActiveFlag(next) {
  this.isActive = this.status === 'waiting' || this.status === 'offered';
  next();
});

// One live entry per person per category. Someone who withdrew or let an offer lapse is
// free to join again, which is why this is partial on `isActive` rather than unconditional.
waitlistEntrySchema.index(
  { eventId: 1, categoryId: 1, 'participant.email': 1 },
  {
    name: 'waitlist_active_entry_unique',
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

// The queue itself: position is arrival order, so this is the read the whole feature turns on.
waitlistEntrySchema.index({ eventId: 1, categoryId: 1, status: 1, createdAt: 1 });
// The expiry sweep.
waitlistEntrySchema.index({ status: 1, offerExpiresAt: 1 });

module.exports = mongoose.models.WaitlistEntry || mongoose.model('WaitlistEntry', waitlistEntrySchema);
module.exports.OFFER_STATUSES = OFFER_STATUSES;
