'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadEventOperationalCounts,
  buildLifecycle,
  getOrganizerEventDetailPresentation
} = require('../src/services/organizer-event-detail.service');

test('operational counts combine standard and accumulated review states', async () => {
  const RegistrationModel = { aggregate: async () => [{ _id: null, total: 14, proofSubmitted: 3 }] };
  const SubmissionModel = { aggregate: async () => [{ _id: 'submitted', count: 2 }, { _id: 'approved', count: 5 }] };
  const AccumulatedModel = { aggregate: async () => [{ _id: 'submitted', count: 4 }, { _id: 'approved', count: 7 }] };
  const counts = await loadEventOperationalCounts('event-1', { RegistrationModel, SubmissionModel, AccumulatedModel });
  assert.deepEqual(counts, {
    registrations: 14,
    pendingPayments: 3,
    pendingStandardResults: 2,
    pendingAccumulatedResults: 4,
    pendingResults: 6,
    approvedStandardResults: 5,
    approvedAccumulatedResults: 7,
    approvedResults: 12
  });
});

test('lifecycle chooses the authoritative action for every event state', () => {
  const base = { _id: 'event-1', slug: 'event-one' };
  assert.equal(buildLifecycle({ ...base, status: 'draft' }, ['Missing date'], false, '').action.label, 'Continue editing');
  assert.equal(buildLifecycle({ ...base, status: 'draft' }, [], false, '').action.nextStatus, 'pending_review');
  assert.equal(buildLifecycle({ ...base, status: 'pending_review' }, [], false, '').title, 'Awaiting admin review');
  assert.equal(buildLifecycle({ ...base, status: 'published' }, [], false, 'Aug 10').title, 'Publication scheduled');
  assert.equal(buildLifecycle({ ...base, status: 'published' }, [], true, '').action.href, '/events/event-one');
  assert.equal(buildLifecycle({ ...base, status: 'closed' }, [], false, '').action, null);
  assert.equal(buildLifecycle({ ...base, status: 'archived' }, [], false, '').title, 'Event is archived');
});

test('detail presentation exposes balanced facts, readiness, links, and scheduled visibility', async () => {
  const event = {
    _id: '6a032c808d2b6f284051f4e8', title: 'Bayani Run 2026', slug: 'bayani-run-2026',
    status: 'published', referenceCode: 'EVT-BAYANI', eventType: 'virtual', eventTypesAllowed: ['virtual'],
    publicListingAvailableAt: new Date('2026-08-10T00:00:00Z'), registrationOpenAt: new Date('2026-08-10T00:00:00Z'),
    registrationCloseAt: new Date('2026-08-23T15:59:59Z'), eventStartAt: new Date('2026-08-24T00:00:00Z'),
    eventEndAt: new Date('2026-08-31T15:59:59Z'), finalSubmissionDeadlineAt: new Date('2026-09-07T15:59:59Z'),
    feeMode: 'free', pricingMode: 'free', proofTypesAllowed: ['photo', 'running_app_sync'],
    raceCategories: [{ name: '21K Hero Challenge', distanceKm: 21 }],
    digitalCertificateEnabled: true, digitalBadgeEnabled: true, leaderboardRecognitionEnabled: true,
    bannerImageUrl: 'https://cdn.example/banner.webp', galleryImageUrls: ['https://cdn.example/gallery.webp']
  };
  const RegistrationModel = { aggregate: async () => [{ total: 10, proofSubmitted: 0 }] };
  const SubmissionModel = { aggregate: async () => [{ _id: 'approved', count: 2 }] };
  const AccumulatedModel = { aggregate: async () => [{ _id: 'submitted', count: 1 }] };
  const presentation = await getOrganizerEventDetailPresentation({
    event, hasActiveCertificate: false, eventBadgeCount: 0, publishReadinessErrors: [],
    now: new Date('2026-07-22T00:00:00Z')
  }, { RegistrationModel, SubmissionModel, AccumulatedModel });
  assert.equal(presentation.publicVisibleNow, false);
  assert.equal(presentation.lifecycle.title, 'Publication scheduled');
  assert.equal(presentation.metrics.find((item) => item.key === 'results').value, 1);
  assert.equal(presentation.metrics.find((item) => item.key === 'payments').href, '');
  assert.equal(presentation.categories[0].name, '21K Hero Challenge');
  assert.match(presentation.schedule[0].value, /2026/);
  assert.deepEqual(presentation.readinessTasks.map((item) => item.key), ['certificate', 'badge']);
  assert.deepEqual(presentation.tools.map((group) => group.group), ['Recognition', 'Commerce', 'Publishing', 'Records']);
  assert.equal(presentation.mediaItems[0].kind, 'banner');
});
