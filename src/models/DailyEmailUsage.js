const mongoose = require('mongoose');

const dailyEmailUsageSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
      trim: true
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      default: 'resend'
    },
    totalLimit: {
      type: Number,
      default: 100,
      min: 0
    },
    sentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    criticalSentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    highSentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    mediumSentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lowSentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    infoSentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    failedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    skippedCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

dailyEmailUsageSchema.index({ dateKey: 1, provider: 1 }, { unique: true });

module.exports = mongoose.models.DailyEmailUsage ||
  mongoose.model('DailyEmailUsage', dailyEmailUsageSchema);
