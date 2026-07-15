const CommunicationSetting = require('../models/CommunicationSetting');
const CommunicationEventSetting = require('../models/CommunicationEventSetting');
const CommunicationLog = require('../models/CommunicationLog');
const CommunicationRetry = require('../models/CommunicationRetry');
const User = require('../models/User');
const emailService = require('./email.service');
const { createNotificationSafe } = require('./notification.service');
const {
  COMMUNICATION_EVENTS,
  getDefaultCommunicationEvent
} = require('./communication-events.registry');
const {
  decideEmailSend,
  getEmailBudgetSnapshot,
  incrementFailedEmail,
  incrementSentEmail,
  incrementSkippedEmail
} = require('./email-budget.service');
const { recordCommunicationLog } = require('./email-log.service');

const GLOBAL_SETTING_KEY = 'communication.global';

async function getCommunicationSetting() {
  return CommunicationSetting.findOneAndUpdate(
    { key: GLOBAL_SETTING_KEY },
    {
      $setOnInsert: {
        key: GLOBAL_SETTING_KEY,
        senderEmail: process.env.EMAIL_FROM || ''
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seedCommunicationEvents() {
  const setting = await getCommunicationSetting();
  const results = [];
  for (const event of COMMUNICATION_EVENTS) {
    const insertDefaults = {
      emailEnabled: event.emailEnabled,
      inAppEnabled: event.inAppEnabled,
      fallbackToInApp: event.fallbackToInApp !== false
    };
    const updated = await CommunicationEventSetting.findOneAndUpdate(
      { eventKey: event.eventKey },
      {
        $setOnInsert: insertDefaults,
        $set: {
          name: event.name,
          description: event.description,
          category: event.category,
          priority: event.priority,
          required: event.required,
          locked: event.locked,
          recipientRoles: event.recipientRoles,
          displayOrder: event.displayOrder
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    results.push(updated);
  }
  return { setting, events: results };
}

async function getEventSetting(eventKey) {
  await seedCommunicationEvents();
  const existing = await CommunicationEventSetting.findOne({ eventKey });
  if (existing) return existing;
  const fallback = getDefaultCommunicationEvent(eventKey);
  if (!fallback) return null;
  return CommunicationEventSetting.create(fallback);
}

async function listEventSettings() {
  await seedCommunicationEvents();
  return CommunicationEventSetting.find({}).sort({ displayOrder: 1, eventKey: 1 }).lean();
}

async function updateGlobalSettings(input = {}, actor = null) {
  const values = normalizeGlobalSettings(input);
  validateGlobalSettings(values);
  return CommunicationSetting.findOneAndUpdate(
    { key: GLOBAL_SETTING_KEY },
    {
      $set: {
        ...values,
        provider: 'resend',
        senderName: String(input.senderName || 'HelloRun').trim().slice(0, 80) || 'HelloRun',
        senderEmail: String(input.senderEmail || process.env.EMAIL_FROM || '').trim().slice(0, 200),
        replyToEmail: String(input.replyToEmail || 'support@hellorun.online').trim().slice(0, 200),
        updatedBy: actor
      },
      $setOnInsert: { key: GLOBAL_SETTING_KEY }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function updateEventSetting(eventKey, input = {}, actor = null) {
  const setting = await getEventSetting(eventKey);
  if (!setting) {
    throw new Error('Communication event not found.');
  }

  const emailEnabled = normalizeBoolean(input.emailEnabled);
  const inAppEnabled = normalizeBoolean(input.inAppEnabled);
  if (setting.locked && !emailEnabled) {
    throw new Error('Locked communication events cannot have email disabled.');
  }

  setting.emailEnabled = emailEnabled;
  setting.inAppEnabled = inAppEnabled;
  setting.updatedBy = actor;
  await setting.save();
  await recordCommunicationLog({
    eventKey,
    channel: 'admin',
    status: 'sent',
    statusReason: 'Communication event settings updated.',
    priority: setting.priority,
    metadata: {
      emailEnabled,
      inAppEnabled,
      actor
    }
  });
  return setting;
}

async function notify(eventKey, payload = {}) {
  const [settings, eventSetting] = await Promise.all([
    getCommunicationSetting(),
    getEventSetting(eventKey)
  ]);
  if (!eventSetting) {
    throw new Error(`Unknown communication event: ${eventKey}`);
  }

  const result = {
    eventKey,
    inApp: null,
    email: null
  };

  if (settings.inAppNotificationsEnabled && eventSetting.inAppEnabled && payload.notification) {
    result.inApp = await createNotificationSafe(payload.notification, `${eventKey} notification`);
    await recordCommunicationLog({
      eventKey,
      channel: 'in_app',
      recipientUserId: payload.notification.userId || null,
      status: result.inApp ? 'sent' : 'failed',
      statusReason: result.inApp ? '' : 'In-app notification creation failed.',
      priority: eventSetting.priority,
      metadata: payload.notification.metadata || {}
    });
    if (!result.inApp && payload.throwOnInAppFailure) {
      throw new Error('In-app notification creation failed.');
    }
  }

  if (!payload.email) {
    return result;
  }

  const emailDecision = await decideEmailSend({ settings, eventSetting });
  if (!emailDecision.allowed) {
    await incrementSkippedEmail({ settings });
    result.email = {
      status: emailDecision.status || 'skipped',
      skipped: true,
      reason: emailDecision.reason
    };
    await recordCommunicationLog({
      eventKey,
      channel: 'email',
      recipientUserId: payload.email.recipientUserId || null,
      recipientEmail: payload.email.to || '',
      subject: payload.email.subject || getSubjectForEvent(eventKey, payload),
      status: emailDecision.status || 'skipped',
      statusReason: emailDecision.reason,
      provider: settings.provider,
      priority: eventSetting.priority,
      metadata: payload.email.metadata || {}
    });
    if (result.inApp) {
      await recordFallbackInApp(eventKey, payload, eventSetting, emailDecision.reason);
    }
    return result;
  }

  // Check user-level email opt-out before dispatching.
  const recipientUserId = payload.email.recipientUserId || payload.notification?.userId;
  if (recipientUserId) {
    const userPrefs = await User.findById(recipientUserId)
      .select('notificationPreferences')
      .lean()
      .catch(() => null);
    const optedOut = Array.isArray(userPrefs?.notificationPreferences?.emailOptOut)
      && userPrefs.notificationPreferences.emailOptOut.includes(eventKey);
    if (optedOut) {
      result.email = { status: 'suppressed', skipped: true, reason: 'user_opt_out' };
      await recordCommunicationLog({
        eventKey,
        channel: 'email',
        recipientUserId,
        recipientEmail: payload.email.to || '',
        subject: payload.email.subject || getSubjectForEvent(eventKey, payload),
        status: 'suppressed',
        statusReason: 'User opted out of this notification type.',
        provider: settings.provider,
        priority: eventSetting.priority,
        metadata: payload.email.metadata || {}
      });
      return result;
    }
  }

  try {
    const emailResult = await sendEventEmail(eventKey, payload);
    const skippedByHelper = Boolean(emailResult?.skipped);
    if (skippedByHelper) {
      await incrementSkippedEmail({ settings });
    } else {
      await incrementSentEmail({ settings, priority: eventSetting.priority });
    }
    result.email = {
      status: skippedByHelper ? 'skipped' : 'sent',
      data: emailResult
    };
    await recordCommunicationLog({
      eventKey,
      channel: 'email',
      recipientUserId: payload.email.recipientUserId || null,
      recipientEmail: payload.email.to || '',
      subject: payload.email.subject || getSubjectForEvent(eventKey, payload),
      status: skippedByHelper ? 'skipped' : 'sent',
      statusReason: skippedByHelper ? 'Email helper skipped send.' : '',
      provider: settings.provider,
      providerMessageId: emailResult?.id || emailResult?.data?.id || '',
      priority: eventSetting.priority,
      quotaCounted: !skippedByHelper,
      sentAt: skippedByHelper ? null : new Date(),
      metadata: payload.email.metadata || {}
    });
    if (skippedByHelper && result.inApp) {
      await recordFallbackInApp(eventKey, payload, eventSetting, 'Email helper skipped send.');
    }
  } catch (error) {
    await incrementFailedEmail({ settings });
    result.email = {
      status: 'failed',
      error
    };
    await recordCommunicationLog({
      eventKey,
      channel: 'email',
      recipientUserId: payload.email.recipientUserId || null,
      recipientEmail: payload.email.to || '',
      subject: payload.email.subject || getSubjectForEvent(eventKey, payload),
      status: 'failed',
      statusReason: error.message,
      provider: settings.provider,
      priority: eventSetting.priority,
      metadata: payload.email.metadata || {}
    });
    if (result.inApp) {
      await recordFallbackInApp(eventKey, payload, eventSetting, error.message);
    }
    if (payload.throwOnEmailFailure) {
      throw error;
    }
  }

  return result;
}

async function sendTestEmail({ to, subject, message, actorId } = {}) {
  const settings = await getCommunicationSetting();
  const pseudoEvent = {
    eventKey: 'admin.test_email',
    priority: 'low',
    emailEnabled: true,
    locked: false,
    required: false
  };
  const decision = await decideEmailSend({ settings, eventSetting: pseudoEvent });
  if (!decision.allowed) {
    await incrementSkippedEmail({ settings });
    await recordCommunicationLog({
      eventKey: 'admin.test_email',
      channel: 'email',
      recipientEmail: to,
      subject,
      status: decision.status || 'skipped',
      statusReason: decision.reason,
      provider: settings.provider,
      priority: 'low',
      isTest: true,
      metadata: { actorId }
    });
    return { skipped: true, reason: decision.reason };
  }

  try {
    const data = await emailService.sendBasicTestEmail(to, subject, message);
    const skippedByHelper = Boolean(data?.skipped);
    if (skippedByHelper) {
      await incrementSkippedEmail({ settings });
    } else {
      await incrementSentEmail({ settings, priority: 'low' });
    }
    await recordCommunicationLog({
      eventKey: 'admin.test_email',
      channel: 'email',
      recipientEmail: to,
      subject,
      status: skippedByHelper ? 'skipped' : 'sent',
      statusReason: skippedByHelper ? 'Email helper skipped send.' : '',
      provider: settings.provider,
      providerMessageId: data?.id || data?.data?.id || '',
      priority: 'low',
      quotaCounted: !skippedByHelper,
      isTest: true,
      sentAt: skippedByHelper ? null : new Date(),
      metadata: { actorId }
    });
    return data;
  } catch (error) {
    await incrementFailedEmail({ settings });
    await recordCommunicationLog({
      eventKey: 'admin.test_email',
      channel: 'email',
      recipientEmail: to,
      subject,
      status: 'failed',
      statusReason: error.message,
      provider: settings.provider,
      priority: 'low',
      isTest: true,
      metadata: { actorId }
    });
    throw error;
  }
}

async function recordFallbackInApp(eventKey, payload, eventSetting, reason) {
  return recordCommunicationLog({
    eventKey,
    channel: 'in_app',
    recipientUserId: payload.notification?.userId || payload.email?.recipientUserId || null,
    status: 'fallback_in_app',
    statusReason: reason || 'Email did not send; in-app notification is available.',
    priority: eventSetting.priority,
    metadata: payload.notification?.metadata || payload.email?.metadata || {}
  });
}

async function getAdminCommunicationPageData(filters = {}) {
  const setting = await getCommunicationSetting();
  const [events, budget, deliveryDigest] = await Promise.all([
    listEventSettings(),
    getEmailBudgetSnapshot(setting),
    getCommunicationDeliveryDigest()
  ]);
  const logQuery = buildLogQuery(filters);
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const limit = 40;
  const [logs, totalLogs] = await Promise.all([
    CommunicationLog.find(logQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CommunicationLog.countDocuments(logQuery)
  ]);
  return {
    setting: setting.toObject ? setting.toObject() : setting,
    events,
    budget,
    deliveryDigest,
    logs,
    logFilters: normalizeLogFilters(filters),
    pagination: {
      page,
      total: totalLogs,
      totalPages: Math.max(1, Math.ceil(totalLogs / limit))
    }
  };
}

async function getCommunicationDeliveryDigest(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const windows = [
    { key: '24h', label: 'Last 24 hours', since: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    { key: '7d', label: 'Last 7 days', since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
  ];
  return Promise.all(windows.map((window) => buildDeliveryDigestWindow(window, options.limit || 8)));
}

async function getCommunicationFailureDetail(eventKey, options = {}) {
  const safeEventKey = String(eventKey || '').trim().slice(0, 160);
  if (!safeEventKey) {
    throw new Error('Communication event is required.');
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const windowDays = Math.max(1, Math.min(30, Number.parseInt(String(options.days || '7'), 10) || 7));
  const limit = Math.max(5, Math.min(50, Number.parseInt(String(options.limit || '25'), 10) || 25));
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const retryWindowQuery = {
    eventKey: safeEventKey,
    status: { $in: ['queued', 'retrying', 'dead'] },
    $or: [
      { createdAt: { $gte: since } },
      { updatedAt: { $gte: since } }
    ]
  };
  const failedLogQuery = {
    eventKey: safeEventKey,
    status: 'failed',
    createdAt: { $gte: since }
  };

  const [events, failedLogs, failedLogCount, retryRows, retries] = await Promise.all([
    listEventSettings(),
    CommunicationLog.find(failedLogQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    CommunicationLog.countDocuments(failedLogQuery),
    CommunicationRetry.aggregate([
      { $match: retryWindowQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    CommunicationRetry.find(retryWindowQuery)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean()
  ]);

  const retryCounts = retryRows.reduce((memo, row) => {
    memo[row._id || 'unknown'] = row.count;
    return memo;
  }, {});
  const event = events.find((item) => item.eventKey === safeEventKey) || null;
  const causes = groupCommunicationFailureCauses(failedLogs, retries);
  const activeRetryCount = (retryCounts.queued || 0) + (retryCounts.retrying || 0);
  const incidentState = retryCounts.dead
    ? 'action_required'
    : activeRetryCount
      ? 'recovering'
      : failedLogCount
        ? 'monitoring'
        : 'resolved';

  return {
    eventKey: safeEventKey,
    eventName: event?.name || (safeEventKey === 'admin.test_email' ? 'Admin Test Email' : safeEventKey),
    eventDescription: event?.description || '',
    windowDays,
    since,
    failedLogCount,
    retryCounts: {
      queued: retryCounts.queued || 0,
      retrying: retryCounts.retrying || 0,
      dead: retryCounts.dead || 0
    },
    failedLogs,
    retries,
    causes,
    incidentState,
    incidentSummary: {
      activeRetryCount,
      deadCount: retryCounts.dead || 0,
      resolutionVerified: failedLogCount === 0 && activeRetryCount === 0 && !retryCounts.dead,
      firstObservedAt: [...failedLogs, ...retries]
        .map((item) => item.createdAt)
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b))[0] || null,
      lastObservedAt: [...failedLogs, ...retries]
        .map((item) => item.updatedAt || item.createdAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0] || null
    }
  };
}

function classifyCommunicationFailure(message) {
  const value = String(message || '').toLowerCase();
  if (/timeout|timed out|econnreset|network|socket/.test(value)) return { key: 'network', label: 'Provider or network timeout', action: 'Retry after provider connectivity recovers.' };
  if (/rate.?limit|quota|429|too many/.test(value)) return { key: 'quota', label: 'Rate limit or quota', action: 'Wait for the quota window, then retry queued deliveries.' };
  if (/invalid.*(email|recipient)|mailbox|address|bounce/.test(value)) return { key: 'recipient', label: 'Recipient address rejected', action: 'Verify the recipient address; repeated retries are unlikely to succeed.' };
  if (/auth|credential|api.?key|401|403|unauthor/.test(value)) return { key: 'configuration', label: 'Provider configuration', action: 'Verify provider credentials before retrying.' };
  if (/template|render|missing.*field/.test(value)) return { key: 'content', label: 'Message content or template', action: 'Correct the message data or template before retrying.' };
  return { key: 'unknown', label: 'Unclassified delivery failure', action: 'Inspect the latest error and test one delivery before a bulk retry.' };
}

function groupCommunicationFailureCauses(failedLogs = [], retries = []) {
  const groups = new Map();
  [...failedLogs.map((item) => item.statusReason), ...retries.map((item) => item.lastError)]
    .filter(Boolean)
    .forEach((message) => {
      const cause = classifyCommunicationFailure(message);
      const current = groups.get(cause.key) || { ...cause, count: 0, sample: String(message).slice(0, 240) };
      current.count += 1;
      groups.set(cause.key, current);
    });
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

async function buildDeliveryDigestWindow(window, limit) {
  const [logRows, retryRows] = await Promise.all([
    CommunicationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: window.since },
          status: 'failed'
        }
      },
      {
        $group: {
          _id: '$eventKey',
          failedLogs: { $sum: 1 },
          lastSeenAt: { $max: '$createdAt' }
        }
      }
    ]),
    CommunicationRetry.aggregate([
      {
        $match: {
          status: { $in: ['queued', 'retrying', 'dead'] },
          $or: [
            { createdAt: { $gte: window.since } },
            { updatedAt: { $gte: window.since } }
          ]
        }
      },
      {
        $group: {
          _id: {
            eventKey: '$eventKey',
            status: '$status'
          },
          count: { $sum: 1 },
          lastSeenAt: { $max: '$updatedAt' }
        }
      }
    ])
  ]);

  const byEvent = new Map();
  for (const row of logRows) {
    const item = getDeliveryDigestEvent(byEvent, row._id);
    item.failedLogs = row.failedLogs || 0;
    item.lastSeenAt = maxDate(item.lastSeenAt, row.lastSeenAt);
  }
  for (const row of retryRows) {
    const item = getDeliveryDigestEvent(byEvent, row._id?.eventKey);
    const status = row._id?.status;
    if (status === 'dead') item.deadRetries += row.count || 0;
    if (status === 'queued') item.queuedRetries += row.count || 0;
    if (status === 'retrying') item.retryingRetries += row.count || 0;
    item.lastSeenAt = maxDate(item.lastSeenAt, row.lastSeenAt);
  }

  const allEvents = Array.from(byEvent.values())
    .map((item) => ({
      ...item,
      totalFailures: item.failedLogs + item.deadRetries + item.queuedRetries + item.retryingRetries
    }))
    .filter((item) => item.totalFailures > 0)
    .sort((a, b) => b.totalFailures - a.totalFailures || String(a.eventKey).localeCompare(String(b.eventKey)));

  return {
    ...window,
    totalFailures: allEvents.reduce((sum, item) => sum + item.totalFailures, 0),
    events: allEvents.slice(0, limit)
  };
}

function getDeliveryDigestEvent(byEvent, eventKey) {
  const safeEventKey = String(eventKey || 'unknown').trim() || 'unknown';
  if (!byEvent.has(safeEventKey)) {
    byEvent.set(safeEventKey, {
      eventKey: safeEventKey,
      failedLogs: 0,
      queuedRetries: 0,
      retryingRetries: 0,
      deadRetries: 0,
      lastSeenAt: null
    });
  }
  return byEvent.get(safeEventKey);
}

function maxDate(left, right) {
  if (!left) return right || null;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function buildLogQuery(filters = {}) {
  const normalized = normalizeLogFilters(filters);
  const query = {};
  if (normalized.eventKey) query.eventKey = normalized.eventKey;
  if (normalized.channel) query.channel = normalized.channel;
  if (normalized.status) query.status = normalized.status;
  if (normalized.recipient) query.recipientEmail = new RegExp(escapeRegex(normalized.recipient), 'i');
  return query;
}

function normalizeLogFilters(filters = {}) {
  return {
    eventKey: String(filters.eventKey || '').trim(),
    channel: String(filters.channel || '').trim(),
    status: String(filters.status || '').trim(),
    recipient: String(filters.recipient || '').trim().slice(0, 120)
  };
}

function normalizeGlobalSettings(input = {}) {
  return {
    emailSystemEnabled: normalizeBoolean(input.emailSystemEnabled),
    inAppNotificationsEnabled: normalizeBoolean(input.inAppNotificationsEnabled),
    emailMaintenanceMode: normalizeBoolean(input.emailMaintenanceMode),
    dailyEmailLimit: normalizeInt(input.dailyEmailLimit, 0, 100000, 100),
    reservedCriticalEmailCount: normalizeInt(input.reservedCriticalEmailCount, 0, 100000, 30),
    softStopThreshold: normalizeInt(input.softStopThreshold, 0, 100000, 80),
    hardStopThreshold: normalizeInt(input.hardStopThreshold, 0, 100000, 100)
  };
}

function validateGlobalSettings(values) {
  if (values.reservedCriticalEmailCount > values.softStopThreshold) {
    throw new Error('Reserved critical emails must be less than or equal to the soft stop threshold.');
  }
  if (values.softStopThreshold > values.hardStopThreshold) {
    throw new Error('Soft stop threshold must be less than or equal to hard stop threshold.');
  }
  if (values.hardStopThreshold > values.dailyEmailLimit) {
    throw new Error('Hard stop threshold must be less than or equal to daily email limit.');
  }
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function normalizeInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

async function sendEventEmail(eventKey, payload = {}) {
  const email = payload.email || {};
  if (eventKey === 'organiser.payment_reminder') {
    return emailService.sendOrganizerPaymentReminderEmail(email.to, email.firstName, email.eventTitle, email.eventUrl, email.confirmationCode);
  }
  if (eventKey === 'account.welcome') {
    return emailService.sendWelcomeEmail(email.to, email.firstName);
  }
  if (eventKey === 'account.email_verification') {
    return emailService.sendVerificationEmail(email.to, email.verificationToken, email.firstName, email.role);
  }
  if (eventKey === 'account.password_reset') {
    return emailService.sendPasswordResetEmail(email.to, email.resetToken, email.firstName);
  }
  if (eventKey === 'account.password_reset_confirmation') {
    return emailService.sendPasswordResetConfirmation(email.to, email.firstName);
  }
  if (eventKey === 'organiser.application_submitted') {
    return emailService.sendApplicationSubmittedEmail(email.to, email.firstName, email.applicationId);
  }
  if (eventKey === 'organiser.application_approved') {
    return emailService.sendApplicationApprovedEmail(email.to, email.firstName);
  }
  if (eventKey === 'organiser.application_rejected') {
    return emailService.sendApplicationRejectedEmail(email.to, email.firstName, email.rejectionReason);
  }
  if (eventKey === 'event.published') {
    return emailService.sendEventPublishedEmailToOrganizer(
      email.to,
      email.firstName,
      email.eventTitle,
      email.eventUrl,
      email.approvalNote
    );
  }
  if (eventKey === 'registration.confirmed') {
    return emailService.sendEventRegistrationConfirmationEmail(
      email.to,
      email.firstName,
      email.eventTitle,
      email.confirmationCode,
      email.participationMode,
      email.eventStartAt,
      email.raceDistance
    );
  }
  if (eventKey === 'payment.receipt_submitted') {
    return emailService.sendPaymentProofSubmittedEmailToOrganizer(
      email.to,
      email.organizerFirstName,
      email.runnerName,
      email.eventTitle,
      email.confirmationCode
    );
  }
  if (eventKey === 'payment.approved') {
    return emailService.sendPaymentApprovedEmailToRunner(email.to, email.firstName, email.eventTitle, email.confirmationCode);
  }
  if (eventKey === 'payment.rejected') {
    return emailService.sendPaymentRejectedEmailToRunner(
      email.to,
      email.firstName,
      email.eventTitle,
      email.confirmationCode,
      email.rejectionReason,
      email.reviewNotes
    );
  }
  if (eventKey === 'result.approved') {
    return emailService.sendResultApprovedEmailToRunner(
      email.to,
      email.firstName,
      email.eventTitle,
      email.confirmationCode,
      email.elapsedLabel
    );
  }
  if (eventKey === 'result.rejected') {
    return emailService.sendResultRejectedEmailToRunner(
      email.to,
      email.firstName,
      email.eventTitle,
      email.confirmationCode,
      email.rejectionReason,
      email.reviewNotes
    );
  }
  if (eventKey === 'certificate.issued') {
    return emailService.sendCertificateIssuedEmailToRunner(
      email.to,
      email.firstName,
      email.eventTitle,
      email.confirmationCode,
      email.certificateUrl
    );
  }
  if (eventKey === 'badge.earned') {
    return emailService.sendBadgeEarnedEmailToRunner(
      email.to,
      email.firstName,
      email.badgeName,
      email.badgeDescription,
      email.badgeUrl,
      {
        badgeType: email.badgeType,
        badgeScope: email.badgeScope
      }
    );
  }
  if (eventKey === 'event.promotion') {
    return emailService.sendEventPromotionEmail(
      email.to,
      email.firstName,
      email.eventTitle,
      email.posterUrl,
      email.eventUrl,
      email.organiserName
    );
  }
  throw new Error(`No email sender registered for ${eventKey}`);
}

function getSubjectForEvent(eventKey, payload = {}) {
  const email = payload.email || {};
  const eventTitle = email.eventTitle || 'HelloRun';
  const subjects = {
    'account.email_verification': 'Verify Your HelloRun Email',
    'account.password_reset': 'Reset Your HelloRun Password',
    'account.password_reset_confirmation': 'Your HelloRun Password Has Been Reset',
    'organiser.application_submitted': 'Application Received - HelloRun Organizer',
    'organiser.application_approved': 'Your organiser application has been approved',
    'organiser.application_rejected': 'Update on Your Organizer Application - HelloRun',
    'event.published': `Event Published: ${eventTitle}`,
    'registration.confirmed': `Registration Confirmed: ${eventTitle}`,
    'payment.receipt_submitted': `Payment Receipt Submitted: ${eventTitle}`,
    'payment.approved': `Payment Approved: ${eventTitle}`,
    'payment.rejected': `Payment Rejected: ${eventTitle}`,
    'result.approved': `Result Approved: ${eventTitle}`,
    'result.rejected': `Result Rejected: ${eventTitle}`,
    'certificate.issued': `Certificate Available: ${eventTitle}`,
    'badge.earned': `Badge Earned: ${email.badgeName || 'Achievement Badge'}`,
    'event.promotion': `Don't miss it: ${eventTitle} — Register Now`
  };
  return subjects[eventKey] || eventKey;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  GLOBAL_SETTING_KEY,
  getCommunicationSetting,
  seedCommunicationEvents,
  listEventSettings,
  updateGlobalSettings,
  updateEventSetting,
  notify,
  sendTestEmail,
  getCommunicationDeliveryDigest,
  getCommunicationFailureDetail,
  classifyCommunicationFailure,
  groupCommunicationFailureCauses,
  getAdminCommunicationPageData
};
