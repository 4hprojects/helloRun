const mongoose = require('mongoose');
const { syncRegistrationPaymentShadow } = require('../services/registration-payment-shadow.service');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');
const logger = require('../utils/logger');
const { recordSyncFailureInBackground } = require('../services/sync-failure.service');

const registrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    // Who registered. Required for an account registration and absent for a guest, so
    // the invariant still holds everywhere it held before: any registration that is not
    // explicitly a guest must have a user.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function requiredForAccountRegistrations() {
        return this.participantType !== 'guest';
      },
      default: null,
      index: true
    },
    participantType: {
      type: String,
      enum: ['account', 'guest'],
      default: 'account',
      index: true
    },
    participant: {
      firstName: { type: String, required: true, trim: true, maxlength: 60 },
      lastName: { type: String, required: true, trim: true, maxlength: 60 },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
      mobile: { type: String, trim: true, default: '', maxlength: 25 },
      country: { type: String, trim: true, default: '', maxlength: 100 },
      dateOfBirth: { type: Date, default: null },
      gender: {
        type: String,
        enum: ['male', 'female', 'non_binary', 'prefer_not_to_say', ''],
        default: ''
      },
      emergencyContactName: { type: String, trim: true, default: '', maxlength: 120 },
      emergencyContactNumber: { type: String, trim: true, default: '', maxlength: 25 },
      runningGroup: { type: String, trim: true, default: '', maxlength: 120 },
      department: { type: String, trim: true, default: '', maxlength: 120 },
      position: { type: String, trim: true, default: '', maxlength: 120 },
      preferredFitnessApp: { type: String, trim: true, default: '', maxlength: 80 }
    },
    leaderboardDisplayPreference: {
      type: String,
      enum: ['full_name', 'abbreviated', 'hidden'],
      default: 'full_name'
    },
    consentToLeaderboard: {
      type: Boolean,
      default: true
    },
    participationMode: {
      type: String,
      enum: ['virtual', 'onsite'],
      required: true
    },
    raceDistance: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },
    addOns: {
      type: [
        {
          productId: { type: String, required: true, trim: true, maxlength: 64 },
          name: { type: String, required: true, trim: true, maxlength: 180 },
          productType: { type: String, trim: true, default: 'event_shop_item', maxlength: 50 },
          currency: { type: String, trim: true, default: 'PHP', maxlength: 10 },
          unitPrice: { type: Number, min: 0, default: 0 },
          quantity: { type: Number, min: 1, default: 1 },
          lineTotal: { type: Number, min: 0, default: 0 }
        }
      ],
      default: []
    },
    addOnsSubtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    addOnsCurrency: {
      type: String,
      trim: true,
      default: 'PHP',
      maxlength: 10
    },
    pricingSnapshot: {
      pricingMode: { type: String, trim: true, default: 'free', maxlength: 50 },
      source: { type: String, trim: true, default: 'free', maxlength: 50 },
      selectedOptionId: { type: String, trim: true, default: '', maxlength: 80 },
      optionDescription: { type: String, trim: true, default: '', maxlength: 160 },
      raceCategoryId: { type: String, trim: true, default: '', maxlength: 80 },
      raceCategoryName: { type: String, trim: true, default: '', maxlength: 100 },
      raceCategoryType: { type: String, trim: true, default: '', maxlength: 50 },
      raceDistance: { type: String, trim: true, default: '', maxlength: 30 },
      packageId: { type: String, trim: true, default: '', maxlength: 80 },
      packageName: { type: String, trim: true, default: '', maxlength: 100 },
      packagePeriodCode: { type: String, trim: true, default: '', maxlength: 50 },
      packagePeriodLabel: { type: String, trim: true, default: '', maxlength: 80 },
      packageIncludedItems: {
        type: [{ type: String, trim: true, maxlength: 80 }],
        default: []
      },
      pricingPeriodCode: { type: String, trim: true, default: '', maxlength: 50 },
      pricingPeriodLabel: { type: String, trim: true, default: '', maxlength: 80 },
      amount: { type: Number, min: 0, default: 0 },
      currency: { type: String, trim: true, default: 'PHP', maxlength: 10 }
    },
    paymentAmountDue: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentCurrency: {
      type: String,
      trim: true,
      default: 'PHP',
      maxlength: 10
    },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'confirmed', 'cancelled', 'refunded'],
      default: 'confirmed'
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'proof_submitted', 'proof_rejected', 'paid', 'failed', 'refunded'],
      default: 'unpaid'
    },
    paymentProof: {
      url: { type: String, default: '' },
      key: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      }
    },
    paymentSubmissionCount: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentReviewedAt: {
      type: Date,
      default: null
    },
    paymentReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    paymentReviewNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000
    },
    paymentRejectionReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500
    },
    paymentRejectionCode: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80
    },
    waiver: {
      accepted: { type: Boolean, required: true, default: true },
      version: { type: Number, required: true, min: 1 },
      signature: { type: String, required: true, trim: true, maxlength: 160 },
      acceptedAt: { type: Date, required: true, default: Date.now },
      templateSnapshot: { type: String, required: true, trim: true, maxlength: 20000 },
      renderedSnapshot: { type: String, required: true, trim: true, maxlength: 22000 }
    },
    confirmationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: /^HR-[A-Z0-9]{6}$/
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    // Cancellation. `status` already carried 'cancelled', but nothing ever set it and
    // there was nowhere to record why or by whom. Optional, so existing records are
    // unaffected and no backfill is needed.
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500
    },
    // A runner asking to be cancelled. Deliberately a request rather than a direct
    // cancellation: for a paid registration that would decide the refund on the
    // organiser's behalf, which is not ours to decide.
    cancellationRequestedAt: {
      type: Date,
      default: null
    },
    cancellationRequestReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500
    },
    accumulatedCertificateFinalization: {
      state: {
        type: String,
        enum: ['', 'waiting_deadline', 'waiting_reviews', 'generating', 'generated', 'failed'],
        default: ''
      },
      activityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AccumulatedActivitySubmission',
        default: null
      },
      certificateNumber: { type: String, trim: true, default: '' },
      lockedAt: { type: Date, default: null },
      finalizedAt: { type: Date, default: null },
      lastAttemptAt: { type: Date, default: null },
      error: { type: String, trim: true, default: '', maxlength: 1000 }
    }
  },
  {
    timestamps: true
  }
);

