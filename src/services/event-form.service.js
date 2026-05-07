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
  return normalizeModeValue(value, VIRTUAL_COMPLETION_MODES, 'single_activity');
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

function normalizeMilestoneDistances(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => Number(String(item || '').trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .slice(0, 20);
}

function sanitizeWaiverTemplate(value) {
  const normalizedTemplate = normalizeWaiverTemplate(value);
  if (!normalizedTemplate) return '';
  return normalizeWaiverTemplate(sanitizeHtml(normalizedTemplate, WAIVER_SANITIZE_OPTIONS));
}

function getCreateEventFormData(body = {}) {
  const raceDistances = normalizeRaceDistances(body);
  const galleryImageUrls = normalizeGalleryImageUrls(body.galleryImageUrlsText || body.galleryImageUrls);
  const waiverTemplateRaw = body.waiverTemplate || DEFAULT_WAIVER_TEMPLATE;

  return {
    title: String(body.title || '').trim(),
    organiserName: String(body.organiserName || '').trim(),
    description: String(body.description || '').trim(),
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
    targetDistanceKm: parseOptionalPositiveNumber(body.targetDistanceKm),
    minimumActivityDistanceKm: parseOptionalPositiveNumber(body.minimumActivityDistanceKm),
    acceptedRunTypes: normalizeRunTypes(body.acceptedRunTypes),
    finalSubmissionDeadlineAt: body.finalSubmissionDeadlineAt || '',
    milestoneDistancesKm: normalizeMilestoneDistances(body.milestoneDistancesKm),
    milestoneDistancesText: normalizeMilestoneDistances(body.milestoneDistancesKm).join(', '),
    recognitionMode: normalizeModeValue(body.recognitionMode, RECOGNITION_MODES, 'completion_only'),
    leaderboardMode: normalizeModeValue(body.leaderboardMode, LEADERBOARD_MODES, 'finishers'),
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

  return {
    title: event.title || '',
    organiserName: event.organiserName || '',
    description: event.description || '',
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
  if (formData.minimumActivityDistanceKm !== null && (!Number.isFinite(formData.minimumActivityDistanceKm) || formData.minimumActivityDistanceKm <= 0)) {
    errors.minimumActivityDistanceKm = 'Minimum activity distance must be greater than 0.';
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
      errors.virtualCompletionMode = 'Accumulated virtual runs can be saved as drafts, but cannot be published until activity-level progress tracking is implemented.';
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
  event.minimumActivityDistanceKm = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? formData.minimumActivityDistanceKm : null;
  event.acceptedRunTypes = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? formData.acceptedRunTypes : [];
  event.finalSubmissionDeadlineAt = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? parseDateSafe(formData.finalSubmissionDeadlineAt) : null;
  event.milestoneDistancesKm = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? formData.milestoneDistancesKm : [];
  event.recognitionMode = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? formData.recognitionMode : 'completion_only';
  event.leaderboardMode = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance' ? formData.leaderboardMode : 'finishers';
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
