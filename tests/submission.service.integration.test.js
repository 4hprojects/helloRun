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
const Notification = require('../src/models/Notification');
const CommunicationLog = require('../src/models/CommunicationLog');
const DailyEmailUsage = require('../src/models/DailyEmailUsage');
const emailService = require('../src/services/email.service');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const {
  createSubmission,
  resubmitSubmission,
  reviewSubmission,
  getRunnerSubmissions,
  getEventSubmissionQueue,
  getRunnerSubmissionSummary,
  getRunnerPerformanceSnapshot,
  getRunnerEligibleSubmissionRegistrations,
  PERSONAL_RECORD_REGISTRATION_ID,
  detectSuspiciousActivity,
  isAutoApprovableOcrSubmission,
  buildSubmissionPayload
} = require('../src/services/submission.service');
const {
  assertRunDateNotFuture,
  getPlatformDateKey,
  parseRunDateOnly
} = require('../src/utils/platform-date');
const {
  createAccumulatedActivitySubmission,
  reviewAccumulatedActivitySubmission,
  getRegistrationAccumulatedProgress
} = require('../src/services/accumulated-activity.service');
const { resolveAccumulatedTargetDistanceKm } = require('../src/services/accumulated-target.service');

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
  await mongoose.disconnect();
});

test('createSubmission stores initial submission for paid registration', async () => {
  const seed = await seedSubmissionFixture('create');
  const runDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const submission = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 5,
    elapsedMs: 30 * 60 * 1000,
    runDate,
    runLocation: 'Bonifacio Global City',
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/create.gpx', mimeType: 'application/gpx+xml', size: 1024 },
    proofNotes: 'First upload'
  });

  assert.equal(submission.status, 'submitted');
  assert.equal(submission.submissionCount, 1);
  assert.equal(String(submission.registrationId), String(seed.registration._id));
  assert.equal(String(submission.runLocation || ''), 'Bonifacio Global City');
  assert.equal(new Date(submission.runDate).toISOString().slice(0, 10), runDate.toISOString().slice(0, 10));
});

test('createSubmission blocks unpaid registrations', async () => {
  const seed = await seedSubmissionFixture('unpaid', { paymentStatus: 'unpaid' });

  await assert.rejects(
    () =>
      createSubmission({
        registrationId: seed.registration._id,
        runnerId: seed.runner._id,
        distanceKm: 5,
        elapsedMs: 1500000,
        proofType: 'gps',
        proof: { url: 'https://example.com/proof/unpaid.gpx', size: 1200 }
      }),
    /requires a paid registration/i
  );
});

test('createSubmission blocks events outside submission window', async () => {
  const seed = await seedSubmissionFixture('closed-window');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        eventStartAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        eventEndAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    }
  );

  await assert.rejects(
    () =>
      createSubmission({
        registrationId: seed.registration._id,
        runnerId: seed.runner._id,
        distanceKm: 5,
        elapsedMs: 1500000,
        proofType: 'gps',
        proof: { url: 'https://example.com/proof/window.gpx', size: 1200 }
      }),
    /not currently accepting result submissions/i
  );
});

test('resubmitSubmission only allows rejected submissions and increments count', async () => {
  const seed = await seedSubmissionFixture('resubmit');
  const first = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 10,
    elapsedMs: 4200000,
    proofType: 'photo',
    proof: { url: 'https://example.com/proof/first.jpg', mimeType: 'image/jpeg', size: 4096 }
  });
  await reviewSubmission({
    submissionId: first._id,
    organizerId: seed.organizer._id,
    action: 'reject',
    rejectionReason: 'Blurry proof'
  });

  const resubmitted = await resubmitSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 10,
    elapsedMs: 4100000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/second.gpx', mimeType: 'application/gpx+xml', size: 2200 },
    proofNotes: 'Updated with GPS file'
  });

  assert.equal(resubmitted.status, 'submitted');
  assert.equal(resubmitted.submissionCount, 2);
  assert.equal(resubmitted.rejectionReason, '');
  assert.equal(resubmitted.ocrData.nameMatchStatus, 'not_checked');
  assert.equal(resubmitted.ocrData.extractedName, '');
});

test('reviewSubmission enforces organizer ownership and action guards', async () => {
  const seed = await seedSubmissionFixture('review-guard');
  const otherOrganizer = await createOrganizerUser('other-review-guard');
  const created = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 5,
    elapsedMs: 1700000,
    proofType: 'manual',
    proof: { url: 'https://example.com/proof/review.txt', mimeType: 'text/plain', size: 300 }
  });

  await assert.rejects(
    () =>
      reviewSubmission({
        submissionId: created._id,
        organizerId: otherOrganizer._id,
        action: 'approve'
      }),
    /not found or inaccessible/i
  );

  await assert.rejects(
    () =>
      reviewSubmission({
        submissionId: created._id,
        organizerId: seed.organizer._id,
        action: 'reject'
      }),
    /rejection reason is required/i
  );

  await Submission.updateOne(
    { _id: created._id },
    {
      $set: {
        suspiciousFlag: true,
        suspiciousFlagReason: 'High-confidence OCR mismatch detected.'
      }
    }
  );

  const approved = await reviewSubmission({
    submissionId: created._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'Validated from screenshot and app log'
  });
  assert.equal(approved.status, 'approved');
  assert.equal(approved.suspiciousFlag, false);
  assert.equal(approved.suspiciousFlagReason, '');
  assert.ok(String(approved.certificate?.url || '').length > 0);
  assert.ok(approved.certificate?.issuedAt);
});

test('reviewAccumulatedActivitySubmission clears suspicious metadata on approval', async () => {
  const seed = await seedSubmissionFixture('review-accumulated-clear-flag');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 10,
        minimumActivityDistanceKm: 1,
        acceptedRunTypes: ['run', 'walk']
      }
    }
  );

  const activity = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 4,
    elapsedMs: 20 * 60 * 1000,
    proofType: 'photo',
    proof: { url: 'https://example.com/proof/accumulated-flagged.png', size: 1200 },
    runType: 'run'
  });

  await AccumulatedActivitySubmission.updateOne(
    { _id: activity._id },
    {
      $set: {
        suspiciousFlag: true,
        suspiciousFlagReason: 'High-confidence OCR mismatch detected.'
      }
    }
  );

  const approved = await reviewAccumulatedActivitySubmission({
    activityId: activity._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'Manual review confirms this activity is valid.'
  });

  assert.equal(approved.status, 'approved');
  assert.equal(approved.suspiciousFlag, false);
  assert.equal(approved.suspiciousFlagReason, '');
});

