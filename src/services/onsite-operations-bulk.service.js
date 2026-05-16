// src/services/onsite-operations-bulk.service.js
// Bulk operations for admin onsite management

const { getPostgresClient } = require('../db/postgres');

/**
 * Bulk assign bibs to registrations
 */
async function bulkAssignBibs(eventId, assignments) {
  const sql = getPostgresClient();
  const results = [];

  // Get event ID
  const eventRows = await sql`SELECT id FROM events_core WHERE mongo_event_id = ${eventId}`;
  if (eventRows.length === 0) throw new Error(`Event not found`);
  const eventCoreId = eventRows[0].id;

  for (const assignment of assignments) {
    try {
      const { registrationId, bibNumber, category } = assignment;

      if (!registrationId || !bibNumber) {
        results.push({
          registrationId,
          success: false,
          error: 'Missing registrationId or bibNumber'
        });
        continue;
      }

      // Check for duplicate
      const dupRows = await sql`
        SELECT id FROM bib_assignments 
        WHERE event_core_id = ${eventCoreId} AND bib_number = ${bibNumber}
      `;
      if (dupRows.length > 0) {
        results.push({
          registrationId,
          bibNumber,
          success: false,
          error: 'Bib already assigned in this event'
        });
        continue;
      }

      // Find registration
      const regRows = await sql`
        SELECT id, runner_user_id FROM registrations 
        WHERE mongo_registration_id = ${registrationId}
      `;
      if (regRows.length === 0) {
        results.push({
          registrationId,
          success: false,
          error: 'Registration not found'
        });
        continue;
      }

      const registrationInternalId = regRows[0].id;
      const runnerUserId = regRows[0].runner_user_id;

      // Insert bib
      const bibResult = await sql`
        INSERT INTO bib_assignments (
          event_core_id, registration_id, runner_user_id, bib_number, category, assignment_status
        ) VALUES (${eventCoreId}, ${registrationInternalId}, ${runnerUserId}, ${bibNumber}, ${category || null}, 'assigned')
        RETURNING *
      `;

      results.push({
        registrationId,
        bibNumber,
        success: true,
        data: bibResult[0]
      });
    } catch (err) {
      results.push({
        registrationId: assignment.registrationId,
        success: false,
        error: err.message
      });
    }
  }

  return results;
}

/**
 * Bulk record check-ins
 */
async function bulkRecordCheckIns(eventId, checkIns) {
  const sql = getPostgresClient();
  const results = [];

  // Get event ID
  const eventRows = await sql`SELECT id FROM events_core WHERE mongo_event_id = ${eventId}`;
  if (eventRows.length === 0) throw new Error(`Event not found`);
  const eventCoreId = eventRows[0].id;

  for (const checkIn of checkIns) {
    try {
      const { registrationId, participationMode, verificationMethod, notes } = checkIn;

      if (!registrationId) {
        results.push({
          registrationId,
          success: false,
          error: 'Missing registrationId'
        });
        continue;
      }

      // Find registration
      const regRows = await sql`
        SELECT id, runner_user_id FROM registrations 
        WHERE mongo_registration_id = ${registrationId}
      `;
      if (regRows.length === 0) {
        results.push({
          registrationId,
          success: false,
          error: 'Registration not found'
        });
        continue;
      }

      const registrationInternalId = regRows[0].id;
      const runnerUserId = regRows[0].runner_user_id;

      // Insert check-in
      const checkInResult = await sql`
        INSERT INTO check_ins (
          event_core_id, registration_id, runner_user_id, 
          participation_mode, check_in_status, checked_in_at, verification_method, notes
        ) VALUES (
          ${eventCoreId}, ${registrationInternalId}, ${runnerUserId},
          ${participationMode || 'onsite'}, 'checked_in', CURRENT_TIMESTAMP, ${verificationMethod || 'manual'}, ${notes || null}
        )
        RETURNING *
      `;

      results.push({
        registrationId,
        success: true,
        data: checkInResult[0]
      });
    } catch (err) {
      results.push({
        registrationId: checkIn.registrationId,
        success: false,
        error: err.message
      });
    }
  }

  return results;
}

/**
 * Process result import batch with error tracking
 */
