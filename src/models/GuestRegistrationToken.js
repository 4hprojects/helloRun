const mongoose = require('mongoose');

/**
 * The link a guest uses to reach their own registration.
 *
 * A guest has no account, so there is no session to authorise them — the link itself is
 * the credential. Only its SHA-256 hash is stored, so a leaked database dump cannot be
 * turned back into working links, and the raw token is shown exactly once when it is
 * minted.
 *
 * The registration reference is deliberately NOT the credential. It is printed on
 * confirmations and read out at desks, so anyone who overhears one must not thereby gain
 * access to the registration behind it.
 */
const guestRegistrationTokenSchema = new mongoose.Schema(
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
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    purpose: {
      type: String,
      enum: ['manage', 'claim'],
      default: 'manage'
    },
    // A manage link lasts as long as the registration matters; a claim link is a
    // one-shot credential that turns a guest entry into an account's, so it expires.
    expiresAt: {
      type: Date,
      default: null
    },
    usedAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    },
    lastUsedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

guestRegistrationTokenSchema.index({ registrationId: 1, purpose: 1, revokedAt: 1 });

module.exports =
  mongoose.models.GuestRegistrationToken ||
  mongoose.model('GuestRegistrationToken', guestRegistrationTokenSchema);