test('reviewSubmission uses in-app defaults for approvals and emails rejected results', async () => {
  const approveSeed = await seedSubmissionFixture('notify-approve');
  const rejectSeed = await seedSubmissionFixture('notify-reject');

  const calls = {
    approved: [],
    rejected: [],
    certificate: []
  };

  const originalApproved = emailService.sendResultApprovedEmailToRunner;
  const originalRejected = emailService.sendResultRejectedEmailToRunner;
  const originalCertificate = emailService.sendCertificateIssuedEmailToRunner;

  emailService.sendResultApprovedEmailToRunner = async (...args) => {
    calls.approved.push(args);
    return { ok: true };
  };
  emailService.sendResultRejectedEmailToRunner = async (...args) => {
    calls.rejected.push(args);
    return { ok: true };
  };
  emailService.sendCertificateIssuedEmailToRunner = async (...args) => {
    calls.certificate.push(args);
    return { ok: true };
  };

  try {
    const approvedSubmission = await createSubmission({
      registrationId: approveSeed.registration._id,
      runnerId: approveSeed.runner._id,
      distanceKm: 5,
      elapsedMs: 1600000,
      proofType: 'gps',
      proof: { url: 'https://example.com/proof/notify-approve.gpx', mimeType: 'application/gpx+xml', size: 800 }
    });
    await reviewSubmission({
      submissionId: approvedSubmission._id,
      organizerId: approveSeed.organizer._id,
      action: 'approve',
      reviewNotes: 'Approved for notify test'
    });

    const rejectedSubmission = await createSubmission({
      registrationId: rejectSeed.registration._id,
      runnerId: rejectSeed.runner._id,
      distanceKm: 5,
      elapsedMs: 1700000,
      proofType: 'photo',
      proof: { url: 'https://example.com/proof/notify-reject.jpg', mimeType: 'image/jpeg', size: 900 }
    });
    await reviewSubmission({
      submissionId: rejectedSubmission._id,
      organizerId: rejectSeed.organizer._id,
      action: 'reject',
      rejectionReason: 'Incomplete screenshot',
      reviewNotes: 'Please include full route map.'
    });
  } finally {
    emailService.sendResultApprovedEmailToRunner = originalApproved;
    emailService.sendResultRejectedEmailToRunner = originalRejected;
    emailService.sendCertificateIssuedEmailToRunner = originalCertificate;
  }

  assert.equal(calls.approved.length, 0);
  assert.equal(calls.certificate.length, 0);
  assert.equal(calls.rejected.length, 1);

  assert.equal(calls.rejected[0][0], rejectSeed.runner.email);

  const approveNotifications = await Notification.find({ userId: approveSeed.runner._id }).lean();
  const rejectNotifications = await Notification.find({ userId: rejectSeed.runner._id }).lean();

  assert.ok(approveNotifications.some((item) => item.type === 'result_approved'));
  assert.ok(approveNotifications.some((item) => item.type === 'certificate_issued'));
  assert.ok(rejectNotifications.some((item) => item.type === 'result_rejected'));
});

test('getRunnerSubmissions and getEventSubmissionQueue return populated records', async () => {
  const seed = await seedSubmissionFixture('queries');
  await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 21.1,
    elapsedMs: 7800000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/query.gpx', mimeType: 'application/gpx+xml', size: 5500 }
  });

  const runnerList = await getRunnerSubmissions(seed.runner._id, { limit: 5 });
  const eventQueue = await getEventSubmissionQueue(seed.event._id, { status: 'submitted', limit: 5 });

  assert.ok(runnerList.length >= 1);
  assert.ok(eventQueue.length >= 1);
  assert.equal(runnerList[0].eventId.title, seed.event.title);
  assert.equal(eventQueue[0].runnerId.email, seed.runner.email);
});

test('getRunnerSubmissionSummary returns counts and recent certificates', async () => {
  const seed = await seedSubmissionFixture('summary');

  const submissionA = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 5,
    elapsedMs: 1600000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/summary-a.gpx', mimeType: 'application/gpx+xml', size: 900 }
  });

  await reviewSubmission({
    submissionId: submissionA._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'Approved'
  });

  const summary = await getRunnerSubmissionSummary(seed.runner._id, { certificateLimit: 3 });
  assert.equal(summary.counts.total >= 1, true);
  assert.equal(summary.counts.approved >= 1, true);
  assert.equal(summary.counts.certificates >= 1, true);
  assert.equal(Array.isArray(summary.recentCertificates), true);
  assert.equal(summary.recentCertificates.length >= 1, true);
  assert.equal(String(summary.recentCertificates[0].submissionId), String(submissionA._id));
});

test('getRunnerPerformanceSnapshot returns metrics, personal best, and timeline activity', async () => {
  const seed = await seedSubmissionFixture('snapshot');

  const submission = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 5,
    elapsedMs: 1500000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/snapshot.gpx', mimeType: 'application/gpx+xml', size: 800 }
  });

  await reviewSubmission({
    submissionId: submission._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'Approved for snapshot test'
  });

  const accumulatedEvent = await createEvent(seed.organizer, 'snapshot-accumulated');
  await Event.updateOne(
    { _id: accumulatedEvent._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 10
      }
    }
  );
  const accumulatedRegistration = await createRegistration({
    event: accumulatedEvent,
    runner: seed.runner,
    tag: 'snapshot-accumulated',
    paymentStatus: 'paid',
    status: 'confirmed'
  });
  const reviewedAt = new Date();
  const approvedAccumulated = await AccumulatedActivitySubmission.create({
    registrationId: accumulatedRegistration._id,
    eventId: accumulatedEvent._id,
    runnerId: seed.runner._id,
    participationMode: 'virtual',
    raceDistance: accumulatedRegistration.raceDistance,
    distanceKm: 7,
    elapsedMs: 45 * 60 * 1000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/snapshot-activity.gpx', mimeType: 'application/gpx+xml', size: 900 },
    status: 'approved',
    submittedAt: new Date(reviewedAt.getTime() - 60 * 1000),
    reviewedAt,
    certificate: {
      url: 'https://example.com/certificates/snapshot-activity.pdf',
      key: 'certificates/snapshot-activity.pdf',
      issuedAt: reviewedAt,
      status: 'generated'
    }
  });
  await AccumulatedActivitySubmission.create({
    registrationId: accumulatedRegistration._id,
    eventId: accumulatedEvent._id,
    runnerId: seed.runner._id,
    participationMode: 'virtual',
    raceDistance: accumulatedRegistration.raceDistance,
    distanceKm: 3,
    elapsedMs: 20 * 60 * 1000,
    proofType: 'photo',
    proof: { url: 'https://example.com/proof/snapshot-activity-pending.jpg', mimeType: 'image/jpeg', size: 900 },
    status: 'submitted',
    submittedAt: new Date(reviewedAt.getTime() - 30 * 1000)
  });

  const snapshot = await getRunnerPerformanceSnapshot(seed.runner._id, {
    recentLimit: 5,
    resultStatus: 'approved'
  });

  assert.equal(snapshot.counts.total, 3);
  assert.equal(snapshot.counts.submitted, 1);
  assert.equal(snapshot.counts.approved, 2);
  assert.equal(snapshot.counts.certificates, 2);
  assert.equal(snapshot.metrics.completedEvents, 2);
  assert.equal(snapshot.metrics.totalDistanceKm, 12);
  assert.equal(snapshot.personalBest !== null, true);
  assert.equal(Array.isArray(snapshot.recentSubmissions), true);
  assert.equal(snapshot.recentSubmissions.length, 2);
  assert.ok(snapshot.recentSubmissions.some((item) => item.submissionId === String(approvedAccumulated._id) && item.isAccumulatedActivity));
  assert.equal(Array.isArray(snapshot.recentActivity), true);
  assert.equal(snapshot.recentActivity.length >= 1, true);
});

