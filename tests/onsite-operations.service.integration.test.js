// tests/onsite-operations.service.test.js
// Unit tests for Phase 7 onsite operations service

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('dotenv').config();

const {
  assignBib,
  assignBibsInBulk,
  markRaceKitReleased,
  recordCheckIn,
  createRaceKit,
  logResultImport,
  recordOnsiteResult,
  approveOnsiteResult,
  getEventCheckInSummary,
  getEventBibAssignmentStatus
} = require('../src/services/onsite-operations.service');

const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');

// Test data helpers
let testCounter = 0;
const createdEventCoreIds = new Set();
const createdAppUserIds = new Set();
const createdRegistrationIds = new Set();
const eventCoreIdByMongoId = new Map();
const appUserIdByMongoId = new Map();

function uniqueMongoId() {
  return crypto.randomBytes(12).toString('hex');
}

async function createTestEvent() {
  testCounter++;
  const sql = getPostgresClient();
  try {
    const mongoEventId = uniqueMongoId();
    const result = await sql`
      INSERT INTO events_core (
        mongo_event_id, 
        title, 
        slug,
        status,
        created_at
      )
      VALUES (
        ${mongoEventId},
        ${`Test Event Phase 7 ${testCounter}`},
        ${`test-event-phase-7-${testCounter}`},
        'published',
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `;
    createdEventCoreIds.add(result[0].id);
    eventCoreIdByMongoId.set(mongoEventId, result[0].id);
    return mongoEventId;
  } catch (err) {
    console.error('Error creating test event:', err.message);
    throw err;
  }
}

async function createTestUser() {
  testCounter++;
  const sql = getPostgresClient();
  try {
    const mongoUserId = uniqueMongoId();
    const result = await sql`
      INSERT INTO app_users (mongo_user_id, email, role_snapshot, created_at)
      VALUES (
        ${mongoUserId},
        ${`phase7-test-${uniqueMongoId()}@example.com`},
        'runner',
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `;
    createdAppUserIds.add(result[0].id);
    appUserIdByMongoId.set(mongoUserId, result[0].id);
    return mongoUserId;
  } catch (err) {
    console.error('Error creating test user:', err.message);
    throw err;
  }
}

async function createTestRegistration(mongoEventId, mongoUserId) {
  testCounter++;
  const sql = getPostgresClient();
  try {
    const eventId = eventCoreIdByMongoId.get(mongoEventId);
    const userId = appUserIdByMongoId.get(mongoUserId);
    assert.ok(eventId, 'Test event core ID should be available');
    assert.ok(userId, 'Test app user ID should be available');
    const mongoRegistrationId = uniqueMongoId();
    const result = await sql`
      INSERT INTO registrations (
        mongo_registration_id, 
        event_core_id, 
        app_user_id, 
        mongo_event_id,
        mongo_user_id,
        confirmation_code,
        participation_mode,
        race_distance,
        status,
        payment_status_snapshot,
        created_at
      )
      VALUES (
        ${mongoRegistrationId},
        ${eventId},
        ${userId},
        ${mongoEventId},
        ${mongoUserId},
        ${`CONF${Date.now()}${String(testCounter).padStart(6, '0')}`.slice(0, 32)},
        'onsite',
        '5K',
        'confirmed',
        'paid',
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `;
    createdRegistrationIds.add(result[0].id);
    return mongoRegistrationId;
  } catch (err) {
    console.error('Error creating test registration:', err.message);
    throw err;
  }
}

async function cleanup() {
  const sql = getPostgresClient();
  try {
    const eventIds = Array.from(createdEventCoreIds);
    const userIds = Array.from(createdAppUserIds);
    const registrationIds = Array.from(createdRegistrationIds);
    if (eventIds.length) {
      await sql`DELETE FROM onsite_results WHERE event_core_id = ANY(${eventIds})`;
      await sql`DELETE FROM result_imports WHERE event_core_id = ANY(${eventIds})`;
      await sql`DELETE FROM check_ins WHERE event_core_id = ANY(${eventIds})`;
      await sql`DELETE FROM bib_assignments WHERE event_core_id = ANY(${eventIds})`;
      await sql`DELETE FROM race_kits WHERE event_core_id = ANY(${eventIds})`;
    }
    if (registrationIds.length) {
      await sql`DELETE FROM registrations WHERE id = ANY(${registrationIds})`;
    }
    if (eventIds.length) {
      await sql`DELETE FROM events_core WHERE id = ANY(${eventIds})`;
    }
    if (userIds.length) {
      await sql`DELETE FROM app_users WHERE id = ANY(${userIds})`;
    }
    createdEventCoreIds.clear();
    createdAppUserIds.clear();
    createdRegistrationIds.clear();
    eventCoreIdByMongoId.clear();
    appUserIdByMongoId.clear();
  } catch (err) {
    // Ignore cleanup errors
  }
}

