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

function getZonedParts(value, timeZone = BUSINESS_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) || !isValidTimeZone(timeZone)) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
    return result;
  }, {});
  return parts;
}

function parseWallClock(value, timeZone = BUSINESS_TIME_ZONE) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?$/);
  if (!match || !isValidTimeZone(timeZone)) return null;
  const expected = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] || 0),
    minute: Number(match[5] || 0),
    second: Number(match[6] || 0)
  };
  const utcWallClock = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute, expected.second);
  const calendarCheck = new Date(utcWallClock);
  if (calendarCheck.getUTCFullYear() !== expected.year
    || calendarCheck.getUTCMonth() + 1 !== expected.month
    || calendarCheck.getUTCDate() !== expected.day
    || calendarCheck.getUTCHours() !== expected.hour
    || calendarCheck.getUTCMinutes() !== expected.minute
    || calendarCheck.getUTCSeconds() !== expected.second) return null;

  let instantMs = utcWallClock;
  // Resolve the zone offset from runtime IANA data. A second pass covers zones
  // whose offset differs between the initial UTC guess and the resolved instant.
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = getZonedParts(new Date(instantMs), timeZone);
    if (!parts) return null;
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    instantMs = utcWallClock - (representedAsUtc - instantMs);
  }
  const result = new Date(instantMs);
  const resolved = getZonedParts(result, timeZone);
  if (!resolved || Object.keys(expected).some((key) => resolved[key] !== expected[key])) return null;
  return result;
}

function parseExplicitInstant(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  const raw = String(value || '').trim();
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseBusinessDateTime(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  return parseExplicitInstant(value) || parseWallClock(value, BUSINESS_TIME_ZONE);
}

function formatDateTimeInput(value, timeZone = BUSINESS_TIME_ZONE) {
  const parts = getZonedParts(value, timeZone);
  if (!parts) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function buildCriticalTimeDisplay(value, runnerTimeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const runnerZone = normalizeTimeZone(runnerTimeZone) || BUSINESS_TIME_ZONE;
  const official = {
    timeZone: BUSINESS_TIME_ZONE,
    label: formatInTimeZone(date, BUSINESS_TIME_ZONE)
  };
  if (runnerZone === BUSINESS_TIME_ZONE) return { local: official, official, sameZone: true };
  return {
    local: { timeZone: runnerZone, label: formatInTimeZone(date, runnerZone) },
    official,
    sameZone: false
  };
}

function formatCriticalTime(value, runnerTimeZone) {
  const display = buildCriticalTimeDisplay(value, runnerTimeZone);
  if (!display) return '';
  const localText = `${display.local.label} (${display.local.timeZone})`;
  if (display.sameZone) return localText;
  return `${localText} · Official: ${display.official.label} (${display.official.timeZone})`;
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
  formatInTimeZone,
  parseWallClock,
  parseExplicitInstant,
  parseBusinessDateTime,
  formatDateTimeInput,
  buildCriticalTimeDisplay,
  formatCriticalTime
};
