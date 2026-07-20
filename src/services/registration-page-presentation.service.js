'use strict';

const { formatPlatformDate, PLATFORM_TIME_ZONE } = require('../utils/platform-date');
const { getCountryName } = require('../utils/country');
const { resolveRegistrationPrice } = require('./registration-price.service');

function buildRegistrationPagePresentation({
  event = {},
  formData = {},
  profileSnapshot = {},
  allowedModes = [],
  allowedRaceDistances = [],
  raceCategoryOptions = [],
  raceDistancePricingPreview = {},
  customizedRegistrationOptions = [],
  registrationPackageOptions = [],
  registrationAddOns = [],
  profileCompleteness = null,
  existingRegistration = null
} = {}) {
  const currency = String(event.feeCurrency || 'PHP').trim().toUpperCase() || 'PHP';
  const modes = buildModeChoices(allowedModes, formData.participationMode);
  const distances = buildDistanceChoices({
    allowedRaceDistances,
    raceCategoryOptions,
    raceDistancePricingPreview,
    selectedValue: formData.raceDistance,
    isFree: String(event.feeMode || '').trim() !== 'paid'
  });
  const profile = buildProfilePresentation(profileSnapshot, profileCompleteness);
  const reviewData = buildReviewData({
    event,
    formData,
    modes,
    distances,
    customizedRegistrationOptions,
    registrationPackageOptions,
    registrationAddOns,
    profile
  });

  return {
    event: {
      title: String(event.title || 'Event').trim(),
      slug: String(event.slug || '').trim(),
      formatLabel: buildFormatLabel(event, allowedModes),
      registrationCloseLabel: formatPlatformDate(event.registrationCloseAt),
      activityWindowLabel: formatDateRange(event.virtualWindow?.startAt || event.eventStartAt, event.virtualWindow?.endAt || event.eventEndAt),
      submissionDeadlineLabel: formatPlatformDate(event.finalSubmissionDeadlineAt || event.eventEndAt),
      locationLabel: buildLocationLabel(event, allowedModes),
      timeZoneLabel: PLATFORM_TIME_ZONE
    },
    modes: {
      kind: getChoiceControlKind(modes.length),
      items: modes
    },
    distances: {
      kind: 'select',
      items: distances
    },
    profile,
    expectedSignatureName: profile.fullName,
    reviewData,
    existing: existingRegistration
      ? buildExistingRegistrationPresentation(existingRegistration, event)
      : null,
    currency
  };
}

function buildModeChoices(values = [], selectedValue = '') {
  return (Array.isArray(values) ? values : []).map((value) => {
    const normalized = String(value || '').trim();
    const lower = normalized.toLowerCase();
    return {
      value: normalized,
      label: lower === 'onsite' ? 'Onsite' : lower === 'virtual' ? 'Virtual' : titleCase(normalized),
      helper: lower === 'onsite'
        ? 'Attend the configured event venue and schedule.'
        : lower === 'virtual'
          ? 'Complete an allowed activity within the event window.'
          : '',
      selected: normalized === String(selectedValue || '').trim()
    };
  });
}

function buildDistanceChoices({
  allowedRaceDistances = [],
  raceCategoryOptions = [],
  raceDistancePricingPreview = {},
  selectedValue = '',
  isFree = false
} = {}) {
  const categories = Array.isArray(raceCategoryOptions) ? raceCategoryOptions : [];
  return (Array.isArray(allowedRaceDistances) ? allowedRaceDistances : [])
    .map((value) => {
      const normalized = String(value || '').trim().toUpperCase();
      const category = categories.find((item) => {
        return String(item.distanceLabel || item.name || '').trim().toUpperCase() === normalized;
      });
      const distanceKm = parseDistanceKm(category?.distanceLabel || category?.name || normalized);
      const title = String(category?.name || normalized).trim();
      const price = raceDistancePricingPreview[normalized] || null;
      return {
        value: normalized,
        title,
        helper: distanceKm !== null && title.toUpperCase() !== `${distanceKm}K`
          ? `${formatNumber(distanceKm)} km goal`
          : '',
        priceLabel: isFree ? 'Free' : String(price?.amountLabel || '').trim(),
        priceHelper: String(price?.pricingPeriodLabel || price?.helper || '').trim(),
        available: !price || price.ok !== false,
        selected: normalized === String(selectedValue || '').trim().toUpperCase(),
        sortDistance: distanceKm
      };
    })
    .sort((left, right) => {
      if (left.sortDistance !== null && right.sortDistance !== null) return right.sortDistance - left.sortDistance;
      if (left.sortDistance !== null) return -1;
      if (right.sortDistance !== null) return 1;
      return left.title.localeCompare(right.title, undefined, { numeric: true, sensitivity: 'base' });
    });
}

