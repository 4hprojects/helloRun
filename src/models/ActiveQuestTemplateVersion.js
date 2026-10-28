const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');
const {
  ACTIVE_QUEST_CATEGORIES,
  ACTIVE_QUEST_SERIES_KEY,
  ACTIVE_QUEST_TIMEZONE
} = require('../config/active-quest');

const categorySchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  targetKm: { type: Number, required: true, min: 0.1, max: 10000 },
  label: { type: String, required: true, trim: true, maxlength: 100 },
  displayOrder: { type: Number, required: true, min: 1, max: 100 },
  badgeAssetUrl: { type: String, trim: true, maxlength: 2000, default: '' }
}, { _id: false });

const contentBlockSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 80 },
  title: { type: String, trim: true, maxlength: 160, default: '' },
  markdown: { type: String, trim: true, maxlength: 20000, default: '' },
  displayOrder: { type: Number, required: true, min: 1, max: 100 }
}, { _id: false });

const activeQuestTemplateVersionSchema = new mongoose.Schema({
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActiveQuestSeries', required: true, immutable: true },
  seriesKey: {
    type: String,
    required: true,
    immutable: true,
    trim: true,
    lowercase: true,
    default: ACTIVE_QUEST_SERIES_KEY
  },
  version: { type: Number, required: true, min: 1, immutable: true },
  status: { type: String, enum: ['draft', 'published', 'retired'], default: 'draft' },
  frozen: { type: Boolean, default: false },
  effectiveAt: { type: Date, default: null },
  timezone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
    default: ACTIVE_QUEST_TIMEZONE
  },
  eventDefaults: {
    feeMode: { type: String, enum: ['free'], default: 'free' },
    eventType: { type: String, enum: ['virtual'], default: 'virtual' },
    completionMode: { type: String, enum: ['accumulated_distance'], default: 'accumulated_distance' },
    minimumActivityDistanceKm: { type: Number, min: 0.1, max: 500, default: 1 },
    oneCategoryPerRegistration: { type: Boolean, default: true }
  },
  policyText: { type: String, required: true, trim: true, maxlength: 20000 },
  rulesText: { type: String, required: true, trim: true, maxlength: 20000 },
  categories: {
    type: [categorySchema],
    required: true,
    validate: {
      validator: hasExactBaselineCategories,
      message: 'Active Quest templates require the exact six baseline category targets, keys, and display positions.'
    }
  },
  contentBlocks: { type: [contentBlockSchema], default: [] },
  rewardRequirements: {
    approvedDistanceOnly: { type: Boolean, default: true },
    categoryBadgeRequired: { type: Boolean, default: true },
    digitalCertificateRequired: { type: Boolean, default: true },
    certificateTemplateVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateTemplate', default: null },
    certificateTemplate: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  uiSettings: {
    showLeaderboard: { type: Boolean, default: true },
    showCategoryProgress: { type: Boolean, default: true },
    leaderboardNameMode: {
      type: String,
      enum: ['participant_preference', 'first_name_last_initial'],
      default: 'participant_preference'
    }
  },
  summaryOfChanges: { type: String, required: true, trim: true, maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  publishedAt: { type: Date, default: null }
}, { timestamps: true, minimize: false });

activeQuestTemplateVersionSchema.index({ seriesKey: 1, version: 1 }, { unique: true });
activeQuestTemplateVersionSchema.index({ seriesKey: 1, status: 1, effectiveAt: -1 });

activeQuestTemplateVersionSchema.pre('validate', function validatePublishedState(next) {
  if (this.status === 'published') {
    if (!this.frozen) this.invalidate('frozen', 'Published template versions must be frozen.');
    if (!this.effectiveAt) this.invalidate('effectiveAt', 'Published template versions require an effective date.');
    if (!this.publishedAt) this.invalidate('publishedAt', 'Published template versions require a publication timestamp.');
    if (!this.publishedBy) this.invalidate('publishedBy', 'Published template versions require a publishing actor.');
  }
  next();
});

activeQuestTemplateVersionSchema.pre('save', async function preventPublishedMutation() {
  if (this.isNew) return;
  const stored = await this.constructor.findById(this._id).select('status frozen').lean();
  if (stored && (stored.status === 'published' || stored.frozen)) {
    throw new Error('Published Active Quest template versions are immutable; create a new version instead.');
  }
});

for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne']) {
  activeQuestTemplateVersionSchema.pre(operation, function rejectQueryMutation() {
    throw new Error('Active Quest template versions must be changed through versioning services.');
  });
}

applySmokeTestSchema(activeQuestTemplateVersionSchema);

function hasExactBaselineCategories(categories) {
  if (!Array.isArray(categories) || categories.length !== ACTIVE_QUEST_CATEGORIES.length) return false;
  const actual = categories
    .map((category) => `${String(category.key || '').trim()}:${Number(category.targetKm)}:${Number(category.displayOrder)}`)
    .sort();
  const expected = ACTIVE_QUEST_CATEGORIES
    .map((category) => `${category.key}:${category.targetKm}:${category.displayOrder}`)
    .sort();
  return actual.length === new Set(actual).size && actual.every((value, index) => value === expected[index]);
}

module.exports = mongoose.models.ActiveQuestTemplateVersion ||
  mongoose.model('ActiveQuestTemplateVersion', activeQuestTemplateVersionSchema);
