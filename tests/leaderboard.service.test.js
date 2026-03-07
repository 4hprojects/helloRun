const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { getLeaderboardData } = require('../src/services/leaderboard.service');

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
  await mongoose.disconnect();
});

test('leaderboard returns approved submissions sorted by fastest elapsed time', async () => {
  const seed = await seedLeaderboardData('ranking');
  const result = await getLeaderboardData({ limit: 10 });

  assert.ok(result.entries.length >= 3);
  assert.equal(result.entries[0].elapsedMs <= result.entries[1].elapsedMs, true);
  assert.ok(result.entries.every((item) => item.elapsedMs > 0));
  assert.ok(result.stats.totalApproved >= 3);
  assert.ok(result.options.events.length >= 1);
  assert.ok(result.options.distances.includes('5K'));
});

test('leaderboard filters by event, distance, mode, and period', async () => {
  const seed = await seedLeaderboardData('filters');

  const byEvent = await getLeaderboardData({ eventId: String(seed.eventA._id), limit: 20 });
  assert.ok(byEvent.entries.length >= 1);
  assert.ok(byEvent.entries.every((item) => item.eventTitle === seed.eventA.title));

  const byDistance = await getLeaderboardData({ distance: '10K', limit: 20 });
  assert.ok(byDistance.entries.length >= 1);
  assert.ok(byDistance.entries.every((item) => item.raceDistance === '10K'));

  const byMode = await getLeaderboardData({ mode: 'onsite', limit: 20 });
  assert.ok(byMode.entries.length >= 1);
  assert.ok(byMode.entries.every((item) => item.participationMode === 'onsite'));

  const byPeriod = await getLeaderboardData({ period: '7d', limit: 20 });
  assert.ok(byPeriod.entries.length >= 1);
  const now = Date.now();
  assert.ok(byPeriod.entries.every((item) => {
    const submittedAt = new Date(item.submittedAt).getTime();
    return Number.isFinite(submittedAt) && (now - submittedAt) <= 8 * 24 * 60 * 60 * 1000;
  }));
});

async function seedLeaderboardData(tag) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);

  const organizer = await User.create({
    userId: `ULBO${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 22),
    email: `phase5.leaderboard.${tag}.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Leader',
    lastName: 'Organizer',
    emailVerified: true
  });

  const runnerA = await createRunner(`leaderboard.${tag}.runnera.${stamp}`, passwordHash);
  const runnerB = await createRunner(`leaderboard.${tag}.runnerb.${stamp}`, passwordHash);
  const runnerC = await createRunner(`leaderboard.${tag}.runnerc.${stamp}`, passwordHash);

  const now = Date.now();
  const eventA = await Event.create({
    organizerId: organizer._id,
    slug: `leaderboard-a-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `LB-${String(now).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Leaderboard Event A ${stamp}`.slice(0, 150),
    organiserName: 'Leaderboard Org',
    description: 'Leaderboard event A',
    status: 'published',
    eventType: 'hybrid',
    eventTypesAllowed: ['virtual', 'onsite'],
    raceDistances: ['5K', '10K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now - 2 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 2 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps', 'photo', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const eventB = await Event.create({
    organizerId: organizer._id,
    slug: `leaderboard-b-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `LC-${String(now + 1).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Leaderboard Event B ${stamp}`.slice(0, 150),
    organiserName: 'Leaderboard Org',
    description: 'Leaderboard event B',
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

  const regA = await createRegistration(eventA, runnerA, 'virtual', '5K');
  const regB = await createRegistration(eventA, runnerB, 'onsite', '10K');
  const regC = await createRegistration(eventB, runnerC, 'virtual', '5K');
  const runnerD = await createRunner(`leaderboard.${tag}.runnerd.${stamp}`, passwordHash);
  const regD = await createRegistration(eventB, runnerD, 'virtual', '5K');

  await Submission.create({
    registrationId: regA._id,
    eventId: eventA._id,
    runnerId: runnerA._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1700000,
    proofType: 'gps',
    proof: { url: 'https://example.com/a.gpx', key: 'a', mimeType: 'application/gpx+xml', size: 1200 },
    status: 'approved',
    submissionCount: 1,
    submittedAt: new Date(now - 60 * 60 * 1000)
  });
  await Submission.create({
    registrationId: regB._id,
    eventId: eventA._id,
    runnerId: runnerB._id,
    participationMode: 'onsite',
    raceDistance: '10K',
    distanceKm: 10,
    elapsedMs: 3600000,
    proofType: 'gps',
    proof: { url: 'https://example.com/b.gpx', key: 'b', mimeType: 'application/gpx+xml', size: 1200 },
    status: 'approved',
    submissionCount: 1,
    submittedAt: new Date(now - 3 * 24 * 60 * 60 * 1000)
  });
  await Submission.create({
    registrationId: regD._id,
    eventId: eventB._id,
    runnerId: runnerD._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1500000,
    proofType: 'gps',
    proof: { url: 'https://example.com/c.gpx', key: 'c', mimeType: 'application/gpx+xml', size: 1200 },
    status: 'approved',
    submissionCount: 1,
    submittedAt: new Date(now - 45 * 24 * 60 * 60 * 1000)
  });
  await Submission.create({
    registrationId: regC._id,
    eventId: eventB._id,
    runnerId: runnerC._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1400000,
    proofType: 'gps',
    proof: { url: 'https://example.com/c2.gpx', key: 'c2', mimeType: 'application/gpx+xml', size: 1200 },
    status: 'submitted',
    submissionCount: 2,
    submittedAt: new Date(now - 60 * 1000)
  });

  return { eventA, eventB };
}

async function createRunner(emailLocal, passwordHash) {
  return User.create({
    userId: `ULBR${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 22),
    email: `${emailLocal}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Leader',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000000',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Leaderboard Emergency',
    emergencyContactNumber: '09171111111'
  });
}

async function createRegistration(event, runner, mode, distance) {
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
    participationMode: mode,
    raceDistance: distance,
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
}
