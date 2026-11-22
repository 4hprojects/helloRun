const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('organizer registrant export routes use the shared export limiter', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/organiser/registrants.js'), 'utf8');

  assert.match(source, /registrantExportLimiter/);
  assert.match(source, /\/events\/:id\/registrants\/export'[\s\S]*registrantExportLimiter/);
  assert.match(source, /\/events\/:id\/registrants\/export-xlsx'[\s\S]*registrantExportLimiter/);
});

test('accumulated activity and participant total exports use the shared export limiter', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/organiser/review.js'), 'utf8');
  assert.match(source, /\/events\/:id\/submissions\/export'[\s\S]*registrantExportLimiter/);
  assert.match(source, /\/events\/:id\/participant-totals\/export'[\s\S]*registrantExportLimiter/);
});

test('organizer submission review routes use the shared review action limiter', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/organiser/review.js'), 'utf8');

  assert.match(source, /submissionReviewActionLimiter/);
  assert.match(source, /\/submissions\/bulk-approve'[\s\S]*submissionReviewActionLimiter/);
  assert.match(source, /\/events\/:id\/submissions\/:submissionId\/approve'[\s\S]*submissionReviewActionLimiter/);
  assert.match(source, /\/events\/:id\/submissions\/:submissionId\/reject'[\s\S]*submissionReviewActionLimiter/);
  assert.match(source, /isManualSubmissionReview\(event\)[\s\S]*requires individual review with the verification checklist/);
});

test('manual and cross-event reviews keep each event authorization boundary', () => {
  const standard = fs.readFileSync(path.resolve(__dirname, '../src/services/submission.service.js'), 'utf8');
  const accumulated = fs.readFileSync(path.resolve(__dirname, '../src/services/accumulated-activity.service.js'), 'utf8');
  for (const source of [standard, accumulated]) {
    assert.match(source, /linkedFrom && isManualSubmissionReview\(event\)/);
    assert.match(source, /!await resolveEventAccess\(\{ eventId: event\._id/);
    assert.doesNotMatch(source, /!linkedFrom && !await resolveEventAccess/);
  }
});

test('accumulated status changes invalidate the leaderboard cache', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/services/accumulated-activity.service.js'), 'utf8');
  assert.match(source, /invalidateAccumulatedLeaderboard\(event\.slug\)/);
  assert.match(source, /invalidateAccumulatedLeaderboard\(eventDoc\.slug\)/);
  assert.match(source, /require\('\.\/leaderboard\.service'\)\.invalidateLeaderboardCache/);
});

test('organizer shop report export routes use the shared export limiter', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/organizer-shop.routes.js'), 'utf8');

  assert.match(source, /shopReportExportLimiter/);
  assert.match(source, /\/events\/:eventId\/shop\/reports\/export\.csv'[\s\S]*shopReportExportLimiter/);
  assert.match(source, /\/events\/:eventId\/shop\/reports\/export\.xlsx'[\s\S]*shopReportExportLimiter/);
});
