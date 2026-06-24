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

test('organizer submission review routes use the shared review action limiter', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/organizer.routes.js'), 'utf8');

  assert.match(source, /submissionReviewActionLimiter/);
  assert.match(source, /\/submissions\/bulk-approve'[\s\S]*submissionReviewActionLimiter/);
  assert.match(source, /\/events\/:id\/submissions\/:submissionId\/approve'[\s\S]*submissionReviewActionLimiter/);
  assert.match(source, /\/events\/:id\/submissions\/:submissionId\/reject'[\s\S]*submissionReviewActionLimiter/);
});

test('organizer shop report export routes use the shared export limiter', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/organizer-shop.routes.js'), 'utf8');

  assert.match(source, /shopReportExportLimiter/);
  assert.match(source, /\/events\/:eventId\/shop\/reports\/export\.csv'[\s\S]*shopReportExportLimiter/);
  assert.match(source, /\/events\/:eventId\/shop\/reports\/export\.xlsx'[\s\S]*shopReportExportLimiter/);
});