test('runner performance snapshot includes accumulated activities and completes challenge only at target', async () => {
  const seed = await seedSubmissionFixture('snapshot-accumulated');
  await Event.updateOne(
    { _id: seed.event._id },
    { $set: { virtualCompletionMode: 'accumulated_distance', targetDistanceKm: 10 } }
  );
  await Registration.updateOne({ _id: seed.registration._id }, { $set: { raceDistance: '10K' } });

  const first = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 4,
    elapsedMs: 1200000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/accumulated-first.gpx', mimeType: 'application/gpx+xml', size: 800 }
  });
  await reviewAccumulatedActivitySubmission({
    activityId: first._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'Approved first activity'
  });

  const partial = await getRunnerPerformanceSnapshot(seed.runner._id, { recentLimit: 5 });
  assert.equal(partial.counts.approved >= 1, true);
  assert.equal(partial.metrics.totalDistanceKm >= 4, true);
  assert.equal(partial.metrics.completedEvents, 0);
  assert.equal(partial.recentSubmissions.some((item) => item.isAccumulatedActivity), true);
  assert.equal(partial.personalBest, null);

  const second = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 6,
    elapsedMs: 1800000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/accumulated-second.gpx', mimeType: 'application/gpx+xml', size: 900 }
  });
  await reviewAccumulatedActivitySubmission({
    activityId: second._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'Approved completion activity'
  });

  const completed = await getRunnerPerformanceSnapshot(seed.runner._id, {
    recentLimit: 5,
    resultStatus: 'approved'
  });
  assert.equal(completed.metrics.completedEvents, 1);
  assert.equal(completed.metrics.totalDistanceKm >= 10, true);
  assert.equal(completed.counts.certificates >= 1, true);
  assert.equal(completed.recentCertificates.some((item) => item.isAccumulatedActivity), true);
});

test('getRunnerEligibleSubmissionRegistrations returns only paid confirmed active entries', async () => {
  const seed = await seedSubmissionFixture('eligible-list');

  const draftEvent = await createEvent(seed.organizer, 'eligible-draft');
  await Event.updateOne({ _id: draftEvent._id }, { $set: { status: 'draft' } });
  await createRegistration({
    event: draftEvent,
    runner: seed.runner,
    tag: 'eligible-draft',
    paymentStatus: 'paid',
    status: 'confirmed'
  });

  const unpaidEvent = await createEvent(seed.organizer, 'eligible-unpaid');
  await createRegistration({
    event: unpaidEvent,
    runner: seed.runner,
    tag: 'eligible-unpaid',
    paymentStatus: 'unpaid',
    status: 'confirmed'
  });

  const existingSubmission = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 5,
    elapsedMs: 1500000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/eligible-existing.gpx', size: 800 }
  });
  await reviewSubmission({
    submissionId: existingSubmission._id,
    organizerId: seed.organizer._id,
    action: 'reject',
    rejectionReason: 'Please resubmit clearer proof.'
  });

  const options = await getRunnerEligibleSubmissionRegistrations(seed.runner._id);
  assert.equal(Array.isArray(options), true);
  assert.equal(options.length >= 1, true);
  assert.equal(options.some((item) => item.registrationId === String(seed.registration._id)), true);
  assert.equal(options.some((item) => item.eventId === String(draftEvent._id)), false);
  assert.equal(options.some((item) => item.eventId === String(unpaidEvent._id)), false);
});

test('getRunnerEligibleSubmissionRegistrations falls back to personal record when no event registration is eligible', async () => {
  const runner = await createRunnerUser('eligible-personal-record');
  const options = await getRunnerEligibleSubmissionRegistrations(runner._id);

  assert.equal(Array.isArray(options), true);
  assert.equal(options.length, 1);
  assert.equal(options[0].registrationId, PERSONAL_RECORD_REGISTRATION_ID);
  assert.equal(options[0].isPersonalRecord, true);
  assert.equal(options[0].eventTitle, 'Personal Record');
});

test('accumulated activities allow multiple proofs and count only approvals toward completion', async () => {
  const seed = await seedSubmissionFixture('accumulated-multiple');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 10,
        minimumActivityDistanceKm: 1,
        acceptedRunTypes: ['run', 'walk'],
        finalSubmissionDeadlineAt: new Date(Date.now() + 3 * 60 * 60 * 1000)
      }
    }
  );

  const first = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 4,
    elapsedMs: 25 * 60 * 1000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/accumulated-1.gpx', size: 1200 },
    runType: 'run'
  });
  const second = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 7,
    elapsedMs: 50 * 60 * 1000,
    proofType: 'photo',
    proof: { url: 'https://example.com/proof/accumulated-2.png', size: 1200 },
    runType: 'walk'
  });

  let progress = await getRegistrationAccumulatedProgress(seed.registration._id);
  assert.equal(progress.pendingDistanceKm, 11);
  assert.equal(progress.approvedDistanceKm, 0);
  assert.equal(progress.completed, false);

  await reviewAccumulatedActivitySubmission({
    activityId: first._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'First activity approved'
  });
  progress = await getRegistrationAccumulatedProgress(seed.registration._id);
  assert.equal(progress.approvedDistanceKm, 4);
  assert.equal(progress.completed, false);
  assert.equal(progress.certificateUrl, '');

  await reviewAccumulatedActivitySubmission({
    activityId: second._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'Completion activity approved'
  });
  progress = await getRegistrationAccumulatedProgress(seed.registration._id);
  assert.equal(progress.approvedDistanceKm, 11);
  assert.equal(progress.completed, true);
  assert.ok(progress.certificateActivityId);
  assert.ok(progress.certificateUrl);
});

test('accumulated target resolver prefers selected category and distance before event fallback', () => {
  const event = {
    targetDistanceKm: 200,
    raceCategories: [
      { categoryId: 'cat-100k', distanceKm: 100 },
      { categoryId: 'cat-200k', distanceKm: 200 }
    ]
  };

  assert.equal(resolveAccumulatedTargetDistanceKm({
    raceDistance: '200K',
    pricingSnapshot: {
      raceCategoryId: 'cat-100k',
      raceDistance: '100K'
    }
  }, event), 100);

  assert.equal(resolveAccumulatedTargetDistanceKm({
    raceDistance: '100KM',
    pricingSnapshot: {}
  }, event), 100);

  assert.equal(resolveAccumulatedTargetDistanceKm({
    raceDistance: 'Open Challenge',
    pricingSnapshot: {}
  }, event), 200);
});

