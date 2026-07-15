const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const assetSchema = new mongoose.Schema(
  {
    backgroundImageUrl: { type: String, trim: true, default: '' },
    backgroundImageKey: { type: String, trim: true, default: '' },
    organizerLogoUrl: { type: String, trim: true, default: '' },
    organizerLogoKey: { type: String, trim: true, default: '' },
    eventLogoUrl: { type: String, trim: true, default: '' },
    eventLogoKey: { type: String, trim: true, default: '' },
    eventArtworkUrl: { type: String, trim: true, default: '' },
    eventArtworkKey: { type: String, trim: true, default: '' },
    signatureImageUrl: { type: String, trim: true, default: '' },
    signatureImageKey: { type: String, trim: true, default: '' },
    sponsorLogoUrls: {
      type: [{ type: String, trim: true }],
      default: []
    },
    sponsorLogoKeys: {
      type: [{ type: String, trim: true }],
      default: []
    }
  },
  { _id: false }
);

const contentSchema = new mongoose.Schema(
  {
    heading: { type: String, trim: true, maxlength: 120, default: 'Certificate of Completion' },
    bodyText: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: 'Officially completed {{distance}} at {{eventTitle}}.'
    },
    footerText: {
      type: String,
      trim: true,
      maxlength: 300,
      default: 'Scan the QR code to verify this achievement.'
    },
    signatureName: { type: String, trim: true, maxlength: 120, default: '' },
    signatureRole: { type: String, trim: true, maxlength: 120, default: '' }
  },
  { _id: false }
);

const displayOptionsSchema = new mongoose.Schema(
  {
    showDistance: { type: Boolean, default: true },
    showFinishTime: { type: Boolean, default: true },
    showRank: { type: Boolean, default: false },
    showEventDate: { type: Boolean, default: true },
    showCertificateNumber: { type: Boolean, default: true },
    showQrCode: { type: Boolean, default: true },
    showOrganizerLogo: { type: Boolean, default: true },
    showEventLogo: { type: Boolean, default: true },
    showSponsorLogos: { type: Boolean, default: true }
  },
  { _id: false }
);

const styleOptionsSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, trim: true, default: '#0F172A' },
    accentColor: { type: String, trim: true, default: '#FA9A4B' },
    secondaryAccentColor: { type: String, trim: true, default: '#78C0E9' },
    fontFamily: { type: String, trim: true, default: 'Helvetica' },
    pageSize: { type: String, enum: ['A4', 'LETTER'], default: 'A4' },
    orientation: { type: String, enum: ['landscape', 'portrait'], default: 'landscape' }
  },
  { _id: false }
);

const previewSampleDataSchema = new mongoose.Schema(
  {
    runnerName: { type: String, trim: true, default: 'Juan Dela Cruz' },
    distance: { type: String, trim: true, default: '10K' },
    finishTime: { type: String, trim: true, default: '01:08:42' },
    rank: { type: String, trim: true, default: '15' },
    eventTitle: { type: String, trim: true, default: 'HelloRun Sample Event' },
    eventDate: { type: String, trim: true, default: '' },
    organizerName: { type: String, trim: true, default: 'Sample Organizer' },
    certificateNumber: { type: String, trim: true, default: 'HR-CERT-2026-SAMPLE-000001' }
  },
  { _id: false }
);

const certificateTemplateSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      trim: true,
      maxlength: 150,
      default: 'Default Event Certificate'
    },
    layoutKey: {
      type: String,
      enum: ['verified_achievement', 'classic', 'modern_race', 'minimal', 'school_event', 'charity_run', 'split_panel_event'],
      default: 'verified_achievement'
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true
    },
    assets: {
      type: assetSchema,
      default: () => ({})
    },
    content: {
      type: contentSchema,
      default: () => ({})
    },
    displayOptions: {
      type: displayOptionsSchema,
      default: () => ({})
    },
    styleOptions: {
      type: styleOptionsSchema,
      default: () => ({})
    },
    previewSampleData: {
      type: previewSampleDataSchema,
      default: () => ({})
    },
    pdfmeTemplateJson: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    publishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

certificateTemplateSchema.index({ organizerId: 1, updatedAt: -1 });
certificateTemplateSchema.index(
  { eventId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

applySmokeTestSchema(certificateTemplateSchema);

module.exports = mongoose.models.CertificateTemplate || mongoose.model('CertificateTemplate', certificateTemplateSchema);
