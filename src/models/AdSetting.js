const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const adSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      default: 'ads.global'
    },
    enabled: {
      type: Boolean,
      default: true
    },
    scriptEnabled: {
      type: Boolean,
      default: true
    },
    publisherId: {
      type: String,
      trim: true,
      default: 'ca-pub-4537208011192461'
    },
    pageGroups: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

applySmokeTestSchema(adSettingSchema);

module.exports = mongoose.models.AdSetting ||
  mongoose.model('AdSetting', adSettingSchema);
