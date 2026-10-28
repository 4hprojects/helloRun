const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');
const {
  ACTIVE_QUEST_SCHEDULE_DEFAULTS,
  ACTIVE_QUEST_SERIES_KEY,
  ACTIVE_QUEST_TIMEZONE,
  buildDisabledActiveQuestFlags
} = require('../config/active-quest');

const featureFlagChangeSchema = new mongoose.Schema({
  flag: { type: String, required: true, trim: true, maxlength: 80 },
  previousValue: { type: Boolean, required: true },
  nextValue: { type: Boolean, required: true },
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  effectiveAt: { type: Date, required: true }
}, { _id: false });

const activeQuestSeriesSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
    trim: true,
    lowercase: true,
    default: ACTIVE_QUEST_SERIES_KEY
  },
  displayName: { type: String, required: true, trim: true, maxlength: 100, default: 'Active Quest' },
  tagline: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160,
    default: 'Your Distance. Your Pace. Your Quest.'
  },
  timezone: {
    type: String,
    required: true,
    immutable: true,
    trim: true,
    maxlength: 60,
    default: ACTIVE_QUEST_TIMEZONE
  },
  isActive: { type: Boolean, default: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduleDefaults: {
    registrationLeadDays: { type: Number, required: true, min: 1, max: 31, default: ACTIVE_QUEST_SCHEDULE_DEFAULTS.registrationLeadDays },
    draftPreparationDaysBeforeRegistration: { type: Number, required: true, min: 7, max: 14, default: ACTIVE_QUEST_SCHEDULE_DEFAULTS.draftPreparationDaysBeforeRegistration },
    registrationCloseDay: { type: Number, required: true, min: 1, max: 28, default: ACTIVE_QUEST_SCHEDULE_DEFAULTS.registrationCloseDay },
    proofCloseDayNextMonth: { type: Number, required: true, min: 1, max: 28, default: ACTIVE_QUEST_SCHEDULE_DEFAULTS.proofCloseDayNextMonth },
    reviewTargetDays: { type: Number, required: true, min: 1, max: 31, default: ACTIVE_QUEST_SCHEDULE_DEFAULTS.reviewTargetDays }
  },
  brandAssets: {
    logoUrl: { type: String, trim: true, maxlength: 2000, default: '' },
    bannerUrl: { type: String, trim: true, maxlength: 2000, default: '' },
    posterUrl: { type: String, trim: true, maxlength: 2000, default: '' }
  },
  featureFlags: {
    activeQuestSeriesEnabled: { type: Boolean, default: false },
    activeQuestDraftGenerationEnabled: { type: Boolean, default: false },
    activeQuestSchedulerEnabled: { type: Boolean, default: false },
    activeQuestAutoPublishEnabled: { type: Boolean, default: false }
  },
  featureFlagHistory: { type: [featureFlagChangeSchema], default: [] },
  currentTemplateVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActiveQuestTemplateVersion',
    default: null
  },
  templateVersionCounter: { type: Number, min: 0, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true, minimize: false });

activeQuestSeriesSchema.pre('validate', function applyFailClosedFlags(next) {
  const safeFlags = buildDisabledActiveQuestFlags();
  for (const [flag, disabled] of Object.entries(safeFlags)) {
    if (typeof this.featureFlags?.[flag] !== 'boolean') this.set(`featureFlags.${flag}`, disabled);
  }
  next();
});

applySmokeTestSchema(activeQuestSeriesSchema);

module.exports = mongoose.models.ActiveQuestSeries ||
  mongoose.model('ActiveQuestSeries', activeQuestSeriesSchema);
