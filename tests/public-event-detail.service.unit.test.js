const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPublicEventRunnerState } = require('../src/services/public-event-detail.service');
const { parseDistanceLabelKm } = require('../src/services/accumulated-target.service');

const NOW = new Date('2026-07-17T04:00:00.000Z');

function buildEvent(overrides = {}) {
  return {
    slug: 'july-active-quest-virtual-run',
    feeMode: 'free',
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: 200,
    eventStartAt: '2026-07-01T00:00:00.000Z',
    eventEndAt: '2026-07-31T23:59:00.000Z',
    finalSubmissionDeadlineAt: '2026-08-14T23:59:00.000Z',
    virtualWindow: {
      startAt: '2026-07-01T00:00:00.000Z',
      endAt: '2026-07-31T23:59:00.000Z'
    },
    raceCategories: [
      { categoryId: 'c25', name: '25K Starter', distanceKm: 25 },
      { categoryId: 'c100', name: '100K Active', distanceKm: 100 }
    ],
    ...overrides
  };
}

function buildRegistration(overrides = {}) {
  return {
    _id: 'registration-1',
    status: 'confirmed',
    paymentStatus: 'paid',
    raceDistance: '25K JULY STARTER QUEST',
    participationMode: 'virtual',
    confirmationCode: 'HR-JULY25',
    pricingSnapshot: {},
    ...overrides
  };
}

test('descriptive accumulated distance labels resolve their leading kilometre target', () => {
  assert.equal(parseDistanceLabelKm('25K JULY STARTER QUEST'), 25);
  assert.equal(parseDistanceLabelKm('100 KM Active Quest'), 100);
  assert.equal(parseDistanceLabelKm('not a distance'), null);
});

test('runner presentation keeps verified and pending progress separate', () => {
  const state = buildPublicEventRunnerState({
    event: buildEvent(),
    registration: buildRegistration(),
    activities: [
      { _id: 'pending-1', status: 'submitted', distanceKm: 4.5, submittedAt: '2026-07-16T00:00:00.000Z' },
      { _id: 'approved-1', status: 'approved', distanceKm: 10.25, submittedAt: '2026-07-15T00:00:00.000Z' }
    ],
    now: NOW
  });

  assert.equal(state.targetDistanceKm, 25);
  assert.equal(state.approvedDistanceKm, 10.25);
  assert.equal(state.pendingDistanceKm, 4.5);
  assert.equal(state.remainingDistanceKm, 14.75);
  assert.equal(state.progressPercentage, 41);
  assert.equal(state.state, 'pending');
  assert.equal(state.primaryAction.href, '/runner/submissions');
  assert.equal(state.secondaryAction.type, 'submit');
});

test('runner presentation preserves over-target totals while clamping the visual bar', () => {
  const state = buildPublicEventRunnerState({
    event: buildEvent(),
    registration: buildRegistration(),
    activities: [{ _id: 'approved-1', status: 'approved', distanceKm: 31.5, reviewedAt: '2026-07-16T00:00:00.000Z' }],
    now: NOW
  });

  assert.equal(state.completed, true);
  assert.equal(state.progressPercentage, 126);
  assert.equal(state.progressBarPercentage, 100);
  assert.equal(state.remainingDistanceKm, 0);
  assert.equal(state.overGoalDistanceKm, 6.5);
  assert.equal(state.state, 'goal_reached');
  assert.equal(state.primaryAction.type, 'submit');
  assert.equal(state.primaryAction.label, 'Add activity');
});

test('completed challenge separates pending overage and waits for event-wide final reviews', () => {
  const open = buildPublicEventRunnerState({
    event: buildEvent(),
    registration: buildRegistration(),
    activities: [
      { _id: 'approved', status: 'approved', distanceKm: 25 },
      { _id: 'pending', status: 'submitted', distanceKm: 5 }
    ],
    now: NOW
  });
  assert.equal(open.approvedDistanceKm, 25);
  assert.equal(open.pendingDistanceKm, 5);
  assert.equal(open.potentialDistanceKm, 30);
  assert.equal(open.primaryAction.label, 'Add activity');

  const closed = buildPublicEventRunnerState({
    event: buildEvent({ finalSubmissionDeadlineAt: '2026-07-16T00:00:00.000Z' }),
    registration: buildRegistration(),
    activities: [{ _id: 'approved', status: 'approved', distanceKm: 25 }],
    eventPendingActivityCount: 1,
    now: NOW
  });
  assert.equal(closed.state, 'final_reviews');
  assert.equal(closed.primaryAction.href, '/runner/submissions');
});

