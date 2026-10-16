'use strict';

/**
 * Versioned platform/layout OCR profiles (doc 07 "Profile definition").
 *
 * Detection evidence is split into two kinds:
 *   - brand: text that names the platform (strong evidence);
 *   - anchors: layout wording seen on that platform's screens but not on others
 *     (supporting evidence only, never enough on its own to confirm).
 * Generic metric labels such as "Moving Time", "Avg Pace" or "Elevation Gain"
 * appear on every app and are deliberately NOT evidence for any platform.
 *
 * Every non-generic profile ships with status `test`: its anchors are drawn
 * from the existing parser fixtures and have not been validated on a
 * consented, labelled benchmark yet. Profiles never use fixed crop coordinates;
 * crops are relative to image geometry (doc 07 step 5).
 */

const PROFILE_STATUSES = Object.freeze(['draft', 'test', 'active', 'retired']);
const GENERIC_PROFILE_ID = 'generic';

const BASE_PASSES = Object.freeze(['processed', 'metric_crop', 'dark_enhanced', 'original']);

const PROFILES = Object.freeze([
  {
    id: 'strava',
    platform: 'strava',
    version: '2026-10-p1.1',
    status: 'test',
    brand: [/\bstrava\b/i],
    anchors: [
      /\brelative\s+effort\b/i,
      /\bgave\s+(?:you\s+)?kudos\b/i,
      /\bkudos\b/i,
      /\bsegments?\b/i,
      /\byour\s+\d+(?:st|nd|rd|th)\s+fastest\b/i,
      /\bwith\s+someone\s+who\s+didn'?t\s+record\b/i
    ],
    passes: BASE_PASSES,
    timeLabels: { moving: /\bmoving\s+time\b/i, elapsed: /\belapsed\s+time\b/i }
  },
  {
    id: 'coros',
    platform: 'coros',
    version: '2026-10-p1.1',
    status: 'test',
    brand: [/\bc[o0]{1,4}ros\b/i],
    anchors: [
      /\btraining\s+load\b/i,
      /\baerobic\s+te\b/i,
      /\banaerobic\s+te\b/i,
      /\bstamina\b/i
    ],
    passes: BASE_PASSES,
    timeLabels: { moving: /\bmoving\s+time\b/i, elapsed: /\b(?:elapsed|total)\s+time\b/i }
  },
  {
    id: 'garmin',
    platform: 'garmin',
    version: '2026-10-p1.1',
    status: 'test',
    brand: [/\bgarmin\b/i],
    anchors: [
      /\bgarmin\s+connect\b/i,
      /\btraining\s+effect\b/i,
      /\bbody\s+battery\b/i,
      /\bintensity\s+minutes\b/i
    ],
    passes: BASE_PASSES,
    timeLabels: { moving: /\bmoving\s+time\b/i, elapsed: /\belapsed\s+time\b/i }
  },
  {
    id: GENERIC_PROFILE_ID,
    platform: 'unknown',
    version: '2026-10-p1.1',
    status: 'active',
    brand: [],
    anchors: [],
    passes: BASE_PASSES,
    timeLabels: { moving: /\bmoving\s+time\b/i, elapsed: /\belapsed\s+time\b/i }
  }
]);

const PROFILE_BY_ID = new Map(PROFILES.map((profile) => [profile.id, profile]));

function getProfile(profileId) {
  return PROFILE_BY_ID.get(String(profileId || '')) || PROFILE_BY_ID.get(GENERIC_PROFILE_ID);
}

function listProfiles() {
  return PROFILES.slice();
}

/** Plain, serialisable description for admin pages and API responses. */
function describeProfile(profile) {
  return {
    id: profile.id,
    platform: profile.platform,
    version: profile.version,
    defaultStatus: profile.status,
    brandPatterns: profile.brand.map((pattern) => pattern.source),
    anchorPatterns: profile.anchors.map((pattern) => pattern.source),
    passes: profile.passes.slice()
  };
}

module.exports = {
  PROFILE_STATUSES,
  GENERIC_PROFILE_ID,
  PROFILES,
  getProfile,
  listProfiles,
  describeProfile
};
