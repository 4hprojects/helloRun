const Event = require('../models/Event');
const { getCountries, isValidCountryCode, normalizeCountryCode } = require('../utils/country');
const { DEFAULT_WAIVER_TEMPLATE, normalizeWaiverTemplate } = require('../utils/waiver');
const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const countries = getCountries();
const RACE_DISTANCE_PRESETS = new Set(['3K', '5K', '10K', '21K', '42K']);
const MAX_GALLERY_IMAGES = 12;
const VIRTUAL_COMPLETION_MODES = new Set(['single_activity', 'accumulated_distance']);
const ACCEPTED_RUN_TYPES = new Set(['run', 'walk', 'hike', 'trail_run']);
const RECOGNITION_MODES = new Set(['completion_only', 'completion_with_optional_ranking']);
const LEADERBOARD_MODES = new Set(['finishers', 'top_distance', 'finishers_and_top_distance']);
const LEADERBOARD_SETTING_TYPES = new Set(['race_result', 'accumulated_challenge']);
const LEADERBOARD_RANKING_BASES = new Set(['fastest_time', 'highest_verified_distance']);
const LEADERBOARD_VISIBILITIES = new Set(['public', 'registered_only', 'private_until_published']);
const LEADERBOARD_NAME_DISPLAY_MODES = new Set(['full_name', 'first_name_last_initial', 'display_name', 'anonymous_runner_id']);
const LEADERBOARD_VISIBLE_COLUMNS = new Set(['rank', 'runner', 'category', 'distance', 'time', 'pace', 'status']);
const DEFAULT_LEADERBOARD_VISIBLE_COLUMNS = ['rank', 'runner', 'category', 'distance', 'time', 'pace', 'status'];
const FEE_MODES = new Set(['free', 'paid']);
const PRICING_MODES = new Set([
  'free',
  'distance_based',
  'customized_options',
  'distance_based_period',
  'customized_options_period',
  'package_period'
]);
const LEGACY_PRICING_MODE_MAP = Object.freeze({
  same_fee: 'customized_options',
  per_distance: 'distance_based',
  per_distance_period: 'distance_based_period'
});
const V1_PRICING_MODES = PRICING_MODES;
const CLAIMING_METHODS = new Set(['delivery', 'pickup', 'both']);
const PRICING_PERIOD_CODES = new Set(['early_bird', 'regular', 'late', 'custom']);
const RACE_CATEGORY_TYPES = new Set(['distance', 'challenge', 'open', 'other']);
const WAIVER_SANITIZE_OPTIONS = Object.freeze({
  allowedTags: ['div', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a'],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    div: ['class']
  }
});

function normalizeToArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function normalizeRaceDistanceLabel(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';
  const compact = raw.replace(/\s+/g, '');
  const numericOnly = compact.match(/^(\d+(?:\.\d+)?)$/);
  if (numericOnly) return `${numericOnly[1]}K`;
  const kmValue = compact.match(/^(\d+(?:\.\d+)?)(KM|K)$/);
  if (kmValue) return `${kmValue[1]}K`;
  return compact;
}

function normalizeRaceCategoryLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const compact = raw.toUpperCase().replace(/\s+/g, '');
  const numericOnly = compact.match(/^(\d+(?:\.\d+)?)$/);
  if (numericOnly) return `${numericOnly[1]}K`;
  const kmValue = compact.match(/^(\d+(?:\.\d+)?)(KM|K)$/);
  if (kmValue) return `${kmValue[1]}K`;
  return raw.toUpperCase().replace(/\s+/g, ' ');
}

function normalizeRaceDistances(body = {}) {
  const presetValues = normalizeToArray(body.raceDistancePresets)
    .map(normalizeRaceDistanceLabel)
    .filter((item) => RACE_DISTANCE_PRESETS.has(item));
  const customValues = String(body.raceDistanceCustom || '')
    .split(',')
    .map(normalizeRaceDistanceLabel)
    .filter(Boolean);
  return Array.from(new Set([...presetValues, ...customValues])).slice(0, MAX_GALLERY_IMAGES);
}

