'use strict';

// Editing a registration after it was created.
//
// The leaderboard choice and the participant contact snapshot used to be write-once: set
// on the signup form and never again, by anyone. Two callers now change them — an
// organiser or co-organiser editing any registration on their event, and a runner editing
// their own — and both normalize, validate and persist through here so the two paths
// cannot drift apart.

const {
  OTHER_OPTION_ID,
  normalizeTrackingApps,
  normalizeTrackingAppOther,
  formatTrackingAppsLabel
} = require('../utils/tracking-apps');

const LEADERBOARD_DISPLAY_VALUES = Object.freeze(['full_name', 'abbreviated', 'hidden']);
const HIDDEN_DISPLAY_VALUE = 'hidden';
const DEFAULT_DISPLAY_VALUE = 'full_name';

// Mirrors the maxlength on each participant path in models/Registration.js.
const CONTACT_FIELD_LIMITS = Object.freeze({
  mobile: 25,
  department: 120,
  position: 120,
  runningGroup: 120,
  emergencyContactName: 120,
  emergencyContactNumber: 25
});
const NAME_FIELD_LIMIT = 60;
const MAX_REASON_LENGTH = 500;

const CONTACT_FIELD_LABELS = Object.freeze({
  mobile: 'Contact number',
  department: 'Department or office',
  position: 'Position or designation',
  runningGroup: 'Running group',
  emergencyContactName: 'Emergency contact name',
  emergencyContactNumber: 'Emergency contact number'
});

function has(body, key) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

function isLeaderboardDisplayValue(value) {
  return LEADERBOARD_DISPLAY_VALUES.includes(String(value || '').trim());
}

function normalizeLeaderboardDisplayPreference(value, fallback = DEFAULT_DISPLAY_VALUE) {
  const candidate = String(value || '').trim();
  return isLeaderboardDisplayValue(candidate) ? candidate : fallback;
}

// Same truthiness the signup form uses: an unchecked checkbox sends nothing at all.
function parseConsentFlag(value) {
  return value === '1' || value === 'true' || value === true || value === 'on';
}

function isVisibleOnLeaderboard(displayPreference, consent) {
  return displayPreference !== HIDDEN_DISPLAY_VALUE && consent !== false;
}

/**
 * Reads only the groups the submitted form actually carried, so a form that edits the
 * leaderboard choice alone cannot blank out someone's emergency contact.
 *
 * `allowName` is false for the runner-facing path: a runner corrects their name on their
 * profile, not per registration.
 * `requireConsentForVisibleChoice` is true for edits — picking a visible option while
 * withholding consent is contradictory. Signup keeps its own weaker rule, which only
 * demands consent when the event lists `leaderboard_consent`; tightening it there would
 * reject every signup on an event that does not opt in.
 */
function normalizeRegistrationDetailsInput(body = {}, options = {}) {
  const { allowName = false, requireConsentForVisibleChoice = true } = options;
  const values = {};
  const errors = {};

  if (has(body, 'leaderboardDisplayPreference')) {
    const raw = String(body.leaderboardDisplayPreference || '').trim();
    if (!isLeaderboardDisplayValue(raw)) {
      errors.leaderboardDisplayPreference = 'Select a valid leaderboard display preference.';
    } else {
      const consent = parseConsentFlag(body.consentToLeaderboard);
      if (requireConsentForVisibleChoice && raw !== HIDDEN_DISPLAY_VALUE && !consent) {
        errors.consentToLeaderboard = 'Consent is required to show a name on the public leaderboard. Choose “Do not show on the leaderboard” to opt out.';
      } else {
        values.leaderboardDisplayPreference = raw;
        values.consentToLeaderboard = consent;
      }
    }
  }

  Object.entries(CONTACT_FIELD_LIMITS).forEach(([field, limit]) => {
    if (!has(body, field)) return;
    const value = String(body[field] || '').trim();
    if (value.length > limit) {
      errors[field] = `${CONTACT_FIELD_LABELS[field]} must be ${limit} characters or less.`;
      return;
    }
    values[field] = value;
  });

  if (has(body, 'preferredTrackingApps') || has(body, 'preferredTrackingAppOther')) {
    const apps = normalizeTrackingApps(body.preferredTrackingApps);
    const other = apps.includes(OTHER_OPTION_ID)
      ? normalizeTrackingAppOther(body.preferredTrackingAppOther)
      : '';
    if (apps.includes(OTHER_OPTION_ID) && !other) {
      errors.preferredTrackingApps = 'Tell us which app or device is used, or clear the "Other" option.';
    } else {
      values.preferredTrackingApps = apps;
      values.preferredTrackingAppOther = other;
      // The readable summary the registrant exports and organiser review already read.
      values.preferredFitnessApp = formatTrackingAppsLabel(apps, other);
    }
  }

  if (allowName) {
    ['firstName', 'lastName'].forEach((field) => {
      if (!has(body, field)) return;
      const value = String(body[field] || '').trim();
      const label = field === 'firstName' ? 'First name' : 'Last name';
      if (!value) {
        errors[field] = `${label} cannot be empty.`;
        return;
      }
      if (value.length > NAME_FIELD_LIMIT) {
        errors[field] = `${label} must be ${NAME_FIELD_LIMIT} characters or less.`;
        return;
      }
      values[field] = value;
    });
  }

  return { values, errors };
}

