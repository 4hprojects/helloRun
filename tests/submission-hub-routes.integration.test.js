const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3126;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;
let originalDatabaseUrl = '';

test.before(async () => {
  originalDatabaseUrl = process.env.DATABASE_URL || '';
  process.env.DATABASE_URL = '';
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      DATABASE_URL: ''
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedSubmissionHubFixture();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
  process.env.DATABASE_URL = originalDatabaseUrl;
});

test('admin submissions hub lists all real submissions and excludes orphaned submissions', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/admin/submissions`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Run Submissions/i);
  assert.match(html, /Browse submitted, approved, and rejected run results across all events/i);
  assert.match(html, new RegExp(escapeRegex(seed.ownedEvent.title)));
  assert.match(html, new RegExp(escapeRegex(seed.otherEvent.title)));
  assert.match(html, /Pending Review/i);
  assert.match(html, /Approved/i);
  assert.match(html, /Rejected/i);
  assert.match(html, /Accumulated Activity/i);
  assert.match(html, new RegExp(escapeRegex(`/organizer/events/${seed.ownedEvent.id}/submissions/${seed.standardSubmittedId}/review`)));
  assert.doesNotMatch(html, /Orphan Runner/i);
});

test('organizer submissions hub is scoped to owned events and supports filters', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/organizer/submissions`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Run Submissions/i);
  assert.match(html, new RegExp(escapeRegex(seed.ownedEvent.title)));
  assert.doesNotMatch(html, new RegExp(escapeRegex(seed.otherEvent.title)));
  assert.match(html, /Run Result/i);
  assert.match(html, /Accumulated Activity/i);

  const approved = await fetch(`${BASE_URL}/organizer/submissions?status=approved&type=standard&q=${encodeURIComponent(seed.runnerApproved.email)}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(approved.status, 200);
  const approvedHtml = await approved.text();
  assert.match(approvedHtml, new RegExp(escapeRegex(seed.runnerApproved.email)));
  assert.match(approvedHtml, /Approved/i);
  assert.doesNotMatch(approvedHtml, new RegExp(escapeRegex(seed.runnerSubmitted.email)));
  assert.doesNotMatch(approvedHtml, /Accumulated Activity/i);
});

test('organizer submissions hub rejects unapproved organizers and admin review queue remains pending only', async () => {
  const unapprovedCookie = await login(seed.unapprovedOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', unapprovedCookie);
  const unapproved = await fetch(`${BASE_URL}/organizer/submissions`, {
    headers: { Cookie: unapprovedCookie },
    redirect: 'manual'
  });
  assert.equal(unapproved.status, 403);

  const adminCookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', adminCookie);
  const queue = await fetch(`${BASE_URL}/admin/reviews?type=results`, {
    headers: { Cookie: adminCookie },
    redirect: 'manual'
  });
  assert.equal(queue.status, 200);
  const html = await queue.text();
  assert.match(html, new RegExp(escapeRegex(seed.runnerSubmitted.email)));
  assert.doesNotMatch(html, new RegExp(escapeRegex(seed.runnerApproved.email)));
  assert.doesNotMatch(html, new RegExp(escapeRegex(seed.runnerRejected.email)));
});

async function seedSubmissionHubFixture() {
  await ensureConnected();
  await cleanupSubmissionHubNamespace();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const [admin, organizer, otherOrganizer, unapprovedOrganizer, runnerSubmitted, runnerApproved, runnerRejected, runnerAccumulated, runnerOther, runnerOrphan] = await User.create([
    buildUser(`hub.admin.${stamp}@example.com`, passwordHash, 'admin', 'Hub', 'Admin'),
    buildUser(`hub.organizer.${stamp}@example.com`, passwordHash, 'organiser', 'Hub', 'Owner', { organizerStatus: 'approved' }),
    buildUser(`hub.other.organizer.${stamp}@example.com`, passwordHash, 'organiser', 'Other', 'Owner', { organizerStatus: 'approved' }),
    buildUser(`hub.pending.organizer.${stamp}@example.com`, passwordHash, 'organiser', 'Pending', 'Owner', { organizerStatus: 'pending' }),
    buildUser(`hub.runner.submitted.${stamp}@example.com`, passwordHash, 'runner', 'Submitted', 'Runner'),
    buildUser(`hub.runner.approved.${stamp}@example.com`, passwordHash, 'runner', 'Approved', 'Runner'),
    buildUser(`hub.runner.rejected.${stamp}@example.com`, passwordHash, 'runner', 'Rejected', 'Runner'),
    buildUser(`hub.runner.accumulated.${stamp}@example.com`, passwordHash, 'runner', 'Accumulated', 'Runner'),
    buildUser(`hub.runner.other.${stamp}@example.com`, passwordHash, 'runner', 'Other', 'Runner'),
    buildUser(`hub.runner.orphan.${stamp}@example.com`, passwordHash, 'runner', 'Orphan', 'Runner')
  ]);

  const [ownedEvent, otherEvent] = await Event.create([
    buildEvent(organizer._id, `submission-hub-owned-${stamp}`, 'Submission Hub Owned Event'),
    buildEvent(otherOrganizer._id, `submission-hub-other-${stamp}`, 'Submission Hub Other Event')
  ]);

  const [regSubmitted, regApproved, regRejected, regAccumulated, regOther, regOrphan] = await Registration.create([
    buildRegistration(ownedEvent._id, runnerSubmitted),
    buildRegistration(ownedEvent._id, runnerApproved),
    buildRegistration(ownedEvent._id, runnerRejected),
    buildRegistration(ownedEvent._id, runnerAccumulated, { confirmationCode: makeConfirmationCode(stamp, 4), raceDistance: '21K' }),
    buildRegistration(otherEvent._id, runnerOther),
    buildRegistration(ownedEvent._id, runnerOrphan, { confirmationCode: makeConfirmationCode(stamp, 6) })
  ]);

  const standardSubmitted = await Submission.create(buildSubmission({
    registration: regSubmitted,
    event: ownedEvent,
    runner: runnerSubmitted,
    status: 'submitted',
    submittedAt: new Date(Date.now() - 5 * 60 * 1000)
  }));
  const standardApproved = await Submission.create(buildSubmission({
    registration: regApproved,
    event: ownedEvent,
    runner: runnerApproved,
    status: 'approved',
    reviewedAt: new Date(),
    submittedAt: new Date(Date.now() - 4 * 60 * 1000)
  }));
  const standardRejected = await Submission.create(buildSubmission({
    registration: regRejected,
    event: ownedEvent,
    runner: runnerRejected,
    status: 'rejected',
    reviewedAt: new Date(),
    submittedAt: new Date(Date.now() - 3 * 60 * 1000)
  }));
  const otherSubmission = await Submission.create(buildSubmission({
    registration: regOther,
    event: otherEvent,
    runner: runnerOther,
    status: 'submitted',
    submittedAt: new Date(Date.now() - 2 * 60 * 1000)
  }));
  const orphanSubmission = await Submission.create(buildSubmission({
    registration: regOrphan,
    event: { _id: new mongoose.Types.ObjectId() },
    runner: runnerOrphan,
    status: 'submitted',
    submittedAt: new Date(Date.now() - 60 * 1000)
  }));
  const accumulatedSubmission = await AccumulatedActivitySubmission.create(buildSubmission({
    registration: regAccumulated,
    event: ownedEvent,
    runner: runnerAccumulated,
    status: 'approved',
    reviewedAt: new Date(),
    submittedAt: new Date(Date.now() - 6 * 60 * 1000),
    distanceKm: 21
  }));

  return {
    password,
    admin,
    organizer,
    otherOrganizer,
    unapprovedOrganizer,
    runnerSubmitted,
    runnerApproved,
    runnerRejected,
    runnerAccumulated,
    runnerOther,
    runnerOrphan,
    ownedEvent: { id: String(ownedEvent._id), title: ownedEvent.title },
    otherEvent: { id: String(otherEvent._id), title: otherEvent.title },
    userIds: [admin, organizer, otherOrganizer, unapprovedOrganizer, runnerSubmitted, runnerApproved, runnerRejected, runnerAccumulated, runnerOther, runnerOrphan].map((user) => user._id),
    eventIds: [ownedEvent._id, otherEvent._id],
    registrationIds: [regSubmitted, regApproved, regRejected, regAccumulated, regOther, regOrphan].map((registration) => registration._id),
    submissionIds: [standardSubmitted, standardApproved, standardRejected, otherSubmission, orphanSubmission].map((submission) => submission._id),
    accumulatedSubmissionIds: [accumulatedSubmission._id],
    standardSubmittedId: String(standardSubmitted._id)
  };
}

async function cleanupSubmissionHubNamespace() {
  const users = await User.find({ email: /^hub\./i }).select('_id').lean();
  const events = await Event.find({ slug: /^submission-hub-/i }).select('_id').lean();
  const userIds = users.map((user) => user._id);
  const eventIds = events.map((event) => event._id);
  const registrations = await Registration.find({
    $or: [
      { userId: { $in: userIds } },
      { eventId: { $in: eventIds } }
    ]
  }).select('_id').lean();
  const registrationIds = registrations.map((registration) => registration._id);
  await Promise.all([
    Submission.deleteMany({ $or: [{ runnerId: { $in: userIds } }, { eventId: { $in: eventIds } }, { registrationId: { $in: registrationIds } }] }),
    AccumulatedActivitySubmission.deleteMany({ $or: [{ runnerId: { $in: userIds } }, { eventId: { $in: eventIds } }, { registrationId: { $in: registrationIds } }] }),
    Registration.deleteMany({ _id: { $in: registrationIds } }),
    Event.deleteMany({ _id: { $in: eventIds } }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);
}

function buildUser(email, passwordHash, role, firstName, lastName, overrides = {}) {
  const suffix = crypto.createHash('sha1').update(String(email)).digest('hex').slice(0, 16);
  return {
    userId: `UHUB${suffix}`.slice(0, 24),
    email,
    passwordHash,
    role,
    firstName,
    lastName,
    emailVerified: true,
    ...overrides
  };
}

function buildEvent(organizerId, slug, title) {
  return {
    organizerId,
    slug,
    referenceCode: slug.slice(0, 40),
    title,
    organiserName: 'Submission Hub Organizer',
    description: 'Submission hub test event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K', '10K', '21K'],
    eventStartAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    eventEndAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    registrationOpenAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    registrationCloseAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    virtualCompletionMode: 'single_activity',
    feeMode: 'free',
    waiver: {
      required: true,
      version: 1,
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    }
  };
}

function buildRegistration(eventId, runner, overrides = {}) {
  return {
    eventId,
    userId: runner._id,
    participant: {
      firstName: runner.firstName,
      lastName: runner.lastName,
      email: runner.email,
      mobile: '09170000000'
    },
    participationMode: 'virtual',
    raceDistance: overrides.raceDistance || '5K',
    status: 'confirmed',
    paymentStatus: 'paid',
    confirmationCode: overrides.confirmationCode || makeConfirmationCode(runner._id),
    waiver: {
      accepted: true,
      version: 1,
      signature: `${runner.firstName} ${runner.lastName}`,
      acceptedAt: new Date(),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    }
  };
}

function makeConfirmationCode(seed, offset = 0) {
  const raw = String(seed || '').replace(/[^a-f0-9]/gi, '').padEnd(8, '0');
  const number = (Number.parseInt(raw.slice(-6), 16) + offset) % 0xffffff;
  return `HR-${number.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
}

function buildSubmission({ registration, event, runner, status, reviewedAt = null, submittedAt, distanceKm = 5 }) {
  return {
    registrationId: registration._id,
    eventId: event._id,
    runnerId: runner._id,
    participationMode: registration.participationMode,
    raceDistance: registration.raceDistance,
    distanceKm,
    elapsedMs: 31 * 60 * 1000,
    runDate: new Date(Date.now() - 60 * 60 * 1000),
    runType: 'run',
    proofType: 'gps',
    proof: {
      url: `https://example.com/proofs/${String(registration._id)}.png`,
      key: `proofs/${String(registration._id)}.png`,
      mimeType: 'image/png',
      size: 1234
    },
    source: 'manual_upload',
    status,
    submittedAt,
    reviewedAt
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed) return;
  await ensureConnected();
  await Promise.all([
    Submission.deleteMany({ _id: { $in: currentSeed.submissionIds || [] } }),
    AccumulatedActivitySubmission.deleteMany({ _id: { $in: currentSeed.accumulatedSubmissionIds || [] } }),
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
  assert.ok(setCookie);
  return setCookie.split(';')[0];
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/healthz`);
      if (response.status === 200) return;
    } catch (error) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
