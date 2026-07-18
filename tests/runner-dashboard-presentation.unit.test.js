'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRunnerDashboardPresentation,
  compareDashboardJourneyCards,
  getDashboardJourneyPriority,
  isDashboardHistoryCard
} = require('../src/services/runner-data.service');

function card(id, state, overrides = {}) {
  return {
    registrationId: id,
    eventTitle: `Event ${id}`,
    state,
    stateLabel: state,
    eventStartAt: '2026-09-01T00:00:00.000Z',
    submissionDeadlineAt: '2026-08-31T00:00:00.000Z',
    payment: { status: 'paid' },
    ...overrides
  };
}

test('canonical journey follows runner task priority and excludes the primary row', () => {
  const cards = [
    card('upcoming', 'registration_ready'),
    card('review', 'submitted'),
    card('challenge', 'in_progress', { isAccumulated: true }),
    card('certificate', 'certificate_ready'),
    card('ready', 'not_submitted'),
    card('urgent', 'not_submitted', { submissionDeadlineTone: 'urgent' }),
    card('unpaid', 'payment_required', { payment: { status: 'unpaid' } }),
    card('result-rejected', 'rejected'),
    card('payment-rejected', 'payment_required', { payment: { status: 'proof_rejected' } })
  ];

  assert.deepEqual(cards.slice().sort(compareDashboardJourneyCards).map((item) => item.registrationId), [
    'payment-rejected', 'result-rejected', 'unpaid', 'urgent', 'ready', 'certificate', 'challenge', 'review', 'upcoming'
  ]);
  const presentation = buildRunnerDashboardPresentation({ cards });
  assert.equal(presentation.primaryJourney.registrationId, 'payment-rejected');
  assert.equal(presentation.secondaryJourneys.some((item) => item.registrationId === 'payment-rejected'), false);
});

test('equal-priority journeys use deadline, event date, recent activity, and stable ID', () => {
  const candidates = [
    card('later', 'not_submitted', { submissionDeadlineAt: '2026-08-20T00:00:00.000Z' }),
    card('recent-z', 'not_submitted', { submissionDeadlineAt: '2026-08-10T00:00:00.000Z', submittedAt: '2026-07-12T00:00:00.000Z' }),
    card('recent-a', 'not_submitted', { submissionDeadlineAt: '2026-08-10T00:00:00.000Z', submittedAt: '2026-07-12T00:00:00.000Z' }),
    card('older', 'not_submitted', { submissionDeadlineAt: '2026-08-10T00:00:00.000Z', submittedAt: '2026-07-01T00:00:00.000Z' })
  ];
  assert.deepEqual(candidates.sort(compareDashboardJourneyCards).map((item) => item.registrationId), ['recent-a', 'recent-z', 'older', 'later']);
});

test('history is excluded while an accumulated certificate remains actionable', () => {
  const completedCertificate = card('completed-cert', 'certificate_ready', {
    nextAction: { type: 'download_certificate', href: '/certificate', label: 'Download Certificate' }
  });
  assert.equal(isDashboardHistoryCard(card('approved', 'approved')), true);
  assert.equal(isDashboardHistoryCard(card('missed', 'missed')), true);
  assert.equal(isDashboardHistoryCard(card('cancelled', 'cancelled')), true);
  assert.equal(isDashboardHistoryCard(card('cancelled-registration', 'registration_not_ready', { registrationStatus: 'cancelled' })), true);
  assert.equal(isDashboardHistoryCard(card('refunded-payment', 'payment_required', { paymentStatus: 'refunded' })), true);
  assert.equal(isDashboardHistoryCard(completedCertificate), false);
  assert.equal(getDashboardJourneyPriority(completedCertificate), 5);

  const presentation = buildRunnerDashboardPresentation({
    cards: [card('old', 'approved'), completedCertificate]
  });
  assert.equal(presentation.primaryJourney.registrationId, 'completed-cert');
  assert.equal(presentation.historyCount, 1);
});

test('setup is contextual and account restriction remains one separate alert', () => {
  const profileSetup = buildRunnerDashboardPresentation({
    cards: [],
    user: { accountStatus: 'active' },
    profileCompleteness: { missingFields: ['mobile', 'date of birth'] }
  });
  assert.equal(profileSetup.setup.type, 'profile');
  assert.equal(profileSetup.accountAlert, null);

  const restricted = buildRunnerDashboardPresentation({
    cards: [],
    user: { accountStatus: 'restricted' },
    profileCompleteness: { missingFields: [] }
  });
  assert.equal(restricted.setup.type, 'discover');
  assert.equal(restricted.accountAlert.label, 'Contact Support');
});

test('snapshot, support content, and tool counts are normalized in one presentation object', () => {
  const presentation = buildRunnerDashboardPresentation({
    cards: [card('history', 'completed')],
    snapshot: { activeEvents: 2 },
    recentActivity: [{ id: 'activity-1' }],
    latestAchievement: { title: '10K finisher' },
    unavailableHistoryCount: 2,
    toolCounts: { submissions: '3', achievements: 2, groups: 1, savedEvents: 4 }
  });
  assert.equal(presentation.snapshot.activeEvents, 2);
  assert.equal(presentation.recentActivity.length, 1);
  assert.equal(presentation.latestAchievement.title, '10K finisher');
  assert.deepEqual(presentation.toolCounts, { submissions: 3, achievements: 2, groups: 1, savedEvents: 4, history: 3 });
});

test('dashboard identity prefers display name and provides safe avatar presentation', () => {
  const displayIdentity = buildRunnerDashboardPresentation({
    user: { displayName: 'Trail Henz', firstName: 'Henson', avatarUrl: ' https://images.example/runner.webp ' }
  }).identity;
  assert.deepEqual(displayIdentity, {
    displayName: 'Trail Henz',
    initials: 'TH',
    avatarUrl: 'https://images.example/runner.webp',
    profileUrl: '/runner/profile'
  });

  assert.equal(buildRunnerDashboardPresentation({ user: { firstName: 'Henson' } }).identity.displayName, 'Henson');
  assert.equal(buildRunnerDashboardPresentation({ user: {} }).identity.displayName, 'Runner');
  assert.equal(buildRunnerDashboardPresentation({ user: {} }).identity.initials, 'R');
});
