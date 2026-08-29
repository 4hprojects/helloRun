const { isAccumulatedChallenge } = require('./challenge-metrics');

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRegistrationReminderWindow(registration = {}, event = {}) {
  const mode = String(registration.participationMode || '').trim().toLowerCase();
  if (mode === 'virtual') {
    return normalizeWindow(
      event.virtualWindow?.startAt || event.eventStartAt,
      (isAccumulatedChallenge(event) && event.finalSubmissionDeadlineAt)
        || event.virtualWindow?.endAt
        || event.eventEndAt
    );
  }

  if (mode === 'onsite') {
    const windows = Array.isArray(event.onsiteCheckinWindows) ? event.onsiteCheckinWindows : [];
    const starts = windows.map((item) => parseDate(item?.startAt)).filter(Boolean).sort(byTime);
    const ends = windows.map((item) => parseDate(item?.endAt)).filter(Boolean).sort(byTime);
    return normalizeWindow(starts[0] || event.eventStartAt, ends[ends.length - 1] || event.eventEndAt);
  }

  return normalizeWindow(event.eventStartAt, event.eventEndAt);
}

function normalizeWindow(startValue, endValue) {
  return { startAt: parseDate(startValue), endAt: parseDate(endValue) };
}

function getReminderSchedule(registration, event) {
  const window = getRegistrationReminderWindow(registration, event);
  const durationMs = window.startAt && window.endAt
    ? window.endAt.getTime() - window.startAt.getTime()
    : null;
  return {
    ...window,
    startReminderAt: window.startAt,
    submissionReminderAt: window.endAt && durationMs > DAY_MS
      ? new Date(window.endAt.getTime() - DAY_MS)
      : null
  };
}

function isStartReminderDue(schedule, now = new Date()) {
  if (!schedule?.startReminderAt) return false;
  const nowMs = now.getTime();
  const startMs = schedule.startReminderAt.getTime();
  return nowMs >= startMs
    && (!schedule.endAt || nowMs <= schedule.endAt.getTime())
    && nowMs - startMs <= DAY_MS;
}

function isSubmissionReminderDue(schedule, now = new Date()) {
  if (!schedule?.submissionReminderAt || !schedule?.endAt) return false;
  const nowMs = now.getTime();
  return nowMs >= schedule.submissionReminderAt.getTime() && nowMs < schedule.endAt.getTime();
}

function isEligibleReminderRegistration(registration = {}, event = {}, user = {}) {
  const email = String(user.email || '').trim();
  const registrationStatus = String(registration.status || '').trim();
  const paymentSettled = event.feeMode !== 'paid'
    || Number(event.feeAmount || registration.paymentAmountDue || 0) <= 0
    || registration.paymentStatus === 'paid';
  return registration.participantType !== 'guest'
    && ['confirmed', 'paid'].includes(registrationStatus)
    && paymentSettled
    && event.status === 'published'
    && event.isDeleted !== true
    && String(user.accountStatus || 'active') === 'active'
    && user.emailVerified === true
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatReminderInstant(value, timezone) {
  const date = parseDate(value);
  if (!date) return 'Schedule unavailable';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
}

function buildReminderTimeText(value, runnerTimezone) {
  const manila = formatReminderInstant(value, 'Asia/Manila');
  if (!runnerTimezone || runnerTimezone === 'Asia/Manila') return manila;
  try {
    return `${formatReminderInstant(value, runnerTimezone)} (your time) / ${manila} (Manila)`;
  } catch (_) {
    return manila;
  }
}

function byTime(a, b) {
  return a.getTime() - b.getTime();
}

module.exports = {
  DAY_MS,
  getRegistrationReminderWindow,
  getReminderSchedule,
  isStartReminderDue,
  isSubmissionReminderDue,
  isEligibleReminderRegistration,
  buildReminderTimeText
};
