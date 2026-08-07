const mongoose = require('mongoose');

/**
 * The revocable identity behind a bib QR code.
 *
 * The code itself is an encrypted, tamper-evident payload, which is enough to prove it
 * came from us — but not enough to withdraw one. Cancelling a registration or reissuing a
 * bib has to make the old code stop working, and that needs state.
 *
 * The stored value is the token id, not the token. Possessing the id gets you nothing:
 * a usable code also requires the encryption key, which never leaves the server. Keeping
 * the id readable is what lets the same identity be re-encrypted on demand — the race
 * pass regenerates the image on every page load, and a runner who screenshotted their
 * pass must not find it dead the next morning. Each render differs (random IV) while
 * resolving to the same identity.
 */
const bibQrTokenSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    bibNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      default: null,
      index: true
    },
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    // Revoking keeps the row so a scan can say "this was withdrawn" rather than
    // "never existed", and so the history stays answerable after the event.
    revokedAt: {
      type: Date,
      default: null
    },
    revokedReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200
    }
  },
  { timestamps: true }
);

// One live token per bib per event; revoked rows are excluded so a bib can be reissued.
bibQrTokenSchema.index(
  { eventId: 1, bibNumber: 1 },
  { unique: true, partialFilterExpression: { revokedAt: null } }
);

module.exports =
  mongoose.models.BibQrToken || mongoose.model('BibQrToken', bibQrTokenSchema);
