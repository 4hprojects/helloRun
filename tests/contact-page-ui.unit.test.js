'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/pages/contact.ejs');
const viewSource = fs.readFileSync(viewPath, 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'src/public/css/contact-page.css'), 'utf8');
const routesSource = fs.readFileSync(path.join(ROOT, 'src/routes/pageRoutes.js'), 'utf8');
const controllerSource = fs.readFileSync(path.join(ROOT, 'src/controllers/page/home.controller.js'), 'utf8');
const {
  CONTACT_TOPICS,
  DEFAULT_SUPPORT_EMAIL,
  PRIVACY_EMAIL,
  buildContactPresentation,
  normalizeContactSource,
  normalizeContactTopic
} = require('../src/services/contact-page-presentation.service');
const { buildMailDraft, normalizeDescription, normalizeSingleLine } = require('../src/public/js/contact-page');

test('contact template compiles and follows the task-first hierarchy', () => {
  assert.doesNotThrow(() => ejs.compile(viewSource, { filename: viewPath }));
  assert.equal((viewSource.match(/<h1\b/g) || []).length, 1);
  assert.match(viewSource, /How can we help\?/);
  assert.match(viewSource, /id="contactComposer"/);
  assert.ok(viewSource.indexOf('contact-composer-card') < viewSource.indexOf('contact-support-rail'));
  assert.doesNotMatch(viewSource, /General Support|Runner Support|Payment or Registration Concerns/);
});

test('presentation normalizes source, inboxes, topics, and authenticated identity', () => {
  assert.equal(CONTACT_TOPICS.length, 8);
  assert.deepEqual(new Set(CONTACT_TOPICS.map((topic) => topic.value)).size, 8);
  assert.equal(normalizeContactSource('organizer-dashboard'), 'organizer-dashboard');
  assert.equal(normalizeContactSource('organizer-dashboard<script>'), '');
  assert.equal(normalizeContactTopic('privacy_data'), 'privacy_data');
  assert.equal(normalizeContactTopic('privacy_data<script>'), '');

  const organizer = buildContactPresentation({
    locals: { isAuthenticated: true, isOrganizer: true, user: { email: 'ORGANIZER@EXAMPLE.COM' } },
    source: 'organizer-dashboard',
    supportEmail: 'SUPPORT@EXAMPLE.COM'
  });
  assert.equal(organizer.supportEmail, 'support@example.com');
  assert.equal(organizer.privacyEmail, PRIVACY_EMAIL);
  assert.equal(organizer.selectedTopic, 'organizer_tools');
  assert.equal(organizer.actor.role, 'Organizer');
  assert.equal(organizer.actor.email, 'organizer@example.com');
  assert.ok(organizer.actions.some((action) => action.href === '/organizer/dashboard'));

  const invalid = buildContactPresentation({ supportEmail: 'not-an-email', source: 'other' });
  assert.equal(invalid.supportEmail, DEFAULT_SUPPORT_EMAIL);
  assert.equal(invalid.source, '');
  assert.equal(invalid.sourceContext, null);

  const privacy = buildContactPresentation({ topic: 'privacy_data' });
  assert.equal(privacy.selectedTopic, 'privacy_data');
  assert.ok(privacy.topics.find((topic) => topic.value === 'privacy_data').selected);
});

test('role-aware recovery links cover guests, runners, organizers, and administrators', () => {
  const guest = buildContactPresentation();
  const runner = buildContactPresentation({ locals: { isAuthenticated: true, user: { email: 'runner@example.com' } } });
  const organizer = buildContactPresentation({ locals: { isAuthenticated: true, isApprovedOrganizer: true } });
  const admin = buildContactPresentation({ locals: { isAuthenticated: true, isAdmin: true } });

  assert.ok(guest.actions.some((action) => action.href === '/events'));
  assert.ok(runner.actions.some((action) => action.href === '/my-registrations'));
  assert.ok(runner.actions.some((action) => action.href === '/runner/submissions'));
  assert.ok(organizer.actions.some((action) => action.href === '/organizer/dashboard'));
  assert.ok(admin.actions.some((action) => action.href === '/admin/dashboard'));
});

