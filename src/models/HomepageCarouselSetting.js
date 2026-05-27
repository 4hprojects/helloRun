const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const homepageCarouselSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      default: 'homepage.carousel'
    },
    enabled: {
      type: Boolean,
      default: true
    },
    loopEnabled: {
      type: Boolean,
      default: true
    },
    maxItems: {
      type: Number,
      default: 8,
      min: 1,
      max: 12
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

applySmokeTestSchema(homepageCarouselSettingSchema);

module.exports = mongoose.models.HomepageCarouselSetting ||
  mongoose.model('HomepageCarouselSetting', homepageCarouselSettingSchema);
