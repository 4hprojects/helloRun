'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/admin/event-detail.ejs');
const viewSource = fs.readFileSync(viewPath, 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'src/public/css/admin.css'), 'utf8');
const controllerSource = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/events.controller.js'), 'utf8');
const routeSource = fs.readFileSync(path.join(ROOT, 'src/routes/admin.routes.js'), 'utf8');

test('admin event detail template compiles and exposes the workflow hierarchy', () => {
  assert.doesNotThrow(() => ejs.compile(viewSource, { filename: viewPath }));
  [
    'admin-event-breadcrumb',
    'admin-event-identity',
    'admin-event-overview',
    'admin-event-task-card',
    'admin-event-section-nav',
    'id="event-essentials"',
    'id="event-rules"',
    'id="event-content"',
    'id="event-media"',
    'admin-event-danger-zone'
  ].forEach((token) => assert.match(viewSource, new RegExp(token)));
});

test('pending review prioritizes readiness, approval, and a repair path', () => {
  assert.match(viewSource, /event\.status === 'pending_review'[\s\S]*Resolve approval blockers/);
  assert.match(viewSource, /readinessErrors\.length[\s\S]*admin-event-blocker-list/);
  assert.match(viewSource, /Fix in editor/);
  assert.match(viewSource, /data-action="approve"/);
});

test('operational counts link to existing filtered admin and organizer surfaces', () => {
  assert.match(viewSource, /`\/organizer\/events\/\$\{eventId\}\/registrants`/);
  assert.match(viewSource, /`\/admin\/submissions\?eventId=\$\{encodeURIComponent\(eventId\)\}`/);
});

test('full-admin deletion is permission-aware in both view and route', () => {
  assert.match(controllerSource, /User\.findById\(req\.session\.userId\)\.select\('adminTier'\)\.lean\(\)/);
  assert.match(controllerSource, /viewerIsFullAdmin:\s*isFullAdminTier\(viewer\)/);
  assert.match(viewSource, /if \(viewerIsFullAdmin\)[\s\S]*data-action="delete"/);
  assert.match(viewSource, /Soft deletion requires full-admin access/);
  assert.match(routeSource, /'\/events\/:id\/delete', requireAdmin, requireFullAdmin, adminModerationLimiter/);
});

test('all lifecycle actions use accessible custom dialogs without native prompt', () => {
  assert.doesNotMatch(viewSource, /\bprompt\s*\(/);
  assert.match(viewSource, /role="dialog" aria-modal="true"/);
  assert.match(viewSource, /aria-labelledby="adminEvent<%= dialog\.action %>Title"/);
  assert.match(viewSource, /aria-describedby="adminEvent<%= dialog\.action %>Desc"/);
  assert.match(viewSource, /event\.key === 'Tab'/);
  assert.match(viewSource, /event\.shiftKey/);
  assert.match(viewSource, /modalState\.trigger\.focus\(\)/);
  assert.match(viewSource, /event\.key === 'Escape'/);
  assert.match(viewSource, /node\.inert = inert/);
});

test('mutation UX prevents duplicate submission and keeps failures in context', () => {
  assert.match(viewSource, /confirm\.disabled = pending/);
  assert.match(viewSource, /confirm\.setAttribute\('aria-busy', String\(pending\)\)/);
  assert.match(viewSource, /setModalError\(modal, error\.message\)/);
  assert.match(viewSource, /aria-live="assertive"/);
  assert.match(viewSource, /role="status" aria-live="polite"/);
});

test('existing endpoint paths and mutation payload keys remain compatible', () => {
  assert.match(viewSource, /fetch\(`\/admin\/events\/\$\{eventId\}\/\$\{action\}`/);
  assert.match(viewSource, /body\.reason = reason\.value\.trim\(\)/);
  assert.match(viewSource, /body\.adminPassword = password\.value/);
  assert.match(viewSource, /body\.approvalNote = note\.value\.trim\(\)/);
  assert.match(viewSource, /action="\/admin\/events\/<%= event\._id %>\/sitemap-toggle"/);
});

test('page-scoped CSS covers responsive, rich-content, focus, and reduced-motion behavior', () => {
  assert.match(cssSource, /\.admin-event-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 310px/);
  assert.match(cssSource, /\.admin-event-rich-details \.event-rich-details[\s\S]*overflow-x:\s*auto/);
  assert.match(cssSource, /@media \(max-width: 380px\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /min-height:\s*44px/);
});

test('desktop layout aligns to the site grid and keeps sticky controls below global navigation', () => {
  assert.match(cssSource, /\.admin-event-workspace\s*\{[\s\S]*max-width:\s*1200px/);
  assert.match(cssSource, /--admin-event-sticky-top:\s*92px/);
  assert.match(cssSource, /\.admin-event-section-nav\s*\{[\s\S]*top:\s*var\(--admin-event-sticky-top\)/);
  assert.match(cssSource, /\.admin-event-task-card\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*var\(--admin-event-sticky-top\)/);
  assert.match(cssSource, /@media \(max-width: 1100px\)[\s\S]*\.admin-event-task-card\s*\{\s*position:\s*static/);
});

test('danger zone follows the main event record instead of living in the sticky task rail', () => {
  const mediaIndex = viewSource.indexOf('id="event-media"');
  const dangerIndex = viewSource.indexOf('class="admin-event-danger-zone"');
  const asideIndex = viewSource.indexOf('class="admin-event-task-column"');
  assert.ok(mediaIndex >= 0 && dangerIndex > mediaIndex && asideIndex > dangerIndex);

  const asideEnd = viewSource.indexOf('</aside>', asideIndex);
  assert.doesNotMatch(viewSource.slice(asideIndex, asideEnd), /admin-event-danger-zone/);
  assert.match(cssSource, /\.admin-event-danger-zone\s*\{[\s\S]*display:\s*flex/);
});
