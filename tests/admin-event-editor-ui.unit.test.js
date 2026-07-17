'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/organizer/edit-event.ejs');
const view = fs.readFileSync(viewPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/create-event.css'), 'utf8');
const controller = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/events.controller.js'), 'utf8');
const shared = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/_shared.js'), 'utf8');
const returnUtils = require('../src/utils/admin-event-return');

test('shared event editor compiles after admin-specific refinements', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: viewPath }));
});

test('admin event update imports and uses the form parser', () => {
  assert.match(controller, /getCreateEventFormData, getCreateEventFormDataFromEvent/);
  assert.match(controller, /const formData = getCreateEventFormData\(req\.body\)/);
  assert.match(shared, /getCreateEventFormData/);
});

test('draft submit for review is truthful and transitions status', () => {
  assert.match(controller, /const isDraftSubmitForReview = event\.status === 'draft' && req\.body\.actionType === 'publish'/);
  assert.match(controller, /if \(isDraftSubmitForReview\) \{[\s\S]*event\.status = 'pending_review';[\s\S]*event\.submittedForReviewAt = new Date\(\)/);
  assert.match(controller, /Event submitted for review\./);
});

test('admin editor safely preserves only filtered event-list return paths', () => {
  assert.match(controller, /require\('\.\.\/\.\.\/utils\/admin-event-return'\)/);
  assert.match(view, /name="returnTo" value="<%= returnTo %>"/);
  assert.match(controller, /returnContext\.returnTo[\s\S]*appendAdminEditMessage/);

  const supplied = '/admin/events?q=2026&status=&eventType=&perPage=25&type=success&msg=Event+updated.&type=success&msg=Event+updated.';
  assert.equal(returnUtils.normalizeAdminEventsReturnTo(supplied), '/admin/events?q=2026&status=&eventType=&perPage=25');
  assert.equal(
    returnUtils.appendAdminEditMessage(supplied, 'success', 'Event updated.'),
    '/admin/events?q=2026&status=&eventType=&perPage=25&type=success&msg=Event+updated.'
  );
  assert.equal(returnUtils.normalizeAdminEventsReturnTo('//evil.example/admin/events'), '');
  assert.equal(returnUtils.normalizeAdminEventsReturnTo('/admin/events#queue'), '');
  assert.equal(returnUtils.normalizeAdminEventsReturnTo('https://evil.example/admin/events'), '');
  assert.equal(returnUtils.normalizeAdminEventsReturnTo('/admin/events?q=ok\r\nLocation:%20https://evil.example'), '');
  assert.equal(returnUtils.normalizeAdminEventsReturnTo('/admin/events?page=3&needsReview=1&unknown=drop-me'), '/admin/events?page=3&needsReview=1');
  assert.equal(returnUtils.normalizeAdminEventsReturnTo('/admin/events?' + 'q='.padEnd(1202, 'x')), '');

  const feedback = new URL(returnUtils.appendAdminEditMessage(supplied, 'success', 'Event updated.'), 'http://hellorun.local');
  assert.deepEqual(feedback.searchParams.getAll('type'), ['success']);
  assert.deepEqual(feedback.searchParams.getAll('msg'), ['Event updated.']);
});

test('initial and error renders receive readiness and review summary data', () => {
  assert.match(shared, /getEventReadinessChecklist/);
  assert.match(shared, /getEventReviewSummary/);
  assert.match(controller, /readinessChecklist: getEventReadinessChecklist\(formData\)/);
  assert.match(controller, /reviewSummary: getEventReviewSummary\(formData\)/);
  assert.match(controller, /buildAdminEditViewData/);
});

test('admin media removal accepts payment QR and clears its key', () => {
  assert.match(controller, /kind === 'paymentQr' && event\.paymentQrImageUrl/);
  assert.match(controller, /event\.paymentQrImageUrl = ''/);
  assert.match(controller, /event\.paymentQrImageKey = ''/);
});

test('shared editor exposes five task groups while preserving all field sections', () => {
  assert.match(view, /include\('partials\/event-builder-navigation'\)/);
  for (const group of ['basics', 'participation', 'commerce', 'public-experience', 'review']) {
    assert.match(view, new RegExp(`data-builder-group="${group}"`));
  }
  for (const section of ['event-type-step', 'core-details-step', 'schedule-step', 'location-virtual-step', 'race-categories-step', 'rewards-step', 'pricing-step', 'payment-setup-step', 'event-details-step', 'badges-step', 'media-step', 'waiver-step', 'review-step']) {
    assert.match(view, new RegExp(`id="${section}"`));
  }
  assert.match(view, /Legacy edit event progress" hidden aria-hidden="true"/);
  assert.match(view, /event-builder-groups\.js/);
});

test('admin mode identifies live targets and avoids unusable organizer badge forms', () => {
  assert.match(view, /admin-edit-context/);
  assert.match(view, /You are editing a published event/);
  assert.match(view, /Badge configuration is managed separately/);
  assert.match(view, /href="\/admin\/badges"/);
  assert.match(view, /name="adminNotes"/);
});

test('desktop admin editor provides a nav-safe group rail and persistent action dock', () => {
  assert.match(css, /--event-builder-sticky-top:\s*calc\(var\(--nav-h, 76px\) \+ 0\.75rem\)/);
  assert.match(css, /\.builder-group-nav\s*\{[\s\S]*top:\s*var\(--event-builder-sticky-top\)/);
  assert.match(css, /\.create-event-page \.form-section-review \.actions:has/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /max-width:\s*1200px/);
});

test('admin editor tracks unsaved changes and guards navigation', () => {
  assert.match(view, /adminEditorSaveState/);
  assert.match(view, /function markAdminEditorDirty/);
  assert.match(view, /window\.addEventListener\('beforeunload'/);
  assert.match(view, /allowAdminEditorNavigation = true/);
  assert.match(view, /waiverQuill\.on\('text-change'[\s\S]*markAdminEditorDirty\(\)/);
  assert.match(view, /eventDetailsQuill\.on\('text-change'[\s\S]*markAdminEditorDirty\(\)/);
});

test('confirmation dialog traps and restores focus and inerts background content', () => {
  assert.match(view, /getActionDialogFocusable/);
  assert.match(view, /event\.key !== 'Tab'/);
  assert.match(view, /node\.inert = inert/);
  assert.match(view, /actionDialogTrigger\.focus\(\)/);
  assert.match(css, /\.draft-confirm-overlay[\s\S]*z-index:\s*1100/);
});
