'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('cards and status callouts do not use colored left-edge accents', () => {
  const checks = [
    ['src/public/css/run-proof-modal.css', /\.run-proof-submit-review-notice\s*\{[^}]*border-left/],
    ['src/public/css/style.css', /\.(?:high-risk-confirm-warning|workflow-incident-summary)\s*\{[^}]*border-left/],
    ['src/public/css/email-verification.css', /\.(?:auth-info|alert|alert-success|alert-error|alert-warning|alert-info)\s*\{[^}]*border-left/],
    ['src/public/css/event-manage.css', /\.admin-audit-signal[^\{]*\{[^}]*border-left/],
    ['src/public/css/my-registrations.css', /\.(?:my-reg-guidance|my-reg-rejection)\s*\{[^}]*border-left/],
    ['src/public/css/create-event.css', /\.form-section-admin-promotion\s*\{[^}]*border-left/],
    ['src/public/css/verify-email-sent.css', /\.steps-list li\s*\{[^}]*border-left/],
    ['src/public/css/about.css', /\.about-operator-story\s*\{[^}]*border-left/],
    ['src/public/css/admin.css', /\.(?:action-card-link|action-watch-card|admin-audit-signal)[^\{]*\{[^}]*border-left/],
    ['src/public/css/how-it-works.css', /\.how-review-note\s*\{[^}]*border-left/],
    ['src/public/css/organizer-dashboard.css', /\.(?:pce-modal-limitations|pce-modal-requirements|pce-modal-agree-row)\s*\{[^}]*border-left/],
    ['src/public/css/events.css', /\.toast\s*\{[^}]*border-left/],
    ['src/public/css/runner-submissions.css', /\.(?:sub-card|sub-review-notes|sub-entry-cell|sub-history-row|sub-rejection-guidance)[^\{]*\{[^}]*border-left/],
    ['src/public/css/runner-submissions.css', /#subTableWrap[^\{]*\{[^}]*border-left/],
    ['src/public/css/runner-dashboard.css', /\.(?:onboarding-welcome-banner|dashboard-profile-nudge|runner-compact-activity-row|runner-next-action-card)[^\{]*\{[^}]*border-left/],
    ['src/public/css/complete-profile.css', /\.status-card[^\{]*\{[^}]*border-left/]
  ];

  for (const [file, pattern] of checks) {
    assert.doesNotMatch(read(file), pattern, `${file} should not restore a card status stripe`);
  }

  assert.doesNotMatch(read('src/views/organizer/create-event.ejs'), /schedule-onsite-callout[^>]*border-left/);
  assert.doesNotMatch(read('src/views/auth/resend-verification.ejs'), /\.alert(?:-[a-z]+)?\s*\{[^}]*border-left/);
});

test('status remains visible through badges, text, and background treatments', () => {
  const registrations = read('src/public/css/my-registrations.css');
  const submissions = read('src/public/css/runner-submissions.css');
  const dashboard = read('src/views/runner/partials/dashboard-next-action.ejs');

  assert.match(registrations, /\.my-reg-state-rejected\s*\{[^}]*background:/);
  assert.match(registrations, /\.my-reg-state-approved\s*\{[^}]*background:/);
  assert.match(submissions, /\.sub-review-state-rejected\s*\{[^}]*background:/);
  assert.match(submissions, /\.sub-review-state-approved\s*\{[^}]*background:/);
  assert.match(dashboard, /class="badge badge-<%= item\.stateTone %>"/);
});

test('neutral structural separators and navigation indicators remain intact', () => {
  assert.match(read('src/public/css/my-registrations.css'), /\.my-reg-action-panel\s*\{[^}]*border-left:\s*1px solid var\(--reg-line\)/);
  assert.match(read('src/public/css/how-it-works.css'), /\.how-lane \+ \.how-lane\s*\{[^}]*border-left:\s*1px solid var\(--how-line\)/);
  assert.match(read('src/public/css/event-details.css'), /\.event-hero-panel-registration\s*\{[^}]*border-left:\s*1px solid #d9e2ef/);
  assert.match(read('src/public/css/blog-pages.css'), /a\[aria-current="location"\]\s*\{[^}]*border-left:\s*2px solid var\(--accent-dark\)/);
});
