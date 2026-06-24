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
const TEST_PORT = 3134;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  seed = await seedFixtures();

  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      CSRF_PROTECTION: '1'
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });

  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupFixtures(seed);
  await mongoose.disconnect();
});

test('QR route redirects unauthenticated requests to login', async () => {
  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/bibs/001/qr`, {
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

test('QR batch generation rejects missing CSRF token', async () => {
  const organizerCookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', organizerCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/bibs/qr/batch`, {
    method: 'POST',
    headers: {
      Cookie: organizerCookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bibAssignments: [{ bib_number: '001' }] })
  });

  assert.equal(response.status, 403);
});

test('onsite bib assignment rejects missing CSRF token', async () => {
  const organizerCookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', organizerCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/bibs/assign`, {
    method: 'POST',
    headers: {
      Cookie: organizerCookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      registrationId: new mongoose.Types.ObjectId().toString(),
      bibNumber: '001'
    })
  });

  assert.equal(response.status, 403);
});

test('organizer cannot access QR data for another organizer event', async () => {
  const otherOrganizerCookie = await login(seed.otherOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', otherOrganizerCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/bibs/001/qr`, {
    headers: {
      Cookie: otherOrganizerCookie,
      Accept: 'application/json'
    }
  });

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.match(body.error, /own events/i);
});

test('owning organizer can generate a bib QR code', async () => {
  const organizerCookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', organizerCookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/bibs/001/qr`, {
    headers: {
      Cookie: organizerCookie,
      Accept: 'application/json'
    }
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.eventId, String(seed.event._id));
  assert.equal(body.bibNumber, '001');
  assert.match(body.qr_data_url, /^data:image\/png;base64,/);
});

test('admin can decode QR data for an event with valid CSRF token', async () => {
  const adminCookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', adminCookie);
  const { csrfToken } = await getCsrfFromAuthedPage('/admin/dashboard', adminCookie);
  const timestamp = Math.floor(Date.now() / 1000);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/bibs/qr/decode`, {
    method: 'POST',
    headers: {
      Cookie: adminCookie,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      qr_data: `EVENT:${seed.event._id}|BIB:001|TIME:${timestamp}`
    })
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.eventId, String(seed.event._id));
  assert.equal(body.bibNumber, '001');
});

test('QR decode rejects data for a different event', async () => {
  const organizerCookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', organizerCookie);
  const { csrfToken } = await getCsrfFromAuthedPage('/organizer/dashboard', organizerCookie);
  const timestamp = Math.floor(Date.now() / 1000);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/bibs/qr/decode`, {
    method: 'POST',
    headers: {
      Cookie: organizerCookie,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      qr_data: `EVENT:${seed.otherEvent._id}|BIB:001|TIME:${timestamp}`
    })
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /does not belong/i);
});

async function seedFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);
  const safeStamp = stamp.replace(/\D/g, '').slice(-12);

  await Promise.all([
    User.deleteMany({ email: /^onsite\.qr\./ }),
    Event.deleteMany({ slug: /^onsite-qr-security-/ })
  ]);

  const organizer = await createUser({
    userId: `UOQR${safeStamp}`,
    email: `onsite.qr.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    firstName: 'Onsite',
    lastName: 'Owner',
    organizerStatus: 'approved'
  });

  const otherOrganizer = await createUser({
    userId: `UQRO${safeStamp}`,
    email: `onsite.qr.other.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    firstName: 'Onsite',
    lastName: 'Other',
    organizerStatus: 'approved'
  });

  const admin = await createUser({
    userId: `UAQR${safeStamp}`,
    email: `onsite.qr.admin.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Onsite',
    lastName: 'Admin'
  });

  const event = await createEvent({
    organizerId: organizer._id,
    slug: `onsite-qr-security-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `OQ-${String(stamp).replace(/\D/g, '').slice(-8)}`
  });

  const otherEvent = await createEvent({
    organizerId: otherOrganizer._id,
    slug: `onsite-qr-security-other-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `QO-${String(stamp).replace(/\D/g, '').slice(-8)}`
  });

  return {
    password,
    organizer,
    otherOrganizer,
    admin,
    event,
    otherEvent
  };
}

function createUser(data) {
  return User.create({
    ...data,
    emailVerified: true
  });
}

function createEvent({ organizerId, slug, referenceCode }) {
  const now = Date.now();
  return Event.create({
      isTestData: true,
    organizerId,
    slug,
    referenceCode,
    title: `Onsite QR Security ${referenceCode}`,
    organiserName: 'Onsite QR Security Organizer',
    description: 'Onsite QR route security coverage event',
    status: 'published',
    eventType: 'onsite',
    eventTypesAllowed: ['onsite'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now - 2 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 2 * 60 * 60 * 1000),
    proofTypesAllowed: ['photo', 'gps', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });
}

async function cleanupFixtures(currentSeed) {
  if (!currentSeed) return;

  await Promise.all([
    Event.deleteMany({
      _id: {
        $in: [currentSeed.event._id, currentSeed.otherEvent._id]
      }
    }),
    User.deleteMany({
      _id: {
        $in: [currentSeed.organizer._id, currentSeed.otherOrganizer._id, currentSeed.admin._id]
      }
    })
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

async function getCsrfFromAuthedPage(pathname, cookie) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);

  const html = await response.text();
  const tokenMatch = html.match(/name="_csrf"\s+value="([^"]+)"/i)
    || html.match(/<meta name="csrf-token" content="([^"]+)"/i);
  assert.ok(tokenMatch, `Expected CSRF token on ${pathname}`);

  return {
    csrfToken: tokenMatch[1]
  };
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.headers.get('location') !== '/login') return true;
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
    } catch (_) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}
