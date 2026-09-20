'use strict';

// DB-free UI tests for the per-runner submissions page and the buttons that lead to it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const viewPath = path.join(ROOT, 'src/views/organizer/registrant-submissions.ejs');
const view = read('src/views/organizer/registrant-submissions.ejs');
const css = read('src/public/css/registrant-submissions.css');
const renderable = view.replace(/<%-\s*include\([^%]+%>/g, '');

const baseEntry = (overrides = {}) => ({
  id: 'sub-1',
  submissionKind: 'standard',
  submissionTypeLabel: 'Run Result',
  statusClass: 'approved',
  statusLabel: 'Approved',
  status: 'approved',
  isAutoApproved: false,
  suspiciousFlag: false,
  hasOcrMismatch: false,
  distanceLabel: '5.02 km',
  elapsedLabel: '00:31:12',
  runDateLabel: 'Sep 18, 2026',
  submittedAtLabel: 'Sep 19, 2026',
  sourceLabel: 'Manual upload',
  proofUrl: 'https://example.test/proof.png',
  isImageProof: true,
  actionHref: '/organizer/events/event-1/submissions/sub-1/review',
  reviewedAtLabel: 'Sep 20, 2026',
  reviewerName: 'Casey Organizer',
  rejectionReason: '',
  reviewNotes: '',
  edit: { distanceKm: '5.02', hours: 0, minutes: 31, seconds: 12, runDate: '2026-09-18', runLocation: 'Cebu', runType: 'walk' },
  corrections: [],
  editAction: '/organizer/events/event-1/registrants/reg-1/submissions/sub-1/edit',
  decisionAction: '/organizer/events/event-1/registrants/reg-1/submissions/sub-1/decision',
  decision: { canApprove: false, canReject: false, canReverse: true },
  verificationCriteria: [],
  rejectionOptions: [],
  reversalOptions: [],
  ...overrides
});

function render(overrides = {}) {
  return ejs.render(renderable, {
    title: 'Submissions',
    user: {},
    isAdminViewer: false,
    event: { _id: 'event-1', title: 'Sample Event' },
    runner: { name: 'Jordan Rivera', email: 'jordan@example.test', confirmationCode: 'HR-ABC123', categoryLabel: '10K' },
    entries: [baseEntry()],
    counts: { total: 1, approved: 1, pending: 0, rejected: 0 },
    message: null,
    links: { registrants: '/organizer/events/event-1/registrants', queue: '/organizer/events/event-1/run-proofs/review' },
    csrfToken: 'token-123',
    reviewChecklistVersion: 'run-proof-v1',
    ...overrides
  }, { filename: viewPath });
}

test('the view compiles and links its own stylesheet after the shared ones', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: viewPath }));
  const order = ['organizer-events.css', 'run-proof-review.css', 'registrant-submissions.css']
    .map((name) => view.indexOf(`/css/${name}`));
  assert.ok(order.every((index) => index > -1) && order[0] < order[1] && order[1] < order[2]);
});

test('runner identity and totals are shown', () => {
  const html = render();
  assert.match(html, /<h1>Jordan Rivera<\/h1>/);
  assert.match(html, /jordan@example\.test/);
  assert.match(html, /HR-ABC123/);
  assert.match(html, /All entries/);
  assert.match(html, /Awaiting review/);
});

test('each entry has an edit form that posts to its own action with a CSRF token and a required reason', () => {
  const html = render();
  assert.match(html, /<form method="POST" action="\/organizer\/events\/event-1\/registrants\/reg-1\/submissions\/sub-1\/edit"/);
  assert.match(html, /<input type="hidden" name="_csrf" value="token-123">/);
  for (const name of ['distanceKm', 'elapsedHours', 'elapsedMinutes', 'elapsedSeconds', 'runDate', 'runType', 'runLocation', 'reason']) {
    assert.match(html, new RegExp(`name="${name}"`), name);
  }
  assert.match(html, /<textarea[^>]*name="reason"[^>]*required/);
  assert.match(html, /<option value="walk" selected>Walk<\/option>/);
  assert.match(html, /value="5\.02"/);
});

