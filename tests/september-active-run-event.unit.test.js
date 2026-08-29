const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const { getPublishReadinessErrors } = require('../src/services/event-form.service');
const { buildDefaultEventBadges } = require('../src/services/event-badge.service');
const { buildPublicEventView } = require('../src/utils/event-public-view');
const {
  SLUG,
  DATES,
  EVENT_DESCRIPTION,
  EVENT_DETAILS_MARKDOWN,
  buildSeptemberActiveRunEventPayload
} = require('../src/content/events/september-active-run-2026');

function buildPayload() {
  const id = new mongoose.Types.ObjectId();
  return buildSeptemberActiveRunEventPayload({
    organizerId: id,
    approvedBy: id,
    referenceCode: 'HR-SEP-ACTIVE-2026',
    bannerUrl: 'https://cdn.example.com/banner.webp',
    logoUrl: 'https://cdn.example.com/logo.webp',
    badgeImageUrl: 'https://cdn.example.com/badge.webp',
    posterUrl: 'https://cdn.example.com/poster.webp',
    now: new Date('2026-08-29T00:00:00+08:00')
  });
}

test('September Active Run payload is publish-ready with six exact accumulated goals', () => {
  const event = new Event(buildPayload());

  assert.equal(SLUG, 'september-active-run-2026');
  assert.equal(event.validateSync(), undefined);
  assert.deepEqual(getPublishReadinessErrors(event), []);
  assert.equal(event.status, 'published');
  assert.equal(event.feeMode, 'free');
  assert.equal(event.virtualCompletionMode, 'accumulated_activity');
  assert.equal(event.minimumActivityDistanceKm, 1);
  assert.deepEqual(event.proofTypesAllowed, ['running_app_sync', 'photo']);
  assert.deepEqual(event.acceptedRunTypes, ['run', 'walk', 'trail_run', 'hike']);
  assert.deepEqual(event.raceCategories.map((category) => [category.categoryId, category.name, category.distanceKm]), [
    ['september-starter-run-25k', 'September Starter Run', 25],
    ['september-progress-run-50k', 'September Progress Run', 50],
    ['september-endurance-run-75k', 'September Endurance Run', 75],
    ['september-active-run-100k', 'September Active Run', 100],
    ['september-distance-run-150k', 'September Distance Run', 150],
    ['september-ultra-run-200k', 'September Ultra Run', 200]
  ]);
});

test('September schedule and public copy preserve the approved operational decisions', () => {
  assert.equal(DATES.publicAt.toISOString(), '2026-08-28T16:00:00.000Z');
  assert.equal(DATES.registrationCloseAt.toISOString(), '2026-09-22T15:59:00.000Z');
  assert.equal(DATES.activityStartAt.toISOString(), '2026-08-31T16:00:00.000Z');
  assert.equal(DATES.activityEndAt.toISOString(), '2026-09-30T15:59:00.000Z');
  assert.equal(DATES.submissionDeadlineAt.toISOString(), '2026-10-14T15:59:00.000Z');
  assert.ok(EVENT_DESCRIPTION.length <= 2000);
  assert.ok(EVENT_DETAILS_MARKDOWN.length <= 20000);
  assert.match(EVENT_DETAILS_MARKDOWN, /October 15 through October 17, 2026/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /release beginning \*\*October 18, 2026\*\*/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /Extra approved distance remains visible/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /privacy-aware runner names/i);
});

test('September event creates category badges and public distance standings', () => {
  const payload = buildPayload();
  const badges = buildDefaultEventBadges(payload);
  const distanceBadges = badges.filter((badge) => badge.badgeType === 'distance_finisher');

  assert.deepEqual(distanceBadges.map((badge) => badge.requirementValue.raceDistance), [
    '25K', '50K', '75K', '100K', '150K', '200K'
  ]);
  assert.equal(payload.digitalCertificateEnabled, true);
  assert.equal(payload.leaderboardRecognitionEnabled, true);
  assert.equal(payload.leaderboardSettings.rankingBasis, 'highest_verified_distance');
  assert.equal(payload.leaderboardSettings.showPending, false);
  assert.equal(payload.leaderboardSettings.hideFlagged, true);
  assert.equal(payload.leaderboardSettings.nameDisplayMode, 'first_name_last_initial');
});

test('September public page exposes all goals, media, registration, and standings', () => {
  const payload = buildPayload();
  const page = buildPublicEventView(payload, {
    now: new Date('2026-09-05T12:00:00+08:00'),
    registrationCount: 42,
    hasPublicBadges: true
  });

  assert.equal(page.title, 'September Active Run');
  assert.equal(page.registrationState.canRegisterNow, true);
  assert.equal(page.primaryCta.href, '/events/september-active-run-2026/register');
  assert.equal(page.hasCategorySpecificGoals, true);
  assert.deepEqual(page.categoryGoalOptions.map((goal) => goal.distanceKm), [25, 50, 75, 100, 150, 200]);
  assert.equal(page.heroImageUrl, 'https://cdn.example.com/banner.webp');
  assert.equal(page.posterImageUrl, 'https://cdn.example.com/poster.webp');
  assert.ok(page.rewardItems.some((reward) => reward.label === 'Digital badge'));
  assert.ok(page.rewardItems.some((reward) => reward.label === 'Digital certificate'));
  assert.deepEqual(page.secondaryCtas, [
    { label: 'View Standings', href: '/events/september-active-run-2026/leaderboard' }
  ]);
});

test('September artwork is stored in the repository with landscape, portrait, and circle-safe badge assets', () => {
  const assetDir = path.resolve(__dirname, '../assets/events/september-active-run-2026');
  const banner = fs.readFileSync(path.join(assetDir, 'september-active-run-2026-banner.png'));
  const poster = fs.readFileSync(path.join(assetDir, 'september-active-run-2026-poster.png'));
  const badge = fs.readFileSync(path.join(assetDir, 'september-active-run-2026-badge.png'));
  const dimensions = (bytes) => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });

  assert.equal(banner.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(poster.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(badge.subarray(1, 4).toString('ascii'), 'PNG');
  const bannerSize = dimensions(banner);
  const posterSize = dimensions(poster);
  const badgeSize = dimensions(badge);
  assert.ok(Math.abs((bannerSize.width / bannerSize.height) - (16 / 9)) < 0.02);
  assert.ok(posterSize.height > posterSize.width);
  assert.equal(badgeSize.width, badgeSize.height);
  assert.equal(badge[25], 6, 'badge PNG should preserve RGBA transparency');
});

test('September creator is dry-run by default and requires explicit apply for publication', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../src/scripts/create-september-active-run-2026.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));

  assert.match(script, /process\.argv\.includes\('--apply'\)/);
  assert.match(script, /mutation: false/);
  assert.match(script, /Expected \$\{SLUG\} to be absent/);
  assert.match(script, /posterImageFile: filePayload\(POSTER_PATH\)/);
  assert.match(script, /LOGO_PATH = path\.join\(ASSET_DIR, 'september-active-run-2026-badge\.png'\)/);
  assert.match(script, /ENOTFOUND\|ENETUNREACH/);
  assert.equal(pkg.scripts['event:create-september-active-run-2026'], 'node src/scripts/create-september-active-run-2026.js');
});
