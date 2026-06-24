const crypto = require('crypto');
const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');

const DEFAULT_MIN_SIGNUP_FORM_AGE_MS = 1500;
const MAX_SIGNUP_FORM_AGE_MS = 2 * 60 * 60 * 1000;
const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_VERIFY_TIMEOUT_MS = 5000;
const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const loginFailureBuckets = new Map();

const DEFAULT_DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '20minutemail.com',
  'anonaddy.com',
  'burnermail.io',
  'dispostable.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'maildrop.cc',
  'mailinator.com',
  'moakt.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'yopmail.com'
]);

function getSignupMinFormAgeMs() {
  const configured = Number(process.env.SIGNUP_MIN_FORM_AGE_MS);
  if (Number.isFinite(configured) && configured >= 0) {
    return configured;
  }
  return DEFAULT_MIN_SIGNUP_FORM_AGE_MS;
}

function getConfiguredDisposableDomains() {
  const configured = String(process.env.DISPOSABLE_EMAIL_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_DISPOSABLE_EMAIL_DOMAINS, ...configured]);
}

function getEmailDomain(email) {
  const value = String(email || '').trim().toLowerCase();
  const atIndex = value.lastIndexOf('@');
  if (atIndex === -1 || atIndex === value.length - 1) {
    return '';
  }
  return value.slice(atIndex + 1).replace(/\.+$/, '');
}

function isDisposableEmail(email) {
  const domain = getEmailDomain(email);
  if (!domain) return false;

  const disposableDomains = getConfiguredDisposableDomains();
  return disposableDomains.has(domain);
}

function isTurnstileConfigured() {
  return Boolean(getTurnstileSiteKey() && getTurnstileSecretKey());
}

function getTurnstileSiteKey() {
  return String(process.env.TURNSTILE_SITE_KEY || '').trim();
}

function getTurnstileSecretKey() {
  return String(process.env.TURNSTILE_SECRET_KEY || '').trim();
}

function createLoginFailureKey(email, remoteIp) {
  const normalizedEmail = String(email || '').trim().toLowerCase().slice(0, 254);
  const normalizedIp = String(remoteIp || 'unknown-ip').trim().slice(0, 120);
  return crypto
    .createHash('sha256')
    .update(`${normalizedEmail}|${normalizedIp}`)
    .digest('hex');
}

function getInMemoryLoginFailureCount(key) {
  const now = Date.now();
  const existing = loginFailureBuckets.get(key);
  if (!existing || now - existing.start > LOGIN_FAILURE_WINDOW_MS) {
    loginFailureBuckets.delete(key);
    return 0;
  }
  return existing.count;
}

