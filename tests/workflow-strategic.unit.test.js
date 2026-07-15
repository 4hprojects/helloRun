'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('event and policy workspaces share expiring local autosave behavior', () => {
  const main = read('src/public/js/main.js');
  assert.match(main, /form\.create-event-form, form\.policy-editor-form/);
  assert.match(main, /WorkspaceDraft/);
  assert.match(main, /Uploaded files require an explicit save/);
  assert.match(read('src/views/organizer/create-event.ejs'), /submitReadinessChecklist/);
  assert.match(read('src/views/organizer/edit-event.ejs'), /previewBtn/);
});

test('shared policy editor retains version, preview, publish, and archive lifecycle', () => {
  const form = read('src/views/admin/privacy-policy-form.ejs');
  assert.match(form, /policyVersion/);
  assert.match(form, /Auto-format Draft/);
  assert.match(form, /Preview/);
  assert.match(form, /Publish Draft/);
  assert.match(read('src/controllers/admin/policy.controller.js'), /archivePolicyDocumentVersion/);
});

test('organizers can switch mode and retain event hierarchy labels', () => {
  assert.match(read('src/views/layouts/nav.ejs'), /Switch to Runner mode/);
  const main = read('src/public/js/main.js');
  assert.match(main, /organizer-workspace-breadcrumbs/);
  assert.match(main, /Event workspace breadcrumb/);
});

test('runner completion remains contextual instead of rendering a persistent dashboard banner', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  assert.doesNotMatch(dashboard, /Finish line reached/);
  assert.doesNotMatch(dashboard, /runner-completion-hero/);
  assert.match(dashboard, /Certificates Earned/);
  assert.match(dashboard, /Recent Badges/);
});
