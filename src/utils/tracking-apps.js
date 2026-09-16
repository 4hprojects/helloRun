'use strict';

// Participants pick how they will record activities during registration. The field is
// optional on purpose: many CNS participants have never used a tracking app, and
// forcing a name out of them at signup produced guesses. `undecided` is a real answer.
const TRACKING_APP_OPTIONS = Object.freeze([
  { id: 'strava', label: 'Strava' },
  { id: 'garmin', label: 'Garmin Connect' },
  { id: 'apple', label: 'Apple Watch / Apple Fitness' },
  { id: 'samsung', label: 'Samsung Health' },
  { id: 'google_fitbit', label: 'Google Fit / Fitbit' },
  { id: 'nike', label: 'Nike Run Club' },
  { id: 'huawei', label: 'Huawei Health' },
  { id: 'phone_pedometer', label: 'Phone step counter / pedometer app' },
  { id: 'other', label: 'Other (tell us which)' },
  { id: 'undecided', label: "Not sure yet — I'll decide later" }
]);

const OTHER_OPTION_ID = 'other';
const UNDECIDED_OPTION_ID = 'undecided';
const MAX_OTHER_LENGTH = 80;
const MAX_SUMMARY_LENGTH = 200;

const OPTION_LABEL_BY_ID = new Map(TRACKING_APP_OPTIONS.map((option) => [option.id, option.label]));

function isTrackingAppId(value) {
  return OPTION_LABEL_BY_ID.has(String(value || '').trim());
}

// Express body-parser yields a string when one box is checked and an array when several
// are, so accept both shapes the way normalizeRegistrationAddOnIds does.
function normalizeTrackingApps(value) {
  if (value === undefined || value === null) return [];
  const values = Array.isArray(value) ? value : [value];
  const ids = Array.from(new Set(
    values.map((item) => String(item || '').trim()).filter((item) => isTrackingAppId(item))
  ));
  // "Not sure yet" is an answer on its own; pairing it with a named app is contradictory.
  if (ids.includes(UNDECIDED_OPTION_ID)) return [UNDECIDED_OPTION_ID];
  return TRACKING_APP_OPTIONS.filter((option) => ids.includes(option.id)).map((option) => option.id);
}

function normalizeTrackingAppOther(value) {
  return String(value || '').trim().slice(0, MAX_OTHER_LENGTH);
}

// Kept as a readable summary in participant.preferredFitnessApp so the existing
// registrant CSV exports and organiser review fallbacks keep working unchanged.
function formatTrackingAppsLabel(ids, otherText = '') {
  const selected = normalizeTrackingApps(ids);
  if (!selected.length) return '';
  const other = normalizeTrackingAppOther(otherText);
  return selected
    .map((id) => {
      if (id === OTHER_OPTION_ID) return other ? `Other: ${other}` : 'Other';
      return OPTION_LABEL_BY_ID.get(id) || '';
    })
    .filter(Boolean)
    .join(', ')
    .slice(0, MAX_SUMMARY_LENGTH);
}

module.exports = {
  TRACKING_APP_OPTIONS,
  OTHER_OPTION_ID,
  UNDECIDED_OPTION_ID,
  MAX_OTHER_LENGTH,
  MAX_SUMMARY_LENGTH,
  isTrackingAppId,
  normalizeTrackingApps,
  normalizeTrackingAppOther,
  formatTrackingAppsLabel
};
