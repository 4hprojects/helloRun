const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3118;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  await ensureConnected();
  seed = await seedRunner();

  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT)
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

test('security headers are set on public response', async () => {
  const response = await fetch(`${BASE_URL}/`, { redirect: 'manual' });

  assert.equal(response.status >= 200 && response.status < 500, true);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(response.headers.get('permissions-policy'), 'geolocation=(), microphone=(), camera=()');
});

test('public HTML script elements carry the response-specific CSP nonce', async () => {
  const response = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
  assert.equal(response.status, 200);
  const policy = String(response.headers.get('content-security-policy') || '');
  const nonceMatch = policy.match(/script-src-elem[^;]*'nonce-([^']+)'/);
  assert.ok(nonceMatch, 'Expected a script-src-elem nonce in the CSP.');

  const html = await response.text();
  const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
  assert.ok(scriptTags.length > 0);
  for (const tag of scriptTags) {
    assert.match(tag, new RegExp(`nonce=["']${escapeRegex(nonceMatch[1])}["']`));
  }
});

test('session cookie uses hardened attributes on login', async () => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: seed.runner.email,
      password: seed.password
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  const setCookie = String(response.headers.get('set-cookie') || '');
  assert.match(setCookie, /hr\.sid=/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
});

test('sync health rejects a cached admin session immediately after role demotion', async () => {
  const admin = await createAdmin(seed.password);
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: admin.email, password: seed.password }),
    redirect: 'manual'
  });
  const cookie = String(response.headers.get('set-cookie') || '').split(';')[0];
  assert.equal(response.status, 302);
  assert.ok(cookie);

  const beforeDemotion = await fetch(`${BASE_URL}/healthz/sync`, {
    headers: { Cookie: cookie }
  });
  assert.equal(beforeDemotion.status, 200);

  await User.updateOne({ _id: admin._id }, { $set: { role: 'runner' } });
  const afterDemotion = await fetch(`${BASE_URL}/healthz/sync`, {
    headers: { Cookie: cookie }
  });
  assert.equal(afterDemotion.status, 403);
});

async function seedRunner() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runner = await User.create({
    userId: `USHR${stamp}`.slice(0, 22),
    email: `security.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Secure',
    lastName: 'Runner',
    emailVerified: true
  });

  return {
    password,
    runner: {
      _id: runner._id,
      email: runner.email
    }
  };
}

async function createAdmin(password) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const admin = await User.create({
    userId: `USHA${stamp}`.slice(0, 22),
    email: `security.admin.${stamp}@example.com`,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'admin',
    firstName: 'Secure',
    lastName: 'Admin',
    emailVerified: true
  });
  seed.adminId = admin._id;
  return admin;
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed?.runner?._id) return;
  await ensureConnected();
  await User.deleteOne({ _id: currentSeed.runner._id });
  if (currentSeed.adminId) {
    await User.deleteOne({ _id: currentSeed.adminId });
  }
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch (error) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
