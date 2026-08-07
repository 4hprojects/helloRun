// src/services/result-import.service.js
// Parse and apply a results spreadsheet for an onsite event.
//
// Most of this already existed and was unreachable: result-import-validation.service.js
// had full row validation, error categorisation and error-CSV generation but was imported
// by nothing, and webhooks/timing-system.js held the only row-processing logic, behind a
// signature-gated machine endpoint. This joins them to a file an organiser can upload.
//
// exceljs is already a dependency and reads both .xlsx and .csv, so no parser was added.

const ExcelJS = require('exceljs');
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

function normaliseHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

/**
 * Map a sheet's header row onto the fields we understand.
 * Unknown columns are ignored rather than rejected — timing exports carry plenty.
 */
function mapHeaderRow(headerCells) {
  const mapping = {};
  headerCells.forEach((cell, index) => {
    const header = normaliseHeader(cell);
    if (!header) return;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((alias) => normaliseHeader(alias) === header)) {
        // First match wins, so a duplicate header cannot silently override the first.
        if (mapping[field] === undefined) mapping[field] = index;
      }
    }
  });
  return mapping;
}

function cellToString(value) {
  if (value === null || value === undefined) return '';
  // exceljs returns rich objects for formulas and hyperlinks.
  if (typeof value === 'object') {
    if (value.text) return String(value.text).trim();
    if (value.result !== undefined) return String(value.result).trim();
    if (value instanceof Date) {
      // A time-only cell arrives as a Date; render it back to HH:MM:SS.
      const hours = String(value.getUTCHours()).padStart(2, '0');
      const minutes = String(value.getUTCMinutes()).padStart(2, '0');
      const seconds = String(value.getUTCSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    return '';
  }
  return String(value).trim();
}

/**
 * Read an uploaded results file into plain rows.
 *
 * @param {Buffer} buffer
 * @param {string} filename - decides which reader to use
 * @returns {Promise<{rows: Array, mapping: Object, unmappedHeaders: string[]}>}
 */
async function parseResultSheet(buffer, filename) {
  const workbook = new ExcelJS.Workbook();
  const isCsv = /\.csv$/i.test(String(filename || ''));

  if (isCsv) {
    const { Readable } = require('node:stream');
    await workbook.csv.read(Readable.from(buffer.toString('utf8')));
  } else {
    await workbook.xlsx.load(buffer);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    throw new Error('That file has no data rows.');
  }

  const headerCells = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headerCells[colNumber - 1] = cellToString(cell.value);
  });

  const mapping = mapHeaderRow(headerCells);
  if (mapping.bib_number === undefined || mapping.elapsed_time === undefined) {
    throw new Error('The file needs a bib column and a finish-time column.');
  }

  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount && rows.length < MAX_IMPORT_ROWS; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const read = (field) =>
      mapping[field] === undefined ? '' : cellToString(row.getCell(mapping[field] + 1).value);

    const bib = read('bib_number');
    const time = read('elapsed_time');
    // Skip blank spacer rows rather than reporting them as errors.
    if (!bib && !time) continue;

    rows.push({
      bib_number: bib,
      elapsed_time: time,
      distance_km: read('distance_km') || undefined,
      category: read('category') || undefined
    });
  }

  const knownIndexes = new Set(Object.values(mapping));
  const unmappedHeaders = headerCells.filter((header, index) => header && !knownIndexes.has(index));

  return {
    rows,
    mapping,
    unmappedHeaders,
    truncated: sheet.rowCount - 1 > MAX_IMPORT_ROWS
  };
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
  mapHeaderRow,
  cellToString,
  MAX_IMPORT_ROWS
};