test('accumulated progress and certificate completion use selected registration distance', async () => {
  const seed = await seedSubmissionFixture('accumulated-selected-target');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 200,
        raceDistances: ['100K', '200K'],
        raceCategories: [
          { categoryId: 'cat-100k', name: '100K', type: 'distance', distanceLabel: '100K', distanceKm: 100 },
          { categoryId: 'cat-200k', name: '200K', type: 'distance', distanceLabel: '200K', distanceKm: 200 }
        ],
        minimumActivityDistanceKm: 1,
        acceptedRunTypes: ['run']
      }
    }
  );
  await Registration.updateOne(
    { _id: seed.registration._id },
    {
      $set: {
        raceDistance: '100K',
        'pricingSnapshot.raceCategoryId': 'cat-100k',
        'pricingSnapshot.raceDistance': '100K'
      }
    }
  );

  const first = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 6.21,
    elapsedMs: 40 * 60 * 1000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/selected-target-1.gpx', size: 1200 },
    runType: 'run'
  });
  await reviewAccumulatedActivitySubmission({
    activityId: first._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'Approved'
  });

  let progress = await getRegistrationAccumulatedProgress(seed.registration._id);
  assert.equal(progress.targetDistanceKm, 100);
  assert.equal(progress.progressLabel, '6.21 km / 100 km');
  assert.equal(progress.completed, false);

  const second = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 93.79,
    elapsedMs: 10 * 60 * 60 * 1000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/selected-target-2.gpx', size: 1200 },
    runType: 'run'
  });
  await reviewAccumulatedActivitySubmission({
    activityId: second._id,
    organizerId: seed.organizer._id,
    action: 'approve',
    reviewNotes: 'Completion approved'
  });

  progress = await getRegistrationAccumulatedProgress(seed.registration._id);
  assert.equal(progress.targetDistanceKm, 100);
  assert.equal(progress.approvedDistanceKm, 100);
  assert.equal(progress.completed, true);
  assert.ok(progress.certificateActivityId);
  assert.ok(progress.certificateUrl);
});

test('accumulated activities enforce minimum distance and accepted activity types', async () => {
  const seed = await seedSubmissionFixture('accumulated-guards');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 10,
        minimumActivityDistanceKm: 2,
        acceptedRunTypes: ['run']
      }
    }
  );

  await assert.rejects(
    () => createAccumulatedActivitySubmission({
      registrationId: seed.registration._id,
      runnerId: seed.runner._id,
      distanceKm: 1,
      elapsedMs: 20 * 60 * 1000,
      proofType: 'gps',
      proof: { url: 'https://example.com/proof/too-short.gpx', size: 1200 },
      runType: 'run'
    }),
    /at least 2 km/i
  );

  await assert.rejects(
    () => createAccumulatedActivitySubmission({
      registrationId: seed.registration._id,
      runnerId: seed.runner._id,
      distanceKm: 3,
      elapsedMs: 20 * 60 * 1000,
      proofType: 'gps',
      proof: { url: 'https://example.com/proof/walk.gpx', size: 1200 },
      runType: 'walk'
    }),
    /activity type is not accepted/i
  );
});

test('accumulated activities accept any positive distance when no minimum is configured', async () => {
  const seed = await seedSubmissionFixture('accumulated-no-minimum');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 10,
        minimumActivityDistanceKm: null,
        acceptedRunTypes: ['run']
      }
    }
  );

  const activity = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 0.2,
    elapsedMs: 5 * 60 * 1000,
    proofType: 'gps',
    proof: { url: 'https://example.com/proof/small-positive.gpx', size: 1200 },
    runType: 'run'
  });

  assert.equal(activity.distanceKm, 0.2);
  assert.equal(activity.status, 'submitted');
});

test('accumulated activities keep enforcing legacy minimum distance when configured', async () => {
  const seed = await seedSubmissionFixture('accumulated-legacy-minimum');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 10,
        minimumActivityDistanceKm: 2,
        acceptedRunTypes: ['run']
      }
    }
  );

  await assert.rejects(
    () => createAccumulatedActivitySubmission({
      registrationId: seed.registration._id,
      runnerId: seed.runner._id,
      distanceKm: 1,
      elapsedMs: 20 * 60 * 1000,
      proofType: 'gps',
      proof: { url: 'https://example.com/proof/legacy-too-short.gpx', size: 1200 },
      runType: 'run'
    }),
    /at least 2 km/i
  );
});

test('accumulated activities auto-approve clean OCR and issue certificate only on completion', async () => {
  const seed = await seedSubmissionFixture('accumulated-auto-approve');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 10,
        minimumActivityDistanceKm: 1,
        acceptedRunTypes: ['run']
      }
    }
  );

  const first = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 4,
    elapsedMs: 25 * 60 * 1000,
    proofType: 'photo',
    proof: { url: 'https://example.com/proof/accumulated-auto-1.png', key: 'accumulated-auto-1', size: 1200 },
    runType: 'run',
    ocrData: {
      extractedDistanceKm: 4,
      extractedTimeMs: 25 * 60 * 1000,
      rawText: 'Submit Runner\n4.00 km\n25:00',
      confidence: 0.9,
      extractedName: 'Submit Runner',
      nameMatchStatus: 'matched'
    }
  });

  assert.equal(first.status, 'approved');
  assert.equal(first.reviewedBy, null);
  assert.equal(first.reviewNotes, 'Auto-approved from OCR name match.');
  assert.equal(first.certificate?.url || '', '');

  let progress = await getRegistrationAccumulatedProgress(seed.registration._id);
  assert.equal(progress.approvedDistanceKm, 4);
  assert.equal(progress.completed, false);
  assert.equal(progress.certificateUrl, '');

  const second = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 6,
    elapsedMs: 40 * 60 * 1000,
    proofType: 'photo',
    proof: { url: 'https://example.com/proof/accumulated-auto-2.png', key: 'accumulated-auto-2', size: 1200 },
    runType: 'run',
    ocrData: {
      extractedDistanceKm: 6,
      extractedTimeMs: 40 * 60 * 1000,
      rawText: 'Submit Runner\n6.00 km\n40:00',
      confidence: 0.9,
      extractedName: 'Submit Runner',
      nameMatchStatus: 'matched'
    }
  });

  assert.equal(second.status, 'approved');
  assert.ok(String(second.certificate?.url || '').length > 0);

  progress = await getRegistrationAccumulatedProgress(seed.registration._id);
  assert.equal(progress.approvedDistanceKm, 10);
  assert.equal(progress.completed, true);
  assert.equal(progress.pendingDistanceKm, 0);
  assert.ok(progress.certificateUrl);
});

test('accumulated activities keep suspicious OCR pending', async () => {
  const seed = await seedSubmissionFixture('accumulated-auto-pending');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 10,
        minimumActivityDistanceKm: 1,
        acceptedRunTypes: ['run']
      }
    }
  );

  const activity = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 4,
    elapsedMs: 25 * 60 * 1000,
    proofType: 'photo',
    proof: { url: 'https://example.com/proof/accumulated-pending.png', key: 'accumulated-pending', size: 1200 },
    runType: 'run',
    ocrData: {
      extractedDistanceKm: 4,
      extractedTimeMs: 25 * 60 * 1000,
      rawText: 'Different Runner\n4.00 km\n25:00',
      confidence: 0.9,
      extractedName: 'Different Runner',
      nameMatchStatus: 'mismatched',
      nameMismatchAcknowledged: true
    }
  });

  assert.equal(activity.status, 'submitted');
  assert.equal(activity.suspiciousFlag, true);
  assert.match(activity.suspiciousFlagReason, /name does not match/i);
});

