'use strict';

// The dedicated approved-entries page: access scoping, the pinned filter, and the
// reversal control.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const viewPath = path.join(root, 'src/views/organizer/approved-entries.ejs');
const viewSource = fs.readFileSync(viewPath, 'utf8');

function renderPage(overrides = {}) {
  const item = {
    id: 's1', participantName: 'Jamie Runner', participantEmail: 'j@e.com', confirmationCode: 'HR-AAA111',
    eventQueueHref: '/organizer/events/e1/run-proofs/review', eventTitle: 'CNS', raceDistance: '50K',
    submissionTypeLabel: 'Run Result', distanceLabel: '5.20 km', elapsedLabel: '30:00',
    sourceLabel: 'Manual', proofTypeLabel: 'PHOTO', reviewedAtLabel: 'Sep 15, 2026',
    status: 'approved', statusClass: 'approved', statusLabel: 'Approved',
    certificateIssued: false, certificateRevoked: false,
    ...(overrides.item || {})
  };
  return ejs.renderFile(viewPath, {
    title: 'Approved Entries', user: { firstName: 'Org', role: 'organiser' }, isAdminViewer: false,
    basePath: '/organizer/approved-entries', reversalBasePath: '/organizer/approved-entries',
    filters: { q: '', eventId: '', type: 'all', sort: 'newest', pageSize: 25, page: 1, status: 'approved' },
    submissions: overrides.submissions || [item],
    counts: { approved: 1 },
    pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 25 },
    events: [{ id: 'e1', title: 'CNS' }], message: null,
    links: { prev: '', next: '', reset: '/organizer/approved-entries', submissions: '/organizer/submissions', dashboard: '/organizer/dashboard' },
    csrfToken: 'tok', locals: { csrfToken: 'tok' }, isAuthenticated: true, path: '/organizer/approved-entries', seo: {}
  }, { views: [path.join(root, 'src/views')] });
}

test('the page pins status to approved and cannot be walked off it', () => {
  const review = read('src/routes/organiser/review.js');
  const admin = read('src/controllers/admin/submissions.controller.js');

  // A ?status=submitted in the query string must not change what this page shows.
  assert.match(review, /const filters = \{ \.\.\.req\.query, status: 'approved' \};/);
  assert.match(admin, /const filters = \{ \.\.\.req\.query, status: 'approved' \};/);
  assert.match(review, /status: 'approved',\n  sort: 'newest',\n  pageSize: 25/);
});

test('organizer access is scoped to accessible events, admin is not', () => {
  const review = read('src/routes/organiser/review.js');
  const admin = read('src/controllers/admin/submissions.controller.js');

  const handler = review.slice(review.indexOf("router.get('/approved-entries'"), review.indexOf("router.post('/approved-entries"));
  assert.match(handler, /canAccessRegistrantReview\(user\)/);
  // listAccessibleReviewEvents resolves admins to all events and everyone else through
  // getAccessibleEventIdQuery, which already includes co-organized events.
  assert.match(handler, /listAccessibleReviewEvents\(user\)/);
  assert.match(handler, /listSubmissionHub\(\{ filters, eventIds, defaults: APPROVED_ENTRIES_DEFAULTS, viewerId: user\._id \}\)/);

  // The admin mount deliberately passes no eventIds.
  assert.match(admin, /listSubmissionHub\(\{ filters, defaults: APPROVED_ENTRIES_DEFAULTS, viewerId: req\.session\.userId \}\)/);
});

test('co-organizers reach the page through the existing access query', () => {
  const access = read('src/services/event-access.service.js');
  const review = read('src/routes/organiser/review.js');

  assert.match(access, /\$or: \[\{ organizerId: user\._id \}, \{ _id: \{ \$in: assignedIds \} \}\]/);
  assert.match(review, /getAccessibleEventIdQuery\(user\)/);
});

test('both reversal routes are CSRF-protected and rate limited', () => {
  const review = read('src/routes/organiser/review.js');
  const adminRoutes = read('src/routes/admin.routes.js');

  assert.match(
    review,
    /'\/approved-entries\/:submissionId\/reverse',\s*\n\s*requireAuth,\s*\n\s*requireCsrfProtection,\s*\n\s*submissionReviewActionLimiter/
  );
  assert.match(
    adminRoutes,
    /router\.post\('\/approved-entries\/:submissionId\/reverse', requireAdmin, requireCsrfProtection, adminModerationLimiter/
  );
  assert.match(adminRoutes, /router\.get\('\/approved-entries', requireAdmin/);
});

test('both mounts reverse through the one shared service', () => {
  const review = read('src/routes/organiser/review.js');
  const admin = read('src/controllers/admin/submissions.controller.js');

  assert.match(review, /reverseSubmissionApproval\(\{[\s\S]*?actorRole: user\.role/);
  assert.match(admin, /reverseSubmissionApproval\(\{[\s\S]*?actorRole: 'admin'/);
  // Neither mount reimplements the unwinding.
  for (const source of [review, admin]) {
    assert.doesNotMatch(source, /revokeBadgesForSubmission/);
    assert.doesNotMatch(source, /deleteRankingEntry/);
  }
});

test('the reversal form carries CSRF, a required reason, and states the consequences', async () => {
  const html = await renderPage();

  assert.match(html, /action="\/organizer\/approved-entries\/s1\/reverse"/);
  assert.match(html, /name="_csrf" value="tok"/);
  assert.match(html, /name="reason"[^>]*required/);
  assert.match(html, /minlength="5"/);
  assert.match(html, /removes it from the leaderboard/);
  assert.match(html, /badges earned from it are withdrawn/);
  assert.match(html, /runner is notified/);
});

test('an issued certificate is flagged before the reversal is taken', async () => {
  // The organizer must see that reversing will invalidate a certificate the runner holds.
  const withCert = await renderPage({ item: { certificateIssued: true } });
  assert.match(withCert, /Certificate issued/);
  assert.match(withCert, /certificate will be revoked and will stop verifying/);

  const withoutCert = await renderPage();
  assert.match(withoutCert, /No certificate/);
  assert.doesNotMatch(withoutCert, /will stop verifying/);
});

test('certificate state reaches the page from the hub row builder', () => {
  const hub = read('src/services/submission-hub.service.js');
  assert.match(hub, /certificateIssued: Boolean\(submission\.certificate\?\.url\)/);
  // A revoked certificate must not read as still issued.
  assert.match(hub, /&& String\(submission\.certificate\?\.status \|\| ''\) !== 'revoked'/);
  assert.match(hub, /certificateRevoked: String\(submission\.certificate\?\.status \|\| ''\) === 'revoked'/);
});

test('auto-approved entries are labelled as such', async () => {
  const html = await renderPage({ item: { statusClass: 'auto-approved', statusLabel: 'Auto-approved' } });
  assert.match(html, /Auto-approved/);
});

test('the page offers no approve or bulk control', () => {
  // It exists to reverse approvals, not to grant them, and reversal is one at a time.
  assert.doesNotMatch(viewSource, /quick-approve/);
  assert.doesNotMatch(viewSource, /bulk/i);
  assert.doesNotMatch(viewSource, /type="checkbox"/);
});

test('the empty state distinguishes no data from no matches', async () => {
  const html = await renderPage({ submissions: [] });
  assert.match(html, /No approved entries yet/);
});
