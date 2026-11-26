'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');
const { issueVirtualBib, voidBibForRegistration } = require('../src/services/race-bib-assignment.service');

const id = () => crypto.randomBytes(12).toString('hex');

test('virtual issuance converges under retries and concurrency, including guest ownership', async (t) => {
  const sql = getPostgresClient();
  const mongoEventId = id();
  const mongoUserId = id();
  const registrationId = id();
  const guestRegistrationId = id();
  const eventRows = await sql`
    INSERT INTO events_core (mongo_event_id, title, slug, status)
    VALUES (${mongoEventId}, 'Race Bib Fixture', ${`race-bib-${mongoEventId}`}, 'published') RETURNING id
  `;
  const userRows = await sql`
    INSERT INTO app_users (mongo_user_id, email, role_snapshot)
    VALUES (${mongoUserId}, ${`race-bib-${mongoUserId}@example.invalid`}, 'runner') RETURNING id
  `;
  const eventCoreId = eventRows[0].id;
  await sql`
    INSERT INTO event_bib_number_policies (event_core_id, virtual_start, virtual_end, virtual_next)
    VALUES (${eventCoreId}, 1000, 1010, 1000)
  `;

  t.after(async () => {
    await sql`DELETE FROM events_core WHERE id = ${eventCoreId}`;
    await sql`DELETE FROM app_users WHERE id = ${userRows[0].id}`;
    await closePostgresClient();
  });

  const event = {
    _id: mongoEventId,
    feeMode: 'free',
    bibSettings: { releaseStatus: 'released', releasedDesignVersionId: id() }
  };
  const base = {
    eventId: mongoEventId,
    confirmationCode: `BIB${registrationId}`.slice(0, 32).toUpperCase(),
    participant: { firstName: 'Retry', lastName: 'Runner', email: `${registrationId}@example.invalid` },
    participationMode: 'virtual',
    raceDistance: 'Open',
    status: 'confirmed',
    paymentStatus: 'not_required',
    registeredAt: new Date()
  };
  const registration = { ...base, _id: registrationId, userId: mongoUserId };
  const outcomes = await Promise.all(Array.from({ length: 8 }, () => issueVirtualBib(registrationId, { event, registration })));
  assert.equal(new Set(outcomes.map((outcome) => outcome.assignment.bib_number)).size, 1);
  assert.equal(outcomes[0].assignment.bib_number, '1000');

  await voidBibForRegistration(registrationId, 'fixture cancellation');
  const reactivated = await issueVirtualBib(registrationId, { event, registration });
  assert.equal(reactivated.assignment.bib_number, '1000');
  assert.equal(reactivated.assignment.assignment_status, 'assigned');

  const guest = {
    ...base,
    _id: guestRegistrationId,
    userId: null,
    participantType: 'guest',
    confirmationCode: `GST${guestRegistrationId}`.slice(0, 32).toUpperCase(),
    participant: { firstName: 'Guest', lastName: 'Runner', email: `${guestRegistrationId}@example.invalid` }
  };
  const guestOutcome = await issueVirtualBib(guestRegistrationId, { event, registration: guest });
  assert.equal(guestOutcome.assignment.bib_number, '1001');
  assert.equal(guestOutcome.assignment.runner_user_id, null);

  const rows = await sql`SELECT bib_number FROM bib_assignments WHERE event_core_id = ${eventCoreId} AND assignment_status <> 'voided'`;
  assert.deepEqual(rows.map((row) => row.bib_number).sort(), ['1000', '1001']);
});

test('hybrid policy rejects wrong mode, overlap, and out-of-range onsite numbers', async (t) => {
  const sql = getPostgresClient();
  const mongoEventId = id();
  const mongoRegistrationId = id();
  const eventRows = await sql`
    INSERT INTO events_core (mongo_event_id, title, slug, status)
    VALUES (${mongoEventId}, 'Hybrid Bib Fixture', ${`hybrid-bib-${mongoEventId}`}, 'published') RETURNING id
  `;
  const eventCoreId = eventRows[0].id;
  const registrationRows = await sql`
    INSERT INTO registrations (
      mongo_registration_id, event_core_id, mongo_event_id, confirmation_code,
      participation_mode, race_distance, status, payment_status_snapshot
    ) VALUES (
      ${mongoRegistrationId}, ${eventCoreId}, ${mongoEventId}, ${`HYB${mongoRegistrationId}`.slice(0, 32).toUpperCase()},
      'onsite', 'Open', 'confirmed', 'paid'
    ) RETURNING id
  `;
  await sql`
    INSERT INTO event_bib_number_policies (
      event_core_id, virtual_start, virtual_end, virtual_next, onsite_start, onsite_end, hybrid_enforced
    ) VALUES (${eventCoreId}, 1, 99, 1, 100, 199, TRUE)
  `;

  t.after(async () => {
    await sql`DELETE FROM events_core WHERE id = ${eventCoreId}`;
    await closePostgresClient();
  });

  await assert.rejects(
    sql`INSERT INTO bib_assignments (event_core_id, registration_id, bib_number, bib_kind) VALUES (${eventCoreId}, ${registrationRows[0].id}, '42', 'onsite')`,
    /outside the configured range/
  );
  await assert.rejects(
    sql`UPDATE event_bib_number_policies SET onsite_start = 50 WHERE event_core_id = ${eventCoreId}`,
    /check constraint/
  );
  const assigned = await sql`
    INSERT INTO bib_assignments (event_core_id, registration_id, bib_number, bib_kind)
    VALUES (${eventCoreId}, ${registrationRows[0].id}, '142', 'onsite') RETURNING bib_number
  `;
  assert.equal(assigned[0].bib_number, '142');
});
