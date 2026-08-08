// src/models/RegistrationTransfer.js
// Handing a registration to somebody else.
//
// A separate document rather than fields on the Registration, for the same reason the
// waitlist is its own collection: a transfer has a life of its own — offered, accepted,
// approved, declined, expired — and none of that belongs on a record that the roster, the
// exports and the shadow sync all read as "a participant".
//
// It also has to outlive the swap. Once the participant is replaced, the registration
// itself no longer remembers who it belonged to, and "who was this before?" is exactly the
// question an organiser asks when two people turn up for one bib.

const mongoose = require('mongoose');

const TRANSFER_STATUSES = [
  'pending_recipient', // waiting for the new person to fill in their details
  'pending_approval', // they have, and the organiser has to agree
  'completed',
  'declined',
  'expired',
  'cancelled' // withdrawn by whoever started it
];

const participantSnapshotSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, maxlength: 60, default: '' },
    lastName: { type: String, trim: true, maxlength: 60, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
    mobile: { type: String, trim: true, maxlength: 40, default: '' }
  },
  { _id: false }
);

const registrationTransferSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },

    // Who it was. Snapshotted at initiation, because the registration stops being able to
    // answer this the moment the transfer completes.
    fromParticipant: { type: participantSnapshotSchema, default: () => ({}) },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    fromParticipantType: { type: String, trim: true, maxlength: 20, default: '' },

    // Who it is going to. The address is fixed at initiation and is what the link is bound
    // to — a transfer that could be redirected after the fact would be a way to hand
    // somebody else's paid entry to a stranger.
    toEmail: { type: String, trim: true, lowercase: true, maxlength: 160, required: true },
    toParticipant: { type: participantSnapshotSchema, default: () => ({}) },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    status: {
      type: String,
      enum: TRANSFER_STATUSES,
      default: 'pending_recipient',
      index: true
    },
    // Derived from status, so the partial unique index below cannot drift from it. Same
    // device as the waitlist: one live transfer per registration.
    isActive: { type: Boolean, default: true },

    // Only the hash is stored. The link is the credential, as everywhere else here.
    tokenHash: { type: String, default: '' },
    expiresAt: { type: Date, default: null },

    initiatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    initiatedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    approvedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },

    reason: { type: String, trim: true, maxlength: 500, default: '' },
    declineReason: { type: String, trim: true, maxlength: 500, default: '' },

    // True when the kit had already been handed over before the transfer. Not a blocker —
    // the two people can sort the shirt out between themselves — but the organiser must be
    // able to see it, because no second kit is coming.
    kitAlreadyReleased: { type: Boolean, default: false }
  },
  { timestamps: true }
);

registrationTransferSchema.pre('validate', function setActiveFlag(next) {
  this.isActive = this.status === 'pending_recipient' || this.status === 'pending_approval';
  next();
});

// One live transfer per registration. Two in flight would race to replace the same
// participant, and the loser's recipient would have signed a waiver for nothing.
registrationTransferSchema.index(
  { registrationId: 1 },
  {
    name: 'registration_transfer_active_unique',
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

registrationTransferSchema.index({ eventId: 1, status: 1, createdAt: -1 });
registrationTransferSchema.index({ status: 1, expiresAt: 1 });

module.exports =
  mongoose.models.RegistrationTransfer ||
  mongoose.model('RegistrationTransfer', registrationTransferSchema);
module.exports.TRANSFER_STATUSES = TRANSFER_STATUSES;
