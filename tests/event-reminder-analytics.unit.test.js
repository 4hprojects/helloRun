const test = require('node:test');
const assert = require('node:assert/strict');
const EventReminderDelivery = require('../src/models/EventReminderDelivery');
const CommunicationLog = require('../src/models/CommunicationLog');
const CommunicationRetry = require('../src/models/CommunicationRetry');
const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const { queryEventReminderActivation } = require('../src/services/platform-analytics.service');

function chain(result) {
  return {
    sort() { return this; },
    select() { return this; },
    lean: async () => result
  };
}

function patch(model, method, impl) {
  const original = model[method];
  model[method] = impl;
  return () => { model[method] = original; };
}

test('reminder analytics attributes a post-delivery activity before deadline', async () => {
  const deliveredAt = new Date('2026-09-10T00:00:00Z');
  const deadlineAt = new Date('2026-09-11T00:00:00Z');
  const restores = [
    patch(EventReminderDelivery, 'find', () => chain([{
      _id: 'delivery-1', registrationId: 'registration-1', reminderType: 'submission_due',
      status: 'completed', inAppStatus: 'sent', emailStatus: 'queued', deliveredAt, deadlineAt
    }])),
    patch(CommunicationLog, 'find', () => chain([{
      status: 'sent', sentAt: deliveredAt, metadata: { reminderDeliveryId: 'delivery-1' }
    }])),
    patch(CommunicationRetry, 'find', () => chain([{
      status: 'sent', sentAt: deliveredAt, metadata: { reminderDeliveryId: 'delivery-1' }
    }])),
    patch(Submission, 'find', () => chain([{
      registrationId: 'registration-1', submittedAt: new Date('2026-09-10T03:00:00Z')
    }])),
    patch(AccumulatedActivitySubmission, 'find', () => chain([]))
  ];
  try {
    const result = await queryEventReminderActivation(new Date('2026-09-01T00:00:00Z'));
    assert.equal(result.uniqueRemindedRegistrations, 1);
    assert.equal(result.convertedRegistrations, 1);
    assert.equal(result.submissionConversionRate, 100);
    assert.equal(result.byType.find((row) => row.reminderType === 'submission_due').emailSent, 1);
  } finally {
    restores.forEach((restore) => restore());
  }
});

test('reminder analytics returns a stable zero state', async () => {
  const restore = patch(EventReminderDelivery, 'find', () => chain([]));
  try {
    const result = await queryEventReminderActivation(new Date());
    assert.equal(result.uniqueRemindedRegistrations, 0);
    assert.equal(result.convertedRegistrations, 0);
    assert.equal(result.submissionConversionRate, 0);
    assert.equal(result.byType.length, 2);
  } finally {
    restore();
  }
});
