/**
 * tests/runner-submissions-routes.test.js
 *
 * Integration tests for:
 *   GET /runner/submissions          — list page
 *   GET /runner/submissions/:id      — detail page
 *
 * Port: 3125
 */

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

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3125;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedFixture();
  // Acquire cookies once — avoids rate-limit exhaustion across tests
  seed.cookieA = await login(seed.runnerA.email, seed.password);
  seed.cookieB = await login(seed.runnerB.email, seed.password);
  seed.cookieEmpty = await login(seed.runnerEmpty.email, seed.password);
  seed.cookieOrg = await login(seed.organiser.email, seed.password);
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

// ─── Auth guard tests ──────────────────────────────────────────────────────────

test('unauthenticated GET /runner/submissions redirects to /login', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.match(res.headers.get('location') || '', /\/login/i);
});

test('unauthenticated GET /runner/submissions/:id redirects to /login', async () => {
  const fakeId = new mongoose.Types.ObjectId().toString();
  const res = await fetch(`${BASE_URL}/runner/submissions/${fakeId}`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.match(res.headers.get('location') || '', /\/login/i);
});

test('unauthenticated GET /runner/submissions/:id/proof redirects to /login', async () => {
  const fakeId = new mongoose.Types.ObjectId().toString();
  const res = await fetch(`${BASE_URL}/runner/submissions/${fakeId}/proof`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.match(res.headers.get('location') || '', /\/login/i);
});

test('non-runner (organiser) cannot access /runner/submissions', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions`, {
    headers: { Cookie: seed.cookieOrg },
    redirect: 'manual'
  });
  assert.ok(res.status !== 200, `Expected non-200 for organiser, got ${res.status}`);
});

// ─── Submissions list page ────────────────────────────────────────────────────

test('runner sees own submitted entries list page', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Submitted Entries/i);
  // Runner A's event title should appear
  assert.match(html, new RegExp(seed.eventTitleA));
});

test('runner submissions page includes working shared nav scripts once', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal(countMatches(html, /<script src="\/js\/main\.js"><\/script>/g), 1);
  assert.equal(countMatches(html, /id="runProofModal"/g), 1);
  assert.match(html, /class="menu-toggle"/);
  assert.match(html, /id="nav-links"/);
});

test('runner A does not see runner B submissions on the list page', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions`, {
    headers: { Cookie: seed.cookieA }
  });
  const html = await res.text();
  assert.doesNotMatch(html, new RegExp(seed.eventTitleB));
});

test('status filter ?status=approved returns only approved items', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions?status=approved`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  // The approved submission's event should appear
  assert.match(html, new RegExp(seed.eventTitleApproved));
  // The rejected submission's event should not appear
  assert.doesNotMatch(html, new RegExp(seed.eventTitleRejected));
});

test('status filter ?status=rejected returns only rejected items', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions?status=rejected`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, new RegExp(seed.eventTitleRejected));
  assert.doesNotMatch(html, new RegExp(seed.eventTitleApproved));
});

test('activityType filter returns matching entries', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions?activityType=walk`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, new RegExp(seed.eventTitleWalk));
  // Run event should not appear in walk filter
  assert.doesNotMatch(html, new RegExp(seed.eventTitleApproved));
});

test('personal record submissions appear in runner submitted entries', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, new RegExp(seed.eventTitlePersonal));
});

test('empty state shown when runner has no submissions', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions`, {
    headers: { Cookie: seed.cookieEmpty }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  // Should show empty state copy
  assert.match(html, /No submitted entries yet/i);
});

// ─── Detail page tests ────────────────────────────────────────────────────────

test('runner can view own submission detail page', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/${seed.approvedSubmissionId}`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, new RegExp(seed.eventTitleApproved));
  assert.match(html, /Approved/i);
  assert.match(html, new RegExp(`/runner/submissions/${seed.approvedSubmissionId}/proof`));
});

test('runner submission detail page includes working shared nav scripts once', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/${seed.approvedSubmissionId}`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal(countMatches(html, /<script src="\/js\/main\.js"><\/script>/g), 1);
  assert.equal(countMatches(html, /id="runProofModal"/g), 1);
  assert.match(html, /class="menu-toggle"/);
  assert.match(html, /id="nav-links"/);
});

test('rejected submission detail shows rejection reason and resubmit action', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/${seed.rejectedSubmissionId}`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Rejected/i);
  assert.match(html, /Resubmit Proof/i);
  assert.match(html, new RegExp(seed.rejectionReason));
});

test('approved submission detail shows certificate download when certificate issued', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/${seed.certSubmissionId}`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Download Certificate/i);
});

test('pending submission detail does not show resubmit action', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/${seed.pendingSubmissionId}`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.doesNotMatch(html, /Resubmit Proof/i);
  assert.match(html, /Waiting for review|Pending Review/i);
});

test('runner A cannot access runner B submission detail (403 or 404)', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/${seed.runnerBSubmissionId}`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.ok(
    res.status === 403 || res.status === 404,
    `Expected 403 or 404 for cross-runner access, got ${res.status}`
  );
});

