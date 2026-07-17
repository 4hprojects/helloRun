'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('run proof is full-screen on phones and restores only non-file draft data', () => {
  const css = read('src/public/css/run-proof-modal.css');
  assert.match(css, /width: 100vw;[\s\S]*height: 100dvh/);
  assert.match(css, /\.run-proof-header-actions \.run-proof-back-btn \{[\s\S]*min-width: 2\.75rem !important;[\s\S]*min-height: 2\.75rem !important;/);
  assert.match(css, /\.run-proof-modal-desc,[\s\S]*\.run-proof-step-indicator \{\s*overflow-wrap: anywhere;/);
  const js = read('src/public/js/run-proof-modal.js');
  assert.match(js, /runProofDraftKey/);
  assert.match(js, /Select the proof image again/);
});

test('each authenticated role has a bounded mobile task navigation', () => {
  const nav = read('src/views/layouts/nav.ejs');
  assert.match(nav, /Organizer mobile navigation/);
  assert.match(nav, /Admin mobile navigation/);
  assert.match(nav, /mobile-nav-tab/);
});

test('mobile operational work exposes cards, sticky decisions, field state, and safe drafts', () => {
  assert.match(read('src/public/js/main.js'), /initMobileOperationalTables/);
  assert.match(read('src/public/js/main.js'), /Offline · actions are paused to prevent duplicate check-ins/);
  assert.match(read('src/public/css/organizer-events.css'), /position: sticky/);
  assert.match(read('src/public/js/main.js'), /registrationDraft/);
  assert.match(read('src/public/js/main.js'), /field.type !== 'file'/);
});
