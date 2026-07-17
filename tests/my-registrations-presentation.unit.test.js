'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMyRegistrationsPresentation } = require('../src/services/runner-data.service');

const NOW = new Date('2026-07-17T00:00:00.000Z');

function registration(id, overrides = {}) {
  return {
    _id: id,
    status: 'confirmed',
    paymentStatus: 'paid',
    participationMode: 'virtual',
    raceDistance: '10K',
    registeredAt: '2026-07-01T00:00:00.000Z',
    confirmationCode: `HR-${id}`,
    eventId: {
      _id: `event-${id}`,
      title: `Event ${id}`,
      slug: `event-${id}`,
      status: 'published',
      eventStartAt: '2026-07-01T00:00:00.000Z',
      eventEndAt: '2026-07-31T00:00:00.000Z',
      finalSubmissionDeadlineAt: '2026-08-02T00:00:00.000Z',
      feeMode: 'free',
      virtualCompletionMode: 'single_activity'
    },
    ...overrides
  };
}

test('groups registration work by runner urgency and keeps payment review separate', () => {
  const registrations = [
    registration('payment-rejected', {
      paymentStatus: 'proof_rejected',
      status: 'pending_payment',
      eventId: { ...registration('x').eventId, feeMode: 'paid', slug: 'payment-rejected' }
    }),
    registration('unpaid', {
      paymentStatus: 'unpaid',
      status: 'pending_payment',
      eventId: { ...registration('x').eventId, feeMode: 'paid', slug: 'unpaid' }
    }),
    registration('payment-review', {
      paymentStatus: 'proof_submitted',
      status: 'pending_payment',
      eventId: { ...registration('x').eventId, feeMode: 'paid', slug: 'payment-review' }
    }),
    registration('activity-rejected'),
    registration('ready'),
    registration('future', {
      eventId: { ...registration('x').eventId, slug: 'future', eventStartAt: '2026-08-10T00:00:00.000Z' }
    }),
    registration('cancelled', { status: 'cancelled' }),
    registration('refunded', { paymentStatus: 'refunded' }),
    registration('unavailable', { eventId: null })
  ];
  const submissions = [
    { _id: 'submission-rejected', registrationId: { _id: 'activity-rejected' }, status: 'rejected', rejectionReason: 'Upload a clearer screenshot.' },
    { _id: 'submission-approved', registrationId: 'cancelled', status: 'approved' }
  ];

  const result = buildMyRegistrationsPresentation(registrations, { standardSubmissions: submissions }, { now: NOW });

  assert.deepEqual(result.groups.nextActions.map((item) => item.registrationId), [
    'payment-rejected',
    'activity-rejected',
    'unpaid',
    'ready'
  ]);
  assert.deepEqual(result.groups.active.map((item) => item.registrationId), ['payment-review', 'future']);
  assert.deepEqual(result.groups.history.map((item) => item.registrationId), ['cancelled', 'refunded', 'unavailable']);
  assert.equal(result.counts.underReview, 1);
  assert.equal(result.groups.active[0].action.targetId, 'payment-payment-review');
  assert.equal(result.groups.nextActions[0].action.type, 'payment_disclosure');
  assert.equal(result.groups.nextActions[0].activityStatusLabel, 'Waiting for payment');
  assert.equal(result.groups.nextActions[1].action.type, 'resubmit');
  assert.equal(result.groups.history.at(-1).action.href, '/contact');
  assert.equal(result.counts.total, registrations.length);
});

test('accumulated challenges expose verified, pending, and remaining progress without mixing totals', () => {
  const registrations = [registration('challenge', {
    raceDistance: '100K',
    eventId: {
      ...registration('x').eventId,
      slug: 'challenge',
      virtualCompletionMode: 'accumulated_distance',
      targetDistanceKm: 100
    }
  })];
  const accumulatedActivities = [
    { _id: 'approved', registrationId: 'challenge', status: 'approved', distanceKm: 42 },
    { _id: 'pending', registrationId: 'challenge', status: 'submitted', distanceKm: 8 },
    { _id: 'rejected', registrationId: 'challenge', status: 'rejected', distanceKm: 5 }
  ];

  const result = buildMyRegistrationsPresentation(registrations, { accumulatedActivities }, { now: NOW });
  const item = result.groups.active[0];

  assert.equal(item.card.progress.approvedDistanceKm, 42);
  assert.equal(item.card.progress.pendingDistanceKm, 8);
  assert.equal(item.card.progress.remainingDistanceKm, 58);
  assert.equal(item.card.progress.approvedActivityCount, 1);
  assert.equal(item.card.progress.pendingActivityCount, 1);
  assert.equal(item.action.type, 'submit');
});

test('closed submission records move to history and do not offer an upload action', () => {
  const closed = registration('closed', {
    eventId: {
      ...registration('x').eventId,
      slug: 'closed',
      eventEndAt: '2026-07-10T00:00:00.000Z',
      finalSubmissionDeadlineAt: '2026-07-16T00:00:00.000Z'
    }
  });
  const result = buildMyRegistrationsPresentation([closed], {}, { now: NOW });

  assert.equal(result.groups.history.length, 1);
  assert.equal(result.groups.history[0].card.stateLabel, 'Submission Closed');
  assert.equal(result.groups.history[0].action.label, 'View Event');
  assert.equal(result.groups.history[0].action.type, 'link');
});
