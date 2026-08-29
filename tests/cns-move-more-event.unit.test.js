const test = require('node:test');
const assert = require('node:assert/strict');
const Event = require('../src/models/Event');

const {
  DATES,
  VENUE_NAME,
  BRAND_ASSETS,
  EVENT_DESCRIPTION,
  RACE_CATEGORIES,
  GALLERY_IMAGE_URLS,
  EVENT_DETAILS_MARKDOWN,
  buildCnsMoveMoreChallengeEventPayload
} = require('../src/content/events/cns-move-more-challenge-2026');
const { removeTreadmillOption } = require('../src/scripts/update-cns-move-more-content');

test('CNS content updater removes only the legacy treadmill option', () => {
  const legacy = `## Walk, jog, run, hike, or use a treadmill

Valid activities: walking, jogging, running, hiking, and treadmill walking or running. Cycling distance does not count.

You may use another smartphone pedometer, a smartwatch companion app, or a treadmill activity record.

Keep this custom organizer note.`;
  const updated = removeTreadmillOption(legacy);

  assert.doesNotMatch(updated, /treadmill/i);
  assert.match(updated, /## Walk, jog, run, or hike/);
  assert.match(updated, /Keep this custom organizer note\./);
});

test('CNS Move More source keeps all five mixed-metric goals and the confirmed deadline', () => {
  assert.deepEqual(
    RACE_CATEGORIES.map((category) => [category.distanceKm, category.targetSteps]),
    [[25, 0], [50, 0], [0, 120000], [25, 120000], [50, 120000]]
  );
  assert.equal(DATES.submissionDeadlineAt.toISOString(), '2026-10-02T15:59:00.000Z');
  assert.match(EVENT_DETAILS_MARKDOWN, /accumulated virtual run\/walk distance challenges/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /combined category requires you to reach both/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /same eligible activity can count toward both/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /Apple Health on iPhone/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /Google Fit on Android/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /Samsung Health on a Samsung phone/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /Strava import by itself does not satisfy a step-only or combined goal/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /both distance and steps.*combined goal/i);
  assert.doesNotMatch(EVENT_DETAILS_MARKDOWN, /treadmill/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /five category leaders.*three event-wide recognitions/is);
  assert.match(EVENT_DETAILS_MARKDOWN, /combined categories use the lower of distance-goal and step-goal progress/is);
  assert.match(EVENT_DETAILS_MARKDOWN, /across all five categories/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /ranked \*\*#10 or better\*\*/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /own exact current standing privately/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /JPG, PNG, or WebP/i);
  assert.doesNotMatch(EVENT_DETAILS_MARKDOWN, /proposed final submission deadline|subject to confirmation/i);
});

test('CNS Move More payload remains free, public, and configured for distance and steps', () => {
  const payload = buildCnsMoveMoreChallengeEventPayload({
    organizerId: 'organizer-id',
    approvedBy: 'admin-id',
    referenceCode: 'CNS-TEST',
    now: new Date('2026-08-10T00:00:00+08:00')
  });

  assert.equal(payload.slug, 'cns-move-more-challenge-2026');
  assert.equal(payload.feeMode, 'free');
  assert.equal(payload.status, 'published');
  assert.equal(payload.leaderboardSettings.showHighestStepsCard, true);
  assert.equal(payload.leaderboardSettings.showHighestElevationCard, true);
  assert.equal(payload.leaderboardSettings.showMostConsistentCard, true);
  assert.equal(payload.leaderboardSettings.publicRankCutoff, 10);
  assert.equal(Event.schema.path('leaderboardSettings.showHighestStepsCard').defaultValue, false);
  assert.equal(Event.schema.path('leaderboardSettings.showHighestElevationCard').defaultValue, false);
  assert.equal(Event.schema.path('leaderboardSettings.showMostConsistentCard').defaultValue, false);
  assert.equal(Event.schema.path('leaderboardSettings.publicRankCutoff').defaultValue, 0);
  assert.deepEqual(payload.challengeMetrics, ['distance', 'steps']);
  assert.equal(payload.venueName, VENUE_NAME);
  assert.equal(payload.raceCategories.length, 5);
  assert.match(payload.description, /CNS teaching, non-teaching, administrative, and support personnel/i);
  assert.equal(payload.description, EVENT_DESCRIPTION);
  assert.match(payload.description, /25K or 50K virtual run\/walk goal/i);
  assert.match(payload.description, /there is no onsite race/i);
  assert.match(payload.description, /no smartwatch is required/i);
  assert.deepEqual(
    {
      logoUrl: payload.logoUrl,
      bannerImageUrl: payload.bannerImageUrl,
      posterImageUrl: payload.posterImageUrl
    },
    BRAND_ASSETS
  );
  assert.deepEqual(payload.galleryImageUrls, [...GALLERY_IMAGE_URLS]);
  assert.deepEqual(GALLERY_IMAGE_URLS, [
    '/images/events/cns-move-more-challenge-2026/cns-move-more-beginner-guide-landscape.webp'
  ]);
});
