const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Event = require('../src/models/Event');
const {
  DATES,
  FAQ_ITEMS,
  build2027kChallengeEventPayload
} = require('../src/content/events/2027k-hellorun-challenge');
const { buildPublicEventView } = require('../src/utils/event-public-view');
const { getPublishReadinessErrors, getCreateEventFormDataFromEvent } = require('../src/services/event-form.service');
const { isSubmissionWindowOpen, isRunDateAlignedWithEvent } = require('../src/utils/submission-window');
const { resolveAccumulatedTargetDistanceKm } = require('../src/services/accumulated-target.service');

const PUBLISHED_AT = new Date('2026-11-23T08:00:00+08:00');

function buildEvent(overrides = {}) {
  const payload = build2027kChallengeEventPayload({
    organizerId: new mongoose.Types.ObjectId(),
    approvedBy: new mongoose.Types.ObjectId(),
    referenceCode: '2HC-TEST',
    registrationOpenAt: PUBLISHED_AT,
    media: {
      bannerImageUrl: 'https://cdn.example.test/banner.webp',
      posterImageUrl: 'https://cdn.example.test/poster.webp',
      badgeImageUrl: 'https://cdn.example.test/badge.webp',
      merchandiseImageItems: [{ url: 'https://cdn.example.test/medal.webp', key: 'medal', alt: 'Medal' }]
    },
    now: PUBLISHED_AT
  });
  return new Event({ ...payload, ...overrides });
}

const registration = { participationMode: 'virtual', registeredAt: PUBLISHED_AT };

test('2027k payload validates and passes the publish readiness check', () => {
  const event = buildEvent();
  assert.equal(event.validateSync(), undefined);
  assert.deepEqual(getPublishReadinessErrors(event), []);
});

test('2027k payload stores the exact Manila cutoffs and opens registration at publication', () => {
  const event = buildEvent();
  assert.equal(event.registrationOpenAt.toISOString(), PUBLISHED_AT.toISOString());
  assert.equal(event.publicListingAvailableAt, null);
  assert.equal(event.registrationCloseAt.toISOString(), '2027-11-30T15:59:59.000Z');
  assert.equal(event.eventStartAt.toISOString(), '2026-12-31T16:00:00.000Z');
  assert.equal(event.virtualWindow.startAt.toISOString(), '2026-12-31T16:00:00.000Z');
  assert.equal(event.eventEndAt.toISOString(), '2027-12-31T15:59:59.000Z');
  assert.equal(event.virtualWindow.endAt.toISOString(), '2027-12-31T15:59:59.000Z');
  assert.equal(event.finalSubmissionDeadlineAt.toISOString(), '2028-01-14T15:59:59.000Z');
});

test('2027k payload refuses a missing or late publication instant', () => {
  const base = { organizerId: 'o', approvedBy: 'a', referenceCode: 'r' };
  assert.throws(() => build2027kChallengeEventPayload(base), /publication instant/);
  assert.throws(
    () => build2027kChallengeEventPayload({ ...base, registrationOpenAt: new Date(DATES.registrationCloseAt.getTime() + 1) }),
    /before the registration close/
  );
});

test('2027k is free, account-only, worldwide and has one 2027 km category', () => {
  const event = buildEvent();
  assert.equal(event.feeMode, 'free');
  assert.equal(event.pricingMode, 'free');
  assert.equal(event.allowGuestRegistration, false);
  assert.equal(event.registrationPackages.length, 0);
  assert.equal(event.raceCategories.length, 1);
  assert.equal(event.raceCategories[0].name, '2027K');
  assert.equal(resolveAccumulatedTargetDistanceKm({ raceDistance: '2027K' }, event), 2027);
  assert.deepEqual([...event.acceptedRunTypes], ['run', 'walk', 'hike', 'trail_run', 'treadmill']);
  assert.equal(event.autoEmailPromotionEnabled, false);
  const formData = getCreateEventFormDataFromEvent(event);
  assert.equal(Number(formData.targetDistanceKm), 2027);
});

test('2027k public page offers free registration now, before the activity period', () => {
  const now = new Date('2026-11-23T09:00:00+08:00');
  const view = buildPublicEventView(buildEvent(), { now });
  assert.equal(view.registrationState.canRegisterNow, true);
  assert.deepEqual(view.primaryCta, { label: 'Register for free', href: '/events/2027k-hellorun-challenge/register', disabled: false });
  assert.equal(view.packageOptions.length, 0);
  assert.equal(view.faqItems.length, FAQ_ITEMS.length);
  assert.doesNotMatch(JSON.stringify(view), /Coming soon|Dec 1, 2026|December 1, 2026/i);
});

test('2027k registration stays open through Nov 30, 2027 Manila and closes after it', () => {
  const event = buildEvent();
  const lastSecond = buildPublicEventView(event, { now: new Date('2027-11-30T23:59:59+08:00') });
  const afterClose = buildPublicEventView(event, { now: new Date('2027-12-01T00:00:00+08:00') });
  assert.equal(lastSecond.registrationState.canRegisterNow, true);
  assert.equal(afterClose.registrationState.canRegisterNow, false);
});

test('2027k proof uploads open Jan 1, 2027 and close after Jan 14, 2028 23:59:59 Manila', () => {
  const event = buildEvent();
  const at = (iso) => isSubmissionWindowOpen({ registration, event, now: new Date(iso) });
  assert.equal(at('2026-12-31T23:59:59+08:00'), false);
  assert.equal(at('2027-01-01T00:00:00+08:00'), true);
  assert.equal(at('2028-01-14T23:59:59+08:00'), true);
  assert.equal(at('2028-01-15T00:00:00+08:00'), false);
});

test('2027k counts only workouts dated inside calendar 2027, including ones before registration', () => {
  const event = buildEvent();
  const aligned = (day) => isRunDateAlignedWithEvent({ event, runDate: new Date(`${day}T00:00:00.000Z`) });
  assert.equal(aligned('2026-12-31'), false);
  assert.equal(aligned('2027-01-01'), true);
  assert.equal(aligned('2027-12-31'), true);
  assert.equal(aligned('2028-01-01'), false);
  // A runner who registers in March may still submit a January workout.
  const lateRegistration = new Date('2027-03-15T10:00:00+08:00');
  assert.ok(new Date('2027-01-10T00:00:00.000Z') < lateRegistration);
  assert.equal(aligned('2027-01-10'), true);
});
