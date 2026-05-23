const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const STATUSES = ['queued', 'sent', 'failed', 'skipped', 'suppressed', 'fallback_in_app'];
const CHANNELS = ['email', 'in_app', 'admin'];

const communicationLogSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    channel: {
      type: String,
      enum: CHANNELS,
      required: true,
      index: true
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    recipientEmail: {
      type: String,
      default: '',
      trim: true
    },
    subject: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: STATUSES,
      required: true,
      index: true
    },
    statusReason: {
      type: String,
      default: '',
      trim: true
    },
    provider: {
      type: String,
      default: 'resend',
      trim: true
    },
    providerMessageId: {
      type: String,
      default: '',
      trim: true
    },
    priority: {
      type: String,
      default: 'low',
      trim: true
    },
    quotaCounted: {
      type: Boolean,
      default: false
    },
    isTest: {
      type: Boolean,
      default: false,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    sentAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

communicationLogSchema.index({ eventKey: 1, createdAt: -1 });
communicationLogSchema.index({ recipientUserId: 1, createdAt: -1 });
communicationLogSchema.index({ channel: 1, status: 1, createdAt: -1 });
applySmokeTestSchema(communicationLogSchema);

module.exports = mongoose.models.CommunicationLog ||
  mongoose.model('CommunicationLog', communicationLogSchema);
module.exports.STATUSES = STATUSES;
module.exports.CHANNELS = CHANNELS;
