'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['strava'], default: 'strava' },
  reason: { type: String, enum: ['user_disconnect', 'provider_deauthorization'], required: true },
  localDeletionCompletedAt: { type: Date, required: true },
  remoteRevocationStatus: { type: String, enum: ['completed', 'queued', 'exhausted', 'manual_action_required', 'not_needed'], required: true },
  remoteRevocationCompletedAt: { type: Date, default: null },
  remoteRevocationLastErrorCode: { type: String, default: '', maxlength: 80 }
}, { timestamps: true });

module.exports = mongoose.models.StravaDeletionReceipt || mongoose.model('StravaDeletionReceipt', schema);
