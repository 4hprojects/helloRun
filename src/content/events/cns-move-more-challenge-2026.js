const { DEFAULT_WAIVER_TEMPLATE } = require('../../utils/waiver');

const SLUG = 'cns-move-more-challenge-2026';

const DATES = Object.freeze({
  publicAt: new Date('2026-08-05T00:00:00+08:00'),
  registrationOpenAt: new Date('2026-08-05T00:00:00+08:00'),
  registrationCloseAt: new Date('2026-09-30T23:59:00+08:00'),
  activityStartAt: new Date('2026-09-01T00:00:00+08:00'),
  activityEndAt: new Date('2026-09-30T23:59:00+08:00'),
  submissionDeadlineAt: new Date('2026-10-02T23:59:00+08:00')
});

const STEPS_GOAL = 120000;
const VENUE_NAME = 'Virtual — participant-selected eligible route';
const REWARDS_DESCRIPTION = 'Digital certificate and recognition on the event leaderboards after eligible activities are approved.';
const HIGHEST_ELEVATION_CLARIFICATION = 'The leaderboard separates **five category leaders** from **three event-wide recognitions**. Category cards rank progress toward each selected goal; combined categories use the lower of distance-goal and step-goal progress. Highest Steps, Highest Elevation, and Most Consistent each compare publicly eligible approved results across all five categories exactly once. Their full standings are also event-wide, so category selection does not create duplicate awards. Public standings show everyone ranked **#10 or better**, including exact rank-10 ties. A signed-in participant outside the public top 10 can still see their own exact current standing privately.';
const EVENT_DESCRIPTION = 'Open to CNS teaching, non-teaching, administrative, and support personnel. This free, 30-day virtual wellness challenge lets you choose an accumulated 25K or 50K virtual run/walk goal, a 120,000-step goal, or a combined goal. Complete eligible activities anywhere during September — there is no onsite race. All you need is a smartphone or fitness app that records the activity date and your distance or steps; no smartwatch is required.';
const BRAND_ASSETS = Object.freeze({
  logoUrl: '/images/events/cns-move-more-challenge-2026/cns-logo.jpg',
  bannerImageUrl: '/images/events/cns-move-more-challenge-2026/cns-move-more-hero.webp',
  posterImageUrl: '/images/events/cns-move-more-challenge-2026/cns-move-more-social.webp'
});
const GALLERY_IMAGE_URLS = Object.freeze([
  '/images/events/cns-move-more-challenge-2026/cns-move-more-beginner-guide-landscape.webp'
]);

const RACE_CATEGORIES = Object.freeze([
  {
    categoryId: 'cns-25k-challenge',
    name: '25-Kilometer Challenge',
    type: 'challenge',
    distanceLabel: '25K',
    distanceKm: 25,
    targetSteps: 0,
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: REWARDS_DESCRIPTION
  },
  {
    categoryId: 'cns-50k-challenge',
    name: '50-Kilometer Challenge',
    type: 'challenge',
    distanceLabel: '50K',
    distanceKm: 50,
    targetSteps: 0,
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: REWARDS_DESCRIPTION
  },
  {
    categoryId: 'cns-steps-120k-challenge',
    name: '120,000-Step Challenge',
    type: 'challenge',
    distanceLabel: '',
    distanceKm: 0,
    targetSteps: STEPS_GOAL,
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: REWARDS_DESCRIPTION
  },
  {
    categoryId: 'cns-25k-steps-120k-challenge',
    name: '25-Kilometer and 120,000-Step Challenge',
    type: 'challenge',
    distanceLabel: '',
    distanceKm: 25,
    targetSteps: STEPS_GOAL,
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: REWARDS_DESCRIPTION
  },
  {
    categoryId: 'cns-50k-steps-120k-challenge',
    name: '50-Kilometer and 120,000-Step Challenge',
    type: 'challenge',
    distanceLabel: '',
    distanceKm: 50,
    targetSteps: STEPS_GOAL,
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: REWARDS_DESCRIPTION
  }
]);

