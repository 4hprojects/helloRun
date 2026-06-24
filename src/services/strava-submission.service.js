const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const {
  createSubmission,
  resubmitSubmission,
  PERSONAL_RECORD_REGISTRATION_ID
} = require('./submission.service');
const { createAccumulatedActivitySubmission } = require('./accumulated-activity.service');
const stravaService = require('./strava.service');
const {
  acquireSubmissionIdempotencyLock,
  buildStravaSubmissionIdempotencyKey
} = require('./submission-idempotency.service');

const STRAVA_TYPE_TO_RUN_TYPE = {
  Run: 'run',
  VirtualRun: 'run',
  TrailRun: 'trail_run',
  Walk: 'walk',
  Hike: 'hike'
};

async function submitStravaActivity({ runnerId, eventId, stravaActivityId }) {
  const safeActivityId = Number(stravaActivityId || 0);
  if (!safeActivityId) {
    throw new Error('Select a Strava activity to submit.');
  }

  const { connection, activity } = await stravaService.fetchActivityById(runnerId, safeActivityId);
  if (Number(activity.athleteId || 0) !== Number(connection.stravaAthleteId || 0)) {
    throw new Error('This Strava activity does not belong to your connected account.');
  }

  validateActivityShape(activity);

  if (String(eventId || '').trim() === PERSONAL_RECORD_REGISTRATION_ID) {
    const duplicate = await findDuplicateStravaSubmission({
      runnerId,
      stravaActivityId: safeActivityId,
      personalRecord: true
    });
    if (duplicate) {
      throw new Error('This Strava activity has already been submitted as a personal record.');
    }

    const lock = await acquireSubmissionIdempotencyLock(
      buildStravaSubmissionIdempotencyKey({
        runnerId,
        eventId: PERSONAL_RECORD_REGISTRATION_ID,
        stravaActivityId: safeActivityId
      }),
      {
        scope: 'strava_submission',
        runnerId,
        message: 'This Strava activity submission is already being processed. Please wait a moment.'
      }
    );
    let submission;
    try {
      submission = await createSubmission(buildSubmissionInput({
        registration: {
          _id: PERSONAL_RECORD_REGISTRATION_ID,
          userId: runnerId,
          eventId: null,
          raceDistance: '',
          participationMode: 'virtual'
        },
        activity,
        connection
      }));
    } catch (error) {
      await lock.release().catch(() => {});
      throw error;
    }
    return { submission, type: 'personal_record' };
  }

  const registration = await Registration.findOne({
    userId: runnerId,
    eventId,
    status: 'confirmed',
    paymentStatus: 'paid'
  }).lean();
  if (!registration) {
    throw new Error('You need a paid confirmed registration before submitting to this event.');
  }

  const event = await Event.findById(registration.eventId)
    .select('title eventStartAt eventEndAt virtualWindow acceptedRunTypes virtualCompletionMode minimumActivityDistanceKm')
    .lean();
  validateAgainstEvent(activity, event);

  const duplicate = await findDuplicateStravaSubmission({
    runnerId,
    eventId: registration.eventId,
    stravaActivityId: safeActivityId
  });
  if (duplicate) {
    throw new Error('This Strava activity has already been submitted for this event.');
  }

  const existing = await Submission.findOne({
    registrationId: registration._id,
    runnerId
  }).select('_id status').lean();
  if (existing && existing.status !== 'rejected') {
    throw new Error('Submission already exists for this registration.');
  }

  const lock = await acquireSubmissionIdempotencyLock(
    buildStravaSubmissionIdempotencyKey({
      runnerId,
      eventId: registration.eventId,
      stravaActivityId: safeActivityId
    }),
    {
      scope: 'strava_submission',
      runnerId,
      message: 'This Strava activity submission is already being processed. Please wait a moment.'
    }
  );
  try {
    const payload = buildSubmissionInput({ registration, activity, connection });
    if (event.virtualCompletionMode === 'accumulated_distance') {
      const submission = await createAccumulatedActivitySubmission(payload);
      return { submission, type: 'accumulated_activity' };
    }

    const submission = existing && existing.status === 'rejected'
      ? await resubmitSubmission(payload)
      : await createSubmission(payload);
    return { submission, type: 'submission' };
  } catch (error) {
    await lock.release().catch(() => {});
    throw error;
  }
}

async function findDuplicateStravaSubmission({ runnerId, eventId, stravaActivityId, personalRecord = false }) {
  const query = personalRecord ? {
    runnerId,
    isPersonalRecord: true,
    'stravaActivity.id': Number(stravaActivityId)
  } : {
    runnerId,
    eventId,
    'stravaActivity.id': Number(stravaActivityId)
  };
  const [submission, accumulated] = await Promise.all([
    Submission.findOne(query).select('_id').lean(),
    AccumulatedActivitySubmission.findOne(query).select('_id').lean()
  ]);
  return submission || accumulated;
}

