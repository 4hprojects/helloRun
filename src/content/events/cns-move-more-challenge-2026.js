const { DEFAULT_WAIVER_TEMPLATE } = require('../../utils/waiver');

const SLUG = 'cns-move-more-challenge-2026';
const OFFICIAL_TITLE = 'College of Natural Sciences Wellness In Motion – Every Step is a Step Toward a Healthier You';
const SHORT_TITLE = 'CNS Move More Challenge 2026';

const DATES = Object.freeze({
  publicAt: new Date('2026-09-09T00:00:00+08:00'),
  registrationOpenAt: new Date('2026-09-09T00:00:00+08:00'),
  registrationCloseAt: new Date('2026-09-21T23:59:00+08:00'),
  activityStartAt: new Date('2026-09-14T00:00:00+08:00'),
  activityEndAt: new Date('2026-11-03T23:59:00+08:00'),
  submissionDeadlineAt: new Date('2026-11-03T23:59:00+08:00'),
  awardingAt: new Date('2026-11-09T00:00:00+08:00')
});

const VENUE_NAME = 'Virtual — participant-selected eligible route';
const AWARDING_VENUE = 'CAS Little Theater';
const EVENT_DESCRIPTION = 'An exclusive event of the College of Natural Sciences. Registration is extended until September 21, 2026. CNS faculty and staff are invited to complete 50 kilometers through walking, running, or hiking during Wellness In Motion. This virtual, self-paced challenge runs from September 14 to November 3, 2026. Track your distance with a sports app or device if you have one, then upload a screenshot of each activity to HelloRun.';
const BRAND_ASSETS = Object.freeze({
  logoUrl: '/images/events/cns-move-more-challenge-2026/cns-logo.jpg',
  bannerImageUrl: '/images/events/cns-move-more-challenge-2026/cns-move-more-hero.webp',
  posterImageUrl: '/images/events/cns-move-more-challenge-2026/cns-move-more-social.webp'
});
const GALLERY_IMAGE_URLS = Object.freeze([
  '/images/events/cns-move-more-challenge-2026/cns-move-more-beginner-guide-landscape.webp'
]);

const RACE_CATEGORIES = Object.freeze([{
  categoryId: 'cns-wellness-50k',
  name: '50 km in 50 days',
  type: 'challenge',
  distanceLabel: '50K',
  distanceKm: 50,
  targetSteps: 0,
  slots: null,
  cutoffTime: '',
  ageGroup: '',
  rewardsDescription: "Finisher's Certificate at 50 km; Certificate of Participation with at least one approved activity."
}]);

const EVENT_DETAILS_MARKDOWN = `
## At a glance

- **Who can join** — Exclusive to College of Natural Sciences faculty and staff.
- **Your goal** — Accumulate at least **50 kilometers** of approved distance.
- **Activity window** — **September 14 to November 3, 2026**.
- **Registration** — Extended to **September 21, 2026**.
- **Cost** — Free.
- **What you need** — Comfortable shoes, and a way to record each activity.

## Step 1 — Choose how you will track

Pick one way to record your distance and stay with it. You do not need an expensive
watch, and you do not need to decide before you register.

- **Already have an app?** Strava, Garmin Connect, Apple Fitness, Samsung Health,
  Google Fit, Fitbit, Nike Run Club, and Huawei Health all work.
- **Only have a phone?** A built-in step counter or any free pedometer app is fine,
  as long as its screen shows your distance.
- **Not sure yet?** Choose "Not sure yet" during registration. You can decide any
  time before your first activity.
- **What it must record** — Distance at minimum, and elevation gain if your app
  offers it.

## Step 2 — Move

Walk, run, or hike at any location and at your own pace. Break the 50 kilometers
into as many activities as you like.

**These count:**

- Walking
- Running
- Hiking

**These do not count:**

- Cycling
- Swimming
- General step accumulation that is not a recorded walk, run, or hike
- Any other unrelated activity

Approved distance keeps counting after you pass 50 kilometers, so you can carry on.

## Step 3 — Upload each activity to HelloRun

Submit every completed activity separately, each with its own screenshot. Do not
combine several activities into one upload.

**Your screenshot must show:**

- The date of the activity
- The distance covered
- The activity type
- The tracking app or device used
- The elevation gain, when your app records it

**File requirements:**

- An original, readable JPG, PNG, or WebP image
- Up to 5 MB

Screenshots look different from app to app. That is fine, as long as a coordinator
can read the details above. Only approved, accurate, non-duplicate submissions
inside the activity window count toward your official total.

## Step 4 — Certificates and awarding

- **Finisher's Certificate** — At least **50 km** of approved distance.
- **Certificate of Participation** — At least one approved activity, finishing
  below 50 km.
- **Top three** — The award basis will be confirmed by the event coordinator. It is
  not selected automatically by HelloRun.

Coordinators finalize results and award decisions from **November 4 to 8, 2026**.
Awarding is on **November 9, 2026** at the **CAS Little Theater**, alongside the CNS
Foundation Day celebration.
`.trim();

