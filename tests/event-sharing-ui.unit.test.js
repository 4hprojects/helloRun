'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const partialPath = path.join(ROOT, 'src/views/partials/event-share-menu.ejs');
const partial = fs.readFileSync(partialPath, 'utf8');
const listing = read('src/views/pages/events.ejs');
const detail = read('src/views/pages/event-details.ejs');
const sharingClient = read('src/public/js/event-share.js');
const eventsCss = read('src/public/css/events.css');
const listService = read('src/services/public-event-list.service.js');
const homeController = read('src/controllers/page/home.controller.js');

test('event share partial renders one accessible disclosure with encoded destinations', () => {
  assert.doesNotThrow(() => ejs.compile(partial, { filename: partialPath }));

  const html = ejs.render(partial, {
    instanceId: 'event-card-example',
    url: 'https://hellorun.online/events/example?ref=running&mode=virtual',
    title: 'Run & Walk 2026',
    triggerLabel: 'Share',
    ariaLabel: 'Share Run and Walk 2026'
  }, { filename: partialPath });

  assert.match(html, /<details[\s\S]*data-event-share/);
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-controls="event-card-exampleOptions"/);
  assert.equal((html.match(/role="menuitem"/g) || []).length, 6);
  for (const label of ['Copy link', 'Facebook', 'X', 'LinkedIn', 'WhatsApp', 'Email']) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.match(html, /https%3A%2F%2Fhellorun\.online%2Fevents%2Fexample%3Fref%3Drunning%26mode%3Dvirtual/);
  assert.match(html, /Run%20%26%20Walk%202026/);
});

test('event discovery exposes listing and per-card sharing to every visitor', () => {
  assert.match(listing, /instanceId: 'eventsListingShare'/);
  assert.match(listing, /triggerLabel: 'Share events'/);
  assert.match(listing, /instanceId: `eventCardShare-\$\{event\.slug\}`/);
  assert.match(listing, /url: event\.share\.url/);
  assert.match(listing, /showTriggerText: false/);
  assert.match(listing, /instanceId: `eventCardShare-\$\{event\.slug\}`[\s\S]*?<% if \(locals\.isAuthenticated\) \{ %>/);
  assert.match(listing, /<script src="\/js\/event-share\.js"><\/script>/);
});

test('event-card share trigger is icon-only while keeping its accessible name', () => {
  const html = ejs.render(partial, {
    instanceId: 'event-card-icon-only',
    url: 'https://hellorun.online/events/example',
    title: 'Example Event',
    triggerLabel: 'Share',
    showTriggerText: false,
    ariaLabel: 'Share Example Event',
    containerClass: 'event-card-share'
  }, { filename: partialPath });

  const trigger = html.match(/<summary[\s\S]*?<\/summary>/)?.[0] || '';
  assert.match(trigger, /aria-label="Share Example Event"/);
  assert.match(trigger, /data-lucide="share-2"/);
  assert.doesNotMatch(trigger, />Share<\/span>/);
});

test('event detail sharing uses the public URL and stays out of organizer preview mode', () => {
  assert.match(detail, /instanceId: `eventHeroShare-\$\{details\.slug\}`/);
  assert.match(detail, /instanceId: `eventHeroShare-[\s\S]*showTriggerText: false/);
  assert.match(detail, /instanceId: `eventBottomShare-\$\{details\.slug\}`/);
  assert.ok(detail.indexOf('instanceId: `eventHeroShare-${details.slug}`') < detail.indexOf('class="btn btn-outline btn-hero-secondary btn-save-event'));
  assert.ok(detail.indexOf('instanceId: `eventBottomShare-${details.slug}`') < detail.indexOf('</main>'));
  assert.ok(detail.indexOf('instanceId: `eventBottomShare-${details.slug}`') < detail.indexOf('event-related-section'));
  assert.match(detail, /url: share\.url/);
  assert.match(detail, /triggerLabel: 'Share event'/);
  assert.match(detail, /if \(!isPreviewMode\) \{ %><script src="\/js\/event-share\.js"><\/script>/);
  assert.match(eventsCss, /\.event-share-options[\s\S]*z-index:\s*1001/);
  assert.match(read('src/public/css/event-details.css'), /@media \(max-width: 900px\)[\s\S]*\.event-bottom-share[\s\S]*flex-direction:\s*column/);
});

test('listing shares preserve the selected discovery URL while cards stay canonical', () => {
  assert.match(homeController, /buildPublicEventListPage\(req\.query, \{[\s\S]*baseUrl: getSitemapBaseUrl\(req\)/);
  assert.match(listService, /const listingPath = buildEventsPageUrl\(filterValues, currentPage\)/);
  assert.match(listService, /url: listingShareUrl/);
  assert.match(listService, /url: baseUrl \? `\$\{baseUrl\}\/events\/\$\{event\.slug\}`/);
  assert.match(listService, /ogImageWidth: 471/);
  assert.match(listService, /ogImageHeight: 501/);
});

test('event share menus close accessibly and provide copy feedback', () => {
  assert.match(sharingClient, /navigator\.clipboard/);
  assert.match(sharingClient, /Link copied\./);
  assert.match(sharingClient, /event\.key !== 'Escape'/);
  assert.match(sharingClient, /closeWidget\(openWidget, true\)/);
  assert.match(sharingClient, /if \(!widget\.contains\(event\.target\)\)/);
  assert.match(eventsCss, /\.event-share-trigger[\s\S]*min-height:\s*44px/);
  assert.match(eventsCss, /\.event-card-share \.event-share-trigger[\s\S]*width:\s*44px[\s\S]*height:\s*44px[\s\S]*aspect-ratio:\s*1/);
  assert.match(eventsCss, /\.event-share-options[\s\S]*z-index:\s*1001/);
  assert.match(eventsCss, /\.event-card:has\(\.event-share-menu\[open\]\)/);
});
