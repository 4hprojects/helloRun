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
const Blog = require('../src/models/Blog');
const BlogComment = require('../src/models/BlogComment');
const OrganiserApplication = require('../src/models/OrganiserApplication');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3137;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;
const originalDatabaseUrl = process.env.DATABASE_URL;

test.before(async () => {
  process.env.DATABASE_URL = '';
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      DATABASE_URL: ''
    },
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
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

test('admin users page enforces admin access', async () => {
  const unauthenticated = await fetch(`${BASE_URL}/admin/users`, {
    redirect: 'manual'
  });
  assert.equal(unauthenticated.status, 302);
  assert.equal(unauthenticated.headers.get('location'), '/login');

  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', runnerCookie);
  const runnerResponse = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: runnerCookie },
    redirect: 'manual'
  });
  assert.equal(runnerResponse.status, 403);
});

test('admin can list and search users', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const listResponse = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(listResponse.status, 200);
  const listHtml = await listResponse.text();
  assert.match(listHtml, /User Management/i);
  assert.match(listHtml, /Search, filter, and inspect platform accounts/i);
  assert.match(listHtml, /admin-users-filters/i);
  assert.match(listHtml, /admin-search-control/i);
  assert.match(listHtml, /id="perPage"/i);
  assert.match(listHtml, /<option value="25" selected>25<\/option>/i);
  assert.match(listHtml, /<option value="50"[^>]*>50<\/option>/i);
  assert.match(listHtml, /<option value="100"[^>]*>100<\/option>/i);
  assert.match(listHtml, /<option value="all"[^>]*>All<\/option>/i);
  assert.match(listHtml, /id="adminUsersColumnMenuBtn"/i);
  assert.match(listHtml, /data-column-toggle="userId"/i);
  assert.match(listHtml, /data-column="userId" class="is-column-hidden"/i);
  assert.match(listHtml, /data-sort-key="userId"/i);
  assert.match(listHtml, /data-sort-key="createdAt"/i);
  assert.match(listHtml, /data-original-index/i);
  assert.match(listHtml, /admin-user-modal-compact/i);
  assert.match(listHtml, /data-mobile=/i);
  assert.match(listHtml, /data-running-groups=/i);
  assert.match(listHtml, /target="_blank"/i);
  assert.match(listHtml, /rel="noopener"/i);
  assert.match(listHtml, new RegExp(escapeRegex(seed.runner.email)));
  assert.match(listHtml, new RegExp(escapeRegex(seed.organizer.email)));
  assert.match(listHtml, /id="adminUsersSelectAll"/i);
  assert.match(listHtml, /id="adminUsersBulkUserIds"/i);
  assert.match(listHtml, /selected\.map\(\(checkbox\) => checkbox\.value\)\.join\(','\)/i);
  assert.doesNotMatch(listHtml, /const BULK_DELETE_CAP = 50/i);
  assert.match(listHtml, /Delete Selected/i);
  assert.match(listHtml, /data-open-user-modal/i);
  assert.match(listHtml, /id="adminUserModal"/i);
  assert.match(listHtml, /registrations/i);
  assert.match(listHtml, /submissions/i);
  assert.match(listHtml, /events/i);

  const searchResponse = await fetch(`${BASE_URL}/admin/users?q=${encodeURIComponent(seed.runner.userId)}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(searchResponse.status, 200);
  const searchHtml = await searchResponse.text();
  assert.match(searchHtml, new RegExp(escapeRegex(seed.runner.email)));
  assert.doesNotMatch(searchHtml, new RegExp(escapeRegex(seed.organizer.email)));

  const filterResponse = await fetch(`${BASE_URL}/admin/users?role=organiser&organizerStatus=approved`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(filterResponse.status, 200);
  const filterHtml = await filterResponse.text();
  assert.match(filterHtml, new RegExp(escapeRegex(seed.organizer.email)));

  const perPageResponse = await fetch(`${BASE_URL}/admin/users?perPage=all`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(perPageResponse.status, 200);
  const perPageHtml = await perPageResponse.text();
  assert.match(perPageHtml, /<option value="all" selected>All<\/option>/i);
});

test('admin can view user detail with activity and compliance summary', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/admin/users/${seed.runner.id}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /User Details/i);
  assert.match(html, new RegExp(escapeRegex(seed.runner.email)));
  assert.match(html, /Policy Consent/i);
  assert.match(html, new RegExp(escapeRegex(`/admin/users/${seed.runner.id}/edit`)));
  assert.match(html, /Privacy Version/i);
  assert.match(html, /Recent Registrations/i);
  assert.match(html, new RegExp(escapeRegex(seed.event.title)));
  assert.match(html, /Recent Submissions/i);
  assert.match(html, /5\.00 km/i);
  assert.match(html, /No organizer application found/i);
});

test('admin can edit user personal information and roles only', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const editResponse = await fetch(`${BASE_URL}/admin/users/${seed.runner.id}/edit`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(editResponse.status, 200);
  const editHtml = await editResponse.text();
  assert.match(editHtml, /Edit User/i);
  assert.match(editHtml, /Personal Information/i);
  assert.match(editHtml, /Roles/i);
  assert.match(editHtml, /name="firstName"/i);
  assert.match(editHtml, /name="role"/i);
  assert.doesNotMatch(editHtml, /name="email"/i);
  assert.doesNotMatch(editHtml, /name="passwordHash"/i);
  assert.doesNotMatch(editHtml, /Auth Provider/i);

  const csrfToken = extractCsrfToken(editHtml);
  const updateResponse = await fetch(`${BASE_URL}/admin/users/${seed.runner.id}/edit`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      firstName: 'Updated',
      lastName: 'Runner',
      mobile: '09175551234',
      country: 'PH',
      dateOfBirth: '1994-03-04',
      gender: 'prefer_not_to_say',
      emergencyContactName: 'Updated Emergency',
      emergencyContactNumber: '09174440000',
      runningGroups: 'Updated Group\nSecond Group',
      role: 'organiser',
      organizerStatus: 'approved',
      email: 'attacker@example.com',
      authProvider: 'google',
      emailVerified: 'false'
    }),
    redirect: 'manual'
  });
  assert.equal(updateResponse.status, 302);
  assert.match(updateResponse.headers.get('location') || '', /type=success/i);

  await ensureConnected();
  const updated = await User.findById(seed.runner.id).lean();
  assert.equal(updated.firstName, 'Updated');
  assert.equal(updated.lastName, 'Runner');
  assert.equal(updated.mobile, '09175551234');
  assert.equal(updated.role, 'organiser');
  assert.equal(updated.organizerStatus, 'approved');
  assert.deepEqual(updated.runningGroups, ['Updated Group', 'Second Group']);
  assert.equal(updated.email, seed.runner.email);
  assert.equal(updated.authProvider, 'local');
  assert.equal(updated.emailVerified, true);
});

test('admin can view organizer detail with application and owned event', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/admin/users/${seed.organizer.id}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, new RegExp(escapeRegex(seed.organizer.email)));
  assert.match(html, /Organizer Application/i);
  assert.match(html, new RegExp(escapeRegex(seed.application.businessName)));
  assert.match(html, /Owned Events/i);
  assert.match(html, new RegExp(escapeRegex(seed.event.title)));
  assert.match(html, new RegExp(escapeRegex(`/admin/applications/${seed.application.id}`)));
});

test('admin user detail returns 404 for missing user', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);
  const missingId = new mongoose.Types.ObjectId();

  const response = await fetch(`${BASE_URL}/admin/users/${missingId}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.match(html, /User Not Found/i);
});

