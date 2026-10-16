'use strict';

/**
 * Evidence-based platform detection (doc 07 step 3–4).
 *
 * Scores every enabled profile from brand text and layout anchors and abstains
 * (status `uncertain`, generic profile) unless one platform has brand evidence
 * and a clear lead. The screenshot platform and any URL provider are recorded as
 * separate signals; a disagreement is a review flag, never a fraud verdict.
 */

const { PROFILES, GENERIC_PROFILE_ID } = require('./ocr-profiles');

const DETECTOR_VERSION = 'platform-detector-v1';
const BRAND_WEIGHT = 0.6;
const ANCHOR_WEIGHT = 0.2;
const MAX_ANCHOR_SCORE = 0.4;
const CONFIRM_THRESHOLD = 0.6;
const MIN_LEAD = 0.2;

function snippetAround(text, match) {
  if (!match) return '';
  const start = Math.max(0, match.index - 12);
  return text.slice(start, match.index + match[0].length + 12).replace(/\s+/g, ' ').trim().slice(0, 60);
}

function scoreProfile(profile, text) {
  const signals = [];
  let brandScore = 0;
  for (const pattern of profile.brand) {
    const match = text.match(pattern);
    if (match) {
      brandScore = BRAND_WEIGHT;
      signals.push({ kind: 'brand_text', confidence: BRAND_WEIGHT, evidence: snippetAround(text, match), pattern: pattern.source });
      break;
    }
  }
  let anchorScore = 0;
  for (const pattern of profile.anchors) {
    const match = text.match(pattern);
    if (!match) continue;
    anchorScore = Math.min(MAX_ANCHOR_SCORE, anchorScore + ANCHOR_WEIGHT);
    signals.push({ kind: 'layout_anchor', confidence: ANCHOR_WEIGHT, evidence: snippetAround(text, match), pattern: pattern.source });
  }
  return {
    profileId: profile.id,
    platform: profile.platform,
    hasBrand: brandScore > 0,
    score: Number((brandScore + anchorScore).toFixed(2)),
    signals
  };
}

/**
 * @param {string} text OCR text from the screenshot.
 * @param {{ enabledProfileIds?: Set<string>|string[], urlProvider?: string }} options
 */
function detectPlatform(text, options = {}) {
  const safeText = String(text || '');
  const enabled = options.enabledProfileIds ? new Set(options.enabledProfileIds) : null;
  const candidates = PROFILES
    .filter((profile) => profile.id !== GENERIC_PROFILE_ID)
    .filter((profile) => !enabled || enabled.has(profile.id))
    .map((profile) => scoreProfile(profile, safeText))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.profileId.localeCompare(b.profileId));

  const best = candidates[0] || null;
  const runnerUp = candidates[1] || null;
  const lead = best ? best.score - (runnerUp ? runnerUp.score : 0) : 0;
  const confirmed = Boolean(best && best.hasBrand && best.score >= CONFIRM_THRESHOLD && lead >= MIN_LEAD - 1e-9);

  const signals = best ? best.signals.slice() : [];
  const urlProvider = String(options.urlProvider || '').trim().toLowerCase();
  if (urlProvider) {
    signals.push({ kind: 'url_provider', confidence: 0, evidence: urlProvider, pattern: '' });
  }

  return {
    detectorVersion: DETECTOR_VERSION,
    status: confirmed ? 'confirmed' : (best ? 'uncertain' : 'unknown'),
    platform: confirmed ? best.platform : 'unknown',
    platformCandidate: best ? best.platform : 'unknown',
    profileId: confirmed ? best.profileId : GENERIC_PROFILE_ID,
    confidence: best ? Math.min(1, best.score) : 0,
    signals,
    candidates: candidates.map(({ profileId, platform, score }) => ({ profileId, platform, score })),
    urlProvider: urlProvider || '',
    urlProviderMismatch: Boolean(confirmed && urlProvider && urlProvider !== best.platform)
  };
}

module.exports = {
  DETECTOR_VERSION,
  CONFIRM_THRESHOLD,
  detectPlatform
};
