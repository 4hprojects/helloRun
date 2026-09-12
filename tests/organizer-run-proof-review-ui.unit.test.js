'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/organizer/run-proof-review.ejs');
const view = fs.readFileSync(viewPath, 'utf8');
const cssPath = path.join(ROOT, 'src/public/css/organizer-events.css');
const css = fs.readFileSync(cssPath, 'utf8');
const renderableView = view.replace(/<%-\s*include\([^%]+%>/g, '');

// Strips comments and walks the file tracking brace depth, so this generically
// guards against both "stray extra closing brace" and "premature closing
// brace" defects without hardcoding line numbers that will drift as the file
// changes. See the run-proof-review UI/UX fix: a media query in this exact
// file once closed one rule-block too early, which silently turned ~30
// mobile-only rules (including hiding the queue's tab/count bar) into
// unconditional, permanent, global CSS.
function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function traceBraceDepth(source) {
  const stripped = stripCssComments(source);
  let depth = 0;
  let minDepth = 0;
  for (const char of stripped) {
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    if (depth < minDepth) minDepth = depth;
  }
  return { finalDepth: depth, minDepth };
}

// Returns every index range covered by a @media block (start of the "@media"
// keyword through its matching closing brace), so a rule's position can be
// checked against them without depending on line numbers. Uses a brace-depth
// stack so nested rules and multiple/nested @media blocks resolve correctly.
function getMediaRanges(source) {
  const stripped = stripCssComments(source);
  const ranges = [];
  const stack = [];
  for (let i = 0; i < stripped.length; i += 1) {
    const char = stripped[i];
    if (char === '{') {
      const boundary = Math.max(
        stripped.lastIndexOf('{', i - 1),
        stripped.lastIndexOf('}', i - 1),
        stripped.lastIndexOf(';', i - 1)
      );
      const header = stripped.slice(boundary + 1, i);
      const mediaKeywordIndex = header.indexOf('@media');
      if (mediaKeywordIndex !== -1) {
        stack.push({ isMedia: true, mediaStart: boundary + 1 + mediaKeywordIndex });
      } else {
        stack.push({ isMedia: false });
      }
    } else if (char === '}') {
      const top = stack.pop();
      if (top && top.isMedia) {
        ranges.push([top.mediaStart, i]);
      }
    }
  }
  return ranges;
}

function isInsideAnyRange(index, ranges) {
  return ranges.some(([start, end]) => index >= start && index <= end);
}

test('organizer-events.css has no unbalanced braces (structural regression guard)', () => {
  const { finalDepth, minDepth } = traceBraceDepth(css);
  assert.equal(minDepth, 0, 'a stray closing brace would drive depth negative before the file ends');
  assert.equal(finalDepth, 0, 'every opened block must be closed by the end of the file');
});

test('the run-proof queue tab bar is only ever hidden inside a @media block, never globally', () => {
  const stripped = stripCssComments(css);
  const mediaRanges = getMediaRanges(css);
  const ruleRegex = /\.run-proof-review-page\s+\.registrant-summary\s*\{[^}]*\}/g;
  const matches = [...stripped.matchAll(ruleRegex)];
  assert.ok(matches.length > 0, 'expected at least one .run-proof-review-page .registrant-summary rule');
  matches.forEach((match) => {
    if (/display:\s*none/.test(match[0])) {
      assert.ok(
        isInsideAnyRange(match.index, mediaRanges),
        `display:none on .registrant-summary must be scoped inside a @media block, found unconditional at index ${match.index}`
      );
    }
  });
});

test('dead "approve directly from the queue" CSS has been removed', () => {
  assert.doesNotMatch(css, /\.run-proof-approve-btn/);
  assert.doesNotMatch(css, /\.run-proof-approval-modal/);
  assert.doesNotMatch(css, /\.run-proof-approval-dialog/);
});

function renderQueue(overrides = {}) {
  const defaultItem = {
    id: 'sub-1',
    participantName: 'Jordan Rivera',
    participantEmail: 'jordan.rivera@example.test',
    statusClass: 'submitted',
    statusLabel: 'Pending Review',
    submissionTypeLabel: 'Run Result',
    isAutoApproved: false,
    suspiciousFlag: false,
    hasOcrMismatch: false,
    distanceLabel: '5.00 km',
    elapsedLabel: '00:30:00',
    runDateLabel: 'Sep 1, 2026',
    submittedAtLabel: 'Sep 1, 2026',
    proofTypeLabel: 'GPS file',
    sourceLabel: 'Manual upload',
    reviewSourceLabel: 'Awaiting organizer review',
    proofUrl: 'https://example.test/proof.png',
    isImageProof: true,
    confirmationCode: 'HR-ABC123',
    status: 'submitted',
    actionHref: '/organizer/events/event-1/submissions/sub-1/review?queueStatus=pending&queueSort=oldest',
    reviewedAtLabel: '',
    reviewerName: '',
    reviewerEmail: '',
    rejectionReason: '',
    reviewNotes: ''
  };

  return ejs.render(renderableView, {
    title: 'Run Proof Review - Sample Event',
    user: { firstName: 'Casey', lastName: 'Organizer', role: 'organiser' },
    isAdminViewer: false,
    event: { _id: 'event-1', title: 'Sample Event' },
    filters: { status: 'pending', sort: 'oldest', q: '', page: 1 },
    reviewItems: overrides.reviewItems !== undefined ? overrides.reviewItems : [defaultItem],
    message: null,
    counts: { pending: 1, all: 1, reviewed: 0, approved: 0, autoApproved: 0, rejected: 0 },
    pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 50, prevHref: '', nextHref: '' },
    links: {
      pending: '/organizer/events/event-1/run-proofs/review',
      approved: '/organizer/events/event-1/run-proofs/review?status=approved',
      autoApproved: '/organizer/events/event-1/run-proofs/review?status=auto-approved',
      rejected: '/organizer/events/event-1/run-proofs/review?status=rejected',
      all: '/organizer/events/event-1/run-proofs/review?status=all',
      reset: '/organizer/events/event-1/run-proofs/review',
      registrants: '/organizer/events/event-1/registrants',
      reviewOldest: '/organizer/events/event-1/submissions/sub-1/review?queueStatus=pending&queueSort=oldest'
    },
    ...overrides
  }, { filename: viewPath });
}

test('run-proof review queue template compiles', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: viewPath }));
});

test('search button submits natively without relying on JavaScript', () => {
  const html = renderQueue();
  assert.match(html, /<button type="submit" class="run-proof-search-btn"/);
  assert.doesNotMatch(html, /run-proof-search-btn"[^>]*onclick=/);
});

test('queue cards keep the single review action link and never gain an inline approve control', () => {
  const html = renderQueue();
  assert.match(html, /class="nav-signup-btn table-action-btn registrant-row-btn registrant-row-btn-review"/);
  assert.doesNotMatch(html, /data-run-proof-approve/);
});

test('empty and populated queue states both render', () => {
  const populated = renderQueue();
  assert.match(populated, /Jordan Rivera/);
  assert.match(populated, /Open Review/);

  const empty = renderQueue({
    reviewItems: [],
    counts: { pending: 0, all: 0, reviewed: 0, approved: 0, autoApproved: 0, rejected: 0 },
    pagination: { page: 1, totalPages: 1, totalItems: 0, pageSize: 50, prevHref: '', nextHref: '' }
  });
  assert.match(empty, /No pending run proofs/);
});
