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
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3112;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT)
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedOrganizerDashboardFixture();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

test('organizer dashboard renders range analytics and queue links', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const response = await fetch(`${BASE_URL}/organizer/dashboard?range=7d`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Analytics range/i);
  assert.match(html, /Last 7 days/i);
  assert.match(html, /Queue by Event/i);
  assert.match(html, /Open Next Pending Payment/i);
  assert.match(html, /Open Next Pending Result/i);

  // 7d window should include 2 registrations, 2 submissions, 1 approved.
  assert.match(
    html,
    /Registrations \(Last 7 days\)<\/small>\s*<strong>2<\/strong>/i
  );
  assert.match(
    html,
    /Submissions \(Last 7 days\)<\/small>\s*<strong>2<\/strong>/i
  );
  assert.match(
    html,
    /Approved Results \(Last 7 days\)<\/small>\s*<strong>1<\/strong>/i
  );
  assert.match(html, /\+1 vs Previous 7 days/i);
  assert.match(html, /0 vs Previous 7 days/i);
  assert.match(html, /Top Events/i);
  assert.match(html, /Registrations/i);
  assert.match(html, /Approvals/i);
  assert.match(html, /Pending Queue/i);
  assert.match(html, new RegExp(escapeRegex(seed.eventTitle)));

  const paymentLink = `/organizer/events/${seed.eventId}/registrants?payment=proof_submitted`;
  const resultLink = `/organizer/events/${seed.eventId}/registrants?result=submitted`;
  const approvedLink = `/organizer/events/${seed.eventId}/registrants?result=approved`;
  assert.match(html, new RegExp(escapeRegex(paymentLink)));
  assert.match(html, new RegExp(escapeRegex(resultLink)));
  assert.match(html, new RegExp(escapeRegex(approvedLink)));
});

