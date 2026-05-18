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
const Notification = require('../src/models/Notification');
const BadgeContent = require('../src/models/BadgeContent');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');
const {
  evaluateRegistrationAchievements,
  evaluateSubmissionAchievements,
  evaluateOrganiserAchievements,
  revokeUserBadge
} = require('../src/services/achievement.service');
const {
  refreshAccumulatedChallengeProgress,
  refreshGlobalDistanceMilestoneProgress
} = require('../src/services/badge-progress.service');
const { publishRankings } = require('../src/services/ranking.service');

const seeded = [];

function hasRequiredEnvironment() {
  if (!String(process.env.DATABASE_URL || '').trim()) {
    test.skip('DATABASE_URL is not configured for badge integration tests');
    return false;
  }
  if (!String(process.env.MONGODB_URI || '').trim()) {
    test.skip('MONGODB_URI is not configured for badge integration tests');
    return false;
  }
  return true;
}

test.before(async () => {
  if (String(process.env.MONGODB_URI || '').trim()) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

test.after(async () => {
  for (const seed of seeded.reverse()) {
    await cleanupSeed(seed);
  }
  await closePostgresClient();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test('core badge award path is verified, idempotent, and respects revocation', async () => {
  if (!hasRequiredEnvironment()) return;

  const seed = await seedBadgeFixture();
  seeded.push(seed);

  const unpaidAwards = await evaluateRegistrationAchievements(seed.registration);
  assert.equal(unpaidAwards.length, 0, 'paid events should not award participant badges before payment approval');

  seed.registration.paymentStatus = 'paid';
  await seed.registration.save();

  const registrationAwards = await evaluateRegistrationAchievements(seed.registration);
  assert.equal(registrationAwards.length, 1, 'paid confirmed registration should award participant badge');

  const duplicateRegistrationAwards = await evaluateRegistrationAchievements(seed.registration);
  assert.equal(duplicateRegistrationAwards.length, 0, 'registration award evaluation should be idempotent');

  const participantBadges = await findUserBadges(seed.runner._id, seed.event._id, {
    requirementType: 'registration_confirmed'
  });
  assert.equal(participantBadges.length, 1);

  const submissionAwards = await evaluateSubmissionAchievements(seed.submission);
  assert.equal(submissionAwards.length, 3, 'approved submission should award finisher, distance, and mode badges');

  const duplicateSubmissionAwards = await evaluateSubmissionAchievements(seed.submission);
  assert.equal(duplicateSubmissionAwards.length, 0, 'submission award evaluation should be idempotent');

  const verifiedBadges = await findUserBadges(seed.runner._id, seed.event._id, {
    verificationStatus: 'verified'
  });
  assert.deepEqual(
    verifiedBadges.map((badge) => badge.requirement_type).sort(),
    ['distance_completed', 'mode_completed', 'registration_confirmed', 'result_approved']
  );

  const revoked = await revokeUserBadge(participantBadges[0].id, {
    performedBy: seed.organizer._id,
    reason: 'Integration test revoke'
  });
  assert.ok(revoked?.id);

  const awardsAfterRevoke = await evaluateRegistrationAchievements(seed.registration);
  assert.equal(awardsAfterRevoke.length, 0, 'auto-award should not recreate an admin-revoked badge');

  const participantAfterRevoke = await findUserBadges(seed.runner._id, seed.event._id, {
    requirementType: 'registration_confirmed'
  });
  assert.equal(participantAfterRevoke.length, 1);
  assert.equal(participantAfterRevoke[0].verification_status, 'revoked');
});

test('accumulated challenge progress stores progress rows and awards milestone badges', async () => {
  if (!hasRequiredEnvironment()) return;

  const seed = await seedBadgeFixture({
    tag: 'challenge-progress',
    eventOverrides: {
      virtualCompletionMode: 'accumulated_distance',
      targetDistanceKm: 100,
      minimumActivityDistanceKm: 1,
      acceptedRunTypes: ['run', 'walk']
    }
  });
  seeded.push(seed);

  seed.activities = [];

  seed.activities.push(await createApprovedAccumulatedActivity(seed, {
    distanceKm: 30,
    tag: '30k'
  }));
  let progress = await refreshAccumulatedChallengeProgress(seed.registration, {
    performedBy: seed.organizer._id
  });
  assert.equal(Number(progress.currentValue), 30);
  assert.equal(progress.awards.length, 1, '30K should award only the 25% challenge badge');

  let progressRows = await findBadgeProgress(seed.runner._id, seed.event._id);
  assert.equal(progressRows.length, 4, 'all challenge milestones should have progress rows');
  assert.equal(Number(progressRows[0].current_value), 30);
  assert.deepEqual(
    progressRows.map((row) => Number(row.target_value)).sort((a, b) => a - b),
    [25, 50, 75, 100]
  );

  seed.activities.push(await createApprovedAccumulatedActivity(seed, {
    distanceKm: 50,
    tag: '50k'
  }));
  progress = await refreshAccumulatedChallengeProgress(seed.registration, {
    performedBy: seed.organizer._id
  });
  assert.equal(Number(progress.currentValue), 80);
  assert.equal(progress.awards.length, 2, '80K should newly award 50% and 75% challenge badges');

  seed.activities.push(await createApprovedAccumulatedActivity(seed, {
    distanceKm: 25,
    tag: '25k'
  }));
  progress = await refreshAccumulatedChallengeProgress(seed.registration, {
    performedBy: seed.organizer._id
  });
  assert.equal(Number(progress.currentValue), 105);
  assert.equal(progress.awards.length, 1, '105K should newly award the challenge finisher badge');

  const challengeBadges = await findUserBadges(seed.runner._id, seed.event._id, {
    requirementType: 'challenge_progress',
    verificationStatus: 'verified'
  });
  assert.deepEqual(
    challengeBadges.map((badge) => badge.badge_type).sort(),
    ['challenge_finisher', 'challenge_progress', 'challenge_progress', 'challenge_progress']
  );

  const duplicateProgress = await refreshAccumulatedChallengeProgress(seed.registration, {
    performedBy: seed.organizer._id
  });
  assert.equal(duplicateProgress.awards.length, 0, 'progress refresh should be idempotent after all milestones are awarded');
});

test('global distance progress awards lifetime verified distance milestone badges', async () => {
  if (!hasRequiredEnvironment()) return;

  const seed = await seedBadgeFixture({ tag: 'global-distance' });
  seeded.push(seed);

  seed.submission.distanceKm = 55;
  await saveSubmissionWithoutShadow(seed.submission);

  let progress = await refreshGlobalDistanceMilestoneProgress(seed.runner._id, {
    performedBy: seed.organizer._id
  });
  assert.equal(Number(progress.currentValue), 55);
  assert.equal(progress.awards.length, 2, '55K should award First 5K and 50K Club');

  let progressRows = await findGlobalBadgeProgress(seed.runner._id);
  assert.equal(progressRows.length, 5, 'all global distance milestones should have progress rows');
  assert.deepEqual(
    progressRows.map((row) => Number(row.target_value)).sort((a, b) => a - b),
    [5, 50, 100, 500, 1000]
  );

  seed.submission.distanceKm = 105;
  await saveSubmissionWithoutShadow(seed.submission);

  progress = await refreshGlobalDistanceMilestoneProgress(seed.runner._id, {
    performedBy: seed.organizer._id
  });
  assert.equal(Number(progress.currentValue), 105);
  assert.equal(progress.awards.length, 1, '105K should newly award the 100K Club badge');

  const globalBadges = await findGlobalUserBadges(seed.runner._id);
  assert.deepEqual(
    globalBadges.map((badge) => badge.badge_code).sort(),
    ['global-distance-100k', 'global-distance-50k', 'global-distance-5k']
  );

  const duplicateProgress = await refreshGlobalDistanceMilestoneProgress(seed.runner._id, {
    performedBy: seed.organizer._id
  });
  assert.equal(duplicateProgress.awards.length, 0, 'global distance progress should be idempotent');
});

test('published rankings award leaderboard rank badges once', async () => {
  if (!hasRequiredEnvironment()) return;

  const seed = await seedBadgeFixture({
    tag: 'leaderboard-rank',
    eventOverrides: {
      leaderboardRecognitionEnabled: true
    }
  });
  seeded.push(seed);

  await evaluateSubmissionAchievements(seed.submission, {
    performedBy: seed.organizer._id
  });

  const sql = getPostgresClient();
  const [eventRows, runnerRows, submissionRows] = await Promise.all([
    sql`SELECT id FROM events_core WHERE mongo_event_id = ${String(seed.event._id)} LIMIT 1`,
    sql`SELECT id FROM app_users WHERE mongo_user_id = ${String(seed.runner._id)} LIMIT 1`,
    sql`SELECT id FROM submissions_core WHERE mongo_submission_id = ${String(seed.submission._id)} LIMIT 1`
  ]);
  assert.equal(eventRows.length, 1);
  assert.equal(runnerRows.length, 1);
  assert.equal(submissionRows.length, 1);

  const rankingRows = await sql`
    INSERT INTO rankings (
      mongo_submission_id,
      event_core_id,
      runner_user_id,
      leaderboard_type,
      rank_position,
      race_distance,
      participation_mode,
      elapsed_ms,
      submitted_at,
      calculated_at
    )
    VALUES (
      ${String(seed.submission._id)},
      ${eventRows[0].id},
      ${runnerRows[0].id},
      'single_activity',
      1,
      '5K',
      'virtual',
      1800000,
      NOW(),
      NOW()
    )
    ON CONFLICT (mongo_submission_id) DO UPDATE SET
      rank_position = EXCLUDED.rank_position,
      published_at = NULL
    RETURNING id
  `;
  assert.equal(rankingRows.length, 1);

  const publishedCount = await publishRankings({ eventSlug: seed.event.slug });
  assert.equal(publishedCount, 1);

  const rankBadges = await findUserBadges(seed.runner._id, seed.event._id, {
    requirementType: 'rank_achieved',
    verificationStatus: 'verified'
  });
  assert.deepEqual(
    rankBadges.map((badge) => badge.badge_code).sort(),
    [
      `${seed.event.slug}-5k-winner`,
      `${seed.event.slug}-top-1`,
      `${seed.event.slug}-top-10`,
      `${seed.event.slug}-top-3`,
      `${seed.event.slug}-virtual-winner`
    ].sort()
  );

  const duplicatePublishedCount = await publishRankings({ eventSlug: seed.event.slug });
  assert.equal(duplicatePublishedCount, 0);
});

test('organiser achievements award verified organiser and milestone badges', async () => {
  if (!hasRequiredEnvironment()) return;

  const seed = await seedBadgeFixture({ tag: 'organiser-achievement' });
  seeded.push(seed);

  const awards = await evaluateOrganiserAchievements(seed.organizer._id, {
    performedBy: seed.organizer._id
  });
  assert.equal(awards.length, 3, 'approved organiser with one published event and one registration should earn eligible organiser badges');

  const organiserBadges = await findGlobalUserBadges(seed.organizer._id, {
    requirementType: 'organiser_activity'
  });
  assert.deepEqual(
    organiserBadges.map((badge) => badge.badge_code).sort(),
    [
      'organiser-first-confirmed-registration',
      'organiser-first-published-event',
      'organiser-verified'
    ]
  );

  const duplicateAwards = await evaluateOrganiserAchievements(seed.organizer._id, {
    performedBy: seed.organizer._id
  });
  assert.equal(duplicateAwards.length, 0, 'organiser achievement awards should be idempotent');
});

async function seedBadgeFixture(options = {}) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);
  const tag = String(options.tag || 'award').replace(/[^a-z0-9-]/gi, '-').toLowerCase();

  const runner = await User.create({
    userId: `UBADGER${stamp}`.replace(/\W/g, '').slice(0, 22),
    email: `badge.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Badge',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000111',
    country: 'PH',
    emergencyContactName: 'Emergency Badge',
    emergencyContactNumber: '09170000112'
  });

  const organizer = await User.create({
    userId: `UBADGEO${stamp}`.replace(/\W/g, '').slice(0, 22),
    email: `badge.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Badge',
    lastName: 'Organizer',
    emailVerified: true
  });

  const now = Date.now();
  const databaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = '';
  let event;
  let registration;
  let submission;

  try {
    event = await Event.create({
      organizerId: organizer._id,
      slug: `badge-${tag}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
      referenceCode: `BGE-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
      title: `Badge ${tag} Event ${stamp}`.slice(0, 150),
      organiserName: 'Badge Organizer',
      description: 'Badge integration fixture',
      status: 'published',
      eventType: 'virtual',
      eventTypesAllowed: ['virtual'],
      feeMode: 'paid',
      feeAmount: 250,
      raceDistances: ['5 km'],
      digitalBadgeEnabled: true,
      registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
      registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
      eventStartAt: new Date(now - 60 * 60 * 1000),
      eventEndAt: new Date(now + 24 * 60 * 60 * 1000),
      proofTypesAllowed: ['gps'],
      waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      waiverVersion: 1,
      ...(options.eventOverrides || {})
    });

    registration = await Registration.create({
      eventId: event._id,
      userId: runner._id,
      participant: {
        firstName: runner.firstName,
        lastName: runner.lastName,
        email: runner.email,
        mobile: runner.mobile,
        country: runner.country,
        emergencyContactName: runner.emergencyContactName,
        emergencyContactNumber: runner.emergencyContactNumber
      },
      participationMode: 'virtual',
      raceDistance: '5K',
      status: 'confirmed',
      paymentStatus: 'proof_submitted',
      confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      waiver: {
        accepted: true,
        version: 1,
        signature: 'Badge Runner',
        acceptedAt: new Date(),
        templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
        renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
      },
      registeredAt: new Date()
    });

    submission = await Submission.create({
      registrationId: registration._id,
      eventId: event._id,
      runnerId: runner._id,
      participationMode: 'virtual',
      raceDistance: '5 km',
      distanceKm: 5,
      elapsedMs: 1800000,
      proofType: 'gps',
      proof: {
        url: 'https://example.com/badge-proof.gpx',
        mimeType: 'application/gpx+xml',
        size: 1024
      },
      status: 'approved',
      reviewedAt: new Date(),
      reviewedBy: organizer._id
    });
  } finally {
    process.env.DATABASE_URL = databaseUrl;
  }

  return { runner, organizer, event, registration, submission };
}

async function createApprovedAccumulatedActivity(seed, input = {}) {
  return AccumulatedActivitySubmission.create({
    registrationId: seed.registration._id,
    eventId: seed.event._id,
    runnerId: seed.runner._id,
    participationMode: seed.registration.participationMode || 'virtual',
    raceDistance: seed.registration.raceDistance || '5K',
    distanceKm: Number(input.distanceKm || 0),
    elapsedMs: Number(input.elapsedMs || 3600000),
    proofType: 'gps',
    proof: {
      url: `https://example.com/badge-progress-${input.tag || Date.now()}.gpx`,
      mimeType: 'application/gpx+xml',
      size: 1024
    },
    source: 'manual_upload',
    status: 'approved',
    submittedAt: new Date(),
    reviewedAt: new Date(),
    reviewedBy: seed.organizer._id
  });
}

async function findUserBadges(mongoUserId, mongoEventId, filters = {}) {
  const sql = getPostgresClient();
  return sql`
    SELECT ub.*, bd.requirement_type, bd.badge_type, bd.badge_code
    FROM user_badges ub
    JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
    WHERE ub.mongo_user_id = ${String(mongoUserId)}
      AND ub.mongo_event_id = ${String(mongoEventId)}
      AND (${!filters.requirementType} OR bd.requirement_type = ${filters.requirementType || ''})
      AND (${!filters.verificationStatus} OR ub.verification_status = ${filters.verificationStatus || ''})
    ORDER BY bd.requirement_type ASC
  `;
}

async function findBadgeProgress(mongoUserId, mongoEventId) {
  const sql = getPostgresClient();
  return sql`
    SELECT bp.*, bd.requirement_value, bd.badge_type
    FROM badge_progress bp
    JOIN badge_definitions bd ON bd.id = bp.badge_definition_id
    WHERE bp.mongo_user_id = ${String(mongoUserId)}
      AND bp.mongo_event_id = ${String(mongoEventId)}
    ORDER BY bp.target_value ASC
  `;
}

async function findGlobalBadgeProgress(mongoUserId) {
  const sql = getPostgresClient();
  return sql`
    SELECT bp.*, bd.requirement_value, bd.badge_type
    FROM badge_progress bp
    JOIN badge_definitions bd ON bd.id = bp.badge_definition_id
    WHERE bp.mongo_user_id = ${String(mongoUserId)}
      AND bp.event_core_id IS NULL
      AND bd.requirement_type = 'global_distance'
    ORDER BY bp.target_value ASC
  `;
}

async function findGlobalUserBadges(mongoUserId, filters = {}) {
  const sql = getPostgresClient();
  return sql`
    SELECT ub.*, bd.requirement_type, bd.badge_type, bd.badge_code
    FROM user_badges ub
    JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
    WHERE ub.mongo_user_id = ${String(mongoUserId)}
      AND ub.event_core_id IS NULL
      AND (${!filters.requirementType} OR bd.requirement_type = ${filters.requirementType || ''})
      AND ub.verification_status = 'verified'
    ORDER BY bd.badge_code ASC
  `;
}

async function saveSubmissionWithoutShadow(submission) {
  const databaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = '';
  try {
    await submission.save();
  } finally {
    process.env.DATABASE_URL = databaseUrl;
  }
}

async function cleanupSeed(seed) {
  if (!seed) return;

  const sql = String(process.env.DATABASE_URL || '').trim() ? getPostgresClient() : null;
  const mongoUserIds = [seed.runner?._id, seed.organizer?._id].filter(Boolean).map(String);
  const mongoEventId = seed.event?._id ? String(seed.event._id) : '';
  const mongoRegistrationId = seed.registration?._id ? String(seed.registration._id) : '';
  const mongoSubmissionId = seed.submission?._id ? String(seed.submission._id) : '';

  if (sql && mongoEventId) {
    const eventRows = await sql`SELECT id FROM events_core WHERE mongo_event_id = ${mongoEventId}`;
    const eventCoreIds = eventRows.map((row) => row.id);

    if (eventCoreIds.length) {
      const definitionRows = await sql`
        SELECT badge_definition_id
        FROM event_badges
        WHERE event_core_id = ANY(${eventCoreIds})
      `;
      const definitionIds = definitionRows.map((row) => row.badge_definition_id);

      await sql`DELETE FROM badge_audit_logs WHERE event_core_id = ANY(${eventCoreIds})`;
      await sql`DELETE FROM rankings WHERE event_core_id = ANY(${eventCoreIds})`;
      await sql`DELETE FROM badge_progress WHERE event_core_id = ANY(${eventCoreIds})`;
      await sql`DELETE FROM user_badges WHERE event_core_id = ANY(${eventCoreIds}) OR mongo_event_id = ${mongoEventId}`;
      await sql`DELETE FROM event_badges WHERE event_core_id = ANY(${eventCoreIds})`;
      if (definitionIds.length) {
        await sql`DELETE FROM badge_definitions WHERE id = ANY(${definitionIds})`;
      }
      if (mongoSubmissionId) {
        await sql`DELETE FROM submissions_core WHERE mongo_submission_id = ${mongoSubmissionId}`;
      }
      if (mongoRegistrationId) {
        await sql`DELETE FROM registrations WHERE mongo_registration_id = ${mongoRegistrationId}`;
      }
      await sql`DELETE FROM events_core WHERE id = ANY(${eventCoreIds})`;
    }
  }

  if (sql && mongoUserIds.length) {
    await sql`DELETE FROM migration_records WHERE source_id = ANY(${mongoUserIds})`;
    await sql`DELETE FROM app_users WHERE mongo_user_id = ANY(${mongoUserIds})`;
  }

  await BadgeContent.deleteMany({ mongoEventId });
  await Notification.deleteMany({ userId: { $in: mongoUserIds } });
  if (seed.activities?.length) {
    await AccumulatedActivitySubmission.deleteMany({ _id: { $in: seed.activities.map((item) => item._id) } });
  }
  if (mongoSubmissionId) await Submission.deleteOne({ _id: seed.submission._id });
  if (mongoRegistrationId) await Registration.deleteOne({ _id: seed.registration._id });
  if (mongoEventId) await Event.deleteOne({ _id: seed.event._id });
  if (mongoUserIds.length) {
    await User.deleteMany({ _id: { $in: mongoUserIds } });
  }
}
