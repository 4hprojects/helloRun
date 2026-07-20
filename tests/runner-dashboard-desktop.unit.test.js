'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dashboard renders one canonical journey before compact supporting content', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  const journey = read('src/views/runner/partials/dashboard-active-journey.ejs');

  assert.match(dashboard, /dashboard-hero/);
  assert.match(dashboard, /dashboard-header/);
  assert.match(dashboard, /btn-outline-light/);
  assert.match(dashboard, /data-run-proof-surface="runner-dashboard-header"/);
  assert.match(dashboard, /heroJourney\?\.nextAction/);
  assert.match(dashboard, /heroAction\?\.label \|\| 'Browse Events'/);
  assert.match(dashboard, /href="\/my-registrations"[^>]*aria-label="My Registrations"/);
  assert.match(dashboard, /dashboard-profile-avatar/);
  assert.match(dashboard, /dashboard-profile-initials/);
  assert.match(dashboard, /onerror="this\.hidden=true;"/);
  assert.match(dashboard, /class="dashboard-profile-name" href="<%= dashboardIdentity\.profileUrl %>"/);
  assert.doesNotMatch(dashboard, /aria-label="My Profile" title="My Profile"/);
  assert.equal((dashboard.match(/<h1\b/g) || []).length, 1);
  assert.match(journey, /Active event journey/);
  assert.match(journey, /runnerDashboardPresentation\.primaryJourney/);
  assert.match(journey, /runnerDashboardPresentation\.secondaryJourneys/);
  assert.ok(dashboard.indexOf("dashboard-active-journey") < dashboard.indexOf("dashboard-summary"));
  assert.ok(dashboard.indexOf("dashboard-summary") < dashboard.indexOf('dashboard-support-grid'));
  assert.doesNotMatch(dashboard, /dashboard-next-action|dashboard-upcoming|dashboard-discover|dashboard-saved-events|dashboard-missed-submissions/);
  assert.doesNotMatch(dashboard, /Sign-in method/);
});

test('canonical journey owns event state, progress, deadline, and one contextual action', () => {
  const partial = read('src/views/runner/partials/dashboard-active-journey.ejs');
  assert.match(partial, /journey\.stateLabel/);
  assert.match(partial, /journey\.helperText/);
  assert.match(partial, /role="progressbar"/);
  assert.match(partial, /aria-valuenow/);
  assert.match(partial, /Remaining/);
  assert.match(partial, /Awaiting review/);
  assert.match(partial, /Submit by/);
  assert.match(partial, /data-open-run-proof-modal/);
  assert.match(partial, /journey\.nextAction\.type === 'download_certificate'/);
});

