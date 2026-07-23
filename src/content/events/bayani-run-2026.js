const { DEFAULT_WAIVER_TEMPLATE } = require('../../utils/waiver');

const SLUG = 'bayani-run-2026';

const DATES = Object.freeze({
  publicAt: new Date('2026-08-10T00:00:00+08:00'),
  registrationOpenAt: new Date('2026-08-10T00:00:00+08:00'),
  registrationCloseAt: new Date('2026-08-31T23:59:00+08:00'),
  activityStartAt: new Date('2026-08-24T00:00:00+08:00'),
  activityEndAt: new Date('2026-08-31T23:59:00+08:00'),
  submissionDeadlineAt: new Date('2026-09-14T23:59:00+08:00')
});

const RACE_CATEGORIES = Object.freeze([
  {
    categoryId: 'bayani-5k-courage',
    name: '5K Courage',
    type: 'distance',
    distanceLabel: '5K',
    distanceKm: 5,
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: 'Digital finisher badge and certificate after eligible activities are approved and the event is finalized.'
  },
  {
    categoryId: 'bayani-10k-strength',
    name: '10K Strength',
    type: 'distance',
    distanceLabel: '10K',
    distanceKm: 10,
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: 'Digital finisher badge and certificate after eligible activities are approved and the event is finalized.'
  },
  {
    categoryId: 'bayani-21k-hero-challenge',
    name: '21K Hero Challenge',
    type: 'challenge',
    distanceLabel: '21K',
    distanceKm: 21,
    slots: null,
    cutoffTime: '',
    ageGroup: '',
    rewardsDescription: 'Digital finisher badge and certificate after eligible activities are approved and the event is finalized.'
  }
]);

const EVENT_DETAILS_MARKDOWN = `
## Run with courage. Finish with purpose.

Bayani Run 2026 is a free virtual challenge celebrating the courage, service, and everyday contributions of ordinary Filipinos. The event takes place during National History Month and concludes on National Heroes Day, without centering the story on a single historical or political figure.

## Choose your goal

- **5K Courage** — complete 5 kilometres.
- **10K Strength** — complete 10 kilometres.
- **21K Hero Challenge** — complete 21 kilometres. This category is an event goal and is not presented as a certified 21.0975 km half marathon.

Choose one category when registering. Your selected category determines your event-specific target.

## Complete it in one run or accumulate activities

You may reach your selected goal with one eligible activity or with several separate eligible activities completed from **August 24 through August 31, 2026**. Each activity must be submitted separately so its date, distance, duration, activity type, and evidence can be reviewed. Approved distance counts toward your official progress; pending distance remains unofficial, and rejected distance does not count.

Running, walking, and trail-running activities are accepted. Use an appropriate route, treadmill, app, or device, and follow the current submission form and event rules. A visible dashboard total alone is not enough when the underlying activities cannot be reviewed.

## Registration and submission dates

- Public listing and free registration open: **August 10, 2026**
- Activity window: **August 24–31, 2026**
- Registration closes: **August 31, 2026 at 11:59 PM**
- Final proof-submission deadline: **September 14, 2026 at 11:59 PM**

HelloRun uses Asia/Manila for current day-level event checks. The structured dates shown on the live event page and registration form remain authoritative.

## Proof and review

Submit a readable JPEG, PNG, or WebP activity screenshot, or select a supported activity from your connected Strava account when available. Confirm the activity date, type, distance in kilometres, duration, and location before submitting. OCR may assist with field entry, but runners remain responsible for checking the values. Submissions may be approved automatically when eligible or reviewed by an organiser or administrator.

## Recognition

Eligible finishers can receive a configured Bayani Run digital badge and certificate after their activities are approved and the accumulated challenge is finalized. Reaching the selected goal does not make pending evidence official or immediately finalize a certificate. Recognition is tied to this event and is not certified timing or a qualifying result.

## Run responsibly

Choose a route, time, and activity format that fits your ability and local conditions. Check weather, heat, flood, visibility, traffic, and surface conditions before starting. Postpone an activity when conditions are unsafe rather than chasing a deadline. Protect private home locations and unnecessary health information when preparing screenshots.

Bayani Run celebrates purpose through participation: showing up for your goal, your community, and the everyday work that helps others move forward.
`.trim();

function buildBayaniRunEventPayload({ organizerId, approvedBy, referenceCode, bannerUrl, logoUrl, badgeImageUrl, posterUrl, now = new Date() }) {
  return {
    organizerId,
    slug: SLUG,
    referenceCode,
    title: 'Bayani Run 2026',
    organiserName: 'HelloRun',
    description: 'Run with courage. Finish with purpose. A free virtual accumulated-distance challenge celebrating the courage and service of ordinary Filipinos during National History Month.',
    eventDetailsMarkdown: EVENT_DETAILS_MARKDOWN,
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K', '10K', '21K'],
    raceCategories: RACE_CATEGORIES.map((category) => ({ ...category })),
    registrationOpenAt: DATES.registrationOpenAt,
    registrationCloseAt: DATES.registrationCloseAt,
    publicListingAvailableAt: DATES.publicAt,
    autoEmailPromotionEnabled: true,
    autoEmailPromotionStatus: 'pending',
    autoEmailPromotionScheduledAt: DATES.publicAt,
    eventStartAt: DATES.activityStartAt,
    eventEndAt: DATES.activityEndAt,
    virtualWindow: { startAt: DATES.activityStartAt, endAt: DATES.activityEndAt },
    venueName: 'Virtual — participant-selected eligible route or treadmill',
    city: '',
    province: '',
    country: 'PH',
    proofTypesAllowed: ['running_app_sync', 'photo'],
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: 21,
    minimumActivityDistanceKm: null,
    acceptedRunTypes: ['run', 'walk', 'trail_run'],
    finalSubmissionDeadlineAt: DATES.submissionDeadlineAt,
    milestoneDistancesKm: [5, 10, 21],
    recognitionMode: 'completion_only',
    leaderboardMode: 'finishers',
    feeMode: 'free',
    feeAmount: null,
    feeCurrency: 'PHP',
    pricingMode: 'free',
    digitalBadgeEnabled: true,
    digitalCertificateEnabled: true,
    leaderboardRecognitionEnabled: false,
    leaderboardSettings: {
      enabled: false,
      type: 'accumulated_challenge',
      rankingBasis: 'highest_verified_distance',
      visibility: 'public',
      showPending: false,
      hideFlagged: true,
      nameDisplayMode: 'first_name_last_initial',
      visibleColumns: ['rank', 'runner', 'category', 'distance', 'status']
    },
    physicalRewardsEnabled: false,
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
  RACE_CATEGORIES,
  EVENT_DETAILS_MARKDOWN,
  buildBayaniRunEventPayload
};
