const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const PrivacyPolicy = require('../src/models/PrivacyPolicy');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3124;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const PNG_1PX_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQeRlmQAAAAASUVORK5CYII=',
  'base64'
);

let serverProc = null;
let seed = null;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  seed = await seedFixtures();

  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      CSRF_PROTECTION: '1'
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupFixtures(seed);
  await mongoose.disconnect();
});

test('signup rejects missing csrf token', async () => {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      firstName: 'No',
      lastName: 'Token',
      email: `csrf.signup.${Date.now()}@example.com`,
      password: 'Pass1234',
      confirmPassword: 'Pass1234',
      role: 'runner',
      agreeTerms: 'on'
    })
  });

  assert.equal(response.status, 403);
});

test('forgot-password rejects missing csrf token', async () => {
  const response = await fetch(`${BASE_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: seed.runner.email })
  });

  assert.equal(response.status, 403);
});

test('reset-password rejects missing csrf token', async () => {
  const response = await fetch(`${BASE_URL}/reset-password/${seed.reset.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      password: 'Pass1234',
      confirmPassword: 'Pass1234'
    })
  });

  assert.equal(response.status, 403);
});

test('resend-verification rejects missing csrf token', async () => {
  const response = await fetch(`${BASE_URL}/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: seed.unverified.email })
  });

  assert.equal(response.status, 403);
});

test('resend-verification rate limits after max requests with valid csrf token', async () => {
  const { csrfToken, cookie } = await getCsrfSession('/resend-verification');

  for (let i = 0; i < 5; i += 1) {
    const response = await fetch(`${BASE_URL}/resend-verification`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        _csrf: csrfToken,
        email: seed.unverified.email
      })
    });
    assert.equal(response.status, 200);
  }

  const blocked = await fetch(`${BASE_URL}/resend-verification`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      email: seed.unverified.email
    })
  });

  assert.equal(blocked.status, 429);
  const body = await blocked.text();
  assert.match(body, /Too many verification email requests/i);
});

test('event registration rejects missing csrf token', async () => {
  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', runnerCookie);

  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/register`, {
    method: 'POST',
    headers: {
      Cookie: runnerCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      participationMode: 'virtual',
      raceDistance: '5K',
      waiverAccepted: 'on',
      waiverSignature: `${seed.runner.firstName} ${seed.runner.lastName}`
    })
  });

  assert.equal(response.status, 403);
});

test('quick profile update rejects missing csrf token', async () => {
  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', runnerCookie);

  const response = await fetch(`${BASE_URL}/profile/quick-update`, {
    method: 'POST',
    headers: {
      Cookie: runnerCookie,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      mobile: '09170000009',
      emergencyContactName: 'Emergency Updated',
      emergencyContactNumber: '09170000010'
    })
  });

  assert.equal(response.status, 403);
});

test('payment proof upload rejects missing csrf token', async () => {
  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/my-registrations', runnerCookie);

  const form = new FormData();
  form.append('paymentProofFile', new Blob([PNG_1PX_BUFFER], { type: 'image/png' }), 'proof.png');

  const response = await fetch(`${BASE_URL}/my-registrations/${seed.unpaidRegistration._id}/payment-proof`, {
    method: 'POST',
    headers: {
      Cookie: runnerCookie
    },
    body: form
  });

  assert.equal(response.status, 403);
});

test('result submission rejects missing csrf token', async () => {
  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/my-registrations', runnerCookie);

  const form = new FormData();
  form.append('resultProofFile', new Blob([PNG_1PX_BUFFER], { type: 'image/png' }), 'result.png');
  form.append('distanceKm', '5');
  form.append('elapsedTime', '00:30:00');
  form.append('proofType', 'photo');
  form.append('runDate', '2026-04-20');
  form.append('runLocation', 'Test Route');

  const response = await fetch(`${BASE_URL}/my-registrations/${seed.paidRegistration._id}/submit-result`, {
    method: 'POST',
    headers: {
      Cookie: runnerCookie
    },
    body: form
  });

  assert.equal(response.status, 403);
});

