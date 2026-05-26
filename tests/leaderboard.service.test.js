const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const {
  getLeaderboardData,
  getEventLeaderboard,
  getMyStanding,
  getNearbyRunners
} = require('../src/services/leaderboard.service');

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
  await mongoose.disconnect();
});

test('leaderboard returns approved submissions sorted by fastest elapsed time', async () => {
  const seed = await seedLeaderboardData('ranking');
  const result = await getLeaderboardData({ eventId: String(seed.eventA._id), limit: 10 });

  assert.ok(result.entries.length >= 2);
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

test('event leaderboard ranks approved race results and hides unsafe public fields', async () => {
  const seed = await seedLeaderboardData('event-v1');
  await Event.findByIdAndUpdate(seed.eventA._id, {
    leaderboardSettings: {
      enabled: true,
      type: 'race_result',
      rankingBasis: 'fastest_time',
      nameDisplayMode: 'first_name_last_initial',
      visibleColumns: ['rank', 'runner', 'category', 'distance', 'time', 'pace', 'status'],
      showPending: false,
      hideFlagged: true
    }
  });
  await Submission.create({
    registrationId: seed.regE._id,
    eventId: seed.eventA._id,
    runnerId: seed.runnerE._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1200000,
    proofType: 'gps',
    proof: { url: 'https://example.com/private.gpx', key: 'private', mimeType: 'application/gpx+xml', size: 1200 },
    status: 'approved',
    suspiciousFlag: true,
    submittedAt: new Date()
  });

  const result = await getEventLeaderboard(seed.eventA.slug, { limit: 20 });

  assert.ok(result.entries.length >= 2);
  assert.equal(result.entries[0].timeMs <= result.entries[1].timeMs, true);
  assert.ok(result.entries.every((item) => item.status === 'verified'));
  assert.ok(result.entries.every((item) => !item.runnerName.includes('Runner')));
  assert.ok(result.entries.every((item) => !Object.prototype.hasOwnProperty.call(item, 'proof')));
  assert.ok(result.entries.every((item) => !Object.prototype.hasOwnProperty.call(item, 'ocrData')));
  assert.equal(result.entries.some((item) => item.userId === String(seed.runnerE._id)), false);
});

test('event leaderboard search matches runner name and confirmation code with privacy formatting', async () => {
  const seed = await seedLeaderboardData('event-search');
  await Event.findByIdAndUpdate(seed.eventA._id, {
    leaderboardSettings: {
      enabled: true,
      type: 'race_result',
      rankingBasis: 'fastest_time',
      nameDisplayMode: 'first_name_last_initial',
      visibleColumns: ['rank', 'runner', 'category', 'distance', 'time', 'pace', 'status'],
      showPending: false,
      hideFlagged: true
    }
  });

  const byName = await getEventLeaderboard(seed.eventA.slug, { search: 'Leader', limit: 20 });
  assert.ok(byName.entries.length >= 1);
  assert.ok(byName.entries.every((item) => /Leader [A-Z]\./.test(item.runnerName)));

  const byCode = await getEventLeaderboard(seed.eventA.slug, { search: seed.regA.confirmationCode, limit: 20 });
  assert.ok(byCode.entries.some((item) => item.registrationId === String(seed.regA._id)));
});

test('my standing and nearby runners use event-scoped official ranks', async () => {
  const seed = await seedLeaderboardData('event-standing');
  const standing = await getMyStanding(seed.eventA.slug, seed.runnerB._id);
  const nearby = await getNearbyRunners(seed.eventA.slug, seed.runnerB._id);

  assert.equal(standing.standing.userId, String(seed.runnerB._id));
  assert.equal(standing.standing.status, 'verified');
  assert.ok(Number.isInteger(standing.standing.rank));
  assert.ok(nearby.some((item) => item.isCurrentUser));
});

test('accumulated event leaderboard sums approved activities by registration', async () => {
  const seed = await seedAccumulatedLeaderboardData('accumulated-v1');
  const result = await getEventLeaderboard(seed.event.slug, { limit: 20 });

  assert.equal(result.settings.type, 'accumulated_challenge');
  assert.equal(result.entries[0].userId, String(seed.runnerA._id));
  assert.equal(result.entries[0].totalDistanceKm, 15);
  assert.equal(result.entries[0].activityCount, 2);
  assert.equal(result.entries[1].totalDistanceKm, 12);
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

  const runnerE = await createRunner(`leaderboard.${tag}.runnere.${stamp}`, passwordHash);
  const regE = await createRegistration(eventA, runnerE, 'virtual', '5K');

  return { eventA, eventB, runnerA, runnerB, runnerC, runnerD, runnerE, regA, regB, regC, regD, regE };
}

async function seedAccumulatedLeaderboardData(tag) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);
  const organizer = await User.create({
    userId: `ULBA${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 22),
    email: `phase5.leaderboard.${tag}.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Accum',
    lastName: 'Organizer',
    emailVerified: true
  });
  const runnerA = await createRunner(`leaderboard.${tag}.runnera.${stamp}`, passwordHash);
  const runnerB = await createRunner(`leaderboard.${tag}.runnerb.${stamp}`, passwordHash);
  const now = Date.now();
  const event = await Event.create({
    organizerId: organizer._id,
    slug: `accumulated-leaderboard-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `LA-${String(now).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Accumulated Leaderboard ${stamp}`.slice(0, 150),
    organiserName: 'Leaderboard Org',
    description: 'Accumulated leaderboard event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: 20,
    raceDistances: ['20K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now - 2 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 2 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps', 'photo', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1,
    leaderboardSettings: {
      enabled: true,
      type: 'accumulated_challenge',
      rankingBasis: 'highest_verified_distance',
      nameDisplayMode: 'first_name_last_initial',
      showPending: false,
      hideFlagged: true
    }
  });
  const regA = await createRegistration(event, runnerA, 'virtual', '20K');
  const regB = await createRegistration(event, runnerB, 'virtual', '20K');
  await AccumulatedActivitySubmission.create([
    buildAccumulatedActivity(event, regA, runnerA, 9, now - 300000),
    buildAccumulatedActivity(event, regA, runnerA, 6, now - 200000),
    buildAccumulatedActivity(event, regB, runnerB, 12, now - 100000),
    { ...buildAccumulatedActivity(event, regB, runnerB, 100, now - 50000), status: 'submitted' }
  ]);
  return { event, runnerA, runnerB, regA, regB };
}

function buildAccumulatedActivity(event, registration, runner, distanceKm, submittedAtMs) {
  return {
    registrationId: registration._id,
    eventId: event._id,
    runnerId: runner._id,
    participationMode: 'virtual',
    raceDistance: registration.raceDistance,
    distanceKm,
    elapsedMs: distanceKm * 360000,
    proofType: 'gps',
    proof: { url: 'https://example.com/activity.gpx', key: 'activity', mimeType: 'application/gpx+xml', size: 1200 },
    status: 'approved',
    submittedAt: new Date(submittedAtMs),
    reviewedAt: new Date(submittedAtMs + 1000)
  };
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
