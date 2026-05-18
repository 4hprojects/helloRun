const test = require('node:test');
const assert = require('node:assert/strict');

const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');
const {
  buildChallengeMilestones,
  buildDefaultEventBadges
} = require('../src/services/event-badge.service');
const {
  calculateProgressPercent,
  GLOBAL_DISTANCE_MILESTONES_KM,
  isEligibleChallengeEvent
} = require('../src/services/badge-progress.service');
const {
  buildBadgeVerificationUrl,
  shouldSendBadgeEarnedEmail
} = require('../src/services/badge-notification.service');
const {
  normalizeBadgeTemplatePayload,
  renderBadgeTemplate,
  renderTemplateString
} = require('../src/services/badge-template.service');
const {
  checkBadgeRequirement,
  resolveRegistrationForEvaluation,
  resolveSubmissionForEvaluation
} = require('../src/services/achievement.service');

test('buildDefaultEventBadges uses current event fields for Phase 1 badges', () => {
  const badges = buildDefaultEventBadges({
    _id: 'event-1',
    slug: 'baguio-charity-run',
    title: 'Baguio Charity Run',
    raceDistances: ['3K', '5K', '10K'],
    eventTypesAllowed: ['virtual', 'onsite']
  });

  assert.deepEqual(
    badges.map((badge) => badge.badgeType),
    [
      'participant',
      'finisher',
      'distance_finisher',
      'distance_finisher',
      'distance_finisher',
      'mode_finisher',
      'mode_finisher'
    ]
  );
  assert.equal(badges.some((badge) => badge.badgeType === 'rank'), false);
  assert.equal(badges.some((badge) => badge.requirementType === 'challenge_progress'), false);
  assert.deepEqual(
    badges.find((badge) => badge.badgeCode === 'baguio-charity-run-5k-finisher').requirementValue,
    { raceDistance: '5K' }
  );
});

test('buildDefaultEventBadges adds challenge milestones for accumulated badge-enabled events', () => {
  const badges = buildDefaultEventBadges({
    _id: 'event-accumulated',
    slug: 'hundred-k-challenge',
    title: 'Hundred K Challenge',
    raceDistances: ['100K'],
    eventTypesAllowed: ['virtual'],
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: 100
  });

  const challengeBadges = badges.filter((badge) => badge.requirementType === 'challenge_progress');
  assert.deepEqual(
    challengeBadges.map((badge) => badge.requirementValue),
    [
      { percent: 25, targetDistanceKm: 25 },
      { percent: 50, targetDistanceKm: 50 },
      { percent: 75, targetDistanceKm: 75 },
      { percent: 100, targetDistanceKm: 100 }
    ]
  );
  assert.equal(challengeBadges.at(-1).badgeType, 'challenge_finisher');
  assert.equal(challengeBadges.at(-1).emailNotificationLevel, 'major');
  assert.equal(challengeBadges[0].emailNotificationLevel, 'none');
});

test('buildDefaultEventBadges adds leaderboard rank badges when recognition is enabled', () => {
  const badges = buildDefaultEventBadges({
    _id: 'event-rank',
    slug: 'podium-run',
    title: 'Podium Run',
    raceDistances: ['5K'],
    eventTypesAllowed: ['virtual'],
    leaderboardRecognitionEnabled: true
  });

  const rankBadges = badges.filter((badge) => badge.requirementType === 'rank_achieved');
  assert.deepEqual(rankBadges.map((badge) => badge.requirementValue), [
    { rank: 1 },
    { rank: 3 },
    { rank: 10 },
    { rank: 1, raceDistance: '5K' },
    { rank: 1, mode: 'virtual' }
  ]);
  assert.equal(rankBadges[0].badgeType, 'category_winner');
  assert.equal(rankBadges[0].emailNotificationLevel, 'major');
  assert.equal(rankBadges[3].badgeType, 'distance_winner');
  assert.equal(rankBadges[4].badgeType, 'mode_winner');
});


