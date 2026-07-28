'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadEventOperationalCounts,
  loadAccumulatedOperations,
  buildOperationalPhase,
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

test('operational phase follows registration, activity, submission, and final-review boundaries', () => {
  const event = {
    status: 'published',
    registrationOpenAt: new Date('2026-07-08T00:00:00Z'),
    registrationCloseAt: new Date('2026-07-22T23:59:00Z'),
    eventStartAt: new Date('2026-07-12T00:00:00Z'),
    eventEndAt: new Date('2026-07-25T23:59:00Z'),
    finalSubmissionDeadlineAt: new Date('2026-08-08T23:59:00Z')
  };
  assert.equal(buildOperationalPhase(event, {}, new Date('2026-07-10T00:00:00Z')).key, 'registration_open');
  const active = buildOperationalPhase(event, {}, new Date('2026-07-23T00:00:00Z'));
  assert.equal(active.key, 'activity_underway');
  assert.match(active.detail, /Registration is closed/);
  assert.equal(buildOperationalPhase(event, {}, new Date('2026-07-27T00:00:00Z')).key, 'final_submissions');
  assert.equal(buildOperationalPhase(event, { pendingResults: 2 }, new Date('2026-08-10T00:00:00Z')).key, 'final_review');
  assert.equal(buildOperationalPhase(event, { pendingResults: 0 }, new Date('2026-08-10T00:00:00Z')).key, 'completed');
  assert.equal(buildOperationalPhase({ status: 'published' }, {}, new Date('2026-07-23T00:00:00Z')).label, 'Activity dates not configured');
});

test('accumulated operations separate statuses and require a resolvable goal for completion', async () => {
  const event = {
    _id: 'event-1',
    virtualCompletionMode: 'accumulated_distance',
    raceCategories: [{ categoryId: '5k', distanceKm: 5 }]
  };
  const RegistrationModel = {
    aggregate: async () => [
      { _id: 'reg-1', raceDistance: '5K' },
      { _id: 'reg-2', raceDistance: '10K' },
      { _id: 'reg-3', raceDistance: 'Custom goal' }
    ]
  };
  const AccumulatedModel = {
    aggregate: async () => [
      { _id: { registrationId: 'reg-1', status: 'approved' }, activityCount: 2, distanceKm: 6 },
      { _id: { registrationId: 'reg-2', status: 'submitted' }, activityCount: 1, distanceKm: 4 },
      { _id: { registrationId: 'reg-3', status: 'approved' }, activityCount: 1, distanceKm: 100 },
      { _id: { registrationId: 'reg-1', status: 'rejected' }, activityCount: 1, distanceKm: 2 }
    ]
  };
  const summary = await loadAccumulatedOperations(event, { RegistrationModel, AccumulatedModel });
  assert.equal(summary.participantsStarted, 2);
  assert.equal(summary.goalsReached, 1);
  assert.equal(summary.missingGoalCount, 1);
  assert.equal(summary.approvedActivityCount, 3);
  assert.equal(summary.pendingActivityCount, 1);
  assert.equal(summary.rejectedActivityCount, 1);
  assert.equal(summary.approvedDistanceKm, 106);
});

test('Midyear Reset acceptance fixture reports live accumulated operations accurately', async () => {
  const event = {
    _id: '6a4df0c66b000a240ab9f9f7',
    slug: 'midyear-reset-run',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    virtualCompletionMode: 'accumulated_distance',
    feeMode: 'free',
    digitalCertificateEnabled: true,
    digitalBadgeEnabled: true,
    registrationOpenAt: new Date('2026-07-08T00:00:00Z'),
    registrationCloseAt: new Date('2026-07-22T23:59:00Z'),
    eventStartAt: new Date('2026-07-12T00:00:00Z'),
    eventEndAt: new Date('2026-07-25T23:59:00Z'),
    finalSubmissionDeadlineAt: new Date('2026-08-08T23:59:00Z'),
    raceCategories: [
      { name: '5K', distanceKm: 5 },
      { name: '10K', distanceKm: 10 },
      { name: '21K', distanceKm: 21 }
    ]
  };
  const registrations = [
    { _id: 'r1', raceDistance: '5K' },
    { _id: 'r2', raceDistance: '10K' },
    { _id: 'r3', raceDistance: '5K' },
    { _id: 'r4', raceDistance: '5K' },
    { _id: 'r5', raceDistance: '5K' },
    { _id: 'r6', raceDistance: '5K' },
    { _id: 'r7', raceDistance: '5K' },
    { _id: 'r8', raceDistance: '5K' }
  ];
  const RegistrationModel = {
    aggregate: async (pipeline) => pipeline.some((stage) => stage.$project)
      ? registrations
      : [{ total: 8, proofSubmitted: 0 }]
  };
  const SubmissionModel = { aggregate: async () => [] };
  const AccumulatedModel = {
    aggregate: async (pipeline) => {
      const group = pipeline.find((stage) => stage.$group)?.$group?._id;
      return typeof group === 'object'
        ? [
          { _id: { registrationId: 'r1', status: 'approved' }, activityCount: 4, distanceKm: 33.35 },
          { _id: { registrationId: 'r2', status: 'approved' }, activityCount: 2, distanceKm: 21.85 },
          { _id: { registrationId: 'r7', status: 'approved' }, activityCount: 1, distanceKm: 5.01 }
        ]
        : [{ _id: 'approved', count: 7 }];
    }
  };
  const presentation = await getOrganizerEventDetailPresentation({
    event,
    hasActiveCertificate: false,
    eventBadgeCount: 0,
    now: new Date('2026-07-23T00:00:00Z')
  }, { RegistrationModel, SubmissionModel, AccumulatedModel });
  assert.equal(presentation.operationalPhase.key, 'activity_underway');
  assert.match(presentation.operationalPhase.detail, /Registration is closed/);
  assert.equal(presentation.counts.registrations, 8);
  assert.equal(presentation.accumulatedOperations.participantsStarted, 3);
  assert.equal(presentation.accumulatedOperations.goalsReached, 3);
  assert.equal(presentation.accumulatedOperations.approvedActivityCount, 7);
  assert.equal(presentation.accumulatedOperations.approvedDistanceKm, 60.21);
  assert.deepEqual(presentation.recognitionTasks.map((item) => item.key), ['certificate', 'badge']);
  assert.equal(presentation.metrics.some((item) => item.key === 'payments'), false);
  assert.equal(presentation.contextualAction.label, 'View Registrants');
});

