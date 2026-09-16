'use strict';

// DB-free unit tests for post-registration edits (leaderboard choice + participant details).

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeRegistrationDetailsInput,
  applyRegistrationDetailsUpdate,
  describeLeaderboardState,
  isVisibleOnLeaderboard,
  normalizeReason,
  parseConsentFlag
} = require('../src/services/registration-details.service');

const baseRegistration = () => ({
  leaderboardDisplayPreference: 'full_name',
  consentToLeaderboard: true,
  participant: { firstName: 'Jamie', lastName: 'Runner', mobile: '0917', department: 'Biology', position: 'Instructor' }
});

test('only the groups the form submitted are read', () => {
  // A form that edits the leaderboard choice alone must not blank the contact snapshot.
  const { values, errors } = normalizeRegistrationDetailsInput(
    { leaderboardDisplayPreference: 'hidden' },
    { allowName: true }
  );
  assert.deepEqual(errors, {});
  assert.deepEqual(Object.keys(values).sort(), ['consentToLeaderboard', 'leaderboardDisplayPreference']);
  assert.ok(!('mobile' in values));
  assert.ok(!('firstName' in values));
});

test('a visible choice without consent is rejected, hidden is accepted', () => {
  const visible = normalizeRegistrationDetailsInput({ leaderboardDisplayPreference: 'full_name' });
  assert.match(visible.errors.consentToLeaderboard, /Consent is required/);
  assert.ok(!('leaderboardDisplayPreference' in visible.values));

  const hidden = normalizeRegistrationDetailsInput({ leaderboardDisplayPreference: 'hidden' });
  assert.deepEqual(hidden.errors, {});
  assert.equal(hidden.values.leaderboardDisplayPreference, 'hidden');
  assert.equal(hidden.values.consentToLeaderboard, false);

  const consented = normalizeRegistrationDetailsInput({ leaderboardDisplayPreference: 'abbreviated', consentToLeaderboard: '1' });
  assert.deepEqual(consented.errors, {});
  assert.equal(consented.values.consentToLeaderboard, true);
});

test('signup keeps its weaker consent rule, which the edit paths tighten', () => {
  // Signup seeds consent to false and only demands it when the event opts in; applying
  // the edit rule there would reject every signup on an event that does not.
  const { values, errors } = normalizeRegistrationDetailsInput(
    { leaderboardDisplayPreference: 'full_name' },
    { requireConsentForVisibleChoice: false }
  );
  assert.deepEqual(errors, {});
  assert.equal(values.leaderboardDisplayPreference, 'full_name');
  assert.equal(values.consentToLeaderboard, false);
});

test('an invalid display preference is rejected rather than silently defaulted', () => {
  const { values, errors } = normalizeRegistrationDetailsInput({ leaderboardDisplayPreference: 'everywhere' });
  assert.match(errors.leaderboardDisplayPreference, /valid leaderboard display preference/);
  assert.ok(!('leaderboardDisplayPreference' in values));
});

test('allowName: false ignores name input instead of trusting it', () => {
  const { values } = normalizeRegistrationDetailsInput(
    { firstName: 'Someone', lastName: 'Else' },
    { allowName: false }
  );
  assert.ok(!('firstName' in values));
  assert.ok(!('lastName' in values));

  const organiser = normalizeRegistrationDetailsInput({ firstName: 'Jamie', lastName: 'Runner' }, { allowName: true });
  assert.equal(organiser.values.firstName, 'Jamie');
});

test('names are trimmed, required when present, and length capped', () => {
  assert.match(normalizeRegistrationDetailsInput({ firstName: '   ' }, { allowName: true }).errors.firstName, /cannot be empty/);
  assert.match(normalizeRegistrationDetailsInput({ lastName: 'x'.repeat(61) }, { allowName: true }).errors.lastName, /60 characters or less/);
  assert.equal(normalizeRegistrationDetailsInput({ firstName: '  Jamie  ' }, { allowName: true }).values.firstName, 'Jamie');
});

test('contact fields are length capped to their schema maxlengths', () => {
  assert.match(normalizeRegistrationDetailsInput({ mobile: '9'.repeat(26) }).errors.mobile, /25 characters or less/);
  assert.match(normalizeRegistrationDetailsInput({ department: 'x'.repeat(121) }).errors.department, /120 characters or less/);
  assert.equal(normalizeRegistrationDetailsInput({ mobile: '  0917  ' }).values.mobile, '0917');
  // Clearing an optional field is legitimate.
  assert.equal(normalizeRegistrationDetailsInput({ department: '' }).values.department, '');
});

