'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const view = fs.readFileSync(path.join(__dirname, '../src/views/pages/event-details.ejs'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../src/public/css/event-details.css'), 'utf8');

test('authenticated event progress card remains in normal document flow', () => {
  assert.doesNotMatch(css, /\.event-runner-progress-card\s*\{[^}]*position:\s*sticky/s);
  assert.doesNotMatch(css, /\.event-runner-progress-card\s*\{[^}]*position:\s*fixed/s);
});

test('authenticated progress keeps primary metrics visible and discloses secondary facts', () => {
  assert.match(view, /class="event-runner-progress-labels"/);
  assert.match(view, /remaining` %><\/span>/);
  assert.match(view, /<details class="event-runner-progress-details">/);
  assert.match(view, /Activity and deadline details/);
  assert.match(view, /<dt>Verified activities<\/dt>/);
  assert.match(view, /<dt>Pending<\/dt>/);
  assert.match(view, /<dt>Submit by<\/dt>/);
  assert.match(view, /runnerProgressDetailSignals\.join/);
  assert.match(css, /\.event-runner-progress-track\s*\{[\s\S]*height:\s*9px/);
  assert.match(css, /\.event-runner-progress-details summary\s*\{[\s\S]*min-height:\s*44px/);
});

test('authenticated card presents one primary action and preserves the secondary workflow in details', () => {
  assert.match(view, /runnerState\.primaryAction \|\| runnerState\.secondaryAction/);
  assert.match(view, /if \(runnerCardPrimaryAction\)/);
  assert.match(view, /\[runnerCardPrimaryAction\]\.forEach/);
  assert.match(view, /runnerState\.primaryAction && runnerState\.secondaryAction/);
  assert.match(view, /data-run-proof-surface="event-detail-details"/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.event-runner-actions\s*\{[\s\S]*display:\s*none/);
});