async function seedFixtures() {
  await ensureCurrentPolicies();

  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);
  const resetToken = crypto.randomBytes(24).toString('hex');

  const runner = await User.create({
    userId: `UCSRF${stamp}`.slice(0, 22),
    email: `csrf.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Csrf',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000001',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Emergency Name',
    emergencyContactNumber: '09170000002',
    passwordResetToken: hashToken(resetToken),
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000)
  });

  const unverified = await User.create({
    userId: `UCSVU${stamp}`.slice(0, 22),
    email: `csrf.unverified.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Pending',
    lastName: 'Verify',
    emailVerified: false
  });

  const organizer = await User.create({
    userId: `UCSRO${stamp}`.slice(0, 22),
    email: `csrf.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Csrf',
    lastName: 'Organizer',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
    organizerId: organizer._id,
    slug: `csrf-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `CF-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `CSRF Event ${stamp}`,
    organiserName: 'CSRF Organizer',
    description: 'CSRF guard coverage event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now - 2 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 2 * 60 * 60 * 1000),
    proofTypesAllowed: ['photo', 'gps', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const paidEvent = await Event.create({
    organizerId: organizer._id,
    slug: `csrf-paid-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `CP-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `CSRF Paid Event ${stamp}`,
    organiserName: 'CSRF Organizer',
    description: 'CSRF paid submission guard event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now - 2 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 2 * 60 * 60 * 1000),
    proofTypesAllowed: ['photo', 'gps', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const unpaidRegistration = await Registration.create(buildRegistration({
    eventId: event._id,
    user: runner,
    paymentStatus: 'unpaid'
  }));

  const paidRegistration = await Registration.create(buildRegistration({
    eventId: paidEvent._id,
    user: runner,
    paymentStatus: 'paid',
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  }));

  return {
    password,
    runner,
    unverified,
    organizer,
    event,
    paidEvent,
    unpaidRegistration,
    paidRegistration,
    reset: {
      token: resetToken
    }
  };
}

function buildRegistration({ eventId, user, paymentStatus, confirmationCode }) {
  return {
    eventId,
    userId: user._id,
    participant: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile || '',
      country: user.country || '',
      gender: user.gender || '',
      emergencyContactName: user.emergencyContactName || '',
      emergencyContactNumber: user.emergencyContactNumber || '',
      runningGroup: ''
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus,
    waiver: {
      accepted: true,
      version: 1,
      signature: `${user.firstName} ${user.lastName}`,
      acceptedAt: new Date(),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: confirmationCode || `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    registeredAt: new Date()
  };
}

async function cleanupFixtures(currentSeed) {
  if (!currentSeed) return;
  await Promise.all([
    Registration.deleteMany({
      _id: {
        $in: [currentSeed.unpaidRegistration._id, currentSeed.paidRegistration._id]
      }
    }),
    Event.deleteMany({ _id: { $in: [currentSeed.event._id, currentSeed.paidEvent._id] } }),
    User.deleteMany({
      _id: {
        $in: [currentSeed.runner._id, currentSeed.unverified._id, currentSeed.organizer._id]
      }
    })
  ]);
}

async function ensureCurrentPolicies() {
  const policies = [
    {
      slug: 'privacy-policy',
      title: 'HelloRun Privacy Policy'
    },
    {
      slug: 'terms-of-service',
      title: 'HelloRun Terms and Conditions'
    },
    {
      slug: 'cookie-policy',
      title: 'HelloRun Cookie Policy'
    }
  ];

  for (const policy of policies) {
    const existing = await PrivacyPolicy.findOne({
      slug: policy.slug,
      status: 'published',
      isCurrent: true
    }).lean();
    if (existing) continue;

    const now = new Date();
    await PrivacyPolicy.create({
      title: policy.title,
      slug: policy.slug,
      versionNumber: '1.0',
      status: 'published',
      effectiveDate: now,
      contentMarkdown: `# ${policy.title}\n\nInitial policy.`,
      contentHtml: `<h1>${policy.title}</h1><p>Initial policy.</p>`,
      summaryOfChanges: `Initial ${policy.title}`,
      isCurrent: true,
      source: 'seed',
      createdBy: { userId: null, name: 'Test Seed' },
      updatedBy: { userId: null, name: 'Test Seed' },
      publishedBy: { userId: null, name: 'Test Seed' },
      publishedAt: now
    });
  }
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  return setCookie.split(';')[0];
}

async function getCsrfSession(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    redirect: 'manual'
  });
  const html = await response.text();
  const tokenMatch = html.match(/name="_csrf"\s+value="([^"]+)"/i);
  assert.ok(tokenMatch, `Expected CSRF token on ${pathname}`);

  const setCookie = String(response.headers.get('set-cookie') || '');
  const cookie = setCookie.split(';')[0];
  assert.ok(cookie, `Expected session cookie on ${pathname}`);

  return {
    csrfToken: tokenMatch[1],
    cookie
  };
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.headers.get('location') !== '/login') return true;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return false;
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch (_) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