function buildSubmissionInput({ registration, activity, connection }) {
  const elapsedSeconds = Number(activity.elapsedTimeSeconds || activity.movingTimeSeconds || 0);
  const startDate = activity.startDateLocal || activity.startDate || new Date().toISOString();
  const runType = normalizeStravaRunType(activity.type || activity.sportType);
  const activityUrl = activity.stravaUrl || `https://www.strava.com/activities/${activity.id}`;

  return {
    registrationId: registration._id,
    runnerId: registration.userId,
    distanceKm: activity.distanceKm,
    elapsedMs: elapsedSeconds * 1000,
    runDate: startDate,
    runLocation: 'Strava activity',
    proofType: 'gps',
    proof: {
      url: activityUrl,
      key: '',
      mimeType: 'text/uri-list',
      size: 0,
      hash: `strava:${activity.id}`
    },
    proofNotes: `Imported from Strava activity ${activity.id}.`,
    runType,
    elevationGain: activity.elevationGain,
    steps: null,
    source: 'strava',
    stravaActivity: {
      id: Number(activity.id),
      athleteId: Number(connection.stravaAthleteId),
      name: activity.name,
      type: activity.type || activity.sportType,
      sportType: activity.sportType || activity.type,
      distanceMeters: activity.distanceMeters,
      distanceKm: activity.distanceKm,
      movingTimeSeconds: activity.movingTimeSeconds,
      elapsedTimeSeconds: elapsedSeconds,
      startDate: activity.startDate ? new Date(activity.startDate) : null,
      startDateLocal: activity.startDateLocal ? new Date(activity.startDateLocal) : null,
      timezone: activity.timezone || '',
      elevationGain: activity.elevationGain,
      averageSpeed: activity.averageSpeed,
      url: activityUrl,
      importedAt: new Date()
    },
    ocrData: {
      extractedDistanceKm: activity.distanceKm,
      extractedTimeMs: elapsedSeconds * 1000,
      extractedElevationGain: activity.elevationGain,
      extractedRunDate: isoDateOnly(startDate),
      extractedRunLocation: 'Strava activity',
      extractedRunType: runType,
      rawText: activity.name,
      confidence: 1,
      detectedSource: 'strava',
      nameMatchStatus: 'not_checked'
    }
  };
}

function validateActivityShape(activity) {
  if (!activity || !activity.id) {
    throw new Error('Strava activity could not be loaded.');
  }
  if (Number(activity.distanceKm || 0) <= 0) {
    throw new Error('Strava activity distance must be greater than zero.');
  }
  if (Number(activity.elapsedTimeSeconds || activity.movingTimeSeconds || 0) <= 0) {
    throw new Error('Strava activity duration is missing.');
  }
  if (!normalizeStravaRunType(activity.type || activity.sportType)) {
    throw new Error('This Strava activity type is not supported.');
  }
}

function validateAgainstEvent(activity, event) {
  if (!event) {
    throw new Error('Event not found.');
  }
  const activityDate = new Date(activity.startDateLocal || activity.startDate || '');
  if (Number.isNaN(activityDate.getTime())) {
    throw new Error('Strava activity date is missing.');
  }

  const windowStart = event.virtualWindow?.startAt || event.eventStartAt || null;
  const windowEnd = event.virtualWindow?.endAt || event.eventEndAt || null;
  if (windowStart && activityDate < new Date(windowStart)) {
    throw new Error('Strava activity is outside the event date range.');
  }
  if (windowEnd && activityDate > new Date(windowEnd)) {
    throw new Error('Strava activity is outside the event date range.');
  }

  const runType = normalizeStravaRunType(activity.type || activity.sportType);
  const acceptedRunTypes = Array.isArray(event.acceptedRunTypes) ? event.acceptedRunTypes : [];
  if (acceptedRunTypes.length && !acceptedRunTypes.includes(runType)) {
    throw new Error('This Strava activity type is not accepted for the event.');
  }

  const minimum = Number(event.minimumActivityDistanceKm || 0);
  if (minimum > 0 && Number(activity.distanceKm || 0) < minimum) {
    throw new Error(`Activity distance must be at least ${minimum} km.`);
  }
}

function normalizeStravaRunType(value) {
  const raw = String(value || '').trim();
  return STRAVA_TYPE_TO_RUN_TYPE[raw] || '';
}

function isoDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

module.exports = {
  submitStravaActivity,
  normalizeStravaRunType,
  _private: {
    PERSONAL_RECORD_EVENT_ID: PERSONAL_RECORD_REGISTRATION_ID,
    buildSubmissionInput,
    validateAgainstEvent,
    validateActivityShape
  }
};
