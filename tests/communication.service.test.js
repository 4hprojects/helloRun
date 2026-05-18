const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const CommunicationSetting = require('../src/models/CommunicationSetting');
const CommunicationEventSetting = require('../src/models/CommunicationEventSetting');
const CommunicationLog = require('../src/models/CommunicationLog');
const DailyEmailUsage = require('../src/models/DailyEmailUsage');
const emailService = require('../src/services/email.service');
const communicationService = require('../src/services/communication.service');
const {
  decideEmailSend,
  getDateKey,
  incrementSentEmail
} = require('../src/services/email-budget.service');
const { COMMUNICATION_EVENTS } = require('../src/services/communication-events.registry');

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
  await cleanupCommunicationState();
  await mongoose.disconnect();
});

test.afterEach(async () => {
  await cleanupCommunicationState();
});

test('communication seed is idempotent and locked account email cannot be disabled', async () => {
  await communicationService.seedCommunicationEvents();
  await communicationService.seedCommunicationEvents();

  const count = await CommunicationEventSetting.countDocuments({
    eventKey: { $in: COMMUNICATION_EVENTS.map((event) => event.eventKey) }
  });
  assert.equal(count, COMMUNICATION_EVENTS.length);

  const locked = await CommunicationEventSetting.findOne({ eventKey: 'account.email_verification' }).lean();
  assert.equal(locked.emailEnabled, true);
  assert.equal(locked.locked, true);

  await assert.rejects(
    () => communicationService.updateEventSetting('account.email_verification', { emailEnabled: 'off', inAppEnabled: 'off' }, 'test-admin'),
    /locked communication events cannot have email disabled/i
  );
});

test('email budget gates low and medium email at soft stop and preserves critical email at hard stop', async () => {
  const settings = {
    provider: 'communication-budget-test',
    dailyEmailLimit: 5,
    reservedCriticalEmailCount: 0,
    softStopThreshold: 3,
    hardStopThreshold: 5,
    emailSystemEnabled: true,
    emailMaintenanceMode: false
  };

  let decision = await decideEmailSend({
    settings,
    eventSetting: { eventKey: 'payment.rejected', priority: 'high', emailEnabled: true }
  });
  assert.equal(decision.allowed, true);

  await DailyEmailUsage.updateOne(
    { dateKey: getDateKey(), provider: settings.provider },
    {
      $set: {
        totalLimit: settings.dailyEmailLimit,
        sentCount: 3
      }
    },
    { upsert: true }
  );

  decision = await decideEmailSend({
    settings,
    eventSetting: { eventKey: 'result.approved', priority: 'medium', emailEnabled: true }
  });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /soft stop/i);

  decision = await decideEmailSend({
    settings,
    eventSetting: { eventKey: 'payment.rejected', priority: 'high', emailEnabled: true }
  });
  assert.equal(decision.allowed, true);

  await DailyEmailUsage.updateOne(
    { dateKey: getDateKey(), provider: settings.provider },
    { $set: { sentCount: 5 } }
  );

  decision = await decideEmailSend({
    settings,
    eventSetting: { eventKey: 'payment.rejected', priority: 'high', emailEnabled: true }
  });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /hard stop/i);

  decision = await decideEmailSend({
    settings,
    eventSetting: { eventKey: 'account.password_reset', priority: 'critical', emailEnabled: true, locked: true }
  });
  assert.equal(decision.allowed, true);
});

test('daily usage increments only for successful quota-counted sends', async () => {
  const settings = {
    provider: 'communication-increment-test',
    dailyEmailLimit: 10
  };

  await incrementSentEmail({ settings, priority: 'high' });

  const usage = await DailyEmailUsage.findOne({ dateKey: getDateKey(), provider: settings.provider }).lean();
  assert.equal(usage.sentCount, 1);
  assert.equal(usage.highSentCount, 1);
  assert.equal(usage.skippedCount, 0);
});

