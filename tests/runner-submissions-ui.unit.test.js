'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('history template uses compact discovery and one responsive semantic table', () => {
  const view = read('src/views/runner/submissions.ejs');
  assert.match(view, /<h1>Submission History<\/h1>/);
  assert.match(view, /Needs correction/);
  assert.match(view, /Awaiting review/);
  assert.match(view, /<details class="sub-filter-details"/);
  assert.match(view, /Apply filters/);
  assert.match(view, /<label for="submissionSort">Sort by<\/label>/);
  assert.match(view, /<table class="sub-history-table">/);
  assert.match(view, /<caption>Your submitted activities and organizer review status<\/caption>/);
  assert.doesNotMatch(view, /data-view=|subEntryList|subTableWrap|onchange=/);
});

test('detail template preserves correction and recognition workflows with disclosures', () => {
  const view = read('src/views/runner/submission-detail.ejs');
  assert.match(view, /What to fix/);
  assert.match(view, /data-open-run-proof-modal/);
  assert.match(view, /action="\/runner\/submissions\/<%= submission\.submissionId %>\/edit-metadata"/);
  assert.match(view, /name="_csrf"/);
  assert.match(view, /data-submission-edit-form/);
  assert.match(view, /Submission record/);
  assert.match(view, /Proof reading details/);
  assert.match(view, /\/proof" target="_blank" rel="noopener noreferrer"/);
  assert.match(view, /Download certificate/);
  assert.match(view, /aria-live="polite"/);
  assert.doesNotMatch(view, /OCR Confidence|rawText|suspiciousFlag/);
});

test('responsive CSS transforms the table to cards and protects accessibility', () => {
  const view = read('src/views/runner/submissions.ejs');
  const css = read('src/public/css/runner-submissions.css');
  assert.match(css, /\.sub-history-table\s*\{/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /content:\s*attr\(data-label\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /overflow:\s*clip/);
  assert.doesNotMatch(css, /\.(?:sub-card|sub-history-row|sub-entry-cell)[^\{]*\{[^}]*border-left/);
  assert.doesNotMatch(css, /#subTableWrap[^\{]*\{[^}]*border-left/);
  assert.match(view, /sub-pagination-desktop/);
  assert.match(view, /sub-pagination-mobile/);
  assert.match(view, /Page <strong><%= presentation\.pagination\.page %><\/strong> of <strong><%= presentation\.pagination\.totalPages %><\/strong>/);
  assert.match(view, /sub-pagination-disabled[^>]*aria-disabled="true"/);
  assert.match(css, /\.sub-pagination-mobile \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(88px, 1\.1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\.sub-pagination-mobile \.btn \{[^}]*min-height: 44px/);
});

test('accumulated activity rows use a compact type-aware mobile layout', () => {
  const view = read('src/views/runner/submissions.ejs');
  const css = read('src/public/css/runner-submissions.css');
  assert.match(view, /sub-history-row--accumulated/);
  assert.match(view, /data-label="<%= sub\.isAccumulatedActivity \? 'Distance' : 'Result' %>"/);
  assert.match(view, /sub-status-helper--approved-challenge/);
  assert.match(view, /sub-accumulated-result-label/);
  assert.match(css, /grid-template-areas: "entry entry" "review review" "result date" "timeline timeline" "actions actions"/);
  assert.match(css, /\.sub-history-row--accumulated \.sub-status-helper--approved-challenge,[\s\S]*\.sub-history-row--accumulated \.sub-accumulated-result-label \{ display: none; \}/);
  assert.doesNotMatch(view, /<small>Accumulated activity<\/small>/);
});

test('progressive enhancement provides busy, copy, and unsaved feedback', () => {
  const script = read('src/public/js/runner-submissions.js');
  assert.match(script, /aria-busy/);
  assert.match(script, /Updating your activity details/);
  assert.match(script, /beforeunload/);
  assert.match(script, /navigator\.clipboard/);
  assert.match(script, /Verification link copied/);
  assert.doesNotMatch(script, /submissionsView|localStorage|data-view/);
});

test('submission templates compile', () => {
  for (const file of ['src/views/runner/submissions.ejs', 'src/views/runner/submission-detail.ejs']) {
    assert.doesNotThrow(() => ejs.compile(read(file), { filename: path.join(root, file) }));
  }
});
