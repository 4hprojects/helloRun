'use strict';

// A finish time recorded by a marshal for someone with no HelloRun account.
//
// This used to produce nothing at all — no submission, no ranking, no leaderboard entry —
// and five of the six ways to register produce exactly that participant. The rule now:
// publish the result, withhold only what genuinely names a person, and hand the rest over
// when the registration is claimed with a verified email.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const Submission = require('../src/models/Submission');
const { buildSubmissionUpdate } = require('../src/services/onsite-result-submission.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/onsite-result-submission.service.js');
const submissions = read('src/services/submission.service.js');

test('a submission is identified by its registration, not by its runner', () => {
  // runnerId was `required`, which is what made a guest result impossible to record.
  const submission = new Submission({
    registrationId: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1500000,
    runDate: new Date(),
    proofType: 'manual',
    status: 'approved'
  });
  const invalid = submission.validateSync();
  assert.equal(invalid, undefined, `a runner-less submission must validate: ${invalid && Object.keys(invalid.errors).join(', ')}`);
  assert.equal(submission.runnerId, null);

  // The unique registrationId is the real identity, so re-approving updates rather than duplicating.
  assert.match(service, /One submission per registration is enforced by a unique index/);
});

test('a guest result no longer throws, and says so', () => {
  assert.doesNotMatch(service, /cannot enter results/);
  assert.match(service, /const hasAccount = Boolean\(registration\.userId\)/);
  // buildSubmissionUpdate yields a null runner naturally, without a special case.
  const update = buildSubmissionUpdate({
    registration: { eventId: 'e', userId: null, raceDistance: '5K' },
    event: { slug: 'e' },
    elapsedMs: 1500000,
    distanceKm: 5,
    performedBy: null
  });
  assert.equal(update.runnerId, null);
  assert.equal(update.participationMode, 'onsite');
});

test('ranking runs for everyone; the account-scoped effects do not', () => {
  const effects = submissions.slice(submissions.indexOf('async function applyApprovedSubmissionEffects'));
  const gate = effects.indexOf('if (!submission.runnerId)');
  const ranking = effects.indexOf('syncEventRankingsInBackground');
  const certificate = effects.indexOf('attachCertAndNotifyInBackground');
  const badges = effects.indexOf('evaluateSubmissionAchievementsSafe');

  assert.ok(gate > -1, 'there must be a gate');
  assert.ok(ranking > -1 && ranking < gate, 'ranking must run before the gate');
  assert.ok(certificate > gate, 'the certificate must be behind the gate');
  assert.ok(badges > gate, 'badges must be behind the gate');
  assert.ok(effects.indexOf('invalidateLeaderboardCache') < gate, 'the leaderboard must refresh either way');
});

test('a guest submission is not treated as a broken reference', () => {
  // Throwing filled sync_failures with rows the retry worker could never fix.
  const shadow = read('src/services/submission-shadow.service.js');
  assert.match(shadow, /if \(!appUserId && normalizedSubmission\.runner_user_id\)/);
  assert.match(shadow, /Only a failure when a runner was expected/);
});

test('claiming hands over what the guest could not have', () => {
  assert.match(service, /async function materialiseClaimedRegistration/);
  // The shadow must be awaited first, or the Postgres backfill cannot resolve the user.
  const claim = service.slice(service.indexOf('async function materialiseClaimedRegistration'));
  const sync = claim.indexOf('syncRegistrationPaymentShadow');
  const backfill = claim.indexOf('UPDATE onsite_results');
  assert.ok(sync > -1 && backfill > sync, 'the shadow sync must precede the backfill');
  assert.match(claim, /the same reason\n    \/\/ walk-in registration awaits it/);

  // The onsite rows carry a null runner and would stay null for good.
  for (const table of ['onsite_results', 'check_ins', 'bib_assignments']) {
    assert.match(claim, new RegExp(`UPDATE ${table}`), `${table} must be backfilled`);
    assert.match(claim, new RegExp(`${table}[\\s\\S]*?runner_user_id IS NULL`), `${table} must only fill the empty ones`);
  }

  // It must never fail the claim, which is already recorded and correct. (Asserted on the
  // whole file — the contract is stated in the doc comment above the function.)
  assert.match(service, /Never throws: the claim is already recorded/);
  assert.match(claim, /catch \(error\) \{/);
  assert.match(read('src/services/guest-registration-claim.service.js'), /materialiseClaimedRegistration/);
});

test('the organiser is told the difference, and the guest page no longer lies', () => {
  const routes = read('src/routes/organiser/onsite-operations.js');
  assert.match(routes, /rankedWithoutAccount/);
  assert.match(routes, /certificate and badges arrive when they claim/);

  const page = read('src/views/pages/guest-registration.ejs');
  assert.doesNotMatch(page, /cannot submit results, earn badges or download certificates/);
  assert.match(page, /still counts and appears on the\n\s*leaderboard/);
});

test('the migration relaxes only the submission, and says why', () => {
  const migration = read('src/db/migrations/025_guest_submission_columns.sql');
  assert.match(migration, /ALTER TABLE submissions_core ALTER COLUMN runner_user_id DROP NOT NULL/);
  // The boundary is the design: a certificate names a person.
  assert.doesNotMatch(migration, /ALTER TABLE certificates/);
  assert.doesNotMatch(migration, /ALTER TABLE user_badges/);
  assert.match(migration, /Deliberately NOT relaxed here/);
});