function recordInMemoryLoginFailure(key) {
  const now = Date.now();
  const existing = loginFailureBuckets.get(key);
  if (!existing || now - existing.start > LOGIN_FAILURE_WINDOW_MS) {
    loginFailureBuckets.set(key, { start: now, count: 1 });
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

async function getLoginFailureCount({ email, remoteIp } = {}) {
  const key = createLoginFailureKey(email, remoteIp);
  const redis = getRedisClient();
  if (redis && redis.status === 'ready') {
    try {
      const count = await redis.get(`login-fail:${key}`);
      return Math.max(0, Number(count || 0));
    } catch (error) {
      logger.error('Login failure counter Redis read error:', error.message);
    }
  }
  return getInMemoryLoginFailureCount(key);
}

async function recordLoginFailure({ email, remoteIp } = {}) {
  const key = createLoginFailureKey(email, remoteIp);
  const redis = getRedisClient();
  if (redis && redis.status === 'ready') {
    try {
      const redisKey = `login-fail:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, LOGIN_FAILURE_WINDOW_MS);
      }
      return count;
    } catch (error) {
      logger.error('Login failure counter Redis write error:', error.message);
    }
  }
  return recordInMemoryLoginFailure(key);
}

async function clearLoginFailures({ email, remoteIp } = {}) {
  const key = createLoginFailureKey(email, remoteIp);
  loginFailureBuckets.delete(key);

  const redis = getRedisClient();
  if (redis && redis.status === 'ready') {
    try {
      await redis.del(`login-fail:${key}`);
    } catch (error) {
      logger.error('Login failure counter Redis clear error:', error.message);
    }
  }
}

async function verifyTurnstileToken({ token, remoteIp, fetchImpl = fetch } = {}) {
  if (!isTurnstileConfigured()) {
    return { ok: true, skipped: true, reason: 'not_configured' };
  }

  const safeToken = String(token || '').trim();
  if (!safeToken) {
    return {
      ok: false,
      skipped: false,
      reason: 'missing_token',
      message: 'Please complete the human verification and try again.'
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TURNSTILE_VERIFY_TIMEOUT_MS);

  try {
    const payload = {
      secret: getTurnstileSecretKey(),
      response: safeToken
    };
    if (remoteIp) {
      payload.remoteip = String(remoteIp).slice(0, 120);
    }

    const response = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        reason: 'siteverify_http_error',
        status: response.status,
        message: 'Human verification failed. Please try again.'
      };
    }

    const result = await response.json();
    if (!result?.success) {
      return {
        ok: false,
        skipped: false,
        reason: 'siteverify_failed',
        errorCodes: Array.isArray(result?.['error-codes']) ? result['error-codes'] : [],
        message: 'Human verification failed. Please try again.'
      };
    }

    return {
      ok: true,
      skipped: false,
      reason: null,
      hostname: result.hostname || '',
      action: result.action || ''
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error?.name === 'AbortError' ? 'siteverify_timeout' : 'siteverify_error',
      message: 'Human verification is temporarily unavailable. Please try again.'
    };
  } finally {
    clearTimeout(timeout);
  }
}

function createSignupFormToken(req) {
  if (!req.session) {
    return { signupStartedAt: '', signupFormToken: '' };
  }

  const signupStartedAt = String(Date.now());
  const signupFormToken = crypto.randomBytes(24).toString('hex');
  req.session.signupForm = {
    signupStartedAt,
    signupFormToken
  };

  return { signupStartedAt, signupFormToken };
}

function validateSignupBotSignals(req) {
  const body = req.body || {};
  const honeypot = String(body.website || body.companyWebsite || '').trim();

  if (honeypot) {
    return {
      ok: false,
      reason: 'honeypot',
      message: 'We could not complete signup. Please refresh the page and try again.'
    };
  }

  const sessionSignupForm = req.session?.signupForm || {};
  const expectedStartedAt = String(sessionSignupForm.signupStartedAt || '');
  const expectedToken = String(sessionSignupForm.signupFormToken || '');
  const providedStartedAt = String(body.signupStartedAt || '');
  const providedToken = String(body.signupFormToken || '');

  if (!expectedStartedAt || !expectedToken || expectedStartedAt !== providedStartedAt || expectedToken !== providedToken) {
    return {
      ok: false,
      reason: 'missing_form_token',
      message: 'Your signup session expired. Please refresh the page and try again.'
    };
  }

  const ageMs = Date.now() - Number(providedStartedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > MAX_SIGNUP_FORM_AGE_MS) {
    return {
      ok: false,
      reason: 'invalid_form_age',
      message: 'Your signup session expired. Please refresh the page and try again.'
    };
  }

  const minAgeMs = getSignupMinFormAgeMs();
  if (ageMs < minAgeMs) {
    return {
      ok: false,
      reason: 'too_fast',
      message: 'Please take a moment to review the form before creating your account.'
    };
  }

  if (isDisposableEmail(body.email)) {
    return {
      ok: false,
      reason: 'disposable_email',
      message: 'Please use a permanent email address to create your account.'
    };
  }

  return { ok: true, reason: null, message: null };
}

module.exports = {
  clearLoginFailures,
  createSignupFormToken,
  getEmailDomain,
  getLoginFailureCount,
  getTurnstileSiteKey,
  isTurnstileConfigured,
  isDisposableEmail,
  recordLoginFailure,
  validateSignupBotSignals,
  verifyTurnstileToken
};
