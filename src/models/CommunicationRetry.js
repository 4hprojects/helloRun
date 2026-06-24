const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const STATUSES = ['queued', 'retrying', 'sent', 'dead'];

const communicationRetrySchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'queued',
      index: true
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    nextAttemptAt: {
      type: Date,
      default: () => new Date(),
      index: true
    },
    lastAttemptAt: {
      type: Date,
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    },
    lastError: {
      type: String,
      default: '',
      trim: true
    },
    source: {
      type: String,
      default: '',
      trim: true
    },
    idempotencyKey: {
      type: String,
      trim: true
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

communicationRetrySchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
communicationRetrySchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true, $type: 'string' } } }
);

applySmokeTestSchema(communicationRetrySchema);

module.exports = mongoose.models.CommunicationRetry ||
  mongoose.model('CommunicationRetry', communicationRetrySchema);
module.exports.STATUSES = STATUSES;
