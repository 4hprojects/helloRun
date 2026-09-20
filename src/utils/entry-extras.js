'use strict';

// The optional measurements a runner can attach to an entry beyond distance, time and date:
// elevation gain and steps. Organizer pages list only the ones that exist, and they all format
// them through here so the queue, the roster and the per-runner page read identically.
//
// - Elevation is shown whenever it is recorded. 0 m is a real value (a flat course), so only a
//   missing value (null, undefined or blank) hides it.
// - Steps are shown only when greater than 0. Entries without a step count store null, and a
//   count of 0 carries no information.

function toFiniteNumber(value) {
  // Only numbers and numeric strings count; Number([]) is 0, which would print a phantom "0 m".
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (value === '' || (typeof value === 'string' && value.trim() === '')) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatElevation(value) {
  const numeric = toFiniteNumber(value);
  return numeric === null || numeric < 0 ? '' : `${Math.round(numeric)} m`;
}

function formatSteps(value) {
  const numeric = toFiniteNumber(value);
  return numeric === null || numeric <= 0 ? '' : Math.round(numeric).toLocaleString('en-US');
}

/** @returns {Array<{ key: 'elevation' | 'steps', label: string, value: string }>} */
function buildEntryExtras(submission) {
  const entry = submission || {};
  const extras = [
    { key: 'elevation', label: 'Elevation', value: formatElevation(entry.elevationGain) },
    { key: 'steps', label: 'Steps', value: formatSteps(entry.steps) }
  ];
  return extras.filter((extra) => extra.value !== '');
}

/** One line for tight spaces, e.g. "128 m elevation · 8,500 steps". Empty when there is nothing to show. */
function formatEntryExtrasSummary(extras = []) {
  return extras.map((extra) => `${extra.value} ${extra.key}`).join(' · ');
}

module.exports = { buildEntryExtras, formatEntryExtrasSummary, formatElevation, formatSteps };