async function seedOrganizerDashboardFixture() {
  await mongoose.connect(process.env.MONGODB_URI);
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    userId: `UODA${stamp}`.slice(0, 22),
    email: `oda.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Organizer',
    lastName: 'Analytics',
    emailVerified: true
  });

  const runnerSubmitted = await User.create({
    userId: `UODR${stamp}`.slice(0, 22),
    email: `oda.runner.submitted.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Analytics',
    emailVerified: true
  });

  const runnerApproved = await User.create({
    userId: `UODR2${stamp}`.slice(0, 22),
    email: `oda.runner.approved.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Approved',
    emailVerified: true
  });

  const runnerOld = await User.create({
    userId: `UODR3${stamp}`.slice(0, 22),
    email: `oda.runner.old.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Old',
    emailVerified: true
  });

  const runnerPreviousWindow = await User.create({
    userId: `UODR4${stamp}`.slice(0, 22),
    email: `oda.runner.previous.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Previous',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
    organizerId: organizer._id,
    slug: `oda-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `ODA-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Organizer Dashboard Analytics ${stamp}`.slice(0, 150),
    organiserName: 'ODA',
    description: 'Organizer analytics dashboard test event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 15 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 10 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 12 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps', 'photo', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const registrationSubmitted = await Registration.create({
    eventId: event._id,
    userId: runnerSubmitted._id,
    participant: {
      firstName: runnerSubmitted.firstName,
      lastName: runnerSubmitted.lastName,
      email: runnerSubmitted.email
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'proof_submitted',
    paymentProof: {
      url: `https://example.com/proof-submitted-${stamp}.png`,
      key: `proof-submitted-${stamp}`,
      mimeType: 'image/png',
      size: 1024,
      uploadedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
    },
    waiver: {
      accepted: true,
      version: 1,
      signature: `${runnerSubmitted.firstName} ${runnerSubmitted.lastName}`,
      acceptedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    registeredAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
  });

  const registrationApproved = await Registration.create({
    eventId: event._id,
    userId: runnerApproved._id,
    participant: {
      firstName: runnerApproved.firstName,
      lastName: runnerApproved.lastName,
      email: runnerApproved.email
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'paid',
    waiver: {
      accepted: true,
      version: 1,
      signature: `${runnerApproved.firstName} ${runnerApproved.lastName}`,
      acceptedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    registeredAt: new Date(now - 1 * 24 * 60 * 60 * 1000)
  });

  const registrationOld = await Registration.create({
    eventId: event._id,
    userId: runnerOld._id,
    participant: {
      firstName: runnerOld.firstName,
      lastName: runnerOld.lastName,
      email: runnerOld.email
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'paid',
    waiver: {
      accepted: true,
      version: 1,
      signature: `${runnerOld.firstName} ${runnerOld.lastName}`,
      acceptedAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    registeredAt: new Date(now - 40 * 24 * 60 * 60 * 1000)
  });

  const registrationPreviousWindow = await Registration.create({
    eventId: event._id,
    userId: runnerPreviousWindow._id,
    participant: {
      firstName: runnerPreviousWindow.firstName,
      lastName: runnerPreviousWindow.lastName,
      email: runnerPreviousWindow.email
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'paid',
    waiver: {
      accepted: true,
      version: 1,
      signature: `${runnerPreviousWindow.firstName} ${runnerPreviousWindow.lastName}`,
      acceptedAt: new Date(now - 9 * 24 * 60 * 60 * 1000),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    registeredAt: new Date(now - 9 * 24 * 60 * 60 * 1000)
  });

  await Submission.create({
    registrationId: registrationSubmitted._id,
    eventId: event._id,
    runnerId: runnerSubmitted._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1800000,
    proofType: 'gps',
    proof: {
      url: `https://example.com/result-submitted-${stamp}.gpx`,
      key: `result-submitted-${stamp}`,
      mimeType: 'application/gpx+xml',
      size: 1500
    },
    status: 'submitted',
    submissionCount: 1,
    submittedAt: new Date(now - 1 * 24 * 60 * 60 * 1000)
  });

  await Submission.create({
    registrationId: registrationApproved._id,
    eventId: event._id,
    runnerId: runnerApproved._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1700000,
    proofType: 'gps',
    proof: {
      url: `https://example.com/result-approved-${stamp}.gpx`,
      key: `result-approved-${stamp}`,
      mimeType: 'application/gpx+xml',
      size: 1400
    },
    status: 'approved',
    submissionCount: 1,
    submittedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    reviewedAt: new Date(now - 12 * 60 * 60 * 1000)
  });

  await Submission.create({
    registrationId: registrationOld._id,
    eventId: event._id,
    runnerId: runnerOld._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 2000000,
    proofType: 'gps',
    proof: {
      url: `https://example.com/result-old-${stamp}.gpx`,
      key: `result-old-${stamp}`,
      mimeType: 'application/gpx+xml',
      size: 1300
    },
    status: 'approved',
    submissionCount: 1,
    submittedAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
    reviewedAt: new Date(now - 39 * 24 * 60 * 60 * 1000)
  });

  await Submission.create({
    registrationId: registrationPreviousWindow._id,
    eventId: event._id,
    runnerId: runnerPreviousWindow._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1950000,
    proofType: 'gps',
    proof: {
      url: `https://example.com/result-previous-window-${stamp}.gpx`,
      key: `result-previous-window-${stamp}`,
      mimeType: 'application/gpx+xml',
      size: 1250
    },
    status: 'approved',
    submissionCount: 1,
    submittedAt: new Date(now - 9 * 24 * 60 * 60 * 1000),
    reviewedAt: new Date(now - 8 * 24 * 60 * 60 * 1000)
  });

  return {
    stamp,
    password,
    eventId: String(event._id),
    registrationIds: [
      registrationSubmitted._id,
      registrationApproved._id,
      registrationOld._id,
      registrationPreviousWindow._id
    ].map(String),
    submissionIds: (await Submission.find({
      eventId: event._id,
      runnerId: { $in: [runnerSubmitted._id, runnerApproved._id, runnerOld._id, runnerPreviousWindow._id] }
    }).select('_id').lean()).map((item) => String(item._id)),
    organizer: {
      _id: organizer._id,
      email: organizer.email
    },
    runners: [
      { _id: runnerSubmitted._id, email: runnerSubmitted.email },
      { _id: runnerApproved._id, email: runnerApproved.email },
      { _id: runnerOld._id, email: runnerOld.email },
      { _id: runnerPreviousWindow._id, email: runnerPreviousWindow.email }
    ],
    eventTitle: event.title
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  await Promise.all([
    Submission.deleteMany({ _id: { $in: currentSeed.submissionIds } }),
    Registration.deleteMany({ _id: { $in: currentSeed.registrationIds } }),
    Event.deleteMany({ _id: currentSeed.eventId }),
    User.deleteMany({
      email: {
        $in: [currentSeed.organizer.email].concat((currentSeed.runners || []).map((item) => item.email))
      }
    })
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

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) {
        return;
      }
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
