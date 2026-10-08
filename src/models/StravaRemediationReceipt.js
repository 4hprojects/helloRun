'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  sourceRecordId: { type: String, required: true, unique: true, maxlength: 40 },
  sourceKind: { type: String, enum: ['standard', 'accumulated'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null, index: true },
  previousHelloRunStatus: { type: String, default: '', maxlength: 40 },
  cleanup: {
    certificateObjectDeleted: { type: Boolean, default: false },
    postgresRowsDeleted: { type: Boolean, default: false },
    badgesRevoked: { type: Number, default: 0 },
    mongoRecordDeleted: { type: Boolean, default: false }
  },
  scrubbedAt: { type: Date, default: null },
  notifiedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.models.StravaRemediationReceipt || mongoose.model('StravaRemediationReceipt', schema);
