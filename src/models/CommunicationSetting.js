const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const communicationSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      default: 'communication.global'
    },
    emailSystemEnabled: {
      type: Boolean,
      default: true
    },
    inAppNotificationsEnabled: {
      type: Boolean,
      default: true
    },
    emailMaintenanceMode: {
      type: Boolean,
      default: false
    },
    dailyEmailLimit: {
      type: Number,
      default: 100,
      min: 0
    },
    reservedCriticalEmailCount: {
      type: Number,
      default: 30,
      min: 0
    },
    softStopThreshold: {
      type: Number,
      default: 80,
      min: 0
    },
    hardStopThreshold: {
      type: Number,
      default: 100,
      min: 0
    },
    provider: {
      type: String,
      default: 'resend',
      trim: true
    },
    senderName: {
      type: String,
      default: 'HelloRun',
      trim: true
    },
    senderEmail: {
      type: String,
      default: '',
      trim: true
    },
    replyToEmail: {
      type: String,
      default: 'support@hellorun.online',
      trim: true
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
applySmokeTestSchema(communicationSettingSchema);

module.exports = mongoose.models.CommunicationSetting ||
  mongoose.model('CommunicationSetting', communicationSettingSchema);
