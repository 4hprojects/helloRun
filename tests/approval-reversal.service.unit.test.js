'use strict';

// DB-free unit tests for reversing an approved entry back to rejected.
//
// Approval is not just a status: it issues a certificate, awards badges and publishes a
// ranking. These pin the guards and the unwinding, plus the source-level wiring of the
// pieces that only run against a database.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const {
  reverseSubmissionApproval,
  normalizeReversalReason,
  MIN_REASON_LENGTH,
  MAX_REASON_LENGTH
} = require('../src/services/approval-reversal.service');

test('a reason is required and is length-bounded', async () => {
  // The reason reaches the runner and the audit log, so an empty one is refused before
  // anything is touched.
  for (const reason of [undefined, '', '   ', 'no']) {
    await assert.rejects(
      () => reverseSubmissionApproval({ submissionId: 'x', actorUserId: 'a', actorRole: 'organiser', reason }),
      /reason of at least 5 characters/i,
      `expected refusal for ${JSON.stringify(reason)}`
    );
  }
  assert.equal(MIN_REASON_LENGTH, 5);
  assert.equal(normalizeReversalReason('  duplicate activity  '), 'duplicate activity');
  assert.equal(normalizeReversalReason('x'.repeat(900)).length, MAX_REASON_LENGTH);
});

test('the reason guard runs before any lookup', async () => {
  // A short reason must not reach the database at all; a bogus id is enough to prove it,
  // since a lookup would fail with a different error.
  await assert.rejects(
    () => reverseSubmissionApproval({ submissionId: 'not-an-id', actorUserId: 'a', actorRole: 'admin', reason: 'no' }),
    /reason of at least 5 characters/i
  );
});

test('only approved entries can be reversed', () => {
  const source = read('src/services/approval-reversal.service.js');
  assert.match(source, /if \(String\(record\.status \|\| ''\) !== 'approved'\)/);
  assert.match(source, /Only approved entries can be reversed/);
});

