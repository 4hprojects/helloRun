const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3123;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Minimal 1×1 pixel GIF
const GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);
// Minimal 1×1 PNG
const PNG_1PX_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQeRlmQAAAAASUVORK5CYII=',
  'base64'
);

let serverProc = null;
let seed = null;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: ['ignore', 'ignore', 'ignore']
  });

  await waitForServerReady();
  seed = await seedFixtures();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) serverProc.kill('SIGTERM');
  await cleanupFixtures(seed);
  await mongoose.disconnect();
});

// ─── Payment Proof Upload ──────────────────────────────────────────────────

test('unauthenticated payment-proof upload redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/my-registrations/000000000000000000000000/payment-proof`, {
    method: 'POST',
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

test('payment proof GIF is rejected with invalid file type error', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/my-registrations', cookie);

  const form = new FormData();
  form.append('paymentProofFile', new Blob([GIF_BUFFER], { type: 'image/gif' }), 'proof.gif');

  const response = await fetch(
    `${BASE_URL}/my-registrations/${seed.registration._id}/payment-proof`,
    { method: 'POST', headers: { Cookie: cookie }, body: form, redirect: 'manual' }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /my-registrations/i);
  assert.match(location, /type=error/i);
  assert.match(location, /Invalid\+file\+type|Invalid%20file%20type/i);
});

test('payment proof missing file is rejected', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/my-registrations', cookie);

  const response = await fetch(
    `${BASE_URL}/my-registrations/${seed.registration._id}/payment-proof`,
    {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
      redirect: 'manual'
    }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /my-registrations/i);
  assert.match(location, /type=error/i);
});

// ─── Organizer Docs Upload ─────────────────────────────────────────────────

test('organizer docs GIF is rejected with 400 invalid file type', async () => {
  const cookie = await login(seed.organiser.email, seed.password);
  await waitForSessionReady('/my-registrations', cookie);

  const form = new FormData();
  form.append('idProof', new Blob([GIF_BUFFER], { type: 'image/gif' }), 'id.gif');
  form.append('businessProof', new Blob([GIF_BUFFER], { type: 'image/gif' }), 'biz.gif');
  form.append('businessName', 'Test Org');
  form.append('businessType', 'individual');
  form.append('contactPhone', '09171234567');
  form.append('terms', 'on');

  const response = await fetch(`${BASE_URL}/organizer/complete-profile`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form,
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.match(body.message, /Invalid file type/i);
});

// ─── Blog Cover Image Upload ───────────────────────────────────────────────

test('blog cover GIF is rejected with 400 invalid file type (API route)', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/my-registrations', cookie);

  const form = new FormData();
  form.append('coverImageFile', new Blob([GIF_BUFFER], { type: 'image/gif' }), 'cover.gif');
  form.append('title', 'Test Blog');
  form.append('category', 'General');
  form.append('contentHtml', '<p>Some content here for testing purposes.</p>');

  const response = await fetch(`${BASE_URL}/blogs/me`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form,
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.match(body.message, /Invalid image type|Invalid file type/i);
});

// ─── Result Proof Upload ───────────────────────────────────────────────────

test('result proof GIF is rejected with invalid file type error', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/my-registrations', cookie);

  const form = new FormData();
  form.append('resultProofFile', new Blob([GIF_BUFFER], { type: 'image/gif' }), 'proof.gif');
  form.append('distanceKm', '5');
  form.append('elapsedTime', '00:30:00');
  form.append('proofType', 'photo');

  const response = await fetch(
    `${BASE_URL}/my-registrations/${seed.registration._id}/submit-result`,
    { method: 'POST', headers: { Cookie: cookie }, body: form, redirect: 'manual' }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /my-registrations/i);
  assert.match(location, /type=error/i);
  assert.match(location, /Invalid\+file\+type|Invalid%20file%20type/i);
});

// ─── Fixtures ─────────────────────────────────────────────────────────────

async function seedFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runner = await User.create({
    userId: `UUVR${stamp}`.slice(0, 22),
    email: `upload.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Upload',
    lastName: 'Runner',
    emailVerified: true
  });

  const organiser = await User.create({
    userId: `UUVO${stamp}`.slice(0, 22),
    email: `upload.org.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'pending',
    firstName: 'Upload',
    lastName: 'Organiser',
    emailVerified: true
  });

  const eventOwner = await User.create({
    userId: `UUVOOE${stamp}`.slice(0, 22),
    email: `upload.eventowner.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Event',
    lastName: 'Owner',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
    organizerId: eventOwner._id,
    slug: `upload-val-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `UV-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Upload Validation Event ${stamp}`,
    organiserName: 'Upload Validation Org',
    description: 'Upload validation test event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 10 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 11 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['photo'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const registration = await Registration.create({
    eventId: event._id,
    userId: runner._id,
    participant: {
      firstName: runner.firstName,
      lastName: runner.lastName,
      email: runner.email
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'unpaid',
    waiver: {
      accepted: true,
      version: 1,
      signature: `${runner.firstName} ${runner.lastName}`,
      acceptedAt: new Date(),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, '0').padEnd(6, '0').slice(0, 6)}`,
    registeredAt: new Date()
  });

  return {
    stamp,
    password,
    runner: { _id: String(runner._id), email: runner.email },
    organiser: { _id: String(organiser._id), email: organiser.email },
    eventOwner: { _id: String(eventOwner._id), email: eventOwner.email },
    event: { _id: String(event._id) },
    registration: { _id: String(registration._id) }
  };
}

async function cleanupFixtures(s) {
  if (!s) return;
  await Promise.all([
    Registration.deleteMany({ _id: s.registration._id }),
    Event.deleteMany({ _id: s.event._id }),
    User.deleteMany({
      _id: { $in: [s.runner._id, s.organiser._id, s.eventOwner._id] }
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
  assert.ok(setCookie, 'Expected set-cookie header');
  return setCookie.split(';')[0];
}

async function waitForSessionReady(path, cookie) {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i += 1) {
    const r = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (r.status !== 302) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const r = await fetch(`${BASE_URL}/`);
      if (r.status >= 200 && r.status < 500) return;
    } catch {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}
