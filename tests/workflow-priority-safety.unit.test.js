const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('shared high-risk confirmation exposes target, impact, reversibility, and privilege', () => {
  const source = read('src/public/js/main.js');
  for (const field of ['Target', 'Impact', 'Reversibility', 'Required access']) {
    assert.match(source, new RegExp(`<dt>${field}<`));
  }
  assert.match(source, /form\.dataset\.highRiskConfirmed/);
  assert.match(source, /form\.reportValidity\(\)/);
  assert.match(source, /Submitting\.\.\./);
});

test('high-risk admin and organizer surfaces opt into governed confirmation', () => {
  const expected = [
    ['src/views/admin/user-detail.ejs', 'Confirm account status change'],
    ['src/views/admin/application-details.ejs', 'Approve organizer application'],
    ['src/views/admin/submissions.ejs', 'Reject selected submissions'],
    ['src/views/admin/badges.ejs', 'Revoke badge award'],
    ['src/views/admin/promote.ejs', 'Send event promotion'],
    ['src/views/admin/privacy-policy-list.ejs', 'Publish policy version'],
    ['src/views/organizer/event-promote.ejs', 'Send event promotion'],
    ['src/views/organizer/payment-proof-review.ejs', 'Approve selected payment proofs']
  ];
  for (const [file, title] of expected) {
    const source = read(file);
    assert.match(source, /data-high-risk-confirm/);
    assert.ok(source.includes(title), `${file} should describe ${title}`);
  }
});

test('user deletion and submission correction require reasons and write them to audit context', () => {
  const users = read('src/controllers/admin/users.controller.js');
  const submissionController = read('src/controllers/admin/submissions.controller.js');
  const submissionService = read('src/services/submission.service.js');
  assert.match(users, /deletion reason of at least 8 characters is required/i);
  assert.match(users, /Reason: \$\{reason\}/);
  assert.match(submissionController, /correctionReason: req\.body\.correctionReason/);
  assert.match(submissionService, /correction reason of at least 10 characters is required/i);
  assert.match(submissionService, /auditReference/);
});

test('support admins see full-admin restrictions before server enforcement', () => {
  const auth = read('src/middleware/auth.middleware.js');
  const nav = read('src/views/layouts/nav.ejs');
  const main = read('src/public/js/main.js');
  assert.match(auth, /res\.locals\.isFullAdmin/);
  assert.match(nav, /data-admin-tier/);
  assert.match(main, /Requires full admin access/);
  assert.match(main, /fullAdminPatterns/);
});

test('payment bulk approval preserves queue context and reports partial outcomes', () => {
  const route = read('src/routes/organiser/review.js');
  const view = read('src/views/organizer/payment-proof-review.ejs');
  assert.match(route, /returnStatus/);
  assert.match(route, /buildReturnHref/);
  assert.match(route, /succeeded/);
  assert.match(route, /failed/);
  assert.match(view, /reduce selection to 50/);
  assert.match(view, /data-confirm-target/);
});