test('access is scoped, and a self-reversal is recorded rather than refused', () => {
  const source = read('src/services/approval-reversal.service.js');
  // Owner, co-organizer or admin — the same helper the review services use.
  assert.match(source, /resolveEventAccess\(\{[\s\S]*?eventId: event\._id/);
  assert.match(source, /Entry not found or inaccessible/);

  // Refusing a self-reversal deadlocked a sole organiser, so it is audited instead.
  assert.doesNotMatch(source, /You cannot reverse your own approved entry/);
  assert.match(source, /const isSelfReview = Boolean\(record\.runnerId\)/);
  assert.match(source, /if \(isSelfReview\) \{[\s\S]*?action: 'submission\.self_reviewed'/);
});

test('the status flip goes through the existing review services', () => {
  // Reusing them keeps shadow sync, progress recalculation and the runner notification
  // on one path instead of duplicating them here.
  const source = read('src/services/approval-reversal.service.js');
  assert.match(source, /reviewAccumulatedActivitySubmission\(\{[\s\S]*?action: 'reject'/);
  assert.match(source, /reviewSubmission\(\{[\s\S]*?action: 'reject'[\s\S]*?allowApprovedReversal: true/);
});

test('reversal unwinds the certificate, badges, ranking and cache', () => {
  const source = read('src/services/approval-reversal.service.js');

  assert.match(source, /revokeIssuedCertificate\(/);
  assert.match(source, /revokeBadgesForSubmission\(/);
  assert.match(source, /deleteRankingEntry\(/);
  assert.match(source, /syncEventRankingsInBackground\(/);
  assert.match(source, /invalidateLeaderboardCache\(event\.slug\)/);

  // The document is re-read after the status flip, so revoking the certificate cannot
  // save a stale copy over it.
  assert.match(source, /const fresh = submissionKind === 'accumulated'/);

  // Each unwind step is individually guarded: a failure to revoke a badge must not leave
  // the entry approved.
  assert.ok((source.match(/catch \(error\) \{/g) || []).length >= 3);
});

test('reversal is audited under its own action, away from the rejection alarm', () => {
  const source = read('src/services/approval-reversal.service.js');
  const audit = read('src/services/critical-audit-query.service.js');

  assert.match(source, /action: 'submission\.approval_reversed'/);
  // What was unwound is recorded, so the audit entry explains itself.
  assert.match(source, /Certificate revoked: \$\{certificateRevoked \? 'yes' : 'no'\}/);
  assert.match(source, /Badges withdrawn: \$\{badgesRevoked\}/);

  // Discoverable in the audit filters...
  assert.match(audit, /submissions: \[[\s\S]*?'submission\.approval_reversed'[\s\S]*?\]/);
  // ...but deliberately not counted as an ordinary rejection by the volume alarm.
  const rejectionActions = audit.match(/const rejectionActions = \[[^\]]*\]/)[0];
  assert.doesNotMatch(rejectionActions, /approval_reversed/);
});

test('ordinary review still treats an approved standard result as final', () => {
  // Reversal is a separate, separately-audited capability. Widening REJECTABLE_STATUS
  // would have let the normal review screen silently undo approvals too.
  const source = read('src/services/submission.service.js');

  assert.match(source, /const REJECTABLE_STATUS = new Set\(\['submitted'\]\);/);
  assert.match(source, /allowApprovedReversal = false/);
  assert.match(
    source,
    /const isApprovalReversal = safeAction === 'reject'\s*\n\s*&& submission\.status === 'approved'\s*\n\s*&& allowApprovedReversal === true;/
  );
  assert.match(source, /!REJECTABLE_STATUS\.has\(submission\.status\) && !isApprovalReversal/);
});

test('a reversal is announced to the runner as a withdrawal, not a resubmit request', () => {
  const submission = read('src/services/submission.service.js');
  const accumulated = read('src/services/accumulated-activity.service.js');

  assert.match(submission, /notifyWithRetry\('result\.approval_reversed'/);
  assert.match(submission, /is no longer approved/);
  assert.match(accumulated, /'result\.approval_reversed'/);
  assert.match(accumulated, /no longer counts toward your total/);

  // notify() throws for an unregistered key, so all three wiring points must exist.
  assert.match(read('src/services/communication-events.registry.js'), /eventKey: 'result\.approval_reversed'/);
  const communication = read('src/services/communication.service.js');
  assert.match(communication, /if \(eventKey === 'result\.approval_reversed'\)/);
  assert.match(communication, /'result\.approval_reversed': `Approved Result Withdrawn/);
  assert.match(read('src/services/email.service.js'), /exports\.sendApprovalReversedEmailToRunner = async/);
});

test('an accumulated approval reversal is labelled as one, not as a plain rejection', () => {
  // 'approved' was already in REJECTABLE_STATUS here, so the change is in how it is
  // reported rather than whether it is allowed.
  const accumulated = read('src/services/accumulated-activity.service.js');
  assert.match(accumulated, /const REJECTABLE_STATUS = new Set\(\['submitted', 'approved', 'needs_clarification'\]\);/);
  assert.match(accumulated, /const isApprovalReversal = safeAction === 'reject' && activity\.status === 'approved';/);
  assert.match(accumulated, /isApprovalReversal \? 'submission\.approval_reversed' : auditActionByAction\[safeAction\]/);
});

test('the shared certificate revoke helper is used by both callers', () => {
  const helper = read('src/services/certificate-revocation.service.js');
  const controller = read('src/controllers/certificate.controller.js');
  const reversal = read('src/services/approval-reversal.service.js');

  // No certificate to withdraw is a normal outcome, not an error.
  assert.match(helper, /if \(!record\?\.certificate\?\.url\) \{\s*\n\s*return \{ revoked: false/);
  // Revoking twice must not rewrite revokedAt or re-audit.
  assert.match(helper, /if \(String\(record\.certificate\.status \|\| ''\) === 'revoked'\)/);
  assert.match(helper, /action: 'certificate\.revoked'/);

  assert.match(controller, /revokeIssuedCertificate\(/);
  assert.match(reversal, /revokeIssuedCertificate\(/);
  // The controller no longer hand-writes the fields.
  assert.doesNotMatch(controller, /context\.record\.certificate\.status = 'revoked'/);
});

test('the ranking row is deleted, because the recompute only ever writes', () => {
  const ranking = read('src/services/ranking.service.js');
  assert.match(ranking, /async function deleteRankingEntry\(/);
  assert.match(ranking, /DELETE FROM rankings\s*\n\s*WHERE mongo_submission_id =/);
  assert.match(ranking, /\n  deleteRankingEntry,/);
});
