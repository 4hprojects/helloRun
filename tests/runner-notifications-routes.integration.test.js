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
  const ready = await waitForSessionReady(cookie);
  assert.equal(ready, true);

  const page = await fetch(`${BASE_URL}/runner/notifications`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(page.status, 200);
  const html = await page.text();
  const csrfToken = extractCsrfToken(html);
  assert.match(html, /Notifications/i);
  assert.match(html, /data-notification-unread-count[^>]*>2<\/strong>/i);
  assert.match(html, /nav-notification-badge[^>]*>2</i);
  assert.match(html, /Result Approved/i);
  assert.match(html, /Notification preferences/i);
  assert.match(html, /data-notification-dialog/i);

  const markJson = await fetch(`${BASE_URL}/runner/notifications/${seed.notificationIds[0]}/read`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ _csrf: csrfToken, returnTo: '/runner/notifications' })
  });
  assert.equal(markJson.status, 200);
  assert.equal((await markJson.json()).success, true);

  const pageAfterJson = await fetch(`${BASE_URL}/runner/notifications`, { headers: { Cookie: cookie } });
  assert.match(await pageAfterJson.text(), /data-notification-unread-count[^>]*>1<\/strong>/i);

  const markOne = await fetch(`${BASE_URL}/runner/notifications/${seed.notificationIds[1]}/read`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ _csrf: csrfToken, returnTo: '/runner/notifications' }),
    redirect: 'manual'
  });
  assert.equal(markOne.status, 302);
  assert.equal(markOne.headers.get('location'), '/runner/notifications');

  const pageAfterOne = await fetch(`${BASE_URL}/runner/notifications`, {
    headers: { Cookie: cookie }
  });
  const htmlAfterOne = await pageAfterOne.text();
  assert.match(htmlAfterOne, /data-notification-unread-count[^>]*>0<\/strong>/i);

  const archiveOne = await fetch(`${BASE_URL}/runner/notifications/${seed.notificationIds[0]}/archive`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: csrfToken, returnTo: '/runner/notifications' }),
    redirect: 'manual'
  });
  assert.equal(archiveOne.status, 302);
  assert.match(archiveOne.headers.get('location') || '', /Notification%20archived/i);

  const archivedPage = await fetch(`${BASE_URL}/runner/notifications?view=archived`, { headers: { Cookie: cookie } });
  const archivedHtml = await archivedPage.text();
  assert.match(archivedHtml, /Archived updates/i);
  assert.match(archivedHtml, /Result Approved/i);
  assert.match(archivedHtml, />Restore</i);

  const restoreOne = await fetch(`${BASE_URL}/runner/notifications/${seed.notificationIds[0]}/restore`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: csrfToken, returnTo: '/runner/notifications?view=archived' }),
    redirect: 'manual'
  });
  assert.equal(restoreOne.status, 302);
  assert.match(restoreOne.headers.get('location') || '', /view=archived&type=success/i);

  const markAll = await fetch(`${BASE_URL}/runner/notifications/read-all`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ _csrf: csrfToken, returnTo: '/runner/notifications' }),
    redirect: 'manual'
  });
  assert.equal(markAll.status, 302);
  assert.match(markAll.headers.get('location') || '', /type=success/i);

  const pageAfterAll = await fetch(`${BASE_URL}/runner/notifications`, {
    headers: { Cookie: cookie }
  });
  const htmlAfterAll = await pageAfterAll.text();
  assert.match(htmlAfterAll, /data-notification-unread-count[^>]*>0<\/strong>/i);

  const archiveRead = await fetch(`${BASE_URL}/runner/notifications/archive-read`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: csrfToken, returnTo: '/runner/notifications' }),
    redirect: 'manual'
  });
  assert.equal(archiveRead.status, 302);
  const currentAfterArchive = await fetch(`${BASE_URL}/runner/notifications`, { headers: { Cookie: cookie } });
  assert.match(await currentAfterArchive.text(), /No notifications yet/i);

  const legacyUnread = await fetch(`${BASE_URL}/runner/notifications?unread=1`, { headers: { Cookie: cookie } });
  assert.match(await legacyUnread.text(), /Unread updates/i);
});

test('notification mark-read returnTo is sanitized against open redirect', async () => {
  const localSeed = await seedNotificationsFixture();
  const cookie = await login(localSeed.runner.email, localSeed.password);
  const ready = await waitForSessionReady(cookie);
  assert.equal(ready, true);
  const notificationPage = await fetch(`${BASE_URL}/runner/notifications`, { headers: { Cookie: cookie } });
  const csrfToken = extractCsrfToken(await notificationPage.text());

  const markOne = await fetch(`${BASE_URL}/runner/notifications/${localSeed.notificationIds[0]}/read`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ _csrf: csrfToken, returnTo: 'https://evil.example/phish' }),
    redirect: 'manual'
  });
  assert.equal(markOne.status, 302);
  assert.equal(markOne.headers.get('location'), '/runner/dashboard');

  await cleanupSeed(localSeed);
});

test('non-runner authenticated user cannot access runner notifications page', async () => {
  const organizerSeed = await seedOrganizerFixture();
  const cookie = await login(organizerSeed.organizer.email, organizerSeed.password);

  const page = await fetch(`${BASE_URL}/runner/notifications`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(page.status, 302);
  assert.equal(page.headers.get('location'), '/login');

  await cleanupOrganizerSeed(organizerSeed);
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
    mobile: '09170000000',
    country: 'PH',
    timezone: 'Asia/Manila',
    dateOfBirth: new Date('1994-01-01T00:00:00.000Z'),
    gender: 'male',
    emergencyContactName: 'Route Emergency',
    emergencyContactNumber: '09171111111',
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

async function seedOrganizerFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    userId: `UNFO${stamp}`.slice(0, 22),
    email: `organizer.notifications.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Notify',
    lastName: 'Organizer',
    emailVerified: true
  });

  return {
    password,
    organizer: {
      _id: organizer._id,
      email: organizer.email
    }
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.runner) return;
  await ensureConnected();
  await Promise.all([
    Notification.deleteMany({ userId: currentSeed.runner._id }),
    User.deleteOne({ _id: currentSeed.runner._id })
  ]);
}

async function cleanupOrganizerSeed(currentSeed) {
  if (!currentSeed?.organizer?._id) return;
  await ensureConnected();
  await User.deleteOne({ _id: currentSeed.organizer._id });
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

function extractCsrfToken(html) {
  const match = String(html || '').match(/name="_csrf" value="([^"]+)"/i);
  assert.ok(match, 'Expected a CSRF token in the notifications page');
  return match[1];
}

async function waitForSessionReady(cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}/runner/notifications`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.headers.get('location') !== '/login') return true;
    // eslint-disable-next-line no-await-in-loop
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
