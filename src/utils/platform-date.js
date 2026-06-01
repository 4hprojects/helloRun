const PLATFORM_TIME_ZONE = 'Asia/Manila';

const PLATFORM_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: PLATFORM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
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

module.exports = {
  PLATFORM_TIME_ZONE,
  getPlatformDateKey,
  parseRunDateOnly,
  assertRunDateNotFuture
};
