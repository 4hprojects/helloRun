const ActiveQuestSeries = require('../models/ActiveQuestSeries');
const ActiveQuestTemplateVersion = require('../models/ActiveQuestTemplateVersion');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const {
  ACTIVE_QUEST_CATEGORIES,
  ACTIVE_QUEST_FEATURE_FLAGS,
  ACTIVE_QUEST_SCHEDULE_DEFAULTS,
  ACTIVE_QUEST_SERIES_KEY,
  ACTIVE_QUEST_TIMEZONE,
  buildDisabledActiveQuestFlags
} = require('../config/active-quest');

function assertFullAdmin(actor) {
  if (!actor || actor.role !== 'admin' || actor.adminTier === 'support' || !actor._id) {
    const error = new Error('Active Quest foundation changes require full admin access.');
    error.code = 'ACTIVE_QUEST_FULL_ADMIN_REQUIRED';
    throw error;
  }
  return actor;
}

function buildBaselineSeriesInput({ organizerId, actorId }) {
  return {
    key: ACTIVE_QUEST_SERIES_KEY,
    displayName: 'Active Quest',
    tagline: 'Your Distance. Your Pace. Your Quest.',
    timezone: ACTIVE_QUEST_TIMEZONE,
    isActive: true,
    organizerId,
    scheduleDefaults: { ...ACTIVE_QUEST_SCHEDULE_DEFAULTS },
    featureFlags: buildDisabledActiveQuestFlags(),
    createdBy: actorId,
    updatedBy: actorId
  };
}

function buildBaselineTemplateInput({ seriesId, actorId, version = 1 }) {
  return {
    seriesId,
    seriesKey: ACTIVE_QUEST_SERIES_KEY,
    version,
    status: 'draft',
    frozen: false,
    timezone: ACTIVE_QUEST_TIMEZONE,
    eventDefaults: {
      feeMode: 'free',
      eventType: 'virtual',
      completionMode: 'accumulated_distance',
      minimumActivityDistanceKm: 1,
      oneCategoryPerRegistration: true
    },
    policyText: 'Participants select one distance category. Only approved eligible activities count toward completion.',
    rulesText: 'Submit a tracking screenshot for each eligible activity. Activity URLs are optional corroborating evidence.',
    categories: ACTIVE_QUEST_CATEGORIES.map((category) => ({ ...category, badgeAssetUrl: '' })),
    contentBlocks: [],
    rewardRequirements: {
      approvedDistanceOnly: true,
      categoryBadgeRequired: true,
      digitalCertificateRequired: true,
      certificateTemplateVersionId: null,
      certificateTemplate: null
    },
    uiSettings: {
      showLeaderboard: true,
      showCategoryProgress: true,
      leaderboardNameMode: 'participant_preference'
    },
    summaryOfChanges: 'Initial Active Quest baseline.',
    createdBy: actorId
  };
}

