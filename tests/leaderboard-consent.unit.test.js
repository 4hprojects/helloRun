'use strict';

// The per-registration leaderboard privacy rules had no coverage at all: nothing in
// tests/ referenced consentToLeaderboard or leaderboardDisplayPreference, even though
// these two fields decide whether a runner appears in public and under what name. Now
// that organisers and runners can change them after registration, pin the behaviour.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatRunnerName,
  isRegistrationPublicOnLeaderboard
} = require('../src/services/leaderboard.service');

const runner = { firstName: 'Juan', lastName: 'Dela Cruz', displayName: 'JDC' };

test('opting out by either field removes a runner from the leaderboard', () => {
  assert.equal(isRegistrationPublicOnLeaderboard({ leaderboardDisplayPreference: 'hidden' }), false);
  assert.equal(isRegistrationPublicOnLeaderboard({ consentToLeaderboard: false }), false);
  assert.equal(isRegistrationPublicOnLeaderboard({ leaderboardDisplayPreference: 'full_name', consentToLeaderboard: true }), true);
  assert.equal(isRegistrationPublicOnLeaderboard({ leaderboardDisplayPreference: 'abbreviated', consentToLeaderboard: true }), true);
});

test('an absent registration stays visible, matching the opt-in schema defaults', () => {
  // The check is `!== false`, and several call sites look a registration up in a Map that
  // can miss. Registration defaults are full_name/true, so visible is the correct answer.
  assert.equal(isRegistrationPublicOnLeaderboard({}), true);
  assert.equal(isRegistrationPublicOnLeaderboard(undefined), true);
  assert.equal(isRegistrationPublicOnLeaderboard({ consentToLeaderboard: undefined }), true);
});

test('"abbreviated" downgrades the event name mode but never overrides anonymity', () => {
  const abbreviated = { leaderboardDisplayPreference: 'abbreviated' };
  assert.equal(formatRunnerName(runner, 'full_name', abbreviated), 'Juan D.');
  assert.equal(formatRunnerName(runner, 'display_name', abbreviated), 'Juan D.');
  // anonymous_runner_id is stricter than abbreviated, so it wins.
  assert.equal(
    formatRunnerName(runner, 'anonymous_runner_id', { ...abbreviated, confirmationCode: 'HR-ABC123' }),
    'Runner #ABC123'
  );
});

test('a per-registration "full_name" never upgrades the event name mode', () => {
  // The per-registration preference can only increase privacy. An event set to
  // first_name_last_initial still abbreviates a runner who asked for their full name.
  const wantsFullName = { leaderboardDisplayPreference: 'full_name' };
  assert.equal(formatRunnerName(runner, 'first_name_last_initial', wantsFullName), 'Juan D.');
  assert.equal(formatRunnerName(runner, 'full_name', wantsFullName), 'Juan Dela Cruz');
});

test('the name falls back to the registration snapshot only when there is no account', () => {
  // This is why editing participant.firstName does not rename an account-linked runner
  // on the leaderboard: the account wins whenever it has a name.
  const registration = { participant: { firstName: 'Guest', lastName: 'Walker' } };
  assert.equal(formatRunnerName(null, 'full_name', registration), 'Guest Walker');
  assert.equal(formatRunnerName(runner, 'full_name', registration), 'Juan Dela Cruz');
});

test('a nameless runner still renders something rather than blank', () => {
  assert.equal(formatRunnerName({}, 'full_name', {}), 'Runner');
  assert.equal(formatRunnerName({}, 'first_name_last_initial', {}), 'Runner');
  assert.equal(formatRunnerName({ displayName: 'Speedy' }, 'full_name', {}), 'Speedy');
});