function buildProfilePresentation(snapshot = {}, completeness = null) {
  const fullName = [snapshot.firstName, snapshot.lastName].map((value) => String(value || '').trim()).filter(Boolean).join(' ');
  const fields = [
    { key: 'name', label: 'Name', value: fullName || 'Not set', required: true },
    { key: 'email', label: 'Email', value: String(snapshot.email || '').trim() || 'Not set', required: true },
    { key: 'mobile', label: 'Mobile', value: String(snapshot.mobile || '').trim() || 'Not set', required: false },
    { key: 'country', label: 'Country', value: getCountryName(String(snapshot.country || '').trim()) || 'Not set', required: false },
    { key: 'age', label: 'Age', value: formatAge(snapshot.dateOfBirth), required: false },
    { key: 'gender', label: 'Gender', value: formatGender(snapshot.gender), required: false },
    {
      key: 'emergencyContact',
      label: 'Emergency contact',
      value: snapshot.emergencyContactName && snapshot.emergencyContactNumber
        ? `${snapshot.emergencyContactName} (${snapshot.emergencyContactNumber})`
        : 'Not set',
      required: false
    },
    {
      key: 'runningGroups',
      label: 'Running groups',
      value: Array.isArray(snapshot.runningGroups) && snapshot.runningGroups.length
        ? snapshot.runningGroups.join(', ')
        : String(snapshot.runningGroup || '').trim() || 'Not set',
      required: false
    }
  ];
  const requiredComplete = fields.filter((field) => field.required).every((field) => field.value !== 'Not set');
  const completedCount = Number(completeness?.completedCount || 0);
  const requiredCount = Number(completeness?.requiredCount || 0);
  const percent = Number.isFinite(Number(completeness?.percent)) ? Number(completeness.percent) : 0;
  return {
    fullName,
    fields,
    requiredComplete,
    completion: {
      percent: Math.max(0, Math.min(100, percent)),
      completedCount: Math.max(0, completedCount),
      requiredCount: Math.max(0, requiredCount),
      missingFields: Array.isArray(completeness?.missingFields) ? completeness.missingFields : []
    }
  };
}

function buildReviewData({
  event,
  formData,
  modes,
  distances,
  customizedRegistrationOptions,
  registrationPackageOptions,
  registrationAddOns,
  profile
}) {
  const selectedAddOnIds = new Set(Array.isArray(formData.addOnProductIds) ? formData.addOnProductIds.map(String) : []);
  const resolved = resolveRegistrationPrice(event, formData);
  return {
    eventTitle: String(event.title || 'Event').trim(),
    feeMode: String(event.feeMode || 'free').trim(),
    pricingMode: String(event.pricingMode || 'free').trim(),
    currency: String(event.feeCurrency || 'PHP').trim().toUpperCase() || 'PHP',
    expectedSignatureName: profile.fullName,
    profileName: profile.fullName || 'Not set',
    modes: modes.map(({ value, label }) => ({ value, label })),
    distances: distances.map(({ value, title, helper, priceLabel, available }) => ({ value, title, helper, priceLabel, available })),
    customizedOptions: (Array.isArray(customizedRegistrationOptions) ? customizedRegistrationOptions : []).map((option) => ({
      id: String(option.id || ''),
      label: String(option.shortDescription || '').trim(),
      amount: safeAmount(option.amount),
      currency: String(option.currency || event.feeCurrency || 'PHP').trim().toUpperCase()
    })),
    packages: (Array.isArray(registrationPackageOptions) ? registrationPackageOptions : []).map((option) => ({
      id: String(option.id || ''),
      label: String(option.name || '').trim(),
      amount: option.currentAmount === null ? null : safeAmount(option.currentAmount),
      amountLabel: String(option.currentAmountLabel || '').trim(),
      periodLabel: String(option.currentPricingPeriodLabel || '').trim(),
      includedItems: Array.isArray(option.includedItems) ? option.includedItems : [],
      available: option.isAvailableNow !== false
    })),
    addOns: (Array.isArray(registrationAddOns) ? registrationAddOns : []).map((item) => ({
      id: String(item.id || ''),
      label: String(item.name || '').trim(),
      amount: safeAmount(item.basePrice),
      currency: String(item.currency || event.feeCurrency || 'PHP').trim().toUpperCase(),
      selected: selectedAddOnIds.has(String(item.id || ''))
    })),
    initialRegistrationAmount: resolved.ok ? safeAmount(resolved.amount) : 0,
    initialRegistrationLabel: resolved.ok ? String(resolved.label || '').trim() : '',
    distancePricing: Object.fromEntries(distances.map((item) => {
      const distancePrice = resolveRegistrationPrice(event, { raceDistance: item.value });
      return [item.value, {
        amount: distancePrice.ok ? safeAmount(distancePrice.amount) : null,
        amountLabel: item.priceLabel,
        available: item.available && distancePrice.ok
      }];
    }))
  };
}

