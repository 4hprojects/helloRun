'use strict';

// Which status changes an organizer may make to a submitted entry from the per-runner
// submissions page. One table drives both the buttons the page shows and the check the
// route makes before calling a service, so the two cannot drift. The services still
// re-check every transition, so a stale page can never force an invalid one.
//
// - approve: pending or rejected entries (the same statuses the review services accept)
// - reject:  pending entries only
// - reverse: approved entries. An approved entry is always unwound through
//            reverseSubmissionApproval, which also withdraws its certificate, badges and
//            ranking, rather than through a plain reject.

const PENDING_STATUSES = Object.freeze({
  standard: ['submitted'],
  accumulated: ['submitted', 'needs_clarification']
});

const DECISION_ACTIONS = Object.freeze(['approve', 'reject', 'reverse']);

function normalizeKind(kind) {
  return kind === 'accumulated' ? 'accumulated' : 'standard';
}

function getAvailableDecisions(status, kind) {
  const safeStatus = String(status || '').trim();
  const pending = PENDING_STATUSES[normalizeKind(kind)].includes(safeStatus);
  return {
    canApprove: pending || safeStatus === 'rejected',
    canReject: pending,
    canReverse: safeStatus === 'approved'
  };
}

function isDecisionAllowed(action, status, kind) {
  const decisions = getAvailableDecisions(status, kind);
  if (action === 'approve') return decisions.canApprove;
  if (action === 'reject') return decisions.canReject;
  if (action === 'reverse') return decisions.canReverse;
  return false;
}

function hasAnyDecision(status, kind) {
  const decisions = getAvailableDecisions(status, kind);
  return decisions.canApprove || decisions.canReject || decisions.canReverse;
}

module.exports = { DECISION_ACTIONS, getAvailableDecisions, isDecisionAllowed, hasAnyDecision };