test('canonical journey uses compact desktop and stacked mobile layouts', () => {
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(css, /\.runner-canonical-journey\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(245px, \.36fr\)/);
  assert.match(css, /\.dashboard-support-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.dashboard-tools \.dashboard-secondary-links\s*\{[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.dashboard-support-grid,[\s\S]*?\.kpi-grid-primary \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.runner-canonical-action\s*\{[\s\S]*?border-left: 1px solid var\(--border\)/);
});

test('dashboard exposes three primary snapshot metrics and subdued linked metrics', () => {
  const summary = read('src/views/runner/partials/dashboard-summary.ejs');
  assert.match(summary, /Active Events/);
  assert.match(summary, /Approved Distance/);
  assert.match(summary, /Pending Review/);
  assert.match(summary, /Completed Events/);
  assert.match(summary, /Certificates/);
  assert.match(summary, /Achievement Points/);
  assert.match(summary, /kpi-grid-primary/);
  const snapshotLinks = summary.match(/<a\b[^>]*>/g) || [];
  assert.equal(snapshotLinks.length, 6);
  assert.equal((summary.match(/\(opens in a new tab\)/g) || []).length, 6);
  for (const link of snapshotLinks) {
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
  }
});

test('dashboard limits safe new-tab navigation to snapshots, certificates, and external sharing', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  const journey = read('src/views/runner/partials/dashboard-active-journey.ejs');
  const summary = read('src/views/runner/partials/dashboard-summary.ejs');
  const recent = read('src/views/runner/partials/dashboard-recent-activity.ejs');
  const achievement = read('src/views/runner/partials/dashboard-latest-achievement.ejs');

  assert.doesNotMatch(dashboard, /target="_blank"/);
  assert.doesNotMatch(recent, /target="_blank"/);
  assert.equal((journey.match(/target="_blank"/g) || []).length, 1);
  assert.match(journey, /nextAction\.type === 'download_certificate'[\s\S]*?target="_blank" rel="noopener noreferrer"/);
  assert.equal((summary.match(/target="_blank"/g) || []).length, 6);
  assert.equal((achievement.match(/target="_blank"/g) || []).length, 5);

  for (const source of [journey, summary, achievement]) {
    const newTabCount = (source.match(/target="_blank"/g) || []).length;
    const safeNewTabCount = (source.match(/target="_blank" rel="noopener noreferrer"/g) || []).length;
    assert.ok(newTabCount > 0);
    assert.equal(safeNewTabCount, newTabCount);
  }
});

test('new-tab dashboard destinations provide a direct dashboard return path', () => {
  for (const file of [
    'src/views/pages/my-registrations.ejs',
    'src/views/runner/submissions.ejs',
    'src/views/runner/partials/profile-main.ejs',
    'src/views/runner/groups.ejs'
  ]) {
    assert.match(read(file), /href="\/runner\/dashboard"/);
  }
});

test('recent activity and latest achievement share one support row', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  const recent = read('src/views/runner/partials/dashboard-recent-activity.ejs');
  const achievement = read('src/views/runner/partials/dashboard-latest-achievement.ejs');
  assert.match(dashboard, /dashboard-support-grid/);
  assert.match(recent, /Recent Activity/);
  assert.match(achievement, /Latest Achievement/);
  assert.match(achievement, /data-certificate-share-menu/);
  assert.match(achievement, /data-copy-cert-url/);
});

test('latest achievement supports balanced certificate, badge, milestone, and empty states', () => {
  const achievement = read('src/views/runner/partials/dashboard-latest-achievement.ejs');
  const render = (latestAchievement) => ejs.render(achievement, { latestAchievement });
  const certificate = render({
    type: 'certificate',
    label: 'Certificate Ready',
    title: 'A very long event title that must remain readable without escaping the card',
    description: 'Issued today',
    href: '/my-submissions/123/certificate',
    verifyUrl: '/certificates/verify/abc',
    shareUrls: { facebook: '#facebook', x: '#x', linkedin: '#linkedin', text: 'Completed' }
  });
  const certificateWithoutVerification = render({
    type: 'certificate', label: 'Certificate Ready', title: '5K', description: 'Issued today', href: '/certificate', verifyUrl: ''
  });
  const badge = render({
    type: 'badge', label: 'Latest Badge', title: 'Trail Runner', description: 'A new badge', href: '/runner/profile#badges', imageUrl: '/badge.png'
  });
  const milestone = render({
    type: 'milestone', label: 'Next Milestone', title: '100 km', description: '80% complete', href: '/runner/profile#badges'
  });
  const empty = render(null);

  assert.match(certificate, /<article class="card latest-achievement-card">/);
  assert.match(certificate, /latest-achievement-actions--certificate/);
  assert.match(certificate, /latest-achievement-action--primary/);
  assert.equal((certificate.match(/latest-achievement-action--secondary/g) || []).length, 2);
  assert.doesNotMatch(certificateWithoutVerification, /latest-achievement-actions--certificate|data-certificate-share/);
  assert.match(badge, /data-lucide="medal"/);
  assert.match(badge, /onerror="this\.hidden=true;"/);
  assert.doesNotMatch(badge, /target="_blank"/);
  assert.match(milestone, /data-lucide="target"/);
  assert.match(empty, /latest-achievement-empty/);
  assert.match(empty, /Your next achievement starts here/);
});

test('latest achievement CSS prevents clipping and keeps labeled actions balanced', () => {
  const css = read('src/public/css/runner-dashboard.css');

  assert.match(css, /\.latest-achievement-card\s*\{[^}]*grid-template:[^;]*"artwork content"[^;]*"actions actions"/s);
  assert.match(css, /\.latest-achievement-card\s*\{[^}]*overflow: visible/s);
  assert.match(css, /\.latest-achievement-main\s*\{[^}]*min-width: 0/s);
  assert.match(css, /\.latest-achievement-main h3, \.latest-achievement-main p\s*\{[^}]*overflow-wrap: anywhere/s);
  assert.match(css, /\.latest-achievement-actions--certificate\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) auto auto/s);
  assert.match(css, /\.latest-achievement-action\s*\{[^}]*min-height: 2\.75rem/s);
  assert.match(css, /\.latest-achievement-share-menu\s*\{[^}]*max-height:[^;]*100vh/s);
  assert.match(css, /\.latest-achievement-share-menu\s*\{[^}]*overflow-y: auto/s);
  assert.match(css, /\.dashboard-achievement\.is-share-open\s*\{[^}]*z-index: 40/s);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.latest-achievement-actions--certificate\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.latest-achievement-share-menu\s*\{[^}]*bottom: calc\(100% \+ \.5rem\)/);
  assert.doesNotMatch(css, /\.latest-achievement-action span\s*\{[^}]*clip:/s);
});

test('runner tools replace expanded dashboard discovery and archives', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  for (const label of ['Submission History', 'Achievements', 'Running Groups', 'Saved &amp; New Events', 'Registration History']) {
    assert.match(dashboard, new RegExp(label));
  }
  assert.match(dashboard, /runnerDashboardPresentation\.toolCounts/);
});

test('runner mobile navigation keeps the five task-oriented destinations', () => {
  const nav = read('src/views/layouts/nav.ejs');
  assert.match(nav, />Home</);
  assert.match(nav, />Events</);
  assert.match(nav, /data-run-proof-surface="runner-mobile-nav"/);
  assert.match(nav, />Progress</);
  assert.match(nav, />Profile</);
});

test('dashboard has visible focus, reduced motion, and 44px compact controls', () => {
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(css, /focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.header-buttons\s*\{[\s\S]*?flex-wrap: nowrap/);
  assert.match(css, /@media \(min-width: 981px\) and \(max-width: 1366px\)[\s\S]*?width: 2\.75rem;[\s\S]*?min-height: 2\.75rem/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*?width: 2\.75rem;[\s\S]*?min-height: 2\.75rem/);
  assert.match(css, /overflow: hidden/);
  assert.match(css, /\.dashboard-profile-name:focus-visible/);
  assert.match(css, /\.header-content h1\s*\{[\s\S]*?overflow-wrap: anywhere/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.dashboard-profile-avatar\s*\{[\s\S]*?width: 3rem;[\s\S]*?height: 3rem/);
});

test('dashboard refresh protects focused and expanded canonical interactions', () => {
  const script = read('src/public/js/runner-dashboard.js');
  assert.match(script, /currentRoot\.contains\(document\.activeElement\)/);
  assert.match(script, /details\[open\], \[data-certificate-share-menu\]:not\(\[hidden\]\)/);
  assert.match(script, /if \(focusedInside \|\| interactionOpen\) return/);
});
