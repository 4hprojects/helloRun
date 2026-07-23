'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/organizer/dashboard.ejs');
const view = fs.readFileSync(viewPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/organizer-dashboard.css'), 'utf8');
const script = fs.readFileSync(path.join(ROOT, 'src/public/js/organizer-dashboard.js'), 'utf8');
const route = fs.readFileSync(path.join(ROOT, 'src/routes/organiser/dashboard.js'), 'utf8');
const renderableView = view.replace(/<%-\s*include\([^%]+%>/g, '');

function renderDashboard(overrides = {}) {
  const user = {
    firstName: 'Long Running', lastName: 'Organizer', email: 'organizer@example.test',
    organizerStatus: 'approved', emailVerified: true, ...overrides.user
  };
  return ejs.render(renderableView, {
    title: 'Organizer Dashboard', user, isApprovedOrganizer: user.organizerStatus === 'approved',
    approvedDate: 'July 22, 2026', utilitiesOpen: false, application: null,
    applicationAction: { href: '/organizer/application-status', label: 'View Application Status' },
    analytics: {
      range: '30d', rangeLabel: 'Last 30 days', registrationsInRange: 12,
      submissionsInRange: 8, approvalsInRange: 6,
      trends: {
        registrations: { direction: 'up', label: '+3 vs Previous 30 days' },
        submissions: { direction: 'flat', label: '0 vs Previous 30 days' },
        approvals: { direction: 'down', label: '-1 vs Previous 30 days' }
      }
    },
    stats: { totalEvents: 2, activeEvents: 1, upcomingEvents: 1, totalRegistrations: 12 },
    reviewQueue: {
      pendingPaymentReviews: 2, pendingResultReviews: 1, unpaidRegistrations: 0,
      byEvent: [{
        eventId: 'event-1', eventTitle: 'A Very Long Community Event Name', paymentPending: 2,
        resultPending: 1, totalPending: 3, paymentHref: '/payments', resultHref: '/results'
      }],
      topEvents: {
        registrations: [{ href: '/registrants', eventTitle: 'Sample Event', count: 12 }],
        approvals: [], pending: []
      }
    },
    draftEvents: [],
    recentEvents: [{
      id: 'event-1', name: 'Sample Event', date: new Date('2026-08-24T00:00:00Z'),
      location: 'Virtual event', status: 'published', registrations: 12,
      pendingRunProofSubmissions: 1, bannerImageUrl: '', logoUrl: ''
    }],
    organiserBadges: [],
    quickActions: [
      { icon: 'plus-circle', label: 'Create Event', href: '/organizer/create-event', description: 'Create' },
      { icon: 'calendar', label: 'My Events', href: '/organizer/events', description: 'Manage' },
      { icon: 'clipboard-list', label: 'All Run Submissions', href: '/organizer/submissions', description: 'Review' }
    ],
    locals: { csrfToken: 'csrf-token' },
    ...overrides,
    user
  }, { filename: viewPath });
}

test('organiser dashboard template compiles and leads with analytics', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: viewPath }));
  const analyticsIndex = view.indexOf('organizer-analytics');
  const operationsIndex = view.indexOf('organizer-operations');
  const eventsIndex = view.indexOf('organizer-events-section');
  assert.ok(analyticsIndex > 0);
  assert.ok(operationsIndex > analyticsIndex);
  assert.ok(eventsIndex > operationsIndex);
  assert.match(view, /Analytics overview/);
  assert.match(view, /organizer-primary-metrics/);
  assert.match(view, /organizer-lifetime-strip/);
  assert.match(view, /Top Events/);
});

