const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const { createNotification } = require('../src/services/notification.service');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3116;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT)
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedNotificationsFixture();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

test('runner notifications page renders and mark-read endpoints work', async () => {
  const cookie = await login(seed.runner.email, seed.password);

  const page = await fetch(`${BASE_URL}/runner/notifications`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Notifications/i);
  assert.match(html, /Unread:\s*<strong>2<\/strong>/i);
  assert.match(html, /Result Approved/i);

  const markOne = await fetch(`${BASE_URL}/runner/notifications/${seed.notificationIds[0]}/read`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ returnTo: '/runner/notifications' }),
    redirect: 'manual'
  });
  assert.equal(markOne.status, 302);
  assert.equal(markOne.headers.get('location'), '/runner/notifications');

  const pageAfterOne = await fetch(`${BASE_URL}/runner/notifications`, {
    headers: { Cookie: cookie }
  });
  const htmlAfterOne = await pageAfterOne.text();
  assert.match(htmlAfterOne, /Unread:\s*<strong>1<\/strong>/i);

  const markAll = await fetch(`${BASE_URL}/runner/notifications/read-all`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ returnTo: '/runner/notifications' }),
    redirect: 'manual'
  });
  assert.equal(markAll.status, 302);
  assert.match(markAll.headers.get('location') || '', /type=success/i);

  const pageAfterAll = await fetch(`${BASE_URL}/runner/notifications`, {
    headers: { Cookie: cookie }
  });
  const htmlAfterAll = await pageAfterAll.text();
  assert.match(htmlAfterAll, /Unread:\s*<strong>0<\/strong>/i);
});

async function seedNotificationsFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runner = await User.create({
    userId: `UNRF${stamp}`.slice(0, 22),
    email: `runner.notifications.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Route',
    lastName: 'Runner',
    emailVerified: true
  });

  const n1 = await createNotification({
    userId: runner._id,
    type: 'result_approved',
    title: 'Result Approved',
    message: 'Your result was approved.',
    href: '/my-registrations'
  });
  const n2 = await createNotification({
    userId: runner._id,
    type: 'certificate_issued',
    title: 'Certificate Ready',
    message: 'Certificate is available to download.',
    href: '/my-submissions'
  });

  return {
    password,
    runner: {
      _id: runner._id,
      email: runner.email
    },
    notificationIds: [String(n1._id), String(n2._id)]
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.runner) return;
  await ensureConnected();
  await Promise.all([
    Notification.deleteMany({ _id: { $in: currentSeed.notificationIds || [] } }),
    User.deleteOne({ _id: currentSeed.runner._id })
  ]);
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