test('badge progress helpers calculate challenge milestones and eligibility', () => {
  assert.deepEqual(buildChallengeMilestones(2026), [
    { percent: 25, targetDistanceKm: 506.5 },
    { percent: 50, targetDistanceKm: 1013 },
    { percent: 75, targetDistanceKm: 1519.5 },
    { percent: 100, targetDistanceKm: 2026 }
  ]);
  assert.equal(calculateProgressPercent(25, 100), 25);
  assert.equal(calculateProgressPercent(110, 100), 100);
  assert.equal(calculateProgressPercent(10, 0), 0);
  assert.deepEqual(GLOBAL_DISTANCE_MILESTONES_KM, [5, 50, 100, 500, 1000]);
  assert.equal(isEligibleChallengeEvent({
    _id: 'event-1',
    status: 'published',
    digitalBadgeEnabled: true,
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: 100
  }), true);
});

test('checkBadgeRequirement awards only verified core event badge conditions', () => {
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'registration_confirmed' },
      { registrationStatus: 'confirmed' }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'distance_completed', requirement_value: { raceDistance: '10K' } },
      { submissionStatus: 'approved', raceDistance: '10k' }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'mode_completed', requirement_value: { mode: 'onsite' } },
      { submissionStatus: 'submitted', participationMode: 'onsite' }
    ),
    false
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'rank_achieved', requirement_value: { rank: 3 } },
      { rank: 1, rankingsStatus: 'final' }
    ),
    false
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'rank_achieved', requirement_value: { rank: 3 } },
      { rank: 3, rankingsStatus: 'published' }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'rank_achieved', requirement_value: { rank: 3 } },
      { rank: 4, rankingsStatus: 'published' }
    ),
    false
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'rank_achieved', requirement_value: { rank: 1, raceDistance: '5K' } },
      { rank: 1, rankingsStatus: 'published', raceDistance: '5k' }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'rank_achieved', requirement_value: { rank: 1, mode: 'onsite' } },
      { rank: 1, rankingsStatus: 'published', participationMode: 'virtual' }
    ),
    false
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'result_approved' },
      { resultStatus: 'approved' }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'distance_completed', requirement_value: { raceDistance: '5K' } },
      { resultStatus: 'approved', raceDistance: '5 km' }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'mode_completed', requirement_value: { mode: 'onsite' } },
      { resultStatus: 'approved', participationMode: 'onsite' }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'global_distance', requirement_value: { distanceKm: 100 } },
      { currentValue: 105 }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'global_distance', requirement_value: { distanceKm: 500 } },
      { currentValue: 105 }
    ),
    false
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'organiser_activity', requirement_value: { activityType: 'verified_organiser' } },
      { organiserRole: 'organiser', organiserStatus: 'approved' }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'organiser_activity', requirement_value: { activityType: 'published_event_count', count: 1 } },
      { publishedEventCount: 1 }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'organiser_activity', requirement_value: { activityType: 'confirmed_registration_count', count: 25 } },
      { confirmedRegistrationCount: 25 }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'organiser_activity', requirement_value: { activityType: 'confirmed_registration_count', count: 100 } },
      { confirmedRegistrationCount: 25 }
    ),
    false
  );
});

test('badge earned email decision only opts in configured major or all badges', () => {
  assert.equal(shouldSendBadgeEarnedEmail({ email_notification_level: 'none', badge_type: 'global_distance' }), false);
  assert.equal(shouldSendBadgeEarnedEmail({ email_notification_level: 'all', badge_type: 'participant' }), true);
  assert.equal(shouldSendBadgeEarnedEmail({ email_notification_level: 'major', badge_type: 'participant' }), false);
  assert.equal(shouldSendBadgeEarnedEmail({ email_notification_level: 'major', badge_type: 'challenge_finisher' }), true);
  assert.equal(shouldSendBadgeEarnedEmail({ email_notification_level: 'major', requirement_type: 'global_distance' }), true);

  const previousAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://hellorun.test/';
  assert.equal(buildBadgeVerificationUrl('badge-123'), 'https://hellorun.test/badges/badge-123');
  process.env.APP_URL = previousAppUrl;
});

