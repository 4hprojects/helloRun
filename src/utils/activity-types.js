// Activity types a submission may record. Each event narrows this with `acceptedRunTypes`;
// every layer that parses a submitted type must use this one list so they cannot drift.
const RUN_TYPES = Object.freeze(['run', 'walk', 'hike', 'trail_run', 'treadmill']);

function normalizeRunType(value) {
  const safe = String(value || '').trim().toLowerCase();
  return RUN_TYPES.includes(safe) ? safe : '';
}

module.exports = { RUN_TYPES, normalizeRunType };
