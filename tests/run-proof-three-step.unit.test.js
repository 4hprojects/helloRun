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
