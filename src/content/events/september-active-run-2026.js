const { DEFAULT_WAIVER_TEMPLATE } = require('../../utils/waiver');

const SLUG = 'september-active-run-2026';

const DATES = Object.freeze({
  publicAt: new Date('2026-08-29T00:00:00+08:00'),
  registrationOpenAt: new Date('2026-08-30T00:00:00+08:00'),
  registrationCloseAt: new Date('2026-09-22T23:59:00+08:00'),
  activityStartAt: new Date('2026-09-01T00:00:00+08:00'),
  activityEndAt: new Date('2026-09-30T23:59:00+08:00'),
  submissionDeadlineAt: new Date('2026-10-14T23:59:00+08:00')
});

const REWARDS_DESCRIPTION = 'Digital category finisher badge and certificate after the selected approved-distance target is reached.';

const RACE_CATEGORIES = Object.freeze([
  ['september-starter-run-25k', 'September Starter Run', '25K', 25],
  ['september-progress-run-50k', 'September Progress Run', '50K', 50],
  ['september-endurance-run-75k', 'September Endurance Run', '75K', 75],
  ['september-active-run-100k', 'September Active Run', '100K', 100],
  ['september-distance-run-150k', 'September Distance Run', '150K', 150],
  ['september-ultra-run-200k', 'September Ultra Run', '200K', 200]
].map(([categoryId, name, distanceLabel, distanceKm]) => Object.freeze({
  categoryId,
  name,
  type: 'distance',
  distanceLabel,
  distanceKm,
  slots: null,
  cutoffTime: '',
  ageGroup: '',
  rewardsDescription: REWARDS_DESCRIPTION
})));

const EVENT_DESCRIPTION = 'Make September your active month with a free virtual distance challenge you can complete anywhere. Choose a 25K, 50K, 75K, 100K, 150K, or 200K goal, then build your approved distance through runs, jogs, walks, trail runs, or hikes from September 1 to 30. Finish your selected goal to earn a category badge and digital certificate, and keep moving beyond it if you want to climb the distance standings.';

const EVENT_DETAILS_MARKDOWN = `
## Choose a September goal

Pick one accumulated-distance category that is challenging but realistic for your current fitness and available time.

- **25K September Starter Run** — a welcoming goal for beginners, walkers, and first-time virtual participants; about 0.84 km per day.
- **50K September Progress Run** — for active walkers, joggers, and recreational runners; about 1.67 km per day.
- **75K September Endurance Run** — for participants ready to build steady endurance; 2.5 km per day.
- **100K September Active Run** — a strong month-long consistency goal; about 3.34 km per day.
- **150K September Distance Run** — for experienced and high-volume participants; 5 km per day.
- **200K September Ultra Run** — the highest-volume September goal; about 6.67 km per day.

The daily figures are pacing guides, not daily requirements. You may cover more distance on some days, less on others, and take rest days. Completion depends on your approved total by the end of the challenge.

Choose carefully when you register. Your selected category determines your official finisher target, badge, and certificate. Extra distance does not move you into another category.

## How to participate

1. Create or sign in to your HelloRun runner account.
2. Register for September Active Run by **September 22, 2026 at 11:59 PM Asia/Manila**.
3. Select one category from 25K through 200K.
4. Complete eligible activities from September 1 through September 30, 2026.
5. Record each activity with a supported running or fitness app.
6. Submit a verified app activity or a clear screenshot through HelloRun.
7. Continue until your approved distance reaches your selected target.
8. Submit all remaining September proof by **October 14, 2026 at 11:59 PM Asia/Manila**.

Only approved, eligible, non-duplicate submissions count toward official progress.

## Eligible activities

Eligible foot-based activities are outdoor running, jogging, walking, trail running, hiking, and treadmill running or walking when the proof clearly shows the distance and activity date. Jogging is recorded as a run in HelloRun.

Cycling, swimming, motorcycle or vehicle-assisted distance, activities shorter than 1 km, and activities completed outside September 1–30 do not count. Edited, manipulated, unreadable, incomplete, duplicate, or another person's activities are also ineligible.

## Activity proof requirements

Submit proof through verified running-app synchronization or a clear screenshot from a fitness or running app. Examples include Strava, Garmin Connect, COROS, Nike Run Club, Adidas Running, Apple Fitness, Samsung Health, Google Fit, Fitbit, Suunto, and comparable apps.

Each proof must clearly show the activity date, distance, duration or moving time, activity type, and app or tracker source. Keep the participant or profile identity and route summary visible when available. Do not crop out the date or distance, alter recorded figures, or submit the same activity more than once.

Activities must be at least 1 km. You may submit multiple valid activities, and there is no required daily or weekly submission schedule. The final deadline for all September activities is **October 14, 2026 at 11:59 PM Asia/Manila**.

## Completion and extra distance

You become an official category finisher when your approved distance reaches or exceeds the target selected during registration. Pending submissions remain unofficial until approved. Rejected, duplicate, flagged, or out-of-window activities do not count.

Extra approved distance remains visible and can affect highest-distance rankings. It does not change your selected category, finisher badge, or certificate category.

## Badges, certificates, and standings

Every verified finisher is eligible for a digital finisher badge and completion certificate for the selected distance category. Finishers may also appear in their category standings and the event's highest verified distance standings when public leaderboard participation is enabled.

The leaderboard uses approved distance only, hides pending and flagged results, and displays privacy-aware runner names. The standings are intended as friendly motivation; reaching your selected goal remains the event's primary achievement.

Organizer review runs from **October 15 through October 17, 2026**. Final badges, certificates, and recognition are scheduled for release beginning **October 18, 2026** after eligible submissions are reviewed.

## Safety and personal responsibility

Choose a goal appropriate to your current fitness, health, schedule, and experience. Increase distance gradually, include recovery time, stay hydrated, use routes and equipment suitable for local conditions, and stop if you feel pain, dizziness, or unusual discomfort.

This challenge is not medical advice or a promise that a particular goal is safe for every participant. Consult a qualified health professional before beginning or increasing physical activity when appropriate for your circumstances.

Follow local laws, weather advisories, trail rules, facility policies, and traffic-safety practices. Do not take screenshots, submit proof, or interact with HelloRun while moving in traffic or in an unsafe location.

## Privacy and fair participation

Share only the activity information needed for event verification. Review screenshots before uploading and avoid exposing home addresses, private messages, account numbers, health information, or other unnecessary personal details.

By submitting proof, you confirm that the activity is yours, occurred during the official event period, has not been materially edited, and has not already been submitted to this event. HelloRun may reject or investigate evidence that is incomplete, duplicated, inconsistent, manipulated, or otherwise ineligible under the published rules.
`.trim();