test('admin bulk deletion accepts 51 selected accounts in one compact field', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);
  const listResponse = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  const csrfToken = extractCsrfToken(await listResponse.text());
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const users = await User.insertMany(Array.from({ length: 51 }, (_, index) => ({
    userId: `AUB${stamp}${index}`.replace(/\D/g, '').slice(0, 22).padEnd(8, String(index % 10)),
    email: `admin.bulk.${stamp}.${index}@example.com`,
    passwordHash: '$2a$10$7EqJtq98hPqEX7fNZaFWoO5F9hM.KLQZ4pN0eQ0.Kx7v7Q8nK6r5u',
    role: 'runner',
    firstName: 'Bulk',
    lastName: `User ${index}`,
    emailVerified: true
  })));
  const ids = users.map((user) => String(user._id));

  try {
    const response = await fetch(`${BASE_URL}/admin/users/delete`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        _csrf: csrfToken,
        userIds: ids.join(','),
        reason: 'Remove bulk deletion integration fixtures',
        adminPassword: seed.password
      }),
      redirect: 'manual'
    });
    assert.equal(response.status, 302);
    assert.match(response.headers.get('location') || '', /type=warning/i);
    assert.equal(await User.countDocuments({ _id: { $in: ids } }), 0);
  } finally {
    await User.deleteMany({ _id: { $in: ids } });
  }
});

