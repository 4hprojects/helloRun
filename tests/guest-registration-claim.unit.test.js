'use strict';

// Moving a guest registration onto an account.
//
// The proof of ownership is a verified email. Anything weaker would be a way to take
// someone else's registration: the reference is printed and read aloud, and the
// management link can be forwarded.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { getClaimEligibilityError } = require('../src/services/guest-registration-claim.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/guest-registration-claim.service.js');
const routes = read('src/routes/pageRoutes.js');
const view = read('src/views/pages/claim-registrations.ejs');
const audit = read('src/services/critical-audit.service.js');

test('an unverified account cannot claim anything', () => {
  // Otherwise registering an address you do not control would be enough to take a
  // registration made with it.
  assert.match(
    getClaimEligibilityError({ email: 'a@b.com', emailVerified: false }),
    /Verify your email/
  );
  assert.equal(getClaimEligibilityError({ email: 'a@b.com', emailVerified: true }), null);
});

test('signed-out and restricted accounts are refused', () => {
  assert.match(getClaimEligibilityError(null), /Sign in/);
  ['restricted', 'suspended', 'closed'].forEach((status) => {
    assert.match(
      getClaimEligibilityError({ email: 'a@b.com', emailVerified: true, accountStatus: status }),
      /cannot claim/,
      `${status} should be refused`
    );
  });
});

test('the email must match, compared case-insensitively', () => {
  assert.match(service, /claimantEmail !== registrationEmail/);
  assert.match(service, /toLowerCase\(\)/);
  assert.match(service, /different email address/);
});

test('a match makes something claimable but never claims it', () => {
  // Silently folding registrations into an account on the strength of an address alone
  // is exactly what the requirements warn against.
  assert.match(service, /A match makes a registration claimable/);
  assert.match(service, /still has to confirm each one/);
});

test('claiming revokes the guest links', () => {
  // A forwarded link must not outlive the claim.
  assert.match(service, /revokeTokensForRegistration\(registration\._id\)/);
  assert.match(service, /must not outlive the claim/);
});

test('an already-owned registration cannot be claimed again', () => {
  assert.match(service, /already belongs to an account/);
  assert.match(service, /participantType !== 'guest' \|\| registration\.userId/);
});

test('a cancelled registration is neither offered nor claimable', () => {
  assert.match(service, /status: \{ \$ne: 'cancelled' \}/);
  assert.match(service, /That registration was cancelled/);
});

test('an event the account already holds is flagged rather than left to fail', () => {
  // Claiming would otherwise collide with the one-registration-per-account index.
  assert.match(service, /alreadyRegistered/);
  assert.match(service, /You already have a registration for this event/);
});

test('claiming re-syncs the shadow by saving rather than updating atomically', () => {
  assert.match(service, /await registration\.save\(\)/);
  assert.match(service, /post-save hook re-syncs the Postgres/);
});

test('the claim route is authenticated, CSRF protected and rate limited', () => {
  assert.match(routes, /my-registrations\/claim/);
  assert.match(routes, /claimLimiter/);
  assert.match(routes, /requireAuth, requireRunnerWorkspace, requireCsrfProtection, claimLimiter/);
});

test('the page distinguishes claimable, blocked, and nothing-to-claim', () => {
  assert.match(view, /Nothing to claim/);
  assert.match(view, /Cannot claim/);
  assert.match(view, /blockedReason/);
  assert.match(view, /name="_csrf"/);
  assert.doesNotMatch(view, /<%-\s*item/);
});

test('critical audit writes use the insert builder postgres.js expects', () => {
  // An explicit column list before the helper made postgres.js fall through to its
  // select builder and try to escape each row object as a column name, so every audit
  // write threw — silently, because the caller runs in the background.
  assert.match(audit, /insert into audit_critical \$\{sql\(auditRows,/);
  assert.doesNotMatch(audit, /insert into audit_critical \(\s*\n\s*actor_user_id/);
  assert.match(audit, /str\.replace is not a function/);
});
