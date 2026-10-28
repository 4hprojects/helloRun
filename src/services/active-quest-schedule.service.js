const { parseWallClock } = require('../utils/timezone');
const { ACTIVE_QUEST_TIMEZONE } = require('../config/active-quest');

const DATE_FORMATTER = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

function buildActiveQuestSchedule({ year, month, scheduleDefaults }) {
  const safeYear = Number(year);
  const safeMonth = Number(month);
  if (!Number.isInteger(safeYear) || safeYear < 2000 || safeYear > 3000) {
    throw new Error('Active Quest year must be an integer from 2000 through 3000.');
  }
  if (!Number.isInteger(safeMonth) || safeMonth < 1 || safeMonth > 12) {
    throw new Error('Active Quest month must be an integer from 1 through 12.');
  }

  const defaults = normalizeScheduleDefaults(scheduleDefaults);
  const activityStartLocal = calendarDate(safeYear, safeMonth, 1);
  const activityEndLocalExclusive = addMonths(activityStartLocal, 1);
  const registrationOpenLocal = addDays(activityStartLocal, -defaults.registrationLeadDays);
  const registrationEndLocalExclusive = calendarDate(safeYear, safeMonth, defaults.registrationCloseDay + 1);
  const submissionEndLocalExclusive = replaceDay(addMonths(activityStartLocal, 1), defaults.proofCloseDayNextMonth + 1);
  const reviewTargetLocal = replaceDay(addMonths(activityStartLocal, 1), 17);
  const rewardReleaseTargetLocal = replaceDay(addMonths(activityStartLocal, 1), 18);

  const local = {
    activityStart: activityStartLocal,
    activityEndExclusive: activityEndLocalExclusive,
    registrationOpen: registrationOpenLocal,
    registrationEndExclusive: registrationEndLocalExclusive,
    submissionEndExclusive: submissionEndLocalExclusive,
    reviewTarget: reviewTargetLocal,
    rewardReleaseTarget: rewardReleaseTargetLocal
  };
  const instants = Object.fromEntries(Object.entries(local).map(([key, value]) => [key, toPhtMidnight(value)]));

  return Object.freeze({
    timezone: ACTIVE_QUEST_TIMEZONE,
    boundaryMode: 'half_open',
    local: Object.freeze(local),
    instants: Object.freeze(instants),
    display: Object.freeze({
      activityStart: formatLocalDate(activityStartLocal),
      activityEndInclusive: formatLocalDate(addDays(activityEndLocalExclusive, -1)),
      registrationOpen: formatLocalDate(registrationOpenLocal),
      registrationEndInclusive: formatLocalDate(addDays(registrationEndLocalExclusive, -1)),
      submissionEndInclusive: formatLocalDate(addDays(submissionEndLocalExclusive, -1)),
      reviewTarget: formatLocalDate(reviewTargetLocal),
      rewardReleaseTarget: formatLocalDate(rewardReleaseTargetLocal)
    })
  });
}

function normalizeScheduleDefaults(input = {}) {
  const values = {
    registrationLeadDays: Number(input.registrationLeadDays ?? 7),
    registrationCloseDay: Number(input.registrationCloseDay ?? 22),
    proofCloseDayNextMonth: Number(input.proofCloseDayNextMonth ?? 14)
  };
  if (!Number.isInteger(values.registrationLeadDays) || values.registrationLeadDays < 1 || values.registrationLeadDays > 31) {
    throw new Error('Registration lead days must be an integer from 1 through 31.');
  }
  if (!Number.isInteger(values.registrationCloseDay) || values.registrationCloseDay < 1 || values.registrationCloseDay > 28) {
    throw new Error('Registration close day must be an integer from 1 through 28.');
  }
  if (!Number.isInteger(values.proofCloseDayNextMonth) || values.proofCloseDayNextMonth < 1 || values.proofCloseDayNextMonth > 28) {
    throw new Error('Proof close day must be an integer from 1 through 28.');
  }
  return values;
}

function calendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(localDate, days) {
  const date = parseLocalDate(localDate);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return calendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function addMonths(localDate, months) {
  const date = parseLocalDate(localDate);
  return calendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1 + Number(months), 1);
}

function replaceDay(localDate, day) {
  const date = parseLocalDate(localDate);
  return calendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, Number(day));
}

function parseLocalDate(localDate) {
  const match = String(localDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Local date must use YYYY-MM-DD.');
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function toPhtMidnight(localDate) {
  const instant = parseWallClock(`${localDate}T00:00:00`, ACTIVE_QUEST_TIMEZONE);
  if (!instant) throw new Error(`Could not convert ${localDate} midnight in ${ACTIVE_QUEST_TIMEZONE}.`);
  return instant;
}

function formatLocalDate(localDate) {
  return DATE_FORMATTER.format(parseLocalDate(localDate));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

module.exports = {
  addDays,
  buildActiveQuestSchedule,
  formatLocalDate
};