test('admin bulk deletion rejects more than 5,000 selected account IDs', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);
  const listResponse = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  const csrfToken = extractCsrfToken(await listResponse.text());
  const ids = Array.from({ length: 5001 }, () => String(new mongoose.Types.ObjectId()));
  const response = await fetch(`${BASE_URL}/admin/users/delete`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      userIds: ids.join(','),
      reason: 'Verify maximum bulk deletion protection',
      adminPassword: seed.password
    }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location') || '', /type=error/i);
  assert.match(response.headers.get('location') || '', /5%2C000/i);
  assert.ok(await User.findById(seed.admin.id));
});

test('admin can delete any other account after password confirmation and cannot delete self', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);
  const listResponse = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  const csrfToken = extractCsrfToken(await listResponse.text());

  const selfDeleteResponse = await fetch(`${BASE_URL}/admin/users/${seed.admin.id}/delete`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ _csrf: csrfToken, adminPassword: seed.password, reason: 'Verify self-delete protection' }),
    redirect: 'manual'
  });
  assert.equal(selfDeleteResponse.status, 302);
  assert.match(selfDeleteResponse.headers.get('location') || '', /type=error/i);

  await ensureConnected();
  assert.ok(await User.findById(seed.admin.id));

  const wrongPasswordResponse = await fetch(`${BASE_URL}/admin/users/delete`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      userIds: seed.runner.id,
      reason: 'Verify incorrect-password protection',
      adminPassword: 'WrongPass123'
    }),
    redirect: 'manual'
  });
  assert.equal(wrongPasswordResponse.status, 302);
  assert.match(wrongPasswordResponse.headers.get('location') || '', /type=error/i);
  assert.ok(await User.findById(seed.runner.id));

  const deleteResponse = await fetch(`${BASE_URL}/admin/users/delete`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      userIds: [seed.runner.id, seed.dormant.id].join(','),
      reason: 'Remove admin integration test fixtures',
      adminPassword: seed.password
    }),
    redirect: 'manual'
  });
  assert.equal(deleteResponse.status, 302);
  assert.match(deleteResponse.headers.get('location') || '', /type=warning/i);

  const deletedActiveUser = await User.findById(seed.runner.id);
  assert.equal(deletedActiveUser, null);
  const deletedUser = await User.findById(seed.dormant.id);
  assert.equal(deletedUser, null);
});