function buildCnsMoveMoreChallengeEventPayload({ organizerId, approvedBy, referenceCode, now = new Date() }) {
  return {
    organizerId,
    slug: SLUG,
    referenceCode,
    title: OFFICIAL_TITLE,
    shortTitle: SHORT_TITLE,
    organiserName: 'College of Natural Sciences, Benguet State University',
    description: EVENT_DESCRIPTION,
    eventDetailsMarkdown: EVENT_DETAILS_MARKDOWN,
    ...BRAND_ASSETS,
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['50K'],
    raceCategories: RACE_CATEGORIES.map((category) => ({ ...category })),
    registrationOpenAt: DATES.registrationOpenAt,
    registrationCloseAt: DATES.registrationCloseAt,
    publicListingAvailableAt: DATES.publicAt,
    autoEmailPromotionEnabled: false,
    eventStartAt: DATES.activityStartAt,
    eventEndAt: DATES.activityEndAt,
    virtualWindow: { startAt: DATES.activityStartAt, endAt: DATES.activityEndAt },
    venueName: VENUE_NAME,
    awardingAt: DATES.awardingAt,
    awardingVenue: AWARDING_VENUE,
    city: '',
    province: '',
    country: 'PH',
    proofTypesAllowed: ['photo'],
    requireActivityScreenshot: true,
    requireTrackingAppDevice: true,
    suppressDailyGuidance: true,
    virtualCompletionMode: 'accumulated_activity',
    challengeMetrics: ['distance'],
    primaryChallengeMetric: 'distance',
    targetDistanceKm: 50,
    targetSteps: null,
    minimumActivityDistanceKm: null,
    acceptedRunTypes: ['run', 'walk', 'hike'],
    finalSubmissionDeadlineAt: DATES.submissionDeadlineAt,
    milestoneDistancesKm: [50],
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_metric',
    awardSettings: { rankingBasis: 'unconfirmed', autoSelectTopFinishers: false, topFinisherCount: 3 },
    participationCertificateEnabled: true,
    noActivityCertificateEnabled: false,
    requiredRegistrationFields: ['department', 'leaderboard_consent'],
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
      showHighestStepsCard: false,
      showHighestElevationCard: false,
      showMostConsistentCard: false,
      publicRankCutoff: 0,
      hideFlagged: true,
      nameDisplayMode: 'first_name_last_initial',
      visibleColumns: ['rank', 'runner', 'department', 'distance', 'elevation', 'activities', 'status']
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
  OFFICIAL_TITLE,
  SHORT_TITLE,
  DATES,
  VENUE_NAME,
  AWARDING_VENUE,
  EVENT_DESCRIPTION,
  BRAND_ASSETS,
  GALLERY_IMAGE_URLS,
  RACE_CATEGORIES,
  EVENT_DETAILS_MARKDOWN,
  buildCnsMoveMoreChallengeEventPayload
};
