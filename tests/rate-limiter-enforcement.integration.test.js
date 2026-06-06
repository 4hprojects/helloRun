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
const TEST_PORT = 3121;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Result submission limit: 8 requests per 10 minutes per user+path+ip
const RATE_LIMIT_MAX = 8;

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
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

test('result submission rate limiter blocks after max requests', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  const ready = await waitForSessionReady('/my-registrations', cookie);
  assert.equal(ready, true, 'Session should be established before rate limit test');

  const url = `${BASE_URL}/my-registrations/${seed.registration.id}/submit-result`;

  // Fire RATE_LIMIT_MAX requests — each should pass the rate limiter but fail validation
  // (no proof file attached), resulting in a redirect with an error message.
  for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
    const response = await fetch(url, {
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
    // Validation error: no file — expects a redirect, not a rate limit block
    assert.equal(
      response.status,
      302,
      `Request ${i + 1} should pass rate limiter (got ${response.status})`
    );
    const location = response.headers.get('location') || '';
    assert.ok(
      !/too.many/i.test(location),
      `Request ${i + 1} should be a validation error, not a rate limit`
    );
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  // The (RATE_LIMIT_MAX + 1)th request should be blocked by the rate limiter
  const blockedResponse = await fetch(url, {
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

  assert.equal(
    blockedResponse.status,
    429,
    `Request ${RATE_LIMIT_MAX + 1} should be rate limited (got ${blockedResponse.status})`
  );
  const body = await blockedResponse.text();
  assert.match(body, /too many/i, 'Rate limit response should contain "Too many" message');
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seedFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runner = await User.create({
    userId: `URLER${stamp}`.slice(0, 22),
    email: `rle.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'RateLimit',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000001',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Rate Emergency',
    emergencyContactNumber: '09171111112'
  });

  const organizer = await User.create({
    userId: `URLEO${stamp}`.slice(0, 22),
    email: `rle.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'RateLimit',
    lastName: 'Organizer',
    emailVerified: true
  });

  const event = await Event.create({
    organizerId: organizer._id,
    slug: `rle-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RLE-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Rate Limit Test Event ${stamp}`.slice(0, 150),
    organiserName: 'Rate Limit Org',
    description: 'Rate limiter enforcement test event',
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

  return {
    stamp,
    password,
    runner: { id: String(runner._id), email: runner.email },
    organizer: { id: String(organizer._id), email: organizer.email },
    event: { id: String(event._id) },
    registration: { id: String(registration._id) }
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  await Promise.all([
    Registration.deleteMany({ _id: currentSeed.registration?.id }),
    Event.deleteMany({ _id: currentSeed.event?.id }),
    User.deleteMany({
      email: {
        $in: [currentSeed.runner?.email, currentSeed.organizer?.email].filter(Boolean)
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

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
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
    } catch (_) {
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
