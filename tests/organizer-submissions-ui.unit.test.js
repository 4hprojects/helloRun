'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const view = read('src/views/organizer/submissions.ejs');
const css = read('src/public/css/submission-hub.css');
const script = read('src/public/js/organizer-submissions.js');
const { normalizeSubmissionHubFilters, buildSubmissionHubPath } = require('../src/services/submission-hub.service');

test('organizer queue defaults and query values normalize deterministically', () => {
  const defaults = { status: 'submitted', sort: 'oldest', pageSize: 25 };
  assert.deepEqual(normalizeSubmissionHubFilters({}, defaults), {
    status: 'submitted', type: 'all', sort: 'oldest', q: '', eventId: '', page: 1, pageSize: 25
  });
  const normalized = normalizeSubmissionHubFilters({ status: 'unknown', sort: 'bad', pageSize: '26', page: '-2' }, defaults);
  assert.equal(normalized.status, 'submitted');
  assert.equal(normalized.sort, 'oldest');
  assert.equal(normalized.pageSize, 25);
  assert.equal(normalized.page, 1);
  assert.equal(buildSubmissionHubPath('/organizer/submissions', normalized, {}, defaults), '/organizer/submissions');
  assert.equal(buildSubmissionHubPath('/organizer/submissions', normalized, { status: 'all', pageSize: 50 }, defaults), '/organizer/submissions?status=all&pageSize=50');
});

test('organizer submission queue template uses compact filters and one semantic result table', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: path.join(ROOT, 'src/views/organizer/submissions.ejs') }));
  assert.match(view, /organizer-submission-status-strip/);
  assert.match(view, /Filters &amp; sort/);
  assert.match(view, /name="pageSize"/);
  assert.match(view, /\[25, 50, 100\]/);
  assert.match(view, /<table class="organizer-submission-table/);
  assert.match(view, /data-label="Runner & event"/);
  assert.match(view, /href="<%= item\.eventQueueHref %>"/);
  assert.doesNotMatch(view, /item\.eventQueueHref[^\n]+data-submission-modal-link/);
});

test('only clean pending results expose quick and bulk approval controls', () => {
  assert.match(view, /filter\(\(item\) => item\.quickApprovalEligible\)/);
  assert.match(view, /if \(item\.quickApprovalEligible\)/);
  assert.match(view, /action="\/organizer\/submissions\/<%= item\.id %>\/quick-approve"/);
  assert.match(view, /form="organizerBulkApproveForm"/);
  assert.match(view, /data-approval-dialog hidden/);
  assert.match(view, /Confirm approval/);
});

test('row actions use accessible icon controls with hover and focus labels', () => {
  assert.match(view, /class="nav-signup-btn organizer-submission-icon-action"/);
  assert.match(view, /data-lucide="<%= item\.status === 'submitted' \? 'clipboard-check' : 'eye' %>"/);
  assert.match(view, /aria-label="Quick approve submission"/);
  assert.match(view, /role="tooltip">Quick approve/);
  assert.match(css, /organizer-submission-icon-action:hover \.organizer-submission-action-tooltip/);
  assert.match(css, /organizer-submission-icon-action:focus-visible \.organizer-submission-action-tooltip/);
  assert.match(css, /width: 44px; min-width: 44px; height: 44px/);
  assert.match(css, /organizer-submission-table th:last-child \{ text-align: center; \}/);
  assert.match(css, /organizer-submission-actions \{ display: flex; align-items: center; justify-content: center;/);
});

test('responsive queue styling provides tablet compaction and mobile cards', () => {
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1050px\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*content: attr\(data-label\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /organizer-approval-dialog-backdrop[^}]*place-items: center/);
});

test('approval enhancement initializes icons, selects clean rows, and opens confirmation', () => {
  const window = new Window({ url: 'https://hellorun.test/organizer/submissions' });
  let icons = 0;
  window.lucide = { createIcons: () => { icons += 1; } };
  window.document.body.innerHTML = `
    <main data-organizer-submissions>
      <form action="/organizer/submissions/bulk-approve" data-bulk-approval-form>
        <label><input type="checkbox" data-select-all-eligible></label>
        <span data-selected-count></span><button data-bulk-approve-button type="submit" disabled>Approve</button>
      </form>
      <table><tr data-submission-id="one"><td class="organizer-submission-identity"><strong>Runner One</strong><a>Event One</a></td><td><input type="checkbox" name="submissionIds" value="one" form="bulk" data-eligible-submission></td></tr></table>
    </main>
    <div data-approval-dialog hidden><section role="dialog" tabindex="-1"><h2 data-approval-title></h2><p data-approval-description></p><div data-approval-selection></div><p data-approval-error hidden></p><button data-approval-cancel>Cancel</button><button data-approval-confirm>Confirm</button></section></div>`;
  window.eval(script);
  const selectAll = window.document.querySelector('[data-select-all-eligible]');
  selectAll.checked = true;
  selectAll.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(window.document.querySelector('[data-eligible-submission]').checked, true);
  assert.equal(window.document.querySelector('[data-selected-count]').textContent, '1 selected');
  assert.equal(window.document.querySelector('[data-bulk-approve-button]').disabled, false);
  assert.equal(icons, 1);
});

test('review modal no longer auto-advances and traps keyboard focus', () => {
  const modalScript = read('src/public/js/submission-link-modal.js');
  assert.doesNotMatch(modalScript, /setTimeout\(advanceToNextPending/);
  assert.match(modalScript, /event\.key !== 'Tab'/);
  assert.match(modalScript, /redirectedUrl\.searchParams\.get\('type'\) === 'error'/);
});
