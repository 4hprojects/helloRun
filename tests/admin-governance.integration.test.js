const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3151;
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

// ── Admin Notes ───────────────────────────────────────────────────────────────

test('admin can add a note to a user', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/users/${seed.runner.id}/notes`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ note: 'Test admin note from integration test.' }),
    redirect: 'manual'
  });

  assert.equal(res.status, 302);

  const runner = await User.findById(seed.runner.id).lean();
  assert.ok(runner.adminNotes.length >= 1);
  assert.ok(runner.adminNotes.some((n) => n.note === 'Test admin note from integration test.'));
});

test('non-admin cannot add notes', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/users/${seed.runner.id}/notes`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ note: 'Should not work.' }),
    redirect: 'manual'
  });

  assert.equal(res.status, 403);
});

// ── Resend Verification ───────────────────────────────────────────────────────

test('admin can resend verification email to unverified local user', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const before = await User.findById(seed.unverified.id).select('emailVerificationToken').lean();

  const res = await fetch(`${BASE_URL}/admin/users/${seed.unverified.id}/resend-verification`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': 'bypass' },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  const after = await User.findById(seed.unverified.id).select('emailVerificationToken').lean();
  assert.ok(after.emailVerificationToken, 'Token should be set after resend');
});

test('resend verification blocked for already-verified user', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/users/${seed.runner.id}/resend-verification`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': 'bypass' },
    redirect: 'manual'
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

// ── Verification Override ─────────────────────────────────────────────────────

test('admin can override email verification with sufficient reason', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/users/${seed.unverified.id}/verify-email`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ reason: 'Support confirmed identity via phone call and official ID.', confirm: '1' }),
    redirect: 'manual'
  });

  assert.equal(res.status, 302);

  const user = await User.findById(seed.unverified.id).lean();
  assert.equal(user.emailVerified, true);
  assert.ok(!user.emailVerificationToken, 'Token should be cleared after override');
});

test('verification override blocked without sufficient reason', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/users/${seed.unverified2.id}/verify-email`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ reason: 'Too short', confirm: '1' }),
    redirect: 'manual'
  });

  assert.equal(res.status, 302);
  const location = res.headers.get('location') || '';
  assert.ok(location.includes('error'), `Expected error redirect, got: ${location}`);

  const user = await User.findById(seed.unverified2.id).lean();
  assert.equal(user.emailVerified, false);
});

// ── Account Suspension ────────────────────────────────────────────────────────

test('admin can suspend a user', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/users/${seed.runner2.id}/account-status`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ accountStatus: 'suspended', accountStatusReason: 'Violated community guidelines on multiple occasions.' }),
    redirect: 'manual'
  });

  assert.equal(res.status, 302);

  const user = await User.findById(seed.runner2.id).lean();
  assert.equal(user.accountStatus, 'suspended');
  assert.ok(user.accountStatusReason.length > 0);
});

test('suspended user cannot log in', async () => {
  // Failed logins render the login page directly (200), successful logins redirect (302)
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: seed.runner2.email, password: seed.password }),
    redirect: 'follow'
  });

  const body = await res.text();
  assert.ok(
    body.toLowerCase().includes('suspended') || res.url.includes('/login'),
    `Suspended user should see error or stay on login page. URL: ${res.url}`
  );
  // Must NOT be redirected to dashboard
  assert.ok(!res.url.includes('/dashboard'), 'Suspended user should not reach dashboard');
});

test('admin cannot suspend themselves', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/users/${seed.admin.id}/account-status`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ accountStatus: 'suspended', accountStatusReason: 'Trying to self-suspend.' }),
    redirect: 'manual'
  });

  assert.equal(res.status, 302);
  const location = res.headers.get('location') || '';
  assert.ok(location.includes('error'), `Expected error redirect, got: ${location}`);

  const admin = await User.findById(seed.admin.id).lean();
  assert.ok(!admin.accountStatus || admin.accountStatus === 'active', 'Admin status should remain active');
});

// ── Audit Trail ───────────────────────────────────────────────────────────────

test('admin detail page renders audit trail section', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/users/${seed.runner.id}`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('Audit Trail'), 'User detail page should show Audit Trail section');
  assert.ok(html.includes('Admin Notes'), 'User detail page should show Admin Notes section');
  assert.ok(html.includes('Account Status'), 'User detail page should show Account Status section');
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'GovernPass1!';
  const hash = await bcrypt.hash(password, 10);

  const admin = await User.create({ userId: `GOVADM${stamp}`.slice(0, 22), email: `gov.admin.${stamp}@example.com`, passwordHash: hash, role: 'admin', firstName: 'Gov', lastName: 'Admin', emailVerified: true });
  const runner = await User.create({ userId: `GOVRUN${stamp}`.slice(0, 22), email: `gov.runner.${stamp}@example.com`, passwordHash: hash, role: 'runner', firstName: 'Gov', lastName: 'Runner', emailVerified: true });
  const runner2 = await User.create({ userId: `GOVRU2${stamp}`.slice(0, 22), email: `gov.runner2.${stamp}@example.com`, passwordHash: hash, role: 'runner', firstName: 'Gov', lastName: 'Runner2', emailVerified: true });
  const unverified = await User.create({ userId: `GOVUNV${stamp}`.slice(0, 22), email: `gov.unverified.${stamp}@example.com`, passwordHash: hash, role: 'runner', firstName: 'Gov', lastName: 'Unverified', emailVerified: false });
  const unverified2 = await User.create({ userId: `GOVUV2${stamp}`.slice(0, 22), email: `gov.unverified2.${stamp}@example.com`, passwordHash: hash, role: 'runner', firstName: 'Gov', lastName: 'Unverified2', emailVerified: false });

  return {
    admin: { id: String(admin._id), email: admin.email },
    runner: { id: String(runner._id), email: runner.email },
    runner2: { id: String(runner2._id), email: runner2.email },
    unverified: { id: String(unverified._id), email: unverified.email },
    unverified2: { id: String(unverified2._id), email: unverified2.email },
    password
  };
}

async function cleanupFixtures(s) {
  if (!s) return;
  const emails = [s.admin?.email, s.runner?.email, s.runner2?.email, s.unverified?.email, s.unverified2?.email].filter(Boolean);
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

async function waitForSessionReady(pathname, cookie, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE_URL}${pathname}`, { headers: { Cookie: cookie }, redirect: 'manual' });
    if (res.status !== 302) return true;
    await sleep(150);
  }
  return false;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
