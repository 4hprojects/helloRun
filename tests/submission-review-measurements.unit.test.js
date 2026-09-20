'use strict';

// DB-free tests for elevation and steps on the single-entry review page.
//
// The "Submitted versus detected" table used to have no Elevation row and printed Steps only in
// steps competitions, so a reviewer could see an "elevation mismatch" warning without the numbers
// behind it. The real template is rendered with a stub context (layout includes stripped, as in the
// other UI tests).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/organizer/submission-review.ejs');
const renderable = fs.readFileSync(viewPath, 'utf8').replace(/<%-\s*include\([^%]+%>/g, '');

function render({ submission = {}, ocrData = {}, challengeConfig, submissionKind = 'standard', participant } = {}) {
  return ejs.render(renderable, {
    title: 'Review', user: {}, isAdminViewer: false, isFullAdmin: false,
    reviewReasonOptions: [], runRejectionReasonOptions: [], reviewChecklistVersion: 'run-proof-v1', verificationCriteria: [],
    event: { _id: 'e1', title: 'Sample', acceptedRunTypes: [] },
    challengeConfig: challengeConfig || { accumulated: false, tracksDistance: true, tracksSteps: false },
    message: null, isOwnSubmission: false, accumulatedProgress: null,
    submission: {
      _id: 's1', status: 'submitted', runDateLabel: 'Sep 18, 2026', distanceKm: 5, elapsedLabel: '00:30:00', runType: 'run',
      source: 'manual_upload', sourceLabel: 'Manual upload', ocrData, ...submission
    },
    submissionKind, participant: participant || { name: 'Jordan' }, registration: { id: 'r1', confirmationCode: 'HR-1' },
    queueContext: {}, backHref: '#', reviewActionBase: '/x', submissionId: 's1'
  }, { filename: viewPath });
}

// The comparison table only, so assertions cannot match text elsewhere on the page.
const table = (html) => html.slice(html.indexOf('<div class="proof-comparison"'), html.indexOf('</section>', html.indexOf('<div class="proof-comparison"')));
const row = (html, label) => {
  const t = table(html);
  const at = t.indexOf(`<strong role="rowheader">${label}</strong>`);
  return at === -1 ? '' : t.slice(t.lastIndexOf('<div class="proof-comparison-row', at), t.indexOf('</div>', at));
};
const cells = (rowHtml) => [...rowHtml.matchAll(/<span>([^<]*)(?:<small>[^<]*<\/small>)?<\/span>/g)].map((m) => m[1]);

test('the review template compiles', () => {
  assert.doesNotThrow(() => ejs.compile(fs.readFileSync(viewPath, 'utf8'), { filename: viewPath }));
});

test('elevation is shown beside what the proof screenshot says, with no warning when they agree', () => {
  const html = render({ submission: { elevationGain: 128 }, ocrData: { extractedElevationGain: 128 } });
  const elevation = row(html, 'Elevation gain');
  assert.ok(elevation, 'an Elevation gain row exists');
  assert.deepEqual(cells(elevation), ['128 m', '128 m']);
  assert.doesNotMatch(elevation, /has-mismatch|Elevation mismatch/);
});

test('an elevation mismatch is flagged in the row that shows the numbers', () => {
  const html = render({ submission: { elevationGain: 300 }, ocrData: { extractedElevationGain: 120, elevationMismatch: true } });
  const elevation = row(html, 'Elevation gain');
  assert.match(elevation, /^<div class="proof-comparison-row has-mismatch"/);
  assert.deepEqual(cells(elevation), ['300 m', '120 m']);
  assert.match(elevation, /<small>Elevation mismatch<\/small>/);
});

test('when only one side has a value the other says so plainly', () => {
  assert.deepEqual(cells(row(render({ submission: { elevationGain: 90 } }), 'Elevation gain')), ['90 m', 'Not detected']);
  assert.deepEqual(cells(row(render({ ocrData: { extractedElevationGain: 150 } }), 'Elevation gain')), ['Not provided', '150 m']);
});

test('0 m elevation is a real value (a flat course), not a missing one', () => {
  const elevation = row(render({ submission: { elevationGain: 0 } }), 'Elevation gain');
  assert.deepEqual(cells(elevation), ['0 m', 'Not detected']);
  assert.doesNotMatch(render({ submission: { elevationGain: 0 } }), /No elevation or step count was provided/);
});

test('elevation is rounded to whole metres', () => {
  assert.deepEqual(cells(row(render({ submission: { elevationGain: 149.6 }, ocrData: { extractedElevationGain: 150.4 } }), 'Elevation gain')), ['150 m', '150 m']);
});

test('the elevation row sits after Duration and before Steps', () => {
  const t = table(render({ submission: { elevationGain: 10, steps: 500 }, ocrData: {} }));
  const order = ['Duration', 'Elevation gain', 'Steps'].map((label) => t.indexOf(`<strong role="rowheader">${label}</strong>`));
  assert.ok(order.every((index) => index > -1));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('an entry with neither elevation nor steps gets no rows for them and a plain explanation', () => {
  const html = render();
  assert.equal(row(html, 'Elevation gain'), '');
  assert.equal(row(html, 'Steps'), '');
  assert.match(html, /<p class="submission-review-muted">No elevation or step count was provided or detected for this entry\.<\/p>/);
});

test('the explanation disappears as soon as either value exists anywhere', () => {
  for (const context of [
    { submission: { elevationGain: 5 } },
    { submission: { steps: 4000 } },
    { ocrData: { extractedElevationGain: 5 } },
    { ocrData: { extractedSteps: 4000 } },
    { ocrData: { elevationMismatch: true } }
  ]) {
    assert.doesNotMatch(render(context), /No elevation or step count was provided/, JSON.stringify(context));
  }
});

test('steps now appear in any event when the entry has them, and keep their warning', () => {
  const steps = row(render({ submission: { steps: 8500 }, ocrData: { extractedSteps: 8500 } }), 'Steps');
  assert.deepEqual(cells(steps), ['8,500', '8,500']);
  const mismatch = row(render({ submission: { steps: 9000 }, ocrData: { extractedSteps: 5000, stepsMismatch: true } }), 'Steps');
  assert.match(mismatch, /^<div class="proof-comparison-row has-mismatch"/);
  assert.match(mismatch, /Step-count mismatch/);
  assert.deepEqual(cells(row(render({ ocrData: { extractedSteps: 7000 } }), 'Steps')), ['Not provided', '7,000']);
});

test('steps competitions behave exactly as before: the row is always there, even with no steps', () => {
  const config = { accumulated: true, tracksDistance: false, tracksSteps: true };
  const empty = row(render({ challengeConfig: config, submissionKind: 'accumulated' }), 'Steps');
  assert.ok(empty, 'the Steps row is always shown in a steps competition');
  assert.deepEqual(cells(empty), ['0', 'Not detected']);
  assert.doesNotMatch(render({ challengeConfig: config, submissionKind: 'accumulated' }), /No elevation or step count was provided/);
  assert.deepEqual(cells(row(render({ challengeConfig: config, submissionKind: 'accumulated', submission: { steps: 12400 } }), 'Steps')), ['12,400', 'Not detected']);
});

test('accumulated entries in a distance challenge show elevation the same way', () => {
  const config = { accumulated: true, tracksDistance: true, tracksSteps: false };
  const elevation = row(render({ challengeConfig: config, submissionKind: 'accumulated', submission: { elevationGain: 210 } }), 'Elevation gain');
  assert.deepEqual(cells(elevation), ['210 m', 'Not detected']);
});

test('the other rows are untouched', () => {
  const t = table(render({ submission: { elevationGain: 10 } }));
  for (const label of ['Activity date', 'Distance', 'Duration']) {
    assert.match(t, new RegExp(`<strong role="rowheader">${label}</strong>`), label);
  }
});

test('nothing a runner typed can inject markup into the table', () => {
  const html = render({ submission: { elevationGain: '<img src=x onerror=alert(1)>' }, ocrData: { extractedSteps: '<script>alert(1)</script>' } });
  assert.doesNotMatch(html, /<img src=x|<script>alert\(1\)<\/script>/);
});