test('badge distance and mode checks tolerate app input formatting variants', () => {
  const badges = buildDefaultEventBadges({
    _id: 'event-2',
    slug: 'format-run',
    title: 'Format Run',
    raceDistances: ['5 km', '10KM', '2026K'],
    eventTypesAllowed: ['virtual']
  });

  assert.deepEqual(
    badges
      .filter((badge) => badge.badgeType === 'distance_finisher')
      .map((badge) => badge.requirementValue),
    [
      { raceDistance: '5K' },
      { raceDistance: '10K' },
      { raceDistance: '2026K' }
    ]
  );

  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'distance_completed', requirement_value: { raceDistance: '5K' } },
      { submissionStatus: 'approved', raceDistance: '5 km' }
    ),
    true
  );
  assert.equal(
    checkBadgeRequirement(
      { requirement_type: 'mode_completed', requirement_value: { mode: 'virtual' } },
      { submissionStatus: 'approved', participationMode: 'Virtual' }
    ),
    true
  );
});

test('badge template service normalizes template payloads and renders variables', () => {
  const normalized = normalizeBadgeTemplatePayload({
    templateCode: ' Event Distance Finisher! ',
    scope: 'unknown',
    titlePattern: ' {{ event.title }} {{ distanceLabel }} Finisher ',
    descriptionPattern: 'Awarded for completing {{ distanceLabel }} in {{event.title}}.',
    defaultImageUrl: ' https://example.com/badge.png ',
    badgeType: 'distance_finisher',
    requirementType: 'distance_completed',
    isDefault: true,
    metadata: { phase: 1 }
  });

  assert.equal(normalized.templateCode, 'event-distance-finisher');
  assert.equal(normalized.scope, 'event');
  assert.equal(normalized.isDefault, true);
  assert.deepEqual(normalized.metadata, { phase: 1 });

  assert.equal(
    renderTemplateString(normalized.titlePattern, {
      event: { title: 'Baguio Charity Run' },
      distanceLabel: '5K'
    }),
    'Baguio Charity Run 5K Finisher'
  );

  assert.deepEqual(
    renderBadgeTemplate(normalized, {
      event: { title: 'Baguio Charity Run' },
      distanceLabel: '5K'
    }),
    {
      title: 'Baguio Charity Run 5K Finisher',
      description: 'Awarded for completing 5K in Baguio Charity Run.',
      imageUrl: 'https://example.com/badge.png',
      badgeType: 'distance_finisher',
      requirementType: 'distance_completed'
    }
  );
});

test('resolveRegistrationForEvaluation reloads partial registration objects', async () => {
  const originalFindById = Registration.findById;
  const loaded = {
    _id: 'registration-1',
    status: 'confirmed',
    eventId: 'event-1',
    userId: 'runner-1',
    paymentStatus: 'paid'
  };

  Registration.findById = async (id) => {
    assert.equal(id, 'registration-1');
    return loaded;
  };

  try {
    assert.equal(await resolveRegistrationForEvaluation({ _id: 'registration-1' }), loaded);
    assert.equal(await resolveRegistrationForEvaluation(loaded), loaded);
  } finally {
    Registration.findById = originalFindById;
  }
});

test('resolveSubmissionForEvaluation reloads partial submission objects', async () => {
  const originalFindById = Submission.findById;
  const loaded = {
    _id: 'submission-1',
    status: 'approved',
    registrationId: 'registration-1',
    eventId: 'event-1'
  };

  Submission.findById = async (id) => {
    assert.equal(id, 'submission-1');
    return loaded;
  };

  try {
    assert.equal(await resolveSubmissionForEvaluation({ _id: 'submission-1' }), loaded);
    assert.equal(await resolveSubmissionForEvaluation(loaded), loaded);
  } finally {
    Submission.findById = originalFindById;
  }
});
