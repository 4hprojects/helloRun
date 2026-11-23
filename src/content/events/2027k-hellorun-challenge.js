const { DEFAULT_WAIVER_TEMPLATE } = require('../../utils/waiver');

/*
 * 2027k HelloRun Challenge: free, worldwide, individual accumulated-distance challenge.
 *
 * Registration opens at publication. The caller passes the publication instant as
 * `registrationOpenAt` so no launch date is hard-coded here. The activity period is fixed
 * to calendar year 2027 in Asia/Manila. End-of-day cutoffs use 23:59:59 so the whole final
 * minute is included; every comparison against these instants is inclusive.
 */

const SLUG = '2027k-hellorun-challenge';
const TITLE = '2027k HelloRun Challenge';
const TARGET_DISTANCE_KM = 2027;

const DATES = Object.freeze({
  registrationCloseAt: new Date('2027-11-30T23:59:59+08:00'),
  activityStartAt: new Date('2027-01-01T00:00:00+08:00'),
  activityEndAt: new Date('2027-12-31T23:59:59+08:00'),
  submissionDeadlineAt: new Date('2028-01-14T23:59:59+08:00')
});

const TAGLINE = 'Cover 2,027 km in 2027. Free virtual challenge. Join from anywhere.';

const EVENT_DESCRIPTION = 'Cover 2,027 km in 2027 with HelloRun’s free virtual distance challenge. Join from anywhere and build your total through approved runs, walks, hikes, and verified treadmill workouts. Complete the goal to earn your free digital finisher certificate and badge.';

const ACCEPTED_RUN_TYPES = Object.freeze(['run', 'walk', 'hike', 'trail_run', 'treadmill']);

const RACE_CATEGORIES = Object.freeze([{
  categoryId: 'cat-1-2027k',
  name: '2027K',
  type: 'distance',
  distanceLabel: '2027K',
  distanceKm: TARGET_DISTANCE_KM,
  targetSteps: 0,
  slots: null,
  cutoffTime: '',
  ageGroup: '',
  rewardsDescription: 'Free digital finisher certificate and badge at 2,027 km of approved distance.'
}]);

const MERCHANDISE_PREVIEW_NOTE = 'Ordering details will be available to verified finishers when bundle orders open. International delivery may be available by quote to selected destinations.';
const MERCHANDISE_OPEN_NOTE = 'Once HelloRun verifies your finish, select your shirt size and enter your delivery address from your event dashboard. Philippine delivery is included in the ₱1,099 total. For supported international addresses, request a shipping quote. You’ll receive a PayPal invoice after accepting the total.';

const FINISHER_MERCHANDISE = Object.freeze({
  enabled: true,
  name: 'Finisher Shirt + Medal Bundle',
  priceAmount: 1099,
  currency: 'PHP',
  description: 'The optional bundle includes an antique-bronze finisher medal and a black technical shirt printed with “I covered 2,027 km in 2027.”',
  includedItems: ['Antique-bronze finisher medal', 'Black technical finisher shirt'],
  shippingNote: 'Free shipping within the Philippines.',
  orderingState: 'preview',
  previewNote: MERCHANDISE_PREVIEW_NOTE,
  openNote: MERCHANDISE_OPEN_NOTE
});

const FAQ_ITEMS = Object.freeze([
  {
    question: 'Can I sign up before January 1?',
    answer: 'Yes. Registration is open. Eligible workouts start on January 1, 2027.'
  },
  {
    question: 'Can I join from outside the Philippines?',
    answer: 'Yes. You can participate and earn the same free digital rewards wherever you live.'
  },
  {
    question: 'Do I have to run all 2,027 km?',
    answer: 'You can mix eligible runs, walks, hikes, trail runs, and verified treadmill workouts.'
  },
  {
    question: 'Can I join midway through the year?',
    answer: 'Yes. Register by November 30, 2027. You can submit eligible workouts recorded since January 1, including workouts completed before registration.'
  },
  {
    question: 'Do I have to buy the bundle to become a finisher?',
    answer: 'Finisher status depends on approved distance. The certificate and badge are free, and the bundle is optional.'
  }
]);