// One registration per account per event. Partial so guest rows, which carry no user,
// do not all collide on a single null. Named explicitly because the previous index used
// the name Mongoose derives from this key; declaring both under one name would make
// autoIndex fail on boot with an options conflict. Dropping the old one is a separate
// migration, run after this ships — until then both exist and enforce the same rule.
registrationSchema.index(
  { eventId: 1, userId: 1 },
  {
    name: 'eventId_1_userId_1_account_unique',
    unique: true,
    partialFilterExpression: { userId: { $type: 'objectId' } }
  }
);
registrationSchema.index({ userId: 1, registeredAt: -1 });
registrationSchema.index({ eventId: 1, registeredAt: -1 });
registrationSchema.index({ eventId: 1, paymentStatus: 1, registeredAt: -1 });
registrationSchema.index({ eventId: 1, participationMode: 1 });
registrationSchema.index({ eventId: 1, 'accumulatedCertificateFinalization.state': 1 });
applySmokeTestSchema(registrationSchema);

function shouldSyncSupabase() {
  return Boolean(process.env.DATABASE_URL);
}

function syncRegistrationPaymentShadowInBackground(doc) {
  if (!shouldSyncSupabase() || !doc || !doc._id) {
    return;
  }

  syncRegistrationPaymentShadow(doc, { operation: 'live_sync' }).catch((error) => {
    logger.error('Supabase registration/payment shadow sync failed:', {
      registrationId: String(doc._id),
      error: error?.message || String(error)
    });
    recordSyncFailureInBackground('registration', String(doc._id), error, { operation: 'live_sync' });
  });
}

registrationSchema.post('save', function (doc) {
  syncRegistrationPaymentShadowInBackground(doc);
});

module.exports = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