function buildRaceCategoryId(index, label) {
  const slug = String(label || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `cat-${index + 1}${slug ? `-${slug}` : ''}`;
}

function getUniqueRaceCategoryId(preferredId, index, label, usedIds) {
  const normalizedPreferred = String(preferredId || '').trim().slice(0, 80);
  if (normalizedPreferred && !usedIds.has(normalizedPreferred)) {
    usedIds.add(normalizedPreferred);
    return normalizedPreferred;
  }

  const baseId = buildRaceCategoryId(index, label);
  let candidate = baseId;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function buildRegistrationPackageId(index, label) {
  const slug = String(label || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `pkg-${index + 1}${slug ? `-${slug}` : ''}`;
}

function getRaceCategoryDisplayLabel(category = {}) {
  return String(category.distanceLabel || category.name || '').trim();
}

function normalizeRaceCategories(body = {}, fallbackDistances = []) {
  const ids = normalizeToArray(body.raceCategoryId);
  const names = normalizeToArray(body.raceCategoryName);
  const types = normalizeToArray(body.raceCategoryType);
  const distanceLabels = normalizeToArray(body.raceCategoryDistanceLabel);
  const distanceKmValues = normalizeToArray(body.raceCategoryDistanceKm);
  const slotsValues = normalizeToArray(body.raceCategorySlots);
  const cutoffTimes = normalizeToArray(body.raceCategoryCutoffTime);
  const ageGroups = normalizeToArray(body.raceCategoryAgeGroup);
  const rewardsDescriptions = normalizeToArray(body.raceCategoryRewardsDescription);
  const max = Math.max(
    ids.length,
    names.length,
    types.length,
    distanceLabels.length,
    distanceKmValues.length,
    slotsValues.length,
    cutoffTimes.length,
    ageGroups.length,
    rewardsDescriptions.length
  );
  const categories = [];
  const usedCategoryIds = new Set();

  for (let index = 0; index < max; index += 1) {
    const rawName = String(names[index] || '').trim().slice(0, 100);
    const normalizedDistanceLabel = normalizeRaceCategoryLabel(distanceLabels[index] || rawName);
    const type = normalizeModeValue(types[index], RACE_CATEGORY_TYPES, 'distance');
    const distanceKm = parseOptionalNonNegativeNumber(distanceKmValues[index]);
    const slots = parseOptionalNonNegativeNumber(slotsValues[index]);
    const cutoffTime = String(cutoffTimes[index] || '').trim().slice(0, 80);
    const ageGroup = String(ageGroups[index] || '').trim().slice(0, 80);
    const rewardsDescription = String(rewardsDescriptions[index] || '').trim().slice(0, 500);
    const displayLabel = normalizedDistanceLabel || rawName;
    const hasAnyValue = Boolean(displayLabel || rawName || distanceKm !== null || slots !== null || cutoffTime || ageGroup || rewardsDescription);
    if (!hasAnyValue) continue;

    categories.push({
      categoryId: getUniqueRaceCategoryId(ids[index], categories.length, displayLabel || rawName, usedCategoryIds),
      name: rawName || displayLabel,
      type,
      distanceLabel: displayLabel,
      distanceKm,
      slots,
      cutoffTime,
      ageGroup,
      rewardsDescription
    });
  }

  if (categories.length) return categories.slice(0, 30);

  return (fallbackDistances || []).map((distance, index) => ({
    categoryId: buildRaceCategoryId(index, distance),
    name: distance,
    type: 'distance',
    distanceLabel: distance,
    distanceKm: parseRaceDistanceKm(distance),
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: ''
  })).slice(0, 30);
}

function getRaceDistancesFromCategories(categories = []) {
  return Array.from(new Set(
    (categories || [])
      .map(getRaceCategoryDisplayLabel)
      .map(normalizeRaceCategoryLabel)
      .filter(Boolean)
  )).slice(0, MAX_GALLERY_IMAGES);
}

function normalizeGalleryImageUrls(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_GALLERY_IMAGES);
}

function normalizeProofTypes(value) {
  const allowed = new Set(['running_app_sync', 'photo', 'manual']);
  const aliases = {
    gps: 'running_app_sync',
    strava: 'running_app_sync',
    strava_sync: 'running_app_sync',
    activity_import: 'running_app_sync',
    running_app: 'running_app_sync'
  };
  return Array.from(new Set(normalizeToArray(value)
    .map((item) => String(item || '').trim())
    .map((item) => aliases[item] || item)
    .filter((item) => allowed.has(item))));
}

function normalizeModeValue(value, allowedValues, fallback) {
  const normalized = String(value || '').trim();
  return allowedValues.has(normalized) ? normalized : fallback;
}

function normalizeVirtualCompletionMode(value) {
  return normalizeModeValue(value, VIRTUAL_COMPLETION_MODES, 'accumulated_distance');
}

function normalizeRunTypes(value) {
  return normalizeToArray(value)
    .map((item) => String(item || '').trim())
    .filter((item) => ACCEPTED_RUN_TYPES.has(item));
}

function parseOptionalPositiveNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNonNegativeNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNonNegativeInteger(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function hasOwnValue(body, key) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

function normalizeBoolean(value) {
  if (Array.isArray(value)) return normalizeBoolean(value[value.length - 1]);
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function normalizeLeaderboardVisibleColumns(value) {
  const columns = normalizeToArray(value)
    .map((item) => String(item || '').trim())
    .filter((item) => LEADERBOARD_VISIBLE_COLUMNS.has(item));
  return columns.length ? Array.from(new Set(columns)) : DEFAULT_LEADERBOARD_VISIBLE_COLUMNS.slice();
}

function getDefaultLeaderboardType(virtualCompletionMode) {
  return virtualCompletionMode === 'accumulated_distance' ? 'accumulated_challenge' : 'race_result';
}

function getDefaultLeaderboardRankingBasis(type) {
  return type === 'accumulated_challenge' ? 'highest_verified_distance' : 'fastest_time';
}

function normalizeLeaderboardSettings(body = {}, context = {}) {
  const typeFallback = getDefaultLeaderboardType(context.virtualCompletionMode);
  const type = normalizeModeValue(body.leaderboardSettingsType || body.leaderboardType || body.type, LEADERBOARD_SETTING_TYPES, typeFallback);
  const rankingBasis = normalizeModeValue(
    body.leaderboardSettingsRankingBasis || body.leaderboardRankingBasis || body.rankingBasis,
    LEADERBOARD_RANKING_BASES,
    getDefaultLeaderboardRankingBasis(type)
  );
  const hasSettingsEnabledValue = hasOwnValue(body, 'leaderboardSettingsEnabled') || hasOwnValue(body, 'enabled');
  const hasEnabledValue = hasSettingsEnabledValue || hasOwnValue(body, 'leaderboardRecognitionEnabled');
  const enabledValue = hasSettingsEnabledValue
    ? (body.leaderboardSettingsEnabled ?? body.enabled)
    : body.leaderboardRecognitionEnabled;
  return {
    enabled: hasEnabledValue
      ? normalizeBoolean(enabledValue)
      : context.leaderboardRecognitionEnabled !== false,
    type,
    rankingBasis: type === 'accumulated_challenge' ? 'highest_verified_distance' : rankingBasis,
    visibility: normalizeModeValue(
      body.leaderboardSettingsVisibility || body.leaderboardVisibility || body.visibility,
      LEADERBOARD_VISIBILITIES,
      'public'
    ),
    showPending: normalizeBoolean(body.leaderboardSettingsShowPending || body.leaderboardShowPending || body.showPending),
    hideFlagged: hasOwnValue(body, 'leaderboardSettingsHideFlagged') || hasOwnValue(body, 'leaderboardHideFlagged') || hasOwnValue(body, 'hideFlagged')
      ? normalizeBoolean(body.leaderboardSettingsHideFlagged || body.leaderboardHideFlagged || body.hideFlagged)
      : true,
    nameDisplayMode: normalizeModeValue(
      body.leaderboardSettingsNameDisplayMode || body.leaderboardNameDisplayMode || body.nameDisplayMode,
      LEADERBOARD_NAME_DISPLAY_MODES,
      'first_name_last_initial'
    ),
    visibleColumns: normalizeLeaderboardVisibleColumns(body.leaderboardSettingsVisibleColumns || body.leaderboardVisibleColumns || body.visibleColumns)
  };
}

function normalizeLeaderboardSettingsFromEvent(event = {}) {
  const existing = event.leaderboardSettings || {};
  const type = normalizeModeValue(existing.type, LEADERBOARD_SETTING_TYPES, getDefaultLeaderboardType(event.virtualCompletionMode));
  return {
    enabled: typeof existing.enabled === 'boolean' ? existing.enabled : event.leaderboardRecognitionEnabled !== false,
    type,
    rankingBasis: normalizeModeValue(existing.rankingBasis, LEADERBOARD_RANKING_BASES, getDefaultLeaderboardRankingBasis(type)),
    visibility: normalizeModeValue(existing.visibility, LEADERBOARD_VISIBILITIES, 'public'),
    showPending: Boolean(existing.showPending),
    hideFlagged: typeof existing.hideFlagged === 'boolean' ? existing.hideFlagged : true,
    nameDisplayMode: normalizeModeValue(existing.nameDisplayMode, LEADERBOARD_NAME_DISPLAY_MODES, 'first_name_last_initial'),
    visibleColumns: normalizeLeaderboardVisibleColumns(existing.visibleColumns)
  };
}

function normalizeCurrency(value) {
  const normalized = String(value || 'PHP').trim().toUpperCase().replace(/[^A-Z]/g, '');
  return normalized.slice(0, 3) || 'PHP';
}

function normalizePricingMode(value, feeMode = 'free') {
  const fallback = feeMode === 'paid' ? 'distance_based' : 'free';
  const raw = String(value || '').trim();
  const migrated = LEGACY_PRICING_MODE_MAP[raw] || raw;
  const normalized = normalizeModeValue(migrated, PRICING_MODES, fallback);
  return V1_PRICING_MODES.has(normalized) ? normalized : fallback;
}

function normalizeClaimingMethod(value) {
  return normalizeModeValue(value, CLAIMING_METHODS, 'delivery');
}

function splitNames(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeOtherItems(namesValue, amountsValue) {
  const names = normalizeToArray(namesValue);
  const amounts = normalizeToArray(amountsValue);
  const items = [];
  const max = Math.max(names.length, amounts.length);
  for (let index = 0; index < max; index += 1) {
    const name = String(names[index] || '').trim().slice(0, 80);
    const amount = parseOptionalNonNegativeNumber(amounts[index]);
    if (!name && amount === null) continue;
    items.push({ name, amount });
  }
  return items.slice(0, 20);
}

function normalizePackagePricingPeriod({ label, code, startAt, endAt, amount }) {
  const normalizedLabel = String(label || '').trim().slice(0, 60);
  const normalizedCode = normalizeModeValue(code, PRICING_PERIOD_CODES, 'custom');
  const normalizedStartAt = String(startAt || '').trim();
  const normalizedEndAt = String(endAt || '').trim();
  const normalizedAmount = parseOptionalNonNegativeNumber(amount);
  const hasAnyValue = Boolean(normalizedStartAt || normalizedEndAt || normalizedAmount !== null);
  if (!hasAnyValue) return null;
  return {
    label: normalizedLabel,
    code: normalizedCode,
    startAt: normalizedStartAt,
    endAt: normalizedEndAt,
    amount: normalizedAmount
  };
}

function normalizeEventPricingPeriod({ label, code, startAt, endAt }) {
  const normalizedLabel = String(label || '').trim().slice(0, 60);
  const normalizedCode = normalizeModeValue(code, PRICING_PERIOD_CODES, 'custom');
  const normalizedStartAt = String(startAt || '').trim();
  const normalizedEndAt = String(endAt || '').trim();
  const hasAnyValue = Boolean(normalizedStartAt || normalizedEndAt);
  if (!hasAnyValue) return null;
  return {
    label: normalizedLabel,
    code: normalizedCode,
    startAt: normalizedStartAt,
    endAt: normalizedEndAt
  };
}

function normalizeEventPricingPeriods(body = {}) {
  return [
    normalizeEventPricingPeriod({
      label: 'Early Bird',
      code: 'early_bird',
      startAt: body.pricingPeriodEarlyBirdStartAt,
      endAt: body.pricingPeriodEarlyBirdEndAt
    }),
    normalizeEventPricingPeriod({
      label: 'Regular',
      code: 'regular',
      startAt: body.pricingPeriodRegularStartAt,
      endAt: body.pricingPeriodRegularEndAt
    }),
    normalizeEventPricingPeriod({
      label: 'Late Registration',
      code: 'late',
      startAt: body.pricingPeriodLateStartAt,
      endAt: body.pricingPeriodLateEndAt
    })
  ].filter(Boolean);
}

function normalizeRegistrationPackages(body = {}) {
  const ids = normalizeToArray(body.registrationPackageId);
  const names = normalizeToArray(body.registrationPackageName);
  const notes = normalizeToArray(body.registrationPackageNotes);
  const otherItemNames = normalizeToArray(body.registrationPackageOtherItemNames);
  const earlyStartAt = normalizeToArray(body.registrationPackageEarlyBirdStartAt);
  const earlyEndAt = normalizeToArray(body.registrationPackageEarlyBirdEndAt);
  const earlyAmount = normalizeToArray(body.registrationPackageEarlyBirdAmount);
  const regularStartAt = normalizeToArray(body.registrationPackageRegularStartAt);
  const regularEndAt = normalizeToArray(body.registrationPackageRegularEndAt);
  const regularAmount = normalizeToArray(body.registrationPackageRegularAmount);
  const lateStartAt = normalizeToArray(body.registrationPackageLateStartAt);
  const lateEndAt = normalizeToArray(body.registrationPackageLateEndAt);
  const lateAmount = normalizeToArray(body.registrationPackageLateAmount);
  const packageCount = Math.max(
    names.length,
    notes.length,
    otherItemNames.length,
    earlyStartAt.length,
    earlyEndAt.length,
    earlyAmount.length,
    regularStartAt.length,
    regularEndAt.length,
    regularAmount.length,
    lateStartAt.length,
    lateEndAt.length,
    lateAmount.length
  );

  const packages = [];
  for (let index = 0; index < packageCount; index += 1) {
    const name = String(names[index] || '').trim().slice(0, 100);
    const pricingPeriods = [
      normalizePackagePricingPeriod({
        label: 'Early Bird',
        code: 'early_bird',
        startAt: earlyStartAt[index],
        endAt: earlyEndAt[index],
        amount: earlyAmount[index]
      }),
      normalizePackagePricingPeriod({
        label: 'Regular',
        code: 'regular',
        startAt: regularStartAt[index],
        endAt: regularEndAt[index],
        amount: regularAmount[index]
      }),
      normalizePackagePricingPeriod({
        label: 'Late Registration',
        code: 'late',
        startAt: lateStartAt[index],
        endAt: lateEndAt[index],
        amount: lateAmount[index]
      })
    ].filter(Boolean);
    const includedItems = {
      medal: normalizeBoolean(body[`registrationPackageMedal_${index}`]),
      shirt: normalizeBoolean(body[`registrationPackageShirt_${index}`]),
      towel: normalizeBoolean(body[`registrationPackageTowel_${index}`]),
      patch: normalizeBoolean(body[`registrationPackagePatch_${index}`]),
      finisherKit: normalizeBoolean(body[`registrationPackageFinisherKit_${index}`]),
      otherItemNames: splitNames(otherItemNames[index])
    };
    const hasIncludedItem = Object.entries(includedItems).some(([key, value]) => (
      key === 'otherItemNames' ? value.length > 0 : Boolean(value)
    ));
    const note = String(notes[index] || '').trim().slice(0, 500);
    if (!name && !pricingPeriods.length && !hasIncludedItem && !note) continue;
    packages.push({
      packageId: String(ids[index] || '').trim().slice(0, 80) || buildRegistrationPackageId(packages.length, name),
      name,
      includedItems,
      pricingPeriods,
      notes: note
    });
  }
  return packages.slice(0, 10);
}

function normalizeDistancePricing(body = {}) {
  const categoryIds = normalizeToArray(body.distancePricingCategoryId);
  const labels = normalizeToArray(body.distancePricingLabel);
  const amounts = normalizeToArray(body.distancePricingAmount);
  const earlyBird = normalizeToArray(body.distancePricingEarlyBirdAmount);
  const regular = normalizeToArray(body.distancePricingRegularAmount);
  const late = normalizeToArray(body.distancePricingLateAmount);
  const items = [];
  const max = Math.max(labels.length, amounts.length, earlyBird.length, regular.length, late.length);
  for (let index = 0; index < max; index += 1) {
    const distance = normalizeRaceCategoryLabel(labels[index]);
    if (!distance) continue;
    items.push({
      categoryId: String(categoryIds[index] || '').trim().slice(0, 80),
      distance,
      amount: parseOptionalNonNegativeNumber(amounts[index]),
      earlyBirdAmount: parseOptionalNonNegativeNumber(earlyBird[index]),
      regularAmount: parseOptionalNonNegativeNumber(regular[index]),
      lateAmount: parseOptionalNonNegativeNumber(late[index])
    });
  }
  return items.slice(0, 30);
}

function normalizeCustomizedOptions(body = {}) {
  const descriptions = normalizeToArray(
    body.customizedOptionShortDescription ||
    body.customizedOptionDescription ||
    body.customPricingShortDescription ||
    body.customPricingDescription
  );
  const amounts = normalizeToArray(body.customizedOptionAmount || body.customPricingAmount);
  const max = Math.max(descriptions.length, amounts.length);
  const items = [];

  for (let index = 0; index < max; index += 1) {
    const shortDescription = String(descriptions[index] || '').trim().slice(0, 160);
    const amount = parseOptionalNonNegativeNumber(amounts[index]);
    if (!shortDescription && amount === null) continue;
    items.push({ shortDescription, amount });
  }

  return items.slice(0, 30);
}

function normalizeSpecialRewardBenefits(body = {}) {
  const titles = normalizeToArray(body.specialRewardBenefitTitle);
  const descriptions = normalizeToArray(body.specialRewardBenefitDescription);
  const validUntilValues = normalizeToArray(body.specialRewardBenefitValidUntil);
  const packageNames = normalizeToArray(body.specialRewardBenefitPackageNames);
  const max = Math.max(titles.length, descriptions.length, validUntilValues.length, packageNames.length);
  const benefits = [];
  for (let index = 0; index < max; index += 1) {
    const title = String(titles[index] || '').trim().slice(0, 100);
    const description = String(descriptions[index] || '').trim().slice(0, 500);
    const validUntil = String(validUntilValues[index] || '').trim();
    const appliesToPackageNames = splitNames(packageNames[index]).slice(0, 10);
    if (!title && !description && !validUntil && !appliesToPackageNames.length) continue;
    benefits.push({ title, description, validUntil, appliesToPackageNames });
  }
  return benefits.slice(0, 10);
}

function sumAmount(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function calculateSuggestedEventFee(formData) {
  let total = 0;
  if (formData.physicalRewardsEnabled) {
    if (formData.physicalRewardMedalEnabled) total += sumAmount(formData.physicalRewardMedalAmount);
    if (formData.physicalRewardShirtEnabled) total += sumAmount(formData.physicalRewardShirtAmount);
    if (formData.physicalRewardPatchEnabled) total += sumAmount(formData.physicalRewardPatchAmount);
    if (formData.physicalRewardTowelEnabled) total += sumAmount(formData.physicalRewardTowelAmount);
    if (formData.physicalRewardFinisherKitEnabled) total += sumAmount(formData.physicalRewardFinisherKitAmount);
    for (const item of formData.physicalRewardOtherItems || []) total += sumAmount(item.amount);
  }
  for (const packageOption of formData.registrationPackages || []) {
    for (const period of packageOption.pricingPeriods || []) total += sumAmount(period.amount);
  }
  if (formData.deliveryFeeEnabled) total += sumAmount(formData.deliveryFeeAmount);
  return Number(total.toFixed(2));
}

function getBlankCreateEventDefaults() {
  return {
    feeMode: 'free',
    feeCurrency: 'PHP',
    pricingMode: 'free',
    virtualCompletionMode: 'accumulated_distance',
    acceptedRunTypes: ['run', 'walk', 'hike', 'trail_run'],
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_distance',
    leaderboardRecognitionEnabled: '1',
    digitalBadgeEnabled: '1',
    digitalCertificateEnabled: '1',
    requiresDeliveryAddress: '1',
    requiresPhilippineDeliveryAddress: '1',
    internationalRunnersAllowed: '0'
  };
}

function getDefaultedCreateEventBody(body = {}) {
  return Object.keys(body || {}).length ? body : getBlankCreateEventDefaults();
}

function normalizeMilestoneDistances(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => Number(String(item || '').trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .slice(0, 20);
}

function parseRaceDistanceKm(label) {
  const value = String(label || '').trim().toUpperCase().replace(/\s+/g, '');
  const match = value.match(/^(\d+(?:\.\d+)?)(K|KM)?$/);
  if (!match) return null;
  const distance = Number(match[1]);
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

function normalizeTargetDistanceValues(values = []) {
  return Array.from(new Set(
    values
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
  ));
}

function inferTargetDistanceKm(raceDistances = [], raceCategories = []) {
  const categoryTargets = normalizeTargetDistanceValues(
    (raceCategories || []).map((category) => category?.distanceKm)
  );
  const labelTargets = normalizeTargetDistanceValues(
    (raceDistances || []).map(parseRaceDistanceKm)
  );
  const targets = categoryTargets.length ? categoryTargets : labelTargets;
  return targets.length ? Math.max(...targets) : null;
}

function addDays(date, days) {
  if (!date) return null;
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function resolveFinalSubmissionDeadline(formData) {
  const explicitDeadline = parseDateSafe(formData.finalSubmissionDeadlineAt);
  if (explicitDeadline) return explicitDeadline;
  const eventEndAt = parseDateSafe(formData.eventEndAt);
  return addDays(eventEndAt, 14);
}

function sanitizeWaiverTemplate(value) {
  const normalizedTemplate = normalizeWaiverTemplate(value);
  if (!normalizedTemplate) return '';
  return normalizeWaiverTemplate(sanitizeHtml(normalizedTemplate, WAIVER_SANITIZE_OPTIONS));
}

function getCreateEventFormData(body = {}) {
  const isDefaultCreateBody = !Object.keys(body || {}).length;
  const hasHomePromotionFields = hasOwnValue(body, 'homeFeatured')
    || hasOwnValue(body, 'homeFeaturedRank')
    || hasOwnValue(body, 'homeFeaturedUntil');
  body = getDefaultedCreateEventBody(body);
  const legacyRaceDistances = normalizeRaceDistances(body);
  const raceCategories = normalizeRaceCategories(body, legacyRaceDistances);
  const raceDistances = getRaceDistancesFromCategories(raceCategories);
  const galleryImageUrls = normalizeGalleryImageUrls(body.galleryImageUrlsText || body.galleryImageUrls);
  const waiverTemplateRaw = body.waiverTemplate || DEFAULT_WAIVER_TEMPLATE;
  const feeMode = normalizeModeValue(body.feeMode, FEE_MODES, 'free');
  const physicalRewardsEnabled = normalizeBoolean(body.physicalRewardsEnabled);
  const pricingMode = normalizePricingMode(body.pricingMode, feeMode);
  const registrationPackages = normalizeRegistrationPackages(body);
  const distancePricing = normalizeDistancePricing(body);
  const pricingPeriods = normalizeEventPricingPeriods(body);
  const customizedOptions = normalizeCustomizedOptions(body);
  const physicalRewardOtherItems = normalizeOtherItems(body.physicalRewardOtherItemName, body.physicalRewardOtherItemAmount);
  const deliveryFeeEnabled = normalizeBoolean(body.deliveryFeeEnabled);
  const leaderboardRecognitionEnabled = isDefaultCreateBody
    ? normalizeBoolean(body.leaderboardRecognitionEnabled)
    : normalizeBoolean(body.leaderboardRecognitionEnabled);
  const leaderboardSettings = normalizeLeaderboardSettings(body, {
    virtualCompletionMode: normalizeVirtualCompletionMode(body.virtualCompletionMode),
    leaderboardRecognitionEnabled
  });
  const normalizedFormData = {
    physicalRewardsEnabled,
    physicalRewardMedalEnabled: normalizeBoolean(body.physicalRewardMedalEnabled),
    physicalRewardMedalAmount: parseOptionalNonNegativeNumber(body.physicalRewardMedalAmount),
    physicalRewardShirtEnabled: normalizeBoolean(body.physicalRewardShirtEnabled),
    physicalRewardShirtAmount: parseOptionalNonNegativeNumber(body.physicalRewardShirtAmount),
    physicalRewardPatchEnabled: normalizeBoolean(body.physicalRewardPatchEnabled),
    physicalRewardPatchAmount: parseOptionalNonNegativeNumber(body.physicalRewardPatchAmount),
    physicalRewardTowelEnabled: normalizeBoolean(body.physicalRewardTowelEnabled),
    physicalRewardTowelAmount: parseOptionalNonNegativeNumber(body.physicalRewardTowelAmount),
    physicalRewardFinisherKitEnabled: normalizeBoolean(body.physicalRewardFinisherKitEnabled),
    physicalRewardFinisherKitAmount: parseOptionalNonNegativeNumber(body.physicalRewardFinisherKitAmount),
    physicalRewardOtherItems,
    physicalRewardsDescription: String(body.physicalRewardsDescription || '').trim().slice(0, 1000),
    physicalRewardsClaimingNotes: String(body.physicalRewardsClaimingNotes || '').trim().slice(0, 1000),
    pricingMode,
    distancePricing,
    pricingPeriods,
    pricingPeriodEarlyBirdStartAt: pricingPeriods.find((period) => period.code === 'early_bird')?.startAt || '',
    pricingPeriodEarlyBirdEndAt: pricingPeriods.find((period) => period.code === 'early_bird')?.endAt || '',
    pricingPeriodRegularStartAt: pricingPeriods.find((period) => period.code === 'regular')?.startAt || '',
    pricingPeriodRegularEndAt: pricingPeriods.find((period) => period.code === 'regular')?.endAt || '',
    pricingPeriodLateStartAt: pricingPeriods.find((period) => period.code === 'late')?.startAt || '',
    pricingPeriodLateEndAt: pricingPeriods.find((period) => period.code === 'late')?.endAt || '',
    customizedOptions,
    registrationPackages,
    deliveryFeeEnabled,
    deliveryFeeAmount: parseOptionalNonNegativeNumber(body.deliveryFeeAmount),
    deliveryFeeDescription: String(body.deliveryFeeDescription || '').trim().slice(0, 500),
    requiresDeliveryAddress: normalizeBoolean(body.requiresDeliveryAddress),
    requiresPhilippineDeliveryAddress: normalizeBoolean(body.requiresPhilippineDeliveryAddress),
    internationalRunnersAllowed: hasOwnValue(body, 'internationalRunnersAllowed')
      ? normalizeBoolean(body.internationalRunnersAllowed)
      : true,
    claimingMethod: normalizeClaimingMethod(body.claimingMethod),
    specialRewardBenefits: normalizeSpecialRewardBenefits(body),
    finalEventFee: parseOptionalNonNegativeNumber(body.finalEventFee)
  };
  normalizedFormData.suggestedEventFee = calculateSuggestedEventFee(normalizedFormData);
  if (normalizedFormData.finalEventFee === null) normalizedFormData.finalEventFee = normalizedFormData.suggestedEventFee || null;

  return {
    title: String(body.title || '').trim(),
    organiserName: String(body.organiserName || '').trim(),
    description: String(body.description || '').trim(),
    eventDetailsMarkdown: String(body.eventDetailsMarkdown || '').trim().slice(0, 20000),
    eventType: String(body.eventType || '').trim(),
    registrationOpenAt: body.registrationOpenAt || '',
    registrationCloseAt: body.registrationCloseAt || '',
    publicListingAvailableAt: body.publicListingAvailableAt || '',
    hasHomePromotionFields,
    homeFeatured: normalizeBoolean(body.homeFeatured),
    homeFeaturedRank: parseOptionalNonNegativeInteger(body.homeFeaturedRank),
    homeFeaturedUntil: body.homeFeaturedUntil || '',
    eventStartAt: body.eventStartAt || '',
    eventEndAt: body.eventEndAt || '',
    venueName: String(body.venueName || '').trim(),
    venueAddress: String(body.venueAddress || '').trim(),
    city: String(body.city || '').trim(),
    province: String(body.province || '').trim(),
    country: normalizeCountryCode(body.country),
    geoLat: String(body.geoLat || '').trim(),
    geoLng: String(body.geoLng || '').trim(),
    virtualStartAt: body.virtualStartAt || '',
    virtualEndAt: body.virtualEndAt || '',
    proofTypesAllowed: normalizeProofTypes(body.proofTypesAllowed),
    virtualCompletionMode: normalizeVirtualCompletionMode(body.virtualCompletionMode),
    targetDistanceKm: inferTargetDistanceKm(raceDistances, raceCategories),
    minimumActivityDistanceKm: parseOptionalPositiveNumber(body.minimumActivityDistanceKm),
    acceptedRunTypes: normalizeRunTypes(body.acceptedRunTypes),
    finalSubmissionDeadlineAt: body.finalSubmissionDeadlineAt || '',
    milestoneDistancesKm: normalizeMilestoneDistances(body.milestoneDistancesKm),
    milestoneDistancesText: normalizeMilestoneDistances(body.milestoneDistancesKm).join(', '),
    recognitionMode: normalizeModeValue(body.recognitionMode, RECOGNITION_MODES, 'completion_with_optional_ranking'),
    leaderboardMode: normalizeModeValue(body.leaderboardMode, LEADERBOARD_MODES, 'finishers_and_top_distance'),
    raceDistances,
    raceCategories,
    raceDistancePresets: raceDistances.filter((item) => RACE_DISTANCE_PRESETS.has(item)),
    raceDistanceCustom: String(body.raceDistanceCustom || '').trim(),
    bannerImageUrl: String(body.bannerImageUrl || '').trim(),
    logoUrl: String(body.logoUrl || '').trim(),
    posterImageUrl: String(body.posterImageUrl || '').trim(),
    galleryImageUrls,
    galleryImageUrlsText: galleryImageUrls.join('\n'),
    removeBannerImage: body.removeBannerImage === '1',
    removeLogoImage: body.removeLogoImage === '1',
    removePosterImage: body.removePosterImage === '1',
    removeGalleryImages: body.removeGalleryImages === '1',
    feeMode,
    feeAmount: feeMode === 'paid' ? parseOptionalPositiveNumber(body.feeAmount) : null,
    feeCurrency: normalizeCurrency(body.feeCurrency),
    paymentQrImageUrl: String(body.paymentQrImageUrl || '').trim(),
    paymentQrImageKey: String(body.paymentQrImageKey || '').trim(),
    removePaymentQrImage: body.removePaymentQrImage === '1',
    paymentAccountName: String(body.paymentAccountName || '').trim().slice(0, 160),
    paymentInstructions: String(body.paymentInstructions || '').trim().slice(0, 1000),
    digitalBadgeEnabled: isDefaultCreateBody ? normalizeBoolean(body.digitalBadgeEnabled) : normalizeBoolean(body.digitalBadgeEnabled),
    digitalCertificateEnabled: isDefaultCreateBody ? normalizeBoolean(body.digitalCertificateEnabled) : normalizeBoolean(body.digitalCertificateEnabled),
    leaderboardRecognitionEnabled,
    leaderboardSettings,
    ...normalizedFormData,
    waiverTemplate: sanitizeWaiverTemplate(waiverTemplateRaw),
    actionType: body.actionType === 'publish' || body.actionType === 'submit_review' ? 'publish' : 'draft'
  };
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getCreateEventFormDataFromEvent(event) {
  const eventRaceDistances = Array.isArray(event.raceDistances) ? event.raceDistances : [];
  const normalizedEventDistances = eventRaceDistances.map(normalizeRaceDistanceLabel).filter(Boolean);
  const raceCategories = (Array.isArray(event.raceCategories) && event.raceCategories.length
    ? event.raceCategories
    : normalizeRaceCategories({}, normalizedEventDistances)
  ).map((category, index) => {
    const distanceLabel = normalizeRaceCategoryLabel(category.distanceLabel || category.name || normalizedEventDistances[index]);
    return {
      categoryId: String(category.categoryId || '').trim().slice(0, 80) || buildRaceCategoryId(index, distanceLabel || category.name),
      name: String(category.name || distanceLabel || '').trim().slice(0, 100),
      type: normalizeModeValue(category.type, RACE_CATEGORY_TYPES, 'distance'),
      distanceLabel,
      distanceKm: Number.isFinite(category.distanceKm) ? category.distanceKm : parseRaceDistanceKm(distanceLabel),
      slots: Number.isFinite(category.slots) ? category.slots : null,
      cutoffTime: String(category.cutoffTime || '').trim().slice(0, 80),
      ageGroup: String(category.ageGroup || '').trim().slice(0, 80),
      rewardsDescription: String(category.rewardsDescription || '').trim().slice(0, 500)
    };
  });
  const raceDistancePresets = normalizedEventDistances.filter((item) => RACE_DISTANCE_PRESETS.has(item));
  const raceDistanceCustom = normalizedEventDistances.filter((item) => !RACE_DISTANCE_PRESETS.has(item)).join(', ');
  const registrationPackages = (Array.isArray(event.registrationPackages) ? event.registrationPackages : []).map((packageOption) => ({
    packageId: String(packageOption.packageId || '').trim(),
    name: packageOption.name || '',
    includedItems: {
      medal: Boolean(packageOption.includedItems?.medal),
      shirt: Boolean(packageOption.includedItems?.shirt),
      towel: Boolean(packageOption.includedItems?.towel),
      patch: Boolean(packageOption.includedItems?.patch),
      finisherKit: Boolean(packageOption.includedItems?.finisherKit),
      otherItemNames: Array.isArray(packageOption.includedItems?.otherItemNames) ? packageOption.includedItems.otherItemNames : []
    },
    pricingPeriods: (Array.isArray(packageOption.pricingPeriods) ? packageOption.pricingPeriods : []).map((period) => ({
      label: period.label || '',
      code: period.code || 'custom',
      startAt: formatDateForInput(period.startAt),
      endAt: formatDateForInput(period.endAt),
      amount: Number.isFinite(period.amount) ? period.amount : null
    })),
    notes: packageOption.notes || ''
  }));
  const specialRewardBenefits = (Array.isArray(event.specialRewardBenefits) ? event.specialRewardBenefits : []).map((benefit) => ({
    title: benefit.title || '',
    description: benefit.description || '',
    validUntil: formatDateForInput(benefit.validUntil),
    appliesToPackageNames: Array.isArray(benefit.appliesToPackageNames) ? benefit.appliesToPackageNames : []
  }));
  const customizedOptions = (Array.isArray(event.customizedOptions) ? event.customizedOptions : []).map((option) => ({
    shortDescription: option.shortDescription || '',
    amount: Number.isFinite(option.amount) ? option.amount : null
  }));
  const eventPricingPeriods = (Array.isArray(event.pricingPeriods) ? event.pricingPeriods : []).map((period) => ({
    label: period.label || '',
    code: period.code || 'custom',
    startAt: formatDateForInput(period.startAt),
    endAt: formatDateForInput(period.endAt)
  }));
  const eventPricingPeriodByCode = new Map(eventPricingPeriods.map((period) => [period.code, period]));

  return {
    title: event.title || '',
    organiserName: event.organiserName || '',
    description: event.description || '',
    eventDetailsMarkdown: event.eventDetailsMarkdown || '',
    eventType: event.eventType || '',
    registrationOpenAt: formatDateForInput(event.registrationOpenAt),
    registrationCloseAt: formatDateForInput(event.registrationCloseAt),
    publicListingAvailableAt: formatDateForInput(event.publicListingAvailableAt),
    hasHomePromotionFields: false,
    homeFeatured: Boolean(event.homeFeatured),
    homeFeaturedRank: Number.isFinite(event.homeFeaturedRank) ? event.homeFeaturedRank : null,
    homeFeaturedUntil: formatDateForInput(event.homeFeaturedUntil),
    eventStartAt: formatDateForInput(event.eventStartAt),
    eventEndAt: formatDateForInput(event.eventEndAt),
    venueName: event.venueName || '',
    venueAddress: event.venueAddress || '',
    city: event.city || '',
    province: event.province || '',
    country: normalizeCountryCode(event.country),
    geoLat: event.geo?.lat?.toString?.() || '',
    geoLng: event.geo?.lng?.toString?.() || '',
    virtualStartAt: formatDateForInput(event.virtualWindow?.startAt),
    virtualEndAt: formatDateForInput(event.virtualWindow?.endAt),
    proofTypesAllowed: normalizeProofTypes(event.proofTypesAllowed),
    virtualCompletionMode: normalizeVirtualCompletionMode(event.virtualCompletionMode),
    targetDistanceKm: Number.isFinite(event.targetDistanceKm) ? event.targetDistanceKm : inferTargetDistanceKm(normalizedEventDistances, raceCategories),
    minimumActivityDistanceKm: Number.isFinite(event.minimumActivityDistanceKm) ? event.minimumActivityDistanceKm : null,
    acceptedRunTypes: Array.isArray(event.acceptedRunTypes) ? event.acceptedRunTypes : [],
    finalSubmissionDeadlineAt: formatDateForInput(event.finalSubmissionDeadlineAt),
    milestoneDistancesKm: Array.isArray(event.milestoneDistancesKm) ? event.milestoneDistancesKm : [],
    milestoneDistancesText: (Array.isArray(event.milestoneDistancesKm) ? event.milestoneDistancesKm : []).join(', '),
    recognitionMode: normalizeModeValue(event.recognitionMode, RECOGNITION_MODES, 'completion_only'),
    leaderboardMode: normalizeModeValue(event.leaderboardMode, LEADERBOARD_MODES, 'finishers'),
    raceDistances: normalizedEventDistances,
    raceCategories,
    raceDistancePresets,
    raceDistanceCustom,
    bannerImageUrl: event.bannerImageUrl || '',
    logoUrl: event.logoUrl || '',
    posterImageUrl: event.posterImageUrl || '',
    galleryImageUrls: Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : [],
    galleryImageUrlsText: (Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : []).join('\n'),
    removeBannerImage: false,
    removeLogoImage: false,
    removePosterImage: false,
    removeGalleryImages: false,
    feeMode: event.feeMode || 'free',
    feeAmount: Number.isFinite(event.feeAmount) ? event.feeAmount : null,
    feeCurrency: event.feeCurrency || 'PHP',
    paymentQrImageUrl: event.paymentQrImageUrl || '',
    paymentQrImageKey: event.paymentQrImageKey || '',
    removePaymentQrImage: false,
    paymentAccountName: event.paymentAccountName || '',
    paymentInstructions: event.paymentInstructions || '',
    digitalBadgeEnabled: Boolean(event.digitalBadgeEnabled),
    digitalCertificateEnabled: event.digitalCertificateEnabled !== false,
    leaderboardRecognitionEnabled: event.leaderboardRecognitionEnabled !== false,
    leaderboardSettings: normalizeLeaderboardSettingsFromEvent(event),
    physicalRewardsEnabled: Boolean(event.physicalRewardsEnabled),
    physicalRewardMedalEnabled: Boolean(event.physicalRewardMedalEnabled),
    physicalRewardMedalAmount: Number.isFinite(event.physicalRewardMedalAmount) ? event.physicalRewardMedalAmount : null,
    physicalRewardShirtEnabled: Boolean(event.physicalRewardShirtEnabled),
    physicalRewardShirtAmount: Number.isFinite(event.physicalRewardShirtAmount) ? event.physicalRewardShirtAmount : null,
    physicalRewardPatchEnabled: Boolean(event.physicalRewardPatchEnabled),
    physicalRewardPatchAmount: Number.isFinite(event.physicalRewardPatchAmount) ? event.physicalRewardPatchAmount : null,
    physicalRewardTowelEnabled: Boolean(event.physicalRewardTowelEnabled),
    physicalRewardTowelAmount: Number.isFinite(event.physicalRewardTowelAmount) ? event.physicalRewardTowelAmount : null,
    physicalRewardFinisherKitEnabled: Boolean(event.physicalRewardFinisherKitEnabled),
    physicalRewardFinisherKitAmount: Number.isFinite(event.physicalRewardFinisherKitAmount) ? event.physicalRewardFinisherKitAmount : null,
    physicalRewardOtherItems: Array.isArray(event.physicalRewardOtherItems) ? event.physicalRewardOtherItems : [],
    physicalRewardsDescription: event.physicalRewardsDescription || '',
    physicalRewardsClaimingNotes: event.physicalRewardsClaimingNotes || '',
    pricingMode: normalizePricingMode(event.pricingMode, event.feeMode || 'free'),
    distancePricing: (Array.isArray(event.distancePricing) ? event.distancePricing : []).map((item) => ({
      categoryId: String(item.categoryId || '').trim(),
      distance: String(item.distance || '').trim(),
      amount: Number.isFinite(item.amount) ? item.amount : null,
      earlyBirdAmount: Number.isFinite(item.earlyBirdAmount) ? item.earlyBirdAmount : null,
      regularAmount: Number.isFinite(item.regularAmount) ? item.regularAmount : null,
      lateAmount: Number.isFinite(item.lateAmount) ? item.lateAmount : null
    })),
    pricingPeriods: eventPricingPeriods,
    pricingPeriodEarlyBirdStartAt: eventPricingPeriodByCode.get('early_bird')?.startAt || '',
    pricingPeriodEarlyBirdEndAt: eventPricingPeriodByCode.get('early_bird')?.endAt || '',
    pricingPeriodRegularStartAt: eventPricingPeriodByCode.get('regular')?.startAt || '',
    pricingPeriodRegularEndAt: eventPricingPeriodByCode.get('regular')?.endAt || '',
    pricingPeriodLateStartAt: eventPricingPeriodByCode.get('late')?.startAt || '',
    pricingPeriodLateEndAt: eventPricingPeriodByCode.get('late')?.endAt || '',
    customizedOptions,
    suggestedEventFee: Number.isFinite(event.suggestedEventFee) ? event.suggestedEventFee : 0,
    finalEventFee: Number.isFinite(event.finalEventFee) ? event.finalEventFee : null,
    registrationPackages,
    deliveryFeeEnabled: Boolean(event.deliveryFeeEnabled),
    deliveryFeeAmount: Number.isFinite(event.deliveryFeeAmount) ? event.deliveryFeeAmount : null,
    deliveryFeeDescription: event.deliveryFeeDescription || '',
    requiresDeliveryAddress: Boolean(event.requiresDeliveryAddress),
    requiresPhilippineDeliveryAddress: Boolean(event.requiresPhilippineDeliveryAddress),
    internationalRunnersAllowed: event.internationalRunnersAllowed !== false,
    claimingMethod: normalizeClaimingMethod(event.claimingMethod),
    specialRewardBenefits,
    waiverTemplate: sanitizeWaiverTemplate(event.waiverTemplate || DEFAULT_WAIVER_TEMPLATE),
    actionType: event.status === 'published' || event.status === 'pending_review' ? 'publish' : 'draft'
  };
}

function parseDateSafe(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isValidUrl(url) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function validateOptionalCreateEventFields(formData, errors) {
  if (!isValidUrl(formData.bannerImageUrl)) errors.bannerImageUrl = 'Banner URL must be a valid URL.';
  if (!isValidUrl(formData.logoUrl)) errors.logoUrl = 'Logo URL must be a valid URL.';
  if (!isValidUrl(formData.posterImageUrl)) errors.posterImageUrl = 'Poster URL must be a valid URL.';
  if (!isValidUrl(formData.paymentQrImageUrl)) errors.paymentQrImageUrl = 'Payment QR URL must be a valid URL.';
  if (Array.isArray(formData.galleryImageUrls) && formData.galleryImageUrls.length > MAX_GALLERY_IMAGES) {
    errors.galleryImageUrls = `Gallery supports up to ${MAX_GALLERY_IMAGES} images.`;
  }
  if (Array.isArray(formData.galleryImageUrls) && formData.galleryImageUrls.find((url) => !isValidUrl(url))) {
    errors.galleryImageUrls = 'Each gallery URL must be a valid URL.';
  }

  for (const field of ['registrationOpenAt', 'registrationCloseAt', 'publicListingAvailableAt', 'homeFeaturedUntil', 'eventStartAt', 'eventEndAt', 'virtualStartAt', 'virtualEndAt', 'finalSubmissionDeadlineAt']) {
    if (formData[field] && !parseDateSafe(formData[field])) errors[field] = 'Invalid date format.';
  }
  if (formData.homeFeaturedRank !== null && (!Number.isInteger(formData.homeFeaturedRank) || formData.homeFeaturedRank < 0)) {
    errors.homeFeaturedRank = 'Homepage featured rank must be zero or higher.';
  }

  const hasGeoLat = !!formData.geoLat;
  const hasGeoLng = !!formData.geoLng;
  if (hasGeoLat !== hasGeoLng) errors.geo = 'Provide both latitude and longitude, or leave both empty.';
  if (hasGeoLat && hasGeoLng) {
    const lat = Number(formData.geoLat);
    const lng = Number(formData.geoLng);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) errors.geoLat = 'Latitude must be between -90 and 90.';
    if (Number.isNaN(lng) || lng < -180 || lng > 180) errors.geoLng = 'Longitude must be between -180 and 180.';
  }

  // targetDistanceKm is derived from raceDistances — no manual input to validate here
  if (formData.feeMode === 'paid') {
    if (formData.feeAmount !== null && (!Number.isFinite(formData.feeAmount) || formData.feeAmount < 0)) {
      errors.feeAmount = 'Paid event amount must be zero or higher.';
    }
    if (!/^[A-Z]{3}$/.test(formData.feeCurrency || '')) {
      errors.feeCurrency = 'Currency must be a 3-letter code.';
    }
  }
  validateOrganizerSetupFields(formData, errors);
  if ((formData.eventDetailsMarkdown || '').length > 20000) {
    errors.eventDetailsMarkdown = 'Event details must be 20,000 characters or less.';
  }
  if ((formData.physicalRewardsDescription || '').length > 1000) {
    errors.physicalRewardsDescription = 'Physical rewards description must be 1,000 characters or less.';
  }
}

function validateNonNegativeAmount(value, fieldName, label, errors) {
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    errors[fieldName] = `${label} must be zero or higher.`;
  }
}

function validatePricingPeriod(period, fieldPrefix, errors) {
  const hasAny = Boolean(period.label || period.startAt || period.endAt || period.amount !== null);
  if (!hasAny) return;
  if (!period.label) errors[`${fieldPrefix}Label`] = 'Pricing period label is required.';
  if (!period.startAt) errors[`${fieldPrefix}StartAt`] = 'Pricing period start date is required.';
  else if (!parseDateSafe(period.startAt)) errors[`${fieldPrefix}StartAt`] = 'Invalid date format.';
  if (!period.endAt) errors[`${fieldPrefix}EndAt`] = 'Pricing period end date is required.';
  else if (!parseDateSafe(period.endAt)) errors[`${fieldPrefix}EndAt`] = 'Invalid date format.';
  validateNonNegativeAmount(period.amount, `${fieldPrefix}Amount`, 'Pricing period amount', errors);
  const startAt = parseDateSafe(period.startAt);
  const endAt = parseDateSafe(period.endAt);
  if (startAt && endAt && startAt >= endAt) {
    errors[`${fieldPrefix}EndAt`] = 'Pricing period end must be after start.';
  }
}

function getPricingPeriodDateRange(period) {
  const startAt = parseDateSafe(period?.startAt);
  const endAt = parseDateSafe(period?.endAt);
  return startAt && endAt ? { startAt, endAt } : null;
}

function validatePricingPeriodCollection(periods, errors, {
  fieldName,
  registrationOpenAt,
  registrationCloseAt,
  label = 'Pricing periods'
} = {}) {
  const datedPeriods = [];
  for (const period of periods || []) {
    const range = getPricingPeriodDateRange(period);
    if (range) datedPeriods.push({ ...period, ...range });
  }

  if (!datedPeriods.length) return;

  if (registrationOpenAt || registrationCloseAt) {
    for (const period of datedPeriods) {
      if (registrationOpenAt && period.startAt < registrationOpenAt) {
        errors[fieldName] = `${label} must start within the registration window.`;
        return;
      }
      if (registrationCloseAt && period.endAt > registrationCloseAt) {
        errors[fieldName] = `${label} must end within the registration window.`;
        return;
      }
    }
  }

  const sorted = datedPeriods.slice().sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].startAt < sorted[index - 1].endAt) {
      errors[fieldName] = `${label} cannot overlap.`;
      return;
    }
  }
}

function hasPositiveAmount(value) {
  return Number.isFinite(value) && value > 0;
}

function getDistancePricingPeriodAmount(item, code) {
  if (code === 'early_bird') return item?.earlyBirdAmount;
  if (code === 'regular') return item?.regularAmount;
  if (code === 'late') return item?.lateAmount;
  return item?.amount;
}

function validateDistancePricingFields(formData, errors, { requireComplete = false } = {}) {
  const pricingByKey = new Map();
  for (const item of (formData.distancePricing || [])) {
    if (item.categoryId) pricingByKey.set(`category:${item.categoryId}`, item);
    if (item.distance) pricingByKey.set(`distance:${item.distance}`, item);
  }
  const expectedCategories = Array.isArray(formData.raceCategories) && formData.raceCategories.length
    ? formData.raceCategories.map((category) => ({
      key: category.categoryId ? `category:${category.categoryId}` : `distance:${getRaceCategoryDisplayLabel(category)}`,
      distance: getRaceCategoryDisplayLabel(category)
    }))
    : (Array.isArray(formData.raceDistances) ? formData.raceDistances : []).map((distance) => ({
      key: `distance:${distance}`,
      distance
    }));
  const needsPeriods = formData.pricingMode === 'distance_based_period';
  const pricingPeriods = Array.isArray(formData.pricingPeriods) ? formData.pricingPeriods : [];
  const pricingPeriodCodes = new Set(pricingPeriods.map((period) => period.code).filter(Boolean));
  const registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
  const registrationCloseAt = parseDateSafe(formData.registrationCloseAt);

  for (const [index, item] of (formData.distancePricing || []).entries()) {
    validateNonNegativeAmount(item.amount, `distancePricingAmount${index}`, 'Distance amount', errors);
    validateNonNegativeAmount(item.earlyBirdAmount, `distancePricingEarlyBirdAmount${index}`, 'Early bird amount', errors);
    validateNonNegativeAmount(item.regularAmount, `distancePricingRegularAmount${index}`, 'Regular amount', errors);
    validateNonNegativeAmount(item.lateAmount, `distancePricingLateAmount${index}`, 'Late amount', errors);
  }

  if (needsPeriods) {
    for (const [index, period] of pricingPeriods.entries()) {
      const fieldPrefix = `pricingPeriod${index}`;
      const hasAny = Boolean(period.label || period.startAt || period.endAt);
      if (!hasAny) continue;
      if (!period.label) errors[`${fieldPrefix}Label`] = 'Pricing period label is required.';
      if (!period.startAt) errors[`${fieldPrefix}StartAt`] = 'Pricing period start date is required.';
      else if (!parseDateSafe(period.startAt)) errors[`${fieldPrefix}StartAt`] = 'Invalid date format.';
      if (!period.endAt) errors[`${fieldPrefix}EndAt`] = 'Pricing period end date is required.';
      else if (!parseDateSafe(period.endAt)) errors[`${fieldPrefix}EndAt`] = 'Invalid date format.';
      const range = getPricingPeriodDateRange(period);
      if (range && range.startAt >= range.endAt) {
        errors[`${fieldPrefix}EndAt`] = 'Pricing period end must be after start.';
      }
    }
    validatePricingPeriodCollection(pricingPeriods, errors, {
      fieldName: 'pricingPeriods',
      registrationOpenAt,
      registrationCloseAt,
      label: 'Distance pricing periods'
    });
  }

  if (!requireComplete || formData.feeMode !== 'paid') return;
  if (!['distance_based', 'distance_based_period'].includes(formData.pricingMode)) return;
  if (!expectedCategories.length) return;

  if (needsPeriods && !pricingPeriods.length) {
    errors.pricingPeriods = 'Add at least one pricing period for paid period-based distance pricing.';
    return;
  }

  for (const category of expectedCategories) {
    const price = pricingByKey.get(category.key) || pricingByKey.get(`distance:${category.distance}`);
    const hasValidPrice = needsPeriods
      ? pricingPeriods.some((period) => pricingPeriodCodes.has(period.code) && hasPositiveAmount(getDistancePricingPeriodAmount(price, period.code)))
      : hasPositiveAmount(price?.amount);
    if (!hasValidPrice) {
      errors.distancePricing = needsPeriods
        ? 'Add at least one positive amount that matches an active pricing period for each distance.'
        : 'Add a positive amount for each paid distance.';
      break;
    }
  }
}

function validateCustomizedOptions(formData, errors, { requireComplete = false } = {}) {
  for (const [index, option] of (formData.customizedOptions || []).entries()) {
    if (!option.shortDescription && option.amount !== null) {
      errors[`customizedOptionShortDescription${index}`] = 'Custom signup option description is required when an amount is set.';
    }
    validateNonNegativeAmount(option.amount, `customizedOptionAmount${index}`, 'Custom signup option amount', errors);
  }

  if (!requireComplete || formData.feeMode !== 'paid') return;
  if (!['customized_options', 'customized_options_period'].includes(formData.pricingMode)) return;

  if (!Array.isArray(formData.customizedOptions) || !formData.customizedOptions.length) {
    errors.customizedOptions = 'Add at least one custom signup option for paid customized pricing.';
    return;
  }

  for (const [index, option] of formData.customizedOptions.entries()) {
    if (!option.shortDescription) {
      errors[`customizedOptionShortDescription${index}`] = 'Custom signup option description is required.';
    }
    if (!hasPositiveAmount(option.amount)) {
      errors[`customizedOptionAmount${index}`] = 'Custom signup option amount must be greater than zero.';
    }
  }
}

function validateRegistrationPackages(formData, errors, { requireComplete = false } = {}) {
  const packages = Array.isArray(formData.registrationPackages) ? formData.registrationPackages : [];
  const registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
  const registrationCloseAt = parseDateSafe(formData.registrationCloseAt);

  for (const [packageIndex, packageOption] of packages.entries()) {
    if (!packageOption.name) errors[`registrationPackageName${packageIndex}`] = 'Package name is required when package details are entered.';
    for (const [periodIndex, period] of (packageOption.pricingPeriods || []).entries()) {
      validatePricingPeriod(period, `registrationPackage${packageIndex}PricingPeriod${periodIndex}`, errors);
    }
    validatePricingPeriodCollection(packageOption.pricingPeriods || [], errors, {
      fieldName: `registrationPackage${packageIndex}PricingPeriods`,
      registrationOpenAt,
      registrationCloseAt,
      label: `Package pricing periods for ${packageOption.name || `package ${packageIndex + 1}`}`
    });
  }

  if (!requireComplete || formData.feeMode !== 'paid' || formData.pricingMode !== 'package_period') return;

  if (!packages.length) {
    errors.registrationPackages = 'Add at least one registration package for paid package pricing.';
    return;
  }

  for (const [packageIndex, packageOption] of packages.entries()) {
    if (!packageOption.name) {
      errors[`registrationPackageName${packageIndex}`] = 'Package name is required for paid package pricing.';
    }
    const hasValidPrice = (packageOption.pricingPeriods || []).some((period) => hasPositiveAmount(period.amount));
    if (!hasValidPrice) {
      errors.registrationPackages = 'Add at least one positive package price for each paid registration package.';
    }
  }
}

function validateOrganizerSetupFields(formData, errors) {
  if (!V1_PRICING_MODES.has(formData.pricingMode)) {
    errors.pricingMode = 'Select a valid pricing mode.';
  }
  const registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
  const registrationCloseAt = parseDateSafe(formData.registrationCloseAt);
  for (const [fieldName, label] of [
    ['physicalRewardMedalAmount', 'Medal amount'],
    ['physicalRewardShirtAmount', 'Shirt amount'],
    ['physicalRewardPatchAmount', 'Patch amount'],
    ['physicalRewardTowelAmount', 'Towel amount'],
    ['physicalRewardFinisherKitAmount', 'Finisher kit amount'],
    ['deliveryFeeAmount', 'Delivery fee'],
    ['finalEventFee', 'Final event fee']
  ]) {
    validateNonNegativeAmount(formData[fieldName], fieldName, label, errors);
  }
  for (const [index, item] of (formData.physicalRewardOtherItems || []).entries()) {
    if (!item.name && item.amount !== null) errors[`physicalRewardOtherItemName${index}`] = 'Custom merchandise name is required when an amount is set.';
    validateNonNegativeAmount(item.amount, `physicalRewardOtherItemAmount${index}`, 'Custom merchandise amount', errors);
  }
  for (const [categoryIndex, category] of (formData.raceCategories || []).entries()) {
    if (!category.name && !category.distanceLabel) {
      errors[`raceCategoryName${categoryIndex}`] = 'Category name is required when category details are entered.';
    }
    validateNonNegativeAmount(category.distanceKm, `raceCategoryDistanceKm${categoryIndex}`, 'Category distance', errors);
    validateNonNegativeAmount(category.slots, `raceCategorySlots${categoryIndex}`, 'Category slots', errors);
  }
  validateRaceCategories(formData, errors);
  validateRegistrationPackages(formData, errors);
  for (const [benefitIndex, benefit] of (formData.specialRewardBenefits || []).entries()) {
    if (!benefit.title) errors[`specialRewardBenefitTitle${benefitIndex}`] = 'Benefit title is required when benefit details are entered.';
    if (benefit.validUntil && !parseDateSafe(benefit.validUntil)) {
      errors[`specialRewardBenefitValidUntil${benefitIndex}`] = 'Invalid date format.';
    }
  }
  validateDistancePricingFields(formData, errors);
  validateCustomizedOptions(formData, errors);
}

function validateRaceCategories(formData, errors) {
  const categories = Array.isArray(formData.raceCategories) ? formData.raceCategories : [];
  const seenIds = new Map();
  const seenDisplayLabels = new Map();
  const seenDistanceLabels = new Map();

  for (const [index, category] of categories.entries()) {
    const categoryId = String(category.categoryId || '').trim();
    const displayLabel = String(category.name || category.distanceLabel || '').trim().toUpperCase();
    const distanceLabel = normalizeRaceCategoryLabel(category.distanceLabel || category.name || '');

    if (categoryId) {
      if (seenIds.has(categoryId)) {
        errors[`raceCategoryName${index}`] = 'Race category IDs must be unique. Remove and re-add the duplicate category.';
      } else {
        seenIds.set(categoryId, index);
      }
    }

    if (displayLabel) {
      if (seenDisplayLabels.has(displayLabel)) {
        errors[`raceCategoryName${index}`] = 'Race category display names must be unique.';
      } else {
        seenDisplayLabels.set(displayLabel, index);
      }
    }

    if (distanceLabel) {
      if (seenDistanceLabels.has(distanceLabel)) {
        errors[`raceCategoryName${index}`] = 'Race category distance labels must be unique for registration and pricing.';
      } else {
        seenDistanceLabels.set(distanceLabel, index);
      }
    }
  }
}

function validateCreateEventForm(formData) {
  const errors = {};
  const isPublish = formData.actionType === 'publish';

  if (!formData.title || formData.title.length < 5) {
    errors.title = 'Event title must be at least 5 characters.';
  }
  if (!isPublish) {
    validateOptionalCreateEventFields(formData, errors);
    return errors;
  }

  if (!formData.description || formData.description.length < 20) errors.description = 'Description must be at least 20 characters.';
  if ((formData.eventDetailsMarkdown || '').length > 20000) errors.eventDetailsMarkdown = 'Event details must be 20,000 characters or less.';
  if (formData.feeMode === 'paid') {
    if (formData.feeAmount !== null && (!Number.isFinite(formData.feeAmount) || formData.feeAmount < 0)) {
      errors.feeAmount = 'Paid event amount must be zero or higher.';
    }
    if (!formData.paymentQrImageUrl) {
      errors.paymentQrImageUrl = 'Payment QR image is required before submitting a paid event for review.';
    }
    if (!formData.paymentAccountName) {
      errors.paymentAccountName = 'Payment account name is required before submitting a paid event for review.';
    }
  }
  if (!['virtual', 'onsite', 'hybrid'].includes(formData.eventType)) errors.eventType = 'Select a valid event type.';
  if (!Array.isArray(formData.raceDistances) || !formData.raceDistances.length) {
    errors.raceDistances = 'Add at least one race distance (for example: 3K, 5K, 10K, 21K).';
  } else if (formData.raceDistances.length > 12) {
    errors.raceDistances = 'You can add up to 12 race distances per event.';
  }

  for (const field of ['registrationOpenAt', 'registrationCloseAt', 'eventStartAt', 'eventEndAt']) {
    if (!formData[field]) errors[field] = 'This date is required.';
    else if (!parseDateSafe(formData[field])) errors[field] = 'Invalid date format.';
  }

  const registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
  const registrationCloseAt = parseDateSafe(formData.registrationCloseAt);
  const publicListingAvailableAt = parseDateSafe(formData.publicListingAvailableAt);
  const eventStartAt = parseDateSafe(formData.eventStartAt);
  const eventEndAt = parseDateSafe(formData.eventEndAt);
  if (registrationOpenAt && registrationCloseAt && registrationOpenAt >= registrationCloseAt) {
    errors.registrationCloseAt = 'Registration close must be after registration open.';
  }
  if (publicListingAvailableAt && registrationCloseAt && publicListingAvailableAt > registrationCloseAt) {
    errors.publicListingAvailableAt = 'Public posting date must be on or before registration close.';
  }
  if (eventStartAt && eventEndAt && eventStartAt >= eventEndAt) errors.eventEndAt = 'Event end must be after event start.';
  if (formData.eventType !== 'virtual' && registrationCloseAt && eventStartAt && registrationCloseAt > eventStartAt) {
    errors.registrationCloseAt = 'Registration close must be on/before event start (virtual events may extend registration past the start date).';
  }

  const needsOnsiteFields = formData.eventType === 'onsite' || formData.eventType === 'hybrid';
  if (needsOnsiteFields) {
    if (!formData.venueName) errors.venueName = 'Venue name is required for on-site/hybrid events.';
    if (!formData.venueAddress) errors.venueAddress = 'Venue address is required for on-site/hybrid events.';
    if (!formData.city) errors.city = 'City is required for on-site/hybrid events.';
    if (!formData.country) errors.country = 'Country is required for on-site/hybrid events.';
    else if (!isValidCountryCode(formData.country)) errors.country = 'Select a valid country.';
  }

  const needsVirtualFields = formData.eventType === 'virtual' || formData.eventType === 'hybrid';
  if (needsVirtualFields) {
    if (!formData.virtualStartAt) errors.virtualStartAt = 'Virtual window start is required for virtual/hybrid events.';
    if (!formData.virtualEndAt) errors.virtualEndAt = 'Virtual window end is required for virtual/hybrid events.';
    if (!formData.proofTypesAllowed.length) errors.proofTypesAllowed = 'Select at least one proof type.';
    if (formData.virtualCompletionMode === 'accumulated_distance') {
      if (!Number.isFinite(formData.targetDistanceKm) || formData.targetDistanceKm <= 0) {
        errors.raceDistances = 'Add a numeric race distance (e.g. 100K) — it sets the completion goal for accumulated challenges.';
      }
      if (!Array.isArray(formData.acceptedRunTypes) || !formData.acceptedRunTypes.length) {
        errors.acceptedRunTypes = 'Select at least one accepted activity type.';
      }
    }
    const virtualStart = parseDateSafe(formData.virtualStartAt);
    const virtualEnd = parseDateSafe(formData.virtualEndAt);
    if (virtualStart && virtualEnd && virtualStart >= virtualEnd) errors.virtualEndAt = 'Virtual window end must be after virtual window start.';
  }

  validateOptionalCreateEventFields(formData, errors);
  validateDistancePricingFields(formData, errors, { requireComplete: true });
  validateCustomizedOptions(formData, errors, { requireComplete: true });
  validateRegistrationPackages(formData, errors, { requireComplete: true });
  const waiverText = htmlToPlainText(formData.waiverTemplate || '');
  if (!waiverText || waiverText.length < 200) errors.waiverTemplate = 'Waiver template must be at least 200 characters.';
  else if ((formData.waiverTemplate || '').length > 20000) errors.waiverTemplate = 'Waiver template must be 20,000 characters or less.';

  return errors;
}

function getEventReadinessChecklist(formData = {}) {
  const publishFormData = { ...formData, actionType: 'publish' };
  const errors = validateCreateEventForm(publishFormData);
  const hasError = (...fieldNames) => fieldNames.some((fieldName) => Object.prototype.hasOwnProperty.call(errors, fieldName));
  const isPaid = publishFormData.feeMode === 'paid';
  const isDistancePriced = ['distance_based', 'distance_based_period'].includes(publishFormData.pricingMode);
  const isCustomizedPriced = ['customized_options', 'customized_options_period'].includes(publishFormData.pricingMode);
  const isPackagePriced = publishFormData.pricingMode === 'package_period';
  const needsOnsiteFields = publishFormData.eventType === 'onsite' || publishFormData.eventType === 'hybrid';
  const needsVirtualFields = publishFormData.eventType === 'virtual' || publishFormData.eventType === 'hybrid';
  const needsAccumulatedFields = needsVirtualFields && publishFormData.virtualCompletionMode === 'accumulated_distance';
  const items = [
    { id: 'title', label: 'Event title', ok: !hasError('title') },
    { id: 'description', label: 'Short description', ok: !hasError('description') },
    { id: 'eventType', label: 'Event type', ok: !hasError('eventType') },
    {
      id: 'schedule',
      label: 'Schedule dates',
      ok: !hasError('registrationOpenAt', 'registrationCloseAt', 'eventStartAt', 'eventEndAt')
    },
    { id: 'raceDistances', label: 'Race category or distance', ok: !hasError('raceDistances') },
    { id: 'eventDetails', label: 'Event details', ok: !hasError('eventDetailsMarkdown') },
    { id: 'waiver', label: 'Valid waiver', ok: !hasError('waiverTemplate') }
  ];

  if (needsOnsiteFields) {
    items.push({
      id: 'location',
      label: 'Onsite location',
      ok: !hasError('venueName', 'venueAddress', 'city', 'country')
    });
  }
  if (needsVirtualFields) {
    items.push({
      id: 'virtualWindow',
      label: 'Virtual participation window',
      ok: !hasError('virtualStartAt', 'virtualEndAt')
    });
    items.push({
      id: 'proofTypes',
      label: 'Virtual proof types',
      ok: !hasError('proofTypesAllowed')
    });
  }
  if (needsAccumulatedFields) {
    items.push({
      id: 'acceptedRunTypes',
      label: 'Accepted activity types',
      ok: !hasError('acceptedRunTypes')
    });
  }
  if (isPaid) {
    items.push({ id: 'paymentQr', label: 'Payment QR image', ok: !hasError('paymentQrImageUrl') });
    items.push({ id: 'paymentAccountName', label: 'Payment account name', ok: !hasError('paymentAccountName') });
    items.push({ id: 'pricingMode', label: 'Pricing mode', ok: !hasError('pricingMode') });
  }
  if (isPaid && isDistancePriced) {
    items.push({ id: 'distancePricing', label: 'Distance/category pricing', ok: !hasError('distancePricing') });
  }
  if (isPaid && publishFormData.pricingMode === 'distance_based_period') {
    items.push({ id: 'pricingPeriods', label: 'Pricing periods', ok: !hasError('pricingPeriods') });
  }
  if (isPaid && isCustomizedPriced) {
    const customizedOptionFields = Object.keys(errors).filter((fieldName) => fieldName.startsWith('customizedOption'));
    items.push({
      id: 'customizedOptions',
      label: 'Custom signup options',
      ok: !hasError('customizedOptions') && customizedOptionFields.length === 0
    });
  }
  if (isPaid && isPackagePriced) {
    const packageFields = Object.keys(errors).filter((fieldName) => fieldName.startsWith('registrationPackage'));
    items.push({
      id: 'registrationPackages',
      label: 'Registration packages',
      ok: !hasError('registrationPackages') && packageFields.length === 0
    });
  }

  return {
    ready: items.every((item) => item.ok),
    missingCount: items.filter((item) => !item.ok).length,
    items,
    errors
  };
}

function formatSummaryDate(value) {
  if (!value) return '';
  const date = parseDateSafe(value);
  if (!date) return String(value || '').trim();
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatSummaryWindow(startAt, endAt) {
  const start = formatSummaryDate(startAt);
  const end = formatSummaryDate(endAt);
  if (start && end) return `${start} to ${end}`;
  return start || end || 'Not set';
}

function formatCurrencyAmount(amount, currency = 'PHP') {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return '';
  return `${currency || 'PHP'} ${parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getEventReviewSummary(formData = {}) {
  const currency = formData.feeCurrency || 'PHP';
  const categories = Array.isArray(formData.raceCategories) ? formData.raceCategories : [];
  const categorySummary = categories.length
    ? categories.map((category) => {
      const label = getRaceCategoryDisplayLabel(category);
      return category.name && label && category.name !== label ? `${category.name} (${label})` : (category.name || label);
    }).filter(Boolean).join(', ')
    : ((formData.raceDistances || []).join(', ') || 'Not set');
  const distancePrices = (formData.distancePricing || []).map((item) => {
    if (formData.pricingMode === 'distance_based_period') {
      const amounts = [
        item.earlyBirdAmount,
        item.regularAmount,
        item.lateAmount
      ].filter((amount) => Number.isFinite(amount) && amount > 0);
      return amounts.length ? `${item.distance}: from ${formatCurrencyAmount(Math.min(...amounts), currency)}` : `${item.distance}: not priced`;
    }
    return `${item.distance}: ${formatCurrencyAmount(item.amount, currency) || 'not priced'}`;
  });
  const customOptions = (formData.customizedOptions || []).map((option) => (
    `${option.shortDescription || 'Signup option'}: ${formatCurrencyAmount(option.amount, currency) || 'not priced'}`
  ));
  const packageOptions = (formData.registrationPackages || []).map((packageOption) => {
    const amounts = (packageOption.pricingPeriods || [])
      .map((period) => period.amount)
      .filter((amount) => Number.isFinite(amount) && amount > 0);
    const amountLabel = amounts.length ? `from ${formatCurrencyAmount(Math.min(...amounts), currency)}` : 'not priced';
    return `${packageOption.name || 'Registration package'}: ${amountLabel}`;
  });
  const pricingOptions = formData.feeMode !== 'paid'
    ? 'Free registration'
    : (packageOptions.length && formData.pricingMode === 'package_period'
      ? packageOptions.join(', ')
      : (customOptions.length ? customOptions.join(', ') : (distancePrices.join(', ') || 'Not set')));
  const pricingPeriodSummary = (formData.pricingPeriods || []).map((period) => (
    `${period.label}: ${formatSummaryWindow(period.startAt, period.endAt)}`
  )).join(', ') || 'None';
  const digitalRewards = [
    formData.digitalBadgeEnabled ? 'Badge' : '',
    formData.digitalCertificateEnabled ? 'Certificate' : '',
    formData.leaderboardRecognitionEnabled ? 'Leaderboard' : ''
  ].filter(Boolean).join(', ') || 'None';
  const physicalRewardItems = [
    formData.physicalRewardMedalEnabled ? 'Medal' : '',
    formData.physicalRewardShirtEnabled ? 'Shirt' : '',
    formData.physicalRewardPatchEnabled ? 'Patch' : '',
    formData.physicalRewardTowelEnabled ? 'Towel' : '',
    formData.physicalRewardFinisherKitEnabled ? 'Finisher kit' : '',
    ...(formData.physicalRewardOtherItems || []).map((item) => item.name).filter(Boolean)
  ].filter(Boolean);
  const mediaItems = [
    formData.logoUrl ? 'Logo' : '',
    formData.bannerImageUrl ? 'Banner' : '',
    formData.posterImageUrl ? 'Poster' : '',
    Array.isArray(formData.galleryImageUrls) && formData.galleryImageUrls.length ? `${formData.galleryImageUrls.length} gallery image(s)` : ''
  ].filter(Boolean);
  const waiverText = htmlToPlainText(formData.waiverTemplate || '');
  const detailsText = htmlToPlainText(formData.eventDetailsMarkdown || '');

  return [
    {
      title: 'Event',
      rows: [
        { label: 'Title', value: formData.title || 'Not set' },
        { label: 'Type', value: formData.eventType || 'Not set' },
        { label: 'Categories', value: categorySummary }
      ]
    },
    {
      title: 'Schedule',
      rows: [
        { label: 'Registration', value: formatSummaryWindow(formData.registrationOpenAt, formData.registrationCloseAt) },
        { label: 'Public Posting', value: formData.publicListingAvailableAt ? formatSummaryDate(formData.publicListingAvailableAt) : 'Immediately after approval' },
        { label: 'Event Window', value: formatSummaryWindow(formData.eventStartAt, formData.eventEndAt) },
        { label: 'Virtual', value: formatSummaryWindow(formData.virtualStartAt, formData.virtualEndAt) }
      ]
    },
    {
      title: 'Location / Virtual',
      rows: [
        { label: 'Venue', value: [formData.venueName, formData.city, formData.country].filter(Boolean).join(', ') || 'Not set' },
        { label: 'Completion', value: formData.virtualCompletionMode || 'Not set' },
        { label: 'Proof', value: (formData.proofTypesAllowed || []).join(', ') || 'Not set' }
      ]
    },
    {
      title: 'Pricing',
      rows: [
        { label: 'Mode', value: formData.feeMode === 'paid' ? formData.pricingMode : 'free' },
        { label: 'Options', value: pricingOptions },
        { label: 'Periods', value: pricingPeriodSummary }
      ]
    },
    {
      title: 'Payment',
      rows: [
        { label: 'Payee', value: formData.feeMode === 'paid' ? (formData.paymentAccountName || 'Not set') : 'Not required' },
        { label: 'QR', value: formData.feeMode === 'paid' ? (formData.paymentQrImageUrl ? 'Uploaded' : 'Missing') : 'Not required' },
        { label: 'Instructions', value: formData.paymentInstructions || 'Not set' }
      ]
    },
    {
      title: 'Rewards',
      rows: [
        { label: 'Digital', value: digitalRewards },
        { label: 'Physical', value: formData.physicalRewardsEnabled ? (physicalRewardItems.join(', ') || 'Enabled') : 'None' },
        { label: 'Delivery', value: formData.deliveryFeeEnabled ? `${formData.claimingMethod || 'delivery'} ${formatCurrencyAmount(formData.deliveryFeeAmount, currency) || ''}`.trim() : 'Not configured' }
      ]
    },
    {
      title: 'Content',
      rows: [
        { label: 'Details', value: detailsText ? `${detailsText.length} plain-text chars` : 'Not set' },
        { label: 'Waiver', value: waiverText ? `${waiverText.length} plain-text chars` : 'Not set' },
        { label: 'Media', value: mediaItems.join(', ') || 'None' }
      ]
    }
  ];
}

function getEventTypesAllowed(eventType) {
  if (eventType === 'virtual') return ['virtual'];
  if (eventType === 'onsite') return ['onsite'];
  if (eventType === 'hybrid') return ['virtual', 'onsite'];
  return [];
}

function applyEventFormData(event, formData, user) {
  const organiserNameFromUser = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const isVirtualMode = formData.eventType === 'virtual' || formData.eventType === 'hybrid';
  event.title = formData.title;
  event.organiserName = formData.organiserName || organiserNameFromUser || 'HelloRun Organizer';
  event.description = formData.description;
  event.eventDetailsMarkdown = formData.eventDetailsMarkdown || '';
  event.eventType = formData.eventType || undefined;
  event.eventTypesAllowed = getEventTypesAllowed(formData.eventType);
  event.raceDistances = formData.raceDistances;
  event.raceCategories = formData.raceCategories || [];
  event.registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
  event.registrationCloseAt = parseDateSafe(formData.registrationCloseAt);
  event.publicListingAvailableAt = parseDateSafe(formData.publicListingAvailableAt);
  if (formData.hasHomePromotionFields) {
    event.homeFeatured = Boolean(formData.homeFeatured);
    event.homeFeaturedRank = formData.homeFeaturedRank;
    event.homeFeaturedUntil = parseDateSafe(formData.homeFeaturedUntil);
  }
  event.eventStartAt = parseDateSafe(formData.eventStartAt);
  event.eventEndAt = parseDateSafe(formData.eventEndAt);
  event.venueName = formData.venueName || '';
  event.venueAddress = formData.venueAddress || '';
  event.city = formData.city || '';
  event.province = formData.province || '';
  event.country = formData.country || '';
  event.geo = formData.geoLat && formData.geoLng ? { lat: Number(formData.geoLat), lng: Number(formData.geoLng) } : undefined;
  event.virtualWindow = isVirtualMode && formData.virtualStartAt && formData.virtualEndAt
    ? { startAt: parseDateSafe(formData.virtualStartAt), endAt: parseDateSafe(formData.virtualEndAt) }
    : undefined;
  event.proofTypesAllowed = isVirtualMode ? formData.proofTypesAllowed : [];
  event.virtualCompletionMode = isVirtualMode ? formData.virtualCompletionMode : 'single_activity';
  event.targetDistanceKm = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? formData.targetDistanceKm : null;
  event.minimumActivityDistanceKm = null;
  event.acceptedRunTypes = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? formData.acceptedRunTypes : [];
  event.finalSubmissionDeadlineAt = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
    ? resolveFinalSubmissionDeadline(formData)
    : null;
  event.milestoneDistancesKm = [];
  event.recognitionMode = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? formData.recognitionMode : 'completion_only';
  event.leaderboardMode = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? formData.leaderboardMode : 'finishers';
  event.feeMode = formData.feeMode === 'paid' ? 'paid' : 'free';
  event.feeAmount = event.feeMode === 'paid' ? formData.feeAmount : null;
  event.feeCurrency = formData.feeCurrency || 'PHP';
  event.paymentQrImageUrl = formData.paymentQrImageUrl || '';
  event.paymentQrImageKey = formData.paymentQrImageKey || '';
  event.paymentAccountName = formData.paymentAccountName || '';
  event.paymentInstructions = formData.paymentInstructions || '';
  event.digitalBadgeEnabled = Boolean(formData.digitalBadgeEnabled);
  event.digitalCertificateEnabled = formData.digitalCertificateEnabled !== false;
  event.leaderboardRecognitionEnabled = formData.leaderboardRecognitionEnabled !== false;
  event.leaderboardSettings = normalizeLeaderboardSettings(formData.leaderboardSettings || {}, {
    virtualCompletionMode: event.virtualCompletionMode,
    leaderboardRecognitionEnabled: event.leaderboardRecognitionEnabled
  });
  event.physicalRewardsEnabled = Boolean(formData.physicalRewardsEnabled);
  event.physicalRewardMedalEnabled = event.physicalRewardsEnabled ? Boolean(formData.physicalRewardMedalEnabled) : false;
  event.physicalRewardMedalAmount = event.physicalRewardsEnabled && event.physicalRewardMedalEnabled ? formData.physicalRewardMedalAmount : null;
  event.physicalRewardShirtEnabled = event.physicalRewardsEnabled ? Boolean(formData.physicalRewardShirtEnabled) : false;
  event.physicalRewardShirtAmount = event.physicalRewardsEnabled && event.physicalRewardShirtEnabled ? formData.physicalRewardShirtAmount : null;
  event.physicalRewardPatchEnabled = event.physicalRewardsEnabled ? Boolean(formData.physicalRewardPatchEnabled) : false;
  event.physicalRewardPatchAmount = event.physicalRewardsEnabled && event.physicalRewardPatchEnabled ? formData.physicalRewardPatchAmount : null;
  event.physicalRewardTowelEnabled = event.physicalRewardsEnabled ? Boolean(formData.physicalRewardTowelEnabled) : false;
  event.physicalRewardTowelAmount = event.physicalRewardsEnabled && event.physicalRewardTowelEnabled ? formData.physicalRewardTowelAmount : null;
  event.physicalRewardFinisherKitEnabled = event.physicalRewardsEnabled ? Boolean(formData.physicalRewardFinisherKitEnabled) : false;
  event.physicalRewardFinisherKitAmount = event.physicalRewardsEnabled && event.physicalRewardFinisherKitEnabled ? formData.physicalRewardFinisherKitAmount : null;
  event.physicalRewardOtherItems = event.physicalRewardsEnabled ? formData.physicalRewardOtherItems || [] : [];
  event.physicalRewardsDescription = formData.physicalRewardsEnabled ? formData.physicalRewardsDescription || '' : '';
  event.physicalRewardsClaimingNotes = formData.physicalRewardsEnabled ? formData.physicalRewardsClaimingNotes || '' : '';
  event.pricingMode = formData.feeMode === 'free' ? 'free' : normalizePricingMode(formData.pricingMode, formData.feeMode);
  event.distancePricing = event.feeMode === 'paid' ? (formData.distancePricing || []) : [];
  event.pricingPeriods = event.feeMode === 'paid' && event.pricingMode === 'distance_based_period'
    ? (formData.pricingPeriods || []).map((period) => ({
      label: period.label,
      code: period.code,
      startAt: parseDateSafe(period.startAt),
      endAt: parseDateSafe(period.endAt)
    }))
    : [];
  event.customizedOptions = event.feeMode === 'paid' ? (formData.customizedOptions || []) : [];
  event.suggestedEventFee = calculateSuggestedEventFee(formData);
  event.finalEventFee = formData.finalEventFee !== null ? formData.finalEventFee : (event.suggestedEventFee || null);
  event.registrationPackages = formData.registrationPackages || [];
  event.deliveryFeeEnabled = Boolean(formData.deliveryFeeEnabled);
  event.deliveryFeeAmount = event.deliveryFeeEnabled ? formData.deliveryFeeAmount : null;
  event.deliveryFeeDescription = event.deliveryFeeEnabled ? formData.deliveryFeeDescription || '' : '';
  event.requiresDeliveryAddress = event.deliveryFeeEnabled ? Boolean(formData.requiresDeliveryAddress) : false;
  event.requiresPhilippineDeliveryAddress = event.deliveryFeeEnabled ? Boolean(formData.requiresPhilippineDeliveryAddress) : false;
  event.internationalRunnersAllowed = formData.internationalRunnersAllowed !== false;
  event.claimingMethod = normalizeClaimingMethod(formData.claimingMethod);
  event.specialRewardBenefits = formData.specialRewardBenefits || [];
  event.bannerImageUrl = formData.bannerImageUrl || '';
  event.logoUrl = formData.logoUrl || '';
  event.posterImageUrl = formData.posterImageUrl || '';
  event.galleryImageUrls = Array.isArray(formData.galleryImageUrls) ? formData.galleryImageUrls : [];

  const normalizedWaiverTemplate = sanitizeWaiverTemplate(formData.waiverTemplate);
  const previousWaiverTemplate = sanitizeWaiverTemplate(event.waiverTemplate || DEFAULT_WAIVER_TEMPLATE);
  if (previousWaiverTemplate !== normalizedWaiverTemplate) event.waiverVersion = Number(event.waiverVersion || 1) + 1;
  else if (!event.waiverVersion) event.waiverVersion = 1;
  event.waiverTemplate = normalizedWaiverTemplate;
}

function getPublishReadinessErrors(event) {
  const formData = getCreateEventFormDataFromEvent(event);
  formData.actionType = 'publish';
  const errors = validateCreateEventForm(formData);
  return Object.values(errors);
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(title) {
  const base = slugify(title) || 'event';
  let candidate = base;
  let counter = 2;
  while (await Event.exists({ slug: candidate })) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

module.exports = {
  countries,
  DEFAULT_WAIVER_TEMPLATE,
  MAX_GALLERY_IMAGES,
  applyEventFormData,
  formatDateForInput,
  generateUniqueSlug,
  getCreateEventFormData,
  getCreateEventFormDataFromEvent,
  getEventTypesAllowed,
  getEventReadinessChecklist,
  getEventReviewSummary,
  getPublishReadinessErrors,
  parseDateSafe,
  validateCreateEventForm,
  sanitizeWaiverTemplate
};
