'use strict';

const REQUIRED_ENVIRONMENT_VARIABLES = Object.freeze([
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET',
  'STRAVA_REDIRECT_URI',
  'STRAVA_ENCRYPTION_KEY',
  'STRAVA_WEBHOOK_VERIFY_TOKEN'
]);

function isStravaPrivateViewerEnabled(env = process.env) {
  return String(env.STRAVA_PRIVATE_VIEWER_ENABLED || '').trim().toLowerCase() === 'true';
}

function getStravaPrivateViewerReadiness(env = process.env) {
  const enabled = isStravaPrivateViewerEnabled(env);
  const missing = enabled
    ? REQUIRED_ENVIRONMENT_VARIABLES.filter((name) => !String(env[name] || '').trim())
    : [];
  return {
    enabled,
    ready: !enabled || missing.length === 0,
    status: !enabled ? 'disabled' : missing.length ? 'not_ready' : 'ready',
    missing
  };
}

module.exports = {
  REQUIRED_ENVIRONMENT_VARIABLES,
  isStravaPrivateViewerEnabled,
  getStravaPrivateViewerReadiness
};
