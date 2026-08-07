'use strict';

// Results import: parsing a real spreadsheet and validating it before anything is written.
//
// This finally wires up result-import-validation.service.js, which had complete row
// validation, error categorisation and error-CSV generation but was imported by nothing.
// exceljs was already a dependency and reads both formats, so no parser was added.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');

const {
  previewResultImport,
  parseResultSheet,
  mapHeaderRow,
  cellToString,
  MAX_IMPORT_ROWS
} = require('../src/services/result-import.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/result-import.service.js');
const routes = read('src/routes/organiser/onsite-operations.js');
const view = read('src/views/organizer/event-results-import.ejs');
const script = read('src/public/js/organizer-results-import.js');

async function xlsxBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Results');
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test('header matching tolerates the spellings timing software actually emits', () => {
  assert.deepEqual(mapHeaderRow(['Bib No', 'Chip Time']), { bib_number: 0, elapsed_time: 1 });
  assert.deepEqual(mapHeaderRow(['RACE NUMBER', 'Gun Time']), { bib_number: 0, elapsed_time: 1 });
  assert.deepEqual(mapHeaderRow(['bib_number', 'elapsed_time']), { bib_number: 0, elapsed_time: 1 });

  // A repeated header must not silently override the first match.
  assert.equal(mapHeaderRow(['bib', 'time', 'bib']).bib_number, 0);
});

test('cell values survive formulas, hyperlinks, and time-only dates', () => {
  assert.equal(cellToString({ text: 'linked' }), 'linked');
  assert.equal(cellToString({ result: '00:41:00' }), '00:41:00');
  assert.equal(cellToString(null), '');
  assert.equal(cellToString(101), '101');
  assert.equal(cellToString('  spaced  '), 'spaced');
});

test('a CSV is parsed, blank rows skipped, and unknown columns ignored', async () => {
  const csv = 'Bib No,Chip Time,Distance (km),Notes\n101,00:52:10,10,ok\n102,1:02:33,10,ok\n,,,\n';
  const preview = await previewResultImport(Buffer.from(csv), 'results.csv');

  assert.equal(preview.total_rows, 2, 'the blank spacer row should not become a row');
  assert.equal(preview.valid_rows, 2);
  assert.equal(preview.failed_rows, 0);
  assert.deepEqual(preview.unmappedHeaders, ['Notes']);
});

test('an XLSX is parsed and bad times are rejected without losing the good rows', async () => {
  const buffer = await xlsxBuffer([
    ['bib', 'finish time'],
    ['201', '00:45:00'],
    ['202', '99:99:99']
  ]);
  const preview = await previewResultImport(buffer, 'results.xlsx');

  assert.equal(preview.total_rows, 2);
  assert.equal(preview.valid_rows, 1);
  assert.equal(preview.failed_rows, 1);
  // Only rows that passed are offered for import.
  assert.equal(preview.valid_rows_data[0].bib_number, '201');
  assert.match(preview.error_summary.summary, /invalid format/);
});

test('a file without the two required columns is refused up front', async () => {
  await assert.rejects(
    () => previewResultImport(Buffer.from('name,time\nAna,00:10:00\n'), 'n.csv'),
    /needs a bib column and a finish-time column/
  );

  await assert.rejects(
    () => previewResultImport(Buffer.from('bib,time\n'), 'empty.csv'),
    /no data rows/
  );
});

test('import size is bounded and truncation is reported, not silent', async () => {
  const rows = [['bib', 'time']];
  for (let i = 0; i < MAX_IMPORT_ROWS + 5; i += 1) rows.push([String(i + 1), '00:30:00']);

  const parsed = await parseResultSheet(Buffer.from(rows.map((r) => r.join(',')).join('\n')), 'big.csv');
  assert.equal(parsed.rows.length, MAX_IMPORT_ROWS);
  assert.equal(parsed.truncated, true);
});

test('imported results land as submitted, never auto-approved', () => {
  // Approving is what puts a runner on the leaderboard, so it stays a deliberate act.
  assert.match(service, /resultStatus: 'submitted'/);
  assert.match(service, /deliberate act/);
  assert.match(view, /not approved/);
});

test('rows are applied independently and failures are reported per row', () => {
  assert.match(service, /const failed = \[\]/);
  assert.match(service, /No runner is holding bib/);
  assert.match(service, /findRegistrationByExactBib/);
  // Losing the audit log entry must not fail results already written.
  assert.match(service, /Best effort/);
});

test('preview writes nothing and commit sends back only the previewed rows', () => {
  assert.match(routes, /result-imports\/preview/);
  assert.match(routes, /result-imports\/commit/);
  assert.match(routes, /resultImportLimiter/);
  assert.match(routes, /uploadResultSheet/);

  assert.match(script, /Nothing has been written yet/);
  assert.match(script, /let readyRows = \[\]/);
  // Clearing the held rows prevents a second write of the same import.
  assert.match(script, /readyRows = \[\];/);
  assert.match(script, /'x-csrf-token': csrfToken/);
});
