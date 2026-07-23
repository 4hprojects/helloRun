'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/organizer/events.ejs');
const view = fs.readFileSync(viewPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/organizer-event-list.css'), 'utf8');
const script = fs.readFileSync(path.join(ROOT, 'src/public/js/organizer-event-list.js'), 'utf8');
const renderable = view.replace(/<%-\s*include\([^%]+%>/g, '');

function render(overrides = {}) {
  const baseEvent = {
    id: 'event-1', _id: 'event-1', title: 'Bayani Run 2026', status: 'published', statusLabel: 'Published',
    referenceCode: 'EVT-BAYANI', slug: 'bayani-run-2026', formatLabel: 'Virtual', locationLabel: 'Virtual event',
    eventStartAt: new Date('2026-08-24T00:00:00Z'), eventEndAt: new Date('2026-08-31T00:00:00Z'),
    updatedAt: new Date('2026-07-22T00:00:00Z'), registrationCount: 20,
    pendingPaymentCount: 2, pendingResultCount: 3,
    actionCount: 3,
    attention: ['2 payment reviews needed', '3 result reviews needed'], bannerImageUrl: '',
    manageHref: '/organizer/events/event-1', registrantsHref: '/organizer/events/event-1/registrants',
    paymentReviewHref: '/organizer/events/event-1/payment-proofs/review',
    resultReviewHref: '/organizer/events/event-1/run-proofs/review'
  };
  return ejs.render(renderable, {
    title: 'My Events - HelloRun', message: null, events: [baseEvent],
    filters: { q: '', status: '', sort: 'attention', perPage: 25, page: 1 }, filtersOpen: false,
    portfolioCounts: { total: 1, draft: 0, pending_review: 0, published: 1, closed: 0, archived: 0 },
    statusLinks: { total: '/organizer/events', draft: '?status=draft', pending_review: '?status=pending_review', published: '?status=published', closed: '?status=closed', archived: '?status=archived' },
    pagination: { start: 1, end: 1, totalItems: 1, page: 1, totalPages: 1, prevHref: '', nextHref: '' },
    clearHref: '/organizer/events',
    ...overrides
  }, { filename: viewPath });
}

test('event-list template compiles and renders the operations-first hierarchy', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: viewPath }));
  const html = render();
  assert.match(html, /organizer-event-status-strip/);
  assert.match(html, /Filters &amp; sort/);
  assert.match(html, /Needs attention/);
  assert.match(html, /Bayani Run 2026/);
  assert.match(html, />Manage</);
  assert.match(html, />Payment Review</);
  assert.match(html, />Result Review</);
  assert.doesNotMatch(html, />Edit<|>Certificate<|Submitted Run Proofs/);
});

test('review shortcuts render only for non-zero actionable work', () => {
  const event = {
    id: 'event-2', _id: 'event-2', title: 'Quiet Event', status: 'draft', statusLabel: 'Draft',
    referenceCode: '', slug: 'quiet-event', formatLabel: 'Onsite', locationLabel: 'Manila',
    eventStartAt: null, eventEndAt: null, updatedAt: null, registrationCount: 0,
    pendingPaymentCount: 0, pendingResultCount: 0, attention: ['Continue draft'], bannerImageUrl: '',
    actionCount: 1,
    manageHref: '/organizer/events/event-2', registrantsHref: '/organizer/events/event-2/registrants',
    paymentReviewHref: '/payments', resultReviewHref: '/results'
  };
  const html = render({ events: [event] });
  assert.match(html, />Manage</);
  assert.doesNotMatch(html, /Payment Review|Result Review/);
  assert.match(html, /Continue draft/);
  assert.match(html, />TBA</);
});

test('filtered and first-use empty states remain distinct', () => {
  const filtered = render({
    events: [], filters: { q: 'missing', status: '', sort: 'attention', perPage: 25, page: 1 },
    pagination: { start: 0, end: 0, totalItems: 0, page: 1, totalPages: 1, prevHref: '', nextHref: '' }
  });
  assert.match(filtered, /No matching events/);
  assert.match(filtered, /Clear Filters/);

  const firstUse = render({
    events: [], portfolioCounts: { total: 0, draft: 0, pending_review: 0, published: 0, closed: 0, archived: 0 },
    pagination: { start: 0, end: 0, totalItems: 0, page: 1, totalPages: 1, prevHref: '', nextHref: '' }
  });
  assert.match(firstUse, /No events yet/);
  assert.match(firstUse, />Create Event</);
});

test('responsive stylesheet provides compact rows, mobile cards, and accessible controls', () => {
  assert.match(css, /grid-template-columns: 7rem minmax\(210px, 1\.25fr\)/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.organizer-event-management-row[^}]*grid-template-columns: 5\.5rem minmax\(0, 1fr\)/);
  assert.match(css, /\.organizer-event-list-actions-2 \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*font-size: \.62rem/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test('page script safely initializes icons and progressively submits select changes', () => {
  const window = new Window({ url: 'https://hellorun.test/organizer/events' });
  let submitted = 0;
  let icons = 0;
  window.lucide = { createIcons: () => { icons += 1; } };
  window.document.body.innerHTML = '<form data-event-filter-form><select data-event-auto-submit><option>One</option></select></form>';
  const form = window.document.querySelector('form');
  form.requestSubmit = () => { submitted += 1; };
  window.eval(script);
  window.document.querySelector('select').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(icons, 1);
  assert.equal(submitted, 1);
});
