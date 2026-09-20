'use strict';

// Quick reasons for reversing an approved entry ("Reject approval").
//
// The list is the same run-proof catalog the Reject dialog uses, so wording, the 500-character
// cap and the "Other needs its own explanation" rule stay identical, plus one reason that only
// makes sense for a reversal: the entry should never have been approved.
//
// The runner sees "<reason label>: <organizer's note, or the reason's standard guidance>".

const { getRejectionReasonOptions, resolveRejectionReason } = require('./rejection-reasons');

const APPROVED_BY_MISTAKE = Object.freeze({
  code: 'approved_by_mistake',
  label: 'Approved by mistake',
  guidance: 'This entry was approved in error and reviewed again. If you believe the original result was valid, please contact the event organizer.'
});

const MAX_NOTE_LENGTH = 500;

function getReversalReasonOptions() {
  const options = getRejectionReasonOptions('run');
  // "Other" stays last so the specific reasons read first.
  const otherIndex = options.findIndex((option) => option.code === 'other');
  const insertAt = otherIndex === -1 ? options.length : otherIndex;
  return [...options.slice(0, insertAt), { ...APPROVED_BY_MISTAKE }, ...options.slice(insertAt)];
}

/**
 * @returns {{ code: string, label: string, runnerMessage: string }}
 * @throws when the code is missing or unknown, or "Other" comes with no explanation
 */
function resolveReversalReason(code, note) {
  const safeCode = String(code || '').trim();
  if (safeCode === APPROVED_BY_MISTAKE.code) {
    const safeNote = String(note || '').trim().slice(0, MAX_NOTE_LENGTH);
    return {
      code: safeCode,
      label: APPROVED_BY_MISTAKE.label,
      runnerMessage: `${APPROVED_BY_MISTAKE.label}: ${safeNote || APPROVED_BY_MISTAKE.guidance}`.slice(0, MAX_NOTE_LENGTH)
    };
  }

  try {
    const resolved = resolveRejectionReason('run', safeCode, note);
    return { code: resolved.code, label: resolved.label, runnerMessage: resolved.runnerMessage };
  } catch (error) {
    // Keep the "add at least 10 characters" message; only the generic failure is reworded.
    if (/Select a valid rejection reason/.test(error.message)) {
      throw new Error('Select a valid reason for reversing this approval.');
    }
    throw error;
  }
}

module.exports = { APPROVED_BY_MISTAKE, getReversalReasonOptions, resolveReversalReason };
