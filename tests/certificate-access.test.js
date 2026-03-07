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
const Submission = require('../src/models/Submission');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3106;
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

test('unauthenticated certificate download redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/my-submissions/000000000000000000000000/certificate`, {
    method: 'GET',
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

test('runner can download own approved submission certificate', async () => {
  const seed = await seedCertificateData('download-own', { approved: true });
  const cookie = await login(seed.runner.email, seed.password);
  const ready = await waitForSessionReady('/my-registrations', cookie);
  assert.equal(ready, true);

  const response = await fetch(`${BASE_URL}/my-submissions/${seed.submission._id}/certificate`, {
    method: 'GET',
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  if (response.status === 200) {
    assert.equal(response.headers.get('content-type'), 'application/pdf');
  } else {
    assert.equal(response.status, 302);
    assert.match(response.headers.get('location') || '', /^data:application\/pdf;base64,/i);
  }
});

test('runner cannot download certificate for pending or other-runner submission', async () => {
  const pendingSeed = await seedCertificateData('pending-block', { approved: false });
  const runnerACookie = await login(pendingSeed.runner.email, pendingSeed.password);
  const readyA = await waitForSessionReady('/my-registrations', runnerACookie);
  assert.equal(readyA, true);

  const pendingResponse = await fetch(`${BASE_URL}/my-submissions/${pendingSeed.submission._id}/certificate`, {
    method: 'GET',
    headers: { Cookie: runnerACookie },
    redirect: 'manual'
  });
  assert.equal(pendingResponse.status, 302);
  assert.match(pendingResponse.headers.get('location') || '', /my-registrations\?type=error/i);

  const otherSeed = await seedCertificateData('other-runner', { approved: true });
  const runnerBCookie = await login(otherSeed.runner.email, otherSeed.password);
  const readyB = await waitForSessionReady('/my-registrations', runnerBCookie);
  assert.equal(readyB, true);

  const otherResponse = await fetch(`${BASE_URL}/my-submissions/${pendingSeed.submission._id}/certificate`, {
    method: 'GET',
    headers: { Cookie: runnerBCookie },
    redirect: 'manual'
  });
  assert.equal(otherResponse.status, 302);
  assert.match(otherResponse.headers.get('location') || '', /my-registrations\?type=error/i);
});

async function seedCertificateData(tag, options = {}) {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const password = 'Pass1234';
    const passwordHash = await bcrypt.hash(password, 10);

    const runner = await User.create({
      userId: `UCERT${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 22),
      email: `phase5.certificate.${tag}.runner.${stamp}@example.com`,
      passwordHash,
      role: 'runner',
      firstName: 'Cert',
      lastName: 'Runner',
      emailVerified: true,
      mobile: '09170000000',
      country: 'PH',
      gender: 'male',
      emergencyContactName: 'Cert Emergency',
      emergencyContactNumber: '09171111111'
    });

    const organizer = await User.create({
      userId: `UCERTO${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 22),
      email: `phase5.certificate.${tag}.organizer.${stamp}@example.com`,
      passwordHash,
      role: 'organiser',
      organizerStatus: 'approved',
      firstName: 'Cert',
      lastName: 'Organizer',
      emailVerified: true
    });

    const now = Date.now();
    const event = await Event.create({
      organizerId: organizer._id,
      slug: `phase5-cert-${tag}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
      referenceCode: `CF-${String(now).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
      title: `Certificate Event ${tag} ${stamp}`.slice(0, 150),
      organiserName: 'Cert Organizer',
      description: 'Certificate access test event',
      status: 'published',
      eventType: 'virtual',
      eventTypesAllowed: ['virtual'],
      raceDistances: ['5K'],
      registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
      registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
      eventStartAt: new Date(now - 2 * 60 * 60 * 1000),
      eventEndAt: new Date(now + 2 * 60 * 60 * 1000),
      proofTypesAllowed: ['gps', 'photo', 'manual'],
      waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      waiverVersion: 1
    });

    const registration = await Registration.create({
      eventId: event._id,
      userId: runner._id,
      participant: {
        firstName: runner.firstName,
        lastName: runner.lastName,
        email: runner.email,
        mobile: runner.mobile,
        country: runner.country,
        gender: runner.gender,
        emergencyContactName: runner.emergencyContactName,
        emergencyContactNumber: runner.emergencyContactNumber,
        runningGroup: ''
      },
      participationMode: 'virtual',
      raceDistance: '5K',
      status: 'confirmed',
      paymentStatus: 'paid',
      waiver: {
        accepted: true,
        version: 1,
        signature: `${runner.firstName} ${runner.lastName}`,
        acceptedAt: new Date(),
        templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
        renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
      },
      confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      registeredAt: new Date()
    });

    const fakePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf8');
    const submission = await Submission.create({
      registrationId: registration._id,
      eventId: event._id,
      runnerId: runner._id,
      participationMode: registration.participationMode,
      raceDistance: registration.raceDistance,
      distanceKm: 5,
      elapsedMs: 1800000,
      proofType: 'gps',
      proof: {
        url: 'https://example.com/proof.gpx',
        key: 'proof-key',
        mimeType: 'application/gpx+xml',
        size: 1024
      },
      status: options.approved ? 'approved' : 'submitted',
      submissionCount: 1,
      submittedAt: new Date(),
      certificate: options.approved
        ? {
            url: `data:application/pdf;base64,${fakePdf.toString('base64')}`,
            key: 'inline',
            issuedAt: new Date()
          }
        : {
            url: '',
            key: '',
            issuedAt: null
          }
    });

    return { runner, password, submission };
  } finally {
    await mongoose.disconnect();
  }
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
    await new Promise((resolve) => setTimeout(resolve, 60));
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
      // waiting for server
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}
