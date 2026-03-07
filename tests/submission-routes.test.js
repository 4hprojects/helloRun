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
const TEST_PORT = 3104;
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

test('unauthenticated submit-result redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/my-registrations/000000000000000000000000/submit-result`, {
    method: 'POST',
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

test('authenticated submit-result requires proof file', async () => {
  const seed = await seedData('missing-proof');
  const cookie = await login(seed.runner.email, seed.password);
  const ready = await waitForSessionReady('/my-registrations', cookie);
  assert.equal(ready, true);

  const response = await fetch(`${BASE_URL}/my-registrations/${seed.registration._id}/submit-result`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      distanceKm: '5',
      elapsedTime: '00:30:00',
      proofType: 'gps'
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /my-registrations\?type=error/i);
  assert.match(location, /select\+a\+result\+proof\+file/i);
});

async function seedData(tag) {
  await mongoose.connect(process.env.MONGODB_URI);
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runner = await User.create({
    userId: `USUBRT${stamp}`.slice(0, 22),
    email: `phase5.route.${tag}.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Route',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000000',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Route Emergency',
    emergencyContactNumber: '09171111111'
  });

  const organizer = await User.create({
    userId: `USUBOT${stamp}`.slice(0, 22),
    email: `phase5.route.${tag}.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Route',
    lastName: 'Organizer',
    emailVerified: true
  });

  const event = await Event.create({
    organizerId: organizer._id,
    slug: `phase5-route-${tag}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RT-${String(stamp).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Phase5 Route Event ${tag} ${stamp}`.slice(0, 150),
    organiserName: 'Route Organizer',
    description: 'Submission route test event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(Date.now() - 60 * 60 * 1000),
    eventEndAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
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
      mobile: runner.mobile,
      country: runner.country,
      gender: runner.gender,
      emergencyContactName: runner.emergencyContactName,
      emergencyContactNumber: runner.emergencyContactNumber,
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

  await mongoose.disconnect();
  return { runner, password, registration };
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
      // waiting for server
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}