test('accumulated activities auto-approve validated Strava source', async () => {
  const seed = await seedSubmissionFixture('accumulated-strava-auto');
  await Event.updateOne(
    { _id: seed.event._id },
    {
      $set: {
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 10,
        minimumActivityDistanceKm: 1,
        acceptedRunTypes: ['run']
      }
    }
  );

  const activity = await createAccumulatedActivitySubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 4,
    elapsedMs: 25 * 60 * 1000,
    proofType: 'gps',
    proof: { url: 'https://www.strava.com/activities/32345', key: '', mimeType: 'text/uri-list', size: 0, hash: 'strava:32345' },
    runType: 'run',
    source: 'strava',
    stravaActivity: {
      id: 32345,
      athleteId: 98765,
      name: 'Accumulated Strava Run',
      type: 'Run',
      sportType: 'Run',
      distanceKm: 4,
      elapsedTimeSeconds: 1500,
      movingTimeSeconds: 1450,
      startDate: new Date(),
      startDateLocal: new Date(),
      url: 'https://www.strava.com/activities/32345'
    },
    ocrData: {
      extractedDistanceKm: 4,
      extractedTimeMs: 25 * 60 * 1000,
      rawText: 'Accumulated Strava Run',
      confidence: 1,
      detectedSource: 'strava',
      nameMatchStatus: 'not_checked'
    }
  });

  assert.equal(activity.status, 'approved');
  assert.equal(activity.reviewedBy, null);
  assert.equal(activity.reviewNotes, 'Auto-approved from OCR name match.');
});

async function seedSubmissionFixture(tag, options = {}) {
  const runner = await createRunnerUser(`runner-${tag}`);
  const organizer = await createOrganizerUser(`organizer-${tag}`);
  const event = await createEvent(organizer, tag);
  const registration = await createRegistration({
    event,
    runner,
    tag,
    paymentStatus: options.paymentStatus || 'paid',
    status: options.status || 'confirmed'
  });
  return { runner, organizer, event, registration };
}

async function createRunnerUser(tag) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);
  return User.create({
    userId: `USUBR${stamp}`.slice(0, 22),
    email: `phase5.${tag}.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Submit',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000000',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Submission Emergency',
    emergencyContactNumber: '09171111111'
  });
}

async function createOrganizerUser(tag) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);
  return User.create({
    userId: `USUBO${stamp}`.slice(0, 22),
    email: `phase5.${tag}.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Submit',
    lastName: 'Organizer',
    emailVerified: true
  });
}

async function createEvent(organizer, tag) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const now = Date.now();
  return Event.create({
    organizerId: organizer._id,
    slug: `phase5-${tag}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `SB-${String(stamp).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Phase5 Event ${tag} ${stamp}`.slice(0, 150),
    organiserName: 'Submission Org',
    description: 'Submission service test event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K', '10K', '21K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now - 2 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 2 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps', 'photo', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });
}

async function createRegistration({ event, runner, tag, paymentStatus, status }) {
  const code = `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return Registration.create({
    eventId: event._id,
    userId: runner._id,
    participant: {
      firstName: runner.firstName,
      lastName: runner.lastName,
      email: runner.email,
      mobile: runner.mobile,
      country: runner.country,
      gender: runner.gender,
      emergencyContactName: runner.emergencyContactName,
      emergencyContactNumber: runner.emergencyContactNumber,
      runningGroup: ''
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status,
    paymentStatus,
    waiver: {
      accepted: true,
      version: 1,
      signature: `${runner.firstName} ${runner.lastName}`,
      acceptedAt: new Date(),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: code,
    registeredAt: new Date(),
    testTag: tag
  });
}

test.afterEach(async () => {
  // Keep collection growth controlled for repeated local runs, scoped to this suite's seed users.
  const phase5Users = await User.find({ email: /^phase5\./i }).select('_id').lean();
  const phase5UserIds = phase5Users.map((item) => item._id);

  await Submission.deleteMany({
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
  });
  await AccumulatedActivitySubmission.deleteMany({
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
  });

  if (phase5UserIds.length) {
    await Notification.deleteMany({
      userId: { $in: phase5UserIds },
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });
    await CommunicationLog.deleteMany({
      recipientUserId: { $in: phase5UserIds },
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });
  }
  await CommunicationLog.deleteMany({
    'metadata.eventId': { $exists: true },
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
  });
  await DailyEmailUsage.deleteMany({
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
  });
});

test('detectSuspiciousActivity flags distance over 200km', () => {
  const result = detectSuspiciousActivity({ distanceKm: 250, elapsedMs: 72000000, ocrData: {} });
  assert.equal(result.suspicious, true);
  assert.match(result.reason, /200 km/i);
});

test('detectSuspiciousActivity flags impossible pace under 2 min/km', () => {
  // 5km in 5 minutes = 1 min/km pace
  const result = detectSuspiciousActivity({ distanceKm: 5, elapsedMs: 5 * 60 * 1000, ocrData: {} });
  assert.equal(result.suspicious, true);
  assert.match(result.reason, /world record/i);
});

test('detectSuspiciousActivity flags duration over 24 hours', () => {
  // 10km in 25h
  const result = detectSuspiciousActivity({ distanceKm: 10, elapsedMs: 25 * 60 * 60 * 1000, ocrData: {} });
  assert.equal(result.suspicious, true);
  assert.match(result.reason, /24 hours/i);
});

test('detectSuspiciousActivity returns not suspicious for normal activity', () => {
  // 10km in 60 min = 6 min/km pace
  const result = detectSuspiciousActivity({ distanceKm: 10, elapsedMs: 60 * 60 * 1000, ocrData: {} });
  assert.equal(result.suspicious, false);
  assert.equal(result.reason, '');
});

test('detectSuspiciousActivity returns not suspicious for invalid inputs', () => {
  const result = detectSuspiciousActivity({ distanceKm: NaN, elapsedMs: 0, ocrData: {} });
  assert.equal(result.suspicious, false);
});

test('detectSuspiciousActivity flags OCR name mismatch for manual review', () => {
  const acknowledged = detectSuspiciousActivity({
    distanceKm: 10,
    elapsedMs: 60 * 60 * 1000,
    ocrData: {
      nameMatchStatus: 'mismatched',
      extractedName: 'Different Runner',
      nameMismatchAcknowledged: true
    }
  });
  const unacknowledged = detectSuspiciousActivity({
    distanceKm: 10,
    elapsedMs: 60 * 60 * 1000,
    ocrData: {
      nameMatchStatus: 'mismatched',
      extractedName: 'Different Runner',
      nameMismatchAcknowledged: false
    }
  });
  assert.equal(acknowledged.suspicious, true);
  assert.equal(unacknowledged.suspicious, true);
  assert.match(acknowledged.reason, /acknowledged and continued/i);
  assert.match(unacknowledged.reason, /name does not match/i);
});

test('detectSuspiciousActivity does not flag matched or undetected OCR names', () => {
  const matched = detectSuspiciousActivity({
    distanceKm: 10,
    elapsedMs: 60 * 60 * 1000,
    ocrData: {
      nameMatchStatus: 'matched',
      extractedName: 'Submit Runner',
      nameMismatchAcknowledged: false
    }
  });
  const notDetected = detectSuspiciousActivity({
    distanceKm: 10,
    elapsedMs: 60 * 60 * 1000,
    ocrData: {
      nameMatchStatus: 'not_detected',
      extractedName: '',
      nameMismatchAcknowledged: false
    }
  });
  assert.equal(matched.suspicious, false);
  assert.equal(notDetected.suspicious, false);
});

test('platform date validation accepts PH today at UTC boundary', () => {
  const now = new Date('2026-06-01T16:30:00.000Z');
  const parsed = assertRunDateNotFuture('2026-06-02', { now });

  assert.equal(getPlatformDateKey(now), '2026-06-02');
  assert.equal(parsed.toISOString(), '2026-06-02T00:00:00.000Z');
});

test('platform date validation rejects dates after PH today', () => {
  const now = new Date('2026-06-01T16:30:00.000Z');

  assert.throws(
    () => assertRunDateNotFuture('2026-06-03', { now }),
    /Run date cannot be in the future/i
  );
});

test('platform date validation rejects invalid run date values', () => {
  assert.throws(() => parseRunDateOnly('06/02/2026'), /YYYY-MM-DD/i);
  assert.throws(() => parseRunDateOnly('2026-02-30'), /Run date is invalid/i);
});

test('buildSubmissionPayload accepts current PH platform date string', () => {
  const registrationId = new mongoose.Types.ObjectId();
  const eventId = new mongoose.Types.ObjectId();
  const runnerId = new mongoose.Types.ObjectId();
  const today = getPlatformDateKey();

  const payload = buildSubmissionPayload({
    _id: registrationId,
    eventId,
    userId: runnerId,
    participationMode: 'virtual',
    raceDistance: '5K',
    resultProofMinimumDistanceKm: null
  }, {
    distanceKm: 5,
    elapsedMs: 30 * 60 * 1000,
    runDate: today,
    runLocation: 'Manila',
    proofType: 'photo',
    proof: { url: 'https://example.com/proof.png', mimeType: 'image/png', size: 1000 },
    ocrData: {}
  });

  assert.equal(payload.runDate.toISOString().slice(0, 10), today);
});

test('createSubmission persists runType and elevationGain', async () => {
  const seed = await seedSubmissionFixture('runtype-elevation');
  const result = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 10,
    elapsedMs: 3600000,
    runDate: new Date(),
    runLocation: 'Manila',
    proofType: 'photo',
    proof: { url: 'https://example.com/proof.png', key: 'proof-key', mimeType: 'image/png', size: 1024 },
    proofNotes: '',
    runType: 'trail_run',
    elevationGain: 250,
    ocrData: {}
  });

  assert.equal(result.runType, 'trail_run');
  assert.equal(result.elevationGain, 250);
});

test('createSubmission persists OCR name analysis metadata', async () => {
  const seed = await seedSubmissionFixture('ocr-name-analysis');
  const runDate = new Date();
  const runDateIso = runDate.toISOString().slice(0, 10);
  const result = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 10,
    elapsedMs: 3600000,
    runDate,
    runLocation: 'Manila',
    proofType: 'photo',
    proof: { url: 'https://example.com/proof-name.png', key: 'proof-name-key', mimeType: 'image/png', size: 1024 },
    ocrData: {
      extractedDistanceKm: 10,
      extractedTimeMs: 3600000,
      rawText: 'Submit Runner\nYesterday at 6:00 AM\n10.0 km\n1:00:00',
      confidence: 0.6,
      distanceMismatch: false,
      timeMismatch: false,
      extractedElevationGain: 200,
      extractedSteps: 12000,
      extractedRunDate: runDateIso,
      extractedRunLocation: 'Manila',
      extractedRunType: 'run',
      detectedSource: 'strava',
      extractedName: 'Submit Runner',
      nameMatchStatus: 'matched',
      nameMismatchAcknowledged: false
    }
  });

  assert.equal(result.ocrData.extractedName, 'Submit Runner');
  assert.equal(result.ocrData.nameMatchStatus, 'matched');
  assert.equal(result.ocrData.extractedElevationGain, 200);
  assert.equal(result.ocrData.extractedSteps, 12000);
  assert.equal(result.ocrData.extractedRunDate, runDateIso);
  assert.equal(result.ocrData.extractedRunLocation, 'Manila');
  assert.equal(result.ocrData.extractedRunType, 'run');
  assert.equal(result.suspiciousFlag, false);
  assert.equal(result.status, 'submitted');
});

