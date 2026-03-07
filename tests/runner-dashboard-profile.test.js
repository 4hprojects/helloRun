const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const { buildRunnerDashboardData } = require('../src/services/runner-data.service');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3103;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;

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
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
});

test('buildRunnerDashboardData groups upcoming/past and computes stats', () => {
  const now = new Date('2026-03-07T00:00:00.000Z');
  const registrations = [
    {
      _id: 'r1',
      paymentStatus: 'unpaid',
      registeredAt: '2026-03-06T09:00:00.000Z',
      eventId: { title: 'Future 1', eventStartAt: '2026-03-12T00:00:00.000Z' }
    },
    {
      _id: 'r2',
      paymentStatus: 'paid',
      registeredAt: '2026-03-05T09:00:00.000Z',
      eventId: { title: 'Past 1', eventStartAt: '2026-03-01T00:00:00.000Z' }
    },
    {
      _id: 'r3',
      paymentStatus: 'proof_rejected',
      registeredAt: '2026-03-04T09:00:00.000Z',
      eventId: { title: 'Future 2', eventStartAt: '2026-03-10T00:00:00.000Z' }
    }
  ];

  const data = buildRunnerDashboardData(registrations, now);
  assert.equal(data.upcoming.length, 2);
  assert.equal(data.past.length, 1);
  assert.equal(data.unpaid.length, 2);
  assert.equal(data.stats.total, 3);
  assert.equal(data.stats.upcoming, 2);
  assert.equal(data.stats.past, 1);
  assert.equal(data.stats.unpaid, 2);
  assert.equal(data.stats.paid, 1);
  assert.equal(data.activity[0].eventTitle, 'Future 1');
});

test('runner profile update validates and persists normalized data', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`profile.${stamp}`, password);
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  const invalidDobResponse = await postForm('/runner/profile', cookie, {
    firstName: 'A',
    lastName: 'Runner',
    mobile: '123',
    country: 'PH',
    dateOfBirth: '2099-01-01',
    gender: 'male',
    emergencyContactName: 'x',
    emergencyContactNumber: '123',
    runningGroup: ''
  });
  assert.equal(invalidDobResponse.status, 400);
  const invalidHtml = await invalidDobResponse.text();
  assert.match(invalidHtml, /Date of birth cannot be in the future/i);

  const validResponse = await postForm('/runner/profile', cookie, {
    firstName: 'Profile',
    lastName: 'Updated',
    mobile: '+1 555 100 2000',
    country: 'US',
    dateOfBirth: '1997-08-23',
    gender: 'female',
    emergencyContactName: 'Emergency Contact',
    emergencyContactNumber: '+1 555 100 9999',
    runningGroup: 'Road Warriors'
  });
  assert.equal(validResponse.status, 302);
  assert.equal(validResponse.headers.get('location'), '/runner/dashboard?type=success&msg=Profile%20updated%20successfully.');

  await mongoose.connect(process.env.MONGODB_URI);
  const fresh = await User.findById(runner._id).lean();
  await mongoose.disconnect();

  assert.equal(fresh.firstName, 'Profile');
  assert.equal(fresh.lastName, 'Updated');
  assert.equal(fresh.country, 'US');
  assert.equal(fresh.runningGroup, 'Road Warriors');
  assert.equal(new Date(fresh.dateOfBirth).toISOString().slice(0, 10), '1997-08-23');
});

async function createRunner(emailLocal, password) {
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 10);
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const user = await User.create({
    userId: `URGPROF${stamp}`.slice(0, 22),
    email: `${emailLocal}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Profile',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000000',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Profile Emergency',
    emergencyContactNumber: '09171111111'
  });
  await mongoose.disconnect();
  return user;
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

async function postForm(routePath, cookie, payload = {}) {
  return fetch(`${BASE_URL}${routePath}`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(payload),
    redirect: 'manual'
  });
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'GET',
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.headers.get('location') !== '/login') {
      return true;
    }
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
