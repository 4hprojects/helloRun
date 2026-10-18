'use strict';

/**
 * Timezone-aware schedule for the OCR review digest (doc 08 "Scheduling mechanics").
 * Pure functions. The admin chooses the day and hour; with either unset nothing is due.
 * A period key names the current weekly / fortnightly / monthly period, so a digest is due
 * once per period at or after the chosen local time: a late or restarted scheduler sends
 * once, never a burst, and a duplicate scheduler is stopped by the period-keyed unique row.
 */

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    weekday: WEEKDAYS[get('weekday')]
  };
}

/** ISO-8601 week of a calendar date (no timezone involved once the local date is known). */
function isoWeek(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNumber = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNumber + 3);
  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { isoYear, week };
}

/**
 * @returns {{ due: boolean, periodKey: string, reason: string }}
 */
function getDigestSchedule(now, { frequency, dayOfWeek, hour, timezone }) {
  if (!frequency || frequency === 'off') return { due: false, periodKey: '', reason: 'frequency_off' };
  if (dayOfWeek === null || dayOfWeek === undefined || hour === null || hour === undefined) {
    return { due: false, periodKey: '', reason: 'schedule_not_set' };
  }
  const local = localParts(now, timezone || 'Asia/Manila');
  // Days since the chosen weekday in the current week (Mon-based ISO week).
  const isoDay = (local.weekday + 6) % 7;
  const isoTarget = (Number(dayOfWeek) + 6) % 7;
  const reachedThisWeek = isoDay > isoTarget || (isoDay === isoTarget && local.hour >= Number(hour));
  const { isoYear, week } = isoWeek(local.year, local.month, local.day);

  if (frequency === 'weekly') {
    return { due: reachedThisWeek, periodKey: `${isoYear}-W${String(week).padStart(2, '0')}`, reason: reachedThisWeek ? 'due' : 'before_scheduled_time' };
  }
  if (frequency === 'biweekly') {
    const pairStart = week % 2 === 1 ? week : week - 1;
    const isFirstWeek = week % 2 === 1;
    const due = isFirstWeek ? reachedThisWeek : true;
    return { due, periodKey: `${isoYear}-F${String(pairStart).padStart(2, '0')}`, reason: due ? 'due' : 'before_scheduled_time' };
  }
  if (frequency === 'monthly') {
    // First occurrence of the chosen weekday in the local month, at the chosen hour.
    const firstOfMonthWeekday = new Date(Date.UTC(local.year, local.month - 1, 1)).getUTCDay();
    const firstTargetDay = 1 + ((Number(dayOfWeek) - firstOfMonthWeekday + 7) % 7);
    const due = local.day > firstTargetDay || (local.day === firstTargetDay && local.hour >= Number(hour));
    return { due, periodKey: `${local.year}-${String(local.month).padStart(2, '0')}`, reason: due ? 'due' : 'before_scheduled_time' };
  }
  return { due: false, periodKey: '', reason: 'unknown_frequency' };
}

module.exports = { localParts, isoWeek, getDigestSchedule };
