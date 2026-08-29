const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DAY_MS,
  getReminderSchedule,
  isStartReminderDue,
  isSubmissionReminderDue,
  isEligibleReminderRegistration,
  buildReminderTimeText
} = require('../src/utils/event-reminder-window');
const { COMMUNICATION_EVENT_MAP } = require('../src/services/communication-events.registry');
const emailService = require('../src/services/email.service');
const EventReminderDelivery = require('../src/models/EventReminderDelivery');
const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const { claimReminderDelivery, hasAnyActivity } = require('../src/services/event-activation-reminder.service');

function patch(model, method, impl) {
  const original = model[method];
  model[method] = impl;
  return () => { model[method] = original; };
}

test('virtual reminders use virtual window and accumulated final deadline', () => {
  const startAt = new Date('2026-09-01T00:00:00Z');
  const deadlineAt = new Date('2026-09-30T16:00:00Z');
  const schedule = getReminderSchedule(
    { participationMode: 'virtual' },
    {
      eventStartAt: new Date('2026-08-01T00:00:00Z'),
      eventEndAt: new Date('2026-10-01T00:00:00Z'),
      virtualWindow: { startAt, endAt: new Date('2026-09-29T00:00:00Z') },
      virtualCompletionMode: 'accumulated_distance',
      finalSubmissionDeadlineAt: deadlineAt
    }
  );
  assert.equal(schedule.startAt.toISOString(), startAt.toISOString());
  assert.equal(schedule.endAt.toISOString(), deadlineAt.toISOString());
  assert.equal(schedule.submissionReminderAt.getTime(), deadlineAt.getTime() - DAY_MS);
});

test('onsite reminders span earliest start through latest check-in end', () => {
  const schedule = getReminderSchedule(
    { participationMode: 'onsite' },
    {
      onsiteCheckinWindows: [
        { startAt: '2026-09-02T01:00:00Z', endAt: '2026-09-02T04:00:00Z' },
        { startAt: '2026-09-01T23:00:00Z', endAt: '2026-09-02T05:00:00Z' }
      ]
    }
  );
  assert.equal(schedule.startAt.toISOString(), '2026-09-01T23:00:00.000Z');
  assert.equal(schedule.endAt.toISOString(), '2026-09-02T05:00:00.000Z');
  assert.equal(schedule.submissionReminderAt, null, 'short events do not receive a simultaneous 24-hour reminder');
});

test('due checks enforce the start grace period and deadline boundary', () => {
  const startAt = new Date('2026-09-01T00:00:00Z');
  const endAt = new Date('2026-09-04T00:00:00Z');
  const schedule = getReminderSchedule({ participationMode: 'virtual' }, { eventStartAt: startAt, eventEndAt: endAt });
  assert.equal(isStartReminderDue(schedule, new Date(startAt.getTime() + 5 * 60 * 1000)), true);
  assert.equal(isStartReminderDue(schedule, new Date(startAt.getTime() + DAY_MS + 1)), false);
  assert.equal(isSubmissionReminderDue(schedule, new Date(endAt.getTime() - DAY_MS)), true);
  assert.equal(isSubmissionReminderDue(schedule, endAt), false);
});

test('a valid start can remind without an end, while submission reminders require a deadline', () => {
  const startAt = new Date('2026-09-01T00:00:00Z');
  const schedule = getReminderSchedule({ participationMode: 'virtual' }, { eventStartAt: startAt });
  assert.equal(isStartReminderDue(schedule, new Date(startAt.getTime() + 60 * 1000)), true);
  assert.equal(isSubmissionReminderDue(schedule, new Date(startAt.getTime() + 60 * 1000)), false);
});

