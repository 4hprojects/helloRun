// tests/onsite-operations.service.test.js
// Unit tests for Phase 7 onsite operations service

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('dotenv').config();

const {
  assignBib,
  recordCheckIn,
  createRaceKit,
  logResultImport,
  recordOnsiteResult,
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