async function initializeActiveQuestFoundation({ actor, organizerId = null, now = new Date() }) {
  assertFullAdmin(actor);
  let series = await ActiveQuestSeries.findOne({ key: ACTIVE_QUEST_SERIES_KEY });
  let seriesCreated = false;
  if (!series) {
    try {
      series = await ActiveQuestSeries.create(buildBaselineSeriesInput({
        organizerId: organizerId || actor._id,
        actorId: actor._id
      }));
      seriesCreated = true;
    } catch (error) {
      if (error?.code !== 11000) throw error;
      series = await ActiveQuestSeries.findOne({ key: ACTIVE_QUEST_SERIES_KEY });
    }
  }
  if (!series) throw new Error('Active Quest series initialization failed.');

  let template = await ActiveQuestTemplateVersion.findOne({
    seriesKey: ACTIVE_QUEST_SERIES_KEY,
    version: 1
  });
  let templateCreated = false;
  if (!template) {
    const baseline = buildBaselineTemplateInput({ seriesId: series._id, actorId: actor._id, version: 1 });
    try {
      template = await ActiveQuestTemplateVersion.create({
        ...baseline,
        status: 'published',
        frozen: true,
        effectiveAt: new Date(now),
        publishedAt: new Date(now),
        publishedBy: actor._id
      });
      templateCreated = true;
    } catch (error) {
      if (error?.code !== 11000) throw error;
      template = await ActiveQuestTemplateVersion.findOne({
        seriesKey: ACTIVE_QUEST_SERIES_KEY,
        version: 1
      });
    }
  }
  if (!template || template.status !== 'published' || template.frozen !== true) {
    throw new Error('Active Quest baseline template version 1 is not a published frozen template.');
  }

  if (
    String(series.currentTemplateVersionId || '') !== String(template._id) ||
    Number(series.templateVersionCounter || 0) < 1
  ) {
    series.currentTemplateVersionId = template._id;
    series.templateVersionCounter = Math.max(1, Number(series.templateVersionCounter || 0));
    series.updatedBy = actor._id;
    await series.save();
  }

  if (seriesCreated || templateCreated) {
    recordCriticalAuditEventInBackground({
      actorMongoUserId: actor._id,
      action: 'active_quest.foundation_initialized',
      targetType: 'active_quest_series',
      targetId: String(series._id),
      statusFrom: '',
      statusTo: 'configured',
      notes: 'Created the Active Quest series and published frozen baseline template.',
      occurredAt: new Date(now)
    });
  }
  return { series, template, created: seriesCreated || templateCreated };
}

function buildFrozenTemplateSnapshot(template) {
  const source = typeof template?.toObject === 'function'
    ? template.toObject({ depopulate: true, versionKey: false })
    : template;
  if (!source || source.status !== 'published' || source.frozen !== true) {
    throw new Error('Only a published, frozen Active Quest template can be snapshotted.');
  }

  const snapshot = {
    templateVersionId: String(source._id || ''),
    seriesKey: String(source.seriesKey || ''),
    version: Number(source.version),
    effectiveAt: toIsoString(source.effectiveAt),
    timezone: String(source.timezone || ''),
    eventDefaults: cloneJson(source.eventDefaults),
    policyText: String(source.policyText || ''),
    rulesText: String(source.rulesText || ''),
    categories: cloneJson(source.categories || []),
    contentBlocks: cloneJson(source.contentBlocks || []),
    rewardRequirements: cloneJson(source.rewardRequirements),
    uiSettings: cloneJson(source.uiSettings)
  };
  return deepFreeze(snapshot);
}

function buildSeriesEditionProvenance({ series, template, year, month, actor, generatedAt = new Date() }) {
  assertFullAdmin(actor);
  const safeYear = Number(year);
  const safeMonth = Number(month);
  if (!series?._id || series.key !== ACTIVE_QUEST_SERIES_KEY) {
    throw new Error('Active Quest series is required.');
  }
  if (!Number.isInteger(safeYear) || safeYear < 2000 || safeYear > 3000) {
    throw new Error('Active Quest edition year is invalid.');
  }
  if (!Number.isInteger(safeMonth) || safeMonth < 1 || safeMonth > 12) {
    throw new Error('Active Quest edition month is invalid.');
  }
  if (
    !template?._id ||
    template.status !== 'published' ||
    template.frozen !== true ||
    String(template.seriesId || '') !== String(series._id) ||
    String(series.currentTemplateVersionId || '') !== String(template._id)
  ) {
    throw new Error('Edition provenance requires the series current published, frozen template.');
  }

  const generatedDate = new Date(generatedAt);
  if (Number.isNaN(generatedDate.getTime())) throw new Error('Active Quest generation time is invalid.');
  const monthKey = String(safeMonth).padStart(2, '0');
  return {
    seriesKey: ACTIVE_QUEST_SERIES_KEY,
    seriesYear: safeYear,
    seriesMonth: safeMonth,
    seriesTemplateVersionId: template._id,
    generatedFromKey: `${ACTIVE_QUEST_SERIES_KEY}:${safeYear}-${monthKey}:v${template.version}`,
    seriesSnapshot: buildFrozenTemplateSnapshot(template),
    seriesGeneratedAt: generatedDate,
    seriesGeneratedBy: actor._id
  };
}

