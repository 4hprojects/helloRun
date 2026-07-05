const logger = require('../utils/logger');

// Boot-time environment validation. Centralises the checks that used to live
// inline in server.js so a misconfigured env var fails loudly at startup
// instead of silently breaking a feature at runtime (the PASSWORD_RESET_EXPIRY
// NaN bug from the July 5 analysis is the canonical example).
//
// Policy: only vars whose absence makes the process useless are fatal.
// Everything else warns, so a partial local setup can still boot.

const REQUIRED_VARS = ['SESSION_SECRET', 'MONGODB_URI'];

const RECOMMENDED_VARS = [
  'DATABASE_URL',        // Postgres shadow tables — sync features degrade without it
  'APP_URL',             // absolute links in emails
  'RESEND_API_KEY',      // email sending is silently skipped without it
  'EMAIL_FROM',
  'TURNSTILE_SITE_KEY',  // auth-form bot protection
  'TURNSTILE_SECRET_KEY',
  'R2_BUCKET',           // uploads
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_PUBLIC_BASE_URL'
];

// Vars that must parse to a positive number when set; each has a code default,
// so unset is fine but garbage deserves a warning.
const POSITIVE_NUMBER_VARS = [
  { name: 'PASSWORD_RESET_EXPIRY', fallback: '1 hour' },
  { name: 'EMAIL_VERIFICATION_EXPIRY', fallback: '24 hours' },
  { name: 'UPLOAD_MAX_SIZE', fallback: '5 MB' },
  { name: 'PORT', fallback: 'platform-assigned' }
];

function validateEnv(env = process.env) {
  const missingRequired = REQUIRED_VARS.filter((name) => !String(env[name] || '').trim());

  const warnings = [];
  for (const name of RECOMMENDED_VARS) {
    if (!String(env[name] || '').trim()) {
      warnings.push(`${name} is not set — the feature depending on it will be degraded or disabled.`);
    }
  }
  for (const { name, fallback } of POSITIVE_NUMBER_VARS) {
    const raw = String(env[name] || '').trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      warnings.push(`${name}="${raw}" is not a positive number — the code default (${fallback}) will be used.`);
    }
  }
  if (!String(env.REDIS_URL || '').trim()) {
    warnings.push('REDIS_URL is not set — rate limiters run on the per-process in-memory fallback.');
  }

  return { missingRequired, warnings };
}

// Logs findings and exits the process when a required var is missing.
function enforceEnvAtBoot(env = process.env) {
  const { missingRequired, warnings } = validateEnv(env);

  for (const warning of warnings) {
    logger.warn(`Env check: ${warning}`);
  }
  if (missingRequired.length) {
    logger.error(`FATAL: required environment variables are not set: ${missingRequired.join(', ')}. Refusing to start.`);
    process.exit(1);
  }
}

module.exports = { validateEnv, enforceEnvAtBoot };
