'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/admin/dashboard.ejs');
const view = fs.readFileSync(viewPath, 'utf8');
const footerViewPath = path.join(ROOT, 'src/views/layouts/footer.ejs');
const footerView = fs.readFileSync(footerViewPath, 'utf8');
const renderableView = view.replace(/<%-\s*include\([^%]+%>/g, '');

const LEGAL_DOC_HREFS = [
  '/admin/privacy-policy',
  '/admin/terms-and-conditions',
  '/admin/cookie-policy',
  '/admin/data-usage-policy',
  '/admin/refund-and-cancellation-policy',
  '/admin/organiser-terms',
  '/admin/community-guidelines',
  '/admin/acceptable-use-policy'
];

const ADMIN_NAV_HREFS = [
  '/admin/users',
  '/admin/ads',
  '/admin/applications',
  '/admin/blog/reports',
  '/admin/blog/comments',
  '/events',
  '/leaderboard',
  '/admin/reviews?type=payments',
  '/admin/reviews?type=results',
  '/admin/reviews',
  '/admin/events'
];

function baseStats(overrides = {}) {
  return {
    totalUsers: 42,
    totalApplications: 10,
    pendingApplications: 2,
    approvedApplications: 7,
    rejectedApplications: 1,
    totalBlogs: 30,
    pendingBlogs: 3,
    publishedBlogs: 20,
    rejectedBlogs: 4,
    archivedBlogs: 3,
    openBlogReports: 1,
    totalBlogComments: 60,
    removedBlogComments: 5,
    totalEvents: 15,
    draftEvents: 2,
    pendingEventReviews: 1,
    publishedEvents: 12,
    totalRegistrations: 500,
    pendingPaymentReviews: 4,
    pendingPaymentReviewHref: '/admin/reviews?type=payments',
    totalSubmissions: 200,
    approvedSubmissions: 150,
    pendingResultReviews: 3,
    ...overrides
  };
}

function renderDashboard(overrides = {}) {
  const pendingApplicationsList = overrides.pendingApplicationsList !== undefined
    ? overrides.pendingApplicationsList
    : [{
      id: '64f0000000000000000000a1',
      applicationId: 'APP-1001',
      businessName: 'Trailhead Run Club',
      status: 'pending',
      submittedAt: new Date('2026-08-01T00:00:00Z'),
      applicantName: 'Jordan Rivera',
      applicantEmail: 'jordan.rivera@example.test'
    }];

  const draftEventsList = overrides.draftEventsList !== undefined
    ? overrides.draftEventsList
    : [{
      id: '64f0000000000000000000b2',
      title: 'Sunrise 10K',
      status: 'draft',
      updatedAt: new Date('2026-08-05T00:00:00Z'),
      eventStartAt: new Date('2026-09-20T00:00:00Z'),
      organizerName: 'Casey Morgan',
      organizerEmail: 'casey.morgan@example.test',
      actionLabel: 'Open',
      actionHref: '/admin/events/64f0000000000000000000b2'
    }];

  return ejs.render(renderableView, {
    title: 'Admin Dashboard - HelloRun',
    stats: baseStats(overrides.stats),
    pendingApplicationsList,
    draftEventsList
  }, { filename: viewPath });
}

test('admin dashboard template compiles', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: viewPath }));
});

test('admin dashboard renders the full content contract required by the live integration test', () => {
  const html = renderDashboard();

  assert.match(html, /Admin Dashboard/);
  assert.match(html, /Action Center/);
  assert.match(html, /Platform Overview/);
  assert.match(html, /Shop Management/);
  assert.match(html, /Roadmap/);
  assert.match(html, /Pending Organizer Applications/);
  assert.match(html, /Blog Reports/);
  assert.match(html, /Blog Comments/);
  assert.match(html, /Pending Event Reviews/);

  LEGAL_DOC_HREFS.forEach((href) => {
    assert.ok(html.includes(href), `expected legal doc href ${href} to render`);
  });

  ADMIN_NAV_HREFS.forEach((href) => {
    assert.ok(html.includes(href), `expected nav href ${href} to render`);
  });

  assert.match(html, /Trailhead Run Club/);
  assert.match(html, /jordan\.rivera@example\.test/);
  assert.match(html, /\/admin\/applications\/64f0000000000000000000a1/);
  assert.match(html, /\/admin\/events\/64f0000000000000000000b2/);
});

test('platform overview metrics are grouped into bordered dashboard-metric-group wrappers', () => {
  const html = renderDashboard();
  const groupCount = (html.match(/class="dashboard-metric-group"/g) || []).length;
  assert.equal(groupCount, 4, 'expected all four Platform Overview label groups to be wrapped');
});

