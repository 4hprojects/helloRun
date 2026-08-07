// src/services/onsite-operations.service.js
// Service for managing onsite event operations: bibs, race kits, check-ins, result imports

const crypto = require('node:crypto');
const { getPostgresClient } = require('../db/postgres');
const { evaluateOnsiteResultAchievements } = require('./achievement.service');
const logger = require('../utils/logger');

/**
 * Assign a bib number to a registration
 * @param {string} eventId - MongoDB event ID
 * @param {string} registrationId - MongoDB registration ID
 * @param {string} bibNumber - Bib number to assign
 * @param {Object} options - Assignment options
 * @returns {Promise<Object>} Assigned bib record
 */
async function assignBib(eventId, registrationId, bibNumber, options = {}) {
  const sql = getPostgresClient();

  try {
    // Verify event and registration exist
    const eventRows = await sql`
      SELECT id FROM events_core WHERE mongo_event_id = ${eventId} LIMIT 1
    `;
    if (eventRows.length === 0) throw new Error(`Event not found for ID: ${eventId}`);
    const eventCoreId = eventRows[0].id;

    const regRows = await sql`
      SELECT id, app_user_id FROM registrations WHERE mongo_registration_id = ${registrationId} LIMIT 1
    `;
    if (regRows.length === 0) throw new Error(`Registration not found for ID: ${registrationId}`);
    const registrationCoreId = regRows[0].id;
    const runnerUserId = regRows[0].app_user_id;

    // Check for duplicate bib in this event
    const dupRows = await sql`
      SELECT id FROM bib_assignments 
      WHERE event_core_id = ${eventCoreId} AND bib_number = ${bibNumber} AND assignment_status != 'voided'
      LIMIT 1
    `;
    if (dupRows.length > 0) {
      throw new Error(`Bib number ${bibNumber} already assigned for this event`);
    }

    // Insert or reassign. The conflict target is the partial unique index added in
    // migration 023; a voided bib is excluded, so voiding then reassigning works.
    const result = await sql`
      INSERT INTO bib_assignments (
        event_core_id, registration_id, runner_user_id, bib_number, category,
        assignment_status, assigned_at
      ) VALUES (
        ${eventCoreId}, ${registrationCoreId}, ${runnerUserId}, ${bibNumber}, ${options.category || null},
        'assigned', CURRENT_TIMESTAMP
      )
      ON CONFLICT (event_core_id, registration_id) WHERE assignment_status <> 'voided'
      DO UPDATE SET
        bib_number = EXCLUDED.bib_number,
        category = COALESCE(EXCLUDED.category, bib_assignments.category),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    if (result.length === 0) throw new Error('Failed to assign bib');

    logger.debug(`[Onsite] Bib ${bibNumber} assigned to registration ${registrationId} for event ${eventId}`);
    return result[0];
  } catch (error) {
    logger.error(`[Onsite] Error assigning bib: ${error.message}`);
    throw error;
  }
}

/**
 * Assign bibs to several registrations in one operation.
 * Each row is attempted independently so one bad row cannot discard the rest; the
 * caller gets a per-row outcome to show a result summary.
 *
 * @param {string} eventId - MongoDB event ID
 * @param {Array<{registrationId: string, bibNumber: string, category?: string}>} assignments
 * @returns {Promise<{assigned: Array, failed: Array}>}
 */
async function assignBibsInBulk(eventId, assignments) {
  const assigned = [];
  const failed = [];

  for (const assignment of assignments) {
    const registrationId = String(assignment?.registrationId || '').trim();
    const bibNumber = String(assignment?.bibNumber || '').trim();

    if (!registrationId || !bibNumber) {
      failed.push({ registrationId, bibNumber, error: 'registrationId and bibNumber required' });
      continue;
    }

    try {
      const record = await assignBib(eventId, registrationId, bibNumber, {
        category: assignment.category
      });
      assigned.push({ registrationId, bibNumber: record.bib_number });
    } catch (error) {
      failed.push({ registrationId, bibNumber, error: error.message });
    }
  }

  return { assigned, failed };
}

/**
 * Mark a participant's race kit as released.
 * The Phase 7 schema has no per-participant kit record, so pickup is tracked on the
 * bib assignment. A bib must exist first.
 *
 * @param {string} eventId - MongoDB event ID
 * @param {string} registrationId - MongoDB registration ID
 * @returns {Promise<Object>} Updated bib assignment
 */
async function markRaceKitReleased(eventId, registrationId) {
  const sql = getPostgresClient();

  try {
    const result = await sql`
      UPDATE bib_assignments ba
      SET assignment_status = 'picked_up',
          picked_up_at = COALESCE(ba.picked_up_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
      FROM registrations r, events_core e
      WHERE ba.registration_id = r.id
        AND ba.event_core_id = e.id
        AND r.mongo_registration_id = ${String(registrationId)}
        AND e.mongo_event_id = ${String(eventId)}
        AND ba.assignment_status <> 'voided'
      RETURNING ba.*
    `;

    if (result.length === 0) {
      throw new Error('No live bib assignment found for this registration. Assign a bib first.');
    }

    logger.debug(`[Onsite] Race kit released for registration ${registrationId} at event ${eventId}`);
    return result[0];
  } catch (error) {
    logger.error(`[Onsite] Error releasing race kit: ${error.message}`);
    throw error;
  }
}

/**
 * Record a check-in for a runner
 * @param {string} eventId - MongoDB event ID
 * @param {string} registrationId - MongoDB registration ID
 * @param {Object} options - Check-in options
 * @returns {Promise<Object>} Check-in record
 */
async function recordCheckIn(eventId, registrationId, options = {}) {
  const sql = getPostgresClient();

  try {
    // Verify event and registration exist
    const eventRows = await sql`
      SELECT id FROM events_core WHERE mongo_event_id = ${eventId} LIMIT 1
    `;
    if (eventRows.length === 0) throw new Error(`Event not found for ID: ${eventId}`);
    const eventCoreId = eventRows[0].id;

    const regRows = await sql`
      SELECT id, app_user_id FROM registrations WHERE mongo_registration_id = ${registrationId} LIMIT 1
    `;
    if (regRows.length === 0) throw new Error(`Registration not found for ID: ${registrationId}`);
    const registrationCoreId = regRows[0].id;
    const runnerUserId = regRows[0].app_user_id;

    // Find bib assignment if it exists
    const bibRows = await sql`
      SELECT id FROM bib_assignments 
      WHERE event_core_id = ${eventCoreId} AND registration_id = ${registrationCoreId}
      LIMIT 1
    `;
    const bibAssignmentId = bibRows.length > 0 ? bibRows[0].id : null;

    // Upsert against the unique index added in migration 023, so a repeated scan
    // updates the existing row instead of creating a second check-in. The original
    // checked_in_at is preserved — the first scan is the meaningful arrival time.
    // xmax is non-zero only when this statement updated an existing row, which is how
    // we distinguish a repeat scan from a first one without a separate racy read.
    const result = await sql`
      INSERT INTO check_ins (
        event_core_id, registration_id, runner_user_id, bib_assignment_id,
        participation_mode, check_in_status, checked_in_at, verification_method, notes
      ) VALUES (
        ${eventCoreId}, ${registrationCoreId}, ${runnerUserId}, ${bibAssignmentId},
        ${options.participationMode || 'onsite'}, 'checked_in', CURRENT_TIMESTAMP,
        ${options.verificationMethod || 'manual'}, ${options.notes || null}
      )
      ON CONFLICT (event_core_id, registration_id) DO UPDATE SET
        check_in_status = 'checked_in',
        checked_in_at = COALESCE(check_ins.checked_in_at, EXCLUDED.checked_in_at),
        bib_assignment_id = COALESCE(EXCLUDED.bib_assignment_id, check_ins.bib_assignment_id),
        verification_method = EXCLUDED.verification_method,
        notes = COALESCE(EXCLUDED.notes, check_ins.notes),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *, (xmax <> 0) AS was_already_checked_in
    `;

    if (result.length === 0) throw new Error('Failed to record check-in');

    logger.debug(`[Onsite] Check-in recorded for registration ${registrationId} at event ${eventId}`);
    return result[0];
  } catch (error) {
    logger.error(`[Onsite] Error recording check-in: ${error.message}`);
    throw error;
  }
}

/**
 * Create a race kit for an event
 * @param {string} eventId - MongoDB event ID
 * @param {Object} kitData - Kit data
 * @returns {Promise<Object>} Created race kit
 */
async function createRaceKit(eventId, kitData) {
  const sql = getPostgresClient();
  if (!String(kitData?.name || '').trim()) {
    throw new Error('Race kit name is required');
  }

  try {
    const eventRows = await sql`
      SELECT id FROM events_core WHERE mongo_event_id = ${eventId} LIMIT 1
    `;
    if (eventRows.length === 0) throw new Error(`Event not found for ID: ${eventId}`);
    const eventCoreId = eventRows[0].id;

    const result = await sql`
      INSERT INTO race_kits (
        mongo_race_kit_id, event_core_id, kit_name, kit_description, included_items,
        quantity_available, cost_per_kit, notes
      ) VALUES (
        ${kitData.mongoRaceKitId || crypto.randomUUID()}, ${eventCoreId}, ${kitData.name}, ${kitData.description || null},
        ${sql.json(Array.isArray(kitData.includedItems) ? kitData.includedItems : [])},
        ${kitData.quantity || 0}, ${kitData.cost || null}, ${kitData.notes || null}
      )
      RETURNING *
    `;

    if (result.length === 0) throw new Error('Failed to create race kit');

    logger.debug(`[Onsite] Race kit "${kitData.name}" created for event ${eventId}`);
    return result[0];
  } catch (error) {
    logger.error(`[Onsite] Error creating race kit: ${error.message}`);
    throw error;
  }
}

/**
 * Log a result import file
 * @param {string} eventId - MongoDB event ID
 * @param {string} userId - MongoDB user ID (importer)
 * @param {Object} importData - Import file metadata
 * @returns {Promise<Object>} Created import record
 */
async function logResultImport(eventId, userId, importData) {
  const sql = getPostgresClient();

  try {
    const eventRows = await sql`
      SELECT id FROM events_core WHERE mongo_event_id = ${eventId} LIMIT 1
    `;
    if (eventRows.length === 0) throw new Error(`Event not found for ID: ${eventId}`);
    const eventCoreId = eventRows[0].id;

    const userRows = await sql`
      SELECT id FROM app_users WHERE mongo_user_id = ${userId} LIMIT 1
    `;
    if (userRows.length === 0) throw new Error(`User not found for ID: ${userId}`);
    const appUserId = userRows[0].id;

    const result = await sql`
      INSERT INTO result_imports (
        event_core_id, import_source, file_name, file_key, file_mime_type,
        file_size_bytes, import_status, imported_by, notes
      ) VALUES (
        ${eventCoreId}, ${importData.source || 'csv_upload'}, ${importData.fileName || null},
        ${importData.fileKey || null}, ${importData.mimeType || null},
        ${importData.fileSize || null}, 'pending', ${appUserId}, ${importData.notes || null}
      )
      RETURNING *
    `;

    if (result.length === 0) throw new Error('Failed to log result import');

    logger.debug(`[Onsite] Result import logged for event ${eventId}, file: ${importData.fileName}`);
    return result[0];
  } catch (error) {
    logger.error(`[Onsite] Error logging result import: ${error.message}`);
    throw error;
  }
}

/**
 * Record an onsite result
 * @param {string} eventId - MongoDB event ID
 * @param {string} registrationId - MongoDB registration ID
 * @param {Object} resultData - Result data
 * @returns {Promise<Object>} Created onsite result
 */
async function recordOnsiteResult(eventId, registrationId, resultData) {
  const sql = getPostgresClient();
  const resultStatus = normalizeOnsiteResultStatus(resultData.resultStatus, 'submitted');

  try {
    const eventRows = await sql`
      SELECT id FROM events_core WHERE mongo_event_id = ${eventId} LIMIT 1
    `;
    if (eventRows.length === 0) throw new Error(`Event not found for ID: ${eventId}`);
    const eventCoreId = eventRows[0].id;

    const regRows = await sql`
      SELECT id, app_user_id FROM registrations WHERE mongo_registration_id = ${registrationId} LIMIT 1
    `;
    if (regRows.length === 0) throw new Error(`Registration not found for ID: ${registrationId}`);
    const registrationCoreId = regRows[0].id;
    const runnerUserId = regRows[0].app_user_id;

    // Find bib assignment
    const bibRows = await sql`
      SELECT id FROM bib_assignments 
      WHERE event_core_id = ${eventCoreId} AND registration_id = ${registrationCoreId}
      LIMIT 1
    `;
    const bibAssignmentId = bibRows.length > 0 ? bibRows[0].id : null;

    const result = await sql`
      INSERT INTO onsite_results (
        event_core_id, registration_id, runner_user_id, bib_assignment_id,
        race_category, race_distance_km, elapsed_ms, elapsed_time_display,
        pace_per_km, place_in_category, result_status, data_source, notes
      ) VALUES (
        ${eventCoreId}, ${registrationCoreId}, ${runnerUserId}, ${bibAssignmentId},
        ${resultData.category || null}, ${resultData.distanceKm || null},
        ${resultData.elapsedMs || null}, ${resultData.displayTime || null},
        ${resultData.pacePerKm || null}, ${resultData.placeInCategory || null},
        ${resultStatus}, ${resultData.dataSource || 'manual_entry'}, ${resultData.notes || null}
      )
      RETURNING *
    `;

    if (result.length === 0) throw new Error('Failed to record onsite result');

    if (resultStatus === 'approved') {
      await evaluateOnsiteResultAchievements(result[0].id, {
        performedBy: resultData.performedBy || null,
        sql
      });
      // Recording straight to approved (the timing-system webhook does this) must reach
      // rankings and certificates the same way an explicit approval does.
      const submissionOutcome = await materialiseResultAsSubmission(result[0], {
        sql,
        eventId,
        performedBy: resultData.performedBy || null
      });
      Object.assign(result[0], submissionOutcome);
    }

    logger.debug(`[Onsite] Result recorded for registration ${registrationId} at event ${eventId}`);
    return result[0];
  } catch (error) {
    logger.error(`[Onsite] Error recording onsite result: ${error.message}`);
    throw error;
  }
}

/**
 * Turn an approved onsite result into an approved Submission so it reaches rankings,
 * the leaderboard and certificates.
 *
 * The approval itself is already committed in Postgres by the time this runs, so a
 * failure here must not throw — but it must not be silent either, or staff would think
 * a finisher is ranked when they are not. The reason is returned for display.
 */
async function materialiseResultAsSubmission(resultRow, { sql, eventId, performedBy }) {
  try {
    const rows = await sql`
      SELECT r.mongo_registration_id
      FROM registrations r
      WHERE r.id = ${resultRow.registration_id}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return { submissionCreated: false, submissionError: 'Registration record not found.' };
    }

    const { materialiseApprovedOnsiteResult } = require('./onsite-result-submission.service');
    const submission = await materialiseApprovedOnsiteResult({
      mongoEventId: eventId,
      mongoRegistrationId: rows[0].mongo_registration_id,
      elapsedMs: resultRow.elapsed_ms,
      distanceKm: resultRow.race_distance_km,
      performedBy
    });

    return { submissionCreated: true, submissionId: String(submission._id) };
  } catch (error) {
    logger.error(`[Onsite] Could not materialise result ${resultRow?.id} as a submission: ${error.message}`);
    return { submissionCreated: false, submissionError: error.message };
  }
}

