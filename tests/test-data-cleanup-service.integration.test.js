// WARNING: purgeTestData() operates on every Event flagged isTestData in the connected
// database, not just fixtures this file creates. Only run this against a local/staging
// database you're fine having ALL isTestData events (and everything linked to them)
// permanently deleted from — never against production.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const EventPromotion = require('../src/models/EventPromotion');
const CertificateTemplate = require('../src/models/CertificateTemplate');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');
const { syncEventShadow } = require('../src/services/event-shadow.service');
const { syncRegistrationPaymentShadow } = require('../src/services/registration-payment-shadow.service');
const { syncSubmissionShadow } = require('../src/services/submission-shadow.service');
const { getTestDataCounts, purgeTestData } = require('../src/services/test-data-cleanup.service');

// Purges everything it seeds itself (that's the feature under test), so cleanup only
// needs to remove the Users, which purgeTestData never touches.
const seededUserIds = [];

function hasRequiredEnvironment() {
  if (!String(process.env.DATABASE_URL || '').trim()) {
    test.skip('DATABASE_URL is not configured for test-data-cleanup integration tests');
    return false;
  }
  if (!String(process.env.MONGODB_URI || '').trim()) {
    test.skip('MONGODB_URI is not configured for test-data-cleanup integration tests');
    return false;
  }
  return true;
}

