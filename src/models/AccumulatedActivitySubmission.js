const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

/**
 * AccumulatedActivitySubmission model for accumulated-distance activity submissions
 * 
 * OFFICIAL SUBMISSION STATE (synced to Supabase submissions_core):
 * - registrationId, eventId, runnerId: identification
 * - distanceKm, elapsedMs, runDate, runType: official accumulated result metrics
 * - proofType, proof (url/key): proof metadata
 * - status (submitted/approved/rejected): official submission state
 * - submittedAt, reviewedAt, reviewedBy: official review audit trail
 * - certificate: issued certificate metadata
 * 
 * OCR ANALYSIS PAYLOAD (stays in MongoDB, NOT synced to Supabase):
 * - ocrData: OCR recognition scores, extracted metrics, candidate names, confidence levels
 * - suspiciousFlag, suspiciousFlagReason: manual review flagging for suspicious entries
 * - validation: structured proof validation and auto-approval decision metadata
 * - stravaActivity: Strava API response metadata (for import traceability only)
 * - proofNotes, runLocation, elevationGain, steps: flexible run details
 * 
 * This separation allows OCR analysis, detection metadata, and suspicious flags to evolve
 * independently in MongoDB while keeping Supabase as the official transactional ledger.
 */
const accumulatedActivitySubmissionSchema = new mongoose.Schema(
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
    runnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    submissionAttemptId: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
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
    steps: {
      type: Number,
      min: 0,
      max: 200000,
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
    source: {
      type: String,
      enum: ['manual_upload', 'strava'],
      default: 'manual_upload',
      index: true
    },
    stravaActivity: {
      id: { type: Number, default: null },
      athleteId: { type: Number, default: null },
      name: { type: String, trim: true, default: '', maxlength: 200 },
      type: { type: String, trim: true, default: '', maxlength: 80 },
      sportType: { type: String, trim: true, default: '', maxlength: 80 },
      distanceMeters: { type: Number, default: null },
      distanceKm: { type: Number, default: null },
      movingTimeSeconds: { type: Number, default: null },
      elapsedTimeSeconds: { type: Number, default: null },
      startDate: { type: Date, default: null },
      startDateLocal: { type: Date, default: null },
      timezone: { type: String, trim: true, default: '', maxlength: 120 },
      elevationGain: { type: Number, default: null },
      averageSpeed: { type: Number, default: null },
      url: { type: String, trim: true, default: '', maxlength: 500 },
      importedAt: { type: Date, default: null }
    },
    status: {
      type: String,
      enum: ['submitted', 'approved', 'rejected'],
      default: 'submitted',
      index: true
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
    rejectionCode: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80
    },
    certificate: {
      url: { type: String, default: '' },
      key: { type: String, default: '' },
      issuedAt: { type: Date, default: null },
      certificateNumber: { type: String, trim: true, default: '' },
      verificationUrl: { type: String, trim: true, default: '' },
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CertificateTemplate',
        default: null
      },
      status: {
        type: String,
        enum: ['pending', 'generated', 'regenerated', 'revoked', 'failed', ''],
        default: ''
      },
      revokedAt: { type: Date, default: null },
      regeneratedAt: { type: Date, default: null },
      generationError: { type: String, trim: true, default: '', maxlength: 1000 },
      goalDistanceKm: { type: Number, min: 0, default: null },
      verifiedDistanceKm: { type: Number, min: 0, default: null },
      approvedActivityCount: { type: Number, min: 0, default: null },
      finalizedAt: { type: Date, default: null }
    },
    ocrData: {
      extractedDistanceKm: { type: Number, default: null },
      extractedTimeMs: { type: Number, default: null },
      extractedElevationGain: { type: Number, default: null },
      extractedSteps: { type: Number, default: null },
      extractedRunDate: { type: String, default: '', maxlength: 10 },
      extractedRunLocation: { type: String, trim: true, default: '', maxlength: 200 },
      extractedRunType: {
        type: String,
        enum: ['run', 'walk', 'hike', 'trail_run', ''],
        default: ''
      },
      rawText: { type: String, default: '', maxlength: 2000 },
      confidence: { type: Number, default: 0, min: 0, max: 1 },
      distanceMismatch: { type: Boolean, default: false },
      timeMismatch: { type: Boolean, default: false },
      elevationMismatch: { type: Boolean, default: false },
      stepsMismatch: { type: Boolean, default: false },
      dateMismatch: { type: Boolean, default: false },
      locationMismatch: { type: Boolean, default: false },
      runTypeMismatch: { type: Boolean, default: false },
      detectedSource: {
        type: String,
        enum: ['strava', 'nike', 'garmin', 'apple', 'google', 'coros', 'unknown', ''],
        default: ''
      },
      parserVersion: { type: String, trim: true, default: '', maxlength: 40 },
      ocrPass: { type: String, trim: true, default: '', maxlength: 40 },
      qualityFlags: [{ type: String, trim: true, maxlength: 80 }],
      extractedName: { type: String, trim: true, default: '', maxlength: 120 },
      nameMatchStatus: {
        type: String,
        enum: ['matched', 'mismatched', 'not_detected', 'not_checked'],
        default: 'not_checked'
      },
      nameMismatchAcknowledged: { type: Boolean, default: false }
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
    },
    validation: {
      method: {
        type: String,
        enum: ['ocr', 'strava', 'manual_upload', 'unknown'],
        default: 'unknown'
      },
      autoApprovalEligible: {
        type: Boolean,
        default: false
      },
      reviewRequired: {
        type: Boolean,
        default: true
      },
      reviewReason: {
        type: String,
        trim: true,
        default: '',
        maxlength: 120
      },
      submissionMode: {
        type: String,
        enum: ['one_time', 'personal_record', 'accumulated', 'unknown'],
        default: 'accumulated'
      },
      detectedDistanceKm: {
        type: Number,
        default: null
      },
      minimumRequiredDistanceKm: {
        type: Number,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

accumulatedActivitySubmissionSchema.index({ eventId: 1, status: 1, submittedAt: -1 });
accumulatedActivitySubmissionSchema.index({ registrationId: 1, status: 1, submittedAt: -1 });
accumulatedActivitySubmissionSchema.index({ runnerId: 1, status: 1, submittedAt: -1 });
accumulatedActivitySubmissionSchema.index({ runnerId: 1, submissionAttemptId: 1 });
accumulatedActivitySubmissionSchema.index({ eventId: 1, status: 1, distanceKm: -1 });
accumulatedActivitySubmissionSchema.index(
  { runnerId: 1, eventId: 1, 'stravaActivity.id': 1 },
  { sparse: true }
);
accumulatedActivitySubmissionSchema.index({ runnerId: 1, 'proof.hash': 1 }, { sparse: true });
accumulatedActivitySubmissionSchema.index({ registrationId: 1, 'certificate.url': 1 });
applySmokeTestSchema(accumulatedActivitySubmissionSchema);

module.exports = mongoose.models.AccumulatedActivitySubmission ||
  mongoose.model('AccumulatedActivitySubmission', accumulatedActivitySubmissionSchema);
