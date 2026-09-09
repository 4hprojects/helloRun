const { DEFAULT_WAIVER_TEMPLATE } = require('../../utils/waiver');

const SLUG = 'cns-move-more-challenge-2026';
const OFFICIAL_TITLE = 'College of Natural Sciences Wellness In Motion – Every Step is a Step Toward a Healthier You';
const SHORT_TITLE = 'CNS Move More Challenge 2026';

const DATES = Object.freeze({
  publicAt: new Date('2026-09-09T00:00:00+08:00'),
  registrationOpenAt: new Date('2026-09-09T00:00:00+08:00'),
  registrationCloseAt: new Date('2026-09-13T23:59:00+08:00'),
  activityStartAt: new Date('2026-09-14T00:00:00+08:00'),
  activityEndAt: new Date('2026-11-03T23:59:00+08:00'),
  submissionDeadlineAt: new Date('2026-11-03T23:59:00+08:00'),
  awardingAt: new Date('2026-11-09T00:00:00+08:00')
});

const VENUE_NAME = 'Virtual — participant-selected eligible route';
const AWARDING_VENUE = 'CAS Little Theater';
const EVENT_DESCRIPTION = 'CNS faculty and staff are invited to complete 50 kilometers through walking, running, or hiking during Wellness In Motion. This virtual, self-paced challenge runs from September 14 to November 3, 2026. Track distance and elevation with Strava or another compatible sports app or device, then upload a screenshot of each activity to HelloRun.';
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
## 50 km in 50 days

The College of Natural Sciences invites faculty and staff to join Wellness In Motion, a virtual and self-paced walk, run, and hike challenge from **September 14 to November 3, 2026**. Complete activities at your preferred location and pace and accumulate at least **50 kilometers**. Approved distance continues to count after you reach the goal.

## Track distance and elevation

Use Strava, Garmin, or another sports tracking application or device capable of recording distance and elevation. Walking, running, and hiking count. Cycling, swimming, general step accumulation, and unrelated activities do not count.

## Upload each activity to HelloRun

Submit each completed activity separately with an original, readable JPG, PNG, or WebP screenshot. Confirm the activity date, distance, activity type, tracking application or device, and elevation gain when available. Screenshots may look different across apps, but they must show enough information for a coordinator to validate the activity. Only approved, accurate, non-duplicate submissions within the activity window count toward official totals.

## Certificates and awarding

Participants with at least **50 km of approved distance** receive a Finisher's Certificate. Participants with at least one approved activity who finish below 50 km receive a Certificate of Participation. The top-three award basis will be confirmed by the event coordinator and is not selected automatically by HelloRun.

Coordinators will finalize results and award decisions from **November 4 to 8, 2026**. Awarding is on **November 9, 2026** at the **CAS Little Theater**, in conjunction with the CNS Foundation Day celebration.
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
    requiredRegistrationFields: ['mobile', 'department', 'position', 'preferred_fitness_app', 'leaderboard_consent'],
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
