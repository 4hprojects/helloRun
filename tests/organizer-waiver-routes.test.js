const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3117;
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
  seed = await seedOrganizer('waiver-route');
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

test('create-event sanitizes waiver html before saving', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);

  const title = `Waiver Sanitize Event ${seed.stamp}`;
  const payload = buildValidCreateEventPayload({
    title,
    waiverTemplate: [
      '<div class="waiver-card">',
      '<h4>Waiver Terms</h4>',
      '<p onclick="alert(1)">I agree to the participation terms and acknowledge all risks.</p>',
      '<script>alert("xss")</script>',
      `<p>${'Safe waiver text '.repeat(20)}</p>`,
      '<p>{{ORGANIZER_NAME}} and {{EVENT_TITLE}}</p>',
      '</div>'
    ].join('')
  });

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /\/organizer\/events\?type=success/i);

  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'created event should exist');
  assert.ok(event.waiverTemplate, 'waiver template should be saved');
  assert.doesNotMatch(event.waiverTemplate, /<script/i);
  assert.doesNotMatch(event.waiverTemplate, /\son[a-z]+\s*=/i);
  assert.match(event.waiverTemplate, /\{\{\s*ORGANIZER_NAME\s*\}\}/);
  assert.match(event.waiverTemplate, /\{\{\s*EVENT_TITLE\s*\}\}/);
});

test('create-event rejects waiver rich html with insufficient plain text', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);

  const payload = buildValidCreateEventPayload({
    title: `Waiver Too Short Event ${seed.stamp}`,
    waiverTemplate: '<div><h4>Header</h4><p><br></p><p><em>   </em></p></div>'
  });

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const html = await response.text();
  assert.match(html, /Waiver template must be at least 200 characters\./i);
});

function buildValidCreateEventPayload(overrides = {}) {
  const now = new Date();
  const registrationOpen = toLocalDateTimeString(new Date(now.getTime() + 60 * 60 * 1000));
  const registrationClose = toLocalDateTimeString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const eventStart = toLocalDateTimeString(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));
  const eventEnd = toLocalDateTimeString(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));
  const virtualStart = toLocalDateTimeString(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));
  const virtualEnd = toLocalDateTimeString(new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000));

  const params = new URLSearchParams({
    title: overrides.title || `Organizer Waiver Event ${Date.now()}`,
    organiserName: 'Waiver Organizer',
    description: 'This description is intentionally long enough for create-event validation.',
    eventType: 'virtual',
    registrationOpenAt: registrationOpen,
    registrationCloseAt: registrationClose,
    eventStartAt: eventStart,
    eventEndAt: eventEnd,
    virtualStartAt: virtualStart,
    virtualEndAt: virtualEnd,
    raceDistanceCustom: '',
    waiverTemplate: overrides.waiverTemplate || `<p>${'I accept all waiver terms and conditions. '.repeat(12)}</p>`,
    actionType: 'draft'
  });
  params.append('raceDistancePresets', '5K');
  params.append('proofTypesAllowed', 'gps');
  return params;
}

function toLocalDateTimeString(value) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

async function seedOrganizer(tag) {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    userId: `UOWR${stamp}`.slice(0, 22),
    email: `org.waiver.${tag}.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Waiver',
    lastName: 'Owner',
    emailVerified: true
  });

  return {
    stamp,
    password,
    organizer: {
      _id: organizer._id,
      email: organizer.email
    }
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  await Promise.all([
    Event.deleteMany({ title: new RegExp(escapeRegex(currentSeed.stamp), 'i') }),
    User.deleteOne({ _id: currentSeed.organizer._id })
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

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'GET',
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.headers.get('location') !== '/login') return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return false;
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) return;
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
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
