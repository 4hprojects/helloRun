'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/pages/faq.ejs');
const viewSource = fs.readFileSync(viewPath, 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'src/public/css/faq-page.css'), 'utf8');
const routeSource = fs.readFileSync(path.join(ROOT, 'src/routes/pageRoutes.js'), 'utf8');
const controllerSource = fs.readFileSync(path.join(ROOT, 'src/controllers/page/home.controller.js'), 'utf8');
const {
  FAQ_CATEGORIES,
  buildFaqPresentation,
  buildRoleActions,
  buildStartAction,
  normalizeKeywords,
  serializeStructuredData
} = require('../src/services/faq-page-presentation.service');
const { filterFaq, normalizeSearchValue, openHashTarget } = require('../src/public/js/faq-page');

test('FAQ presentation provides one normalized substantial content source', () => {
  const presentation = buildFaqPresentation();
  const entries = presentation.categories.flatMap((category) => category.questions);

  assert.equal(FAQ_CATEGORIES.length, 8);
  assert.equal(presentation.categoryCount, 8);
  assert.equal(presentation.entryCount, 40);
  assert.equal(entries.length, 40);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
  assert.ok(entries.every((entry) => entry.anchor === `faq-${entry.id}`));
  assert.ok(entries.every((entry) => entry.answer.length >= 120));
  assert.ok(entries.every((entry) => entry.keywords.length > 0));
  assert.deepEqual(normalizeKeywords([' Pending ', 'pending', 'DISTANCE']), ['pending', 'distance']);
});

test('FAQ structured data is generated from the visible question source and safely serialized', () => {
  const presentation = buildFaqPresentation();
  const entries = presentation.categories.flatMap((category) => category.questions);
  const entities = presentation.structuredData.mainEntity;

  assert.equal(entities.length, entries.length);
  entities.forEach((entity, index) => {
    assert.equal(entity.name, entries[index].question);
    assert.equal(entity.acceptedAnswer.text, entries[index].answer);
  });

  const dangerous = serializeStructuredData({ value: '</script><script>alert(1)</script>&' });
  assert.doesNotMatch(dangerous, /<\/script>|<script>|&/);
  assert.deepEqual(JSON.parse(dangerous), { value: '</script><script>alert(1)</script>&' });
});

test('FAQ role-aware actions cover guest, runner, organizer, and administrator journeys', () => {
  assert.deepEqual(buildRoleActions({}).map((item) => item.href), ['/events', '/login', '/contact']);
  assert.deepEqual(buildRoleActions({ isAuthenticated: true }).map((item) => item.href), ['/my-registrations', '/runner/submissions', '/contact']);
  assert.deepEqual(buildRoleActions({ isAuthenticated: true, isApprovedOrganizer: true }).map((item) => item.href), ['/organizer/dashboard', '/how-it-works#organizer-path', '/contact']);
  assert.deepEqual(buildRoleActions({ isAuthenticated: true, isAdmin: true }).map((item) => item.href), ['/admin/dashboard', '/how-it-works', '/contact']);
  assert.deepEqual(buildStartAction({}), { label: 'Browse Events', href: '/events' });
  assert.deepEqual(buildStartAction({ isAuthenticated: true }), { label: 'Check My Registrations', href: '/my-registrations' });
  assert.deepEqual(buildStartAction({ isApprovedOrganizer: true }), { label: 'Open Organizer Dashboard', href: '/organizer/dashboard' });
});

