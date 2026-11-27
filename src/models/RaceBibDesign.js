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

const logoAssetSchema = new mongoose.Schema({
  url: { type: String, trim: true, default: '' },
  key: { type: String, trim: true, default: '' },
  localPath: { type: String, trim: true, default: '' },
  checksum: { type: String, trim: true, default: '' },
  label: { type: String, trim: true, maxlength: 80, default: '' }
}, { _id: false });

const raceBibDesignSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  version: { type: Number, min: 1, default: null },
  layoutKey: {
    type: String,
    enum: ['landscape_v1', 'photo_split_v1', 'festival_header_v1', 'classic_race_v1'],
    default: 'festival_header_v1'
  },
  artwork: { type: assetSchema, default: () => ({}) },
  branding: {
    primaryLogo: { type: logoAssetSchema, default: () => ({}) },
    partnerLogos: {
      type: [logoAssetSchema],
      default: [],
      validate: { validator: (items) => items.length <= 3, message: 'A bib supports up to three partner logos.' }
    }
  },
  crop: { type: cropSchema, default: () => ({}) },
  content: {
    eventTitle: { type: String, trim: true, maxlength: 150, default: '' },
    participationLabel: { type: String, trim: true, maxlength: 100, default: '' },
    eventDate: { type: String, trim: true, maxlength: 80, default: '' },
    location: { type: String, trim: true, maxlength: 100, default: '' },
    tagline: { type: String, trim: true, maxlength: 140, default: '' },
    entryBadge: { type: String, trim: true, maxlength: 50, default: '' },
    footerNote: { type: String, trim: true, maxlength: 120, default: '' }
  },
  display: {
    showCategory: { type: Boolean, default: true },
    showRunnerName: { type: Boolean, default: false },
    showEventDate: { type: Boolean, default: false },
    showEventLogo: { type: Boolean, default: true },
    showPartnerLogos: { type: Boolean, default: true },
    showLocation: { type: Boolean, default: true },
    showTagline: { type: Boolean, default: true },
    showEntryBadge: { type: Boolean, default: true },
    showFooterNote: { type: Boolean, default: true }
  },
  style: {
    accentColor: { type: String, default: '#F97316' },
    backgroundColor: { type: String, default: '#0F172A' },
    numberPanelColor: { type: String, default: '#F8FAFC' },
    numberTextColor: { type: String, default: '#0F172A' },
    textColor: { type: String, default: '#F8FAFC' },
    footerColor: { type: String, default: '#F97316' },
    typographyPreset: { type: String, enum: ['clean', 'athletic', 'friendly'], default: 'clean' },
    overlayStrength: { type: Number, min: 0, max: 0.9, default: 0.45 }
  },
  social: {
    enabled: { type: Boolean, default: false },
    ctaText: { type: String, trim: true, maxlength: 100, default: '' },
    ctaUrl: { type: String, trim: true, maxlength: 160, default: '' }
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