test('composer exposes labeled native fields, local-only guidance, and direct fallback inboxes', () => {
  for (const id of ['contactTopic', 'contactAccountEmail', 'contactReference', 'contactContext', 'contactDescription']) {
    assert.match(viewSource, new RegExp(`(?:for|id)="${id}"`));
  }
  assert.match(viewSource, /maxlength="1000" required/);
  assert.match(viewSource, /data-contact-count>0 \/ 1000/);
  assert.match(viewSource, /Open email draft/);
  assert.match(viewSource, /has not been sent yet|does not receive this information until you send/i);
  assert.match(viewSource, /mailto:<%= contactPresentation\.supportEmail %>/);
  assert.match(viewSource, /mailto:<%= contactPresentation\.privacyEmail %>/);
  assert.match(viewSource, /Do not email passwords, identity documents, payment records, or activity proof/);
  assert.doesNotMatch(viewSource, /ad-slot|adsense|run-proof-modal-dialog/i);
});

test('mail drafts route by topic and encode bounded structured content', () => {
  const privacy = buildMailDraft({
    supportEmail: 'support@example.com',
    privacyEmail: 'privacy@example.com',
    inbox: 'privacy',
    topicLabel: 'Privacy or account data',
    subjectLabel: 'Privacy request\r\nBcc: attacker@example.com',
    accountEmail: 'runner@example.com',
    context: 'July Quest',
    reference: 'REG-123',
    description: 'Please correct my account record.',
    actorRole: 'Runner',
    source: 'not-allowlisted'
  });
  assert.equal(privacy.recipient, 'privacy@example.com');
  assert.doesNotMatch(privacy.subject, /\r|\n/);
  assert.match(privacy.body, /Account email: runner@example\.com/);
  assert.match(privacy.body, /Reference code: REG-123/);
  assert.doesNotMatch(privacy.body, /Opened from:/);
  assert.match(decodeURIComponent(privacy.href), /Issue and requested outcome:/);

  const support = buildMailDraft({
    supportEmail: 'support@example.com',
    privacyEmail: 'privacy@example.com',
    inbox: 'support',
    topicLabel: 'Organizer support',
    description: 'x'.repeat(1200),
    source: 'organizer-dashboard'
  });
  assert.equal(support.recipient, 'support@example.com');
  assert.match(support.body, /Opened from: Organizer dashboard/);
  assert.equal(normalizeDescription('x'.repeat(1200)).length, 1000);
  assert.equal(normalizeSingleLine('Hello\r\nWorld'), 'Hello World');
});

test('contact route uses controller-owned deterministic presentation', () => {
  assert.match(routesSource, /router\.get\('\/contact', pageController\.getContact\)/);
  assert.match(controllerSource, /buildContactPresentation\(\{[\s\S]*source: req\.query\.source,[\s\S]*topic: req\.query\.topic,[\s\S]*supportEmail: process\.env\.ADMIN_EMAIL/);
  assert.match(controllerSource, /Contact HelloRun Support \| Runner and Organizer Help/);
});

test('contact styles provide compact responsive, focus, zoom, and reduced-motion behavior', () => {
  assert.match(cssSource, /\.contact-layout\s*\{[\s\S]*grid-template-columns:/);
  assert.match(cssSource, /min-height:\s*44px/);
  assert.match(cssSource, /:focus-visible/);
  assert.match(cssSource, /@media \(max-width: 900px\)[\s\S]*\.contact-layout\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(cssSource, /@media \(max-width: 620px\)[\s\S]*\.contact-composer\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(cssSource, /@media \(max-width: 360px\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /overflow-x:\s*clip/);
});
