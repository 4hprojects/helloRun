const Event = require('../models/Event');
const { getCountries, isValidCountryCode, normalizeCountryCode } = require('../utils/country');
const { DEFAULT_WAIVER_TEMPLATE, normalizeWaiverTemplate } = require('../utils/waiver');
const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const countries = getCountries();
const RACE_DISTANCE_PRESETS = new Set(['3K', '5K', '10K', '21K']);
const MAX_GALLERY_IMAGES = 12;
const VIRTUAL_COMPLETION_MODES = new Set(['single_activity', 'accumulated_distance']);
const ACCEPTED_RUN_TYPES = new Set(['run', 'walk', 'hike', 'trail_run']);
const RECOGNITION_MODES = new Set(['completion_only', 'completion_with_optional_ranking']);
const LEADERBOARD_MODES = new Set(['finishers', 'top_distance', 'finishers_and_top_distance']);
const FEE_MODES = new Set(['free', 'paid']);
const PRICING_MODES = new Set(['free', 'same_fee', 'package_period', 'per_distance', 'per_distance_period']);
const V1_PRICING_MODES = new Set(['free', 'same_fee', 'package_period']);
const CLAIMING_METHODS = new Set(['delivery', 'pickup', 'both']);
const PRICING_PERIOD_CODES = new Set(['early_bird', 'regular', 'late', 'custom']);
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
  return raw.replace(/\s+/g, '');
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

function normalizeGalleryImageUrls(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_GALLERY_IMAGES);
}