// Bib Assignment Tests
test('Phase 7: assignBib creates bib assignment with category', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);

  try {
    const bib = await assignBib(eventId, registrationId, '001', { category: 'Male 25-34' });
    assert.ok(bib.id, 'Bib should have ID');
    assert.equal(bib.bib_number, '001', 'Bib number should match');
    assert.equal(bib.category, 'Male 25-34', 'Category should match');
    assert.equal(bib.assignment_status, 'assigned', 'Status should be assigned');
  } finally {
    await cleanup();
  }
});

test('Phase 7: assignBib throws on missing event', async (t) => {
  try {
    await assignBib('999f1f77bcf86cd799439999', '123', '001');
    assert.fail('Should throw for invalid event');
  } catch (err) {
    assert.match(err.message, /not found|Event/i);
  }
});

// Check-In Recording Tests
test('Phase 7: recordCheckIn records with verification method', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);

  try {
    const checkIn = await recordCheckIn(eventId, registrationId, {
      verificationMethod: 'bib_scan',
      participationMode: '5K'
    });
    assert.ok(checkIn.id, 'Check-in should have ID');
    assert.equal(checkIn.check_in_status, 'checked_in', 'Status should be checked_in');
    assert.equal(checkIn.verification_method, 'bib_scan', 'Verification method should match');
  } finally {
    await cleanup();
  }
});

test('Phase 7: approving a result reports whether it entered the leaderboard', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);

  try {
    const recorded = await recordOnsiteResult(eventId, registrationId, {
      displayTime: '00:52:10',
      elapsedMs: 3130000,
      distanceKm: 10,
      dataSource: 'manual_entry'
    });

    const approved = await approveOnsiteResult(eventId, recorded.id, {});

    assert.equal(approved.result.result_status, 'approved');
    // The outcome is always reported, so staff are never told a finisher is ranked
    // when the submission could not be created.
    assert.equal(
      typeof approved.submissionCreated,
      'boolean',
      'Approval should report whether the result entered the results'
    );
    if (!approved.submissionCreated) {
      assert.ok(approved.submissionError, 'A failed materialisation must explain itself');
    }
  } finally {
    await cleanup();
  }
});

test('Phase 7: bulk assignment reports per-row outcomes instead of failing the batch', async (t) => {
  const eventId = await createTestEvent();
  const userA = await createTestUser();
  const userB = await createTestUser();
  const regA = await createTestRegistration(eventId, userA);
  const regB = await createTestRegistration(eventId, userB);

  try {
    // Take a bib number first so the second row in the batch collides.
    await assignBib(eventId, regA, '500');

    const result = await assignBibsInBulk(eventId, [
      { registrationId: regB, bibNumber: '501' },
      { registrationId: regB, bibNumber: '500' },
      { registrationId: '', bibNumber: '502' }
    ]);

    assert.equal(result.assigned.length, 1, 'The valid row should still be assigned');
    assert.equal(result.assigned[0].bibNumber, '501');
    assert.equal(result.failed.length, 2, 'Duplicate and malformed rows should be reported');
    assert.match(result.failed[0].error, /already assigned/);
    assert.match(result.failed[1].error, /required/);
  } finally {
    await cleanup();
  }
});

test('Phase 7: kit release requires a bib and is idempotent', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);

  try {
    await assert.rejects(
      () => markRaceKitReleased(eventId, registrationId),
      /Assign a bib first/,
      'Releasing without a bib should be refused'
    );

    await assignBib(eventId, registrationId, '600');
    const first = await markRaceKitReleased(eventId, registrationId);
    assert.equal(first.assignment_status, 'picked_up');
    assert.ok(first.picked_up_at, 'Pickup time should be recorded');

    const second = await markRaceKitReleased(eventId, registrationId);
    assert.equal(
      new Date(second.picked_up_at).toISOString(),
      new Date(first.picked_up_at).toISOString(),
      'Original pickup time should be preserved on a repeat release'
    );
  } finally {
    await cleanup();
  }
});

// Requires migration 023 (unique index on check_ins(event_core_id, registration_id)).
test('Phase 7: a repeated check-in updates the existing row instead of duplicating it', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);
  const sql = getPostgresClient();

  try {
    const first = await recordCheckIn(eventId, registrationId, { verificationMethod: 'manual' });
    assert.equal(first.was_already_checked_in, false, 'First scan should not report a repeat');

    const second = await recordCheckIn(eventId, registrationId, { verificationMethod: 'bib_scan' });
    assert.equal(second.was_already_checked_in, true, 'Second scan should report a repeat');
    assert.equal(second.id, first.id, 'Second scan should update the same row');
    assert.equal(
      new Date(second.checked_in_at).toISOString(),
      new Date(first.checked_in_at).toISOString(),
      'Original arrival time should be preserved'
    );

    const rows = await sql`
      SELECT COUNT(*)::int AS count FROM check_ins
      WHERE registration_id = (
        SELECT id FROM registrations WHERE mongo_registration_id = ${registrationId} LIMIT 1
      )
    `;
    assert.equal(rows[0].count, 1, 'Only one check-in row should exist');
  } finally {
    await cleanup();
  }
});

