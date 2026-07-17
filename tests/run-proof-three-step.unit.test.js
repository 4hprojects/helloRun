'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

test('run proof flow exposes the locked three-stage sequence', () => {
  const view = read('src/views/partials/run-proof-modal.ejs');
  const script = read('src/public/js/run-proof-modal.js');

  assert.match(view, /Step 1 of 3[^\n]*Choose run date/i);
  assert.match(script, /Step 2 of 3[^'\n]*Add and analyze proof/i);
  assert.match(script, /Step 3 of 3[^'\n]*Select event, review details, and submit/i);
  assert.ok(view.indexOf('id="runProofStepDate"') < view.indexOf('id="runProofStep1"'));
  assert.ok(view.indexOf('id="runProofStep1"') < view.indexOf('id="runProofStep2"'));
});

test('step three preselects qualified screenshot events without statically selecting Personal Record', () => {
  const view = read('src/views/partials/run-proof-modal.ejs');
  const script = read('src/public/js/run-proof-modal.js');

  assert.doesNotMatch(view, /id="runProofPersonalRecord"/);
  assert.match(script, /const checked = state\.hasReachedTargetStep && qualified/);
  assert.match(script, /This activity qualifies for/);
  assert.match(script, /manuallyDeselectedTargetIds/);
  assert.match(script, /state\.hasReachedTargetStep = true;[\s\S]*recomputeAlignment\(\)/);
  assert.doesNotMatch(script, /const checked = aligned && \(preferredId \? preferredId === registrationId : true\)/);
  assert.match(script, /Personal Record must be submitted separately|Personal Record/);
});

test('draft recovery is an explicit resume or start-over decision', () => {
  const view = read('src/views/partials/run-proof-modal.ejs');
  const script = read('src/public/js/run-proof-modal.js');

  assert.match(view, /id="runProofDraftResume"[^>]*>Resume saved entry/);
  assert.match(view, /id="runProofDraftStartOver"[^>]*>Start over/);
  assert.match(script, /syncRunTypeChip\(\)/);
  assert.match(script, /localStorage\.removeItem\(runProofDraftKey\)/);
});

test('modal submission uses structured JSON and revalidates targets', () => {
  const script = read('src/public/js/run-proof-modal.js');
  const controller = read('src/controllers/page/submission.controller.js');

  assert.match(script, /headers: \{ Accept: 'application\/json' \}/);
  assert.match(script, /await revalidateSelectedTargets\(\)/);
  assert.match(controller, /fieldErrors/);
  assert.match(controller, /submittedEntries/);
  assert.match(controller, /Compensate in reverse order/);
});

test('mobile header gives dynamic submit labels a dedicated full-width row', () => {
  const view = read('src/views/partials/run-proof-modal.ejs');
  const css = read('src/public/css/run-proof-modal.css');
  const script = read('src/public/js/run-proof-modal.js');

  assert.match(view, /id="runProofSubmitBtn"[\s\S]*form="runProofForm"/);
  assert.match(css, /@media \(max-width: 759px\)[\s\S]*\.run-proof-header-top \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) 2\.75rem/);
  assert.match(css, /\.run-proof-header-actions \{\s*display: contents;/);
  assert.match(css, /\.run-proof-header-actions #runProofSubmitBtn \{[\s\S]*grid-column: 1 \/ -1;[\s\S]*min-height: 2\.75rem;[\s\S]*white-space: normal;/);
  assert.match(css, /#runProofSubmitBtn\[hidden\] \{\s*display: none !important;/);
  assert.doesNotMatch(css, /#runProofSubmitBtn[\s\S]{0,300}(?:width|min-width|max-width): 75px/);
  for (const label of ['Submit Run Result', 'Resubmit Run', 'Loading...']) {
    assert.match(script, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(script, /'Submit ' \+ selectedCount \+ ' Entries'/);
  assert.match(script, /setStepOneActionLabel/);
});
