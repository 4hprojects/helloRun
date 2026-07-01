const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('admin export routes use the shared admin export limiter', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/admin.routes.js'), 'utf8');

  assert.match(source, /adminExportLimiter/);
  assert.match(source, /\/users\/export\.csv'[\s\S]*adminExportLimiter/);
  assert.match(source, /\/users\/export\.xlsx'[\s\S]*adminExportLimiter/);
  assert.match(source, /\/audit\/export\.csv'[\s\S]*adminExportLimiter/);
  assert.match(source, /\/audit\/export\.xlsx'[\s\S]*adminExportLimiter/);
  assert.match(source, /\/analytics\/export\.csv'[\s\S]*adminExportLimiter/);
  assert.match(source, /\/analytics\/export\.xlsx'[\s\S]*adminExportLimiter/);
});

test('admin export routes are registered before conflicting :id routes', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/admin.routes.js'), 'utf8');

  const usersExportIndex = source.indexOf("'/users/export.csv'");
  const usersIdIndex = source.indexOf("'/users/:id'");
  assert.ok(usersExportIndex > -1, 'users export route should exist');
  assert.ok(usersIdIndex > -1, 'users :id route should exist');
  assert.ok(usersExportIndex < usersIdIndex, 'users/export.csv must be registered before users/:id');
});

test('admin controller exports the six new export handlers', () => {
  const adminController = require('../src/controllers/admin.controller');
  const adminAuditController = require('../src/controllers/admin-audit.controller');

  ['exportUsersCsv', 'exportUsersXlsx', 'exportAnalyticsCsv', 'exportAnalyticsXlsx'].forEach((name) => {
    assert.equal(typeof adminController[name], 'function', `adminController.${name} should be a function`);
  });
  ['exportCriticalAuditCsv', 'exportCriticalAuditXlsx'].forEach((name) => {
    assert.equal(typeof adminAuditController[name], 'function', `adminAuditController.${name} should be a function`);
  });
});

test('critical audit query service exposes the export query function and new export action strings', () => {
  const {
    AUDIT_ACTION_GROUPS,
    listCriticalAuditEventsForExport
  } = require('../src/services/critical-audit-query.service');

  assert.equal(typeof listCriticalAuditEventsForExport, 'function');
  ['admin.users_exported', 'admin.audit_exported', 'admin.analytics_exported'].forEach((action) => {
    assert.ok(AUDIT_ACTION_GROUPS.exports.includes(action), `AUDIT_ACTION_GROUPS.exports should include ${action}`);
  });
});

test('tabular-export util produces escaped CSV content and xlsx buffers', async () => {
  const { csvEscape, buildCsvContent, buildXlsxBuffer, buildExportFilename } = require('../src/utils/tabular-export');

  assert.equal(csvEscape('he said "hi"'), '"he said ""hi"""');

  const csv = buildCsvContent(['A', 'B'], [['1', 'two'], [3, null]]);
  assert.match(csv, /"A","B"/);
  assert.match(csv, /"1","two"/);

  const buffer = await buildXlsxBuffer({ sheetName: 'Sheet', headers: ['A'], rows: [[1]] });
  assert.ok(Buffer.isBuffer(buffer) || buffer instanceof Uint8Array);
  assert.ok(buffer.length > 0);

  assert.match(buildExportFilename('users', 'csv'), /^users-\d{4}-\d{2}-\d{2}\.csv$/);
});
