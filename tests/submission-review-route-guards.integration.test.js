const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const Notification = require('../src/models/Notification');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3105;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
const seededFixtures = [];

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      CSRF_PROTECTION: '0'
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeededFixtures();
  await closePostgresClient();
});

test('unauthenticated result-approve redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/organizer/events/000000000000000000000000/submissions/000000000000000000000000/approve`, {
    method: 'POST',
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

test('unauthenticated submission review page redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/organizer/events/000000000000000000000000/submissions/000000000000000000000000/review`, {
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

test('run proof review queue enforces auth and event ownership', async () => {
  const seed = await seedReviewData('run-proof-queue-access');

  const unauthenticated = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/run-proofs/review`, {
    redirect: 'manual'
  });
  assert.equal(unauthenticated.status, 302);
  assert.equal(unauthenticated.headers.get('location'), '/login');

  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', runnerCookie);
  const runnerResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/run-proofs/review`, {
    headers: { Cookie: runnerCookie },
    redirect: 'manual'
  });
  assert.equal(runnerResponse.status, 403);

  const otherOrganizerCookie = await login(seed.otherOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', otherOrganizerCookie);
  const otherOrganizerResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/run-proofs/review`, {
    headers: { Cookie: otherOrganizerCookie },
    redirect: 'manual'
  });
  assert.equal(otherOrganizerResponse.status, 404);
});

test('run proof review queue combines standard and accumulated activity proofs', async () => {
  const seed = await seedAccumulatedReviewData('run-proof-queue-combined');
  const ownerCookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', ownerCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/run-proofs/review`, {
    headers: { Cookie: ownerCookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Run Proof Review/i);
  assert.match(html, /Pending Review/i);
  assert.match(html, /Run Result/i);
  assert.match(html, /Accumulated Activity/i);
  assert.match(html, /activity-proof\.png/i);
  assert.match(html, /run-proof-image-link/i);
  assert.match(html, new RegExp(`/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/review\\?queueStatus=pending&amp;queueSort=oldest`, 'i'));
  assert.match(html, new RegExp(`/organizer/events/${seed.event._id}/submissions/${seed.activity._id}/review\\?queueStatus=pending&amp;queueSort=oldest`, 'i'));
  assert.doesNotMatch(html, /Approve Run Result/i);
  assert.doesNotMatch(html, /Reject Run Result/i);

  const adminCookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', adminCookie);
  const adminResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/run-proofs/review`, {
    headers: { Cookie: adminCookie },
    redirect: 'manual'
  });
  assert.equal(adminResponse.status, 200);
});

test('run proof review queue filters reviewed history and search', async () => {
  const seed = await seedAccumulatedReviewData('run-proof-queue-history');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await Submission.updateOne(
      { _id: seed.submission._id },
      {
        $set: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: seed.ownerOrganizer._id,
          reviewNotes: 'Verified standard result'
        }
      }
    );
    await AccumulatedActivitySubmission.updateOne(
      { _id: seed.activity._id },
      {
        $set: {
          status: 'rejected',
          reviewedAt: new Date(),
          reviewedBy: seed.ownerOrganizer._id,
          rejectionReason: 'Activity proof is unclear'
        }
      }
    );
  } finally {
    await mongoose.disconnect();
  }

  const ownerCookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', ownerCookie);

  const approvedResponse = await fetch(
    `${BASE_URL}/organizer/events/${seed.event._id}/run-proofs/review?status=approved&q=${encodeURIComponent(seed.runner.email)}`,
    { headers: { Cookie: ownerCookie }, redirect: 'manual' }
  );
  assert.equal(approvedResponse.status, 200);
  const approvedHtml = await approvedResponse.text();
  assert.match(approvedHtml, /Verified standard result/i);
  assert.doesNotMatch(approvedHtml, /Activity proof is unclear/i);

  const rejectedResponse = await fetch(
    `${BASE_URL}/organizer/events/${seed.event._id}/run-proofs/review?status=rejected`,
    { headers: { Cookie: ownerCookie }, redirect: 'manual' }
  );
  assert.equal(rejectedResponse.status, 200);
  const rejectedHtml = await rejectedResponse.text();
  assert.match(rejectedHtml, /Activity proof is unclear/i);
  assert.match(rejectedHtml, /Review History/i);
});

test('run proof review queue paginates combined proofs and preserves filters', async () => {
  const seed = await seedAccumulatedReviewData('run-proof-queue-pagination');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const baseTime = Date.now() - 60 * 60 * 1000;
    const extraActivities = Array.from({ length: 50 }, (_, index) => ({
      registrationId: seed.registration._id,
      eventId: seed.event._id,
      runnerId: seed.runner._id,
      participationMode: 'virtual',
      raceDistance: seed.registration.raceDistance,
      distanceKm: 1 + (index / 100),
      elapsedMs: 600000 + index,
      runDate: new Date(baseTime + index * 1000),
      runLocation: 'Pagination City',
      runType: 'run',
      proofType: 'manual',
      status: 'submitted',
      submittedAt: new Date(baseTime + index * 1000)
    }));
    await AccumulatedActivitySubmission.insertMany(extraActivities);
  } finally {
    await mongoose.disconnect();
  }

  const ownerCookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', ownerCookie);
  const response = await fetch(
    `${BASE_URL}/organizer/events/${seed.event._id}/run-proofs/review?sort=newest&q=${encodeURIComponent(seed.runner.email)}`,
    { headers: { Cookie: ownerCookie }, redirect: 'manual' }
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Showing <strong>50<\/strong> of <strong>52<\/strong> proofs/i);
  assert.match(html, /Page 1 of 2/i);
  assert.match(html, new RegExp(`/organizer/events/${seed.event._id}/run-proofs/review\\?sort=newest&amp;q=[^"]+&amp;page=2`, 'i'));
});

test('runner cannot access submission review page', async () => {
  const seed = await seedReviewData('runner-denied');
  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', runnerCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/review`, {
    headers: { Cookie: runnerCookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 403);
});

test('owner organizer can view standard submission review page', async () => {
  const seed = await seedReviewData('owner-review-page');
  const ownerCookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', ownerCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/review`, {
    headers: { Cookie: ownerCookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Submission Review/i);
  assert.match(html, /submission-review-page/i);
  assert.match(html, /Activity Metrics/i);
  assert.match(html, /Decision/i);
  assert.match(html, /View run result evidence/i);
  assert.match(html, /Approve Run Result/i);
  assert.match(html, /Reject Run Result/i);
  assert.match(html, new RegExp(`/organizer/events/${seed.event._id}/run-proofs/review[^>]*>\\s*<i[^>]*><\\/i>\\s*Back to Run Proof Queue`, 'i'));
});

test('My Events and registrants table link pending results to review workflow', async () => {
  const seed = await seedReviewData('registrants-review-link');
  const ownerCookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', ownerCookie);

  const eventsResponse = await fetch(`${BASE_URL}/organizer/events`, {
    headers: { Cookie: ownerCookie },
    redirect: 'manual'
  });
  assert.equal(eventsResponse.status, 200);
  const eventsHtml = await eventsResponse.text();
  assert.match(
    eventsHtml,
    new RegExp(`/organizer/events/${seed.event._id}/run-proofs/review[^>]*>Submitted Run Proofs<`, 'i')
  );

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/registrants?result=submitted`, {
    headers: { Cookie: ownerCookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-registrant-filter-form/i);
  assert.match(html, /<button[^>]*type="submit"[^>]*>\s*Search\s*<\/button>/i);
  assert.equal((html.match(/<select[^>]*data-auto-submit-filter/g) || []).length, 4);
  assert.doesNotMatch(html, /<button[^>]*>\s*Apply\s*<\/button>/i);
  assert.match(html, /aria-label="Export CSV"[^>]*data-tooltip="Export CSV"/i);
  assert.match(html, /aria-label="Export XLSX"[^>]*data-tooltip="Export XLSX"/i);
  assert.match(html, /aria-label="Back to Event"[^>]*data-tooltip="Back to Event"/i);
  assert.match(html, /aria-label="My Events"[^>]*data-tooltip="My Events"/i);
  assert.match(html, /id="registrantColumnsMenuBtn"[^>]*aria-expanded="false"/i);
  assert.equal((html.match(/data-registrant-column-toggle="[^"]+" checked/g) || []).length, 11);
  assert.match(html, /<th data-registrant-column="name">Name<\/th>/i);
  assert.match(html, /<th data-registrant-column="registeredAt">Registered At<\/th>/i);
  assert.match(html, /<th data-registrant-column="confirmation" class="is-column-hidden">Confirmation<\/th>/i);
  assert.match(html, /organizerRegistrantsVisibleColumns/i);
  assert.match(html, new RegExp(`/organizer/events/${seed.event._id}/run-proofs/review[^>]*>Open Run Proof Review<`, 'i'));
  assert.match(html, new RegExp(`/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/review`, 'i'));
  assert.doesNotMatch(html, new RegExp(`action="/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/approve"`, 'i'));
  assert.doesNotMatch(html, new RegExp(`action="/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/reject"`, 'i'));
});

test('admin can view standard submission review page', async () => {
  const seed = await seedReviewData('admin-review-page');
  const adminCookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', adminCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/review`, {
    headers: { Cookie: adminCookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Submission Review/i);
  assert.match(html, /submission-review-page/i);
  assert.match(html, /Admin Queue/i);
});

test('non-owner organizer cannot view another organizer submission review page', async () => {
  const seed = await seedReviewData('review-page-ownership');
  const otherOrganizerCookie = await login(seed.otherOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', otherOrganizerCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/review`, {
    headers: { Cookie: otherOrganizerCookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 404);
});

test('reviewed standard submission page is read-only', async () => {
  const seed = await seedReviewData('review-page-readonly', { submissionStatus: 'approved' });
  const ownerCookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', ownerCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/review`, {
    headers: { Cookie: ownerCookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Review History/i);
  assert.match(html, /Reviewed:/i);
  assert.doesNotMatch(html, /action="[^"]+\/approve"/i);
  assert.doesNotMatch(html, /action="[^"]+\/reject"/i);
});

test('owner and admin can view accumulated activity review page', async () => {
  const seed = await seedAccumulatedReviewData('accumulated-review-page');
  const ownerCookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', ownerCookie);

  const ownerResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/submissions/${seed.activity._id}/review`, {
    headers: { Cookie: ownerCookie },
    redirect: 'manual'
  });
  assert.equal(ownerResponse.status, 200);
  const ownerHtml = await ownerResponse.text();
  assert.match(ownerHtml, /Accumulated Activity/i);
  assert.match(ownerHtml, /Accumulated Progress/i);
  assert.match(ownerHtml, /submission-proof-image-link/i);
  assert.match(ownerHtml, /Approve Run Result/i);

  const registrantsResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/registrants`, {
    headers: { Cookie: ownerCookie },
    redirect: 'manual'
  });
  assert.equal(registrantsResponse.status, 200);
  const registrantsHtml = await registrantsResponse.text();
  const runResultCell = registrantsHtml.match(/<td data-registrant-column="runResult">([\s\S]*?)<\/td>/i)?.[1] || '';
  assert.match(runResultCell, /<strong>Progress:<\/strong>\s*0 km \/ 20 km/i);
  assert.match(runResultCell, /<strong>Activity counts:<\/strong>\s*0 approved, 1 pending, 0 rejected/i);
  assert.doesNotMatch(runResultCell, /<strong>Distance:<\/strong>/i);
  assert.doesNotMatch(runResultCell, /<strong>Elapsed:<\/strong>/i);
  assert.doesNotMatch(runResultCell, /activity submitted/i);

  const adminCookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', adminCookie);
  const adminResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/submissions/${seed.activity._id}/review`, {
    headers: { Cookie: adminCookie },
    redirect: 'manual'
  });
  assert.equal(adminResponse.status, 200);
});

test('non-owner organizer cannot approve another organizer submission', async () => {
  const seed = await seedReviewData('ownership');
  const otherOrganizerCookie = await login(seed.otherOrganizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', otherOrganizerCookie);
  assert.equal(ready, true);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/approve`,
    otherOrganizerCookie,
    { reviewNotes: 'should fail owner check' }
  );
  assert.equal(response.status, 404);
});

test('organizer cannot approve already-approved submission', async () => {
  const seed = await seedReviewData('invalid-transition', { submissionStatus: 'approved' });
  const ownerCookie = await login(seed.ownerOrganizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', ownerCookie);
  assert.equal(ready, true);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/approve`,
    ownerCookie,
    { reviewNotes: 'should fail transition check' }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /type=error/i);
  assert.match(location, /(Only\+submitted\+results\+can\+be\+reviewed|Submission\+not\+found)/i);
});

test('admin can approve organizer submission through shared review route', async () => {
  const seed = await seedReviewData('admin-approve');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await Submission.updateOne(
      { _id: seed.submission._id },
      {
        $set: {
          suspiciousFlag: true,
          suspiciousFlagReason: 'High-confidence OCR mismatch detected.'
        }
      }
    );
  } finally {
    await mongoose.disconnect();
  }

  const adminCookie = await login(seed.admin.email, seed.password);
  const ready = await waitForSessionReady('/admin/dashboard', adminCookie);
  assert.equal(ready, true);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/approve`,
    adminCookie,
    {
      reviewNotes: 'admin approval check',
      queueStatus: 'all',
      queueSort: 'newest',
      queueQ: seed.runner.email,
      queuePage: '2'
    }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /type=success/i);
  assert.match(location, /\/submissions\/[a-f0-9]{24}\/review/i);
  assert.match(location, /queueStatus=all/i);
  assert.match(location, /queueSort=newest/i);
  assert.match(location, /queuePage=2/i);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const updated = await Submission.findById(seed.submission._id).lean();
    assert.equal(updated.status, 'approved');
    assert.equal(String(updated.reviewedBy), String(seed.admin._id));
    assert.equal(updated.suspiciousFlag, false);
    assert.equal(updated.suspiciousFlagReason || '', '');
  } finally {
    await mongoose.disconnect();
  }

  const audit = await waitForAuditRecord({
    action: 'submission.approved',
    targetId: String(seed.submission._id)
  });
  assert.equal(audit.status_from, 'submitted');
  assert.equal(audit.status_to, 'approved');
  assert.equal(audit.actor_mongo_user_id, String(seed.admin._id));

  const certificateAudit = await waitForAuditRecord({
    action: 'certificate.issued',
    targetType: 'submission_certificate',
    targetId: String(seed.submission._id)
  });
  assert.equal(certificateAudit.status_to, 'issued');
  assert.equal(certificateAudit.actor_mongo_user_id, String(seed.admin._id));
});

test('admin approval clears suspicious metadata for accumulated activity submissions', async () => {
  const seed = await seedAccumulatedReviewData('admin-approve-accumulated');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await AccumulatedActivitySubmission.updateOne(
      { _id: seed.activity._id },
      {
        $set: {
          suspiciousFlag: true,
          suspiciousFlagReason: 'High-confidence OCR mismatch detected.'
        }
      }
    );
  } finally {
    await mongoose.disconnect();
  }

  const adminCookie = await login(seed.admin.email, seed.password);
  const ready = await waitForSessionReady('/admin/dashboard', adminCookie);
  assert.equal(ready, true);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/submissions/${seed.activity._id}/approve`,
    adminCookie,
    { reviewNotes: 'admin approval accumulated check' }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /type=success/i);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const updated = await AccumulatedActivitySubmission.findById(seed.activity._id).lean();
    assert.equal(updated.status, 'approved');
    assert.equal(updated.suspiciousFlag, false);
    assert.equal(updated.suspiciousFlagReason || '', '');
    assert.equal(String(updated.reviewedBy), String(seed.admin._id));
  } finally {
    await mongoose.disconnect();
  }
});

async function seedReviewData(tag, options = {}) {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const password = 'Pass1234';
    const passwordHash = await bcrypt.hash(password, 10);

    const runner = await User.create({
      userId: buildUserId('RGR'),
      email: `phase5.review.${tag}.runner.${stamp}@example.com`,
      passwordHash,
      role: 'runner',
      firstName: 'Review',
      lastName: 'Runner',
      emailVerified: true,
      mobile: '09171234567',
      country: 'PH',
      gender: 'male',
      emergencyContactName: 'Review Emergency',
      emergencyContactNumber: '09170000001'
    });

    const ownerOrganizer = await User.create({
      userId: buildUserId('RGO'),
      email: `phase5.review.${tag}.owner.${stamp}@example.com`,
      passwordHash,
      role: 'organiser',
      organizerStatus: 'approved',
      firstName: 'Owner',
      lastName: 'Organizer',
      emailVerified: true
    });

    const otherOrganizer = await User.create({
      userId: buildUserId('RGP'),
      email: `phase5.review.${tag}.other.${stamp}@example.com`,
      passwordHash,
      role: 'organiser',
      organizerStatus: 'approved',
      firstName: 'Other',
      lastName: 'Organizer',
      emailVerified: true
    });

    const admin = await User.create({
      userId: buildUserId('RGA'),
      email: `phase5.review.${tag}.admin.${stamp}@example.com`,
      passwordHash,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Reviewer',
      emailVerified: true
    });

    const now = Date.now();
    const event = await Event.create({
      organizerId: ownerOrganizer._id,
      slug: `phase5-review-${tag}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
      referenceCode: `RV-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
      title: `Phase5 Review Event ${tag} ${stamp}`.slice(0, 150),
      organiserName: 'Owner Organizer',
      description: 'Submission review guard test event',
      status: 'published',
      eventType: 'virtual',
      eventTypesAllowed: ['virtual'],
      raceDistances: ['5K'],
      registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
      registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
      eventStartAt: new Date(now - 2 * 60 * 60 * 1000),
      eventEndAt: new Date(now + 2 * 60 * 60 * 1000),
      proofTypesAllowed: ['gps', 'photo', 'manual'],
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
        mobile: runner.mobile || '',
        country: runner.country || '',
        gender: runner.gender || '',
        emergencyContactName: runner.emergencyContactName || '',
        emergencyContactNumber: runner.emergencyContactNumber || '',
        runningGroup: ''
      },
      participationMode: 'virtual',
      raceDistance: '5K',
      status: 'confirmed',
      paymentStatus: 'paid',
      waiver: {
        accepted: true,
        version: 1,
        signature: `${runner.firstName} ${runner.lastName}`,
        acceptedAt: new Date(),
        templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
        renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
      },
      confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      registeredAt: new Date()
    });

    const submission = await Submission.create({
      registrationId: registration._id,
      eventId: event._id,
      runnerId: runner._id,
      participationMode: 'virtual',
      raceDistance: registration.raceDistance,
      distanceKm: 5,
      elapsedMs: 1800000,
      proofType: 'gps',
      proof: {
        url: 'https://example.com/result-proof.gpx',
        key: 'result-proof-key',
        mimeType: 'application/gpx+xml',
        size: 2048
      },
      proofNotes: '',
      status: options.submissionStatus || 'submitted',
      submissionCount: 1,
      submittedAt: new Date()
    });

    const fixture = { password, runner, ownerOrganizer, otherOrganizer, admin, event, registration, submission };
    seededFixtures.push(fixture);
    return fixture;
  } finally {
    await mongoose.disconnect();
  }
}

async function seedAccumulatedReviewData(tag) {
  const seed = await seedReviewData(tag);
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await Event.updateOne(
      { _id: seed.event._id },
      {
        $set: {
          virtualCompletionMode: 'accumulated_distance',
          targetDistanceKm: 20,
          minimumActivityDistanceKm: 1,
          acceptedRunTypes: ['run', 'walk', 'hike', 'trail_run']
        }
      }
    );
    const activity = await AccumulatedActivitySubmission.create({
      registrationId: seed.registration._id,
      eventId: seed.event._id,
      runnerId: seed.runner._id,
      participationMode: 'virtual',
      raceDistance: seed.registration.raceDistance,
      distanceKm: 6,
      elapsedMs: 2100000,
      runDate: new Date(),
      runLocation: 'Test City',
      runType: 'run',
      proofType: 'photo',
      proof: {
        url: 'https://example.com/activity-proof.png',
        key: 'activity-proof-key',
        mimeType: 'image/png',
        size: 2048
      },
      status: 'submitted',
      submittedAt: new Date()
    });
    seed.activity = activity;
    return seed;
  } finally {
    await mongoose.disconnect();
  }
}

function buildUserId(prefix) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return `${prefix}${stamp}`.slice(0, 22);
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  return setCookie.split(';')[0];
}

async function postForm(routePath, cookie, payload = {}) {
  return fetch(`${BASE_URL}${routePath}`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(payload),
    redirect: 'manual'
  });
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'GET',
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.headers.get('location') !== '/login') return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return false;
}

test('organizer can reject submission with valid reason', async () => {
  const seed = await seedReviewData('reject-valid');
  const organizerCookie = await login(seed.ownerOrganizer.email, seed.password);
  const ready = await waitForSessionReady(`/organizer/events/${seed.event._id}/registrants`, organizerCookie);
  assert.equal(ready, true);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/reject`,
    organizerCookie,
    { rejectionReason: 'Proof image is unclear and unverifiable' }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /type=success/i);
  assert.match(location, /\/submissions\/[a-f0-9]{24}\/review/i);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const updated = await Submission.findById(seed.submission._id).lean();
    assert.equal(updated.status, 'rejected');
  } finally {
    await mongoose.disconnect();
  }

  const audit = await waitForAuditRecord({
    action: 'submission.rejected',
    targetId: String(seed.submission._id)
  });
  assert.equal(audit.status_from, 'submitted');
  assert.equal(audit.status_to, 'rejected');
  assert.equal(audit.actor_mongo_user_id, String(seed.ownerOrganizer._id));
  assert.equal(audit.notes, 'Proof image is unclear and unverifiable');
});

