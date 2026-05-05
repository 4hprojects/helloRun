const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
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

test('create and edit event views do not contain mojibake UI artifacts', () => {
  const files = [
    path.join(ROOT, 'src/views/organizer/create-event.ejs'),
    path.join(ROOT, 'src/views/organizer/edit-event.ejs')
  ];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /\u00c3|\u00e2|\u00f0\u0178|[\u{1f4cb}\u{1f4dd}\u{1f4c5}\u{1f4cd}\u{1f3c3}\u{1f3a8}\u2190\u00d7]/u, file);
  }
});

test('create and edit event views expose ordered create-event sections', () => {
  const files = [
    path.join(ROOT, 'src/views/organizer/create-event.ejs'),
    path.join(ROOT, 'src/views/organizer/edit-event.ejs')
  ];
  const requiredSectionClasses = [
    'form-section-core',
    'form-section-schedule',
    'form-section-virtual',
    'form-section-media',
    'form-section-waiver'
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const className of requiredSectionClasses) {
      assert.match(content, new RegExp(className), `${file} should include ${className}`);
    }
    assert.match(content, /class="form-section form-section-core" tabindex="-1"/, `${file} should make Core Details focusable`);
    assert.match(content, /coreDetailsSection\.focus\(\{ preventScroll: true \}\)/, `${file} should focus Core Details on load`);
    assert.doesNotMatch(content, /id="title"[\s\S]*?autofocus/, `${file} should not steal focus with the title field`);
  }

  const css = fs.readFileSync(path.join(ROOT, 'src/public/css/create-event.css'), 'utf8');
  assert.match(css, /\.create-event-form\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.form-section:focus\s*\{[^}]*outline:\s*2px solid var\(--border-focus\)/s);
  assert.match(css, /\.form-section-core\s*\{[^}]*order:\s*10/s);
  assert.match(css, /\.form-section-schedule\s*\{[^}]*order:\s*20/s);
  assert.match(css, /\.form-section-virtual\s*\{[^}]*order:\s*30/s);
  assert.match(css, /\.form-section-media\s*\{[^}]*order:\s*40/s);
  assert.match(css, /\.form-section-waiver\s*\{[^}]*order:\s*50/s);
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

test('approved verified organizer can open create-event page', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Create Event/i);
  assert.match(html, /Event Format/i);
});

test('approved unverified organizer cannot open create-event page', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  await ensureConnected();
  await User.updateOne({ _id: seed.organizer._id }, { $set: { emailVerified: false } });

  try {
    const response = await fetch(`${BASE_URL}/organizer/create-event`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });

    assert.equal(response.status, 403);
  } finally {
    await User.updateOne({ _id: seed.organizer._id }, { $set: { emailVerified: true } });
  }
});

test('create-event draft can save with title only', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const title = `Partial Draft Event ${seed.stamp}`;
  const payload = new URLSearchParams({
    title,
    actionType: 'draft'
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
  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'draft event should be saved');
  assert.equal(event.status, 'draft');
  assert.equal(event.virtualCompletionMode, 'single_activity');
});

test('create-event publish rejects incomplete event data', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const payload = new URLSearchParams({
    title: `Incomplete Publish Event ${seed.stamp}`,
    actionType: 'publish'
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
  assert.match(html, /Description must be at least 20 characters/i);
});

test('create-event publish accepts valid single-activity virtual event', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const title = `Published Single Activity Event ${seed.stamp}`;
  const payload = buildValidCreateEventPayload({
    title,
    actionType: 'publish',
    virtualCompletionMode: 'single_activity'
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
  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'published event should be saved');
  assert.equal(event.status, 'published');
  assert.equal(event.virtualCompletionMode, 'single_activity');
});

test('create-event accumulated-distance draft saves setup fields', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const title = `Accumulated Draft Event ${seed.stamp}`;
  const payload = new URLSearchParams({
    title,
    eventType: 'virtual',
    actionType: 'draft',
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: '100',
    minimumActivityDistanceKm: '1',
    finalSubmissionDeadlineAt: toLocalDateTimeString(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
    milestoneDistancesKm: '25, 50, 75, 100',
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_distance'
  });
  payload.append('acceptedRunTypes', 'run');
  payload.append('acceptedRunTypes', 'walk');
  payload.append('acceptedRunTypes', 'hike');
  payload.append('acceptedRunTypes', 'trail_run');

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
  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'accumulated draft should be saved');
  assert.equal(event.status, 'draft');
  assert.equal(event.virtualCompletionMode, 'accumulated_distance');
  assert.equal(event.targetDistanceKm, 100);
  assert.equal(event.minimumActivityDistanceKm, 1);
  assert.deepEqual(event.acceptedRunTypes, ['run', 'walk', 'hike', 'trail_run']);
  assert.deepEqual(event.milestoneDistancesKm, [25, 50, 75, 100]);
  assert.equal(event.recognitionMode, 'completion_with_optional_ranking');
  assert.equal(event.leaderboardMode, 'finishers_and_top_distance');
});

test('create-event accumulated-distance publish is blocked until progress tracking exists', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const payload = buildValidCreateEventPayload({
    title: `Accumulated Publish Blocked Event ${seed.stamp}`,
    actionType: 'publish',
    virtualCompletionMode: 'accumulated_distance'
  });
  payload.set('targetDistanceKm', '100');
  payload.set('minimumActivityDistanceKm', '1');
  payload.append('acceptedRunTypes', 'run');

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
  assert.match(html, /Accumulated virtual runs can be saved as drafts/i);
});

test('create-event rejects waiver rich html with insufficient plain text', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);

  const payload = buildValidCreateEventPayload({
    title: `Waiver Too Short Event ${seed.stamp}`,
    actionType: 'publish',
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
    actionType: overrides.actionType || 'draft',
    virtualCompletionMode: overrides.virtualCompletionMode || 'single_activity'
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

async function seedOrganizer(tag, options = {}) {
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
    emailVerified: options.emailVerified !== false
  });

  return {
    stamp,
    password,
    extraUsers: [],
    organizer: {
      _id: organizer._id,
      email: organizer.email
    }
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  const userIds = [currentSeed.organizer._id, ...(currentSeed.extraUsers || [])].filter(Boolean);
  await Promise.all([
    Event.deleteMany({ title: new RegExp(escapeRegex(currentSeed.stamp), 'i') }),
    User.deleteMany({ _id: { $in: userIds } })
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