test('detail presentation exposes balanced facts, readiness, links, and scheduled visibility', async () => {
  const event = {
    _id: '6a032c808d2b6f284051f4e8', title: 'Bayani Run 2026', slug: 'bayani-run-2026',
    status: 'published', referenceCode: 'EVT-BAYANI', eventType: 'virtual', eventTypesAllowed: ['virtual'],
    virtualCompletionMode: 'accumulated_distance',
    publicListingAvailableAt: new Date('2026-08-10T00:00:00Z'), registrationOpenAt: new Date('2026-08-10T00:00:00Z'),
    registrationCloseAt: new Date('2026-08-23T15:59:59Z'), eventStartAt: new Date('2026-08-24T00:00:00Z'),
    eventEndAt: new Date('2026-08-31T15:59:59Z'), finalSubmissionDeadlineAt: new Date('2026-09-07T15:59:59Z'),
    feeMode: 'free', pricingMode: 'free', proofTypesAllowed: ['photo', 'running_app_sync'],
    raceCategories: [{ name: '21K Hero Challenge', distanceKm: 21 }],
    digitalCertificateEnabled: true, digitalBadgeEnabled: true, leaderboardRecognitionEnabled: true,
    bannerImageUrl: 'https://cdn.example/banner.webp', galleryImageUrls: ['https://cdn.example/gallery.webp']
  };
  const RegistrationModel = {
    aggregate: async (pipeline) => pipeline.some((stage) => stage.$project)
      ? [{ _id: 'registration-1', raceDistance: '21K' }]
      : [{ total: 10, proofSubmitted: 0 }]
  };
  const SubmissionModel = { aggregate: async () => [{ _id: 'approved', count: 2 }] };
  const AccumulatedModel = {
    aggregate: async (pipeline) => {
      const group = pipeline.find((stage) => stage.$group)?.$group?._id;
      return typeof group === 'object'
        ? [{ _id: { registrationId: 'registration-1', status: 'submitted' }, activityCount: 1, distanceKm: 5 }]
        : [{ _id: 'submitted', count: 1 }];
    }
  };
  const presentation = await getOrganizerEventDetailPresentation({
    event, hasActiveCertificate: false, eventBadgeCount: 0, publishReadinessErrors: [],
    now: new Date('2026-07-22T00:00:00Z')
  }, { RegistrationModel, SubmissionModel, AccumulatedModel });
  assert.equal(presentation.publicVisibleNow, false);
  assert.equal(presentation.lifecycle.title, 'Publication scheduled');
  assert.equal(presentation.metrics.find((item) => item.key === 'results').value, 1);
  assert.equal(presentation.metrics.find((item) => item.key === 'payments'), undefined);
  assert.equal(presentation.metrics.find((item) => item.key === 'started').value, 0);
  assert.equal(presentation.accumulatedOperations.pendingActivityCount, 1);
  assert.equal(presentation.categories[0].name, '21K Hero Challenge');
  assert.match(presentation.schedule[0].value, /2026/);
  assert.deepEqual(presentation.readinessTasks.map((item) => item.key), ['certificate', 'badge']);
  assert.deepEqual(presentation.tools.map((group) => group.group), ['Recognition', 'Commerce', 'Publishing', 'Records']);
  assert.equal(presentation.mediaItems[0].kind, 'banner');
});
