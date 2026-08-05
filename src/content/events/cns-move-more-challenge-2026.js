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
const REWARDS_DESCRIPTION = 'Digital certificate and recognition on the event leaderboards after eligible activities are approved.';

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
## Move more, together

The College of Natural Sciences invites all CNS faculty and staff — teaching, non-teaching, administrative, and support personnel — to join the CNS Move More Challenge 2026: a free, 30-day virtual and self-paced wellness activity from **September 1 to September 30, 2026**.

This event is designed for everyone, including anyone joining a virtual fitness event for the first time. You do not need to be an experienced runner, and you do not need a smartwatch.

## Choose your goal

- **25-Kilometer Challenge** — for beginners, casual walkers, and first-time virtual participants. About 0.84 km a day, or 6.25 km a week.
- **50-Kilometer Challenge** — for active walkers, joggers, and recreational runners who want a higher target. About 1.67 km a day, or 12.5 km a week.
- **120,000-Step Challenge** — about 4,000 steps a day, or 28,000 steps a week. You do not need exactly 4,000 steps every day — some days will have fewer, some more. What matters is your total by the end of the month.
- **25-Kilometer + 120,000-Step Challenge** or **50-Kilometer + 120,000-Step Challenge** — combine a distance goal and the step goal. The same walk, jog, run, or hike can count toward both when your app shows both figures.

You may register for one distance category, the step category, or a combined category. You may not register for both the 25K and 50K categories at the same time. You may exceed your goal — every valid kilometer and step beyond your target still counts toward the leaderboards.

## Walk, jog, run, hike, or use a treadmill

Valid activities: walking, jogging, running, hiking, and treadmill walking or running. Cycling distance does not count toward either distance challenge.

Use whichever fitness or health app you already have — Google Fit, Apple Health, Samsung Health, Strava, Garmin Connect, Huawei Health, Mi Fitness, Fitbit, Zepp, COROS, MapMyRun, a smartphone pedometer, a smartwatch companion app, or a treadmill's own display. A smartwatch is not required — a smartphone is enough.

## How to submit your progress

Submit a clear screenshot from your fitness app showing your distance or steps and the date. There is no required weekly schedule — submit after each activity, at the end of a day, after several days, or all at once near the end of the event. You may submit as many screenshots as you need; only approved, non-duplicate submissions count toward your total.

Every submission requires you to confirm the honor-system statement: that the activity is yours, was completed within the event period, and has not been edited or submitted before.

## Recognition

Reaching your registered goal(s) makes you an official finisher. Leaderboards track total distance, total steps, and consistent participation, using only approved submissions. During registration you can choose to display your full name, an abbreviated name, or stay off the public leaderboard — organizers can always see your full identity.

## Dates to remember

- Registration and event page open: **August 5, 2026**
- Activity window: **September 1–30, 2026**
- Proposed final submission deadline: **October 2, 2026** (subject to confirmation by the sports coordinator; organizers can adjust this date if needed)

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
    description: 'A free, 30-day virtual wellness challenge for CNS faculty and staff. Walk, jog, run, hike, or count your steps toward a 25K, 50K, or 120,000-step goal. Use any fitness app you like — no smartwatch required.',
    eventDetailsMarkdown: EVENT_DETAILS_MARKDOWN,
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
    venueName: 'Virtual — participant-selected eligible route or treadmill',
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
      hideFlagged: true,
      nameDisplayMode: 'first_name_last_initial',
      visibleColumns: ['rank', 'runner', 'category', 'distance', 'steps', 'status']
    },
    physicalRewardsEnabled: false,
    internationalRunnersAllowed: false,
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
  STEPS_GOAL,
  RACE_CATEGORIES,
  EVENT_DETAILS_MARKDOWN,
  buildCnsMoveMoreChallengeEventPayload
};
