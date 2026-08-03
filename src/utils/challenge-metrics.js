const ACCUMULATED_COMPLETION_MODES = new Set(['accumulated_activity', 'accumulated_distance']);
const CHALLENGE_METRICS = new Set(['distance', 'steps']);
const MAX_TARGET_STEPS = 1_000_000_000;

function isAccumulatedChallenge(eventOrMode) {
  const mode = typeof eventOrMode === 'string'
    ? eventOrMode
    : eventOrMode?.virtualCompletionMode;
  return ACCUMULATED_COMPLETION_MODES.has(String(mode || '').trim());
}

function normalizeChallengeMetrics(value, options = {}) {
  const values = Array.isArray(value)
    ? value
    : String(value || '').split(',');
  const normalized = Array.from(new Set(values
    .map((item) => String(item || '').trim().toLowerCase())
    .filter((item) => CHALLENGE_METRICS.has(item))));
  if (normalized.length) return normalized;
  return options.accumulated === false ? [] : ['distance'];
}

function normalizePrimaryChallengeMetric(value, metrics = ['distance']) {
  const normalizedMetrics = normalizeChallengeMetrics(metrics);
  const normalized = String(value || '').trim().toLowerCase();
  if (normalizedMetrics.includes(normalized)) return normalized;
  return normalizedMetrics[0] || 'distance';
}

function normalizeTargetSteps(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_TARGET_STEPS
    ? parsed
    : null;
}

function resolveChallengeConfig(event = {}) {
  const accumulated = isAccumulatedChallenge(event);
  const metrics = normalizeChallengeMetrics(event.challengeMetrics, { accumulated });
  const primaryMetric = normalizePrimaryChallengeMetric(event.primaryChallengeMetric, metrics);
  return {
    accumulated,
    metrics,
    primaryMetric,
    tracksDistance: accumulated && metrics.includes('distance'),
    tracksSteps: accumulated && metrics.includes('steps'),
    targetSteps: normalizeTargetSteps(event.targetSteps),
    rankingOnly: primaryMetric === 'steps'
      ? normalizeTargetSteps(event.targetSteps) === null
      : !(Number(event.targetDistanceKm || 0) > 0)
  };
}

function getPrimaryGoal(event = {}, targetDistanceKm = event.targetDistanceKm) {
  const config = resolveChallengeConfig(event);
  if (!config.accumulated) return { metric: null, target: null };
  if (config.primaryMetric === 'steps') {
    return { metric: 'steps', target: config.targetSteps };
  }
  const target = Number(targetDistanceKm || 0);
  return { metric: 'distance', target: Number.isFinite(target) && target > 0 ? target : null };
}

function isStepCompetitionsEnabled(env = process.env) {
  return String(env.FEATURE_STEP_COMPETITIONS_ENABLED || '').trim().toLowerCase() === 'true'
    || String(env.FEATURE_STEP_COMPETITIONS_ENABLED || '').trim() === '1';
}

module.exports = {
  ACCUMULATED_COMPLETION_MODES,
  CHALLENGE_METRICS,
  MAX_TARGET_STEPS,
  getPrimaryGoal,
  isAccumulatedChallenge,
  isStepCompetitionsEnabled,
  normalizeChallengeMetrics,
  normalizePrimaryChallengeMetric,
  normalizeTargetSteps,
  resolveChallengeConfig
};
