const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clearLoginFailures,
  createSignupFormToken,
  getEmailDomain,
  getLoginFailureCount,
  isTurnstileConfigured,
  isDisposableEmail,
  recordLoginFailure,
  validateSignupBotSignals,
  verifyTurnstileToken
} = require('../src/services/auth-abuse.service');

test('getEmailDomain normalizes email domains', () => {
  assert.equal(getEmailDomain(' Runner@Example.COM. '), 'example.com');
  assert.equal(getEmailDomain('missing-domain@'), '');
  assert.equal(getEmailDomain('not-an-email'), '');
});

test('isDisposableEmail blocks known temporary email domains', () => {
  assert.equal(isDisposableEmail('runner@mailinator.com'), true);
  assert.equal(isDisposableEmail('runner@example.com'), false);
});

test('validateSignupBotSignals accepts a normal issued signup form when min age is disabled', () => {
  const previousMinAge = process.env.SIGNUP_MIN_FORM_AGE_MS;
  process.env.SIGNUP_MIN_FORM_AGE_MS = '0';

  try {
    const req = {
      session: {},
      body: {
        email: 'runner@example.com'
      }
    };
    const token = createSignupFormToken(req);
    req.body.signupStartedAt = token.signupStartedAt;
    req.body.signupFormToken = token.signupFormToken;

    const result = validateSignupBotSignals(req);
    assert.equal(result.ok, true);
  } finally {
    restoreEnv('SIGNUP_MIN_FORM_AGE_MS', previousMinAge);
  }
});

test('validateSignupBotSignals rejects filled honeypot fields', () => {
  const req = {
    session: {
      signupForm: {
        signupStartedAt: String(Date.now() - 2000),
        signupFormToken: 'token'
      }
    },
    body: {
      email: 'runner@example.com',
      signupStartedAt: String(Date.now() - 2000),
      signupFormToken: 'token',
      website: 'https://spam.example'
    }
  };

  const result = validateSignupBotSignals(req);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'honeypot');
});