test('legal and policy documents collapse into a closed-by-default disclosure', () => {
  const html = renderDashboard();
  assert.match(html, /<details class="dashboard-legal-docs-disclosure">/);
  assert.doesNotMatch(html, /<details class="dashboard-legal-docs-disclosure" open>/);

  const detailsMatch = html.match(/<details class="dashboard-legal-docs-disclosure">[\s\S]*?<\/details>/);
  assert.ok(detailsMatch, 'expected the legal docs disclosure block to render');
  const detailsHtml = detailsMatch[0];
  LEGAL_DOC_HREFS.forEach((href) => {
    assert.ok(detailsHtml.includes(href), `expected ${href} inside the legal docs disclosure`);
  });
});

test('admin shortcuts grid uses the compact dashboard-shortcut-grid treatment', () => {
  assert.match(view, /class="quick-link-grid dashboard-shortcut-grid"/);
});

test('dashboard opts into a minimal admin footer, scoped only to this page', () => {
  assert.match(view, /include\('\.\.\/layouts\/footer', \{ minimalFooter: true \}\)/);

  const defaultFooter = ejs.render(footerView, {}, { filename: footerViewPath });
  assert.match(defaultFooter, /Quick Links/);
  assert.doesNotMatch(defaultFooter, /admin-footer-minimal/);

  const minimalFooter = ejs.render(footerView, { minimalFooter: true }, { filename: footerViewPath });
  assert.match(minimalFooter, /admin-footer-minimal/);
  assert.doesNotMatch(minimalFooter, /Quick Links/);
  // Shared elements (cookie consent, back-to-top) still render regardless of the flag.
  assert.match(minimalFooter, /globalBackToTopBtn/);
  assert.match(minimalFooter, /cookie-consent-banner|cookiePreferencesDialog/);
});

test('all-clear state still renders every required section when no queues are pending', () => {
  const html = renderDashboard({
    stats: {
      pendingApplications: 0,
      pendingPaymentReviews: 0,
      pendingResultReviews: 0,
      pendingEventReviews: 0,
      pendingBlogs: 0,
      openBlogReports: 0
    },
    pendingApplicationsList: [],
    draftEventsList: []
  });
  assert.match(html, /All clear/);
  assert.match(html, /All review queues are clear/);
  assert.match(html, /The application queue is clear\./);
  assert.match(html, /No draft events need follow-up right now\./);
});

test('universal search collapses into a closed-by-default disclosure button', () => {
  const html = renderDashboard();

  assert.match(html, /<details class="admin-universal-search-disclosure">/);
  assert.doesNotMatch(html, /<details class="admin-universal-search-disclosure" open>/);

  const detailsMatch = html.match(/<details class="admin-universal-search-disclosure">[\s\S]*?<\/details>/);
  assert.ok(detailsMatch, 'expected the search disclosure block to render');
  const detailsHtml = detailsMatch[0];

  assert.match(detailsHtml, /<summary>/);
  assert.match(detailsHtml, /Find anything/);
  assert.match(detailsHtml, /<label for="dashboardAdminSearch" class="sr-only">Find anything<\/label>/);
  assert.match(detailsHtml, /action="\/admin\/search"/);
  assert.match(detailsHtml, /role="search"/);
  assert.match(detailsHtml, /id="dashboardAdminSearch"/);
  assert.match(detailsHtml, /name="q"/);
  assert.match(detailsHtml, /required/);
  assert.match(detailsHtml, /type="submit">Search</);

  // Opening the disclosure focuses the input, so search feels like one motion.
  assert.match(view, /searchDisclosure\.addEventListener\('toggle'/);
  assert.match(view, /input\.focus\(\)/);
});

test('Action Center and Watchlist cards open in a new tab, other cards do not', () => {
  const actionCardBlocks = view.match(/<a href="[^"]*" class="action-card-link[^"]*"[^>]*>/g) || [];
  assert.equal(actionCardBlocks.length, 6, 'expected all 6 Action Center cards');
  actionCardBlocks.forEach((tag) => {
    assert.match(tag, /target="_blank"/);
    assert.match(tag, /rel="noopener noreferrer"/);
  });

  const watchCardBlocks = view.match(/<a href="[^"]*" class="action-watch-card[^"]*"[^>]*>/g) || [];
  assert.equal(watchCardBlocks.length, 1, 'expected the Draft Events watch card');
  assert.match(watchCardBlocks[0], /target="_blank"/);
  assert.match(watchCardBlocks[0], /rel="noopener noreferrer"/);

  // Scope check: this was an explicit choice, not a blanket change to every card.
  const quickLinkBlocks = view.match(/<a href="[^"]*" class="quick-link-card"[^>]*>/g) || [];
  const legalDocBlocks = view.match(/<a href="[^"]*" class="legal-doc-card"[^>]*>/g) || [];
  assert.ok(quickLinkBlocks.length > 0 && legalDocBlocks.length > 0, 'expected shortcut and legal doc cards to exist');
  [...quickLinkBlocks, ...legalDocBlocks].forEach((tag) => {
    assert.doesNotMatch(tag, /target="_blank"/);
  });
});
