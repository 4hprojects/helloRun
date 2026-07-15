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

function getTimeZoneOffsetMinutes(timeZone, date = new Date()) {
  if (!isValidTimeZone(timeZone)) return null;
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset'
    }).formatToParts(date).find((item) => item.type === 'timeZoneName');
    const label = String(part?.value || '');
    if (label === 'GMT' || label === 'UTC') return 0;
    const match = label.match(/^(?:GMT|UTC)([+-])(\d{2}):(\d{2})$/);
    if (!match) return null;
    const minutes = Number(match[2]) * 60 + Number(match[3]);
    return match[1] === '-' ? -minutes : minutes;
  } catch (_) {
    return null;
  }
}

function formatUtcOffset(offsetMinutes) {
  if (!Number.isFinite(offsetMinutes)) return '';
  const sign = offsetMinutes < 0 ? '−' : '+';
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
}

function getTimeZoneCityLabel(timeZone) {
  const segments = String(timeZone || '').split('/');
  return String(segments[segments.length - 1] || timeZone || '').replace(/_/g, ' ');
}

function getTimeZoneOptions(date = new Date()) {
  return getSupportedTimeZones()
    .map((timeZone) => {
      const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, date);
      const city = getTimeZoneCityLabel(timeZone);
      return {
        value: timeZone,
        city,
        offsetMinutes,
        label: offsetMinutes == null ? timeZone : `${formatUtcOffset(offsetMinutes)} — ${city}`
      };
    })
    .filter((option) => isValidTimeZone(option.value))
    .sort((left, right) => {
      if (left.offsetMinutes == null && right.offsetMinutes != null) return 1;
      if (left.offsetMinutes != null && right.offsetMinutes == null) return -1;
      if (left.offsetMinutes !== right.offsetMinutes) return left.offsetMinutes - right.offsetMinutes;
      return left.city.localeCompare(right.city);
    });
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
  getTimeZoneOffsetMinutes,
  formatUtcOffset,
  getTimeZoneCityLabel,
  getTimeZoneOptions,
  suggestTimeZoneForCountry,
  formatInTimeZone
};