test('eligibility requires an active verified account and settled registration', () => {
  const registration = { participantType: 'account', status: 'confirmed', paymentStatus: 'paid' };
  const event = { status: 'published', isDeleted: false, feeMode: 'paid', feeAmount: 500 };
  const user = { email: 'runner@example.com', accountStatus: 'active', emailVerified: true };
  assert.equal(isEligibleReminderRegistration(registration, event, user), true);
  assert.equal(isEligibleReminderRegistration({ ...registration, participantType: 'guest' }, event, user), false);
  assert.equal(isEligibleReminderRegistration({ ...registration, paymentStatus: 'unpaid' }, event, user), false);
  assert.equal(isEligibleReminderRegistration(registration, { ...event, isDeleted: true }, user), false);
  assert.equal(isEligibleReminderRegistration(registration, event, { ...user, accountStatus: 'suspended' }), false);
  assert.equal(isEligibleReminderRegistration(registration, event, { ...user, emailVerified: false }), false);
  assert.equal(isEligibleReminderRegistration({ ...registration, paymentStatus: 'unpaid' }, { ...event, feeMode: 'free' }, user), true);
});

test('time copy includes runner-local and authoritative Manila times', () => {
  const text = buildReminderTimeText('2026-11-01T05:30:00Z', 'America/New_York');
  assert.match(text, /your time/);
  assert.match(text, /Manila/);
  assert.match(text, /Nov 1, 2026/);
});

test('communication registry exposes independent configurable reminder channels', () => {
  for (const key of ['event.started_reminder', 'result.submission_reminder']) {
    const item = COMMUNICATION_EVENT_MAP.get(key);
    assert.equal(item.emailEnabled, true);
    assert.equal(item.inAppEnabled, true);
    assert.equal(item.locked, false);
  }
});

test('reminder email keeps primary action and official social links', () => {
  const html = emailService.buildEventActivationReminderEmailHtml({
    firstName: 'Kai', eventTitle: 'September Active Run', actionUrl: 'https://hellorun.online/my-registrations#registration-1',
    actionLabel: 'Submit Your Run', scheduleText: 'Sep 30, 2026, 11:59 PM GMT+8', isStart: false
  });
  assert.match(html, /Submit Your Run/);
  assert.match(html, /instagram\.com\/hellorunonline/);
  assert.match(html, /facebook\.com\/hellorunonline/);
  assert.match(html, /authoritative schedule/);
});

test('durable delivery claims are upserted once and recover only stale work', async () => {
  let upsertInput;
  let claimInput;
  const restores = [
    patch(EventReminderDelivery, 'updateOne', async (...args) => { upsertInput = args; return { upsertedCount: 1 }; }),
    patch(EventReminderDelivery, 'findOneAndUpdate', async (...args) => { claimInput = args; return { _id: 'delivery-1' }; })
  ];
  try {
    const now = new Date('2026-09-01T00:00:00Z');
    const result = await claimReminderDelivery({
      registration: { _id: 'registration-1' }, event: { _id: 'event-1' }, user: { _id: 'user-1' },
      reminderType: 'event_started', scheduledFor: now, deadlineAt: new Date('2026-09-03T00:00:00Z'),
      now, staleClaimMs: 30 * 60 * 1000
    });
    assert.equal(result._id, 'delivery-1');
    assert.deepEqual(upsertInput[0], { registrationId: 'registration-1', reminderType: 'event_started' });
    assert.equal(upsertInput[2].upsert, true);
    assert.equal(claimInput[0].$or.some((condition) => condition.status === 'pending'), true);
    assert.equal(claimInput[0].$or.some((condition) => condition.status === 'processing' && condition.claimedAt), true);
    assert.equal(claimInput[1].$inc.attemptCount, 1);
  } finally {
    restores.forEach((restore) => restore());
  }
});

test('any standard or accumulated activity state suppresses the generic reminder', async () => {
  const seen = [];
  const restores = [
    patch(Submission, 'exists', async (query) => { seen.push(query); return { _id: 'rejected-submission' }; }),
    patch(AccumulatedActivitySubmission, 'exists', async (query) => { seen.push(query); return null; })
  ];
  try {
    assert.equal(await hasAnyActivity('registration-1'), true);
    assert.deepEqual(seen, [{ registrationId: 'registration-1' }, { registrationId: 'registration-1' }]);
    assert.equal(seen.some((query) => Object.hasOwn(query, 'status')), false, 'rejected and pending activity must also suppress');
  } finally {
    restores.forEach((restore) => restore());
  }
});
