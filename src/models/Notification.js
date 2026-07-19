const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600
    },
    href: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    dedupeKey: {
      type: String,
      trim: true,
      maxlength: 180,
      default: ''
    },
    readAt: {
      type: Date,
      default: null,
      index: true
    },
    archivedAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, archivedAt: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, archivedAt: 1, readAt: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string', $gt: '' } }, name: 'idx_notifications_user_dedupe' }
);
notificationSchema.index(
  { userId: 1, createdAt: -1 },
  { partialFilterExpression: { readAt: null }, name: 'idx_notifications_user_unread_created' }
);
applySmokeTestSchema(notificationSchema);

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
