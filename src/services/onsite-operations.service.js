// src/services/onsite-operations.service.js
// Service for managing onsite event operations: bibs, race kits, check-ins, result imports

const crypto = require('node:crypto');
const { getPostgresClient } = require('../db/postgres');
const { evaluateOnsiteResultAchievements } = require('./achievement.service');

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

    // Insert or update bib assignment
    const result = await sql`
      INSERT INTO bib_assignments (
        event_core_id, registration_id, runner_user_id, bib_number, category,
        assignment_status, assigned_at
      ) VALUES (
        ${eventCoreId}, ${registrationCoreId}, ${runnerUserId}, ${bibNumber}, ${options.category || null},
        'assigned', CURRENT_TIMESTAMP
      )
      ON CONFLICT (mongo_bib_assignment_id) DO UPDATE SET
        bib_number = EXCLUDED.bib_number,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    if (result.length === 0) throw new Error('Failed to assign bib');

    console.log(`[Onsite] Bib ${bibNumber} assigned to registration ${registrationId} for event ${eventId}`);
    return result[0];
  } catch (error) {
    console.error(`[Onsite] Error assigning bib: ${error.message}`);
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

    // Insert check-in
    const result = await sql`
      INSERT INTO check_ins (
        event_core_id, registration_id, runner_user_id, bib_assignment_id,
        participation_mode, check_in_status, checked_in_at, verification_method, notes
      ) VALUES (
        ${eventCoreId}, ${registrationCoreId}, ${runnerUserId}, ${bibAssignmentId},
        ${options.participationMode || 'onsite'}, 'checked_in', CURRENT_TIMESTAMP,
        ${options.verificationMethod || 'manual'}, ${options.notes || null}
      )
      RETURNING *
    `;

    if (result.length === 0) throw new Error('Failed to record check-in');

    console.log(`[Onsite] Check-in recorded for registration ${registrationId} at event ${eventId}`);
    return result[0];
  } catch (error) {
    console.error(`[Onsite] Error recording check-in: ${error.message}`);
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

    console.log(`[Onsite] Race kit "${kitData.name}" created for event ${eventId}`);
    return result[0];
  } catch (error) {
    console.error(`[Onsite] Error creating race kit: ${error.message}`);
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

    console.log(`[Onsite] Result import logged for event ${eventId}, file: ${importData.fileName}`);
    return result[0];
  } catch (error) {
    console.error(`[Onsite] Error logging result import: ${error.message}`);
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
    }

    console.log(`[Onsite] Result recorded for registration ${registrationId} at event ${eventId}`);
    return result[0];
  } catch (error) {
    console.error(`[Onsite] Error recording onsite result: ${error.message}`);
    throw error;
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

    return {
      result: result[0],
      awards
    };
  } catch (error) {
    console.error(`[Onsite] Error approving onsite result: ${error.message}`);
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
    console.error(`[Onsite] Error getting check-in summary: ${error.message}`);
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
    console.error(`[Onsite] Error getting bib assignment status: ${error.message}`);
    throw error;
  }
}

module.exports = {
  assignBib,
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
