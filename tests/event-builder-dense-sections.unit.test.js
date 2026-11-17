'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const { getEventReviewSummary } = require('../src/services/event-form.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const createView = read('src/views/organizer/create-event.ejs');
const editView = read('src/views/organizer/edit-event.ejs');
const leaderboardPartial = read('src/views/organizer/partials/leaderboard-settings.ejs');
const client = read('src/public/js/event-builder-groups.js');
const css = read('src/public/css/create-event.css');

test('create and edit use one compatible leaderboard settings partial', () => {
  assert.doesNotThrow(() => ejs.compile(leaderboardPartial));
  for (const view of [createView, editView]) {
    assert.match(view, /include\('partials\/leaderboard-settings'/);
    assert.match(view, /data-kit-inventory-panel/);
    assert.match(view, /kitSizeRequired \? '' : 'hidden'/);
  }

  for (const field of [
    'leaderboardSettingsEnabled',
    'leaderboardSettingsType',
    'leaderboardSettingsRankingBasis',
    'leaderboardSettingsNameDisplayMode',
    'leaderboardSettingsVisibility',
    'leaderboardSettingsPublicRankCutoff',
    'leaderboardSettingsVisibleColumns',
    'leaderboardSettingsShowPending',
    'leaderboardSettingsHideFlagged',
    'leaderboardSettingsShowHighestStepsCard',
    'leaderboardSettingsShowHighestElevationCard',
    'leaderboardSettingsShowMostConsistentCard'
  ]) {
    assert.match(leaderboardPartial, new RegExp(`name="${field}"`));
  }

  assert.ok(
    leaderboardPartial.indexOf('data-leaderboard-enabled') < leaderboardPartial.indexOf('leaderboardSettingsType'),
    'leaderboard enablement must precede dependent settings'
  );
  assert.match(leaderboardPartial, /<details class="builder-disclosure leaderboard-advanced-settings"/);
});

test('dense section controller discloses settings without clearing stored inventory', () => {
  assert.match(client, /leaderboardDependent\.hidden = !leaderboardEnabled\.checked/);
  assert.match(client, /kitInventoryPanel\.hidden = !kitSizeRequired\.checked/);
  assert.doesNotMatch(client, /kitInventoryPanel[\s\S]{0,200}disabled/);
  assert.match(client, /data-review-edit-target/);
  assert.match(client, /section\.focus\(\{ preventScroll: true \}\)/);
});

test('dense sections stay compact, touchable, responsive, and reduced-motion safe', () => {
  assert.match(css, /\.kit-inventory-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(7, minmax\(76px, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.kit-inventory-grid\s*\{[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.builder-disclosure > summary\s*\{[\s\S]*min-height:\s*52px/);
  assert.match(css, /\.leaderboard-toggle-list label\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.builder-disclosure > summary i/);
});

test('review summary is lifecycle-aware and links cards to owning sections', () => {
  const onsite = getEventReviewSummary({
    eventType: 'onsite',
    feeMode: 'free',
    venueName: 'Town Plaza',
    city: 'Manila',
    country: 'Philippines'
  });
  const onsiteLocation = onsite.find((card) => card.title === 'Location / Virtual');
  assert.equal(onsiteLocation.sectionId, 'location-virtual-step');
  assert.deepEqual(onsiteLocation.rows.map((row) => row.label), ['Venue']);
  assert.equal(onsite.find((card) => card.title === 'Payment').rows.length, 0);

  const virtual = getEventReviewSummary({
    eventType: 'virtual',
    feeMode: 'paid',
    title: '<img src=x onerror=alert(1)>',
    virtualCompletionMode: 'single_activity'
  });
  assert.ok(virtual.find((card) => card.title === 'Schedule').rows.some((row) => row.label === 'Virtual'));
  assert.ok(!virtual.find((card) => card.title === 'Location / Virtual').rows.some((row) => row.label === 'Venue'));
  assert.equal(virtual.find((card) => card.title === 'Event').rows[0].value, '<img src=x onerror=alert(1)>');
  assert.ok(virtual.every((card) => card.sectionId));
});

test('review rendering filters repetitive empty values and escapes dynamic text', () => {
  for (const view of [createView, editView]) {
    assert.match(view, /\['Not set', 'None', 'Not configured'\]\.includes/);
    assert.match(view, /data-review-edit-target/);
    assert.match(view, /escapeReviewHtml\(row\.value\)/);
    assert.match(view, /escapeReviewHtml\(card\.emptyMessage/);
  }
});