async function createActiveQuestTemplateDraft({ series, actor, overrides = {} }) {
  assertFullAdmin(actor);
  if (!series?._id || series.key !== ACTIVE_QUEST_SERIES_KEY) {
    throw new Error('Active Quest series is required.');
  }

  const allocatedSeries = await ActiveQuestSeries.findOneAndUpdate(
    { _id: series._id, key: ACTIVE_QUEST_SERIES_KEY },
    { $inc: { templateVersionCounter: 1 }, $set: { updatedBy: actor._id } },
    { new: true, runValidators: true }
  );
  if (!allocatedSeries) throw new Error('Active Quest series no longer exists.');

  const baseline = buildBaselineTemplateInput({
    seriesId: allocatedSeries._id,
    actorId: actor._id,
    version: allocatedSeries.templateVersionCounter
  });
  const safeOverrides = pickTemplateDraftOverrides(overrides);
  const template = await ActiveQuestTemplateVersion.create({ ...baseline, ...safeOverrides });

  recordCriticalAuditEventInBackground({
    actorMongoUserId: actor._id,
    action: 'active_quest.template_draft_created',
    targetType: 'active_quest_template_version',
    targetId: String(template._id),
    statusFrom: '',
    statusTo: 'draft',
    notes: `Created Active Quest template version ${template.version}.`
  });
  return template;
}

async function publishActiveQuestTemplate({ series, template, actor, effectiveAt = new Date() }) {
  assertFullAdmin(actor);
  if (!series?._id || String(template?.seriesId || '') !== String(series._id)) {
    throw new Error('Template does not belong to the supplied Active Quest series.');
  }
  if (template.status !== 'draft' || template.frozen) {
    throw new Error('Only an unfrozen draft template can be published.');
  }

  const publishedAt = new Date();
  template.status = 'published';
  template.frozen = true;
  template.effectiveAt = new Date(effectiveAt);
  template.publishedAt = publishedAt;
  template.publishedBy = actor._id;
  await template.save();

  series.currentTemplateVersionId = template._id;
  series.updatedBy = actor._id;
  await series.save();

  recordCriticalAuditEventInBackground({
    actorMongoUserId: actor._id,
    action: 'active_quest.template_published',
    targetType: 'active_quest_template_version',
    targetId: String(template._id),
    statusFrom: 'draft',
    statusTo: 'published',
    notes: `Published and froze Active Quest template version ${template.version}.`,
    occurredAt: publishedAt
  });
  return template;
}

async function updateActiveQuestTemplateDraft({ template, actor, changes = {} }) {
  assertFullAdmin(actor);
  if (!template?._id || template.seriesKey !== ACTIVE_QUEST_SERIES_KEY) {
    throw new Error('Active Quest template draft is required.');
  }
  if (template.status !== 'draft' || template.frozen) {
    throw new Error('Only an unfrozen Active Quest template draft can be edited.');
  }
  const safeChanges = pickTemplateDraftOverrides(changes);
  for (const [key, value] of Object.entries(safeChanges)) template.set(key, value);
  await template.save();
  recordCriticalAuditEventInBackground({
    actorMongoUserId: actor._id,
    action: 'active_quest.template_draft_updated',
    targetType: 'active_quest_template_version',
    targetId: String(template._id),
    statusFrom: 'draft',
    statusTo: 'draft',
    notes: `Updated Active Quest template version ${template.version}.`
  });
  return template;
}

