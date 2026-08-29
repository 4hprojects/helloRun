const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const EventReminderDelivery = require('../models/EventReminderDelivery');
const communicationService = require('./communication.service');
const { notifyWithRetry } = require('./reliable-communication.service');
const {
  getReminderSchedule,
  isStartReminderDue,
  isSubmissionReminderDue,
  isEligibleReminderRegistration,
  buildReminderTimeText
} = require('../utils/event-reminder-window');
const logger = require('../utils/logger');

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_STALE_CLAIM_MS = 30 * 60 * 1000;

async function processEventActivationReminders(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const batchSize = positiveInt(options.batchSize || process.env.EVENT_REMINDER_BATCH_SIZE, DEFAULT_BATCH_SIZE);
  const staleClaimMs = positiveInt(options.staleClaimMs || process.env.EVENT_REMINDER_STALE_CLAIM_MS, DEFAULT_STALE_CLAIM_MS);
  const registrations = await Registration.find({
    participantType: { $ne: 'guest' },
    status: { $in: ['confirmed', 'paid'] },
    userId: { $ne: null }
  })
    .populate({
      path: 'eventId',
      select: 'title slug status isDeleted feeMode feeAmount eventStartAt eventEndAt virtualWindow onsiteCheckinWindows virtualCompletionMode finalSubmissionDeadlineAt'
    })
    .populate({
      path: 'userId',
      select: 'email firstName timezone timezoneConfirmedAt accountStatus emailVerified notificationPreferences'
    })
    .sort({ registeredAt: 1, _id: 1 })
    .lean();

  const results = [];
  for (const registration of registrations) {
    if (results.length >= batchSize) break;
    const event = registration.eventId;
    const user = registration.userId;
    if (!event || !user || !isEligibleReminderRegistration(registration, event, user)) continue;
    const schedule = getReminderSchedule(registration, event);

    if (isStartReminderDue(schedule, now)) {
      const result = await claimAndProcess({
        registration, event, user, reminderType: 'event_started',
        scheduledFor: schedule.startReminderAt, deadlineAt: schedule.endAt, now, staleClaimMs
      });
      if (result) results.push(result);
    }

    if (results.length >= batchSize) break;
    if (isSubmissionReminderDue(schedule, now)) {
      const result = await claimAndProcess({
        registration, event, user, reminderType: 'submission_due',
        scheduledFor: schedule.submissionReminderAt, deadlineAt: schedule.endAt, now, staleClaimMs
      });
      if (result) results.push(result);
    }
  }
  return { processed: results.length, results };
}

async function claimAndProcess(context) {
  const delivery = await claimReminderDelivery(context);
  if (!delivery) return null;

  try {
    if (context.reminderType === 'submission_due' && await hasAnyActivity(context.registration._id)) {
      await finishDelivery(delivery._id, {
        status: 'suppressed', suppressionReason: 'activity_already_submitted', completedAt: context.now
      });
      return { deliveryId: delivery._id, reminderType: context.reminderType, status: 'suppressed' };
    }
    return await dispatchReminder(delivery, context);
  } catch (error) {
    await finishDelivery(delivery._id, { status: 'failed', lastError: error.message, completedAt: context.now });
    logger.error('[event-reminder] Delivery failed:', {
      deliveryId: String(delivery._id), registrationId: String(context.registration._id), error: error.message
    });
    return { deliveryId: delivery._id, reminderType: context.reminderType, status: 'failed', error: error.message };
  }
}

