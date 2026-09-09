const test = require('node:test');
const assert = require('node:assert/strict');
const Event = require('../src/models/Event');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const { resolveEventLeaderboardSettings } = require('../src/services/leaderboard.service');
const {
  DATES,
  OFFICIAL_TITLE,
  SHORT_TITLE,
  AWARDING_VENUE,
  EVENT_DESCRIPTION,
  RACE_CATEGORIES,
  EVENT_DETAILS_MARKDOWN,
  buildCnsMoveMoreChallengeEventPayload
} = require('../src/content/events/cns-move-more-challenge-2026');
const { assertExpectedCounts, comparableEventValue, isPostMigration, EARLY_REVIEW_NOTE } = require('../src/scripts/update-cns-move-more-content');

test('CNS source follows the official dates and one distance-only goal', () => {
  assert.equal(DATES.registrationOpenAt.toISOString(), '2026-09-08T16:00:00.000Z');
  assert.equal(DATES.registrationCloseAt.toISOString(), '2026-09-13T15:59:00.000Z');
  assert.equal(DATES.activityStartAt.toISOString(), '2026-09-13T16:00:00.000Z');
  assert.equal(DATES.activityEndAt.toISOString(), '2026-11-03T15:59:00.000Z');
  assert.equal(DATES.submissionDeadlineAt.toISOString(), DATES.activityEndAt.toISOString());
  assert.deepEqual(RACE_CATEGORIES.map((category) => [category.distanceKm, category.targetSteps]), [[50, 0]]);
  assert.match(EVENT_DETAILS_MARKDOWN, /50 km in 50 days/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /September 14 to November 3, 2026/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /CAS Little Theater/i);
  assert.doesNotMatch(`${EVENT_DESCRIPTION}\n${EVENT_DETAILS_MARKDOWN}`, /120,000|25.?Kilometer|dual challenge|4,000 steps/i);
});

test('CNS payload is free, screenshot-backed, and distance-only', () => {
  const payload = buildCnsMoveMoreChallengeEventPayload({ organizerId: 'owner', approvedBy: 'admin', referenceCode: 'CNS-TEST' });
  assert.equal(payload.title, OFFICIAL_TITLE);
  assert.equal(payload.shortTitle, SHORT_TITLE);
  assert.equal(payload.awardingVenue, AWARDING_VENUE);
  assert.deepEqual(payload.raceDistances, ['50K']);
  assert.deepEqual(payload.challengeMetrics, ['distance']);
  assert.equal(payload.targetSteps, null);
  assert.deepEqual(payload.acceptedRunTypes, ['run', 'walk', 'hike']);
  assert.deepEqual(payload.proofTypesAllowed, ['photo']);
  assert.equal(payload.requireActivityScreenshot, true);
  assert.equal(payload.requireTrackingAppDevice, true);
  assert.equal(payload.suppressDailyGuidance, true);
  assert.equal(payload.participationCertificateEnabled, true);
  assert.equal(payload.noActivityCertificateEnabled, false);
  assert.equal(payload.leaderboardSettings.showHighestStepsCard, false);
  assert.equal(payload.leaderboardSettings.showHighestElevationCard, false);
  assert.equal(payload.leaderboardSettings.showMostConsistentCard, false);
  assert.equal(payload.awardSettings.rankingBasis, 'unconfirmed');
  assert.equal(payload.awardSettings.autoSelectTopFinishers, false);
  const standings = resolveEventLeaderboardSettings(payload, 'elevation');
  assert.equal(standings.primaryMetric, 'distance');
  assert.deepEqual(standings.trackedMetrics, ['distance']);
  assert.ok(Event.schema.path('awardingAt'));
  assert.ok(Event.schema.path('requiredRegistrationFields'));
  assert.ok(AccumulatedActivitySubmission.schema.path('trackingAppDevice'));
  assert.deepEqual(AccumulatedActivitySubmission.schema.path('certificate.type').enumValues, ['finisher', 'participation', '']);
});

test('CNS migration count guard supports only exact initial or post-migration states', () => {
  assert.doesNotThrow(() => assertExpectedCounts({ registrations: 10, activities: 7, demoRegistrations: 15, demoActivities: 15 }));
  assert.equal(isPostMigration({ registrations: 10, activities: 7, demoRegistrations: 0, demoActivities: 0 }), true);
  assert.throws(() => assertExpectedCounts({ registrations: 11, activities: 7, demoRegistrations: 15, demoActivities: 15 }), /Unexpected live CNS record counts/);
  assert.match(EARLY_REVIEW_NOTE, /must manually approve an exception/i);
});

test('CNS migration comparison ignores MongoDB-generated nested ids', () => {
  const persisted = [{ _id: 'generated-id', categoryId: '50k', distanceKm: 50 }];
  const expected = [{ categoryId: '50k', distanceKm: 50 }];
  assert.equal(comparableEventValue(persisted), comparableEventValue(expected));
});
