#!/usr/bin/env node
'use strict';

require('dotenv').config();

const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { invalidateLeaderboardCache } = require('../services/leaderboard.service');

const EVENT_ID = '6a72d2ff0731d77363465b19';
const EVENT_SLUG = 'cns-move-more-challenge-2026';
const TEST_RUN_ID = 'cns-leaderboard-demo-v1';
const CREATED_BY_TEST = 'manual-leaderboard-demo';
const DEMO_RUNNERS_PER_CATEGORY = 3;

const DEMO_METRICS = [
  [{ distanceKm: 42.4, steps: 68100 }, { distanceKm: 35.7, steps: 57400 }, { distanceKm: 28.2, steps: 45100 }],
  [{ distanceKm: 75.8, steps: 118600 }, { distanceKm: 63.2, steps: 101300 }, { distanceKm: 54.9, steps: 88400 }],
  [{ distanceKm: 32.1, steps: 168500 }, { distanceKm: 27.6, steps: 151200 }, { distanceKm: 21.4, steps: 132800 }],
  [{ distanceKm: 46.1, steps: 159400 }, { distanceKm: 38.5, steps: 143700 }, { distanceKm: 31.2, steps: 128900 }],
  [{ distanceKm: 69.4, steps: 174300 }, { distanceKm: 61.8, steps: 158600 }, { distanceKm: 55.3, steps: 141900 }]
];

function normalizeCategoryKey(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 30);
}

function getCategoryLabel(category, index) {
  const distanceKm = Number(category.distanceKm || 0);
  const targetSteps = Number(category.targetSteps || 0);
  if (distanceKm > 0 && targetSteps > 0) return `${distanceKm}K + Steps`;
  if (targetSteps > 0) return '120K Steps';
  if (distanceKm > 0) return `${distanceKm}K`;
  return `Category ${index + 1}`;
}