test('FAQ template compiles with search, category navigation, disclosures, and one h1', () => {
  assert.doesNotThrow(() => ejs.compile(viewSource, { filename: viewPath }));
  assert.equal((viewSource.match(/<h1\b/g) || []).length, 1);
  assert.match(viewSource, /How can we help\?/);
  assert.match(viewSource, /role="search"/);
  assert.match(viewSource, /data-faq-search/);
  assert.match(viewSource, /data-faq-category-link/);
  assert.match(viewSource, /<details class="faq-question"/);
  assert.match(viewSource, /data-faq-empty/);
  assert.match(viewSource, /structuredDataJson/);
  assert.doesNotMatch(viewSource, /include\(['"]\.\.\/partials\/ad-unit|run-proof-modal-dialog/i);
});

test('FAQ content covers critical runner workflows and policy boundaries', () => {
  const source = buildFaqPresentation().categories
    .flatMap((category) => category.questions)
    .map((entry) => `${entry.question} ${entry.answer}`)
    .join('\n');

  for (const phrase of [
    'Payment review confirms the transaction',
    'Verified distance is the approved official total',
    '30 km verified against a 21 km goal',
    'Final reviews in progress',
    'after every submitted accumulated activity',
    'authorized reviewers',
    'organizer remains authoritative',
    'Report another runner’s comment'
  ]) assert.match(source, new RegExp(phrase, 'i'));

  assert.doesNotMatch(source, /guaranteed refund|guaranteed approval|medical diagnosis|externally accredited/i);
});

test('FAQ browser search matches question, answer, and keywords without regular-expression hazards', () => {
  const window = new Window({ url: 'https://hellorun.online/faq' });
  window.document.body.innerHTML = `
    <p data-faq-status></p><button data-faq-clear hidden></button><div data-faq-empty hidden></div>
    <a data-faq-category-link="progress"></a><a data-faq-category-link="payment"></a>
    <section data-faq-category="progress"><details data-faq-entry data-faq-keywords="over goal"><summary>Progress</summary><p>30 km against 21 km</p></details></section>
    <section data-faq-category="payment"><details data-faq-entry data-faq-keywords="receipt"><summary>Payment</summary><p>Organizer review</p></details></section>`;

  assert.equal(normalizeSearchValue('  Pénding   DISTANCE '), 'pending distance');
  const result = filterFaq(window.document, '30 km [');
  assert.equal(result.visibleCount, 0);
  assert.equal(window.document.querySelector('[data-faq-empty]').hidden, false);

  const match = filterFaq(window.document, 'over goal');
  assert.equal(match.visibleCount, 1);
  assert.equal(window.document.querySelector('[data-faq-category="progress"]').hidden, false);
  assert.equal(window.document.querySelector('[data-faq-category="payment"]').hidden, true);
  assert.ok(window.document.querySelector('[data-faq-category-link="progress"]').classList.contains('is-match'));

  const reset = filterFaq(window.document, '');
  assert.equal(reset.visibleCount, 2);
  assert.equal(window.document.querySelector('[data-faq-empty]').hidden, true);
});

test('FAQ deep links open and focus an individual answer', async () => {
  const window = new Window({ url: 'https://hellorun.online/faq#faq-goal' });
  window.document.body.innerHTML = '<details id="faq-goal" data-faq-entry><summary>Can I continue?</summary><p>Yes.</p></details>';
  assert.equal(openHashTarget(window.document, window), true);
  assert.equal(window.document.getElementById('faq-goal').open, true);
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  assert.equal(window.document.activeElement.tagName, 'SUMMARY');
});

test('FAQ route is controller-owned and styles support responsive accessible presentation', () => {
  assert.match(routeSource, /router\.get\('\/faq', pageController\.getFaq\)/);
  assert.match(controllerSource, /buildFaqPresentation\(\{ locals: res\.locals \}\)/);
  assert.match(controllerSource, /canonicalUrl: baseUrl \? `\$\{baseUrl\}\/faq` : ''/);
  assert.match(cssSource, /grid-template-columns:\s*242px minmax\(0, 1fr\)/);
  assert.match(cssSource, /min-height:\s*44px/);
  assert.match(cssSource, /:focus-visible/);
  assert.match(cssSource, /@media \(max-width: 800px\)[\s\S]*\.faq-directory-nav\s*\{\s*display:\s*none/);
  assert.match(cssSource, /@media \(max-width: 560px\)/);
  assert.match(cssSource, /@media \(max-width: 350px\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /overflow-x:\s*clip/);
});
