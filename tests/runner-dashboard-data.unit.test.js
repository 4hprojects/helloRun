'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRunnerEventProgressCards,
  buildDeadlineDisplay,
  buildChallengeTimingDisplay,
  buildSubmissionTimingDisplay
} = require('../src/services/runner-data.service');

const NOW = new Date('2026-07-15T00:00:00.000Z');

test('deadline display uses textual urgency and closes expired submissions', () => {
  const event = { finalSubmissionDeadlineAt: '2026-07-17T00:00:00.000Z' };
  assert.deepEqual(buildDeadlineDisplay({ participationMode: 'virtual' }, event, NOW), {
    at: new Date('2026-07-17T00:00:00.000Z'),
    daysRemaining: 2,
    tone: 'warning',
    label: '2 days left',
    closed: false
  });
  const closed = buildDeadlineDisplay({ participationMode: 'virtual' }, { finalSubmissionDeadlineAt: '2026-07-14T00:00:00.000Z' }, NOW);
  assert.equal(closed.closed, true);
  assert.equal(closed.label, 'Submission closed');
});

test('July Active Quest counts challenge days to July 31 and keeps the August submission deadline separate', () => {
  const registration = { participationMode: 'virtual' };
  const event = {
    eventEndAt: '2026-07-31T23:59:00.000Z',
    virtualWindow: { endAt: '2026-07-31T23:59:00.000Z' },
    finalSubmissionDeadlineAt: '2026-08-14T23:59:00.000Z'
  };
  const challenge = buildChallengeTimingDisplay(registration, event, NOW);
  const submission = buildSubmissionTimingDisplay(registration, event, NOW);
  assert.equal(challenge.daysRemaining, 16);
  assert.equal(challenge.label, '16 days left');
  assert.equal(submission.daysRemaining, 30);
  assert.equal(submission.label, '30 days left');
});

test('ended challenge remains active while its submission grace period is open', () => {
  const [card] = buildRunnerEventProgressCards([{
    _id: 'grace-registration',
    paymentStatus: 'paid',
    status: 'confirmed',
    participationMode: 'virtual',
    raceDistance: '10K',
    eventId: {
      title: 'Grace Period Run',
      slug: 'grace-period-run',
      status: 'published',
      eventEndAt: '2026-07-14T23:59:00.000Z',
      virtualWindow: { endAt: '2026-07-14T23:59:00.000Z' },
      finalSubmissionDeadlineAt: '2026-07-20T23:59:00.000Z'
    }
  }], {}, { now: NOW });
  assert.equal(card.challengeClosed, true);
  assert.equal(card.challengeLabel, 'Challenge ended');
  assert.equal(card.submissionClosed, false);
  assert.notEqual(card.state, 'missed');
});

test('dashboard card keeps registration snapshot price and payment correction context', () => {
  const [card] = buildRunnerEventProgressCards([{
    _id: 'registration-1',
    paymentStatus: 'proof_rejected',
    status: 'pending_payment',
    raceDistance: '100K',
    paymentAmountDue: 625,
    paymentCurrency: 'PHP',
    addOnsSubtotal: 125,
    paymentRejectionReason: 'Receipt amount does not match the registration total.',
    pricingSnapshot: { packageName: 'Finisher Package', raceCategoryName: '100K Virtual' },
    eventId: { _id: 'event-1', title: 'Distance Builder', slug: 'distance-builder', status: 'published' }
  }], {}, { now: NOW });

  assert.equal(card.state, 'payment_required');
  assert.equal(card.stateLabel, 'Payment Changes Needed');
  assert.equal(card.payment.amount, 625);
  assert.equal(card.payment.packageName, 'Finisher Package');
  assert.equal(card.payment.categoryName, '100K Virtual');
  assert.equal(card.nextAction.label, 'Fix Payment Proof');
  assert.match(card.helperText, /Receipt amount/);
});

test('dashboard card uses the event logo and never falls back to the large banner', () => {
  const baseRegistration = {
    _id: 'event-image-registration',
    paymentStatus: 'unpaid',
    status: 'pending_payment',
    eventId: { title: 'Logo Run', slug: 'logo-run', logoUrl: 'https://cdn.example/logo.webp', bannerImageUrl: 'https://cdn.example/banner.webp' }
  };
  const [logoCard] = buildRunnerEventProgressCards([baseRegistration], {}, { now: NOW });
  assert.equal(logoCard.eventImageUrl, 'https://cdn.example/logo.webp');

  const [fallbackCard] = buildRunnerEventProgressCards([{ ...baseRegistration, eventId: { ...baseRegistration.eventId, logoUrl: '' } }], {}, { now: NOW });
  assert.equal(fallbackCard.eventImageUrl, '/images/helloRun-icon.webp');

  const [whitespaceCard] = buildRunnerEventProgressCards([{ ...baseRegistration, eventId: { ...baseRegistration.eventId, logoUrl: '   ' } }], {}, { now: NOW });
  assert.equal(whitespaceCard.eventImageUrl, '/images/helloRun-icon.webp');
});

test('accumulated progress separates official, pending, rejected, and potential distance', () => {
  const [card] = buildRunnerEventProgressCards([{
    _id: 'registration-2',
    paymentStatus: 'paid',
    status: 'confirmed',
    participationMode: 'virtual',
    raceDistance: '100K',
    eventId: {
      _id: 'event-2',
      title: '100K Builder',
      slug: '100k-builder',
      status: 'published',
      virtualCompletionMode: 'accumulated_distance',
      targetDistanceKm: 100,
      virtualWindow: { endAt: '2026-07-25T00:00:00.000Z' },
      finalSubmissionDeadlineAt: '2026-07-25T00:00:00.000Z'
    }
  }], {
    accumulatedActivities: [
      { _id: 'a1', registrationId: 'registration-2', status: 'approved', distanceKm: 40 },
      { _id: 'a2', registrationId: 'registration-2', status: 'submitted', distanceKm: 10 },
      { _id: 'a3', registrationId: 'registration-2', status: 'rejected', distanceKm: 5 }
    ]
  }, { now: NOW });

  assert.equal(card.progress.approvedDistanceKm, 40);
  assert.equal(card.progress.pendingDistanceKm, 10);
  assert.equal(card.progress.rejectedDistanceKm, 5);
  assert.equal(card.progress.remainingDistanceKm, 60);
  assert.equal(card.progress.potentialDistanceKm, 50);
  assert.equal(card.progress.percent, 40);
  assert.equal(card.progress.suggestedDailyDistanceKm, 6);
});

test('future paid registration is ready rather than incorrectly marked missed', () => {
  const [card] = buildRunnerEventProgressCards([{
    _id: 'registration-3',
    paymentStatus: 'paid',
    status: 'confirmed',
    raceDistance: '10K',
    eventId: {
      title: 'Future Run',
      slug: 'future-run',
      status: 'published',
      virtualCompletionMode: 'single_activity',
      eventStartAt: '2026-07-20T00:00:00.000Z',
      eventEndAt: '2026-07-30T00:00:00.000Z'
    }
  }], {}, { now: NOW });
  assert.equal(card.state, 'registration_ready');
  assert.equal(card.nextAction.label, 'View Event');
});
