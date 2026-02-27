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
      required: true,
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
      enum: ['virtual', 'onsite', 'hybrid'],
      required: true
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
    }
  },
  {
    timestamps: true
  }
);

eventSchema.index({ status: 1 });
eventSchema.index({ eventStartAt: 1 });
eventSchema.index({ organizerId: 1, createdAt: -1 });

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
