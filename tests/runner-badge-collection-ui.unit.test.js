'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public badge collection template uses the compact showcase hierarchy', () => {
  const template = read('src/views/pages/runner-badge-collection.ejs');
  const controller = read('src/controllers/page/badge.controller.js');
  ejs.compile(template, { filename: path.join(root, 'src/views/pages/runner-badge-collection.ejs') });

  assert.match(template, /hasBadges \? 'Verified badge collection' : 'Public badge collection'/);
  assert.match(template, /class="badge-collection-stats"/);
  assert.match(template, /badgesByScope\.length > 1/);
  assert.match(template, /aria-pressed="true"/);
  assert.match(template, /data-badge-filter-status role="status" aria-live="polite"/);
  assert.match(template, /data-copy-collection-link/);
  assert.match(template, /<% if \(hasBadges\) \{ %>\s*<section class="badge-share-section badge-collection-share"/);
  assert.doesNotMatch(template, /Collection Summary/);
  assert.doesNotMatch(template, /badge-collection-summary-grid/);
  assert.doesNotMatch(template, /runner\.email|proof|review notes/i);
  assert.match(controller, /hasBadges[\s\S]*?public collection of verified HelloRun badges/);
  assert.match(controller, /Public HelloRun Badge Collection/);
  assert.match(controller, /kicker: featuredBadge \? 'Verified Collection' : 'Public Collection'/);
});

test('public badge collection controls have responsive and accessible sizing', () => {
  const css = read('src/public/css/badge-verification.css');
  assert.match(css, /\.badge-filter-btn\s*\{[^}]*min-height: 44px/);
  assert.match(css, /\.badge-share-btn\s*\{[^}]*width: 44px[^}]*height: 44px/);
  assert.match(css, /\.badge-filter-btn\.is-active/);
  assert.match(css, /\.badge-collection-card-foot a[\s\S]*?min-height: 44px/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.badge-collection-grid\s*\{[^}]*grid-template-columns: 1fr/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.badge-collection-stats\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('scope filters update selected semantics, card visibility, and live results', () => {
  const window = new Window({ url: 'https://hellorun.test/runners/HR0000012/badges' });
  window.document.body.innerHTML = `
    <p data-badge-filter-status role="status">Showing all 3 verified badges.</p>
    <div data-badge-filters>
      <button data-scope="all" class="is-active" aria-pressed="true">All <span>3</span></button>
      <button data-scope="event" aria-pressed="false">Event <span>2</span></button>
      <button data-scope="global" aria-pressed="false">Global <span>1</span></button>
    </div>
    <div data-badge-grid>
      <article data-badge-scope="event"></article>
      <article data-badge-scope="event"></article>
      <article data-badge-scope="global"></article>
    </div>`;
  window.lucide = { createIcons() {} };
  window.eval(read('src/public/js/runner-badge-collection.js'));

  const eventButton = window.document.querySelector('[data-scope="event"]');
  eventButton.click();

  const cards = Array.from(window.document.querySelectorAll('[data-badge-scope]'));
  assert.equal(eventButton.getAttribute('aria-pressed'), 'true');
  assert.equal(window.document.querySelector('[data-scope="all"]').getAttribute('aria-pressed'), 'false');
  assert.equal(cards.filter((card) => !card.hidden).length, 2);
  assert.equal(cards.find((card) => card.dataset.badgeScope === 'global').hidden, true);
  assert.equal(window.document.querySelector('[data-badge-filter-status]').textContent, 'Showing Event 2 verified badges.');
});

test('collection enhancement safely supports pages without filters or sharing', () => {
  const window = new Window({ url: 'https://hellorun.test/runners/HR0000012/badges' });
  window.document.body.innerHTML = '<main><p>No public badges yet</p></main>';
  assert.doesNotThrow(() => window.eval(read('src/public/js/runner-badge-collection.js')));
  assert.equal(window.document.querySelector('[data-copy-collection-link]'), null);
});

test('copy collection action uses the public URL and announces success', async () => {
  const window = new Window({ url: 'https://hellorun.test/runners/HR0000012/badges' });
  let copiedValue = '';
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (value) => { copiedValue = value; } }
  });
  window.document.body.innerHTML = `
    <button data-copy-collection-link data-collection-url="https://hellorun.test/runners/HR0000012/badges">Copy link</button>
    <span data-copy-feedback role="status"></span>`;
  window.eval(read('src/public/js/runner-badge-collection.js'));

  window.document.querySelector('[data-copy-collection-link]').click();
  await new Promise((resolve) => window.setTimeout(resolve, 0));

  assert.equal(copiedValue, 'https://hellorun.test/runners/HR0000012/badges');
  assert.equal(window.document.querySelector('[data-copy-feedback]').textContent, 'Collection link copied.');
});
