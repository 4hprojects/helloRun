'use strict';

const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const cropSchema = new mongoose.Schema({
  focalX: { type: Number, min: 0, max: 100, default: 50 },
  focalY: { type: Number, min: 0, max: 100, default: 50 },
  zoom: { type: Number, min: 1, max: 3, default: 1 }
}, { _id: false });

const assetSchema = new mongoose.Schema({
  source: { type: String, enum: ['banner', 'poster', 'custom', 'solid'], default: 'banner' },
  url: { type: String, trim: true, default: '' },
  key: { type: String, trim: true, default: '' },
  localPath: { type: String, trim: true, default: '' },
  checksum: { type: String, trim: true, default: '' },
  logoUrl: { type: String, trim: true, default: '' },
  logoKey: { type: String, trim: true, default: '' },
  logoLocalPath: { type: String, trim: true, default: '' }
}, { _id: false });

const raceBibDesignSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  version: { type: Number, min: 1, default: null },
  layoutKey: { type: String, enum: ['landscape_v1'], default: 'landscape_v1' },
  artwork: { type: assetSchema, default: () => ({}) },
  crop: { type: cropSchema, default: () => ({}) },
  content: {
    eventTitle: { type: String, trim: true, maxlength: 150, default: '' },
    participationLabel: { type: String, trim: true, maxlength: 100, default: '' },
    eventDate: { type: String, trim: true, maxlength: 80, default: '' }
  },
  display: {
    showCategory: { type: Boolean, default: true },
    showRunnerName: { type: Boolean, default: false },
    showEventDate: { type: Boolean, default: false },
    showEventLogo: { type: Boolean, default: true }
  },
  style: {
    accentColor: { type: String, default: '#F97316' },
    backgroundColor: { type: String, default: '#0F172A' },
    numberPanelColor: { type: String, default: '#F8FAFC' },
    numberTextColor: { type: String, default: '#0F172A' }
  },
  print: {
    pageWidthMm: { type: Number, min: 100, max: 500, default: 254 },
    pageHeightMm: { type: Number, min: 60, max: 300, default: 152.4 }
  },
  publishedAt: { type: Date, default: null },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sourceDesignId: { type: mongoose.Schema.Types.ObjectId, ref: 'RaceBibDesign', default: null }
}, { timestamps: true });

raceBibDesignSchema.index({ eventId: 1, version: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'published' }
});
raceBibDesignSchema.index({ eventId: 1, status: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'draft' }
});
applySmokeTestSchema(raceBibDesignSchema);

module.exports = mongoose.models.RaceBibDesign || mongoose.model('RaceBibDesign', raceBibDesignSchema);
