const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3102;
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

test('running-group strict smoke script', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runnerA = await createRunner(`rg.smoke.a.${stamp}`, password, 'A');
  const runnerB = await createRunner(`rg.smoke.b.${stamp}`, password, 'B');
  const groupName = `Smoke Pacers ${stamp}`.slice(0, 120);

  const step1 = await fetch(`${BASE_URL}/runner/groups/not-a-real-group`, { redirect: 'manual' });
  assert.equal(step1.status, 302);
  assert.equal(step1.headers.get('location'), '/login');

  const runnerACookie = await login(runnerA.email, password);
  const step2 = await waitForSessionReady('/runner/dashboard', runnerACookie);
  assert.equal(step2, true);

  const step3 = await postForm('/runner/groups/create', runnerACookie, {
    name: groupName,
    description: 'Smoke flow group',
    returnTo: '/runner/dashboard'
  });
  assert.equal(step3.status, 302);
  assert.match(step3.headers.get('location') || '', /type=success/);

  const dashboard = await fetchWithCookie('/runner/dashboard', runnerACookie);
  const dashboardHtml = await dashboard.text();
  assert.match(dashboardHtml, new RegExp(escapeRegex(groupName), 'i'));
  assert.match(dashboardHtml, /activity-pill activity-group/);

  const slug = extractGroupSlug(dashboardHtml);
  assert.ok(slug);

  const detailA = await fetchWithCookie(`/runner/groups/${slug}`, runnerACookie);
  const detailAHtml = await detailA.text();
  assert.equal(detailA.status, 200);
  assert.match(detailAHtml, new RegExp(escapeRegex(groupName), 'i'));
  assert.match(detailAHtml, /Recent Activity/);

  const runnerBCookie = await login(runnerB.email, password);
  const step7 = await waitForSessionReady('/runner/dashboard', runnerBCookie);
  assert.equal(step7, true);

  const detailForRunnerB = await fetchWithCookie(`/runner/groups/${slug}`, runnerBCookie);
  const detailForRunnerBHtml = await detailForRunnerB.text();
  const groupId = extractGroupId(detailForRunnerBHtml);
  assert.ok(groupId);

  const joinResponse = await postForm('/runner/groups/join', runnerBCookie, {
    groupId,
    returnTo: `/runner/groups/${slug}`
  });
  assert.equal(joinResponse.status, 302);
  assert.match(joinResponse.headers.get('location') || '', new RegExp(escapeRegex(`/runner/groups/${slug}`)));

  const detailB = await fetchWithCookie(`/runner/groups/${slug}`, runnerBCookie);
  const detailBHtml = await detailB.text();
  assert.equal(detailB.status, 200);
  assert.match(detailBHtml, /joined/i);
});

async function createRunner(emailLocal, password, suffix) {
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 10);
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const user = await User.create({
    userId: `URGSMK${suffix}${stamp}`.slice(0, 22),
    email: `${emailLocal}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: `Smoke${suffix}`,
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000000',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Smoke Emergency',
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

async function fetchWithCookie(routePath, cookie) {
  return fetch(`${BASE_URL}${routePath}`, {
    method: 'GET',
    headers: { Cookie: cookie },
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

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractGroupSlug(html) {
  const match = String(html || '').match(/\/runner\/groups\/([a-z0-9-]+)/i);
  return match ? match[1] : '';
}

function extractGroupId(html) {
  const match = String(html || '').match(/name="groupId"\s+value="([a-f0-9]{24})"/i);
  return match ? match[1] : '';
}
