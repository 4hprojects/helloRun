const mongoose = require('mongoose');
const { DEFAULT_WAIVER_TEMPLATE } = require('../utils/waiver');

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
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
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
    registrationOpenAt: Date,
    registrationCloseAt: Date,
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
          enum: ['gps', 'photo', 'manual']
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

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
