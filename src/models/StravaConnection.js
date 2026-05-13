const mongoose = require('mongoose');

const stravaConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    stravaAthleteId: {
      type: Number,
      required: true,
      index: true
    },
    athleteName: {
      type: String,
      trim: true,
      default: '',
      maxlength: 160
    },
    accessTokenEncrypted: {
      type: String,
      required: true
    },
    refreshTokenEncrypted: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Number,
      required: true
    },
    scope: {
      type: String,
      trim: true,
      default: ''
    },
    connectedAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    disconnectedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'revoked'],
      default: 'connected',
      index: true
    }
  },
  {
    timestamps: true
  }
);

stravaConnectionSchema.index({ userId: 1, status: 1 });
stravaConnectionSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.models.StravaConnection ||
  mongoose.model('StravaConnection', stravaConnectionSchema);
