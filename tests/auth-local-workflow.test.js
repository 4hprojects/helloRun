const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const passwordService = require('../src/services/password.service');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3131;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
const seededEmails = [];

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      CSRF_PROTECTION: '0'
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeededUsers();
  await mongoose.disconnect();
});

test('local password validation accepts common symbols shown as valid by signup UI', () => {
  assert.equal(passwordService.validatePassword('Pass1234!'), true);
  assert.equal(passwordService.validatePassword('Pass1234.'), true);
  assert.equal(passwordService.validatePassword('Pass1234-'), true);
  assert.equal(passwordService.validatePassword('pass1234.'), false);
});

test('login trims and lowercases email before credential lookup', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `auth.local.case.${stamp}@example.com`;
  const password = 'Pass1234.';
  await createUser({ email, password, emailVerified: true });

  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: `  ${email.toUpperCase()}  `,
      password
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/runner/dashboard');
  assert.match(String(response.headers.get('set-cookie') || ''), /hr\.sid=/i);
});

test('unverified local login preserves email and offers verification resend', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `auth.local.unverified.${stamp}@example.com`;
  await createUser({ email, password: 'Pass1234', emailVerified: false });

  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email,
      password: 'Pass1234'
    })
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Please verify your email before logging in/i);
  assert.match(html, /Resend verification email/i);
  assert.match(html, new RegExp(`value="${escapeRegex(email)}"`));
});

async function createUser({ email, password, emailVerified }) {
  await ensureConnected();
  const passwordHash = await bcrypt.hash(password, 10);
  seededEmails.push(email);
  return User.create({
    email,
    passwordHash,
    role: 'runner',
    firstName: 'Auth',
    lastName: 'Runner',
    emailVerified
  });
}

async function cleanupSeededUsers() {
  if (seededEmails.length === 0) return;
  await ensureConnected();
  await User.deleteMany({ email: { $in: seededEmails } });
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/login`, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) return;
    } catch (_) {
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