test('runner presentation distinguishes rejected, pre-window, and closed states', () => {
  const rejected = buildPublicEventRunnerState({
    event: buildEvent(),
    registration: buildRegistration(),
    activities: [{ _id: 'rejected-1', status: 'rejected', distanceKm: 5, submittedAt: '2026-07-16T00:00:00.000Z' }],
    now: NOW
  });
  assert.equal(rejected.state, 'rejected');
  assert.equal(rejected.primaryAction.type, 'resubmit');

  const beforeWindow = buildPublicEventRunnerState({
    event: buildEvent({
      eventStartAt: '2026-08-01T00:00:00.000Z',
      virtualWindow: { startAt: '2026-08-01T00:00:00.000Z', endAt: '2026-08-31T23:59:00.000Z' },
      finalSubmissionDeadlineAt: '2026-09-07T23:59:00.000Z'
    }),
    registration: buildRegistration(),
    activities: [],
    now: NOW
  });
  assert.equal(beforeWindow.state, 'registered');
  assert.equal(beforeWindow.primaryAction.href, '/my-registrations');

  const closed = buildPublicEventRunnerState({
    event: buildEvent({ finalSubmissionDeadlineAt: '2026-07-16T00:00:00.000Z' }),
    registration: buildRegistration(),
    activities: [],
    now: NOW
  });
  assert.equal(closed.state, 'submission_closed');
  assert.equal(closed.stateLabel, 'Challenge ended');
  assert.equal(closed.primaryAction, null);
});

test('event detail does not call an ended challenge in progress during its submission grace period', () => {
  const event = buildEvent({
    eventStartAt: '2026-06-01T00:00:00.000Z',
    eventEndAt: '2026-06-30T23:59:00.000Z',
    virtualWindow: { startAt: '2026-06-01T00:00:00.000Z', endAt: '2026-06-30T23:59:00.000Z' },
    finalSubmissionDeadlineAt: '2026-07-20T23:59:00.000Z'
  });
  const grace = buildPublicEventRunnerState({
    event,
    registration: buildRegistration(),
    activities: [{ _id: 'approved-1', status: 'approved', distanceKm: 10 }],
    now: NOW
  });
  assert.equal(grace.state, 'final_submission_open');
  assert.equal(grace.stateLabel, 'Final submissions open');
  assert.equal(grace.primaryAction.type, 'submit');

  const review = buildPublicEventRunnerState({
    event,
    registration: buildRegistration(),
    activities: [{ _id: 'pending-1', status: 'submitted', distanceKm: 10 }],
    now: NOW
  });
  assert.equal(review.state, 'pending');
  assert.equal(review.stateLabel, 'Awaiting final review');
  assert.equal(review.secondaryAction, null);
});

test('race-result events remain outside the accumulated runner presentation', () => {
  assert.equal(buildPublicEventRunnerState({
    event: buildEvent({ virtualCompletionMode: 'single_activity' }),
    registration: buildRegistration(),
    activities: [],
    now: NOW
  }), null);
});

test('missing accumulated targets remain explicit instead of fabricating progress', () => {
  const state = buildPublicEventRunnerState({
    event: buildEvent({ targetDistanceKm: null, raceCategories: [] }),
    registration: buildRegistration({ raceDistance: 'Open challenge' }),
    activities: [{ status: 'approved', distanceKm: 8 }],
    now: NOW
  });

  assert.equal(state.targetDistanceKm, 0);
  assert.equal(state.progressPercentage, null);
  assert.equal(state.progressLabel, 'Progress unavailable');
  assert.equal(state.remainingDistanceLabel, 'Goal not listed');
});
