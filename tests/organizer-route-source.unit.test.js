const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('organizer registrant export routes use the shared export limiter', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/organizer.routes.js'), 'utf8');

  assert.match(source, /registrantExportLimiter/);
  assert.match(source, /\/events\/:id\/registrants\/export'[\s\S]*registrantExportLimiter/);
  assert.match(source, /\/events\/:id\/registrants\/export-xlsx'[\s\S]*registrantExportLimiter/);
});
