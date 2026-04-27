const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
      unique: true,
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    runnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    isPersonalRecord: {
      type: Boolean,
      default: false,
      index: true
    },
    participationMode: {
      type: String,
      enum: ['virtual', 'onsite'],
      default: 'virtual'
    },
    raceDistance: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0.1,
      max: 500
    },
    elapsedMs: {
      type: Number,
      required: true,
      min: 1
    },
    runDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    runLocation: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200
    },
    runType: {
      type: String,
      enum: ['run', 'walk', 'hike', 'trail_run'],
      default: 'run',
      index: true
    },
    elevationGain: {
      type: Number,
      min: 0,
      max: 20000,
      default: null
    },
    proofType: {
      type: String,
      enum: ['gps', 'photo', 'manual'],
      default: 'manual'
    },
    proof: {
      url: { type: String, default: '' },
      key: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      hash: { type: String, default: '', maxlength: 64 }
    },
    proofNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1200
    },
    status: {
      type: String,
      enum: ['submitted', 'approved', 'rejected'],
      default: 'submitted',
      index: true
    },
    submissionCount: {
      type: Number,
      default: 1,
      min: 1
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1200
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500
    },
    certificate: {
      url: { type: String, default: '' },
      key: { type: String, default: '' },
      issuedAt: { type: Date, default: null }
    },
    ocrData: {
      extractedDistanceKm: { type: Number, default: null },
      extractedTimeMs: { type: Number, default: null },
      rawText: { type: String, default: '', maxlength: 2000 },
      confidence: { type: Number, default: 0, min: 0, max: 1 },
      distanceMismatch: { type: Boolean, default: false },
      timeMismatch: { type: Boolean, default: false },
      detectedSource: {
        type: String,
        enum: ['strava', 'nike', 'garmin', 'apple', 'google', 'unknown', ''],
        default: ''
      }
    },
    suspiciousFlag: {
      type: Boolean,
      default: false
    },
    suspiciousFlagReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

submissionSchema.index({ eventId: 1, status: 1, elapsedMs: 1 });
submissionSchema.index({ runnerId: 1, submittedAt: -1 });
submissionSchema.index({ eventId: 1, status: 1, submittedAt: -1 });
submissionSchema.index({ runnerId: 1, status: 1, submittedAt: -1 });
submissionSchema.index({ runnerId: 1, status: 1, 'certificate.issuedAt': -1 });

module.exports = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