function normalizeReason(value) {
  return String(value || '').trim().slice(0, MAX_REASON_LENGTH);
}

/**
 * Assigns only the keys present in `values` and reports what actually moved. Callers use
 * an empty `changedFields` to skip the save, the audit entry and the notification, so
 * resubmitting an unchanged form is a no-op rather than noise in the audit log.
 *
 * Does not save. The caller saves with registration.save() so the post-save hook syncs
 * the Postgres shadow, which mirrors the participant fields.
 */
function applyRegistrationDetailsUpdate({ registration, values = {} }) {
  if (!registration) throw new Error('A registration is required.');
  if (!registration.participant) registration.participant = {};

  const changedFields = [];
  const participant = registration.participant;

  const before = {
    leaderboardDisplayPreference: registration.leaderboardDisplayPreference || DEFAULT_DISPLAY_VALUE,
    consentToLeaderboard: registration.consentToLeaderboard !== false
  };

  if (has(values, 'leaderboardDisplayPreference')) {
    if (String(registration.leaderboardDisplayPreference || '') !== values.leaderboardDisplayPreference) {
      registration.leaderboardDisplayPreference = values.leaderboardDisplayPreference;
      changedFields.push('leaderboardDisplayPreference');
    }
    if (Boolean(registration.consentToLeaderboard) !== values.consentToLeaderboard) {
      registration.consentToLeaderboard = values.consentToLeaderboard;
      changedFields.push('consentToLeaderboard');
    }
  }

  [...Object.keys(CONTACT_FIELD_LIMITS), 'firstName', 'lastName', 'preferredFitnessApp', 'preferredTrackingAppOther']
    .forEach((field) => {
      if (!has(values, field)) return;
      if (String(participant[field] || '') === values[field]) return;
      participant[field] = values[field];
      changedFields.push(field);
    });

  if (has(values, 'preferredTrackingApps')) {
    const current = Array.isArray(participant.preferredTrackingApps)
      ? participant.preferredTrackingApps.map((item) => String(item))
      : [];
    if (current.join(',') !== values.preferredTrackingApps.join(',')) {
      participant.preferredTrackingApps = values.preferredTrackingApps;
      changedFields.push('preferredTrackingApps');
    }
  }

  const after = {
    leaderboardDisplayPreference: registration.leaderboardDisplayPreference || DEFAULT_DISPLAY_VALUE,
    consentToLeaderboard: registration.consentToLeaderboard !== false
  };

  const leaderboardChanged = changedFields.includes('leaderboardDisplayPreference')
    || changedFields.includes('consentToLeaderboard');

  return {
    changedFields,
    leaderboardChanged,
    before,
    after,
    visibilityBefore: isVisibleOnLeaderboard(before.leaderboardDisplayPreference, before.consentToLeaderboard),
    visibilityAfter: isVisibleOnLeaderboard(after.leaderboardDisplayPreference, after.consentToLeaderboard)
  };
}

function describeLeaderboardState({ leaderboardDisplayPreference, consentToLeaderboard } = {}) {
  const preference = normalizeLeaderboardDisplayPreference(leaderboardDisplayPreference);
  if (!isVisibleOnLeaderboard(preference, consentToLeaderboard !== false)) return 'Not shown';
  if (preference === 'abbreviated') return 'First name and last initial';
  return 'Full name';
}

module.exports = {
  LEADERBOARD_DISPLAY_VALUES,
  HIDDEN_DISPLAY_VALUE,
  CONTACT_FIELD_LIMITS,
  CONTACT_FIELD_LABELS,
  NAME_FIELD_LIMIT,
  MAX_REASON_LENGTH,
  isLeaderboardDisplayValue,
  normalizeLeaderboardDisplayPreference,
  parseConsentFlag,
  isVisibleOnLeaderboard,
  normalizeRegistrationDetailsInput,
  normalizeReason,
  applyRegistrationDetailsUpdate,
  describeLeaderboardState
};