function buildExistingRegistrationPresentation(registration = {}, event = {}) {
  const registrationAmount = safeAmount(registration.paymentAmountDue || registration.pricingSnapshot?.amount);
  const addOnsAmount = safeAmount(registration.addOnsSubtotal);
  const totalAmount = registrationAmount + addOnsAmount;
  const currency = String(registration.paymentCurrency || registration.addOnsCurrency || event.feeCurrency || 'PHP').trim().toUpperCase() || 'PHP';
  const requiresPayment = totalAmount > 0 && !['paid', 'refunded'].includes(String(registration.paymentStatus || '').trim());
  return {
    registrationAmount,
    registrationAmountLabel: formatCurrency(registrationAmount, currency),
    addOnsAmount,
    addOnsAmountLabel: formatCurrency(addOnsAmount, currency),
    totalAmount,
    totalAmountLabel: totalAmount > 0 ? formatCurrency(totalAmount, currency) : 'Free',
    currency,
    paymentStatusLabel: humanize(registration.paymentStatus || 'unpaid'),
    statusLabel: humanize(registration.status || 'confirmed'),
    nextAction: requiresPayment
      ? { href: '/my-registrations', label: 'Continue to payment' }
      : { href: `/events/${event.slug || ''}`, label: 'View event' }
  };
}

function getChoiceControlKind(count) {
  if (count <= 1) return 'fixed';
  if (count <= 8) return 'cards';
  return 'select';
}

function buildFormatLabel(event = {}, allowedModes = []) {
  const completion = String(event.virtualCompletionMode || '').trim();
  if (completion === 'accumulated_distance') return 'Accumulated-distance challenge';
  if (completion === 'single_activity') return 'Single-activity event';
  const modes = (Array.isArray(allowedModes) ? allowedModes : []).map((mode) => String(mode || '').toLowerCase());
  if (modes.length > 1) return 'Hybrid event';
  if (modes[0] === 'onsite') return 'Onsite event';
  return 'Virtual event';
}

function buildLocationLabel(event = {}, allowedModes = []) {
  const modes = (Array.isArray(allowedModes) ? allowedModes : []).map((mode) => String(mode || '').toLowerCase());
  if (modes.length === 1 && modes[0] === 'virtual') return 'Virtual participation';
  const location = [event.venueName, event.city, event.country].map((value) => String(value || '').trim()).filter(Boolean).join(', ');
  if (location) return location;
  return modes.includes('onsite') ? 'See event details for venue information' : 'Virtual participation';
}

function formatDateRange(startValue, endValue) {
  const start = formatPlatformDate(startValue);
  const end = formatPlatformDate(endValue);
  return start === end ? start : `${start} – ${end}`;
}

function parseDistanceKm(value) {
  const match = String(value || '').trim().match(/^(\d+(?:\.\d+)?)\s*(?:K|KM)\b/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatCurrency(amount, currency = 'PHP') {
  return `${currency} ${safeAmount(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatAge(value) {
  if (!value) return 'Not set';
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return 'Not set';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return Number.isInteger(age) && age >= 0 && age <= 130 ? String(age) : 'Not set';
}

function formatGender(value) {
  const labels = {
    male: 'Male',
    female: 'Female',
    non_binary: 'Non-binary',
    prefer_not_to_say: 'Prefer not to say'
  };
  return labels[String(value || '').trim()] || 'Not set';
}

function titleCase(value) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function humanize(value) {
  return titleCase(String(value || '').trim());
}

module.exports = {
  buildRegistrationPagePresentation,
  buildDistanceChoices,
  getChoiceControlKind,
  parseDistanceKm
};
