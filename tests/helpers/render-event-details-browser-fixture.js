'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const {
  buildPublicEventSeo,
  buildPublicEventView,
  renderEventDetailsContent
} = require('../../src/utils/event-public-view');

const ROOT = path.resolve(__dirname, '../..');
const outputPath = path.resolve(process.argv[2] || '/tmp/hellorun-event-v2.html');
const now = new Date('2026-11-17T12:00:00+08:00');
const event = {
  _id: 'browser-fixture-event',
  status: 'published',
  title: 'Baguio Community Run 2026',
  slug: 'baguio-community-run-2026',
  organiserName: 'HelloRun Community',
  description: 'Join an inclusive hybrid run with clear race-day and virtual participation options.',
  eventDetailsMarkdown: '## Runner notes\n\nBring water, review your selected category, and follow organizer safety instructions.',
  eventType: 'hybrid',
  eventTypesAllowed: ['onsite', 'virtual'],
  venueName: 'Baguio Athletic Bowl',
  venueAddress: 'Burnham Park',
  city: 'Baguio',
  country: 'PH',
  registrationOpenAt: '2026-10-01T00:00:00+08:00',
  registrationCloseAt: '2026-11-30T23:59:59+08:00',
  eventStartAt: '2026-12-06T05:00:00+08:00',
  eventEndAt: '2026-12-06T12:00:00+08:00',
  virtualWindow: {
    startAt: '2026-12-01T00:00:00+08:00',
    endAt: '2026-12-06T23:59:59+08:00'
  },
  finalSubmissionDeadlineAt: '2026-12-07T23:59:59+08:00',
  acceptedRunTypes: ['run', 'walk'],
  proofTypesAllowed: ['photo', 'manual'],
  feeMode: 'paid',
  pricingMode: 'distance_based',
  feeAmount: 500,
  feeCurrency: 'PHP',
  raceCategories: [
    { categoryId: '5k-open', name: '5K Open', type: 'distance', distanceLabel: '5K', distanceKm: 5, slots: 100, reserved: 72 },
    { categoryId: '10k-open', name: '10K Open', type: 'distance', distanceLabel: '10K', distanceKm: 10, slots: 80, reserved: 80 }
  ],
  distancePricing: [
    { categoryId: '5k-open', distance: '5K', amount: 500 },
    { categoryId: '10k-open', distance: '10K', amount: 750 }
  ],
  waitlistEnabled: true,
  physicalRewardsEnabled: true,
  physicalRewardMedalEnabled: true,
  physicalRewardsDescription: 'Verified finishers receive the configured medal.',
  physicalRewardsClaimingNotes: 'Claim onsite with your bib or choose delivery during registration.',
  claimingMethod: 'both',
  deliveryFeeEnabled: true,
  deliveryFeeAmount: 120,
  deliveryFeeDescription: 'Delivery is available within the Philippines.',
  digitalCertificateEnabled: true,
  leaderboardRecognitionEnabled: true
};

const baseUrl = 'https://hellorun.test';
const publicEvent = buildPublicEventView(event, {
  now,
  registrationCount: 72,
  eventBadges: [],
  runningAppSyncAvailable: false
});
const seo = buildPublicEventSeo(event, baseUrl);
const locals = {
  ads: { canRender: () => false, getSlot: () => null },
  assetVersion: 'browser-fixture',
  canUseAnalytics: false,
  cookiePreferences: { functional: false, analytics: false, hasChoice: true },
  cspNonce: 'browser-fixture',
  csrfToken: 'browser-fixture',
  currentPath: `/events/${event.slug}`,
  flash: null,
  isAuthenticated: false,
  isRunnerWorkspace: false,
  message: null,
  minimalFooter: false,
  renderRunProofModal: false,
  seo,
  user: null
};

const viewData = {
  title: `${event.title} - HelloRun`,
  seo,
  share: { url: `${baseUrl}/events/${event.slug}`, title: event.title, description: event.description },
  event,
  publicEvent,
  badges: [],
  eventShop: { href: `/events/${event.slug}/shop`, products: [], count: 0 },
  runnerEventState: null,
  runnerAccessNotice: null,
  existingRegistration: null,
  contactCooldown: null,
  isSaved: false,
  relatedEvents: [],
  eventDetailsHtml: renderEventDetailsContent(event.eventDetailsMarkdown),
  countryName: (value) => value,
  previewMode: false,
  locals
};

ejs.renderFile(path.join(ROOT, 'src/views/pages/event-details.ejs'), viewData, {
  views: [path.join(ROOT, 'src/views')]
}, (error, html) => {
  if (error) throw error;
  const publicRoot = `file://${path.join(ROOT, 'src/public')}`;
  const browserHtml = html
    .replaceAll('href="/css/', `href="${publicRoot}/css/`)
    .replaceAll('src="/js/', `src="${publicRoot}/js/`)
    .replaceAll('src="/images/', `src="${publicRoot}/images/`)
    .replace('</body>', '<script>document.documentElement.dataset.qaOverflow = String(document.documentElement.scrollWidth > document.documentElement.clientWidth); document.documentElement.dataset.qaH1 = String(document.querySelectorAll("h1").length); document.documentElement.dataset.qaPrimaryAction = String(Boolean(document.querySelector(".event-hero-actions .btn-primary"))); document.documentElement.dataset.qaStatus = String(Boolean(document.querySelector(".event-chip-status"))); document.documentElement.dataset.qaSkipTarget = String(Boolean(document.getElementById("main-content")));<\/script></body>');
  fs.writeFileSync(outputPath, browserHtml);
  process.stdout.write(`${outputPath}\n`);
});