test('isAutoApprovableOcrSubmission requires a clean matched OCR result', () => {
  assert.equal(isAutoApprovableOcrSubmission({
    status: 'submitted',
    suspiciousFlag: false,
    ocrData: {
      nameMatchStatus: 'matched',
      extractedDistanceKm: 10,
      extractedTimeMs: 3600000,
      confidence: 0.8,
      distanceMismatch: false,
      timeMismatch: false
    }
  }), true);

  assert.equal(isAutoApprovableOcrSubmission({
    status: 'submitted',
    suspiciousFlag: false,
    ocrData: {
      nameMatchStatus: 'matched',
      extractedDistanceKm: 10,
      extractedTimeMs: 3600000,
      confidence: 0.69,
      distanceMismatch: false,
      timeMismatch: false
    }
  }), false);

  assert.equal(isAutoApprovableOcrSubmission({
    status: 'submitted',
    suspiciousFlag: false,
    ocrData: {
      nameMatchStatus: 'matched',
      extractedDistanceKm: 10,
      extractedTimeMs: 3600000,
      confidence: 0.9,
      distanceMismatch: false,
      timeMismatch: false,
      elevationMismatch: true
    }
  }), false);

  assert.equal(isAutoApprovableOcrSubmission({
    status: 'submitted',
    suspiciousFlag: false,
    ocrData: {
      nameMatchStatus: 'mismatched',
      extractedName: 'Iya',
      extractedDistanceKm: 5.44,
      extractedTimeMs: 2907000,
      confidence: 0.8,
      detectedSource: 'coros',
      distanceMismatch: false,
      timeMismatch: false
    }
  }), false);

  assert.equal(isAutoApprovableOcrSubmission({
    status: 'submitted',
    suspiciousFlag: false,
    ocrData: {
      nameMatchStatus: 'matched',
      extractedName: 'Iya',
      extractedDistanceKm: 5.44,
      extractedTimeMs: 2907000,
      extractedElevationGain: 182,
      confidence: 0.8,
      detectedSource: 'coros',
      distanceMismatch: false,
      timeMismatch: false,
      elevationMismatch: false
    }
  }), true);
});

test('createSubmission saves suspicious OCR elevation edits without auto-approving', async () => {
  const seed = await seedSubmissionFixture('ocr-elevation-suspicious');
  const result = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 10,
    elapsedMs: 3600000,
    runDate: new Date('2026-04-20T00:00:00.000Z'),
    runLocation: 'Manila',
    proofType: 'photo',
    proof: { url: 'https://example.com/proof-elevation.png', key: 'proof-elevation-key', mimeType: 'image/png', size: 1024 },
    runType: 'trail_run',
    elevationGain: 2000,
    ocrData: {
      extractedDistanceKm: 10,
      extractedTimeMs: 3600000,
      extractedElevationGain: 200,
      rawText: 'Submit Runner\n10.0 km\n1:00:00\nElevation Gain 200 m',
      confidence: 0.9,
      detectedSource: 'strava',
      extractedName: 'Submit Runner',
      nameMatchStatus: 'matched'
    }
  });

  assert.equal(result.status, 'submitted');
  assert.equal(result.suspiciousFlag, true);
  assert.equal(result.ocrData.elevationMismatch, true);
  assert.match(result.suspiciousFlagReason, /elevation mismatch/i);
});