async function seedFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);
  const now = Date.now();

  const admin = await User.create({
    userId: `UAUSAD${stamp}`.slice(0, 22),
    email: `admin.users.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Users',
    emailVerified: true
  });

  const runner = await User.create({
    userId: `UAUSRU${stamp}`.slice(0, 22),
    email: `runner.users.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Directory',
    mobile: '09171234567',
    country: 'PH',
    dateOfBirth: new Date('1995-01-02T00:00:00.000Z'),
    gender: 'female',
    emergencyContactName: 'Emergency Contact',
    emergencyContactNumber: '09170000000',
    runningGroups: ['Sunrise Runners'],
    emailVerified: true,
    termsAcceptedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
    agreedPolicies: {
      privacyPolicyVersion: '1.0',
      termsPolicyVersion: '1.0',
      cookiePolicyVersion: '1.0',
      agreedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      ipAddress: '127.0.0.1',
      userAgent: 'admin-users-test'
    }
  });

  const organizer = await User.create({
    userId: `UAUSOR${stamp}`.slice(0, 22),
    email: `organizer.users.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Organizer',
    lastName: 'Owner',
    emailVerified: true
  });

  const dormant = await User.create({
    userId: `UAUSDO${stamp}`.slice(0, 22),
    email: `dormant.users.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Dormant',
    lastName: 'Delete',
    emailVerified: false
  });

  const application = await OrganiserApplication.create({
    userId: organizer._id,
    businessName: `Admin Users Business ${stamp}`.slice(0, 100),
    businessType: 'company',
    contactPhone: '09179876543',
    idProofUrl: `https://example.com/admin-users-id-${stamp}.pdf`,
    businessProofUrl: `https://example.com/admin-users-business-${stamp}.pdf`,
    status: 'approved',
    reviewedBy: admin._id,
    reviewedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
  });

  const event = await Event.create({
      isTestData: true,
    organizerId: organizer._id,
    slug: `admin-users-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `AU-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Admin Users Event ${stamp}`,
    organiserName: 'Admin Users Org',
    description: 'Admin users test event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps'],
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
      runningGroup: 'Sunrise Runners'
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'paid',
    waiver: {
      accepted: true,
      version: 1,
      signature: `${runner.firstName} ${runner.lastName}`,
      acceptedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    registeredAt: new Date(now - 1 * 24 * 60 * 60 * 1000)
  });

  const submission = await Submission.create({
    registrationId: registration._id,
    eventId: event._id,
    runnerId: runner._id,
    participationMode: 'virtual',
    raceDistance: '5K',
    distanceKm: 5,
    elapsedMs: 1800000,
    proofType: 'gps',
    proof: {
      url: `https://example.com/admin-users-submission-${stamp}.gpx`,
      key: `admin-users-submission-${stamp}`,
      mimeType: 'application/gpx+xml',
      size: 1500
    },
    status: 'approved',
    submissionCount: 1,
    submittedAt: new Date(now - 6 * 60 * 60 * 1000),
    reviewedAt: new Date(now - 5 * 60 * 60 * 1000),
    reviewedBy: admin._id,
    certificate: {
      url: `https://example.com/admin-users-certificate-${stamp}.pdf`,
      key: `admin-users-certificate-${stamp}`,
      issuedAt: new Date(now - 4 * 60 * 60 * 1000)
    }
  });

  const blog = await Blog.create({
    authorId: runner._id,
    title: `Admin Users Blog ${stamp}`,
    slug: `admin-users-blog-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 160),
    excerpt: 'Admin users blog excerpt',
    contentHtml: '<p>Admin users test content</p>',
    coverImageUrl: `https://example.com/admin-users-blog-${stamp}.jpg`,
    category: 'General',
    status: 'published',
    publishedAt: new Date(now - 2 * 60 * 60 * 1000)
  });

  const comment = await BlogComment.create({
    blogId: blog._id,
    authorId: runner._id,
    content: `Admin users comment ${stamp}`
  });

  return {
    stamp,
    password,
    admin: { id: String(admin._id), email: admin.email },
    runner: { id: String(runner._id), email: runner.email, userId: runner.userId },
    organizer: { id: String(organizer._id), email: organizer.email },
    dormant: { id: String(dormant._id), email: dormant.email },
    application: { id: String(application._id), businessName: application.businessName },
    event: { id: String(event._id), title: event.title },
    registrationId: String(registration._id),
    submissionId: String(submission._id),
    blogId: String(blog._id),
    commentId: String(comment._id)
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();

  await Promise.all([
    BlogComment.deleteMany({ _id: { $in: [currentSeed.commentId] } }),
    Blog.deleteMany({ _id: { $in: [currentSeed.blogId] } }),
    Submission.deleteMany({ _id: { $in: [currentSeed.submissionId] } }),
    Registration.deleteMany({ _id: { $in: [currentSeed.registrationId] } }),
    Event.deleteMany({ _id: { $in: [currentSeed.event.id] } }),
    OrganiserApplication.deleteMany({ _id: { $in: [currentSeed.application.id] } }),
    User.deleteMany({
      _id: {
        $in: [currentSeed.admin.id, currentSeed.runner.id, currentSeed.organizer.id, currentSeed.dormant.id]
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

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractCsrfToken(html) {
  const match = String(html || '').match(/name="_csrf"\s+value="([^"]*)"/i);
  assert.ok(match, 'page should include csrf token');
  return match[1];
}