test('organizer cannot reject submission with empty rejection reason', async () => {
  const seed = await seedReviewData('reject-empty-reason');
  const organizerCookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady(`/organizer/events/${seed.event._id}/registrants`, organizerCookie);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/submissions/${seed.submission._id}/reject`,
    organizerCookie,
    { rejectionReason: '' }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /type=error/i);
  assert.match(location, /\/submissions\/[a-f0-9]{24}\/review/i);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const unchanged = await Submission.findById(seed.submission._id).lean();
    assert.equal(unchanged.status, 'submitted');
  } finally {
    await mongoose.disconnect();
  }
});

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) return;
    } catch (error) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function cleanupSeededFixtures() {
  if (!seededFixtures.length) return;
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const userIds = [];
    const eventIds = [];
    const registrationIds = [];
    const submissionIds = [];
    const activityIds = [];

    for (const seed of seededFixtures) {
      userIds.push(
        String(seed.runner._id),
        String(seed.ownerOrganizer._id),
        String(seed.otherOrganizer._id),
        String(seed.admin._id)
      );
      eventIds.push(String(seed.event._id));
      registrationIds.push(String(seed.registration._id));
      submissionIds.push(String(seed.submission._id));
      if (seed.activity?._id) activityIds.push(String(seed.activity._id));
    }

    await Promise.all([
      Notification.deleteMany({ userId: { $in: userIds } }),
      AccumulatedActivitySubmission.deleteMany({
        $or: [
          { _id: { $in: activityIds } },
          { eventId: { $in: eventIds } }
        ]
      }),
      Submission.deleteMany({ _id: { $in: submissionIds } }),
      Registration.deleteMany({ _id: { $in: registrationIds } }),
      Event.deleteMany({ _id: { $in: eventIds } }),
      User.deleteMany({ _id: { $in: userIds } })
    ]);

    try {
      const sql = getPostgresClient();
      await sql`
        delete from audit_critical
        where target_id in ${sql(submissionIds)}
          and target_type in ('submission', 'submission_certificate')
      `;
      await sql`delete from migration_records where source_collection = 'users' and source_id in ${sql(userIds)}`;
      await sql`delete from app_users where mongo_user_id in ${sql(userIds)}`;
    } catch (error) {
      console.error('Failed to clean Supabase submission review test rows:', error.message);
    }
  } finally {
    await mongoose.disconnect();
  }
}

async function waitForAuditRecord({ action, targetId, targetType = 'submission' }) {
  const sql = getPostgresClient();
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i += 1) {
    const rows = await sql`
      select *
      from audit_critical
      where action = ${action}
        and target_type = ${targetType}
        and target_id = ${targetId}
      limit 1
    `;
    if (rows[0]) return rows[0];
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Expected audit record for ${action} ${targetId}`);
}
