const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const OrganiserApplication = require('../src/models/OrganiserApplication');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3119;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedFixture();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

// ─── Access Control ──────────────────────────────────────────────────────────

test('non-admin (runner) cannot list applications', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  const response = await fetch(`${BASE_URL}/admin/applications`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  // Admin middleware returns 403 or redirects to login
  assert.ok(response.status === 403 || response.status === 302);
});

test('unauthenticated request to list applications redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/admin/applications`, {
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /\/login/i);
});

// ─── List & View ─────────────────────────────────────────────────────────────

test('admin can list applications and see pending entry', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/applications`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(escapeRegex(seed.application.businessName)));
});

test('admin can view application detail page', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/applications/${seed.application.id}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(escapeRegex(seed.application.businessName)));
});

// ─── Approve ─────────────────────────────────────────────────────────────────

test('admin can approve a pending application', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/applications/${seed.application.id}/approve`, {
    method: 'POST',
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  // Expect redirect on success
  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /type=success/i);

  // Verify DB state
  await ensureConnected();
  const updatedApp = await OrganiserApplication.findById(seed.application.id);
  assert.equal(updatedApp.status, 'approved');

  const updatedUser = await User.findById(seed.organiser.id);
  assert.equal(updatedUser.organizerStatus, 'approved');
});

// ─── Reject ──────────────────────────────────────────────────────────────────

test('admin reject without reason returns 400 and does not change DB', async () => {
  const cookie = await login(seed.admin2.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/applications/${seed.application2.id}/reject`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ rejectionReason: '' }),
    redirect: 'manual'
  });
  // Controller renders 400 on bad reason
  assert.equal(response.status, 400);

  // DB must be unchanged
  await ensureConnected();
  const unchanged = await OrganiserApplication.findById(seed.application2.id);
  assert.equal(unchanged.status, 'pending');
});

test('admin reject with too-short reason returns 400 and does not change DB', async () => {
  const cookie = await login(seed.admin2.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/applications/${seed.application2.id}/reject`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ rejectionReason: 'Too short' }),
    redirect: 'manual'
  });
  assert.equal(response.status, 400);

  await ensureConnected();
  const unchanged = await OrganiserApplication.findById(seed.application2.id);
  assert.equal(unchanged.status, 'pending');
});

test('admin can reject application with a valid reason', async () => {
  const cookie = await login(seed.admin2.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const validReason = 'Incomplete business documentation provided. Please resubmit with valid proof.';
  const response = await fetch(`${BASE_URL}/admin/applications/${seed.application2.id}/reject`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ rejectionReason: validReason }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /type=success/i);

  // Verify DB state
  await ensureConnected();
  const updatedApp = await OrganiserApplication.findById(seed.application2.id);
  assert.equal(updatedApp.status, 'rejected');
  assert.equal(updatedApp.rejectionReason, validReason);

  const updatedUser = await User.findById(seed.organiser2.id);
  assert.equal(updatedUser.organizerStatus, 'rejected');
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seedFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  // Admin 1 — will approve application 1
  const admin = await User.create({
    userId: `UOAPA${stamp}`.slice(0, 22),
    email: `oar.admin1.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Approver',
    emailVerified: true
  });

  // Admin 2 — will reject application 2
  const admin2 = await User.create({
    userId: `UOAPB${stamp}`.slice(0, 22),
    email: `oar.admin2.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Rejecter',
    emailVerified: true
  });

  // Runner — to test access control
  const runner = await User.create({
    userId: `UOAPR${stamp}`.slice(0, 22),
    email: `oar.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Test',
    emailVerified: true
  });

  // Organiser 1 — pending application (will be approved)
  const organiser = await User.create({
    userId: `UOAPO${stamp}`.slice(0, 22),
    email: `oar.organiser1.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'pending',
    firstName: 'Pending',
    lastName: 'Organiser',
    emailVerified: true
  });

  // Organiser 2 — pending application (will be rejected)
  const organiser2 = await User.create({
    userId: `UOAPQ${stamp}`.slice(0, 22),
    email: `oar.organiser2.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'pending',
    firstName: 'Pending',
    lastName: 'Organiser2',
    emailVerified: true
  });

  const application = await OrganiserApplication.create({
    userId: organiser._id,
    businessName: `OAR Test Business Alpha ${stamp}`.slice(0, 100),
    businessType: 'individual',
    contactPhone: '09171234567',
    idProofUrl: `https://example.com/id-proof-alpha-${stamp}.pdf`,
    businessProofUrl: `https://example.com/biz-proof-alpha-${stamp}.pdf`,
    status: 'pending'
  });

  const application2 = await OrganiserApplication.create({
    userId: organiser2._id,
    businessName: `OAR Test Business Beta ${stamp}`.slice(0, 100),
    businessType: 'company',
    contactPhone: '09179876543',
    idProofUrl: `https://example.com/id-proof-beta-${stamp}.pdf`,
    businessProofUrl: `https://example.com/biz-proof-beta-${stamp}.pdf`,
    status: 'pending'
  });

  return {
    stamp,
    password,
    admin: { id: String(admin._id), email: admin.email },
    admin2: { id: String(admin2._id), email: admin2.email },
    runner: { id: String(runner._id), email: runner.email },
    organiser: { id: String(organiser._id), email: organiser.email },
    organiser2: { id: String(organiser2._id), email: organiser2.email },
    application: {
      id: String(application._id),
      businessName: application.businessName
    },
    application2: {
      id: String(application2._id),
      businessName: application2.businessName
    }
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  await Promise.all([
    OrganiserApplication.deleteMany({
      _id: { $in: [currentSeed.application.id, currentSeed.application2.id] }
    }),
    User.deleteMany({
      email: {
        $in: [
          currentSeed.admin.email,
          currentSeed.admin2.email,
          currentSeed.runner.email,
          currentSeed.organiser.email,
          currentSeed.organiser2.email
        ]
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

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) return;
    } catch (_) {
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

async function waitForAdminSessionReady(cookie) {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.status !== 302) return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return false;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