const EVENT_DETAILS_MARKDOWN = `
## Pace your goal

The 25K and 50K options are **accumulated virtual run/walk distance challenges**, not onsite races or one-session requirements. Complete eligible activities anywhere during September and submit clear app screenshots through HelloRun.

- **25-Kilometer Challenge** — for beginners, casual walkers, and first-time virtual participants. About 0.84 km a day, or 6.25 km a week.
- **50-Kilometer Challenge** — for active walkers, joggers, and recreational runners who want a higher target. About 1.67 km a day, or 12.5 km a week.
- **120,000-Step Challenge** — about 4,000 steps a day, or 28,000 steps a week. You do not need exactly 4,000 steps every day — some days will have fewer, some more. What matters is your total by the end of the month.
- **25-Kilometer + 120,000-Step Challenge** or **50-Kilometer + 120,000-Step Challenge** — combine a distance goal and the step goal. The same walk, jog, run, or hike can count toward both when your app shows both figures.

Choose one category. You may not register for both the 25K and 50K categories at the same time. A combined category requires you to reach both its distance and step targets. The same eligible activity can count toward both when your app records both figures. You may exceed your goal — every valid kilometer and step beyond your target still counts toward the leaderboards.

## Walk, jog, run, or hike

Valid activities: walking, jogging, running, and hiking. Cycling distance does not count toward either distance challenge.

If you are new to activity tracking, start with **Apple Health on iPhone**, **Google Fit on Android**, or **Samsung Health on a Samsung phone**. These phone-based apps can record steps and walking or running distance without a smartwatch. For a distance-only 25K or 50K goal, Strava or MapMyRun is also suitable. A Strava import by itself does not satisfy a step-only or combined goal; use a tracker screen that visibly includes steps.

You may also use Garmin Connect, Huawei Health, Mi Fitness, Fitbit, Zepp, COROS, another smartphone pedometer, or a smartwatch companion app. What matters is that your proof clearly shows the required information, not which supported app or device you use.

## Submit when it works for you

Submit a clear screenshot from your fitness app showing your distance or steps and the date. There is no required weekly schedule — submit after each activity, at the end of a day, after several days, or all at once near the end of the event. You may submit as many screenshots as you need; only approved, non-duplicate submissions count toward your total.

A good screenshot clearly shows the **activity date** and the metric required by your goal: **distance in kilometers** for a 25K or 50K goal, **steps** for the 120,000-step goal, or **both distance and steps** for a combined goal. Do not crop out the date or required totals. Upload the original, readable JPG, PNG, or WebP image; do not edit the figures or submit the same activity twice.

Every submission requires you to confirm the honor-system statement: that the activity is yours, was completed within the event period, and has not been edited or submitted before.

## Finisher recognition and privacy

Reaching your registered goal(s) makes you an official finisher. Leaderboards track total distance, total steps, and consistent participation, using only approved submissions. During registration you can choose to display your full name, an abbreviated name, or stay off the public leaderboard — organizers can always see your full identity.

${HIGHEST_ELEVATION_CLARIFICATION}

## Move for your wellness, and for each other

CNS Move More Challenge 2026 is about building consistent, healthy movement habits and stronger connections among CNS faculty and staff — not about being the fastest. Every valid step and kilometer counts, at your own pace.
`.trim();

function buildCnsMoveMoreChallengeEventPayload({ organizerId, approvedBy, referenceCode, now = new Date() }) {
  return {
    organizerId,
    slug: SLUG,
    referenceCode,
    title: 'CNS Move More Challenge 2026',
    organiserName: 'College of Natural Sciences, Benguet State University',
    description: EVENT_DESCRIPTION,
    eventDetailsMarkdown: EVENT_DETAILS_MARKDOWN,
    ...BRAND_ASSETS,
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['25K', '50K'],
    raceCategories: RACE_CATEGORIES.map((category) => ({ ...category })),
    registrationOpenAt: DATES.registrationOpenAt,
    registrationCloseAt: DATES.registrationCloseAt,
    publicListingAvailableAt: DATES.publicAt,
    autoEmailPromotionEnabled: false,
    eventStartAt: DATES.activityStartAt,
    eventEndAt: DATES.activityEndAt,
    virtualWindow: { startAt: DATES.activityStartAt, endAt: DATES.activityEndAt },
    venueName: VENUE_NAME,
    city: '',
    province: '',
    country: 'PH',
    proofTypesAllowed: ['photo', 'manual'],
    virtualCompletionMode: 'accumulated_activity',
    challengeMetrics: ['distance', 'steps'],
    primaryChallengeMetric: 'distance',
    targetDistanceKm: 50,
    targetSteps: STEPS_GOAL,
    minimumActivityDistanceKm: null,
    acceptedRunTypes: ['run', 'walk', 'hike'],
    finalSubmissionDeadlineAt: DATES.submissionDeadlineAt,
    milestoneDistancesKm: [25, 50],
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_metric',
    feeMode: 'free',
    feeAmount: null,
    feeCurrency: 'PHP',
    pricingMode: 'free',
    digitalBadgeEnabled: false,
    digitalCertificateEnabled: true,
    leaderboardRecognitionEnabled: true,
    leaderboardSettings: {
      enabled: true,
      type: 'accumulated_challenge',
      rankingBasis: 'highest_verified_distance',
      visibility: 'public',
      showPending: false,
      showHighestStepsCard: true,
      showHighestElevationCard: true,
      showMostConsistentCard: true,
      publicRankCutoff: 10,
      hideFlagged: true,
      nameDisplayMode: 'first_name_last_initial',
      visibleColumns: ['rank', 'runner', 'category', 'distance', 'steps', 'status']
    },
    physicalRewardsEnabled: false,
    internationalRunnersAllowed: false,
    galleryImageUrls: [...GALLERY_IMAGE_URLS],
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
  STEPS_GOAL,
  VENUE_NAME,
  EVENT_DESCRIPTION,
  HIGHEST_ELEVATION_CLARIFICATION,
  BRAND_ASSETS,
  GALLERY_IMAGE_URLS,
  RACE_CATEGORIES,
  EVENT_DETAILS_MARKDOWN,
  buildCnsMoveMoreChallengeEventPayload
};
