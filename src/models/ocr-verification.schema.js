'use strict';

const mongoose = require('mongoose');

const OCR_VERIFICATION_STATUSES = ['confirmed', 'corrected', 'unreadable'];
const OCR_VERIFICATION_FIELDS = ['distance', 'duration', 'date', 'type', 'elevation', 'steps', 'location'];

const ocrVerificationFieldSchema = new mongoose.Schema({
  field: { type: String, enum: OCR_VERIFICATION_FIELDS, required: true },
  outcome: { type: String, enum: OCR_VERIFICATION_STATUSES, required: true },
  runnerValue: { type: String, trim: true, default: '', maxlength: 200 },
  serverValue: { type: String, trim: true, default: '', maxlength: 200 },
  finalValue: { type: String, trim: true, default: '', maxlength: 200 },
  differs: { type: Boolean, default: false }
}, { _id: false });

const ocrVerificationSchema = new mongoose.Schema({
  status: { type: String, enum: OCR_VERIFICATION_STATUSES, required: true },
  source: { type: String, enum: ['server_ocr', 'browser_ocr'], required: true },
  verifiedAt: { type: Date, required: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fields: { type: [ocrVerificationFieldSchema], default: [] }
}, { _id: false });

module.exports = { ocrVerificationSchema, OCR_VERIFICATION_STATUSES, OCR_VERIFICATION_FIELDS };
