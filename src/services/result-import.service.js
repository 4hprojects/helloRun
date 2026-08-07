// src/services/result-import.service.js
// Parse and apply a results spreadsheet for an onsite event.
//
// Most of this already existed and was unreachable: result-import-validation.service.js
// had full row validation, error categorisation and error-CSV generation but was imported
// by nothing, and webhooks/timing-system.js held the only row-processing logic, behind a
// signature-gated machine endpoint. This joins them to a file an organiser can upload.
//
// The sheet reading itself lives in utils/spreadsheet-import, shared with the registrant
// import: both have to cope with organisers exporting from tools that agree on nothing.

const { readSheetRows, mapHeaderRow, cellToString } = require('../utils/spreadsheet-import');
const { validateResultBatch, timeToMilliseconds } = require('./result-import-validation.service');
const { recordOnsiteResult, logResultImport } = require('./onsite-operations.service');
const { findRegistrationByExactBib } = require('./onsite-roster.service');
const logger = require('../utils/logger');

// Bounds one import so a stray file cannot tie up the process.
const MAX_IMPORT_ROWS = 2000;

// Accepted spellings for the two columns that matter. Organisers export from timing
// software with wildly different headers, so matching is lenient by design.
const COLUMN_ALIASES = {
  bib_number: ['bib', 'bib_number', 'bibno', 'bib no', 'bib number', 'race number', 'number'],
  elapsed_time: ['time', 'elapsed', 'elapsed_time', 'finish', 'finish time', 'chip time', 'gun time', 'nett time', 'net time'],
  distance_km: ['distance', 'distance_km', 'km', 'distance (km)'],
  category: ['category', 'race category', 'division']
};

/**
 * Read an uploaded results file into plain rows.
 *
 * @param {Buffer} buffer
 * @param {string} filename - decides which reader to use
 */
async function parseResultSheet(buffer, filename) {
  return readSheetRows(buffer, filename, {
    aliases: COLUMN_ALIASES,
    required: ['bib_number', 'elapsed_time'],
    missingMessage: 'The file needs a bib column and a finish-time column.',
    maxRows: MAX_IMPORT_ROWS
  });
}

/**
 * Parse and validate, without writing anything.
 * The organiser sees this before deciding to import.
 */
async function previewResultImport(buffer, filename) {
  const parsed = await parseResultSheet(buffer, filename);
  const validation = validateResultBatch(parsed.rows, ['bib_number', 'elapsed_time']);

  return {
    ...validation,
    unmappedHeaders: parsed.unmappedHeaders,
    truncated: parsed.truncated,
    maxRows: MAX_IMPORT_ROWS
  };
}

/**
 * Apply already-validated rows.
 *
 * Each row is attempted independently — one unknown bib must not discard a whole field's
 * worth of results — and the outcome per row is returned so the organiser can fix and
 * retry just the failures.
 */
async function applyResultRows(eventId, rows, { performedBy = null } = {}) {
  const imported = [];
  const failed = [];

  for (const row of (rows || []).slice(0, MAX_IMPORT_ROWS)) {
    const bib = String(row?.bib_number || '').trim();
    const time = String(row?.elapsed_time || '').trim();

    try {
      const match = await findRegistrationByExactBib(eventId, bib);
      if (!match) {
        failed.push({ bib_number: bib, error: `No runner is holding bib ${bib}.` });
        continue;
      }

      await recordOnsiteResult(eventId, match.registrationId, {
        displayTime: time,
        elapsedMs: timeToMilliseconds(time),
        distanceKm: row.distance_km ? Number.parseFloat(row.distance_km) : null,
        category: row.category || null,
        dataSource: 'csv_import',
        // Imported results land as submitted, not approved. Approving is a separate,
        // deliberate act that puts a runner on the leaderboard.
        resultStatus: 'submitted',
        performedBy
      });

      imported.push({ bib_number: bib, elapsed_time: time });
    } catch (error) {
      failed.push({ bib_number: bib, error: error.message });
    }
  }

  return { imported, failed };
}

/**
 * Record that an import happened, for the audit trail.
 * Best effort: losing the log entry must not fail results already written.
 */
async function recordImportLog(eventId, userId, { fileName, importedCount, failedCount }) {
  try {
    await logResultImport(eventId, userId, {
      source: 'csv_upload',
      fileName,
      notes: `${importedCount} imported, ${failedCount} failed.`
    });
  } catch (error) {
    logger.error(`[Onsite] Result import log failed for event ${eventId}: ${error.message}`);
  }
}

module.exports = {
  parseResultSheet,
  previewResultImport,
  applyResultRows,
  recordImportLog,
  // Re-exported: these moved to utils/spreadsheet-import when the registrant import
  // started needing the same reader.
  mapHeaderRow: (headerCells) => mapHeaderRow(headerCells, COLUMN_ALIASES),
  cellToString,
  MAX_IMPORT_ROWS
};