test('every form control is labelled and the run date cannot be in the future', () => {
  const html = render();
  const ids = [...html.matchAll(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 7);
  ids.forEach((id) => assert.match(html, new RegExp(`for="${id}"`), `label for ${id}`));
  assert.match(html, /name="runDate" type="date" max="\d{4}-\d{2}-\d{2}"/);
});

test('the approved-entry note explains what a correction recalculates, and differs by entry kind', () => {
  assert.match(render(), /its ranking and certificate will be recalculated/);
  assert.match(
    render({ entries: [baseEntry({ submissionKind: 'accumulated' })] }),
    /its ranking and challenge progress will be recalculated/
  );
  assert.doesNotMatch(
    render({ entries: [baseEntry({ status: 'submitted', statusClass: 'submitted', statusLabel: 'Pending Review' })] }),
    /will be recalculated/
  );
});

test('correction history and the corrected badge appear only once an entry has been corrected', () => {
  assert.doesNotMatch(render(), /Correction history|Corrected/);
  const html = render({
    entries: [baseEntry({
      corrections: [{
        editorName: 'Casey Organizer',
        editedAtLabel: 'Sep 20, 2026, 9:02 AM',
        reason: 'Mistyped distance',
        lines: ['Distance: 5.20 km to 5.02 km']
      }]
    })]
  });
  assert.match(html, /Correction history \(1\)/);
  assert.match(html, /Distance: 5\.20 km to 5\.02 km/);
  assert.match(html, /Reason: Mistyped distance/);
  assert.match(html, /rs-corrected-badge">Corrected</);
});

test('user-controlled text is escaped', () => {
  const html = render({
    runner: { name: '<script>alert(1)</script>', email: 'a@b.test', confirmationCode: '', categoryLabel: '5K' },
    entries: [baseEntry({ edit: { ...baseEntry().edit, runLocation: '"><img src=x onerror=alert(1)>' } })]
  });
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x/);
});

test('the review link is a neutral button whatever the entry status', () => {
  assert.match(render({ entries: [baseEntry({ status: 'submitted', statusClass: 'submitted', statusLabel: 'Pending Review' })] }), /class="rs-btn-neutral"[\s\S]*?Open Review/);
  assert.match(render(), /class="rs-btn-neutral"[\s\S]*?View Details/);
});

test('the empty state renders when the runner has no entries', () => {
  const html = render({ entries: [], counts: { total: 0, approved: 0, pending: 0, rejected: 0 } });
  assert.match(html, /No entries yet/);
  assert.doesNotMatch(html, /Edit values/);
});

test('a flash message is announced', () => {
  assert.match(render({ message: { type: 'error', text: 'Distance must be between 0.1 and 500 km.' } }), /page-message-error" role="status">Distance must be/);
});

test('the stretched-link review button is not used here, because it would cover the edit form', () => {
  assert.doesNotMatch(render(), /registrant-row-btn-review/);
});

test('registrant-submissions.css is balanced, fully scoped and responsive', () => {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal((stripped.match(/\{/g) || []).length, (stripped.match(/\}/g) || []).length);
  const selectors = [...stripped.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*)\{/g)]
    .flatMap((m) => m[1].split(','))
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.startsWith('.registrant-submissions-page'));
  assert.deepEqual(selectors, []);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /font-size: 1rem; \/\* 16px prevents iOS zoom-on-focus \*\//);
});

test('the runner submissions page is reachable from the registrants list, the review page and the queue', () => {
  const registrants = read('src/views/organizer/event-registrants.ejs');
  assert.match(registrants, /href="<%= basePath %>\/<%= registration\._id %>\/submissions"[^>]*aria-label="View all submissions by <%= runnerName %>"/);
  assert.match(registrants, /<span>Submissions<\/span>/);

  const review = read('src/views/organizer/submission-review.ejs');
  assert.match(review, /registrants\/<%= registration\.id %>\/submissions/);
  assert.match(review, /All entries by this runner/);

  const queue = read('src/views/organizer/run-proof-review.ejs');
  assert.match(queue, /<% if \(item\.runnerEntriesHref\) \{ %>/);
  const shared = read('src/routes/organiser/_shared.js');
  assert.match(shared, /runnerEntriesHref: registration\._id/);
});