const EVENT_DETAILS_MARKDOWN = `
## Cover 2,027 km in 2027

Join the 2027k HelloRun Challenge from anywhere in the world. Run, walk, or hike on your
own schedule and build toward 2,027 km, one recorded workout at a time.

Free registration · Worldwide participation · One individual distance goal

## How it works

1. Register for free on HelloRun.
2. Record eligible workouts from January 1 through December 31, 2027.
3. Upload proof showing the workout date, distance, and duration. Enter the matching distance in HelloRun.
4. Track your approved distance. You become an official finisher when your approved total reaches 2,027 km.

The goal averages about 39 km per week across the year.

## Activity and proof rules

- Runs, jogs, walks, hikes, trail runs, and verified treadmill runs and walks count.
- Submit your own workouts. Each eligible workout counts once toward this challenge.
- Cycling, daily step totals, and distances estimated from steps are ineligible.
- For treadmill sessions, use a dated workout record showing the distance and duration. A console photo can support the record.
- You can submit eligible activities you recorded before registering as long as they fall within the 2027 activity period.
- Submit proof by January 14, 2028 at 11:59 p.m. Philippine time. Submit regularly to allow time for any requested corrections.

## Finisher rewards

Every verified finisher earns a free digital certificate and finisher badge. You can choose
whether your result appears on the public leaderboard.

### Finisher Shirt + Medal Bundle · ₱1,099

Free shipping within the Philippines.

The optional bundle includes an antique-bronze finisher medal and a black technical shirt
printed with “I covered 2,027 km in 2027.”

${MERCHANDISE_PREVIEW_NOTE}

## Event poster

Download the 2027k HelloRun Challenge poster and share it with someone who wants to take on
the distance with you.
`.trim();

/**
 * Builds the persisted event document.
 *
 * `registrationOpenAt` must be the publication instant captured immediately before the
 * write. Media URLs come from the caller because they are uploaded per environment.
 */
function build2027kChallengeEventPayload({
  organizerId,
  approvedBy,
  referenceCode,
  registrationOpenAt,
  media = {},
  now = new Date()
}) {
  if (!(registrationOpenAt instanceof Date) || Number.isNaN(registrationOpenAt.getTime())) {
    throw new Error('registrationOpenAt must be the publication instant.');
  }
  if (registrationOpenAt.getTime() >= DATES.registrationCloseAt.getTime()) {
    throw new Error('registrationOpenAt must be before the registration close.');
  }

  return {
    organizerId,
    slug: SLUG,
    referenceCode,
    title: TITLE,
    shortTitle: '2027k Challenge',
    tagline: TAGLINE,
    faqItems: FAQ_ITEMS.map((item) => ({ ...item })),
    organiserName: 'HelloRun',
    description: EVENT_DESCRIPTION,
    eventDetailsMarkdown: EVENT_DETAILS_MARKDOWN,
    bannerImageUrl: media.bannerImageUrl || '',
    posterImageUrl: media.posterImageUrl || '',
    logoUrl: media.logoUrl || '',
    badgeImageUrl: media.badgeImageUrl || '',
    galleryImageUrls: [],
    finisherMerchandise: {
      ...FINISHER_MERCHANDISE,
      includedItems: [...FINISHER_MERCHANDISE.includedItems],
      imageItems: Array.isArray(media.merchandiseImageItems) ? media.merchandiseImageItems.map((item) => ({ ...item })) : []
    },
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['2027K'],
    raceCategories: RACE_CATEGORIES.map((category) => ({ ...category })),
    registrationOpenAt,
    registrationCloseAt: DATES.registrationCloseAt,
    // Null lists the event as soon as it is published.
    publicListingAvailableAt: null,
    autoEmailPromotionEnabled: false,
    eventStartAt: DATES.activityStartAt,
    eventEndAt: DATES.activityEndAt,
    virtualWindow: { startAt: DATES.activityStartAt, endAt: DATES.activityEndAt },
    venueName: 'Anywhere',
    city: '',
    province: '',
    country: '',
    proofTypesAllowed: ['photo', 'manual'],
    requireActivityScreenshot: true,
    requireTrackingAppDevice: false,
    virtualCompletionMode: 'accumulated_activity',
    challengeMetrics: ['distance'],
    primaryChallengeMetric: 'distance',
    targetDistanceKm: TARGET_DISTANCE_KM,
    targetSteps: null,
    minimumActivityDistanceKm: null,
    acceptedRunTypes: [...ACCEPTED_RUN_TYPES],
    finalSubmissionDeadlineAt: DATES.submissionDeadlineAt,
    milestoneDistancesKm: [500, 1000, 1500, TARGET_DISTANCE_KM],
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_distance',
    participationCertificateEnabled: false,
    noActivityCertificateEnabled: false,
    requiredRegistrationFields: [],
    allowGuestRegistration: false,
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
      hideFlagged: true,
      nameDisplayMode: 'first_name_last_initial',
      visibleColumns: ['rank', 'runner', 'distance', 'activities', 'status']
    },
    physicalRewardsEnabled: false,
    internationalRunnersAllowed: true,
    requiresDeliveryAddress: false,
    requiresPhilippineDeliveryAddress: false,
    deliveryFeeEnabled: false,
    registrationPackages: [],
    specialRewardBenefits: [],
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
  TITLE,
  TARGET_DISTANCE_KM,
  DATES,
  TAGLINE,
  EVENT_DESCRIPTION,
  ACCEPTED_RUN_TYPES,
  RACE_CATEGORIES,
  FAQ_ITEMS,
  FINISHER_MERCHANDISE,
  MERCHANDISE_PREVIEW_NOTE,
  MERCHANDISE_OPEN_NOTE,
  EVENT_DETAILS_MARKDOWN,
  build2027kChallengeEventPayload
};
