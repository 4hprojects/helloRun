'use strict';

// Self-review is permitted and recorded, not blocked.
//
// Blocking it deadlocked a sole organiser: with no co-organiser, and a submission that is
// not auto-approvable, nobody could approve their entry except an admin navigating to the
// organiser-side review form. The block is replaced by an extra audit row so the oversight
// is retained without the deadlock.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const SERVICES = [
  ['src/services/submission.service.js', 'submission'],
  ['src/services/accumulated-activity.service.js', 'activity'],
  ['src/services/approval-reversal.service.js', 'record']
];

test('the self-review block is gone from every review path', () => {
  for (const [file] of SERVICES) {
    const source = read(file);
    assert.doesNotMatch(source, /You cannot review your own/, file);
    assert.doesNotMatch(source, /You cannot reverse your own/, file);
    assert.doesNotMatch(source, /Ask a co-organizer or an admin/, file);
  }
});

test('each review path detects a self-review instead', () => {
  for (const [file, subject] of SERVICES) {
    const source = read(file);
    assert.match(source, /const isSelfReview = Boolean\(/, file);
    assert.match(source, new RegExp(`String\\(${subject}\\.runnerId\\)`), file);
  }
});

test('a self-review is detected only when the ids actually match', () => {
  // Mirrors the guard shape: an entry with no runnerId (a guest submission) must never
  // read as a self-review just because the reviewer id is also absent.
  const isSelfReview = (runnerId, actorId) => Boolean(runnerId) && String(runnerId) === String(actorId || '');

  assert.equal(isSelfReview('user-1', 'user-1'), true);
  assert.equal(isSelfReview('user-1', 'user-2'), false);
  assert.equal(isSelfReview(null, null), false);
  assert.equal(isSelfReview(undefined, undefined), false);
  assert.equal(isSelfReview('', ''), false);
  assert.equal(isSelfReview(null, 'user-1'), false);
  assert.equal(isSelfReview('user-1', null), false);
});

test('a self-review writes an extra audit row, guarded on the flag', () => {
  for (const [file] of SERVICES) {
    const source = read(file);
    assert.match(source, /if \(isSelfReview\) \{[\s\S]*?action: 'submission\.self_reviewed'/, file);
  }
});

test('the original approve/reject audit action is untouched', () => {
  // A renamed action would fragment the existing audit filters and the rejection-volume
  // detector, so the self-review row is additive.
  const submission = read('src/services/submission.service.js');
  assert.match(submission, /\? 'submission\.approved'\n\s*: isApprovalReversal \? 'submission\.approval_reversed' : 'submission\.rejected'/);

  const accumulated = read('src/services/accumulated-activity.service.js');
  assert.match(accumulated, /approve: 'submission\.approved',/);
  assert.match(accumulated, /reject: 'submission\.rejected',/);

  const reversal = read('src/services/approval-reversal.service.js');
  assert.match(reversal, /action: 'submission\.approval_reversed'/);
});

test('self-reviews are filterable but do not trip the rejection-volume alarm', () => {
  const audit = read('src/services/critical-audit-query.service.js');

  assert.match(audit, /submissions: \[[\s\S]*?'submission\.self_reviewed'[\s\S]*?\]/);
  const rejectionActions = audit.match(/const rejectionActions = \[[^\]]*\]/)[0];
  assert.doesNotMatch(rejectionActions, /self_reviewed/);
});

test('the reviewer is warned before acting, not after a failed POST', () => {
  // Previously the organiser found out only when the action threw.
  const shared = read('src/routes/organiser/_shared.js');
  const hub = read('src/services/submission-hub.service.js');

  assert.match(shared, /isOwnSubmission: Boolean\(viewerId\)/);
  assert.match(hub, /isOwnSubmission: Boolean\(viewerId\)/);

  for (const file of ['src/views/organizer/run-proof-review.ejs', 'src/views/organizer/submissions.ejs']) {
    assert.match(read(file), /item\.isOwnSubmission/, file);
  }
  const reviewPage = read('src/views/organizer/submission-review.ejs');
  assert.match(reviewPage, /locals\.isOwnSubmission/);
  assert.match(reviewPage, /recorded in the event audit log as a self-review/);
});

test('the viewer id reaches every row builder that reports it', () => {
  const review = read('src/routes/organiser/review.js');
  const admin = read('src/controllers/admin/submissions.controller.js');

  assert.match(review, /buildRunProofReviewRow\(item\.submission, event, filters, item\.submissionKind, user\._id\)/);
  assert.ok((review.match(/viewerId: user\._id/g) || []).length >= 2);
  assert.ok((admin.match(/viewerId: req\.session\.userId/g) || []).length >= 2);
});

test('bulk approve forwards the live reviewer role', () => {
  // Hard-coding 'organiser' would silently downgrade an admin if the 403 gates on the
  // quick/bulk approve routes were ever relaxed.
  const review = read('src/routes/organiser/review.js');
  assert.match(review, /reviewerRole: user\.role,\n\s*action: 'approve',/);
  assert.doesNotMatch(review, /reviewerRole: 'organiser'/);
});

test('payment self-approval stays blocked, which is a separate money control', () => {
  // A sole organiser on a PAID event still cannot approve their own payment. Deliberately
  // unchanged; free events are unaffected.
  const review = read('src/routes/organiser/review.js');
  assert.match(review, /You cannot approve your own payment proof/);
  assert.match(review, /payment\.self_approval_blocked/);
});