test('tracking apps normalize and refresh the readable summary', () => {
  const { values } = normalizeRegistrationDetailsInput({ preferredTrackingApps: ['strava', 'garmin'] });
  assert.deepEqual(values.preferredTrackingApps, ['strava', 'garmin']);
  assert.equal(values.preferredFitnessApp, 'Strava, Garmin Connect');
  assert.equal(values.preferredTrackingAppOther, '');

  const other = normalizeRegistrationDetailsInput({ preferredTrackingApps: ['other'], preferredTrackingAppOther: 'Polar Flow' });
  assert.equal(other.values.preferredFitnessApp, 'Other: Polar Flow');

  const missing = normalizeRegistrationDetailsInput({ preferredTrackingApps: ['other'], preferredTrackingAppOther: '' });
  assert.match(missing.errors.preferredTrackingApps, /which app or device/);
});

test('applying an unchanged form reports no change', () => {
  const registration = baseRegistration();
  const result = applyRegistrationDetailsUpdate({
    registration,
    values: { leaderboardDisplayPreference: 'full_name', consentToLeaderboard: true, mobile: '0917' }
  });
  assert.deepEqual(result.changedFields, []);
  assert.equal(result.leaderboardChanged, false);
});

test('applying a change reports exactly which fields moved', () => {
  const registration = baseRegistration();
  const result = applyRegistrationDetailsUpdate({
    registration,
    values: { leaderboardDisplayPreference: 'hidden', consentToLeaderboard: false, department: 'Chemistry' }
  });
  assert.deepEqual(result.changedFields.sort(), ['consentToLeaderboard', 'department', 'leaderboardDisplayPreference']);
  assert.equal(result.leaderboardChanged, true);
  assert.equal(registration.leaderboardDisplayPreference, 'hidden');
  assert.equal(registration.participant.department, 'Chemistry');
  // Untouched fields survive.
  assert.equal(registration.participant.mobile, '0917');
  assert.equal(registration.participant.firstName, 'Jamie');
});

test('a contact-only edit does not flag a leaderboard change', () => {
  const result = applyRegistrationDetailsUpdate({ registration: baseRegistration(), values: { mobile: '0918' } });
  assert.deepEqual(result.changedFields, ['mobile']);
  assert.equal(result.leaderboardChanged, false);
});

test('visibility before and after is reported for the audit trail', () => {
  const result = applyRegistrationDetailsUpdate({
    registration: { leaderboardDisplayPreference: 'hidden', consentToLeaderboard: false, participant: {} },
    values: { leaderboardDisplayPreference: 'full_name', consentToLeaderboard: true }
  });
  assert.equal(result.visibilityBefore, false);
  assert.equal(result.visibilityAfter, true);
});

test('a registration with no participant subdocument does not throw', () => {
  const registration = { leaderboardDisplayPreference: 'full_name', consentToLeaderboard: true };
  assert.doesNotThrow(() => applyRegistrationDetailsUpdate({ registration, values: { mobile: '0917' } }));
  assert.equal(registration.participant.mobile, '0917');
});

test('visibility treats an absent consent value as opted in, matching the schema default', () => {
  assert.equal(isVisibleOnLeaderboard('full_name', undefined), true);
  assert.equal(isVisibleOnLeaderboard('hidden', true), false);
  assert.equal(isVisibleOnLeaderboard('full_name', false), false);
});

test('the leaderboard state label reads the way the roster shows it', () => {
  assert.equal(describeLeaderboardState({ leaderboardDisplayPreference: 'full_name', consentToLeaderboard: true }), 'Full name');
  assert.equal(describeLeaderboardState({ leaderboardDisplayPreference: 'abbreviated', consentToLeaderboard: true }), 'First name and last initial');
  assert.equal(describeLeaderboardState({ leaderboardDisplayPreference: 'hidden', consentToLeaderboard: true }), 'Not shown');
  assert.equal(describeLeaderboardState({ leaderboardDisplayPreference: 'full_name', consentToLeaderboard: false }), 'Not shown');
  assert.equal(describeLeaderboardState({}), 'Full name');
});

test('consent parsing matches the signup checkbox semantics', () => {
  ['1', 'true', 'on', true].forEach((value) => assert.equal(parseConsentFlag(value), true, String(value)));
  [undefined, '', '0', 'false', false, null].forEach((value) => assert.equal(parseConsentFlag(value), false, String(value)));
});

test('the organiser reason is trimmed and capped', () => {
  assert.equal(normalizeReason('  runner emailed to ask  '), 'runner emailed to ask');
  assert.equal(normalizeReason('x'.repeat(900)).length, 500);
  assert.equal(normalizeReason(undefined), '');
});
