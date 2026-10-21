const PLATFORM_TIME_ZONE = 'Asia/Manila';

const PLATFORM_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: PLATFORM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const PLATFORM_DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: PLATFORM_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

const UTC_DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

function getPlatformDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    throw new Error('Date is invalid.');
  }

  const parts = PLATFORM_DATE_FORMATTER.formatToParts(value).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseRunDateOnly(value) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error('Run date must be in YYYY-MM-DD format.');
  }

  const [year, month, day] = raw.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('Run date is invalid.');
  }

  return parsed;
}

function getDateOfBirthValidationError(value, { now = new Date() } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    parseRunDateOnly(raw);
  } catch (_) {
    return 'Enter a valid date of birth.';
  }
  return raw > getPlatformDateKey(now) ? 'Date of birth cannot be in the future.' : '';
}

// Birth dates are stored as UTC-midnight Dates for schema compatibility but remain
// calendar dates. Use UTC components for storage and the Manila calendar date for
// "today" so neither process timezone nor the UTC/Manila midnight boundary shifts age.
function calculateAgeFromDateOnly(value, { now = new Date() } = {}) {
  if (!value) return null;
  const birth = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const [todayYear, todayMonth, todayDay] = getPlatformDateKey(now).split('-').map(Number);
  const birthYear = birth.getUTCFullYear();
  const birthMonth = birth.getUTCMonth() + 1;
  const birthDay = birth.getUTCDate();
  let age = todayYear - birthYear;
  if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) age -= 1;
  return Number.isInteger(age) && age >= 0 && age <= 130 ? age : null;
}

function assertRunDateNotFuture(value, { now = new Date() } = {}) {
  const date = value instanceof Date ? value : parseRunDateOnly(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Run date is invalid.');
  }

  if (getPlatformDateKey(date) > getPlatformDateKey(now)) {
    throw new Error('Run date cannot be in the future.');
  }

  return date;
}

function formatPlatformDate(value, fallback = 'Date not listed') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  if (isUtcEndOfDayTimestamp(date)) {
    return UTC_DISPLAY_DATE_FORMATTER.format(date);
  }
  return PLATFORM_DISPLAY_DATE_FORMATTER.format(date);
}

function isUtcEndOfDayTimestamp(date) {
  return date.getUTCHours() === 23 && date.getUTCMinutes() >= 55;
}

module.exports = {
  PLATFORM_TIME_ZONE,
  calculateAgeFromDateOnly,
  formatPlatformDate,
  getDateOfBirthValidationError,
  getPlatformDateKey,
  parseRunDateOnly,
  assertRunDateNotFuture
};