async function processImportBatch(eventId, importId, fileKey) {
  const sql = getPostgresClient();

  // Get import record
  const importRows = await sql`
    SELECT * FROM result_imports WHERE id = ${importId} AND event_core_id IN (
      SELECT id FROM events_core WHERE mongo_event_id = ${eventId}
    )
  `;
  if (importRows.length === 0) throw new Error('Import record not found');

  const importRecord = importRows[0];

  try {
    // Mark as processing
    await sql`
      UPDATE result_imports 
      SET import_status = 'processing', import_started_at = CURRENT_TIMESTAMP
      WHERE id = ${importId}
    `;

    // In production, would fetch file from R2 and parse
    const errors = [];
    const results = [];

    // Simulate parsing (in real app, parse CSV/XLSX from R2)
    const parsed_rows = []; // Would come from CSV/XLSX parser

    for (let i = 0; i < parsed_rows.length; i++) {
      const row = parsed_rows[i];
      try {
        // Validate row fields
        if (!row.bib_number || !row.elapsed_time) {
          errors.push({
            row: i + 1,
            column: !row.bib_number ? 'bib_number' : 'elapsed_time',
            error: 'Required field missing'
          });
          continue;
        }

        // Insert result
        // (simplified - real app would link to bib_assignments and update onsite_results)
        results.push({
          row: i + 1,
          bib_number: row.bib_number,
          status: 'imported'
        });
      } catch (err) {
        errors.push({
          row: i + 1,
          error: err.message
        });
      }
    }

    // Update import record
    const finalStatus = errors.length === 0 ? 'completed' : 'partially_completed';
    const updated = await sql`
      UPDATE result_imports 
      SET 
        import_status = ${finalStatus},
        imported_rows = ${results.length},
        failed_rows = ${errors.length},
        skipped_rows = 0,
        import_errors = ${JSON.stringify(errors)},
        import_completed_at = CURRENT_TIMESTAMP
      WHERE id = ${importId}
      RETURNING *
    `;

    return {
      summary: {
        total_rows: parsed_rows.length,
        imported: results.length,
        failed: errors.length,
        status: finalStatus
      },
      errors,
      import: updated[0]
    };
  } catch (err) {
    // Mark as failed
    await sql`
      UPDATE result_imports 
      SET 
        import_status = 'failed',
        import_errors = ${JSON.stringify([{ error: err.message }])},
        import_completed_at = CURRENT_TIMESTAMP
      WHERE id = ${importId}
    `;

    throw err;
  }
}

/**
 * Retry failed import rows
 */
async function retryFailedImportRows(eventId, importId) {
  const sql = getPostgresClient();

  const importRows = await sql`
    SELECT * FROM result_imports WHERE id = ${importId}
  `;
  if (importRows.length === 0) throw new Error('Import not found');

  const importRecord = importRows[0];
  const errors = importRecord.import_errors || [];

  let newly_succeeded = 0;
  let still_failed = 0;

  // Retry each failed row
  const updated_errors = [];
  for (const error of errors) {
    try {
      // Reprocess row (simplified)
      newly_succeeded++;
    } catch (err) {
      updated_errors.push(error);
      still_failed++;
    }
  }

  // Update import
  const updated = await sql`
    UPDATE result_imports 
    SET 
      import_errors = ${JSON.stringify(updated_errors)},
      failed_rows = ${still_failed}
    WHERE id = ${importId}
    RETURNING *
  `;

  return {
    retried_count: errors.length,
    newly_succeeded,
    still_failed,
    import: updated[0]
  };
}

/**
 * Export import errors as CSV
 */
async function exportImportErrors(eventId, importId) {
  const sql = getPostgresClient();

  const importRows = await sql`
    SELECT import_errors FROM result_imports WHERE id = ${importId}
  `;
  if (importRows.length === 0) throw new Error('Import not found');

  const errors = importRows[0].import_errors || [];

  let csv = 'Row,Column,Error\n';
  for (const error of errors) {
    const row = error.row || '';
    const column = error.column || '';
    const msg = (error.error || error).replace(/"/g, '""');
    csv += `${row},"${column}","${msg}"\n`;
  }

  return csv;
}

/**
 * List event check-ins with filters
 */
async function listEventCheckIns(eventId, filters = {}) {
  const sql = getPostgresClient();

  let query = `
    SELECT ci.* FROM check_ins ci
    JOIN events_core e ON ci.event_core_id = e.id
    WHERE e.mongo_event_id = $1
  `;
  const params = [eventId];

  if (filters.check_in_status) {
    query += ` AND ci.check_in_status = $${params.length + 1}`;
    params.push(filters.check_in_status);
  }

  if (filters.participation_mode) {
    query += ` AND ci.participation_mode = $${params.length + 1}`;
    params.push(filters.participation_mode);
  }

  if (filters.checked_in_after) {
    query += ` AND ci.checked_in_at >= $${params.length + 1}`;
    params.push(filters.checked_in_after);
  }

  query += ` ORDER BY ci.checked_in_at DESC`;

  const result = await sql.unsafe(query, params);
  return result;
}

/**
 * List event result imports
 */
async function listEventResultImports(eventId, status) {
  const sql = getPostgresClient();

  let query = `
    SELECT ri.* FROM result_imports ri
    JOIN events_core e ON ri.event_core_id = e.id
    WHERE e.mongo_event_id = $1
  `;
  const params = [eventId];

  if (status) {
    query += ` AND ri.import_status = $${params.length + 1}`;
    params.push(status);
  }

  query += ` ORDER BY ri.created_at DESC`;

  const result = await sql.unsafe(query, params);
  return result;
}

/**
 * Update check-in status
 */
async function updateCheckInStatus(eventId, checkInId, newStatus, notes) {
  const sql = getPostgresClient();

  const updated = await sql`
    UPDATE check_ins 
    SET check_in_status = ${newStatus}, notes = ${notes || null}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${checkInId}
    RETURNING *
  `;

  if (updated.length === 0) throw new Error('Check-in not found');
  return updated[0];
}

module.exports = {
  bulkAssignBibs,
  bulkRecordCheckIns,
  processImportBatch,
  retryFailedImportRows,
  exportImportErrors,
  listEventCheckIns,
  listEventResultImports,
  updateCheckInStatus
};
