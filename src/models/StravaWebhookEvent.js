'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  eventKey: { type: String, required: true, unique: true, maxlength: 128 },
  objectType: { type: String, enum: ['athlete', 'activity'], required: true },
  aspectType: { type: String, enum: ['create', 'update', 'delete'], required: true },
  ownerId: { type: Number, required: true },
  objectId: { type: Number, required: true },
  authorized: { type: Boolean, default: null },
  eventTime: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'processing', 'failed', 'exhausted'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  retryAt: { type: Date, default: Date.now, index: true },
  lockedAt: { type: Date, default: null, index: true },
  lastErrorCode: { type: String, default: '', maxlength: 80 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

module.exports = mongoose.models.StravaWebhookEvent || mongoose.model('StravaWebhookEvent', schema);
