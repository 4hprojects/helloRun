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
    operationalPhase: {
      key: 'setup', label: 'Event setup', detail: 'Complete required settings.', tone: 'attention',
      milestones: [
        { key: 'registration', label: 'Registration', value: 'Aug 1 – Aug 20', state: 'upcoming' },
        { key: 'activity', label: 'Activity', value: 'Aug 21 – Aug 31', state: 'upcoming' },
        { key: 'submission', label: 'Final submission', value: 'Sep 7', state: 'upcoming' },
        { key: 'closeout', label: 'Closeout', value: 'After Sep 7', state: 'upcoming' }
      ]
    },
    contextualAction: { label: 'View Registrants', href: '/registrants', icon: 'users' },
    metrics: [
      { key: 'registrations', label: 'Registrations', value: 8, href: '/registrants', actionable: true, helper: 'Open roster', icon: 'users-round', tone: 'neutral' },
      { key: 'results', label: 'Result Reviews', value: 2, href: '/results', actionable: true, helper: 'Needs review', icon: 'clipboard-check', tone: 'attention' },
      { key: 'approved', label: 'Approved Results', value: 3, href: '/approved', actionable: true, helper: 'View results', icon: 'badge-check', tone: 'positive' }
    ],
    readinessTasks: [], setupTasks: [], recognitionTasks: [], accumulatedOperations: null,
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
    title: 'Event Details',
    eventDetailsHtml: '<p>Rich details</p>',
    message: null,
    csrfToken: 'csrf',
    ...overrides,
    event: { ...event, ...(overrides.event || {}) },
    presentation: { ...presentation, ...(overrides.presentation || {}) }
  }, { filename: viewPath });
}

test('event detail compiles and renders the balanced workspace hierarchy', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: viewPath }));
  const html = render();
  assert.match(html, /Live operations/);
  assert.match(html, /Event operational timeline/);
  assert.match(html, /organizer-event-detail-overview/);
  assert.match(html, /Current workload/);
  assert.match(html, /2 awaiting review/);
  assert.match(html, /organizer-event-detail-metrics/);
  assert.match(html, /Publishing readiness/);
  assert.match(html, /Essential configuration/);
  assert.match(html, /Management Tools/);
  assert.match(html, /Draft -&gt; Pending Review -&gt; Published -&gt; Closed/);
  assert.ok(html.indexOf('organizer-event-detail-overview') < html.indexOf('Essential configuration'));
});

test('header and queue actions are contextual rather than nine equal controls', () => {
  const html = render();
  assert.match(html, />Edit Event</);
  assert.match(html, />Preview</);
  assert.match(html, />View Registrants</);
  assert.match(html, /href="\/results"/);
  assert.doesNotMatch(html, /href=""[^>]*>[^<]*Payment Reviews/);
  const header = html.slice(html.indexOf('organizer-event-detail-header-actions'), html.indexOf('</nav>', html.indexOf('organizer-event-detail-header-actions')));
  assert.equal((header.match(/<a /g) || []).length, 3);
});

test('published accumulated events foreground progress and recognition follow-up', () => {
  const html = render({
    event: { status: 'published', virtualCompletionMode: 'accumulated_distance' },
    presentation: {
      operationalPhase: {
        key: 'activity_underway', label: 'Activity underway', detail: 'Registration is closed.', tone: 'active',
        milestones: [
          { key: 'registration', label: 'Registration', value: 'Jul 8 – Jul 22', state: 'complete' },
          { key: 'activity', label: 'Activity', value: 'Jul 12 – Jul 25', state: 'current' },
          { key: 'submission', label: 'Final submission', value: 'Aug 8', state: 'upcoming' },
          { key: 'closeout', label: 'Closeout', value: 'After Aug 8', state: 'upcoming' }
        ]
      },
      setupTasks: [],
      recognitionTasks: [
        { key: 'certificate', title: 'Publish a certificate template', impact: 'Template required.', href: '/certificate', action: 'Set up certificate' },
        { key: 'badge', title: 'Generate event badges', impact: 'Badges required.', href: '/badges', action: 'Manage badges' }
      ],
      accumulatedOperations: {
        approvedDistanceLabel: '60.21 km', pendingDistanceLabel: '0 km', rejectedDistanceLabel: '0 km',
        approvedActivityCount: 7, pendingActivityCount: 0, rejectedActivityCount: 0, missingGoalCount: 0
      },
      lifecycle: { eyebrow: 'Current state', title: 'Event is live', description: 'Live.', action: { label: 'View public page', href: '/events/balanced-event', method: 'get' } }
    }
  });
  assert.match(html, /Activity underway/);
  assert.match(html, /Approved and pending progress/);
  assert.match(html, /60\.21 km/);
  assert.match(html, /7 activities/);
  assert.match(html, /Recognition readiness/);
  assert.match(html, /Set up certificate/);
  assert.match(html, /Manage badges/);
  assert.doesNotMatch(html, /Publishing readiness/);
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
  assert.match(css, /\.organizer-event-detail-metrics[^}]*grid-template-columns: repeat\(auto-fit, minmax\(150px, 1fr\)\)/);
  assert.match(css, /\.organizer-event-phase-milestones[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*\.organizer-event-detail-layout \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.organizer-event-detail-metrics \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
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