async function updateActiveQuestFeatureFlag({
  series,
  flag,
  enabled,
  actor,
  reason,
  effectiveAt = new Date(),
  auditRecorder = recordCriticalAuditEventInBackground
}) {
  assertFullAdmin(actor);
  if (!series?._id || series.key !== ACTIVE_QUEST_SERIES_KEY) {
    throw new Error('Active Quest series is required.');
  }
  if (!ACTIVE_QUEST_FEATURE_FLAGS.includes(flag)) {
    throw new Error(`Unknown Active Quest feature flag: ${flag}`);
  }
  const safeReason = String(reason || '').trim();
  if (!safeReason) throw new Error('A reason is required for Active Quest feature flag changes.');

  const previousValue = series.featureFlags?.[flag] === true;
  const nextValue = enabled === true;
  if (flag === 'activeQuestAutoPublishEnabled' && nextValue) {
    throw new Error('Active Quest auto-publication is not available in Phase 1 and requires separate approval.');
  }
  if (previousValue === nextValue) return { changed: false, series };

  series.set(`featureFlags.${flag}`, nextValue);
  series.featureFlagHistory.push({
    flag,
    previousValue,
    nextValue,
    actorUserId: actor._id,
    reason: safeReason,
    effectiveAt: new Date(effectiveAt)
  });
  series.updatedBy = actor._id;
  await series.save();

  auditRecorder({
    actorMongoUserId: actor._id,
    action: 'active_quest.feature_flag_changed',
    targetType: 'active_quest_series',
    targetId: String(series._id),
    statusFrom: String(previousValue),
    statusTo: String(nextValue),
    notes: `${flag}: ${safeReason}`,
    occurredAt: new Date(effectiveAt)
  });
  return { changed: true, series };
}

async function updateActiveQuestSeriesSettings({ series, actor, changes = {}, reason }) {
  assertFullAdmin(actor);
  if (!series?._id || series.key !== ACTIVE_QUEST_SERIES_KEY) throw new Error('Active Quest series is required.');
  const safeReason = String(reason || '').trim();
  if (safeReason.length < 8) throw new Error('A settings change reason of at least 8 characters is required.');

  if (changes.tagline !== undefined) series.tagline = String(changes.tagline || '').trim();
  if (changes.brandAssets) {
    for (const key of ['logoUrl', 'bannerUrl', 'posterUrl']) {
      if (changes.brandAssets[key] !== undefined) series.set(`brandAssets.${key}`, normalizeHttpsUrl(changes.brandAssets[key], key));
    }
  }
  if (changes.scheduleDefaults) {
    for (const key of ['registrationLeadDays', 'draftPreparationDaysBeforeRegistration', 'registrationCloseDay', 'proofCloseDayNextMonth', 'reviewTargetDays']) {
      if (changes.scheduleDefaults[key] !== undefined) series.set(`scheduleDefaults.${key}`, Number(changes.scheduleDefaults[key]));
    }
  }
  series.updatedBy = actor._id;
  await series.save();
  recordCriticalAuditEventInBackground({
    actorMongoUserId: actor._id,
    action: 'active_quest.series_settings_changed',
    targetType: 'active_quest_series',
    targetId: String(series._id),
    statusFrom: 'configured',
    statusTo: 'configured',
    notes: safeReason
  });
  return series;
}

function pickTemplateDraftOverrides(input = {}) {
  const allowed = [
    'policyText',
    'rulesText',
    'categories',
    'contentBlocks',
    'rewardRequirements',
    'uiSettings',
    'summaryOfChanges'
  ];
  return Object.fromEntries(allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]));
}

function cloneJson(value) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

function toIsoString(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Template effective date is invalid.');
  return date.toISOString();
}

function normalizeHttpsUrl(value, field) {
  const safe = String(value || '').trim();
  if (!safe) return '';
  let parsed;
  try {
    parsed = new URL(safe);
  } catch (_) {
    throw new Error(`${field} must be a valid HTTPS URL.`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${field} must be a valid HTTPS URL.`);
  return parsed.toString();
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

module.exports = {
  assertFullAdmin,
  buildBaselineSeriesInput,
  buildBaselineTemplateInput,
  buildFrozenTemplateSnapshot,
  buildSeriesEditionProvenance,
  createActiveQuestTemplateDraft,
  initializeActiveQuestFoundation,
  publishActiveQuestTemplate,
  updateActiveQuestTemplateDraft,
  updateActiveQuestFeatureFlag,
  updateActiveQuestSeriesSettings
};
