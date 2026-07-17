'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const createPath = path.join(ROOT, 'src/views/organizer/create-event.ejs');
const editPath = path.join(ROOT, 'src/views/organizer/edit-event.ejs');
const createView = read('src/views/organizer/create-event.ejs');
const editView = read('src/views/organizer/edit-event.ejs');
const navigation = read('src/views/organizer/partials/event-builder-navigation.ejs');
const client = read('src/public/js/event-builder-groups.js');
const css = read('src/public/css/create-event.css');

test('create and edit builders compile with the shared navigation include', () => {
  assert.doesNotThrow(() => ejs.compile(createView, { filename: createPath }));
  assert.doesNotThrow(() => ejs.compile(editView, { filename: editPath }));
  assert.doesNotThrow(() => ejs.compile(navigation));
  assert.match(createView, /include\('partials\/event-builder-navigation'\)/);
  assert.match(editView, /include\('partials\/event-builder-navigation'\)/);
});

test('five primary groups replace visible 13-step navigation on every builder', () => {
  const links = navigation.match(/data-builder-group-link=/g) || [];
  assert.equal(links.length, 5);
  for (const group of ['basics', 'participation', 'commerce', 'public-experience', 'review']) {
    assert.match(navigation, new RegExp(`data-builder-group-link="${group}"`));
    assert.match(createView, new RegExp(`data-builder-group="${group}"`));
    assert.match(editView, new RegExp(`data-builder-group="${group}"`));
  }
  assert.match(createView, /Legacy create event progress" hidden aria-hidden="true"/);
  assert.match(editView, /Legacy edit event progress" hidden aria-hidden="true"/);
  assert.doesNotMatch(createView, /<div class="section-kicker">Step \d+ of 13<\/div>/);
  assert.doesNotMatch(editView, /<div class="section-kicker">Step \d+ of 13<\/div>/);
});

test('existing event sections and form actions remain compatible', () => {
  const sections = ['event-type-step', 'core-details-step', 'schedule-step', 'location-virtual-step', 'race-categories-step', 'rewards-step', 'pricing-step', 'payment-setup-step', 'event-details-step', 'badges-step', 'media-step', 'waiver-step', 'review-step'];
  for (const section of sections) {
    assert.match(createView, new RegExp(`id="${section}"`));
    assert.match(editView, new RegExp(`id="${section}"`));
  }
  assert.match(createView, /id="saveDraftBtn"/);
  assert.match(createView, /id="publishBtn"/);
  assert.match(editView, /id="saveBtn"/);
  assert.match(editView, /id="submitReviewBtn"/);
  assert.match(editView, /formAction/);
  assert.match(editView, /isAdminEdit/);
});

test('error recovery opens the owning group and focuses the invalid field', () => {
  assert.match(createView, /data-builder-error-link/);
  assert.match(editView, /data-builder-error-link/);
  assert.match(client, /function findField/);
  assert.match(client, /setActiveGroup\(groupId\)/);
  assert.match(client, /field\.scrollIntoView/);
  assert.match(client, /field\.focus/);
  assert.match(client, /invalidField/);
});

test('group navigation exposes current, disclosure, completion, and error states', () => {
  assert.match(navigation, /aria-current="step"/);
  assert.match(navigation, /aria-expanded="true"/);
  assert.match(navigation, /aria-controls="event-type-step core-details-step schedule-step homepage-promotion-step"/);
  assert.match(client, /setAttribute\('aria-expanded'/);
  assert.match(client, /setAttribute\('aria-current'/);
  assert.match(client, /classList\.toggle\('has-errors'/);
  assert.match(client, /classList\.toggle\('is-complete'/);
  assert.match(client, /document\.documentElement\.classList\.add\('event-builder-enhanced'\)/);
  assert.match(client, /event\.key === 'Escape'/);
  assert.match(navigation, /aria-live="polite" aria-atomic="true"/);
});

test('desktop, tablet, and mobile layouts retain readable sticky actions', () => {
  assert.match(css, /grid-template-columns:\s*minmax\(220px, 236px\) minmax\(0, 1fr\)/);
  assert.match(css, /\.builder-group-nav\s*\{[\s\S]*position:\s*sticky/);
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*\.builder-group-nav-list\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.builder-group-menu-toggle\s*\{[\s\S]*min-height:\s*52px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('desktop group rail stays sticky without becoming a floating card', () => {
  assert.match(css, /@media \(min-width: 1025px\)\s*\{[\s\S]*?\.builder-group-nav\s*\{[\s\S]*?align-self:\s*start/);
  assert.match(css, /@media \(min-width: 1025px\)\s*\{[\s\S]*?\.builder-group-nav\s*\{[\s\S]*?max-height:\s*none[\s\S]*?overflow-y:\s*visible/);
  assert.match(css, /@media \(min-width: 1025px\)\s*\{[\s\S]*?\.builder-group-nav\s*\{[\s\S]*?border:\s*0[\s\S]*?border-right:\s*1px solid #e2e8f0/);
  assert.match(css, /@media \(min-width: 1025px\)\s*\{[\s\S]*?\.builder-group-nav\s*\{[\s\S]*?border-radius:\s*0[\s\S]*?background:\s*transparent[\s\S]*?box-shadow:\s*none/);
  assert.match(css, /@media \(min-width: 1025px\) and \(max-height: 560px\)[\s\S]*?overflow-y:\s*auto/);
});
