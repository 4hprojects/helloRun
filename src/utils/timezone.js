'use strict';

const BUSINESS_TIME_ZONE = 'Asia/Manila';
const DEFAULT_LOCALE = 'en-PH';

const FALLBACK_TIME_ZONES = [
  BUSINESS_TIME_ZONE,
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Pacific/Auckland',
  'Pacific/Honolulu'
];

function isValidTimeZone(value) {
  const timeZone = String(value || '').trim();
  if (!timeZone || !timeZone.includes('/')) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(0);
    return true;
  } catch (_) {
    return false;
  }
}

function normalizeTimeZone(value) {
  const timeZone = String(value || '').trim();
  return isValidTimeZone(timeZone) ? timeZone : '';
}

function getSupportedTimeZones() {
  const supported = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : FALLBACK_TIME_ZONES;
  return Array.from(new Set([BUSINESS_TIME_ZONE, ...supported])).sort((a, b) => a.localeCompare(b));
}

function suggestTimeZoneForCountry(countryCode) {
  return String(countryCode || '').trim().toUpperCase() === 'PH' ? BUSINESS_TIME_ZONE : '';
}

function formatInTimeZone(value, timeZone, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const normalizedZone = normalizeTimeZone(timeZone) || BUSINESS_TIME_ZONE;
  const { locale = DEFAULT_LOCALE, ...formatOptions } = options;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...formatOptions,
    timeZone: normalizedZone
  }).format(date);
}

module.exports = {
  BUSINESS_TIME_ZONE,
  DEFAULT_LOCALE,
  isValidTimeZone,
  normalizeTimeZone,
  getSupportedTimeZones,
  suggestTimeZoneForCountry,
  formatInTimeZone
};
