const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3152;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(TEST_PORT), CSRF_PROTECTION: '0' },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedFixtures();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) serverProc.kill('SIGTERM');
  await cleanupFixtures(seed);
  await mongoose.disconnect();
});

// ── Welcome Banner ────────────────────────────────────────────────────────────

test('welcome banner appears on dashboard when ?welcome=1 is present', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/runner/dashboard?welcome=1`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('onboarding-welcome-banner'), 'Welcome banner should appear on first visit');
  assert.ok(html.includes('/runner/profile'), 'Banner should link to profile');
  assert.ok(html.includes('/events'), 'Banner should link to events');
});

test('welcome banner is absent on a plain dashboard visit', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/runner/dashboard`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(!html.includes('onboarding-welcome-banner'), 'Welcome banner should not appear without firstLogin flag or ?welcome=1');
});

// ── Profile Completeness Nudge ────────────────────────────────────────────────

test('profile completeness nudge appears for a runner with an incomplete profile', async () => {
  const cookie = await login(seed.incompleteRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/runner/dashboard`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('dashboard-profile-nudge'), 'Nudge should appear when profile is incomplete');
  assert.ok(html.includes('Complete Profile'), 'Nudge should have Complete Profile CTA');
});

test('profile completeness nudge is absent when profile is fully filled', async () => {
  const cookie = await login(seed.completeRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/runner/dashboard`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(!html.includes('dashboard-profile-nudge'), 'Nudge should not appear when profile is 100% complete');
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'OnboardPass1!';
  const hash = await bcrypt.hash(password, 10);

  const runner = await User.create({
    userId: `ONBRUN${stamp}`.slice(0, 22),
    email: `onb.runner.${stamp}@example.com`,
    passwordHash: hash,
    role: 'runner',
    firstName: 'Onboard',
    lastName: 'Runner',
    emailVerified: true
  });

  // Missing mobile, country, dateOfBirth, gender, emergencyContactName, emergencyContactNumber (2/8 = 25%)
  const incompleteRunner = await User.create({
    userId: `ONBINC${stamp}`.slice(0, 22),
    email: `onb.incomplete.${stamp}@example.com`,
    passwordHash: hash,
    role: 'runner',
    firstName: 'Incomplete',
    lastName: 'Runner',
    emailVerified: true
  });

  // All 8 profile completeness fields filled (100%)
  const completeRunner = await User.create({
    userId: `ONBCMP${stamp}`.slice(0, 22),
    email: `onb.complete.${stamp}@example.com`,
    passwordHash: hash,
    role: 'runner',
    firstName: 'Complete',
    lastName: 'Runner',
    mobile: '+63 912 345 6789',
    country: 'PH',
    timezone: 'Asia/Manila',
    dateOfBirth: new Date('1990-05-15'),
    gender: 'male',
    emergencyContactName: 'Jane Runner',
    emergencyContactNumber: '+63 912 999 8888',
    emailVerified: true
  });

  return {
    runner: { id: String(runner._id), email: runner.email },
    incompleteRunner: { id: String(incompleteRunner._id), email: incompleteRunner.email },
    completeRunner: { id: String(completeRunner._id), email: completeRunner.email },
    password
  };
}

async function cleanupFixtures(s) {
  if (!s) return;
  const emails = [s.runner?.email, s.incompleteRunner?.email, s.completeRunner?.email].filter(Boolean);
  await User.deleteMany({ email: { $in: emails } });
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(res.status, 302);
  const cookies = res.headers.getSetCookie();
  const sessionCookie = cookies.find((c) => c.startsWith('hr.sid='));
  assert.ok(sessionCookie, 'Expected session cookie');
  return sessionCookie.split(';')[0];
}

async function waitForSessionReady(pathname, cookie, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE_URL}${pathname}`, { headers: { Cookie: cookie }, redirect: 'manual' });
    if (res.status !== 302) return true;
    await sleep(150);
  }
  return false;
}

async function waitForServerReady(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/healthz`);
      if (res.ok) return;
    } catch (_) {}
    await sleep(200);
  }
  throw new Error('Server did not become ready in time.');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