test('approved and unapproved dashboard branches render with complete presentation data', () => {
  const approved = renderDashboard();
  assert.match(approved, /Analytics overview/);
  assert.match(approved, /A Very Long Community Event Name/);
  assert.match(approved, /Review Results/);

  const unapproved = renderDashboard({
    user: { organizerStatus: 'not_applied' },
    applicationAction: { href: '/organizer/complete-profile', label: 'Start Organizer Application' },
    utilitiesOpen: true
  });
  assert.match(unapproved, /Application Not Started/);
  assert.match(unapproved, /Start Organizer Application/);
  assert.doesNotMatch(unapproved, /Analytics overview/);
  assert.match(unapproved, /organizer-dashboard-card organizer-utilities" open/);
});

test('review work and navigation are consolidated without duplicate next-review controls', () => {
  assert.equal((view.match(/<h3><i data-lucide="inbox"[^>]*><\/i>Review Queue<\/h3>/g) || []).length, 1);
  assert.doesNotMatch(view, /Open Next Pending Payment|Open Next Pending Result|review-queue-card/);
  assert.match(view, /organizer-operations-grid/);
  assert.match(view, /organizer-queue-actions/);
  assert.match(view, /organizer-drafts-card/);
  assert.doesNotMatch(view, /Banner URL|Logo URL/);
  assert.match(view, />Manage</);
  assert.match(view, />Registrants</);
  assert.match(view, />Review Results/);
});

test('quick actions are reduced to the three approved organiser destinations', () => {
  const approvedActions = route.match(/const quickActions = isApprovedOrganizer[\s\S]*?: \[/)?.[0] || '';
  assert.match(approvedActions, /Create Event/);
  assert.match(approvedActions, /My Events/);
  assert.match(approvedActions, /All Run Submissions/);
  assert.doesNotMatch(approvedActions, /label: 'Participants'|label: 'Settings'/);
});

test('supporting content uses one native utilities disclosure with an intentional default state', () => {
  assert.match(view, /<details class="organizer-dashboard-card organizer-utilities"/);
  assert.match(view, /utilitiesOpen \? 'open' : ''/);
  assert.match(view, /Organizer tools &amp; account/);
  assert.match(view, /id="gettingStartedChecklist"/);
  assert.match(route, /utilitiesOpen: !isApprovedOrganizer \|\| totalEvents === 0 \|\| totalRegistrations === 0/);
});

test('responsive dashboard keeps compact metric and action grids at mobile widths', () => {
  assert.match(css, /\.organizer-primary-metrics\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.organizer-lifetime-strip\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.organizer-event-actions[^}]*font-size: \.64rem/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('dashboard script provides safe icons and accessible modal behavior', () => {
  assert.match(view, /src="\/js\/organizer-dashboard\.js"/);
  assert.match(script, /if \(!window\.lucide\) return/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.match(script, /event\.key !== 'Tab'/);
  assert.match(script, /returnFocus\.focus\(\)/);
  assert.match(script, /if \(submitting\)/);
  assert.match(script, /signature must exactly match/i);
});

test('non-approved organisers receive a focused application workspace', () => {
  assert.match(view, /organizer-application-workspace/);
  assert.match(view, /applicationAction\.label/);
  assert.match(view, /data-pending-create-event-trigger/);
  assert.match(view, /Limited event access/);
});

test('pending organiser modal validates, traps focus, closes, and restores its trigger', async () => {
  const window = new Window({ url: 'https://hellorun.test/organizer/dashboard' });
  window.requestAnimationFrame = (callback) => callback();
  window.document.body.innerHTML = `
    <button type="button" id="trigger" data-pending-create-event-trigger>Create</button>
    <div id="pendingCreateEventModal" data-account-name="Sample Organizer" hidden>
      <div class="pce-modal-card" tabindex="-1">
        <button type="button" id="pceModalClose">Close</button>
        <form id="pceAckForm">
          <input id="pceAgreeCheckbox" type="checkbox">
          <input id="pceSignatureName" type="text">
          <p id="pceValidationMsg" hidden></p>
          <button type="button" data-pce-cancel>Cancel</button>
          <button type="submit" id="pceModalConfirmBtn" disabled>Confirm</button>
        </form>
      </div>
    </div>`;
  window.eval(script);

  const trigger = window.document.getElementById('trigger');
  const modal = window.document.getElementById('pendingCreateEventModal');
  const checkbox = window.document.getElementById('pceAgreeCheckbox');
  const signature = window.document.getElementById('pceSignatureName');
  const confirm = window.document.getElementById('pceModalConfirmBtn');

  trigger.focus();
  trigger.click();
  assert.equal(modal.hidden, false);
  assert.equal(window.document.activeElement.id, 'pceModalClose');

  checkbox.checked = true;
  checkbox.dispatchEvent(new window.Event('change', { bubbles: true }));
  signature.value = 'Sample Organizer';
  signature.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(confirm.disabled, false);
  assert.equal(signature.getAttribute('aria-invalid'), 'false');

  modal.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await window.happyDOM.whenAsyncComplete();
  assert.equal(modal.hidden, true);
  assert.equal(window.document.activeElement, trigger);
});
