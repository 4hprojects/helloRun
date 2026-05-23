const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const badgeContentSchema = new mongoose.Schema(
  {
    badgeDefinitionId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    eventCoreId: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    mongoEventId: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    displayTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    displayDescription: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000
    },
    theme: {
      type: String,
      trim: true,
      default: 'event',
      maxlength: 80
    },
    rarity: {
      type: String,
      trim: true,
      default: 'common',
      maxlength: 40
    },
    unlockMessage: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

badgeContentSchema.index({ badgeDefinitionId: 1, eventCoreId: 1 }, { unique: true });
applySmokeTestSchema(badgeContentSchema);

module.exports = mongoose.models.BadgeContent || mongoose.model('BadgeContent', badgeContentSchema);
