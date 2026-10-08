'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deletionReceiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'StravaDeletionReceipt', default: null, index: true },
  encryptedToken: { type: String, required: true },
  tokenType: { type: String, enum: ['refresh_token', 'access_token'], default: 'refresh_token' },
  status: { type: String, enum: ['pending', 'processing', 'failed', 'exhausted'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  retryAt: { type: Date, default: Date.now, index: true },
  lastErrorCode: { type: String, default: '', maxlength: 80 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

module.exports = mongoose.models.StravaRevocationJob || mongoose.model('StravaRevocationJob', schema);
