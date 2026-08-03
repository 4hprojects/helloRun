'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3161;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const PASSWORD = 'Pass1234.';

let serverProc = null;
let users = {};
let events = {};

test.before(async () => {
  await ensureConnected();
  users = await seedUsers();
  events = await seedEvents(users);
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      CSRF_PROTECTION: '0',
      PORT: String(TEST_PORT)
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) serverProc.kill('SIGKILL');
  if (Object.keys(users).length) {
    await User.deleteMany({ _id: { $in: Object.values(users).map((user) => user._id) } });
  }
  if (Object.keys(events).length) {
    await Event.deleteMany({ _id: { $in: Object.values(events).map((event) => event._id) } });
  }
  await mongoose.disconnect();
});

test('organizer login defaults to organizer and direct runner route activates runner workspace', async () => {
  const session = await login(users.organizer.email);
  assert.equal(session.location, '/organizer/dashboard');

  const runnerDashboard = await waitForSessionResponse('/runner/dashboard', session.cookie);
  assert.equal(runnerDashboard.status, 200, runnerDashboard.headers.get('location') || '');
  const html = await runnerDashboard.text();
  assert.match(html, /Runner Dashboard/i);
  assert.match(html, /action="\/workspace\/organizer"/);
  assert.match(html, /Switch to Organizer mode/);

  const activeRedirect = await fetch(`${BASE_URL}/login`, {
    headers: { Cookie: session.cookie },
    redirect: 'manual'
  });
  assert.equal(activeRedirect.status, 302);
  assert.equal(activeRedirect.headers.get('location'), '/runner/dashboard');
});

test('workspace switch actions persist the selected organizer workspace', async () => {
  const session = await login(users.organizer.email);
  await waitForSessionResponse('/runner/dashboard', session.cookie);

  const switched = await fetch(`${BASE_URL}/workspace/organizer`, {
    method: 'POST',
    headers: {
      Cookie: session.cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(),
    redirect: 'manual'
  });
  assert.equal(switched.status, 302);
  assert.equal(switched.headers.get('location'), '/organizer/dashboard');

  const activeRedirect = await fetch(`${BASE_URL}/login`, {
    headers: { Cookie: session.cookie },
    redirect: 'manual'
  });
  assert.equal(activeRedirect.headers.get('location'), '/organizer/dashboard');
});

test('verified organizers do not need approval to enter runner mode', async () => {
  const session = await login(users.pendingOrganizer.email);
  assert.equal(session.location, '/organizer/dashboard');

  const response = await waitForSessionResponse('/runner/dashboard', session.cookie);
  assert.equal(response.status, 200, response.headers.get('location') || '');
});

test('restricted organizers and admins cannot enter runner mode', async () => {
  for (const user of [users.restrictedOrganizer, users.admin]) {
    const session = await login(user.email);
    const response = await waitForSessionResponse('/runner/dashboard', session.cookie);
    assert.equal(response.status, 403, response.headers.get('location') || '');
  }
});

test('organizers can register for other events but not events they manage', async () => {
  const session = await login(users.organizer.email);

  const ownDetails = await fetch(`${BASE_URL}/events/${events.owned.slug}`, {
    headers: { Cookie: session.cookie }
  });
  assert.equal(ownDetails.status, 200);
  assert.match(await ownDetails.text(), /Organizers cannot register for, submit results to, or compete in events they manage/i);

  const ownRegistration = await fetch(`${BASE_URL}/events/${events.owned.slug}/register`, {
    headers: { Cookie: session.cookie },
    redirect: 'manual'
  });
  assert.equal(ownRegistration.status, 403);
  assert.match(await ownRegistration.text(), /cannot register for or compete in events they manage/i);

  const otherRegistration = await fetch(`${BASE_URL}/events/${events.other.slug}/register`, {
    headers: { Cookie: session.cookie },
    redirect: 'manual'
  });
  assert.equal(otherRegistration.status, 200);
});

async function seedUsers() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const base = {
    passwordHash,
    firstName: 'Workspace',
    lastName: 'Tester',
    emailVerified: true
  };

  const [organizer, pendingOrganizer, restrictedOrganizer, admin] = await User.create([
    {
      ...base,
      email: `workspace.organizer.${stamp}@example.com`,
      role: 'organiser',
      organizerStatus: 'approved'
    },
    {
      ...base,
      email: `workspace.pending.${stamp}@example.com`,
      role: 'organiser',
      organizerStatus: 'pending'
    },
    {
      ...base,
      email: `workspace.restricted.${stamp}@example.com`,
      role: 'organiser',
      organizerStatus: 'approved',
      accountStatus: 'restricted'
    },
    {
      ...base,
      email: `workspace.admin.${stamp}@example.com`,
      role: 'admin'
    }
  ]);

  return { organizer, pendingOrganizer, restrictedOrganizer, admin };
}

async function seedEvents(seededUsers) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const now = Date.now();
  const build = (owner, suffix) => ({
    isTestData: false,
    organizerId: owner._id,
    slug: `workspace-${suffix}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `WS-${suffix.toUpperCase().slice(0, 3)}-${String(stamp).replace(/\D/g, '').slice(-6)}`,
    title: `Workspace ${suffix} event ${stamp}`.slice(0, 150),
    organiserName: `${owner.firstName} ${owner.lastName}`,
    description: 'Workspace participation boundary fixture.',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'free',
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const [owned, other] = await Event.create([
    build(seededUsers.organizer, 'owned'),
    build(seededUsers.pendingOrganizer, 'other')
  ]);
  return { owned, other };
}

async function login(email) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        email,
        password: PASSWORD
      }),
      redirect: 'manual'
    });

    assert.equal(response.status, 302);
    const authenticatedCookie = getCookie(response);
    assert.ok(authenticatedCookie);
    const verification = await fetch(`${BASE_URL}/login`, {
      headers: { Cookie: authenticatedCookie },
      redirect: 'manual'
    });
    if (verification.status === 302) {
      return {
        cookie: authenticatedCookie,
        location: response.headers.get('location')
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Unable to establish authenticated session for ${email}`);
}

function getCookie(response) {
  const setCookie = String(response.headers.get('set-cookie') || '');
  return setCookie.match(/hr\.sid=[^;,]+/)?.[0] || '';
}

async function waitForServerReady() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/login`, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) return;
    } catch (_) {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function waitForSessionResponse(pathname, cookie) {
  let lastResponse = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    lastResponse = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (!(lastResponse.status === 302 && lastResponse.headers.get('location') === '/login')) {
      return lastResponse;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return lastResponse;
}

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}
