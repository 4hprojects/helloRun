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
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3101;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const PNG_1PX_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQeRlmQAAAAASUVORK5CYII=',
  'base64'
);

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

test('unauthenticated payment-proof upload redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/my-registrations/000000000000000000000000/payment-proof`, {
    method: 'POST',
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

test('runner cannot upload payment proof for another runner registration', async () => {
  const seed = await seedRouteGuardData('ownership-upload');
  const runnerSession = await login(seed.runnerA.email, seed.password);
  await assertRunnerSessionReady(runnerSession);
  const form = buildProofFormData();

  const response = await fetch(`${BASE_URL}/my-registrations/${seed.registrationB._id}/payment-proof`, {
    method: 'POST',
    headers: {
      Cookie: runnerSession
    },
    body: form,
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /my-registrations\?type=error/);
  assert.match(location, /Registration\+not\+found\+or\+inaccessible/);
});

test('organizer cannot approve payment proof when registration is not proof_submitted', async () => {
  const seed = await seedRouteGuardData('invalid-transition');
  const organizerSession = await login(seed.ownerOrganizer.email, seed.password);
  await assertOrganizerSessionReady(organizerSession);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/approve`,
    organizerSession,
    { reviewNotes: 'Should fail transition check' }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /type=error/);
  assert.match(location, /submitted\+payment\+proof\+can\+be\+approved/);
});

test('non-owner organizer cannot review payment proof for another organizer event', async () => {
  const seed = await seedRouteGuardData('organizer-ownership');
  const otherOrganizerSession = await login(seed.otherOrganizer.email, seed.password);
  await assertOrganizerSessionReady(otherOrganizerSession);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/approve`,
    otherOrganizerSession,
    { reviewNotes: 'Should fail owner check' }
  );

  assert.equal(response.status, 404);
});

async function seedRouteGuardData(tag) {
  await mongoose.connect(process.env.MONGODB_URI);

  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runnerA = await User.create({
    userId: `UTESTR${stamp}A`,
    email: `phase4.${tag}.runnera.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Alpha',
    emailVerified: true,
    mobile: '09171234567',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Emergency A',
    emergencyContactNumber: '09170000001'
  });

  const runnerB = await User.create({
    userId: `UTESTR${stamp}B`,
    email: `phase4.${tag}.runnerb.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Beta',
    emailVerified: true,
    mobile: '09171234568',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Emergency B',
    emergencyContactNumber: '09170000002'
  });

  const ownerOrganizer = await User.create({
    userId: `UTESTO${stamp}A`,
    email: `phase4.${tag}.organizer.owner.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Owner',
    lastName: 'Organizer',
    emailVerified: true
  });

  const otherOrganizer = await User.create({
    userId: `UTESTO${stamp}B`,
    email: `phase4.${tag}.organizer.other.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Other',
    lastName: 'Organizer',
    emailVerified: true
  });

  const now = new Date();
  const event = await Event.create({
    organizerId: ownerOrganizer._id,
    slug: `phase4-${tag}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `TG-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Phase4 Guard Event ${tag} ${stamp}`,
    organiserName: 'Owner Organizer',
    description: 'Route guard test event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const registrationA = await Registration.create(
    buildRegistrationPayload({
      eventId: event._id,
      user: runnerA,
      paymentStatus: 'unpaid'
    })
  );

  const registrationB = await Registration.create(
    buildRegistrationPayload({
      eventId: event._id,
      user: runnerB,
      paymentStatus: 'unpaid'
    })
  );

  await mongoose.disconnect();

  return {
    password,
    runnerA,
    runnerB,
    ownerOrganizer,
    otherOrganizer,
    event,
    registrationA,
    registrationB
  };
}

function buildRegistrationPayload({ eventId, user, paymentStatus }) {
  return {
    eventId,
    userId: user._id,
    participant: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile || '',
      country: user.country || '',
      gender: user.gender || '',
      emergencyContactName: user.emergencyContactName || '',
      emergencyContactNumber: user.emergencyContactNumber || '',
      runningGroup: ''
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus,
    waiver: {
      accepted: true,
      version: 1,
      signature: `${user.firstName} ${user.lastName}`,
      acceptedAt: new Date(),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    registeredAt: new Date()
  };
}

function buildProofFormData() {
  const form = new FormData();
  form.append('paymentProofFile', new Blob([PNG_1PX_BUFFER], { type: 'image/png' }), 'proof.png');
  return form;
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      email,
      password
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302, 'login should redirect');
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'login should set session cookie');
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

async function assertOrganizerSessionReady(cookie) {
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true, 'organizer session should be active');
}

async function assertRunnerSessionReady(cookie) {
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true, 'runner session should be active');
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'GET',
      headers: {
        Cookie: cookie
      },
      redirect: 'manual'
    });
    const location = response.headers.get('location');
    if (location !== '/login') {
      return true;
    }
    // Session store write can lag by a few ms in CI/local runs.
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
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch (error) {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}
