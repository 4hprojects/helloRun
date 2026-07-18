'use strict';

const DEFAULT_REPORT_REASONS = Object.freeze([
  'spam', 'plagiarism', 'promotion', 'unsafe_medical', 'abuse', 'other'
]);

const DEFAULT_POLICY = Object.freeze({
  commentsPageSize: 20,
  repliesPageSize: 20,
  replyPreviewSize: 3,
  maxPage: 500,
  maxContentLength: 1000,
  maxReportNoteLength: 500,
  editWindowMs: 30 * 60 * 1000,
  maxEdits: 5,
  oneVisualReplyLevel: true,
  publicHistory: true,
  tombstoneText: 'Comment deleted',
  redactedRevisionText: 'Revision removed by author',
  reportReasons: DEFAULT_REPORT_REASONS
});

function positiveInteger(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function normalizePolicy(input = {}) {
  const reasons = Array.isArray(input.reportReasons)
    ? [...new Set(input.reportReasons.map((value) => String(value || '').trim()).filter(Boolean))]
    : [...DEFAULT_REPORT_REASONS];
  if (!reasons.length) throw new TypeError('policy.reportReasons must contain at least one value');
  return Object.freeze({
    commentsPageSize: positiveInteger(input.commentsPageSize, DEFAULT_POLICY.commentsPageSize, 100),
    repliesPageSize: positiveInteger(input.repliesPageSize, DEFAULT_POLICY.repliesPageSize, 100),
    replyPreviewSize: positiveInteger(input.replyPreviewSize, DEFAULT_POLICY.replyPreviewSize, 20),
    maxPage: positiveInteger(input.maxPage, DEFAULT_POLICY.maxPage, 10000),
    maxContentLength: positiveInteger(input.maxContentLength, DEFAULT_POLICY.maxContentLength, 10000),
    maxReportNoteLength: positiveInteger(input.maxReportNoteLength, DEFAULT_POLICY.maxReportNoteLength, 5000),
    editWindowMs: positiveInteger(input.editWindowMs, DEFAULT_POLICY.editWindowMs),
    maxEdits: positiveInteger(input.maxEdits, DEFAULT_POLICY.maxEdits, 100),
    oneVisualReplyLevel: input.oneVisualReplyLevel !== false,
    publicHistory: input.publicHistory !== false,
    tombstoneText: String(input.tombstoneText || DEFAULT_POLICY.tombstoneText),
    redactedRevisionText: String(input.redactedRevisionText || DEFAULT_POLICY.redactedRevisionText),
    reportReasons: Object.freeze(reasons)
  });
}

function clampPage(value, policy = DEFAULT_POLICY) {
  return positiveInteger(value, 1, policy.maxPage || DEFAULT_POLICY.maxPage);
}

module.exports = { DEFAULT_POLICY, DEFAULT_REPORT_REASONS, normalizePolicy, clampPage };