async function claimReminderDelivery({ registration, event, user, reminderType, scheduledFor, deadlineAt, now, staleClaimMs }) {
  const key = { registrationId: registration._id, reminderType };
  try {
    await EventReminderDelivery.updateOne(key, {
      $setOnInsert: {
        ...key, eventId: event._id, userId: user._id, scheduledFor, deadlineAt,
        status: 'pending', attemptCount: 0
      }
    }, { upsert: true });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  const staleBefore = new Date(now.getTime() - staleClaimMs);
  return EventReminderDelivery.findOneAndUpdate({
    ...key,
    $or: [
      { status: 'pending' },
      { status: 'processing', claimedAt: { $lte: staleBefore } },
      { status: 'failed', updatedAt: { $lte: staleBefore } }
    ]
  }, {
    $set: { status: 'processing', claimedAt: now, lastError: '' },
    $inc: { attemptCount: 1 }
  }, { new: true });
}

async function dispatchReminder(delivery, { registration, event, user, reminderType, scheduledFor, deadlineAt, now }) {
  const isStart = reminderType === 'event_started';
  const eventKey = isStart ? 'event.started_reminder' : 'result.submission_reminder';
  const appUrl = String(process.env.APP_URL || 'https://hellorun.online').replace(/\/$/, '');
  const href = isStart ? `/events/${event.slug}` : `/my-registrations#registration-${registration._id}`;
  const actionUrl = `${appUrl}${href}`;
  const relevantTime = isStart ? scheduledFor : deadlineAt;
  const scheduleText = buildReminderTimeText(relevantTime, user.timezoneConfirmedAt ? user.timezone : null);
  const metadata = {
    eventId: String(event._id), registrationId: String(registration._id),
    reminderType, reminderDeliveryId: String(delivery._id), deadlineAt: deadlineAt?.toISOString() || ''
  };

  let inAppStatus = 'disabled';
  let emailStatus = 'disabled';
  let inAppError = '';
  try {
    const result = await communicationService.notify(eventKey, {
      notification: {
        userId: user._id,
        type: isStart ? 'event_started_reminder' : 'submission_due_reminder',
        title: isStart ? `${event.title} is now open` : `Submit your run for ${event.title}`,
        message: isStart
          ? `Your participation window has started. Open the event for schedules and details. Starts: ${scheduleText}.`
          : `There are about 24 hours left to submit your activity. Deadline: ${scheduleText}.`,
        href,
        dedupeKey: `event-reminder:${registration._id}:${reminderType}`,
        metadata
      }
    });
    inAppStatus = result.inApp ? 'sent' : 'disabled';
  } catch (error) {
    inAppStatus = 'failed';
    inAppError = error.message;
  }

  const emailResult = await notifyWithRetry(eventKey, {
    email: {
      to: user.email,
      recipientUserId: user._id,
      firstName: user.firstName || registration.participant?.firstName || 'Runner',
      eventTitle: event.title,
      actionUrl,
      actionLabel: isStart ? 'View Event Details' : 'Submit Your Run',
      scheduleText,
      isStart,
      metadata
    }
  }, {
    source: 'event.activation_reminder',
    idempotencyKey: `event-reminder-email:${registration._id}:${reminderType}`,
    metadata
  });
  emailStatus = emailResult.queued ? 'queued' : (emailResult.email?.status || 'disabled');
  const delivered = inAppStatus === 'sent' || emailStatus === 'sent';
  const status = (inAppStatus === 'failed' && ['failed', 'disabled'].includes(emailStatus)) ? 'failed' : 'completed';
  await finishDelivery(delivery._id, {
    status, inAppStatus, emailStatus, lastError: inAppError,
    completedAt: now, deliveredAt: delivered ? now : null
  });
  return { deliveryId: delivery._id, reminderType, status, inAppStatus, emailStatus };
}

async function hasAnyActivity(registrationId) {
  const [standard, accumulated] = await Promise.all([
    Submission.exists({ registrationId }),
    AccumulatedActivitySubmission.exists({ registrationId })
  ]);
  return Boolean(standard || accumulated);
}

function finishDelivery(deliveryId, values) {
  return EventReminderDelivery.updateOne({ _id: deliveryId }, { $set: values });
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = {
  processEventActivationReminders,
  claimReminderDelivery,
  hasAnyActivity,
  dispatchReminder
};