async function approveOnsiteResult(eventId, onsiteResultId, options = {}) {
  const sql = getPostgresClient();

  try {
    const result = await sql`
      UPDATE onsite_results
      SET
        result_status = 'approved',
        entered_by = COALESCE(entered_by, ${options.performedByAppUserId || null}),
        notes = COALESCE(${options.notes || null}, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${String(onsiteResultId)}
        AND event_core_id = (
          SELECT id FROM events_core WHERE mongo_event_id = ${String(eventId)} LIMIT 1
        )
        AND result_status != 'disqualified'
      RETURNING *
    `;
    if (result.length === 0) throw new Error('Onsite result not found or cannot be approved');

    const awards = await evaluateOnsiteResultAchievements(result[0].id, {
      performedBy: options.performedBy || null,
      sql
    });

    const submissionOutcome = await materialiseResultAsSubmission(result[0], {
      sql,
      eventId,
      performedBy: options.performedBy || null
    });

    return {
      result: result[0],
      awards,
      ...submissionOutcome
    };
  } catch (error) {
    logger.error(`[Onsite] Error approving onsite result: ${error.message}`);
    throw error;
  }
}

/**
 * Get check-in summary for an event
 * @param {string} eventId - MongoDB event ID
 * @returns {Promise<Object>} Check-in statistics
 */
async function getEventCheckInSummary(eventId) {
  const sql = getPostgresClient();

  try {
    const result = await sql`
      SELECT * FROM v_event_checkin_summary 
      WHERE event_id = (SELECT id FROM events_core WHERE mongo_event_id = ${eventId} LIMIT 1)
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    logger.error(`[Onsite] Error getting check-in summary: ${error.message}`);
    throw error;
  }
}

/**
 * Get bib assignment status for an event
 * @param {string} eventId - MongoDB event ID
 * @returns {Promise<Object>} Bib assignment statistics
 */
async function getEventBibAssignmentStatus(eventId) {
  const sql = getPostgresClient();

  try {
    const result = await sql`
      SELECT * FROM v_bib_assignment_status 
      WHERE event_id = (SELECT id FROM events_core WHERE mongo_event_id = ${eventId} LIMIT 1)
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    logger.error(`[Onsite] Error getting bib assignment status: ${error.message}`);
    throw error;
  }
}

module.exports = {
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
};

function normalizeOnsiteResultStatus(value, fallback = 'submitted') {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'submitted' || safe === 'approved' || safe === 'disqualified') return safe;
  return fallback;
}
