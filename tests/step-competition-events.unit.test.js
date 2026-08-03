'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isAccumulatedChallenge,
  isStepCompetitionsEnabled,
  normalizeTargetSteps,
  resolveChallengeConfig
} = require('../src/utils/challenge-metrics');
const {
  getCreateEventFormData,
  validateCreateEventForm
} = require('../src/services/event-form.service');
const {
  buildAccumulatedProgress
} = require('../src/services/accumulated-activity.service');
const {
  normalizeMongoSubmission
} = require('../src/services/submission-shadow.service');
const {
  rankAccumulatedRows,
  buildEventLeaderboardGroups
} = require('../src/services/leaderboard.service');
const { buildSubmissionPayload } = require('../src/services/submission.service');

function publishPayload(overrides = {}) {
  return {
    title: 'One Billion Steps Challenge',
    organiserName: 'HelloRun',
    description: 'A sufficiently detailed step challenge description.',
    eventType: 'virtual',
    raceCategoryName: 'Open Steps',
    raceCategoryDistanceLabel: 'Open Steps',
    registrationOpenAt: '2026-09-01T00:00',
    registrationCloseAt: '2026-09-10T00:00',
    eventStartAt: '2026-09-11T00:00',
    eventEndAt: '2026-09-30T00:00',
    virtualStartAt: '2026-09-11T00:00',
    virtualEndAt: '2026-09-30T00:00',
    proofTypesAllowed: ['photo'],
    virtualCompletionMode: 'accumulated_activity',
    challengeMetrics: ['', 'steps'],
    primaryChallengeMetric: 'steps',
    acceptedRunTypes: ['walk'],
    feeMode: 'free',
    actionType: 'publish',
    ...overrides
  };
}

function withStepFeatureEnabled(callback) {
  const previous = process.env.FEATURE_STEP_COMPETITIONS_ENABLED;
  process.env.FEATURE_STEP_COMPETITIONS_ENABLED = 'true';
  try {
    return callback();
  } finally {
    if (previous === undefined) delete process.env.FEATURE_STEP_COMPETITIONS_ENABLED;
    else process.env.FEATURE_STEP_COMPETITIONS_ENABLED = previous;
  }
}

test('legacy accumulated events resolve to distance-only compatibility defaults', () => {
  const config = resolveChallengeConfig({ virtualCompletionMode: 'accumulated_distance', targetDistanceKm: 100 });

  assert.equal(isAccumulatedChallenge('accumulated_distance'), true);
  assert.deepEqual(config.metrics, ['distance']);
  assert.equal(config.primaryMetric, 'distance');
  assert.equal(config.rankingOnly, false);
});

test('step feature flag is disabled by default and accepts only explicit true values', () => {
  assert.equal(isStepCompetitionsEnabled({}), false);
  assert.equal(isStepCompetitionsEnabled({ FEATURE_STEP_COMPETITIONS_ENABLED: 'false' }), false);
  assert.equal(isStepCompetitionsEnabled({ FEATURE_STEP_COMPETITIONS_ENABLED: 'true' }), true);
  assert.equal(isStepCompetitionsEnabled({ FEATURE_STEP_COMPETITIONS_ENABLED: '1' }), true);
});

test('step targets enforce positive integer bounds', () => {
  assert.equal(normalizeTargetSteps('1'), 1);
  assert.equal(normalizeTargetSteps('1000000000'), 1_000_000_000);
  assert.equal(normalizeTargetSteps('0'), null);
  assert.equal(normalizeTargetSteps('1.5'), null);
  assert.equal(normalizeTargetSteps('1000000001'), null);
});

test('step-only organizer form publishes with a named category and no distance goal', () => {
  withStepFeatureEnabled(() => {
    const formData = getCreateEventFormData(publishPayload({ targetSteps: '250000' }));
    const errors = validateCreateEventForm(formData);

    assert.deepEqual(formData.challengeMetrics, ['steps']);
    assert.equal(formData.primaryChallengeMetric, 'steps');
    assert.equal(formData.targetDistanceKm, null);
    assert.equal(formData.targetSteps, 250000);
    assert.equal(errors.challengeMetrics, undefined);
    assert.equal(errors.raceDistances, undefined);
    assert.equal(errors.targetSteps, undefined);
  });
});

test('organizer validation rejects an empty metric selection and invalid primary metric', () => {
  withStepFeatureEnabled(() => {
    const noMetrics = getCreateEventFormData(publishPayload({
      challengeMetrics: [''],
      primaryChallengeMetric: ''
    }));
    assert.equal(
      validateCreateEventForm(noMetrics).challengeMetrics,
      'Select at least one competition metric.'
    );

    const invalidPrimary = getCreateEventFormData(publishPayload({
      challengeMetrics: ['', 'steps'],
      primaryChallengeMetric: 'distance'
    }));
    assert.equal(
      validateCreateEventForm(invalidPrimary).primaryChallengeMetric,
      'Official ranking metric must be one of the tracked metrics.'
    );
  });
});

test('organizer validation keeps step competitions behind the disabled feature flag', () => {
  const formData = getCreateEventFormData(publishPayload());
  assert.equal(validateCreateEventForm(formData).challengeMetrics, 'Step competitions are not enabled yet.');
});

