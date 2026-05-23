const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const badgeTemplateSchema = new mongoose.Schema(
  {
    templateCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 120
    },
    scope: {
      type: String,
      enum: ['global', 'event', 'challenge', 'organiser'],
      default: 'event',
      index: true
    },
    titlePattern: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    descriptionPattern: {
      type: String,
      trim: true,
      default: '',
      maxlength: 600
    },
    defaultImageUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000
    },
    badgeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    requirementType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true
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
applySmokeTestSchema(badgeTemplateSchema);

module.exports = mongoose.models.BadgeTemplate || mongoose.model('BadgeTemplate', badgeTemplateSchema);