test('createSubmission auto-approves clean matched OCR and issues certificate', async () => {
  const seed = await seedSubmissionFixture('ocr-auto-approve');
  const calls = { approved: [], certificate: [] };
  const originalApproved = emailService.sendResultApprovedEmailToRunner;
  const originalCertificate = emailService.sendCertificateIssuedEmailToRunner;

  emailService.sendResultApprovedEmailToRunner = async (...args) => {
    calls.approved.push(args);
    return { ok: true };
  };
  emailService.sendCertificateIssuedEmailToRunner = async (...args) => {
    calls.certificate.push(args);
    return { ok: true };
  };

  let result;
  try {
    result = await createSubmission({
      registrationId: seed.registration._id,
      runnerId: seed.runner._id,
      distanceKm: 10,
      elapsedMs: 3600000,
      runDate: new Date(),
      runLocation: 'Manila',
      proofType: 'photo',
      proof: { url: 'https://example.com/proof-auto.png', key: 'proof-auto-key', mimeType: 'image/png', size: 1024 },
      ocrData: {
        extractedDistanceKm: 10,
        extractedTimeMs: 3600000,
        rawText: 'Submit Runner\nYesterday at 6:00 AM\n10.0 km\n1:00:00',
        confidence: 0.9,
        distanceMismatch: false,
        timeMismatch: false,
        detectedSource: 'strava',
        extractedName: 'Submit Runner',
        nameMatchStatus: 'matched',
        nameMismatchAcknowledged: false
      }
    });
  } finally {
    emailService.sendResultApprovedEmailToRunner = originalApproved;
    emailService.sendCertificateIssuedEmailToRunner = originalCertificate;
  }

  assert.equal(result.status, 'approved');
  assert.ok(result.reviewedAt);
  assert.equal(result.reviewedBy, null);
  assert.equal(result.reviewNotes, 'Auto-approved from OCR name match.');
  assert.ok(String(result.certificate?.url || '').length > 0);
  assert.equal(calls.approved.length, 0);
  assert.equal(calls.certificate.length, 0);
  assert.equal(result.validation.method, 'ocr');
  assert.equal(result.validation.autoApprovalEligible, true);
  assert.equal(result.validation.reviewRequired, false);
  assert.equal(result.validation.reviewReason, '');
  assert.equal(result.validation.submissionMode, 'one_time');
});

test('createSubmission auto-approves validated Strava source without OCR name match', async () => {
  const seed = await seedSubmissionFixture('strava-auto-approve');
  const result = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 5,
    elapsedMs: 1800000,
    runDate: new Date(),
    runLocation: 'Strava activity',
    proofType: 'gps',
    proof: { url: 'https://www.strava.com/activities/12345', key: '', mimeType: 'text/uri-list', size: 0, hash: 'strava:12345' },
    runType: 'run',
    source: 'strava',
    stravaActivity: {
      id: 12345,
      athleteId: 98765,
      name: 'Morning Run',
      type: 'Run',
      sportType: 'Run',
      distanceKm: 5,
      elapsedTimeSeconds: 1800,
      movingTimeSeconds: 1750,
      startDate: new Date(),
      startDateLocal: new Date(),
      url: 'https://www.strava.com/activities/12345'
    },
    ocrData: {
      extractedDistanceKm: 5,
      extractedTimeMs: 1800000,
      rawText: 'Morning Run',
      confidence: 1,
      detectedSource: 'strava',
      nameMatchStatus: 'not_checked'
    }
  });

  assert.equal(result.status, 'approved');
  assert.equal(result.reviewedBy, null);
  assert.equal(result.reviewNotes, 'Auto-approved from OCR name match.');
  assert.equal(result.validation.method, 'strava');
  assert.equal(result.validation.autoApprovalEligible, true);
  assert.equal(result.validation.reviewRequired, false);
  assert.equal(result.validation.reviewReason, '');
});

test('createSubmission keeps one-time proof below category distance pending', async () => {
  const seed = await seedSubmissionFixture('ocr-below-minimum');
  seed.registration.raceDistance = '10K';
  await seed.registration.save();

  const result = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 7.8,
    elapsedMs: 2700000,
    runDate: new Date(),
    runLocation: 'Manila',
    proofType: 'photo',
    proof: { url: 'https://example.com/proof-below-minimum.png', key: 'proof-below-minimum-key', mimeType: 'image/png', size: 1024 },
    ocrData: {
      extractedDistanceKm: 7.8,
      extractedTimeMs: 2700000,
      rawText: 'Submit Runner\n7.8 km\n45:00',
      confidence: 0.9,
      distanceMismatch: false,
      timeMismatch: false,
      detectedSource: 'strava',
      extractedName: 'Submit Runner',
      nameMatchStatus: 'matched',
      nameMismatchAcknowledged: false
    }
  });

  assert.equal(result.status, 'submitted');
  assert.equal(result.suspiciousFlag, true);
  assert.match(result.suspiciousFlagReason, /below the minimum required distance/i);
  assert.equal(result.reviewedAt, null);
  assert.equal(result.certificate?.url || '', '');
  assert.equal(result.validation.method, 'ocr');
  assert.equal(result.validation.autoApprovalEligible, false);
  assert.equal(result.validation.reviewRequired, true);
  assert.equal(result.validation.reviewReason, 'below_minimum_distance_one_time_submission');
  assert.equal(result.validation.submissionMode, 'one_time');
  assert.equal(result.validation.detectedDistanceKm, 7.8);
  assert.equal(result.validation.minimumRequiredDistanceKm, 10);
});

test('createSubmission keeps below-minimum Strava one-time proof pending', async () => {
  const seed = await seedSubmissionFixture('strava-below-minimum');
  seed.registration.raceDistance = '10K';
  await seed.registration.save();

  const result = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 7.8,
    elapsedMs: 2700000,
    runDate: new Date(),
    runLocation: 'Strava activity',
    proofType: 'gps',
    proof: { url: 'https://www.strava.com/activities/22345', key: '', mimeType: 'text/uri-list', size: 0, hash: 'strava:22345' },
    runType: 'run',
    source: 'strava',
    stravaActivity: {
      id: 22345,
      athleteId: 98765,
      name: 'Short Run',
      type: 'Run',
      sportType: 'Run',
      distanceKm: 7.8,
      elapsedTimeSeconds: 2700,
      movingTimeSeconds: 2600,
      startDate: new Date(),
      startDateLocal: new Date(),
      url: 'https://www.strava.com/activities/22345'
    },
    ocrData: {
      extractedDistanceKm: 7.8,
      extractedTimeMs: 2700000,
      rawText: 'Short Run',
      confidence: 1,
      detectedSource: 'strava',
      nameMatchStatus: 'not_checked'
    }
  });

  assert.equal(result.status, 'submitted');
  assert.equal(result.suspiciousFlag, true);
  assert.equal(result.validation.method, 'strava');
  assert.equal(result.validation.autoApprovalEligible, false);
  assert.equal(result.validation.reviewReason, 'below_minimum_distance_one_time_submission');
});

