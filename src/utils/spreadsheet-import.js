// src/utils/spreadsheet-import.js
// Reading an organiser's spreadsheet into plain rows.
//
// Shared by the results import and the registrant import. Both face the same problem:
// organisers export from timing software, registration desks and spreadsheets that agree
// on almost nothing, so header matching has to be lenient and unknown columns have to be
// ignored rather than rejected.
//
// exceljs reads both .xlsx and .csv, so no parser dependency was added for either.

const ExcelJS = require('exceljs');

function normaliseHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

/**
 * Map a sheet's header row onto the fields a caller understands.
 *
 * @param {string[]} headerCells
 * @param {Object} aliases - field name -> accepted spellings
 */
function mapHeaderRow(headerCells, aliases) {
  const mapping = {};
  headerCells.forEach((cell, index) => {
    const header = normaliseHeader(cell);
    if (!header) return;
    for (const [field, spellings] of Object.entries(aliases)) {
      if (spellings.some((alias) => normaliseHeader(alias) === header)) {
        // First match wins, so a duplicate header cannot silently override the first.
        if (mapping[field] === undefined) mapping[field] = index;
      }
    }
  });
  return mapping;
}

/**
 * Read one cell as text.
 *
 * exceljs hands back objects for formulas and hyperlinks, and a Date for a time-only
 * cell, which has to be rendered back to HH:MM:SS rather than an ISO timestamp.
 */
function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.text) return String(value.text).trim();
    if (value.result !== undefined) return String(value.result).trim();
    if (value instanceof Date) {
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
 * Read an uploaded sheet into rows keyed by field name.
 *
 * @param {Buffer} buffer
 * @param {string} filename - decides which reader to use
 * @param {Object} options
 * @param {Object} options.aliases - field name -> accepted spellings
 * @param {string[]} options.required - fields the file must carry a column for
 * @param {string} options.missingMessage - what to say when a required column is absent
 * @param {number} options.maxRows
 * @returns {Promise<{rows: Array, mapping: Object, unmappedHeaders: string[], truncated: boolean}>}
 */
async function readSheetRows(buffer, filename, { aliases, required = [], missingMessage, maxRows = 2000 }) {
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

  const mapping = mapHeaderRow(headerCells, aliases);
  const missing = required.filter((field) => mapping[field] === undefined);
  if (missing.length > 0) {
    throw new Error(missingMessage || `The file is missing a column for: ${missing.join(', ')}.`);
  }

  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount && rows.length < maxRows; rowNumber += 1) {
    const sheetRow = sheet.getRow(rowNumber);
    const row = {};
    for (const field of Object.keys(aliases)) {
      const value =
        mapping[field] === undefined ? '' : cellToString(sheetRow.getCell(mapping[field] + 1).value);

      // An optional field left blank is absent, not empty. Validators distinguish the
      // two: an empty string reads as "a value was given" and gets format-checked, so
      // a blank distance column would be rejected as not a positive number.
      if (!value && !required.includes(field)) continue;
      row[field] = value;
    }

    // Skip blank spacer rows rather than reporting each as an error.
    if (Object.values(row).every((value) => !value)) continue;
    rows.push(row);
  }

  const knownIndexes = new Set(Object.values(mapping));
  const unmappedHeaders = headerCells.filter((header, index) => header && !knownIndexes.has(index));

  return {
    rows,
    mapping,
    unmappedHeaders,
    truncated: sheet.rowCount - 1 > maxRows
  };
}

module.exports = {
  readSheetRows,
  mapHeaderRow,
  cellToString,
  normaliseHeader
};
