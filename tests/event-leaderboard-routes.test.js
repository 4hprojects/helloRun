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
const TEST_PORT = 3122;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  seed = await seedRouteLeaderboardData();
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
  if (serverProc && !serverProc.killed) serverProc.kill('SIGTERM');
  await mongoose.disconnect();
});

test('event leaderboard page and data endpoint render public-safe results', async () => {
  const pageResponse = await fetch(`${BASE_URL}/events/${seed.event.slug}/leaderboard`);
  assert.equal(pageResponse.status, 200);
  const html = await pageResponse.text();
  assert.match(html, /Race Result Leaderboard/);
  assert.match(html, /Verified/);

  const dataResponse = await fetch(`${BASE_URL}/events/${seed.event.slug}/leaderboard/data?search=${encodeURIComponent(seed.registration.confirmationCode)}`);
  assert.equal(dataResponse.status, 200);
  const json = await dataResponse.json();
  assert.equal(json.success, true);
  assert.equal(json.leaderboard.entries.length, 1);
  assert.equal(json.leaderboard.entries[0].registrationId, String(seed.registration._id));
  assert.equal(Object.prototype.hasOwnProperty.call(json.leaderboard.entries[0], 'proof'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(json.leaderboard.entries[0], 'ocrData'), false);
});

test('event leaderboard my-standing endpoint requires login', async () => {
  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/leaderboard/my-standing`);
  assert.equal(response.status, 401);
  const json = await response.json();
  assert.equal(json.success, false);
});

async function waitForServerReady() {
  for (let i = 0; i < 40; i += 1) {
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

async function seedRouteLeaderboardData() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);
  const organizer = await User.create({
    userId: `ULRL${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 22),
    email: `route.leaderboard.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Route',
    lastName: 'Organizer',
    emailVerified: true
  });
  const runner = await User.create({
    userId: `ULRR${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 22),
    email: `route.leaderboard.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Route',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000000',
    country: 'PH',
    gender: 'male'
  });
  const now = Date.now();
  const event = await Event.create({
    organizerId: organizer._id,
    slug: `route-leaderboard-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RL-${String(now).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Route Leaderboard ${stamp}`.slice(0, 150),
    organiserName: 'Route Org',
    description: 'Route leaderboard event',
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
    waiverVersion: 1,
    leaderboardSettings: {
      enabled: true,
      type: 'race_result',
      rankingBasis: 'fastest_time',
      nameDisplayMode: 'first_name_last_initial',
      showPending: false,
      hideFlagged: true
    }
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
      gender: runner.gender
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
  await Submission.create({
    registrationId: registration._id,
    eventId: event._id,
    runnerId: runner._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1500000,
    proofType: 'gps',
    proof: { url: 'https://example.com/route.gpx', key: 'route', mimeType: 'application/gpx+xml', size: 1200 },
    status: 'approved',
    submittedAt: new Date(now - 60000),
    reviewedAt: new Date(now - 30000)
  });
  return { event, registration };
}
