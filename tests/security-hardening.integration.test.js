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

async function cleanupSeed(currentSeed) {
  if (!currentSeed?.runner?._id) return;
  await ensureConnected();
  await User.deleteOne({ _id: currentSeed.runner._id });
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
