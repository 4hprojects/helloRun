'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  receiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'StravaRemediationReceipt', required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  slotsRemaining: { type: Number, default: 1, min: 0, max: 1 },
  expiresAt: { type: Date, required: true, index: true },
  consumedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, registrationId: 1, expiresAt: 1 });

module.exports = mongoose.models.SubmissionRemediationGrant || mongoose.model('SubmissionRemediationGrant', schema);
