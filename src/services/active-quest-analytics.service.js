const Event = require('../models/Event');
const Registration = require('../models/Registration');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { ACTIVE_QUEST_SERIES_KEY } = require('../config/active-quest');
const { resolveAccumulatedTargetDistanceKm } = require('./accumulated-target.service');

const ACTIVE_QUEST_METRIC_RULES = Object.freeze({
  version: 'active-quest-metrics-v1',
  registrations: 'Confirmed registrations only; cancelled and deleted-event records are excluded.',
  participants: 'Distinct account ID, falling back to normalized guest email within the series.',
  returning: 'Current unique participants also registered in the immediately previous calendar-month edition.',
  completionRate: 'Registrations whose approved activity distance meets their selected target, divided by confirmed registrations.',
  eventDistance: 'Sum of approved activity rows for this edition. Cross-event reuse remains intentionally separate.',
  reviewDuration: 'Median reviewedAt minus submittedAt for reviewed activity rows.',
  ocrCorrectionRate: 'Reviewed OCR-bearing rows with an organizer correction to an OCR-comparable field, divided by reviewed OCR-bearing rows.'
});

async function getActiveQuestSeriesAnalytics(options = {}, dependencies = {}) {
  const EventModel = dependencies.EventModel || Event;
  const RegistrationModel = dependencies.RegistrationModel || Registration;
  const ActivityModel = dependencies.ActivityModel || AccumulatedActivitySubmission;
  const eventQuery = { seriesKey: ACTIVE_QUEST_SERIES_KEY, isDeleted: { $ne: true } };
  if (options.year) eventQuery.seriesYear = Number(options.year);
  const events = await EventModel.find(eventQuery).sort({ seriesYear: 1, seriesMonth: 1 }).lean();
  if (!events.length) return { metricRules: ACTIVE_QUEST_METRIC_RULES, months: [], totals: buildTotals([]) };
  const allSeriesEvents = options.year
    ? await EventModel.find({ seriesKey: ACTIVE_QUEST_SERIES_KEY, isDeleted: { $ne: true } }).sort({ seriesYear: 1, seriesMonth: 1 }).lean()
    : events;
  const allEventIds = allSeriesEvents.map((event) => event._id);
  const [registrations, activities] = await Promise.all([
    RegistrationModel.find({ eventId: { $in: allEventIds }, status: 'confirmed' }).lean(),
    ActivityModel.find({ eventId: { $in: events.map((event) => event._id) } }).lean()
  ]);
  const months = buildActiveQuestMonthlyMetrics({ events, allSeriesEvents, registrations, activities });
  return { metricRules: ACTIVE_QUEST_METRIC_RULES, months, totals: buildTotals(months) };
}