test('invalid ObjectId in detail route returns 404', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/not-an-id`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 404);
});

test('runner proof route redirects to stored proof access URL', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/${seed.approvedSubmissionId}/proof`, {
    headers: { Cookie: seed.cookieA },
    redirect: 'manual'
  });
  assert.equal(res.status, 302);
  const location = res.headers.get('location') || '';
  assert.ok(location, 'Expected proof redirect location');
  assert.doesNotMatch(location, /\/runner\/submissions\//);
});

test('runner A cannot access runner B submission proof', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/${seed.runnerBSubmissionId}/proof`, {
    headers: { Cookie: seed.cookieA },
    redirect: 'manual'
  });
  assert.ok(
    res.status === 403 || res.status === 404,
    `Expected 403 or 404 for cross-runner proof access, got ${res.status}`
  );
});

test('invalid ObjectId in proof route returns 404', async () => {
  const res = await fetch(`${BASE_URL}/runner/submissions/not-an-id/proof`, {
    headers: { Cookie: seed.cookieA }
  });
  assert.equal(res.status, 404);
});

// ─── Seed / cleanup helpers ────────────────────────────────────────────────────

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

async function seedFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  // Users
  const runnerA = await User.create({
    userId: `SRSA${stamp}`.slice(0, 22),
    email: `runner.sub.a.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Alpha',
    lastName: 'Runner',
    emailVerified: true
  });

  const runnerB = await User.create({
    userId: `SRSB${stamp}`.slice(0, 22),
    email: `runner.sub.b.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Beta',
    lastName: 'Runner',
    emailVerified: true
  });

  const runnerEmpty = await User.create({
    userId: `SRSE${stamp}`.slice(0, 22),
    email: `runner.sub.empty.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Empty',
    lastName: 'Runner',
    emailVerified: true
  });

  const organiser = await User.create({
    userId: `SRSO${stamp}`.slice(0, 22),
    email: `organiser.sub.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Org',
    lastName: 'User',
    emailVerified: true
  });

  // Events
  const eventTitleA = `SubTestEventApproved${stamp}`;
  const eventTitleRej = `SubTestEventRejected${stamp}`;
  const eventTitleWalk = `SubTestEventWalk${stamp}`;
  const eventTitleCert = `SubTestEventCert${stamp}`;
  const eventTitleB = `SubTestEventRunnerB${stamp}`;
  const eventTitlePending = `SubTestEventPending${stamp}`;
  const eventTitlePersonal = `PersonalRecord${stamp}`;

  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const createEvent = (title) =>
    Event.create({
      slug: `sub-test-${Math.random().toString(36).slice(2, 10)}`,
      title,
      description: 'Test event for submission route tests.',
      organiserName: 'Test Organiser',
      status: 'published',
      eventType: 'virtual',
      raceDistances: ['5K'],
      eventStartAt: past,
      eventEndAt: past
    });

  const [evApproved, evRejected, evWalk, evCert, evB, evPending, evPersonal] = await Promise.all([
    createEvent(eventTitleA),
    createEvent(eventTitleRej),
    createEvent(eventTitleWalk),
    createEvent(eventTitleCert),
    createEvent(eventTitleB),
    createEvent(eventTitlePending),
    createEvent(eventTitlePersonal)
  ]);

  // Registrations
  const WAIVER = 'I agree to the terms and conditions of this event.';
  const createReg = (eventId, userId) =>
    Registration.create({
      eventId,
      userId,
      participationMode: 'virtual',
      raceDistance: '5K',
      status: 'confirmed',
      paymentStatus: 'paid',
      confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      registeredAt: past,
      participant: { firstName: 'Test', lastName: 'Runner', email: `t${Date.now()}@x.com` },
      waiver: {
        accepted: true,
        version: 1,
        signature: 'Test Runner',
        acceptedAt: past,
        templateSnapshot: WAIVER,
        renderedSnapshot: WAIVER
      }
    });

  const [regApproved, regRejected, regWalk, regCert, regB, regPending, regPersonal] = await Promise.all([
    createReg(evApproved._id, runnerA._id),
    createReg(evRejected._id, runnerA._id),
    createReg(evWalk._id, runnerA._id),
    createReg(evCert._id, runnerA._id),
    createReg(evB._id, runnerB._id),
    createReg(evPending._id, runnerA._id),
    createReg(evPersonal._id, runnerA._id)
  ]);

  const rejectionReason = 'Screenshot did not match submitted distance.';

  const proofObj = { url: 'https://example.com/proof.jpg', key: 'key', mimeType: 'image/jpeg', size: 1024, hash: '' };

  // Submissions
  const [subApproved, subRejected, subWalk, subCert, subB, subPending, subPersonal] = await Promise.all([
    Submission.create({
      registrationId: regApproved._id,
      eventId: evApproved._id,
      runnerId: runnerA._id,
      raceDistance: '5K',
      distanceKm: 5,
      elapsedMs: 1800000,
      runDate: past,
      proofType: 'photo',
      proof: proofObj,
      status: 'approved',
      submittedAt: past,
      reviewedAt: now,
      runType: 'run'
    }),
    Submission.create({
      registrationId: regRejected._id,
      eventId: evRejected._id,
      runnerId: runnerA._id,
      raceDistance: '5K',
      distanceKm: 5,
      elapsedMs: 1900000,
      runDate: past,
      proofType: 'photo',
      proof: proofObj,
      status: 'rejected',
      rejectionReason,
      submittedAt: past,
      reviewedAt: now,
      runType: 'run'
    }),
    Submission.create({
      registrationId: regWalk._id,
      eventId: evWalk._id,
      runnerId: runnerA._id,
      raceDistance: '5K',
      distanceKm: 5,
      elapsedMs: 3600000,
      runDate: past,
      proofType: 'manual',
      proof: proofObj,
      status: 'submitted',
      submittedAt: past,
      runType: 'walk'
    }),
    Submission.create({
      registrationId: regCert._id,
      eventId: evCert._id,
      runnerId: runnerA._id,
      raceDistance: '5K',
      distanceKm: 5,
      elapsedMs: 1750000,
      runDate: past,
      proofType: 'gps',
      proof: proofObj,
      status: 'approved',
      submittedAt: past,
      reviewedAt: now,
      runType: 'run',
      certificate: {
        url: 'https://example.com/cert.pdf',
        key: 'cert-key',
        issuedAt: now
      }
    }),
    Submission.create({
      registrationId: regB._id,
      eventId: evB._id,
      runnerId: runnerB._id,
      raceDistance: '5K',
      distanceKm: 5,
      elapsedMs: 2000000,
      runDate: past,
      proofType: 'manual',
      proof: proofObj,
      status: 'submitted',
      submittedAt: past,
      runType: 'run'
    }),
    Submission.create({
      registrationId: regPending._id,
      eventId: evPending._id,
      runnerId: runnerA._id,
      raceDistance: '5K',
      distanceKm: 5,
      elapsedMs: 2200000,
      runDate: past,
      proofType: 'manual',
      proof: proofObj,
      status: 'submitted',
      submittedAt: past,
      runType: 'run'
    }),
    Submission.create({
      registrationId: regPersonal._id,
      eventId: evPersonal._id,
      runnerId: runnerA._id,
      isPersonalRecord: true,
      raceDistance: 'Personal Record',
      distanceKm: 10,
      elapsedMs: 4000000,
      runDate: past,
      proofType: 'manual',
      proof: proofObj,
      status: 'approved',
      submittedAt: past,
      reviewedAt: now,
      runType: 'run'
    })
  ]);

  return {
    password,
    runnerA: { _id: runnerA._id, email: runnerA.email },
    runnerB: { _id: runnerB._id, email: runnerB.email },
    runnerEmpty: { _id: runnerEmpty._id, email: runnerEmpty.email },
    organiser: { _id: organiser._id, email: organiser.email },
    eventTitleA,
    eventTitleB,
    eventTitleApproved: eventTitleA,
    eventTitleRejected: eventTitleRej,
    eventTitleWalk,
    eventTitleCert,
    eventTitlePending,
    eventTitlePersonal,
    rejectionReason,
    approvedSubmissionId: String(subApproved._id),
    rejectedSubmissionId: String(subRejected._id),
    walkSubmissionId: String(subWalk._id),
    certSubmissionId: String(subCert._id),
    personalSubmissionId: String(subPersonal._id),
    runnerBSubmissionId: String(subB._id),
    pendingSubmissionId: String(subPending._id),
    // ids for cleanup
    userIds: [runnerA._id, runnerB._id, runnerEmpty._id, organiser._id],
    eventIds: [evApproved._id, evRejected._id, evWalk._id, evCert._id, evB._id, evPending._id, evPersonal._id],
    registrationIds: [regApproved._id, regRejected._id, regWalk._id, regCert._id, regB._id, regPending._id, regPersonal._id],
    submissionIds: [subApproved._id, subRejected._id, subWalk._id, subCert._id, subB._id, subPending._id, subPersonal._id]
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed) return;
  await ensureConnected();
  await Promise.all([
    Submission.deleteMany({ _id: { $in: currentSeed.submissionIds || [] } }),
    Registration.deleteMany({ _id: { $in: currentSeed.registrationIds || [] } }),
    Event.deleteMany({ _id: { $in: currentSeed.eventIds || [] } }),
    User.deleteMany({ _id: { $in: currentSeed.userIds || [] } })
  ]);
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
  assert.ok(setCookie, 'Expected set-cookie header on login');
  return setCookie.split(';')[0];
}

/**
 * Waits until the given path does NOT redirect to /login (session established).
 */
async function waitForSessionReady(cookie, path = '/runner/submissions') {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    const loc = response.headers.get('location') || '';
    if (!loc.includes('/login')) return true;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return false;
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // server still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}
