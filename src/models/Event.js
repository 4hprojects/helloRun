const mongoose = require('mongoose');
const { DEFAULT_WAIVER_TEMPLATE } = require('../utils/waiver');
const { syncEventShadow } = require('../services/event-shadow.service');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const eventSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    referenceCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      immutable: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    organiserName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    eventDetailsMarkdown: {
      type: String,
      trim: true,
      maxlength: 20000,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published', 'closed', 'archived'],
      default: 'draft'
    },
    eventType: {
      type: String,
      enum: ['virtual', 'onsite', 'hybrid']
    },
    eventTypesAllowed: {
      type: [
        {
          type: String,
          enum: ['virtual', 'onsite', 'hybrid']
        }
      ],
      default: []
    },
    raceDistances: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 30
        }
      ],
      default: []
    },
    raceCategories: {
      type: [
        {
          categoryId: { type: String, trim: true, maxlength: 80 },
          name: { type: String, trim: true, maxlength: 100 },
          type: {
            type: String,
            enum: ['distance', 'challenge', 'open', 'other'],
            default: 'distance'
          },
          distanceLabel: { type: String, trim: true, maxlength: 30 },
          distanceKm: { type: Number, min: 0, default: null },
          slots: { type: Number, min: 0, default: null },
          cutoffTime: { type: String, trim: true, maxlength: 80, default: '' },
          ageGroup: { type: String, trim: true, maxlength: 80, default: '' },
          rewardsDescription: { type: String, trim: true, maxlength: 500, default: '' }
        }
      ],
      default: []
    },
    registrationOpenAt: Date,
    registrationCloseAt: Date,
    publicListingAvailableAt: {
      type: Date,
      default: null
    },
    homeFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    homeFeaturedRank: {
      type: Number,
      min: 0,
      default: null
    },
    homeFeaturedUntil: {
      type: Date,
      default: null
    },
    eventStartAt: Date,
    eventEndAt: Date,
    venueName: {
      type: String,
      trim: true,
      maxlength: 150
    },
    venueAddress: {
      type: String,
      trim: true,
      maxlength: 300
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100
    },
    province: {
      type: String,
      trim: true,
      maxlength: 100
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100
    },
    geo: {
      lat: Number,
      lng: Number
    },
    onsiteCheckinWindows: [
      {
        startAt: Date,
        endAt: Date
      }
    ],
    virtualWindow: {
      startAt: Date,
      endAt: Date
    },
    proofTypesAllowed: {
      type: [
        {
          type: String,
          enum: ['running_app_sync', 'gps', 'photo', 'manual']
        }
      ],
      default: []
    },
    virtualCompletionMode: {
      type: String,
      enum: ['single_activity', 'accumulated_distance'],
      default: 'single_activity'
    },
    targetDistanceKm: {
      type: Number,
      min: 0,
      default: null
    },
    minimumActivityDistanceKm: {
      type: Number,
      min: 0,
      default: null
    },
    acceptedRunTypes: {
      type: [
        {
          type: String,
          enum: ['run', 'walk', 'hike', 'trail_run']
        }
      ],
      default: []
    },
    finalSubmissionDeadlineAt: {
      type: Date,
      default: null
    },
    milestoneDistancesKm: {
      type: [
        {
          type: Number,
          min: 0
        }
      ],
      default: []
    },
    recognitionMode: {
      type: String,
      enum: ['completion_only', 'completion_with_optional_ranking'],
      default: 'completion_only'
    },
    leaderboardMode: {
      type: String,
      enum: ['finishers', 'top_distance', 'finishers_and_top_distance'],
      default: 'finishers'
    },
    feeMode: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free'
    },
    feeAmount: {
      type: Number,
      min: 0,
      default: null
    },
    feeCurrency: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 3,
      default: 'PHP'
    },
    paymentQrImageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    paymentQrImageKey: {
      type: String,
      trim: true,
      default: ''
    },
    paymentAccountName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ''
    },
    paymentInstructions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    digitalBadgeEnabled: {
      type: Boolean,
      default: false
    },
    digitalCertificateEnabled: {
      type: Boolean,
      default: true
    },
    leaderboardRecognitionEnabled: {
      type: Boolean,
      default: true
    },
    leaderboardSettings: {
      enabled: {
        type: Boolean,
        default: true
      },
      type: {
        type: String,
        enum: ['race_result', 'accumulated_challenge'],
        default: 'race_result'
      },
      rankingBasis: {
        type: String,
        enum: ['fastest_time', 'highest_verified_distance'],
        default: 'fastest_time'
      },
      visibility: {
        type: String,
        enum: ['public', 'registered_only', 'private_until_published'],
        default: 'public'
      },
      showPending: {
        type: Boolean,
        default: false
      },
      hideFlagged: {
        type: Boolean,
        default: true
      },
      nameDisplayMode: {
        type: String,
        enum: ['full_name', 'first_name_last_initial', 'display_name', 'anonymous_runner_id'],
        default: 'first_name_last_initial'
      },
      visibleColumns: {
        type: [
          {
            type: String,
            enum: ['rank', 'runner', 'category', 'distance', 'time', 'pace', 'status']
          }
        ],
        default: ['rank', 'runner', 'category', 'distance', 'time', 'pace', 'status']
      }
    },
    physicalRewardsEnabled: {
      type: Boolean,
      default: false
    },
    physicalRewardMedalEnabled: {
      type: Boolean,
      default: false
    },
    physicalRewardMedalAmount: {
      type: Number,
      min: 0,
      default: null
    },
    physicalRewardShirtEnabled: {
      type: Boolean,
      default: false
    },
    physicalRewardShirtAmount: {
      type: Number,
      min: 0,
      default: null
    },
    physicalRewardPatchEnabled: {
      type: Boolean,
      default: false
    },
    physicalRewardPatchAmount: {
      type: Number,
      min: 0,
      default: null
    },
    physicalRewardTowelEnabled: {
      type: Boolean,
      default: false
    },
    physicalRewardTowelAmount: {
      type: Number,
      min: 0,
      default: null
    },
    physicalRewardFinisherKitEnabled: {
      type: Boolean,
      default: false
    },
    physicalRewardFinisherKitAmount: {
      type: Number,
      min: 0,
      default: null
    },
    physicalRewardOtherItems: {
      type: [
        {
          name: { type: String, trim: true, maxlength: 80 },
          amount: { type: Number, min: 0, default: null }
        }
      ],
      default: []
    },
    physicalRewardsDescription: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    physicalRewardsClaimingNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    pricingMode: {
      type: String,
      enum: [
        'free',
        'distance_based',
        'customized_options',
        'distance_based_period',
        'customized_options_period',
        'package_period',
        // Legacy values kept readable during migration.
        'same_fee',
        'per_distance',
        'per_distance_period'
      ],
      default: 'free'
    },
    distancePricing: {
      type: [
        {
          categoryId: { type: String, trim: true, maxlength: 80, default: '' },
          distance: { type: String, trim: true, maxlength: 30 },
          amount: { type: Number, min: 0, default: null },
          earlyBirdAmount: { type: Number, min: 0, default: null },
          regularAmount: { type: Number, min: 0, default: null },
          lateAmount: { type: Number, min: 0, default: null }
        }
      ],
      default: []
    },
    pricingPeriods: {
      type: [
        {
          label: { type: String, trim: true, maxlength: 60 },
          code: {
            type: String,
            enum: ['early_bird', 'regular', 'late', 'custom'],
            default: 'custom'
          },
          startAt: { type: Date, default: null },
          endAt: { type: Date, default: null }
        }
      ],
      default: []
    },
    customizedOptions: {
      type: [
        {
          shortDescription: { type: String, trim: true, maxlength: 160 },
          amount: { type: Number, min: 0, default: null }
        }
      ],
      default: []
    },
    suggestedEventFee: {
      type: Number,
      min: 0,
      default: 0
    },
    finalEventFee: {
      type: Number,
      min: 0,
      default: null
    },
    registrationPackages: {
      type: [
        {
          packageId: { type: String, trim: true, maxlength: 80 },
          name: { type: String, trim: true, maxlength: 100 },
          includedItems: {
            medal: { type: Boolean, default: false },
            shirt: { type: Boolean, default: false },
            towel: { type: Boolean, default: false },
            patch: { type: Boolean, default: false },
            finisherKit: { type: Boolean, default: false },
            otherItemNames: {
              type: [{ type: String, trim: true, maxlength: 80 }],
              default: []
            }
          },
          pricingPeriods: {
            type: [
              {
                label: { type: String, trim: true, maxlength: 60 },
                code: {
                  type: String,
                  enum: ['early_bird', 'regular', 'late', 'custom'],
                  default: 'custom'
                },
                startAt: { type: Date, default: null },
                endAt: { type: Date, default: null },
                amount: { type: Number, min: 0, default: null }
              }
            ],
            default: []
          },
          notes: { type: String, trim: true, maxlength: 500, default: '' }
        }
      ],
      default: []
    },
    deliveryFeeEnabled: {
      type: Boolean,
      default: false
    },
    deliveryFeeAmount: {
      type: Number,
      min: 0,
      default: null
    },
    deliveryFeeDescription: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    requiresDeliveryAddress: {
      type: Boolean,
      default: false
    },
    requiresPhilippineDeliveryAddress: {
      type: Boolean,
      default: false
    },
    internationalRunnersAllowed: {
      type: Boolean,
      default: true
    },
    claimingMethod: {
      type: String,
      enum: ['delivery', 'pickup', 'both'],
      default: 'delivery'
    },
    specialRewardBenefits: {
      type: [
        {
          title: { type: String, trim: true, maxlength: 100 },
          description: { type: String, trim: true, maxlength: 500, default: '' },
          validUntil: { type: Date, default: null },
          appliesToPackageNames: {
            type: [{ type: String, trim: true, maxlength: 100 }],
            default: []
          }
        }
      ],
      default: []
    },
    bannerImageUrl: {
      type: String,
      trim: true
    },
    logoUrl: {
      type: String,
      trim: true
    },
    posterImageUrl: {
      type: String,
      trim: true
    },
    galleryImageUrls: {
      type: [
        {
          type: String,
          trim: true
        }
      ],
      default: []
    },
    waiverTemplate: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
      default: DEFAULT_WAIVER_TEMPLATE
    },
    waiverVersion: {
      type: Number,
      default: 1,
      min: 1
    },
    isPersonalRecord: {
      type: Boolean,
      default: false,
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    deleteReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    submittedForReviewAt: {
      type: Date,
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvalSource: {
      type: String,
      enum: ['', 'admin', 'auto'],
      default: ''
    },
    autoApprovedAt: {
      type: Date,
      default: null
    },
    autoApprovalRuleVersion: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },
    archivedAt: {
      type: Date,
      default: null
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    archiveReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

eventSchema.index({ status: 1 });
eventSchema.index({ eventStartAt: 1 });
eventSchema.index({ organizerId: 1, createdAt: -1 });
eventSchema.index({ status: 1, eventStartAt: 1, createdAt: -1 });
eventSchema.index({ organizerId: 1, status: 1, eventStartAt: -1 });
eventSchema.index({ status: 1, isDeleted: 1, updatedAt: -1 });
eventSchema.index({ organizerId: 1, status: 1, isDeleted: 1 });
eventSchema.index({ status: 1, isDeleted: 1, isPersonalRecord: 1, eventStartAt: 1, createdAt: -1 });
eventSchema.index({ status: 1, isDeleted: 1, isPersonalRecord: 1, registrationCloseAt: 1, eventStartAt: 1 });
eventSchema.index({ status: 1, isDeleted: 1, eventType: 1, createdAt: -1 });
eventSchema.index({ status: 1, isDeleted: 1, isPersonalRecord: 1, publicListingAvailableAt: 1 });
eventSchema.index({ status: 1, isDeleted: 1, isPersonalRecord: 1, homeFeatured: 1, homeFeaturedRank: 1, eventStartAt: 1 });
applySmokeTestSchema(eventSchema);

function shouldSyncSupabase() {
  return Boolean(process.env.DATABASE_URL);
}

function syncEventShadowInBackground(doc) {
  if (!shouldSyncSupabase() || !doc || !doc._id) {
    return;
  }

  syncEventShadow(doc, { operation: 'live_sync' }).catch((error) => {
    console.error('Supabase event shadow sync failed:', {
      eventId: String(doc._id),
      error: error?.message || String(error)
    });
  });
}

eventSchema.post('save', function (doc) {
  syncEventShadowInBackground(doc);
});

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
