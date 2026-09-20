'use strict';

// DB-free tests for the quick reasons offered when reversing an approved entry.

const test = require('node:test');
const assert = require('node:assert/strict');
const { REJECTION_REASONS } = require('../src/utils/rejection-reasons');
const { APPROVED_BY_MISTAKE, getReversalReasonOptions, resolveReversalReason } = require('../src/utils/reversal-reasons');

const runCodes = Object.keys(REJECTION_REASONS.run);

test('the dropdown offers every Reject reason plus "Approved by mistake", with "Other" last', () => {
  const codes = getReversalReasonOptions().map((option) => option.code);
  assert.deepEqual(new Set(codes), new Set([...runCodes, 'approved_by_mistake']));
  assert.equal(codes.length, runCodes.length + 1, 'no duplicates');
  assert.equal(codes[codes.length - 1], 'other');
  assert.equal(codes[codes.length - 2], 'approved_by_mistake', 'the reversal-only reason sits just before Other');
  assert.equal(codes[0], runCodes[0], 'the specific reasons keep their existing order');
});

test('every option has a code, a label and standard guidance for the runner', () => {
  for (const option of getReversalReasonOptions()) {
    assert.ok(option.code && option.label && option.guidance, JSON.stringify(option));
  }
});

test('options are copies, so callers cannot change the shared reason', () => {
  const options = getReversalReasonOptions();
  options.find((option) => option.code === 'approved_by_mistake').label = 'changed';
  assert.equal(APPROVED_BY_MISTAKE.label, 'Approved by mistake');
  assert.throws(() => { APPROVED_BY_MISTAKE.label = 'x'; }, TypeError);
});

test('with no note the runner gets the reason plus its standard guidance', () => {
  const result = resolveReversalReason('unclear_proof', '');
  assert.equal(result.code, 'unclear_proof');
  assert.equal(result.label, REJECTION_REASONS.run.unclear_proof.label);
  assert.equal(result.runnerMessage, `${REJECTION_REASONS.run.unclear_proof.label}: ${REJECTION_REASONS.run.unclear_proof.guidance}`);
  assert.equal(resolveReversalReason('unclear_proof').runnerMessage, result.runnerMessage, 'a missing note behaves like a blank one');
});

test('a note replaces the standard guidance and is trimmed', () => {
  const result = resolveReversalReason('metrics_mismatch', '  Distance reads 4.1 km in the screenshot.  ');
  assert.equal(result.runnerMessage, `${REJECTION_REASONS.run.metrics_mismatch.label}: Distance reads 4.1 km in the screenshot.`);
});

test('"Approved by mistake" follows the same format', () => {
  assert.equal(resolveReversalReason('approved_by_mistake', '').runnerMessage, `Approved by mistake: ${APPROVED_BY_MISTAKE.guidance}`);
  assert.equal(resolveReversalReason('approved_by_mistake', 'Wrong runner.').runnerMessage, 'Approved by mistake: Wrong runner.');
  assert.equal(resolveReversalReason('approved_by_mistake', '').code, 'approved_by_mistake');
});

test('"Other" needs a note of at least 10 characters', () => {
  assert.throws(() => resolveReversalReason('other', ''), /at least 10 characters/);
  assert.throws(() => resolveReversalReason('other', 'too short'), /at least 10 characters/);
  assert.match(resolveReversalReason('other', 'A proper explanation.').runnerMessage, /A proper explanation\.$/);
});

test('a missing or unknown reason is refused with a clear message', () => {
  for (const code of [undefined, null, '', '   ', 'nope', 'payment_reversed', 'UNCLEAR_PROOF']) {
    assert.throws(() => resolveReversalReason(code, 'note'), /Select a valid reason for reversing this approval\./, JSON.stringify(code));
  }
  // A payment-catalog code is not a run reason.
  assert.throws(() => resolveReversalReason('wrong_amount', ''), /Select a valid reason/);
});

test('the runner-facing message is capped at 500 characters, and long reasons still pass the service minimum', () => {
  for (const code of ['unclear_proof', 'approved_by_mistake', 'other']) {
    const message = resolveReversalReason(code, 'x'.repeat(900)).runnerMessage;
    assert.ok(message.length <= 500, `${code}: ${message.length}`);
  }
  // reverseSubmissionApproval refuses reasons under 5 characters; every label alone is longer.
  for (const option of getReversalReasonOptions().filter((o) => o.code !== 'other')) {
    assert.ok(resolveReversalReason(option.code, '').runnerMessage.length >= 5, option.code);
  }
});
