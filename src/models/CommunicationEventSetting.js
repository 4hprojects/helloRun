const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const PRIORITIES = ['critical', 'high', 'medium', 'low', 'info'];

const communicationEventSettingSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'low',
      index: true
    },
    required: {
      type: Boolean,
      default: false
    },
    emailEnabled: {
      type: Boolean,
      default: false
    },
    inAppEnabled: {
      type: Boolean,
      default: false
    },
    fallbackToInApp: {
      type: Boolean,
      default: true
    },
    recipientRoles: {
      type: [String],
      default: []
    },
    locked: {
      type: Boolean,
      default: false
    },
    displayOrder: {
      type: Number,
      default: 1000
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

communicationEventSettingSchema.index({ category: 1, priority: 1 });
applySmokeTestSchema(communicationEventSettingSchema);

module.exports = mongoose.models.CommunicationEventSetting ||
  mongoose.model('CommunicationEventSetting', communicationEventSettingSchema);
module.exports.PRIORITIES = PRIORITIES;