function normalizeProofTypes(value) {
  const allowed = new Set(['gps', 'photo', 'manual']);
  return normalizeToArray(value).map((item) => String(item || '').trim()).filter((item) => allowed.has(item));
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

function hasOwnValue(body, key) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

function normalizeBoolean(value) {
  if (Array.isArray(value)) return normalizeBoolean(value[value.length - 1]);
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function normalizeCurrency(value) {
  const normalized = String(value || 'PHP').trim().toUpperCase().replace(/[^A-Z]/g, '');
  return normalized.slice(0, 3) || 'PHP';
}

function normalizePricingMode(value, feeMode = 'free') {
  const fallback = feeMode === 'paid' ? 'same_fee' : 'free';
  const normalized = normalizeModeValue(value, PRICING_MODES, fallback);
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

function normalizeRegistrationPackages(body = {}) {
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
    packages.push({ name, includedItems, pricingPeriods, notes: note });
  }
  return packages.slice(0, 10);
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
    leaderboardMode: 'finishers_and_top_distance'
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
  const match = value.match(/^(\d+(?:\.\d+)?)(K|KM)$/);
  if (!match) return null;
  const distance = Number(match[1]);
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

function inferTargetDistanceKm(raceDistances = []) {
  const targets = Array.from(new Set((raceDistances || []).map(parseRaceDistanceKm).filter((item) => item !== null)));
  return targets.length === 1 ? targets[0] : null;
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
  body = getDefaultedCreateEventBody(body);
  const raceDistances = normalizeRaceDistances(body);
  const targetDistanceKm = parseOptionalPositiveNumber(body.targetDistanceKm) ?? inferTargetDistanceKm(raceDistances);
  const galleryImageUrls = normalizeGalleryImageUrls(body.galleryImageUrlsText || body.galleryImageUrls);
  const waiverTemplateRaw = body.waiverTemplate || DEFAULT_WAIVER_TEMPLATE;
  const feeMode = normalizeModeValue(body.feeMode, FEE_MODES, 'free');
  const physicalRewardsEnabled = normalizeBoolean(body.physicalRewardsEnabled);
  const pricingMode = normalizePricingMode(body.pricingMode, feeMode);
  const registrationPackages = normalizeRegistrationPackages(body);
  const physicalRewardOtherItems = normalizeOtherItems(body.physicalRewardOtherItemName, body.physicalRewardOtherItemAmount);
  const deliveryFeeEnabled = normalizeBoolean(body.deliveryFeeEnabled);
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
    targetDistanceKm,
    minimumActivityDistanceKm: parseOptionalPositiveNumber(body.minimumActivityDistanceKm),
    acceptedRunTypes: normalizeRunTypes(body.acceptedRunTypes),
    finalSubmissionDeadlineAt: body.finalSubmissionDeadlineAt || '',
    milestoneDistancesKm: normalizeMilestoneDistances(body.milestoneDistancesKm),
    milestoneDistancesText: normalizeMilestoneDistances(body.milestoneDistancesKm).join(', '),
    recognitionMode: normalizeModeValue(body.recognitionMode, RECOGNITION_MODES, 'completion_with_optional_ranking'),
    leaderboardMode: normalizeModeValue(body.leaderboardMode, LEADERBOARD_MODES, 'finishers_and_top_distance'),
    raceDistances,
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
    leaderboardRecognitionEnabled: isDefaultCreateBody ? normalizeBoolean(body.leaderboardRecognitionEnabled) : normalizeBoolean(body.leaderboardRecognitionEnabled),
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
  const raceDistancePresets = normalizedEventDistances.filter((item) => RACE_DISTANCE_PRESETS.has(item));
  const raceDistanceCustom = normalizedEventDistances.filter((item) => !RACE_DISTANCE_PRESETS.has(item)).join(', ');
  const registrationPackages = (Array.isArray(event.registrationPackages) ? event.registrationPackages : []).map((packageOption) => ({
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

  return {
    title: event.title || '',
    organiserName: event.organiserName || '',
    description: event.description || '',
    eventDetailsMarkdown: event.eventDetailsMarkdown || '',
    eventType: event.eventType || '',
    registrationOpenAt: formatDateForInput(event.registrationOpenAt),
    registrationCloseAt: formatDateForInput(event.registrationCloseAt),
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
    proofTypesAllowed: Array.isArray(event.proofTypesAllowed) ? event.proofTypesAllowed : [],
    virtualCompletionMode: normalizeVirtualCompletionMode(event.virtualCompletionMode),
    targetDistanceKm: Number.isFinite(event.targetDistanceKm) ? event.targetDistanceKm : null,
    minimumActivityDistanceKm: Number.isFinite(event.minimumActivityDistanceKm) ? event.minimumActivityDistanceKm : null,
    acceptedRunTypes: Array.isArray(event.acceptedRunTypes) ? event.acceptedRunTypes : [],
    finalSubmissionDeadlineAt: formatDateForInput(event.finalSubmissionDeadlineAt),
    milestoneDistancesKm: Array.isArray(event.milestoneDistancesKm) ? event.milestoneDistancesKm : [],
    milestoneDistancesText: (Array.isArray(event.milestoneDistancesKm) ? event.milestoneDistancesKm : []).join(', '),
    recognitionMode: normalizeModeValue(event.recognitionMode, RECOGNITION_MODES, 'completion_only'),
    leaderboardMode: normalizeModeValue(event.leaderboardMode, LEADERBOARD_MODES, 'finishers'),
    raceDistances: normalizedEventDistances,
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

  for (const field of ['registrationOpenAt', 'registrationCloseAt', 'eventStartAt', 'eventEndAt', 'virtualStartAt', 'virtualEndAt', 'finalSubmissionDeadlineAt']) {
    if (formData[field] && !parseDateSafe(formData[field])) errors[field] = 'Invalid date format.';
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

  if (formData.targetDistanceKm !== null && (!Number.isFinite(formData.targetDistanceKm) || formData.targetDistanceKm <= 0)) {
    errors.targetDistanceKm = 'Target distance must be greater than 0.';
  }
  if (formData.feeMode === 'paid') {
    if (formData.feeAmount !== null && (!Number.isFinite(formData.feeAmount) || formData.feeAmount <= 0)) {
      errors.feeAmount = 'Paid events must use an amount greater than 0.';
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

function validateOrganizerSetupFields(formData, errors) {
  if (!V1_PRICING_MODES.has(formData.pricingMode)) {
    errors.pricingMode = 'Select a valid V1 pricing mode.';
  }
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
  for (const [packageIndex, packageOption] of (formData.registrationPackages || []).entries()) {
    if (!packageOption.name) errors[`registrationPackageName${packageIndex}`] = 'Package name is required when package details are entered.';
    for (const [periodIndex, period] of (packageOption.pricingPeriods || []).entries()) {
      validatePricingPeriod(period, `registrationPackage${packageIndex}PricingPeriod${periodIndex}`, errors);
    }
  }
  for (const [benefitIndex, benefit] of (formData.specialRewardBenefits || []).entries()) {
    if (!benefit.title) errors[`specialRewardBenefitTitle${benefitIndex}`] = 'Benefit title is required when benefit details are entered.';
    if (benefit.validUntil && !parseDateSafe(benefit.validUntil)) {
      errors[`specialRewardBenefitValidUntil${benefitIndex}`] = 'Invalid date format.';
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
    if (!Number.isFinite(formData.feeAmount) || formData.feeAmount <= 0) {
      errors.feeAmount = 'Fee amount is required for paid events.';
    }
    if (!formData.paymentQrImageUrl) {
      errors.paymentQrImageUrl = 'Payment QR image is required before submitting a paid event for review.';
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
  const eventStartAt = parseDateSafe(formData.eventStartAt);
  const eventEndAt = parseDateSafe(formData.eventEndAt);
  if (registrationOpenAt && registrationCloseAt && registrationOpenAt >= registrationCloseAt) {
    errors.registrationCloseAt = 'Registration close must be after registration open.';
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
        errors.targetDistanceKm = 'Target distance is required for accumulated-distance events.';
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
  const waiverText = htmlToPlainText(formData.waiverTemplate || '');
  if (!waiverText || waiverText.length < 200) errors.waiverTemplate = 'Waiver template must be at least 200 characters.';
  else if ((formData.waiverTemplate || '').length > 20000) errors.waiverTemplate = 'Waiver template must be 20,000 characters or less.';

  return errors;
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
  event.organiserName = formData.organiserName || organiserNameFromUser || 'helloRun Organizer';
  event.description = formData.description;
  event.eventDetailsMarkdown = formData.eventDetailsMarkdown || '';
  event.eventType = formData.eventType || undefined;
  event.eventTypesAllowed = getEventTypesAllowed(formData.eventType);
  event.raceDistances = formData.raceDistances;
  event.registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
  event.registrationCloseAt = parseDateSafe(formData.registrationCloseAt);
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
  getPublishReadinessErrors,
  parseDateSafe,
  validateCreateEventForm,
  sanitizeWaiverTemplate
};