test('notify records sent, skipped, failed, and fallback communication logs', async () => {
  const runner = await createRunner('communication-notify');
  const originalRejected = emailService.sendResultRejectedEmailToRunner;
  const originalApproved = emailService.sendResultApprovedEmailToRunner;

  emailService.sendResultRejectedEmailToRunner = async () => ({ id: 'msg-result-rejected' });
  emailService.sendResultApprovedEmailToRunner = async () => {
    throw new Error('Simulated send failure');
  };

  try {
    await communicationService.notify('result.rejected', {
      notification: buildNotification(runner._id, 'result_rejected'),
      email: {
        to: runner.email,
        recipientUserId: runner._id,
        firstName: runner.firstName,
        eventTitle: 'Communication Event',
        confirmationCode: 'HR-TEST',
        rejectionReason: 'Blurry proof',
        metadata: { testSuite: 'communication' }
      }
    });

    await communicationService.notify('registration.confirmed', {
      notification: buildNotification(runner._id, 'registration_confirmed'),
      email: {
        to: runner.email,
        recipientUserId: runner._id,
        firstName: runner.firstName,
        eventTitle: 'Communication Event',
        confirmationCode: 'HR-TEST',
        metadata: { testSuite: 'communication' }
      }
    });

    await communicationService.updateEventSetting('result.approved', { emailEnabled: 'on', inAppEnabled: 'on' }, 'test-admin');
    await communicationService.notify('result.approved', {
      notification: buildNotification(runner._id, 'result_approved'),
      email: {
        to: runner.email,
        recipientUserId: runner._id,
        firstName: runner.firstName,
        eventTitle: 'Communication Event',
        confirmationCode: 'HR-TEST',
        metadata: { testSuite: 'communication' }
      }
    });
  } finally {
    emailService.sendResultRejectedEmailToRunner = originalRejected;
    emailService.sendResultApprovedEmailToRunner = originalApproved;
  }

  const logs = await CommunicationLog.find({ recipientUserId: runner._id }).lean();
  assert.ok(logs.some((log) => log.eventKey === 'result.rejected' && log.channel === 'email' && log.status === 'sent'));
  assert.ok(logs.some((log) => log.eventKey === 'registration.confirmed' && log.channel === 'email' && log.status === 'skipped'));
  assert.ok(logs.some((log) => log.eventKey === 'result.approved' && log.channel === 'email' && log.status === 'failed'));
  assert.ok(logs.some((log) => log.status === 'fallback_in_app'));
});

test('badge earned email uses communication controls and badge metadata', async () => {
  const runner = await createRunner('communication-badge-earned');
  const originalBadgeEarned = emailService.sendBadgeEarnedEmailToRunner;
  const calls = [];

  emailService.sendBadgeEarnedEmailToRunner = async (...args) => {
    calls.push(args);
    return { id: 'msg-badge-earned' };
  };

  try {
    await communicationService.updateEventSetting('badge.earned', { emailEnabled: 'on', inAppEnabled: 'on' }, 'test-admin');
    await communicationService.notify('badge.earned', {
      notification: buildNotification(runner._id, 'badge_earned'),
      email: {
        to: runner.email,
        recipientUserId: runner._id,
        firstName: runner.firstName,
        badgeName: '100K Club',
        badgeDescription: 'Awarded for verified lifetime distance.',
        badgeUrl: 'https://hellorun.test/badges/badge-100k',
        badgeType: 'global_distance',
        badgeScope: 'global',
        metadata: { testSuite: 'communication', badgeType: 'global_distance' }
      }
    });
  } finally {
    emailService.sendBadgeEarnedEmailToRunner = originalBadgeEarned;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0][2], '100K Club');
  assert.equal(calls[0][5].badgeType, 'global_distance');

  const log = await CommunicationLog.findOne({
    recipientUserId: runner._id,
    eventKey: 'badge.earned',
    channel: 'email'
  }).lean();
  assert.ok(log);
  assert.equal(log.status, 'sent');
  assert.equal(log.subject, 'Badge Earned: 100K Club');
});

test('test email is logged as test and does not create product notifications', async () => {
  const originalTestEmail = emailService.sendBasicTestEmail;
  emailService.sendBasicTestEmail = async () => ({ skipped: true });

  try {
    await communicationService.sendTestEmail({
      to: 'communication.test@example.com',
      subject: 'Test subject',
      message: 'Test message',
      actorId: 'test-admin'
    });
  } finally {
    emailService.sendBasicTestEmail = originalTestEmail;
  }

  const log = await CommunicationLog.findOne({ eventKey: 'admin.test_email', isTest: true }).lean();
  assert.ok(log);
  assert.equal(log.channel, 'email');
  assert.equal(log.status, 'skipped');
  assert.equal(log.quotaCounted, false);
  assert.equal(await Notification.countDocuments({ 'metadata.testSuite': 'communication' }), 0);
});

function buildNotification(userId, type) {
  return {
    userId,
    type,
    title: 'Communication update',
    message: 'Communication update message',
    href: '/runner/notifications',
    metadata: { testSuite: 'communication' }
  };
}

async function createRunner(tag) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return User.create({
    userId: `UCOM${String(stamp).replace(/\D/g, '').slice(-12)}`,
    email: `${tag}.${stamp}@example.com`,
    passwordHash: 'test-password-hash',
    role: 'runner',
    firstName: 'Comm',
    lastName: 'Runner',
    emailVerified: true
  });
}

async function cleanupCommunicationState() {
  await Promise.all([
    User.deleteMany({ email: /communication.*@example\.com$/i }),
    Notification.deleteMany({ 'metadata.testSuite': 'communication' }),
    CommunicationSetting.deleteMany({}),
    CommunicationEventSetting.deleteMany({}),
    CommunicationLog.deleteMany({}),
    DailyEmailUsage.deleteMany({})
  ]);
}
