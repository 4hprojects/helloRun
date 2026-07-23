'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/organizer/event-details.ejs');
const view = fs.readFileSync(viewPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/organizer-event-detail.css'), 'utf8');
const script = fs.readFileSync(path.join(ROOT, 'src/public/js/organizer-event-detail.js'), 'utf8');
const renderable = view.replace(/<%-\s*include\([^%]+%>/g, '');

function render(overrides = {}) {
  const event = {
    _id: 'event-1', organizerId: 'organizer-1', title: 'Balanced Event', slug: 'balanced-event', status: 'draft',
    updatedAt: new Date('2026-07-22T00:00:00Z'), eventType: 'virtual', eventTypesAllowed: ['virtual'],
    virtualCompletionMode: 'single_activity', raceCategories: [{ name: '5K', distanceKm: 5 }],
    feeMode: 'free', pricingMode: 'free', registrationPackages: [], proofTypesAllowed: ['photo'],
    digitalBadgeEnabled: true, digitalCertificateEnabled: true, leaderboardRecognitionEnabled: true,
    physicalRewardsEnabled: false, waiverVersion: 1, waiverTemplate: 'Waiver', description: 'Description',
    galleryImageUrls: [], organiserName: 'HelloRun Editorial Team'
  };
  const presentation = {
    referenceCode: 'EVT-DETAIL', statusLabel: 'Draft', formatLabel: 'Virtual', locationLabel: 'Virtual event',
    canEdit: true, publicVisibleNow: false, publicHref: '/events/balanced-event', previewHref: '/preview',
    metrics: [
      { key: 'registrations', label: 'Registrations', value: 8, href: '/registrants', actionable: true },
      { key: 'payments', label: 'Payment Reviews', value: 0, href: '', actionable: false },
      { key: 'results', label: 'Result Reviews', value: 2, href: '/results', actionable: true },
      { key: 'approved', label: 'Approved Results', value: 3, href: '/approved', actionable: true }
    ],
    readinessTasks: [],
    schedule: [{ label: 'Registration', value: 'Aug 1 – Aug 20' }],
    categories: [{ name: '5K', summary: '5 km', rewards: '' }],
    pricing: { feeLabel: 'Free', modeLabel: 'free', paymentAccount: 'Not required' },
    runnerExperience: { proofTypes: 'photo', digitalBadge: 'Enabled', digitalCertificate: 'Enabled · template active', leaderboard: 'Enabled', physicalRewards: 'Disabled', waiver: 'Version 1 configured' },
    lifecycle: { eyebrow: 'Next action', title: 'Ready for review', description: 'Ready.', action: { label: 'Submit for Review', href: '/organizer/events/event-1/status', method: 'post', nextStatus: 'pending_review' } },
    mediaItems: [], galleryItems: [],
    tools: [
      { group: 'Recognition', items: [{ label: 'Certificates', href: '/certificate', icon: 'award' }, { label: 'Badges', href: '/badges', icon: 'badge-check' }] },
      { group: 'Commerce', items: [{ label: 'Shop', href: '/shop', icon: 'shopping-bag' }] },
      { group: 'Publishing', items: [{ label: 'Promote events', href: '/organizer/promote', icon: 'megaphone' }] },
      { group: 'Records', items: [{ label: 'Audit trail', href: '/audit', icon: 'scroll-text' }, { label: 'Clone event', href: '/clone', icon: 'copy-plus' }] }
    ]
  };
  return ejs.render(renderable, {
    title: 'Event Details', event, presentation, eventDetailsHtml: '<p>Rich details</p>', message: null, csrfToken: 'csrf',
    ...overrides
  }, { filename: viewPath });
}

test('event detail compiles and renders the balanced workspace hierarchy', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: viewPath }));
  const html = render();
  assert.match(html, /organizer-event-detail-overview/);
  assert.match(html, /Operational readiness/);
  assert.match(html, /Essential configuration/);
  assert.match(html, /Management Tools/);
  assert.match(html, /Draft -&gt; Pending Review -&gt; Published -&gt; Closed/);
  assert.ok(html.indexOf('organizer-event-detail-overview') < html.indexOf('Essential configuration'));
});

test('header and queue actions are contextual rather than nine equal controls', () => {
  const html = render();
  assert.match(html, />Edit Event</);
  assert.match(html, />Preview</);
  assert.match(html, /href="\/results"/);
  assert.doesNotMatch(html, /href=""[^>]*>[^<]*Payment Reviews/);
  const header = html.slice(html.indexOf('organizer-event-detail-header-actions'), html.indexOf('</nav>', html.indexOf('organizer-event-detail-header-actions')));
  assert.equal((header.match(/<a /g) || []).length, 3);
});

test('secondary configuration and management tools are closed native disclosures', () => {
  const html = render();
  assert.match(html, /<details class="organizer-event-detail-disclosure">/);
  assert.match(html, /<details class="organizer-event-tools">/);
  assert.doesNotMatch(html, /<details class="organizer-event-tools" open/);
  for (const label of ['Certificates', 'Badges', 'Shop', 'Promote events', 'Audit trail', 'Clone event']) assert.match(html, new RegExp(label));
});

test('lifecycle forms use shared accessible confirmation without native confirm', () => {
  const html = render();
  assert.match(html, /data-high-risk-confirm/);
  assert.match(html, /name="nextStatus" value="pending_review"/);
  assert.match(html, /name="_csrf" value="csrf"/);
  assert.doesNotMatch(html, /onsubmit="return confirm|\bconfirm\s*\(/);
});

test('responsive CSS provides balanced desktop, tablet, and mobile layouts', () => {
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 300px/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*\.organizer-event-detail-layout \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test('media dialogs close with Escape and restore their trigger', () => {
  const window = new Window({ url: 'https://hellorun.test/organizer/events/event-1' });
  window.lucide = { createIcons() {} };
  window.document.body.innerHTML = `
    <main><button class="detail-gallery-thumb-btn" data-gallery-index="0" data-gallery-src="/one.webp"><img alt="One"></button></main>
    <div id="organizerGalleryLightbox" class="gallery-lightbox hidden organizer-event-media-dialog" aria-hidden="true">
      <div data-close-lightbox="1"></div><div role="dialog" tabindex="-1"><button id="organizerGalleryCloseBtn">Close</button><button id="organizerGalleryPrevBtn">Prev</button><img id="organizerGalleryLightboxImage"><button id="organizerGalleryNextBtn">Next</button><p id="organizerGalleryLightboxCounter"></p></div>
    </div>`;
  window.eval(script);
  const trigger = window.document.querySelector('.detail-gallery-thumb-btn');
  trigger.focus();
  trigger.click();
  const modal = window.document.getElementById('organizerGalleryLightbox');
  assert.equal(modal.classList.contains('hidden'), false);
  modal.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(modal.classList.contains('hidden'), true);
  assert.equal(window.document.activeElement, trigger);
});
