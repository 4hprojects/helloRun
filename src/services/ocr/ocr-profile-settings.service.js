'use strict';

/**
 * Which OCR profiles are enabled for production detection. Code defines each
 * profile and its default status; an admin enables a `test` profile once its
 * regression checks pass. Only `active` profiles may confirm a platform; all
 * others still contribute to the recorded candidates.
 */

const OcrProfileSetting = require('../../models/OcrProfileSetting');
const { listProfiles, getProfile, PROFILE_STATUSES, GENERIC_PROFILE_ID } = require('./ocr-profiles');

const CACHE_TTL_MS = 60_000;
let cache = { at: 0, value: null };

function clearProfileSettingsCache() {
  cache = { at: 0, value: null };
}

async function getEffectiveProfiles({ now = Date.now() } = {}) {
  if (cache.value && now - cache.at < CACHE_TTL_MS) return cache.value;
  const rows = await OcrProfileSetting.find({}).lean();
  const byId = new Map(rows.map((row) => [row.profileId, row]));
  const value = listProfiles().map((profile) => {
    const row = byId.get(profile.id);
    // A stored status only applies to the profile version it was set for; a newer
    // code version falls back to its default until re-enabled.
    const stored = row && row.profileVersion === profile.version ? row.status : null;
    return {
      profile,
      status: profile.id === GENERIC_PROFILE_ID ? 'active' : (stored || profile.status),
      setting: row || null
    };
  });
  cache = { at: now, value };
  return value;
}

async function getEnabledProfileIds() {
  const effective = await getEffectiveProfiles();
  return effective.filter((item) => item.status === 'active').map((item) => item.profile.id);
}

async function setProfileStatus({ profileId, status, notes = '', actorId }) {
  const profile = getProfile(profileId);
  if (!profile || profile.id !== profileId) {
    const error = new Error('Unknown OCR profile.');
    error.code = 'profile_not_found';
    throw error;
  }
  if (profile.id === GENERIC_PROFILE_ID) {
    const error = new Error('The generic fallback profile is always active.');
    error.code = 'profile_locked';
    throw error;
  }
  if (!PROFILE_STATUSES.includes(status)) {
    const error = new Error('Invalid profile status.');
    error.code = 'invalid_status';
    throw error;
  }
  const safeNotes = String(notes || '').trim().slice(0, 500);
  const updated = await OcrProfileSetting.findOneAndUpdate(
    { profileId },
    {
      $set: { status, profileVersion: profile.version, notes: safeNotes, updatedBy: actorId || null },
      $push: {
        history: {
          $each: [{ status, profileVersion: profile.version, notes: safeNotes, changedBy: actorId || null, changedAt: new Date() }],
          $slice: -50
        }
      }
    },
    { upsert: true, new: true }
  );
  clearProfileSettingsCache();
  return updated;
}

module.exports = {
  getEffectiveProfiles,
  getEnabledProfileIds,
  setProfileStatus,
  clearProfileSettingsCache
};
