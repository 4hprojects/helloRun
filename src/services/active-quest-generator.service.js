const Event = require('../models/Event');
const ActiveQuestSeries = require('../models/ActiveQuestSeries');
const ActiveQuestTemplateVersion = require('../models/ActiveQuestTemplateVersion');
const CertificateTemplate = require('../models/CertificateTemplate');
const { DEFAULT_WAIVER_TEMPLATE } = require('../utils/waiver');
const { ACTIVE_QUEST_SERIES_KEY } = require('../config/active-quest');
const {
  assertFullAdmin,
  buildSeriesEditionProvenance
} = require('./active-quest-foundation.service');
const { buildActiveQuestSchedule } = require('./active-quest-schedule.service');
const { buildActiveQuestContent } = require('./active-quest-content.service');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');

const MONTH_NAMES = Object.freeze([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]);

async function generateActiveQuestEdition(input, dependencies = {}) {
  const EventModel = dependencies.EventModel || Event;
  const SeriesModel = dependencies.SeriesModel || ActiveQuestSeries;
  const TemplateModel = dependencies.TemplateModel || ActiveQuestTemplateVersion;
  const requestedBy = assertFullAdmin(input?.requestedBy);
  const year = Number(input?.year);
  const month = Number(input?.month);
  if (input?.seriesKey !== ACTIVE_QUEST_SERIES_KEY) throw new Error('Only the active-quest series can use this generator.');
  if (!Number.isInteger(year) || year < 2000 || year > 3000) throw new Error('Active Quest generation year is invalid.');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Active Quest generation month is invalid.');

  const series = await SeriesModel.findOne({ key: ACTIVE_QUEST_SERIES_KEY });
  if (!series || !series.isActive) throw new Error('Active Quest series is unavailable.');
  if (series.featureFlags?.activeQuestSeriesEnabled !== true) {
    throw new Error('Active Quest series feature flag is disabled.');
  }
  if (series.featureFlags?.activeQuestDraftGenerationEnabled !== true) {
    throw new Error('Active Quest draft generation feature flag is disabled.');
  }

  const identity = { seriesKey: ACTIVE_QUEST_SERIES_KEY, seriesYear: year, seriesMonth: month };
  const existing = await EventModel.findOne(identity);
  if (existing) return buildGeneratorResult(existing, { created: false, warnings: getEditionWarnings(existing) });

  const template = await TemplateModel.findById(series.currentTemplateVersionId);
  if (!template) throw new Error('Active Quest current template version was not found.');
  const generatedAt = dependencies.now ? new Date(dependencies.now) : new Date();
  const provenance = buildSeriesEditionProvenance({ series, template, year, month, actor: requestedBy, generatedAt });
  const schedule = buildActiveQuestSchedule({ year, month, scheduleDefaults: series.scheduleDefaults });
  const monthName = MONTH_NAMES[month - 1];
  const slug = `${monthName.toLowerCase()}-active-quest-${year}`;
  const slugOwner = await EventModel.findOne({ slug });
  if (slugOwner) throw buildSlugCollisionError(slug);

  const rewardReadiness = getRewardReadiness(provenance.seriesSnapshot);
  const content = buildActiveQuestContent({
    monthName,
    year,
    templateSnapshot: provenance.seriesSnapshot,
    schedule,
    rewardReadiness
  });
  const payload = buildActiveQuestEventPayload({
    series,
    year,
    month,
    monthName,
    slug,
    schedule,
    provenance,
    content,
    rewardReadiness
  });
  const event = new EventModel(payload);
  await event.validate();

  try {
    await event.save();
    let certificateSetupWarning = '';
    if (rewardReadiness.certificateReady && dependencies.CertificateTemplateModel !== false) {
      try {
        await materializeActiveQuestCertificateTemplate({
          event,
          config: provenance.seriesSnapshot.rewardRequirements.certificateTemplate,
          CertificateTemplateModel: dependencies.CertificateTemplateModel || CertificateTemplate,
          now: generatedAt
        });
      } catch (error) {
        event.digitalCertificateEnabled = false;
        await event.save();
        certificateSetupWarning = `Certificate setup failed safely: ${error.message}`;
      }
    }
    const auditRecorder = dependencies.auditRecorder || recordCriticalAuditEventInBackground;
    auditRecorder({
      actorMongoUserId: requestedBy._id,
      action: 'active_quest.edition_generated',
      targetType: 'event',
      targetId: String(event._id),
      statusFrom: '',
      statusTo: 'draft',
      notes: `Generated ${monthName} Active Quest ${year} as a draft.`,
      occurredAt: generatedAt
    });
    return buildGeneratorResult(event, {
      created: true,
      warnings: [...getEditionWarnings(event), certificateSetupWarning].filter(Boolean)
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const concurrentEdition = await EventModel.findOne(identity);
    if (concurrentEdition) {
      return buildGeneratorResult(concurrentEdition, {
        created: false,
        warnings: [...getEditionWarnings(concurrentEdition), 'A concurrent request created this draft first.']
      });
    }
    throw buildSlugCollisionError(slug);
  }
}

function buildActiveQuestEventPayload({
  series,
  year,
  month,
  monthName,
  slug,
  schedule,
  provenance,
  content,
  rewardReadiness
}) {
  const categories = provenance.seriesSnapshot.categories.map((category) => ({
    categoryId: `${slug}-${category.key}`,
    name: `${category.targetKm}K ${monthName} ${category.label}`,
    type: 'distance',
    distanceLabel: `${category.targetKm}K`,
    distanceKm: Number(category.targetKm),
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: rewardReadiness.badgesReady || rewardReadiness.certificateReady
      ? 'Validated digital rewards are issued after final review.'
      : 'Digital rewards remain disabled until pre-publication validation passes.'
  }));
  const operationalEnd = (exclusiveInstant) => new Date(exclusiveInstant.getTime() - 1);

  return {
    organizerId: series.organizerId,
    ...provenance,
    seriesSchedule: serializeSchedule(schedule),
    slug,
    title: `${monthName} Active Quest ${year}`,
    shortTitle: `${monthName} Active Quest`,
    organiserName: series.displayName || 'HelloRun',
    description: content.description,
    eventDetailsMarkdown: content.markdown,
    status: 'draft',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: categories.map((category) => category.distanceLabel),
    raceCategories: categories,
    registrationOpenAt: schedule.instants.registrationOpen,
    registrationCloseAt: operationalEnd(schedule.instants.registrationEndExclusive),
    publicListingAvailableAt: null,
    autoEmailPromotionEnabled: false,
    autoEmailPromotionStatus: 'disabled',
    eventStartAt: schedule.instants.activityStart,
    eventEndAt: operationalEnd(schedule.instants.activityEndExclusive),
    virtualWindow: {
      startAt: schedule.instants.activityStart,
      endAt: operationalEnd(schedule.instants.activityEndExclusive)
    },
    venueName: 'Virtual — participant-selected eligible route or treadmill',
    city: '',
    province: '',
    country: 'PH',
    proofTypesAllowed: ['photo'],
    requireActivityScreenshot: true,
    requireTrackingAppDevice: true,
    virtualCompletionMode: 'accumulated_distance',
    challengeMetrics: ['distance'],
    primaryChallengeMetric: 'distance',
    targetDistanceKm: Math.max(...categories.map((category) => category.distanceKm)),
    minimumActivityDistanceKm: Number(provenance.seriesSnapshot.eventDefaults.minimumActivityDistanceKm || 1),
    acceptedRunTypes: ['run', 'walk', 'hike', 'trail_run', 'treadmill'],
    finalSubmissionDeadlineAt: operationalEnd(schedule.instants.submissionEndExclusive),
    milestoneDistancesKm: categories.map((category) => category.distanceKm),
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_metric',
    feeMode: 'free',
    feeAmount: null,
    feeCurrency: 'PHP',
    pricingMode: 'free',
    digitalBadgeEnabled: rewardReadiness.badgesReady,
    digitalCertificateEnabled: rewardReadiness.certificateReady,
    leaderboardRecognitionEnabled: true,
    leaderboardSettings: {
      enabled: true,
      type: 'accumulated_challenge',
      rankingBasis: 'highest_verified_distance',
      visibility: 'public',
      showPending: false,
      showHighestStepsCard: false,
      showHighestElevationCard: false,
      showMostConsistentCard: false,
      publicRankCutoff: 0,
      hideFlagged: true,
      nameDisplayMode: 'first_name_last_initial',
      visibleColumns: ['rank', 'runner', 'category', 'distance', 'status']
    },
    allowGuestRegistration: false,
    waitlistEnabled: false,
    physicalRewardsEnabled: false,
    deliveryFeeEnabled: false,
    requiresDeliveryAddress: false,
    internationalRunnersAllowed: true,
    bannerImageUrl: series.brandAssets?.bannerUrl || '',
    logoUrl: series.brandAssets?.logoUrl || '',
    posterImageUrl: series.brandAssets?.posterUrl || '',
    galleryImageUrls: [],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1,
    submittedForReviewAt: null,
    approvedAt: null,
    approvedBy: null,
    approvalSource: '',
    isDeleted: false,
    isPersonalRecord: false,
    isTestData: false,
    excludeFromSitemap: true
  };
}

function serializeSchedule(schedule) {
  return {
    timezone: schedule.timezone,
    boundaryMode: schedule.boundaryMode,
    local: { ...schedule.local },
    instants: Object.fromEntries(Object.entries(schedule.instants).map(([key, date]) => [key, date.toISOString()])),
    display: { ...schedule.display }
  };
}

function getRewardReadiness(snapshot) {
  const categories = snapshot.categories || [];
  return {
    badgesReady: snapshot.rewardRequirements?.categoryBadgeRequired === true &&
      categories.length === 6 && categories.every((category) => Boolean(String(category.badgeAssetUrl || '').trim())),
    certificateReady: snapshot.rewardRequirements?.digitalCertificateRequired === true &&
      isValidActiveQuestCertificateTemplate(snapshot.rewardRequirements?.certificateTemplate)
  };
}

function isValidActiveQuestCertificateTemplate(config) {
  if (!config || typeof config !== 'object') return false;
  return Boolean(
    String(config.content?.heading || '').trim() &&
    String(config.content?.bodyText || '').trim() &&
    config.displayOptions?.showCertificateNumber === true &&
    config.displayOptions?.showQrCode === true
  );
}

async function materializeActiveQuestCertificateTemplate({ event, config, CertificateTemplateModel, now = new Date() }) {
  if (!event?._id || !isValidActiveQuestCertificateTemplate(config)) {
    throw new Error('Frozen Active Quest certificate configuration is invalid.');
  }
  const existing = await CertificateTemplateModel.findOne({ eventId: event._id, status: 'active' });
  if (existing) return existing;
  return CertificateTemplateModel.create({
    eventId: event._id,
    organizerId: event.organizerId,
    name: String(config.name || `${event.title} Certificate`).slice(0, 150),
    layoutKey: config.layoutKey || 'verified_achievement',
    status: 'active',
    assets: config.assets || {},
    content: config.content,
    displayOptions: config.displayOptions,
    styleOptions: config.styleOptions || {},
    previewSampleData: {
      runnerName: 'Juan Dela Cruz',
      distance: event.raceDistances?.[0] || '25K',
      eventTitle: event.title,
      eventDate: event.seriesSchedule?.display?.activityWindow || '',
      organizerName: event.organiserName || 'HelloRun',
      certificateNumber: `HR-AQ-${event.seriesYear}-SAMPLE`
    },
    publishedAt: new Date(now)
  });
}

function getEditionWarnings(event) {
  const warnings = [];
  if (event.digitalBadgeEnabled !== true) warnings.push('Category badges remain disabled until all six mappings are validated.');
  if (event.digitalCertificateEnabled !== true) warnings.push('Certificates remain disabled until a template version is approved.');
  if (!event.bannerImageUrl) warnings.push('Series banner asset is missing.');
  if (!event.posterImageUrl) warnings.push('Series poster asset is missing.');
  return warnings;
}

function buildGeneratorResult(event, { created, warnings }) {
  return {
    eventId: String(event._id),
    created,
    status: event.status,
    previewUrl: `/organizer/preview-event?eventId=${encodeURIComponent(String(event._id))}&previewSource=edit`,
    templateVersion: Number(event.seriesSnapshot?.version || 0),
    warnings
  };
}

function isDuplicateKeyError(error) {
  return error?.code === 11000 || /duplicate key/i.test(String(error?.message || ''));
}

function buildSlugCollisionError(slug) {
  const error = new Error(`Slug ${slug} is already used by an unrelated event.`);
  error.code = 'ACTIVE_QUEST_SLUG_COLLISION';
  return error;
}

module.exports = {
  MONTH_NAMES,
  buildActiveQuestEventPayload,
  generateActiveQuestEdition,
  getRewardReadiness,
  isValidActiveQuestCertificateTemplate,
  materializeActiveQuestCertificateTemplate,
  serializeSchedule
};