function buildSeptemberActiveRunEventPayload({
  organizerId,
  approvedBy,
  referenceCode,
  bannerUrl,
  logoUrl,
  badgeImageUrl,
  posterUrl,
  now = new Date()
}) {
  return {
    organizerId,
    slug: SLUG,
    referenceCode,
    title: 'September Active Run',
    organiserName: 'HelloRun',
    description: EVENT_DESCRIPTION,
    eventDetailsMarkdown: EVENT_DETAILS_MARKDOWN,
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: RACE_CATEGORIES.map((category) => category.distanceLabel),
    raceCategories: RACE_CATEGORIES.map((category) => ({ ...category })),
    registrationOpenAt: DATES.registrationOpenAt,
    registrationCloseAt: DATES.registrationCloseAt,
    publicListingAvailableAt: DATES.publicAt,
    autoEmailPromotionEnabled: false,
    autoEmailPromotionStatus: 'disabled',
    eventStartAt: DATES.activityStartAt,
    eventEndAt: DATES.activityEndAt,
    virtualWindow: { startAt: DATES.activityStartAt, endAt: DATES.activityEndAt },
    venueName: 'Virtual — participant-selected eligible route or treadmill',
    city: '',
    province: '',
    country: 'PH',
    proofTypesAllowed: ['running_app_sync', 'photo'],
    virtualCompletionMode: 'accumulated_activity',
    challengeMetrics: ['distance'],
    primaryChallengeMetric: 'distance',
    targetDistanceKm: 200,
    minimumActivityDistanceKm: 1,
    acceptedRunTypes: ['run', 'walk', 'trail_run', 'hike'],
    finalSubmissionDeadlineAt: DATES.submissionDeadlineAt,
    milestoneDistancesKm: [25, 50, 75, 100, 150, 200],
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_metric',
    feeMode: 'free',
    feeAmount: null,
    feeCurrency: 'PHP',
    pricingMode: 'free',
    digitalBadgeEnabled: true,
    digitalCertificateEnabled: true,
    leaderboardRecognitionEnabled: true,
    leaderboardSettings: {
      enabled: true,
      type: 'accumulated_challenge',
      rankingBasis: 'highest_verified_distance',
      visibility: 'public',
      showPending: false,
      showHighestStepsCard: false,
      showHighestElevationCard: false,
      showMostConsistentCard: false,
      publicRankCutoff: 0,
      hideFlagged: true,
      nameDisplayMode: 'first_name_last_initial',
      visibleColumns: ['rank', 'runner', 'category', 'distance', 'status']
    },
    allowGuestRegistration: false,
    waitlistEnabled: false,
    physicalRewardsEnabled: false,
    deliveryFeeEnabled: false,
    requiresDeliveryAddress: false,
    internationalRunnersAllowed: true,
    bannerImageUrl: bannerUrl,
    logoUrl,
    badgeImageUrl,
    posterImageUrl: posterUrl,
    galleryImageUrls: [],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1,
    approvedAt: now,
    approvedBy,
    approvalSource: 'admin',
    submittedForReviewAt: now,
    isDeleted: false,
    isPersonalRecord: false,
    isTestData: false,
    excludeFromSitemap: false
  };
}

module.exports = {
  SLUG,
  DATES,
  REWARDS_DESCRIPTION,
  RACE_CATEGORIES,
  EVENT_DESCRIPTION,
  EVENT_DETAILS_MARKDOWN,
  buildSeptemberActiveRunEventPayload
};
