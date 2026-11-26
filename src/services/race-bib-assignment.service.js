'use strict';

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const RaceBibDesign = require('../models/RaceBibDesign');
const { getPostgresClient } = require('../db/postgres');
const { syncRegistrationPaymentShadow } = require('./registration-payment-shadow.service');
const { evaluateBibEligibility } = require('./race-bib-eligibility.service');

async function loadContext(registrationId) {
  const registration = await Registration.findById(registrationId).lean();
  if (!registration) throw new Error('Registration not found.');
  const event = await Event.findById(registration.eventId).lean();
  if (!event) throw new Error('Event not found.');
  return { event, registration };
}

async function getBibAssignment(registrationId) {
  const sql = getPostgresClient();
  const rows = await sql`
    SELECT ba.id, ba.bib_number, ba.bib_kind, ba.assignment_status, ba.category,
           ba.assigned_at, ba.updated_at
    FROM bib_assignments ba
    JOIN registrations r ON r.id = ba.registration_id
    WHERE r.mongo_registration_id = ${String(registrationId)}
      AND ba.assignment_status <> 'voided'
    ORDER BY ba.updated_at DESC LIMIT 1
  `;
  return rows[0] || null;
}

async function getBibAssignmentsForRegistrations(registrationIds = []) {
  const ids = registrationIds.map(String).filter(Boolean);
  if (!ids.length) return new Map();
  const sql = getPostgresClient();
  const rows = await sql`
    SELECT r.mongo_registration_id, ba.bib_number, ba.bib_kind, ba.assignment_status
    FROM registrations r
    LEFT JOIN bib_assignments ba ON ba.registration_id = r.id AND ba.assignment_status <> 'voided'
    WHERE r.mongo_registration_id = ANY(${ids})
  `;
  return new Map(rows.filter((row) => row.bib_number).map((row) => [row.mongo_registration_id, row]));
}

async function issueVirtualBib(registrationId, options = {}) {
  const { event, registration } = options.event && options.registration
    ? options
    : await loadContext(registrationId);
  const eligibility = evaluateBibEligibility(event, registration);
  if (!eligibility.eligible) return { issued: false, eligibility };
  if (registration.participationMode !== 'virtual') {
    return { issued: false, eligibility: { eligible: false, reason: 'onsite_assignment_required' } };
  }

  const sql = getPostgresClient();
  const assignment = await sql.begin(async (tx) => {
    // Covers the first shadow insert as well as allocation. A registration-row lock
    // cannot protect a row that does not exist yet, while this lock is process-safe.
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${String(registration._id)}, 0))`;
    await syncRegistrationPaymentShadow(registration, { operation: 'live_sync', sql: tx });
    const registrationRows = await tx`
      SELECT r.id, r.event_core_id, r.app_user_id, r.race_distance, r.participation_mode
      FROM registrations r
      WHERE r.mongo_registration_id = ${String(registration._id)} LIMIT 1
      FOR UPDATE
    `;
    if (!registrationRows.length) throw new Error('Registration shadow is unavailable.');
    const row = registrationRows[0];
    const existing = await tx`
      SELECT * FROM bib_assignments
      WHERE event_core_id = ${row.event_core_id} AND registration_id = ${row.id} AND bib_kind = 'virtual'
      ORDER BY created_at ASC LIMIT 1
    `;
    if (existing.length) {
      if (existing[0].bib_kind !== 'virtual') throw new Error('Registration already has an onsite bib assignment.');
      if (existing[0].assignment_status === 'voided') {
        const reactivated = await tx`
          UPDATE bib_assignments SET assignment_status = 'assigned', runner_user_id = ${row.app_user_id},
            updated_at = CURRENT_TIMESTAMP, notes = COALESCE(notes || ' | ', '') || 'Reactivated virtual bib.'
          WHERE id = ${existing[0].id} RETURNING *
        `;
        return reactivated[0];
      }
      return existing[0];
    }
    const otherLive = await tx`
      SELECT id FROM bib_assignments
      WHERE event_core_id = ${row.event_core_id} AND registration_id = ${row.id}
        AND assignment_status <> 'voided'
      LIMIT 1
    `;
    if (otherLive.length) throw new Error('Registration already has an onsite bib assignment.');
    const policies = await tx`
      SELECT * FROM event_bib_number_policies WHERE event_core_id = ${row.event_core_id} FOR UPDATE
    `;
    if (!policies.length) throw new Error('Event bib number policy is not released.');
    const policy = policies[0];
    if (policy.virtual_next > policy.virtual_end) throw new Error('Virtual bib number range is exhausted.');
    const bibNumber = String(policy.virtual_next);
    await tx`
      UPDATE event_bib_number_policies SET virtual_next = virtual_next + 1, updated_at = CURRENT_TIMESTAMP
      WHERE event_core_id = ${row.event_core_id}
    `;
    const inserted = await tx`
      INSERT INTO bib_assignments (
        event_core_id, registration_id, runner_user_id, bib_number, category,
        assignment_status, bib_kind, assigned_at
      ) VALUES (
        ${row.event_core_id}, ${row.id}, ${row.app_user_id}, ${bibNumber}, ${row.race_distance},
        'assigned', 'virtual', CURRENT_TIMESTAMP
      ) RETURNING *
    `;
    return inserted[0];
  });
  return { issued: true, assignment, eligibility };
}

async function resolveBibForRegistration(registrationId, options = {}) {
  const { event, registration } = options.event && options.registration
    ? options
    : await loadContext(registrationId);
  let assignment = await getBibAssignment(registration._id);
  if (!assignment && registration.participationMode === 'virtual') {
    const outcome = await issueVirtualBib(registration._id, { event, registration });
    assignment = outcome.assignment || null;
  }
  const eligibility = evaluateBibEligibility(event, registration, {
    requireAssignment: registration.participationMode === 'onsite',
    bibNumber: assignment?.bib_number
  });
  const design = event.bibSettings?.releasedDesignVersionId
    ? await RaceBibDesign.findOne({
      _id: event.bibSettings.releasedDesignVersionId,
      eventId: event._id,
      status: 'published'
    }).lean()
    : null;
  return { event, registration, assignment, design, eligibility };
}

async function voidBibForRegistration(registrationId, reason = 'Registration ineligible') {
  const sql = getPostgresClient();
  const rows = await sql`
    UPDATE bib_assignments ba SET assignment_status = 'voided', updated_at = CURRENT_TIMESTAMP,
      notes = COALESCE(ba.notes || ' | ', '') || ${String(reason).slice(0, 300)}
    FROM registrations r
    WHERE ba.registration_id = r.id AND r.mongo_registration_id = ${String(registrationId)}
      AND ba.assignment_status <> 'voided'
    RETURNING ba.*
  `;
  return rows;
}

async function updateAssignmentOwner(registrationId) {
  const sql = getPostgresClient();
  await sql`
    UPDATE bib_assignments ba SET runner_user_id = r.app_user_id, updated_at = CURRENT_TIMESTAMP
    FROM registrations r
    WHERE ba.registration_id = r.id AND r.mongo_registration_id = ${String(registrationId)}
  `;
}

async function retireBibForModeChange(registrationId, nextMode) {
  if (!['virtual', 'onsite'].includes(String(nextMode || ''))) {
    throw new Error('Participation mode must be virtual or onsite.');
  }
  return voidBibForRegistration(registrationId, `Participation mode changing to ${nextMode}`);
}

module.exports = {
  getBibAssignment,
  getBibAssignmentsForRegistrations,
  issueVirtualBib,
  resolveBibForRegistration,
  voidBibForRegistration,
  retireBibForModeChange,
  updateAssignmentOwner
};