function buildDemoDocuments(event) {
  const categories = Array.isArray(event.raceCategories) ? event.raceCategories : [];
  if (categories.length !== DEMO_METRICS.length) {
    throw new Error(`Expected ${DEMO_METRICS.length} CNS categories, found ${categories.length}.`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const eventStart = new Date(event.virtualWindow?.startAt || event.eventStartAt || now);
  const passwordHash = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);
  const users = [];
  const registrations = [];
  const activities = [];

  categories.forEach((category, categoryIndex) => {
    const categoryValue = String(category.distanceLabel || category.name || '').trim();
    const categoryKey = normalizeCategoryKey(categoryValue);
    const shortLabel = getCategoryLabel(category, categoryIndex);
    if (!categoryKey) throw new Error(`Category ${categoryIndex + 1} has no usable leaderboard key.`);

    DEMO_METRICS[categoryIndex].forEach((metrics, runnerIndex) => {
      const sequence = (categoryIndex * DEMO_RUNNERS_PER_CATEGORY) + runnerIndex + 1;
      const userId = new mongoose.Types.ObjectId();
      const registrationId = new mongoose.Types.ObjectId();
      const activityId = new mongoose.Types.ObjectId();
      const firstName = `Demo ${shortLabel} #${runnerIndex + 1}`;
      const lastName = 'Runner';
      const runDate = new Date(eventStart.getTime() + (runnerIndex * 24 * 60 * 60 * 1000));
      const reviewedAt = new Date(runDate.getTime() + 60 * 60 * 1000);
      const smokeMetadata = {
        isSmokeTest: true,
        testRunId: TEST_RUN_ID,
        createdByTest: CREATED_BY_TEST,
        expiresAt
      };

      users.push({
        _id: userId,
        userId: `CNSDEMO${String(sequence).padStart(4, '0')}`,
        email: `cns-leaderboard-demo-${String(sequence).padStart(2, '0')}@example.invalid`,
        passwordHash,
        authProvider: 'local',
        role: 'runner',
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        emailVerified: true,
        accountStatus: 'active',
        country: 'PH',
        createdAt: now,
        updatedAt: now,
        ...smokeMetadata
      });

      registrations.push({
        _id: registrationId,
        eventId: event._id,
        userId,
        participant: {
          firstName,
          lastName,
          email: `cns-leaderboard-demo-${String(sequence).padStart(2, '0')}@example.invalid`,
          mobile: '09000000000',
          country: 'PH',
          emergencyContactName: 'Demo Contact',
          emergencyContactNumber: '09000000000',
          runningGroup: ''
        },
        participationMode: 'virtual',
        raceDistance: categoryKey,
        leaderboardDisplayPreference: 'abbreviated',
        consentToLeaderboard: true,
        status: 'confirmed',
        paymentStatus: 'paid',
        pricingSnapshot: {
          pricingMode: 'free',
          source: 'free',
          raceCategoryId: String(category.categoryId || ''),
          raceCategoryName: String(category.name || categoryValue),
          raceCategoryType: String(category.type || 'challenge'),
          raceDistance: categoryKey,
          amount: 0,
          currency: 'PHP'
        },
        waiver: {
          accepted: true,
          version: Number(event.waiverVersion || 1),
          signature: `${firstName} ${lastName}`,
          acceptedAt: now,
          templateSnapshot: 'Demo leaderboard data only.',
          renderedSnapshot: 'Demo leaderboard data only.'
        },
        confirmationCode: `HR-D${categoryIndex + 1}${runnerIndex + 1}CNS`,
        registeredAt: now,
        createdAt: now,
        updatedAt: now,
        ...smokeMetadata
      });

      activities.push({
        _id: activityId,
        registrationId,
        eventId: event._id,
        runnerId: userId,
        submissionAttemptId: `${TEST_RUN_ID}-${sequence}`,
        participationMode: 'virtual',
        raceDistance: categoryKey,
        distanceKm: metrics.distanceKm,
        elapsedMs: Math.round(metrics.distanceKm * 7.2 * 60 * 1000),
        runDate,
        runLocation: 'Demo route, Philippines',
        runType: runnerIndex === 2 ? 'walk' : 'run',
        elevationGain: 80 + (sequence * 12),
        steps: metrics.steps,
        proofType: 'manual',
        proof: {
          url: `https://example.invalid/cns-leaderboard-demo/${sequence}`,
          key: `${TEST_RUN_ID}/${sequence}`,
          mimeType: 'image/png',
          size: 1024
        },
        proofNotes: 'Clearly labeled reversible demo leaderboard result.',
        honorSystemConfirmed: true,
        source: 'manual_upload',
        status: 'approved',
        submittedAt: runDate,
        reviewedAt,
        reviewNotes: 'Demo result for leaderboard UI review.',
        suspiciousFlag: false,
        createdAt: runDate,
        updatedAt: reviewedAt,
        ...smokeMetadata
      });
    });
  });

  return { users, registrations, activities, expiresAt };
}

async function countDemoRecords(eventId) {
  const filter = { testRunId: TEST_RUN_ID };
  const [users, registrations, activities] = await Promise.all([
    User.collection.countDocuments(filter),
    Registration.collection.countDocuments({ ...filter, eventId }),
    AccumulatedActivitySubmission.collection.countDocuments({ ...filter, eventId })
  ]);
  return { users, registrations, activities };
}

async function cleanupDemoRecords(event) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await AccumulatedActivitySubmission.collection.deleteMany(
        { eventId: event._id, testRunId: TEST_RUN_ID },
        { session }
      );
      await Registration.collection.deleteMany(
        { eventId: event._id, testRunId: TEST_RUN_ID },
        { session }
      );
      await User.collection.deleteMany(
        { testRunId: TEST_RUN_ID, createdByTest: CREATED_BY_TEST },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
  invalidateLeaderboardCache(EVENT_SLUG);
  const residue = await countDemoRecords(event._id);
  if (Object.values(residue).some((count) => count !== 0)) {
    throw new Error(`Demo cleanup left residue: ${JSON.stringify(residue)}`);
  }
  return residue;
}

async function seedDemoRecords(event) {
  const existing = await countDemoRecords(event._id);
  if (Object.values(existing).some((count) => count !== 0)) {
    throw new Error(`Demo records already exist: ${JSON.stringify(existing)}. Run with --cleanup first.`);
  }
  const documents = buildDemoDocuments(event);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await User.collection.insertMany(documents.users, { session });
      await Registration.collection.insertMany(documents.registrations, { session });
      await AccumulatedActivitySubmission.collection.insertMany(documents.activities, { session });
    });
  } finally {
    await session.endSession();
  }
  invalidateLeaderboardCache(EVENT_SLUG);
  return {
    ...(await countDemoRecords(event._id)),
    expiresAt: documents.expiresAt.toISOString()
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  const shouldApply = process.argv.includes('--apply');
  const shouldCleanup = process.argv.includes('--cleanup');
  if (shouldApply && shouldCleanup) throw new Error('Choose either --apply or --cleanup.');

  await mongoose.connect(process.env.MONGODB_URI);
  const event = await Event.findOne({ _id: EVENT_ID, slug: EVENT_SLUG })
    .select('_id slug title eventStartAt virtualWindow raceCategories waiverVersion')
    .lean();
  if (!event) throw new Error(`Expected event ${EVENT_ID} (${EVENT_SLUG}) was not found.`);

  const host = new URL(process.env.MONGODB_URI).hostname;
  if (shouldCleanup) {
    const before = await countDemoRecords(event._id);
    await cleanupDemoRecords(event);
    console.log(JSON.stringify({ mode: 'cleanup', host, event: event.title, removed: before }, null, 2));
    return;
  }

  if (!shouldApply) {
    const documents = buildDemoDocuments(event);
    console.log(JSON.stringify({
      mode: 'dry-run',
      host,
      event: event.title,
      testRunId: TEST_RUN_ID,
      categories: event.raceCategories.map((category) => ({
        name: category.name,
        leaderboardKey: normalizeCategoryKey(category.distanceLabel || category.name)
      })),
      records: {
        users: documents.users.length,
        registrations: documents.registrations.length,
        activities: documents.activities.length
      },
      expiresAt: documents.expiresAt.toISOString()
    }, null, 2));
    return;
  }

  const created = await seedDemoRecords(event);
  console.log(JSON.stringify({
    mode: 'apply',
    host,
    event: event.title,
    testRunId: TEST_RUN_ID,
    created
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