test('step-primary progress separates review states and completes only on approved steps', () => {
  const progress = buildAccumulatedProgress({
    targetSteps: 10_000,
    primaryMetric: 'steps',
    activities: [
      { status: 'approved', steps: 7_500, distanceKm: null, reviewedAt: '2026-09-12T00:00:00Z' },
      { status: 'submitted', steps: 4_000, distanceKm: null, submittedAt: '2026-09-13T00:00:00Z' },
      { status: 'rejected', steps: 2_000, distanceKm: null }
    ]
  });

  assert.equal(progress.approvedSteps, 7_500);
  assert.equal(progress.pendingSteps, 4_000);
  assert.equal(progress.rejectedSteps, 2_000);
  assert.equal(progress.completed, false);
  assert.equal(progress.certificateEligible, false);
  assert.equal(progress.progressPercent, 75);
  assert.equal(progress.potentialSteps, 11_500);
  assert.equal(progress.remainingSteps, 2_500);
});

test('step-only PostgreSQL shadow payload keeps distance null and includes official steps', () => {
  const normalized = normalizeMongoSubmission({
    _id: { toString: () => 'submission' },
    registrationId: { toString: () => 'registration' },
    runnerId: { toString: () => 'runner' },
    eventId: { toString: () => 'event' },
    distanceKm: null,
    steps: 12_345
  });

  assert.equal(normalized.distance_km, null);
  assert.equal(normalized.steps, 12_345);
});

test('step leaderboard uses shared competition ranks and deterministic non-metric tie ordering', () => {
  const ranked = rankAccumulatedRows([
    { _id: 'reg-b', totalSteps: 20_000, totalDistanceKm: 50, finalContributingAt: '2026-09-12T10:00:00Z' },
    { _id: 'reg-c', totalSteps: 10_000, totalDistanceKm: 500, finalContributingAt: '2026-09-11T10:00:00Z' },
    { _id: 'reg-a', totalSteps: 20_000, totalDistanceKm: 5, finalContributingAt: '2026-09-12T09:00:00Z' }
  ], 'steps');

  assert.deepEqual(ranked.map((item) => item.row._id), ['reg-a', 'reg-b', 'reg-c']);
  assert.deepEqual(ranked.map((item) => item.rank), [1, 1, 3]);
});

test('event leaderboard preserves shared ranks within each registration category', () => {
  const groups = buildEventLeaderboardGroups([
    { category: 'Open', status: 'verified', primaryTotal: 20_000 },
    { category: 'Open', status: 'verified', primaryTotal: 20_000 },
    { category: 'Open', status: 'verified', primaryTotal: 10_000 },
    { category: 'Elite', status: 'verified', primaryTotal: 9_000 }
  ]);

  const open = groups.find((group) => group.key === 'OPEN');
  const elite = groups.find((group) => group.key === 'ELITE');
  assert.deepEqual(open.entries.map((entry) => entry.rank), [1, 1, 3]);
  assert.deepEqual(elite.entries.map((entry) => entry.rank), [1]);
});

test('step-only proof payload accepts null distance but requires verified positive integer steps', () => {
  const registration = {
    _id: 'registration',
    eventId: 'event',
    userId: 'runner',
    participationMode: 'virtual',
    raceDistance: 'Open Steps',
    resultProofMinimumDistanceKm: null
  };
  const event = {
    virtualCompletionMode: 'accumulated_activity',
    challengeMetrics: ['steps'],
    primaryChallengeMetric: 'steps',
    targetSteps: 10_000
  };
  const input = {
    distanceKm: '',
    steps: 4_000,
    elapsedMs: 3_600_000,
    runDate: new Date(),
    runLocation: 'Manila',
    runType: 'walk',
    proofType: 'photo',
    proof: { url: 'https://example.com/steps.png', mimeType: 'image/png', size: 1000 },
    ocrData: { extractedSteps: 4_000 }
  };

  const payload = buildSubmissionPayload(registration, input, { event });
  assert.equal(payload.distanceKm, null);
  assert.equal(payload.steps, 4_000);

  assert.throws(
    () => buildSubmissionPayload(registration, { ...input, steps: '' }, { event }),
    /Steps are required/
  );
  assert.throws(
    () => buildSubmissionPayload(registration, { ...input, steps: 4_000.5 }, { event }),
    /Steps are required/
  );
  assert.throws(
    () => buildSubmissionPayload(registration, { ...input, source: 'strava' }, { event }),
    /Strava-only activities cannot enter/
  );
});

test('both-metric proof payload requires distance and steps', () => {
  const registration = {
    _id: 'registration',
    eventId: 'event',
    userId: 'runner',
    participationMode: 'virtual',
    raceDistance: '10K',
    resultProofMinimumDistanceKm: null
  };
  const event = {
    virtualCompletionMode: 'accumulated_activity',
    challengeMetrics: ['distance', 'steps'],
    primaryChallengeMetric: 'distance',
    targetDistanceKm: 10
  };
  const baseInput = {
    distanceKm: 5,
    steps: 6_000,
    elapsedMs: 3_600_000,
    runDate: new Date(),
    runLocation: 'Manila',
    proofType: 'photo',
    proof: { url: 'https://example.com/both.png', mimeType: 'image/png', size: 1000 },
    ocrData: {}
  };

  assert.equal(buildSubmissionPayload(registration, baseInput, { event }).distanceKm, 5);
  assert.throws(
    () => buildSubmissionPayload(registration, { ...baseInput, distanceKm: '' }, { event }),
    /Distance is invalid/
  );
  assert.throws(
    () => buildSubmissionPayload(registration, { ...baseInput, steps: '' }, { event }),
    /Steps are required/
  );
});