test.before(async () => {
  if (String(process.env.MONGODB_URI || '').trim()) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

test.after(async () => {
  if (seededUserIds.length) {
    await User.deleteMany({ _id: { $in: seededUserIds } });
  }
  await closePostgresClient();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

async function seedPurgeFixture() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);

  const runner = await User.create({
    userId: `UPURGE${stamp}`.replace(/\W/g, '').slice(0, 22),
    email: `purge.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Purge',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000111',
    country: 'PH',
    emergencyContactName: 'Emergency Purge',
    emergencyContactNumber: '09170000112'
  });
  const organizer = await User.create({
    userId: `UPURGEO${stamp}`.replace(/\W/g, '').slice(0, 22),
    email: `purge.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Purge',
    lastName: 'Organizer',
    emailVerified: true
  });
  seededUserIds.push(runner._id, organizer._id);

  const now = Date.now();
  const event = await Event.create({
    isTestData: true,
    organizerId: organizer._id,
    slug: `purge-fixture-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `PRG-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Purge Fixture Event ${stamp}`.slice(0, 150),
    organiserName: 'Purge Organizer',
    description: 'test-data-cleanup integration fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    feeAmount: 250,
    raceDistances: ['5 km'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now - 60 * 60 * 1000),
    eventEndAt: new Date(now + 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const registration = await Registration.create({
    eventId: event._id,
    userId: runner._id,
    participant: {
      firstName: runner.firstName,
      lastName: runner.lastName,
      email: runner.email,
      mobile: runner.mobile,
      country: runner.country,
      emergencyContactName: runner.emergencyContactName,
      emergencyContactNumber: runner.emergencyContactNumber
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'paid',
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    waiver: {
      accepted: true,
      version: 1,
      signature: 'Purge Runner',
      acceptedAt: new Date(),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    registeredAt: new Date()
  });

  const submission = await Submission.create({
    registrationId: registration._id,
    eventId: event._id,
    runnerId: runner._id,
    participationMode: 'virtual',
    raceDistance: '5 km',
    distanceKm: 5,
    elapsedMs: 1800000,
    proofType: 'gps',
    proof: {
      url: 'https://example.com/purge-fixture-proof.gpx',
      mimeType: 'application/gpx+xml',
      size: 1024
    },
    status: 'approved',
    reviewedAt: new Date(),
    reviewedBy: organizer._id
  });

  const accumulatedSubmission = await AccumulatedActivitySubmission.create({
    registrationId: registration._id,
    eventId: event._id,
    runnerId: runner._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1800000,
    proofType: 'gps',
    proof: {
      url: 'https://example.com/purge-fixture-activity.gpx',
      mimeType: 'application/gpx+xml',
      size: 1024
    },
    source: 'manual_upload',
    status: 'approved',
    submittedAt: new Date(),
    reviewedAt: new Date(),
    reviewedBy: organizer._id
  });

  const promotion = await EventPromotion.create({
    organizerId: organizer._id,
    eventId: event._id,
    audience: 'previous_participants',
    dateKey: new Date().toISOString().slice(0, 10)
  });

  const certificateTemplate = await CertificateTemplate.create({
    eventId: event._id,
    organizerId: organizer._id
  });

  await User.updateOne({ _id: runner._id }, { $addToSet: { savedEvents: event._id } });

  // Post-save shadow-sync hooks on Event/Registration/Submission are fire-and-forget
  // background jobs; call them directly here and await so the Postgres rows this test
  // asserts against are guaranteed to exist before purgeTestData runs.
  await syncEventShadow(event, { operation: 'live_sync' });
  await syncRegistrationPaymentShadow(registration, { operation: 'live_sync' });
  await syncSubmissionShadow(submission, { operation: 'live_sync' });

  return {
    runner, organizer, event, registration, submission, accumulatedSubmission, promotion, certificateTemplate
  };
}

async function countPostgresRowsForEvent(mongoEventId) {
  const sql = getPostgresClient();
  const [eventsCore, registrations, submissionsCore] = await Promise.all([
    sql`select count(*)::int as count from events_core where mongo_event_id = ${mongoEventId}`,
    sql`select count(*)::int as count from registrations where mongo_event_id = ${mongoEventId}`,
    sql`
      select count(*)::int as count from submissions_core
      where event_id in (select id from events_core where mongo_event_id = ${mongoEventId})
    `
  ]);
  return {
    eventsCore: eventsCore[0].count,
    registrations: registrations[0].count,
    submissionsCore: submissionsCore[0].count
  };
}

test('purgeTestData deletes a test-data event and everything linked to it, in Mongo and Postgres', async () => {
  if (!hasRequiredEnvironment()) return;

  const fixture = await seedPurgeFixture();
  const mongoEventId = String(fixture.event._id);

  const beforeCounts = await countPostgresRowsForEvent(mongoEventId);
  assert.equal(beforeCounts.eventsCore, 1, 'events_core shadow row should exist before purge');
  assert.equal(beforeCounts.registrations, 1, 'registrations shadow row should exist before purge');
  assert.equal(beforeCounts.submissionsCore, 1, 'submissions_core shadow row should exist before purge');

  const previewCounts = await getTestDataCounts();
  assert.ok(previewCounts.events >= 1, 'preview should include the seeded test-data event');

  const summary = await purgeTestData({ actorUserId: fixture.organizer._id });
  assert.ok(summary.eventsDeleted >= 1);
  assert.ok(summary.registrationsDeleted >= 1);
  assert.ok(summary.submissionsDeleted >= 1);
  assert.ok(summary.accumulatedSubmissionsDeleted >= 1);
  assert.ok(summary.promotionsDeleted >= 1);
  assert.ok(summary.certificateTemplatesDeleted >= 1);

  const [
    remainingEvent, remainingRegistration, remainingSubmission,
    remainingAccumulated, remainingPromotion, remainingCertTemplate, remainingRunner
  ] = await Promise.all([
    Event.findById(fixture.event._id).lean(),
    Registration.findById(fixture.registration._id).lean(),
    Submission.findById(fixture.submission._id).lean(),
    AccumulatedActivitySubmission.findById(fixture.accumulatedSubmission._id).lean(),
    EventPromotion.findById(fixture.promotion._id).lean(),
    CertificateTemplate.findById(fixture.certificateTemplate._id).lean(),
    User.findById(fixture.runner._id).select('savedEvents').lean()
  ]);
  assert.equal(remainingEvent, null, 'Event should be hard-deleted');
  assert.equal(remainingRegistration, null, 'Registration should be hard-deleted');
  assert.equal(remainingSubmission, null, 'Submission should be hard-deleted');
  assert.equal(remainingAccumulated, null, 'AccumulatedActivitySubmission should be hard-deleted');
  assert.equal(remainingPromotion, null, 'EventPromotion should be hard-deleted');
  assert.equal(remainingCertTemplate, null, 'CertificateTemplate should be hard-deleted');
  assert.ok(
    !(remainingRunner.savedEvents || []).some((id) => String(id) === mongoEventId),
    'purged event should be pulled from User.savedEvents'
  );

  const afterCounts = await countPostgresRowsForEvent(mongoEventId);
  assert.equal(afterCounts.eventsCore, 0, 'events_core shadow row should be gone after purge');
  assert.equal(afterCounts.registrations, 0, 'registrations shadow row should be gone after purge');
  assert.equal(afterCounts.submissionsCore, 0, 'submissions_core shadow row should be gone after purge');

  // Re-running against an already-clean set of test-data events should be a safe no-op.
  const secondSummary = await purgeTestData({ actorUserId: fixture.organizer._id });
  assert.equal(secondSummary.eventsDeleted, 0);
});