// Requires migration 023 (partial unique index on live bib assignments).
test('Phase 7: reassigning a bib updates the live row instead of adding a second one', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);
  const sql = getPostgresClient();

  try {
    const first = await assignBib(eventId, registrationId, '101', { category: '5K' });
    const second = await assignBib(eventId, registrationId, '202');

    assert.equal(second.id, first.id, 'Reassignment should update the same row');
    assert.equal(second.bib_number, '202', 'Bib number should be updated');
    assert.equal(second.category, '5K', 'Existing category should be retained');

    const rows = await sql`
      SELECT COUNT(*)::int AS count FROM bib_assignments
      WHERE registration_id = (
        SELECT id FROM registrations WHERE mongo_registration_id = ${registrationId} LIMIT 1
      )
      AND assignment_status <> 'voided'
    `;
    assert.equal(rows[0].count, 1, 'Only one live bib should exist for the registration');
  } finally {
    await cleanup();
  }
});

test('Phase 7: recordCheckIn supports manual verification', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);

  try {
    const checkIn = await recordCheckIn(eventId, registrationId, {
      verificationMethod: 'manual',
      notes: 'Manual check-in at registration desk'
    });
    assert.ok(checkIn.id);
    assert.equal(checkIn.verification_method, 'manual');
  } finally {
    await cleanup();
  }
});

// Race Kit Tests
test('Phase 7: createRaceKit creates with metadata', async (t) => {
  const eventId = await createTestEvent();

  try {
    const kit = await createRaceKit(eventId, {
      name: 'Standard Kit',
      description: 'Basic race kit',
      includedItems: ['bib', 'timing_chip', 'tshirt'],
      quantity: 100,
      cost: 25.00
    });
    assert.ok(kit.id, 'Kit should have ID');
    assert.equal(kit.kit_name, 'Standard Kit', 'Kit name should match');
    assert.ok(Array.isArray(kit.included_items), 'Included items should be array');
    assert.equal(kit.quantity_available, 100, 'Quantity should match');
  } finally {
    await cleanup();
  }
});

test('Phase 7: createRaceKit throws on missing name', async (t) => {
  const eventId = await createTestEvent();

  try {
    await createRaceKit(eventId, { description: 'No name field' });
    assert.fail('Should throw for missing name');
  } catch (err) {
    assert.match(err.message, /name/i);
  } finally {
    await cleanup();
  }
});

// Result Import Tests
test('Phase 7: logResultImport records import metadata', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();

  try {
    const importRecord = await logResultImport(eventId, userId, {
      source: 'csv_upload',
      fileName: 'results.csv',
      fileKey: 'uploads/phase7/results.csv',
      mimeType: 'text/csv',
      fileSize: 2048
    });
    assert.ok(importRecord.id, 'Import should have ID');
    assert.equal(importRecord.import_status, 'pending', 'Initial status should be pending');
    assert.equal(importRecord.import_source, 'csv_upload', 'Source should match');
  } finally {
    await cleanup();
  }
});

// Onsite Result Tests
test('Phase 7: recordOnsiteResult records with performance metrics', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);

  try {
    const result = await recordOnsiteResult(eventId, registrationId, {
      category: '5K',
      distanceKm: 5,
      elapsedMs: 1200000, // 20 minutes
      displayTime: '00:20:00',
      pacePerKm: 4.0,
      placeInCategory: 5,
      dataSource: 'timing_system_import'
    });
    assert.ok(result.id, 'Result should have ID');
    assert.equal(result.result_status, 'submitted', 'Initial status should be submitted');
    assert.equal(Number(result.pace_per_km), 4.0, 'Pace should match');
  } finally {
    await cleanup();
  }
});

// Statistics View Tests
test('Phase 7: getEventCheckInSummary returns data', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);

  try {
    // Create check-ins
    await recordCheckIn(eventId, registrationId, { verificationMethod: 'manual' });

    // Query summary
    const summary = await getEventCheckInSummary(eventId);
    assert.ok(summary, 'Summary should be returned');
  } finally {
    await cleanup();
  }
});

test('Phase 7: getEventBibAssignmentStatus returns data', async (t) => {
  const eventId = await createTestEvent();
  const userId = await createTestUser();
  const registrationId = await createTestRegistration(eventId, userId);

  try {
    // Create bib assignment
    await assignBib(eventId, registrationId, '001');

    // Query status
    const status = await getEventBibAssignmentStatus(eventId);
    assert.ok(status, 'Status should be returned');
  } finally {
    await cleanup();
  }
});

// Cleanup
test.after(async () => {
  await cleanup();
  await closePostgresClient();
});