test('validateSignupBotSignals rejects missing form tokens', () => {
  const result = validateSignupBotSignals({
    session: {},
    body: { email: 'runner@example.com' }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_form_token');
});

test('validateSignupBotSignals rejects submissions that are too fast', () => {
  const previousMinAge = process.env.SIGNUP_MIN_FORM_AGE_MS;
  process.env.SIGNUP_MIN_FORM_AGE_MS = '1000';

  try {
    const startedAt = String(Date.now());
    const result = validateSignupBotSignals({
      session: {
        signupForm: {
          signupStartedAt: startedAt,
          signupFormToken: 'token'
        }
      },
      body: {
        email: 'runner@example.com',
        signupStartedAt: startedAt,
        signupFormToken: 'token'
      }
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'too_fast');
  } finally {
    restoreEnv('SIGNUP_MIN_FORM_AGE_MS', previousMinAge);
  }
});

test('validateSignupBotSignals rejects disposable signup emails', () => {
  const previousMinAge = process.env.SIGNUP_MIN_FORM_AGE_MS;
  process.env.SIGNUP_MIN_FORM_AGE_MS = '0';

  try {
    const startedAt = String(Date.now() - 2000);
    const result = validateSignupBotSignals({
      session: {
        signupForm: {
          signupStartedAt: startedAt,
          signupFormToken: 'token'
        }
      },
      body: {
        email: 'runner@mailinator.com',
        signupStartedAt: startedAt,
        signupFormToken: 'token'
      }
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'disposable_email');
  } finally {
    restoreEnv('SIGNUP_MIN_FORM_AGE_MS', previousMinAge);
  }
});

test('isTurnstileConfigured requires both site and secret keys', () => {
  const previousSiteKey = process.env.TURNSTILE_SITE_KEY;
  const previousSecretKey = process.env.TURNSTILE_SECRET_KEY;

  try {
    process.env.TURNSTILE_SITE_KEY = 'site-key';
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.equal(isTurnstileConfigured(), false);

    process.env.TURNSTILE_SECRET_KEY = 'secret-key';
    assert.equal(isTurnstileConfigured(), true);
  } finally {
    restoreEnv('TURNSTILE_SITE_KEY', previousSiteKey);
    restoreEnv('TURNSTILE_SECRET_KEY', previousSecretKey);
  }
});

test('verifyTurnstileToken skips validation when Turnstile is not configured', async () => {
  const previousSiteKey = process.env.TURNSTILE_SITE_KEY;
  const previousSecretKey = process.env.TURNSTILE_SECRET_KEY;

  try {
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;

    const result = await verifyTurnstileToken({ token: '' });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
  } finally {
    restoreEnv('TURNSTILE_SITE_KEY', previousSiteKey);
    restoreEnv('TURNSTILE_SECRET_KEY', previousSecretKey);
  }
});

test('verifyTurnstileToken rejects missing tokens when Turnstile is configured', async () => {
  const previousSiteKey = process.env.TURNSTILE_SITE_KEY;
  const previousSecretKey = process.env.TURNSTILE_SECRET_KEY;

  try {
    process.env.TURNSTILE_SITE_KEY = 'site-key';
    process.env.TURNSTILE_SECRET_KEY = 'secret-key';

    const result = await verifyTurnstileToken({ token: '' });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_token');
  } finally {
    restoreEnv('TURNSTILE_SITE_KEY', previousSiteKey);
    restoreEnv('TURNSTILE_SECRET_KEY', previousSecretKey);
  }
});

test('verifyTurnstileToken accepts successful Siteverify responses', async () => {
  const previousSiteKey = process.env.TURNSTILE_SITE_KEY;
  const previousSecretKey = process.env.TURNSTILE_SECRET_KEY;

  try {
    process.env.TURNSTILE_SITE_KEY = 'site-key';
    process.env.TURNSTILE_SECRET_KEY = 'secret-key';

    const result = await verifyTurnstileToken({
      token: 'valid-token',
      remoteIp: '127.0.0.1',
      fetchImpl: async (_url, options) => {
        const payload = JSON.parse(options.body);
        assert.equal(payload.secret, 'secret-key');
        assert.equal(payload.response, 'valid-token');
        assert.equal(payload.remoteip, '127.0.0.1');

        return {
          ok: true,
          json: async () => ({ success: true, hostname: 'localhost', action: 'signup' })
        };
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.skipped, false);
    assert.equal(result.hostname, 'localhost');
    assert.equal(result.action, 'signup');
  } finally {
    restoreEnv('TURNSTILE_SITE_KEY', previousSiteKey);
    restoreEnv('TURNSTILE_SECRET_KEY', previousSecretKey);
  }
});

test('verifyTurnstileToken rejects failed Siteverify responses', async () => {
  const previousSiteKey = process.env.TURNSTILE_SITE_KEY;
  const previousSecretKey = process.env.TURNSTILE_SECRET_KEY;

  try {
    process.env.TURNSTILE_SITE_KEY = 'site-key';
    process.env.TURNSTILE_SECRET_KEY = 'secret-key';

    const result = await verifyTurnstileToken({
      token: 'bad-token',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] })
      })
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'siteverify_failed');
    assert.deepEqual(result.errorCodes, ['timeout-or-duplicate']);
  } finally {
    restoreEnv('TURNSTILE_SITE_KEY', previousSiteKey);
    restoreEnv('TURNSTILE_SECRET_KEY', previousSecretKey);
  }
});

test('login failure counters persist by email and IP until cleared', async () => {
  const email = `auth-abuse-${Date.now()}@example.com`;
  const remoteIp = '203.0.113.10';

  await clearLoginFailures({ email, remoteIp });
  assert.equal(await getLoginFailureCount({ email, remoteIp }), 0);
  assert.equal(await recordLoginFailure({ email, remoteIp }), 1);
  assert.equal(await recordLoginFailure({ email, remoteIp }), 2);
  assert.equal(await getLoginFailureCount({ email, remoteIp }), 2);
  await clearLoginFailures({ email, remoteIp });
  assert.equal(await getLoginFailureCount({ email, remoteIp }), 0);
});

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
