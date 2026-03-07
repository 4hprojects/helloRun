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
const TEST_PORT = 3105;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;

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
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
});

test('unauthenticated result-approve redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/organizer/events/000000000000000000000000/submissions/000000000000000000000000/approve`, {
    method: 'POST',
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
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

    return { password, ownerOrganizer, otherOrganizer, event, submission };
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
