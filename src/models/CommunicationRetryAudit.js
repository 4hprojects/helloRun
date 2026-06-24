const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const ACTIONS = ['manual_retry', 'auto_dead_letter', 'hygiene_dead_letter', 'hygiene_cleanup'];
const ACTOR_TYPES = ['admin', 'system'];

const communicationRetryAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ACTIONS,
      required: true,
      index: true
    },
    actorType: {
      type: String,
      enum: ACTOR_TYPES,
      default: 'system',
      index: true
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    retryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunicationRetry',
      default: null,
      index: true
    },
    eventKey: {
      type: String,
      default: '',
      trim: true,
      index: true
    },
    statusFrom: {
      type: String,
      default: '',
      trim: true
    },
    statusTo: {
      type: String,
      default: '',
      trim: true
    },
    counts: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true
    },
    userAgent: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

communicationRetryAuditSchema.index({ createdAt: -1 });
communicationRetryAuditSchema.index({ eventKey: 1, createdAt: -1 });

applySmokeTestSchema(communicationRetryAuditSchema);

module.exports = mongoose.models.CommunicationRetryAudit ||
  mongoose.model('CommunicationRetryAudit', communicationRetryAuditSchema);
module.exports.ACTIONS = ACTIONS;
module.exports.ACTOR_TYPES = ACTOR_TYPES;