test('eligible submission options expose one-time minimum required distance', async () => {
  const seed = await seedSubmissionFixture('eligible-minimum-distance');
  seed.registration.raceDistance = '10K';
  await seed.registration.save();

  const items = await getRunnerEligibleSubmissionRegistrations(seed.runner._id);
  const option = items.find((item) => String(item.registrationId) === String(seed.registration._id));

  assert.ok(option);
  assert.equal(option.submissionMode, 'standard');
  assert.equal(option.minimumRequiredDistanceKm, 10);
});

test('createSubmission auto-approves clean matched OCR personal record without certificate', async () => {
  const runner = await createRunnerUser('ocr-personal-record-auto');
  const originalApproved = emailService.sendResultApprovedEmailToRunner;
  emailService.sendResultApprovedEmailToRunner = async () => ({ ok: true });

  let result;
  try {
    result = await createSubmission({
      registrationId: PERSONAL_RECORD_REGISTRATION_ID,
      runnerId: runner._id,
      distanceKm: 10,
      elapsedMs: 3600000,
      runDate: new Date(),
      runLocation: 'Manila',
      proofType: 'photo',
      proof: { url: 'https://example.com/proof-pr-auto.png', key: 'proof-pr-auto-key', mimeType: 'image/png', size: 1024 },
      ocrData: {
        extractedDistanceKm: 10,
        extractedTimeMs: 3600000,
        rawText: 'Submit Runner\nYesterday at 6:00 AM\n10.0 km\n1:00:00',
        confidence: 0.9,
        distanceMismatch: false,
        timeMismatch: false,
        detectedSource: 'strava',
        extractedName: 'Submit Runner',
        nameMatchStatus: 'matched',
        nameMismatchAcknowledged: false
      }
    });
  } finally {
    emailService.sendResultApprovedEmailToRunner = originalApproved;
  }

  assert.equal(result.status, 'approved');
  assert.equal(result.isPersonalRecord, true);
  assert.equal(result.reviewNotes, 'Auto-approved from OCR name match.');
  assert.equal(result.certificate?.url || '', '');
  assert.equal(result.validation.method, 'ocr');
  assert.equal(result.validation.autoApprovalEligible, true);
  assert.equal(result.validation.reviewRequired, false);
  assert.equal(result.validation.submissionMode, 'personal_record');
  assert.equal(result.validation.minimumRequiredDistanceKm, null);
});

test('createSubmission keeps mismatched and undetected names pending with correct flags', async () => {
  const mismatchSeed = await seedSubmissionFixture('ocr-mismatch-pending');
  const noNameSeed = await seedSubmissionFixture('ocr-no-name-pending');

  const mismatched = await createSubmission({
    registrationId: mismatchSeed.registration._id,
    runnerId: mismatchSeed.runner._id,
    distanceKm: 10,
    elapsedMs: 3600000,
    runDate: new Date(),
    runLocation: 'Manila',
    proofType: 'photo',
    proof: { url: 'https://example.com/proof-mismatch.png', key: 'proof-mismatch-key', mimeType: 'image/png', size: 1024 },
    ocrData: {
      extractedDistanceKm: 10,
      extractedTimeMs: 3600000,
      rawText: 'Different Runner\nYesterday at 6:00 AM\n10.0 km\n1:00:00',
      confidence: 0.9,
      distanceMismatch: false,
      timeMismatch: false,
      detectedSource: 'strava',
      extractedName: 'Different Runner',
      nameMatchStatus: 'mismatched',
      nameMismatchAcknowledged: true
    }
  });

  const noName = await createSubmission({
    registrationId: noNameSeed.registration._id,
    runnerId: noNameSeed.runner._id,
    distanceKm: 10,
    elapsedMs: 3600000,
    runDate: new Date(),
    runLocation: 'Manila',
    proofType: 'photo',
    proof: { url: 'https://example.com/proof-no-name.png', key: 'proof-no-name-key', mimeType: 'image/png', size: 1024 },
    ocrData: {
      extractedDistanceKm: 10,
      extractedTimeMs: 3600000,
      rawText: 'Morning Run\n10.0 km\n1:00:00',
      confidence: 0.9,
      distanceMismatch: false,
      timeMismatch: false,
      detectedSource: 'strava',
      extractedName: '',
      nameMatchStatus: 'not_detected',
      nameMismatchAcknowledged: false
    }
  });

  assert.equal(mismatched.status, 'submitted');
  assert.equal(mismatched.suspiciousFlag, true);
  assert.match(mismatched.suspiciousFlagReason, /name does not match/i);
  assert.equal(noName.status, 'submitted');
  assert.equal(noName.suspiciousFlag, false);
});

test('resubmitSubmission recalculates OCR state and can auto-approve a clean replacement', async () => {
  const seed = await seedSubmissionFixture('ocr-resubmit-auto');
  const first = await createSubmission({
    registrationId: seed.registration._id,
    runnerId: seed.runner._id,
    distanceKm: 10,
    elapsedMs: 3600000,
    runDate: new Date(),
    runLocation: 'Manila',
    proofType: 'photo',
    proof: { url: 'https://example.com/proof-old.png', key: 'proof-old-key', mimeType: 'image/png', size: 1024 },
    ocrData: {
      extractedDistanceKm: 10,
      extractedTimeMs: 3600000,
      confidence: 0.9,
      distanceMismatch: false,
      timeMismatch: false,
      detectedSource: 'strava',
      extractedName: 'Different Runner',
      nameMatchStatus: 'mismatched',
      nameMismatchAcknowledged: true
    }
  });

  await reviewSubmission({
    submissionId: first._id,
    organizerId: seed.organizer._id,
    action: 'reject',
    rejectionReason: 'Name mismatch',
    reviewNotes: 'Replace screenshot'
  });

  const originalApproved = emailService.sendResultApprovedEmailToRunner;
  const originalCertificate = emailService.sendCertificateIssuedEmailToRunner;
  emailService.sendResultApprovedEmailToRunner = async () => ({ ok: true });
  emailService.sendCertificateIssuedEmailToRunner = async () => ({ ok: true });

  let resubmitted;
  try {
    resubmitted = await resubmitSubmission({
      registrationId: seed.registration._id,
      runnerId: seed.runner._id,
      distanceKm: 10,
      elapsedMs: 3600000,
      runDate: new Date(),
      runLocation: 'Manila',
      proofType: 'photo',
      proof: { url: 'https://example.com/proof-new.png', key: 'proof-new-key', mimeType: 'image/png', size: 1024 },
      ocrData: {
        extractedDistanceKm: 10,
        extractedTimeMs: 3600000,
        confidence: 0.9,
        distanceMismatch: false,
        timeMismatch: false,
        detectedSource: 'strava',
        extractedName: 'Submit Runner',
        nameMatchStatus: 'matched',
        nameMismatchAcknowledged: false
      }
    });
  } finally {
    emailService.sendResultApprovedEmailToRunner = originalApproved;
    emailService.sendCertificateIssuedEmailToRunner = originalCertificate;
  }

  assert.equal(resubmitted.status, 'approved');
  assert.equal(resubmitted.ocrData.extractedName, 'Submit Runner');
  assert.equal(resubmitted.ocrData.nameMatchStatus, 'matched');
  assert.equal(resubmitted.suspiciousFlag, false);
});
