'use strict';

// The badge half of an approval reversal.
//
// awardEligibleBadges permanently skips any badge that has a revoked row for the same
// runner/badge/event (the hasRevokedBadge anti-gaming guard). So withdrawing a badge on
// reversal would, without care, mean re-approving the entry never gives it back — the
// runner loses it silently and forever. Reversal-driven revocations are therefore marked
// and restored, while deliberate admin revocations keep their permanent block.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const {
  isApprovalReversalRevokeReason,
  APPROVAL_REVERSAL_REVOKE_MARKER,
  revokeBadgesForSubmission,
  restoreBadgesForSubmission
} = require('../src/services/achievement.service');

test('reversal-driven revocations are distinguishable from admin ones', () => {
  assert.ok(isApprovalReversalRevokeReason(`${APPROVAL_REVERSAL_REVOKE_MARKER} duplicate activity`));
  assert.ok(!isApprovalReversalRevokeReason('Runner was found to be cheating'));
  assert.ok(!isApprovalReversalRevokeReason(''));
  assert.ok(!isApprovalReversalRevokeReason(undefined));
  // A marker that appears mid-string is not a reversal; only the prefix counts.
  assert.ok(!isApprovalReversalRevokeReason(`see ${APPROVAL_REVERSAL_REVOKE_MARKER}`));
});

test('both helpers no-op without a database or a submission id', async () => {
  const hadUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.deepEqual(await revokeBadgesForSubmission({ mongoSubmissionId: 'abc' }), []);
    assert.deepEqual(await restoreBadgesForSubmission({ mongoSubmissionId: 'abc' }), []);
  } finally {
    if (hadUrl !== undefined) process.env.DATABASE_URL = hadUrl;
  }
  // With a database but no id there is nothing to act on either.
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://unused';
  assert.deepEqual(await revokeBadgesForSubmission({ mongoSubmissionId: '' }), []);
  assert.deepEqual(await restoreBadgesForSubmission({ mongoSubmissionId: '  ' }), []);
  if (hadUrl === undefined) delete process.env.DATABASE_URL;
});

test('withdrawal targets only the badges this entry earned, and marks the reason', () => {
  const source = read('src/services/achievement.service.js');

  assert.match(source, /WHERE mongo_submission_id = \$\{submissionId\}\s*\n\s*AND verification_status != 'revoked'/);
  assert.match(source, /const markedReason = `\$\{APPROVAL_REVERSAL_REVOKE_MARKER\}/);
  // Goes through the existing revoke path, so the badge audit row is written too.
  assert.match(source, /await revokeUserBadge\(row\.id, \{ performedBy, reason: markedReason \}/);
});

test('restore reinstates only marked rows, never an admin revocation', () => {
  const source = read('src/services/achievement.service.js');

  assert.match(source, /const restorable = rows\.filter\(\(row\) => isApprovalReversalRevokeReason\(row\.revoke_reason\)\)/);
  assert.match(source, /SET verification_status = 'verified', revoke_reason = NULL/);
  // Guarded so a concurrent restore cannot double-apply.
  assert.match(source, /AND verification_status = 'revoked'/);
  assert.match(source, /action: 'badge_restored'/);
});

test('re-approving an entry restores before the normal award pass runs', () => {
  // This is the actual fix for the trap: the badges cannot be re-awarded, only restored,
  // because hasRevokedBadge would skip them.
  const source = read('src/services/achievement.service.js');

  const fn = source.slice(
    source.indexOf('async function evaluateSubmissionAchievements('),
    source.indexOf('async function evaluateOnsiteResultAchievements(')
  );
  const restoreAt = fn.indexOf('restoreBadgesForSubmission');
  const awardAt = fn.indexOf('awardEligibleBadges');
  assert.ok(restoreAt > -1, 'restore must run on approval');
  assert.ok(awardAt > -1, 'award pass must still run');
  assert.ok(restoreAt < awardAt, 'restore must run before the award pass');

  // The anti-gaming guard itself is untouched.
  assert.match(source, /if \(source === 'system_auto_award' && await hasRevokedBadge\(\{/);
});

test('accumulated badges are left to their own recompute', () => {
  // Accumulated progress badges are derived from approved totals and already refreshed by
  // refreshAccumulatedChallengeProgress on every review action, including a rejection.
  // The submission-scoped withdrawal simply matches nothing for them.
  const accumulated = read('src/services/accumulated-activity.service.js');
  assert.match(accumulated, /refreshAccumulatedChallengeProgress\(reviewedActivity\.registrationId/);

  const reversal = read('src/services/approval-reversal.service.js');
  assert.match(reversal, /Accumulated badges are progress-derived/);
});