function buildActiveQuestMonthlyMetrics({ events = [], allSeriesEvents = events, registrations = [], activities = [] }) {
  const eventById = new Map(allSeriesEvents.map((event) => [String(event._id), event]));
  const registrationById = new Map(registrations.map((registration) => [String(registration._id), registration]));
  const participantMonths = new Map();
  for (const registration of registrations) {
    const event = eventById.get(String(registration.eventId));
    if (!event) continue;
    const participantKey = getParticipantKey(registration);
    if (!participantKey) continue;
    const month = editionNumber(event);
    if (!participantMonths.has(participantKey)) participantMonths.set(participantKey, new Set());
    participantMonths.get(participantKey).add(month);
  }

  return events.map((event) => {
    const eventId = String(event._id);
    const eventRegistrations = registrations.filter((registration) => String(registration.eventId) === eventId);
    const eventActivities = activities.filter((activity) => String(activity.eventId) === eventId);
    const approvedByRegistration = new Map();
    for (const activity of eventActivities) {
      if (activity.status !== 'approved') continue;
      const key = String(activity.registrationId);
      approvedByRegistration.set(key, Number(approvedByRegistration.get(key) || 0) + Number(activity.distanceKm || 0));
    }
    const participantKeys = new Set(eventRegistrations.map(getParticipantKey).filter(Boolean));
    const monthKey = editionNumber(event);
    const previousMonthKey = previousEditionNumber(event);
    const completed = eventRegistrations.filter((registration) => {
      const target = resolveAccumulatedTargetDistanceKm(registration, event);
      return target > 0 && Number(approvedByRegistration.get(String(registration._id)) || 0) >= target;
    }).length;
    const reviewed = eventActivities.filter((activity) => activity.reviewedAt && activity.submittedAt);
    const reviewDurations = reviewed
      .map((activity) => new Date(activity.reviewedAt).getTime() - new Date(activity.submittedAt).getTime())
      .filter((duration) => Number.isFinite(duration) && duration >= 0);
    const ocrReviewed = reviewed.filter(hasOcrEvidence);
    const ocrCorrected = ocrReviewed.filter(hasOcrComparableCorrection).length;
    return {
      eventId,
      title: event.title,
      year: Number(event.seriesYear),
      month: Number(event.seriesMonth),
      registrations: eventRegistrations.length,
      uniqueParticipants: participantKeys.size,
      newParticipants: Array.from(participantKeys).filter((key) => Math.min(...participantMonths.get(key)) === monthKey).length,
      returningParticipants: Array.from(participantKeys).filter((key) => participantMonths.get(key)?.has(previousMonthKey)).length,
      returningRate: rate(Array.from(participantKeys).filter((key) => participantMonths.get(key)?.has(previousMonthKey)).length, participantKeys.size),
      approvedActivityCount: eventActivities.filter((activity) => activity.status === 'approved').length,
      totalApprovedKm: round(eventActivities.filter((activity) => activity.status === 'approved').reduce((sum, activity) => sum + Number(activity.distanceKm || 0), 0)),
      completedRegistrations: completed,
      completionRate: rate(completed, eventRegistrations.length),
      pendingCount: eventActivities.filter((activity) => ['submitted', 'needs_clarification'].includes(activity.status)).length,
      flaggedCount: eventActivities.filter((activity) => activity.suspiciousFlag === true).length,
      rejectedCount: eventActivities.filter((activity) => activity.status === 'rejected').length,
      medianReviewDurationMs: median(reviewDurations),
      ocrReviewedCount: ocrReviewed.length,
      ocrCorrectionCount: ocrCorrected,
      ocrCorrectionRate: rate(ocrCorrected, ocrReviewed.length),
      participantRecordCount: eventRegistrations.filter((registration) => registrationById.has(String(registration._id))).length
    };
  });
}

function buildTotals(months) {
  return {
    editions: months.length,
    registrations: months.reduce((sum, month) => sum + month.registrations, 0),
    approvedActivityCount: months.reduce((sum, month) => sum + month.approvedActivityCount, 0),
    totalApprovedKm: round(months.reduce((sum, month) => sum + month.totalApprovedKm, 0)),
    completedRegistrations: months.reduce((sum, month) => sum + month.completedRegistrations, 0)
  };
}

function getParticipantKey(registration) {
  const userId = String(registration?.userId || '').trim();
  if (userId) return `user:${userId}`;
  const email = String(registration?.participant?.email || '').trim().toLowerCase();
  return email ? `guest:${email}` : '';
}

function hasOcrEvidence(activity) {
  return Boolean(activity?.ocrData?.parserVersion || activity?.ocrData?.rawText);
}

function hasOcrComparableCorrection(activity) {
  const comparable = new Set(['distanceKm', 'elapsedMs', 'runDate', 'elevationGain', 'steps', 'runType']);
  return (activity.organizerCorrections || []).some((correction) =>
    (correction.changes || []).some((change) => comparable.has(String(change.field || '')))
  );
}

function editionNumber(event) {
  return Number(event?.seriesYear || 0) * 100 + Number(event?.seriesMonth || 0);
}

function previousEditionNumber(event) {
  const year = Number(event?.seriesYear || 0);
  const month = Number(event?.seriesMonth || 0);
  return month === 1 ? (year - 1) * 100 + 12 : year * 100 + month - 1;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function rate(numerator, denominator) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : null;
}

function round(value) {
  return Number(Number(value || 0).toFixed(2));
}

module.exports = {
  ACTIVE_QUEST_METRIC_RULES,
  getActiveQuestSeriesAnalytics,
  buildActiveQuestMonthlyMetrics,
  getParticipantKey,
  previousEditionNumber,
  median,
  hasOcrComparableCorrection
};
