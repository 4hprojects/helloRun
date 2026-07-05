const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCommunicationRetryKey } = require('../src/services/reliable-communication.service');

function promotionPayload(campaignId) {
  return {
    email: {
      to: 'runner@example.com',
      recipientUserId: 'user-1',
      metadata: {
        eventId: 'event-1',
        campaignId
      }
    }
  };
}

test('retry keys differ across campaigns for the same recipient and event', () => {
  const options = { source: 'event.promotion.admin' };
  const first = buildCommunicationRetryKey('event.promotion', promotionPayload('campaign-1'), options);
  const second = buildCommunicationRetryKey('event.promotion', promotionPayload('campaign-2'), options);

  assert.notEqual(first, second);
});

test('retry keys stay stable within a single campaign', () => {
  const options = { source: 'event.promotion.admin' };
  const first = buildCommunicationRetryKey('event.promotion', promotionPayload('campaign-1'), options);
  const second = buildCommunicationRetryKey('event.promotion', promotionPayload('campaign-1'), options);

  assert.equal(first, second);
});

test('retry keys without campaign metadata remain deterministic', () => {
  const payload = {
    email: {
      to: 'runner@example.com',
      recipientUserId: 'user-1',
      metadata: { registrationId: 'reg-1' }
    }
  };
  const first = buildCommunicationRetryKey('registration.confirmed', payload, { source: 'registration' });
  const second = buildCommunicationRetryKey('registration.confirmed', payload, { source: 'registration' });

  assert.equal(first, second);
});
