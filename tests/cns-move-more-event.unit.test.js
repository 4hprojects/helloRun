const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DATES,
  BRAND_ASSETS,
  EVENT_DESCRIPTION,
  RACE_CATEGORIES,
  GALLERY_IMAGE_URLS,
  EVENT_DETAILS_MARKDOWN,
  buildCnsMoveMoreChallengeEventPayload
} = require('../src/content/events/cns-move-more-challenge-2026');

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
  assert.deepEqual(payload.challengeMetrics, ['distance', 'steps']);
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
