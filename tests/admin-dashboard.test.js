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
const BlogReport = require('../src/models/BlogReport');
const OrganiserApplication = require('../src/models/OrganiserApplication');
const CommunicationSetting = require('../src/models/CommunicationSetting');
const CommunicationEventSetting = require('../src/models/CommunicationEventSetting');
const CommunicationLog = require('../src/models/CommunicationLog');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3113;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      RESEND_API_KEY: ''
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });

  await waitForServerReady();
  seed = await seedAdminDashboardFixture();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
  await closePostgresClient();
});

test('admin dashboard renders platform stats and pending application queue', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Admin Dashboard/i);
  assert.match(html, /Action Center/i);
  assert.match(html, /Platform Overview/i);
  assert.match(html, /Shop Management/i);
  assert.match(html, /Roadmap/i);
  assert.match(html, /Pending Organizer Applications/i);
  assert.match(html, /Blog Reports/i);
  assert.match(html, /Blog Comments/i);
  assert.match(html, /\/admin\/privacy-policy/i);
  assert.match(html, /\/admin\/terms-and-conditions/i);
  assert.match(html, /\/admin\/cookie-policy/i);
  assert.match(html, /\/admin\/data-usage-policy/i);
  assert.match(html, /\/admin\/refund-and-cancellation-policy/i);
  assert.match(html, /\/admin\/organiser-terms/i);
  assert.match(html, /\/admin\/community-guidelines/i);
  assert.match(html, /\/admin\/acceptable-use-policy/i);
  assert.match(html, /\/admin\/users/i);
  assert.match(html, /\/admin\/applications/i);
  assert.match(html, /\/admin\/blog\/reports/i);
  assert.match(html, /\/admin\/blog\/comments/i);
  assert.match(html, /\/events/i);
  assert.match(html, /\/leaderboard/i);
  assert.match(html, /\/admin\/reviews\?type=payments/i);
  assert.match(html, /\/admin\/reviews\?type=results/i);
  assert.match(html, /\/admin\/reviews/i);
  assert.match(html, /\/admin\/events/i);
  assert.match(html, /Pending Event Reviews/i);
  assert.match(html, new RegExp(escapeRegex(seed.pendingApplication.businessName)));
  assert.match(html, new RegExp(escapeRegex(seed.pendingApplication.applicantEmail)));
  assert.match(html, new RegExp(escapeRegex(`/admin/applications/${seed.pendingApplication.id}`)));
  assert.match(html, new RegExp(escapeRegex(`/admin/events/${seed.pendingEvent.id}`)));
});

test('admin policy management pages render for existing and new policy documents', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);

  for (const pathName of ['/admin/privacy-policy', '/admin/data-usage-policy', '/admin/data-usage-policy/new']) {
    const response = await fetch(`${BASE_URL}${pathName}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    assert.equal(response.status, 200, `${pathName} should render for admins`);
    const html = await response.text();
    assert.match(html, /Policy|Data Usage|Privacy/i);
  }
});

test('admin review queue enforces admin access', async () => {
  const unauthenticated = await fetch(`${BASE_URL}/admin/reviews`, {
    redirect: 'manual'
  });
  assert.equal(unauthenticated.status, 302);
  assert.equal(unauthenticated.headers.get('location'), '/login');

  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', runnerCookie);
  const runnerResponse = await fetch(`${BASE_URL}/admin/reviews`, {
    headers: { Cookie: runnerCookie },
    redirect: 'manual'
  });
  assert.equal(runnerResponse.status, 403);
});

test('admin communications page enforces access and manages event/test email controls', async () => {
  const unauthenticated = await fetch(`${BASE_URL}/admin/communications`, {
    redirect: 'manual'
  });
  assert.equal(unauthenticated.status, 302);
  assert.equal(unauthenticated.headers.get('location'), '/login');

  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', runnerCookie);
  const runnerResponse = await fetch(`${BASE_URL}/admin/communications`, {
    headers: { Cookie: runnerCookie },
    redirect: 'manual'
  });
  assert.equal(runnerResponse.status, 403);

  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const pageResponse = await fetch(`${BASE_URL}/admin/communications`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(pageResponse.status, 200);
  const html = await pageResponse.text();
  assert.match(html, /Communications/i);
  assert.match(html, /Email Budget/i);
  assert.match(html, /account\.email_verification/i);

  const lockedResponse = await fetch(`${BASE_URL}/admin/communications/events/account.email_verification`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ inAppEnabled: '' }),
    redirect: 'manual'
  });
  assert.equal(lockedResponse.status, 302);

  await ensureConnected();
  const lockedEvent = await CommunicationEventSetting.findOne({ eventKey: 'account.email_verification' }).lean();
  assert.equal(lockedEvent.emailEnabled, true);

  const settingsResponse = await fetch(`${BASE_URL}/admin/communications/settings`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      emailSystemEnabled: 'on',
      inAppNotificationsEnabled: 'on',
      dailyEmailLimit: '20',
      reservedCriticalEmailCount: '5',
      softStopThreshold: '10',
      hardStopThreshold: '20',
      senderName: 'HelloRun',
      senderEmail: 'noreply@example.com',
      replyToEmail: 'support@example.com'
    }),
    redirect: 'manual'
  });
  assert.equal(settingsResponse.status, 302);

  const setting = await CommunicationSetting.findOne({ key: 'communication.global' }).lean();
  assert.equal(setting.dailyEmailLimit, 20);
  assert.equal(setting.softStopThreshold, 10);

  const testEmailResponse = await fetch(`${BASE_URL}/admin/communications/test-email`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      to: `admin.communication.${seed.stamp}@example.com`,
      subject: 'Admin communication test',
      message: 'Test email from admin route'
    }),
    redirect: 'manual'
  });
  assert.equal(testEmailResponse.status, 302);

  const testLog = await CommunicationLog.findOne({
    eventKey: 'admin.test_email',
    recipientEmail: `admin.communication.${seed.stamp}@example.com`,
    isTest: true
  }).lean();
  assert.ok(testLog);
  assert.equal(testLog.channel, 'email');
  assert.equal(testLog.status, 'skipped');
});

test('admin review queue renders payment and result queues with filters', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);

  const allResponse = await fetch(`${BASE_URL}/admin/reviews`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(allResponse.status, 200);
  const allHtml = await allResponse.text();
  assert.match(allHtml, /Payment Receipt and Run Result Reviews/i);
  assert.match(allHtml, /Payment/i);
  assert.match(allHtml, /Result/i);
  assert.match(allHtml, new RegExp(escapeRegex(seed.eventTitle)));
  assert.match(allHtml, new RegExp(escapeRegex(seed.runner.email)));
  assert.match(allHtml, /\/organizer\/events\/[a-f0-9]{24}\/payment-proofs\/review/i);
  assert.match(allHtml, /\/organizer\/events\/[a-f0-9]{24}\/submissions\/[a-f0-9]{24}\/review/i);

  const paymentsResponse = await fetch(`${BASE_URL}/admin/reviews?type=payments`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(paymentsResponse.status, 200);
  const paymentsHtml = await paymentsResponse.text();
  assert.match(paymentsHtml, /Payment/i);
  assert.doesNotMatch(paymentsHtml, /status-badge-result/i);

  const resultsResponse = await fetch(`${BASE_URL}/admin/reviews?type=results`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(resultsResponse.status, 200);
  const resultsHtml = await resultsResponse.text();
  assert.match(resultsHtml, /Result/i);
  assert.doesNotMatch(resultsHtml, /status-badge-payment/i);
});

test('admin review queue renders empty state for unmatched search', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);

  const response = await fetch(`${BASE_URL}/admin/reviews?q=no-match-${Date.now()}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /No pending reviews found/i);
});

test('admin events page enforces admin access', async () => {
  const unauthenticated = await fetch(`${BASE_URL}/admin/events`, {
    redirect: 'manual'
  });
  assert.equal(unauthenticated.status, 302);
  assert.equal(unauthenticated.headers.get('location'), '/login');

  const unauthenticatedBulkDelete = await fetch(`${BASE_URL}/admin/events/bulk-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ eventIds: seed.bulkDeleteEvents.activeIds, reason: 'Blocked unauthenticated bulk delete.', adminPassword: seed.password }),
    redirect: 'manual'
  });
  assert.equal(unauthenticatedBulkDelete.status, 302);
  assert.equal(unauthenticatedBulkDelete.headers.get('location'), '/login');

  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', runnerCookie);
  const runnerResponse = await fetch(`${BASE_URL}/admin/events`, {
    headers: { Cookie: runnerCookie },
    redirect: 'manual'
  });
  assert.equal(runnerResponse.status, 403);

  const runnerBulkDelete = await fetch(`${BASE_URL}/admin/events/bulk-delete`, {
    method: 'POST',
    headers: {
      Cookie: runnerCookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ eventIds: seed.bulkDeleteEvents.activeIds, reason: 'Blocked runner bulk delete.', adminPassword: seed.password }),
    redirect: 'manual'
  });
  assert.equal(runnerBulkDelete.status, 403);
});

test('admin can list and inspect event management records', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);

  const listResponse = await fetch(`${BASE_URL}/admin/events?needsReview=1`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(listResponse.status, 200);
  const listHtml = await listResponse.text();
  assert.match(listHtml, /Event Management/i);
  assert.match(listHtml, /Pending Review/i);
  assert.match(listHtml, new RegExp(escapeRegex(seed.pendingEvent.title)));
  assert.match(listHtml, new RegExp(escapeRegex(seed.organizer.email)));

  const detailResponse = await fetch(`${BASE_URL}/admin/events/${seed.pendingEvent.id}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(detailResponse.status, 200);
  const detailHtml = await detailResponse.text();
  assert.match(detailHtml, /Admin Actions/i);
  assert.match(detailHtml, /Approve (?:&amp;|&) Publish/i);
  assert.match(detailHtml, /Registrations/i);

  const editResponse = await fetch(`${BASE_URL}/admin/events/${seed.pendingEvent.id}/edit`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(editResponse.status, 200);
  const editHtml = await editResponse.text();
  assert.match(editHtml, /Admin Edit Event/i);
  assert.match(editHtml, new RegExp(escapeRegex(`/admin/events/${seed.pendingEvent.id}/edit`)));

  const perPageResponse = await fetch(`${BASE_URL}/admin/events?perPage=all`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(perPageResponse.status, 200);
  const perPageHtml = await perPageResponse.text();
  assert.match(perPageHtml, /<option value="all" selected>All<\/option>/i);
});

test('admin approves pending event, then archive hides it from public event detail', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);

  const pendingPublicBefore = await fetch(`${BASE_URL}/events/${seed.pendingEvent.slug}`, {
    redirect: 'manual'
  });
  assert.equal(pendingPublicBefore.status, 404);

  const approveResponse = await fetch(`${BASE_URL}/admin/events/${seed.pendingEvent.id}/approve`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    redirect: 'manual'
  });
  assert.equal(approveResponse.status, 200);
  const approveBody = await approveResponse.json();
  assert.equal(approveBody.success, true);

  await ensureConnected();
  const approved = await Event.findById(seed.pendingEvent.id);
  assert.equal(approved.status, 'published');
  assert.ok(approved.approvedAt);
  assert.ok(approved.approvedBy);
  assert.equal(approved.approvalSource, 'admin');
  assert.equal(approved.autoApprovedAt, null);
  assert.equal(approved.autoApprovalRuleVersion, '');
  const publishAudit = await waitForAuditRecord({
    action: 'event.published',
    targetId: seed.pendingEvent.id
  });
  assert.equal(publishAudit.status_from, 'pending_review');
  assert.equal(publishAudit.status_to, 'published');
  assert.equal(publishAudit.actor_mongo_user_id, seed.admin.id);

  const publicAfterApprove = await fetch(`${BASE_URL}/events/${seed.pendingEvent.slug}`, {
    redirect: 'manual'
  });
  assert.equal(publicAfterApprove.status, 200);

  const archiveResponse = await fetch(`${BASE_URL}/admin/events/${seed.pendingEvent.id}/archive`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ reason: 'Archiving after admin workflow test.' }),
    redirect: 'manual'
  });
  assert.equal(archiveResponse.status, 200);
  const archiveBody = await archiveResponse.json();
  assert.equal(archiveBody.success, true);

  const archived = await Event.findById(seed.pendingEvent.id);
  assert.equal(archived.status, 'archived');
  assert.equal(archived.archiveReason, 'Archiving after admin workflow test.');
  const archiveAudit = await waitForAuditRecord({
    action: 'event.archived',
    targetId: seed.pendingEvent.id
  });
  assert.equal(archiveAudit.status_from, 'published');
  assert.equal(archiveAudit.status_to, 'archived');
  assert.equal(archiveAudit.notes, 'Archiving after admin workflow test.');

  const publicAfterArchive = await fetch(`${BASE_URL}/events/${seed.pendingEvent.slug}`, {
    redirect: 'manual'
  });
  assert.equal(publicAfterArchive.status, 404);
});

test('admin soft deletes event while preserving registrations', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);

  const missingPasswordResponse = await fetch(`${BASE_URL}/admin/events/${seed.deleteEvent.id}/delete`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ reason: 'Soft delete workflow test.' }),
    redirect: 'manual'
  });
  assert.equal(missingPasswordResponse.status, 400);
  assert.equal((await missingPasswordResponse.json()).success, false);

  const wrongPasswordResponse = await fetch(`${BASE_URL}/admin/events/${seed.deleteEvent.id}/delete`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ reason: 'Soft delete workflow test.', adminPassword: 'WrongPass123' }),
    redirect: 'manual'
  });
  assert.equal(wrongPasswordResponse.status, 403);
  assert.equal((await wrongPasswordResponse.json()).success, false);

  const deleteResponse = await fetch(`${BASE_URL}/admin/events/${seed.deleteEvent.id}/delete`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ reason: 'Soft delete workflow test.', adminPassword: `  ${seed.password}  ` }),
    redirect: 'manual'
  });
  assert.equal(deleteResponse.status, 200);
  const deleteBody = await deleteResponse.json();
  assert.equal(deleteBody.success, true);

  await ensureConnected();
  const deleted = await Event.findById(seed.deleteEvent.id);
  assert.equal(deleted.isDeleted, true);
  assert.equal(deleted.deleteReason, 'Soft delete workflow test.');
  const deleteAudit = await waitForAuditRecord({
    action: 'event.deleted',
    targetId: seed.deleteEvent.id
  });
  assert.equal(deleteAudit.status_from, 'published');
  assert.equal(deleteAudit.status_to, 'deleted');
  assert.equal(deleteAudit.notes, 'Soft delete workflow test.');

  const preservedRegistrations = await Registration.countDocuments({ eventId: seed.deleteEvent.id });
  assert.equal(preservedRegistrations, 1);

  const deletedListResponse = await fetch(`${BASE_URL}/admin/events?deleted=1&q=${encodeURIComponent(seed.deleteEvent.title)}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(deletedListResponse.status, 200);
  const deletedListHtml = await deletedListResponse.text();
  assert.match(deletedListHtml, new RegExp(escapeRegex(seed.deleteEvent.title)));
  assert.match(deletedListHtml, /Deleted/i);
  assert.match(deletedListHtml, /disabled[^>]*data-event-checkbox/i);

  const statusDeletedListResponse = await fetch(`${BASE_URL}/admin/events?status=deleted&q=${encodeURIComponent(seed.deleteEvent.title)}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(statusDeletedListResponse.status, 200);
  const statusDeletedListHtml = await statusDeletedListResponse.text();
  assert.match(statusDeletedListHtml, new RegExp(escapeRegex(seed.deleteEvent.title)));
  assert.match(statusDeletedListHtml, /Deleted/i);
});

test('admin bulk deletes eligible events with password confirmation', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);

  const postBulkDelete = (payload) => fetch(`${BASE_URL}/admin/events/bulk-delete`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload),
    redirect: 'manual'
  });

  const missingPasswordResponse = await postBulkDelete({
    eventIds: seed.bulkDeleteEvents.activeIds,
    reason: 'Bulk delete workflow test.'
  });
  assert.equal(missingPasswordResponse.status, 400);
  assert.equal((await missingPasswordResponse.json()).success, false);

  const wrongPasswordResponse = await postBulkDelete({
    eventIds: seed.bulkDeleteEvents.activeIds,
    reason: 'Bulk delete workflow test.',
    adminPassword: 'WrongPass123'
  });
  assert.equal(wrongPasswordResponse.status, 403);
  assert.equal((await wrongPasswordResponse.json()).success, false);

  const missingIdsResponse = await postBulkDelete({
    reason: 'Bulk delete workflow test.',
    adminPassword: seed.password
  });
  assert.equal(missingIdsResponse.status, 400);
  assert.equal((await missingIdsResponse.json()).success, false);

  const invalidIdsResponse = await postBulkDelete({
    eventIds: ['not-an-object-id'],
    reason: 'Bulk delete workflow test.',
    adminPassword: seed.password
  });
  assert.equal(invalidIdsResponse.status, 400);
  assert.equal((await invalidIdsResponse.json()).success, false);

  const shortReasonResponse = await postBulkDelete({
    eventIds: seed.bulkDeleteEvents.activeIds,
    reason: 'short',
    adminPassword: seed.password
  });
  assert.equal(shortReasonResponse.status, 400);
  assert.equal((await shortReasonResponse.json()).success, false);

  const deletedOnlyResponse = await postBulkDelete({
    eventIds: [seed.bulkDeleteEvents.alreadyDeletedId],
    reason: 'Bulk delete deleted-only test.',
    adminPassword: seed.password
  });
  assert.equal(deletedOnlyResponse.status, 404);
  assert.equal((await deletedOnlyResponse.json()).success, false);

  const validResponse = await postBulkDelete({
    eventIds: [...seed.bulkDeleteEvents.activeIds, seed.bulkDeleteEvents.alreadyDeletedId],
    reason: 'Bulk delete workflow test.',
    adminPassword: ` ${seed.password} `
  });
  assert.equal(validResponse.status, 200);
  const validBody = await validResponse.json();
  assert.equal(validBody.success, true);
  assert.equal(validBody.deletedCount, 2);

  await ensureConnected();
  const deletedEvents = await Event.find({ _id: { $in: seed.bulkDeleteEvents.activeIds } }).lean();
  assert.equal(deletedEvents.length, 2);
  deletedEvents.forEach((event) => {
    assert.equal(event.isDeleted, true);
    assert.equal(event.deleteReason, 'Bulk delete workflow test.');
  });

  const alreadyDeleted = await Event.findById(seed.bulkDeleteEvents.alreadyDeletedId).lean();
  assert.equal(alreadyDeleted.isDeleted, true);
  assert.equal(alreadyDeleted.deleteReason, 'Pre-deleted before bulk test.');

  for (const eventId of seed.bulkDeleteEvents.activeIds) {
    const audit = await waitForAuditRecord({
      action: 'event.deleted',
      targetId: eventId
    });
    assert.equal(audit.status_from, 'published');
    assert.equal(audit.status_to, 'deleted');
    assert.equal(audit.notes, 'Bulk delete workflow test.');
  }
});

test('admin cannot approve non-pending event', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);

  const response = await fetch(`${BASE_URL}/admin/events/${seed.draftEvent.id}/approve`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    redirect: 'manual'
  });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.success, false);
});

async function seedAdminDashboardFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await User.create({
    userId: `UADMA${stamp}`.slice(0, 22),
    email: `admin.dashboard.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Dashboard',
    emailVerified: true
  });

  const organizer = await User.create({
    userId: `UADMO${stamp}`.slice(0, 22),
    email: `organizer.dashboard.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'pending',
    firstName: 'Org',
    lastName: 'Pending',
    emailVerified: true
  });

  const runner = await User.create({
    userId: `UADMR${stamp}`.slice(0, 22),
    email: `runner.dashboard.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'One',
    emailVerified: true
  });

  const pendingApplication = await OrganiserApplication.create({
    userId: organizer._id,
    businessName: `Pending Org ${stamp}`,
    businessType: 'individual',
    contactPhone: '09171234567',
    idProofUrl: `https://example.com/id-proof-${stamp}.pdf`,
    businessProofUrl: `https://example.com/business-proof-${stamp}.pdf`,
    status: 'pending'
  });

  const now = Date.now();
  const event = await Event.create({
    organizerId: organizer._id,
    slug: `admin-dashboard-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `AD-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Admin Dashboard Event ${stamp}`,
    organiserName: 'Admin Dashboard Org',
    description: 'Admin dashboard metrics test event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 10 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 11 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps', 'photo', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const pendingEvent = await Event.create({
    organizerId: organizer._id,
    slug: `admin-pending-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `PE-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Admin Pending Event ${stamp}`,
    organiserName: 'Admin Pending Org',
    description: 'Admin pending event has enough description text for approval.',
    status: 'pending_review',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['10K'],
    registrationOpenAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    virtualWindow: {
      startAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(now + 8 * 24 * 60 * 60 * 1000)
    },
    proofTypesAllowed: ['gps', 'photo'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1,
    submittedForReviewAt: new Date(now - 60 * 60 * 1000)
  });

  const draftEvent = await Event.create({
    organizerId: organizer._id,
    slug: `admin-draft-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `DE-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Admin Draft Event ${stamp}`,
    organiserName: 'Admin Draft Org',
    description: '',
    status: 'draft',
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const deleteEvent = await Event.create({
    organizerId: organizer._id,
    slug: `admin-delete-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `SD-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Admin Soft Delete Event ${stamp}`,
    organiserName: 'Admin Delete Org',
    description: 'Admin soft delete event has enough description text.',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    virtualWindow: {
      startAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(now + 8 * 24 * 60 * 60 * 1000)
    },
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const bulkDeleteEventA = await Event.create({
    organizerId: organizer._id,
    slug: `admin-bulk-delete-a-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `BDA-${String(stamp).replace(/\D/g, '').slice(-5)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Admin Bulk Delete A ${stamp}`,
    organiserName: 'Admin Delete Org',
    description: 'Admin bulk delete event A has enough description text.',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    virtualWindow: {
      startAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(now + 8 * 24 * 60 * 60 * 1000)
    },
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const bulkDeleteEventB = await Event.create({
    organizerId: organizer._id,
    slug: `admin-bulk-delete-b-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `BDB-${String(stamp).replace(/\D/g, '').slice(-5)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Admin Bulk Delete B ${stamp}`,
    organiserName: 'Admin Delete Org',
    description: 'Admin bulk delete event B has enough description text.',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['10K'],
    registrationOpenAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    virtualWindow: {
      startAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(now + 8 * 24 * 60 * 60 * 1000)
    },
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const alreadyDeletedBulkEvent = await Event.create({
    organizerId: organizer._id,
    slug: `admin-bulk-deleted-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `BDD-${String(stamp).replace(/\D/g, '').slice(-5)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Admin Already Deleted Bulk ${stamp}`,
    organiserName: 'Admin Delete Org',
    description: 'Admin already deleted event for bulk delete checks.',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    virtualWindow: {
      startAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(now + 8 * 24 * 60 * 60 * 1000)
    },
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1,
    isDeleted: true,
    deletedAt: new Date(now - 60 * 60 * 1000),
    deletedBy: admin._id,
    deleteReason: 'Pre-deleted before bulk test.'
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
    paymentStatus: 'proof_submitted',
    paymentProof: {
      url: `https://example.com/payment-proof-${stamp}.png`,
      key: `payment-proof-${stamp}`,
      mimeType: 'image/png',
      size: 1024,
      uploadedAt: new Date(now - 12 * 60 * 60 * 1000)
    },
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

  const deleteEventRegistration = await Registration.create({
    eventId: deleteEvent._id,
    userId: runner._id,
    participant: {
      firstName: runner.firstName,
      lastName: runner.lastName,
      email: runner.email
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
      url: `https://example.com/submission-${stamp}.gpx`,
      key: `submission-${stamp}`,
      mimeType: 'application/gpx+xml',
      size: 1500
    },
    status: 'submitted',
    submissionCount: 1,
    submittedAt: new Date(now - 6 * 60 * 60 * 1000)
  });

  const blog = await Blog.create({
    authorId: admin._id,
    title: `Admin Dashboard Pending Blog ${stamp}`,
    slug: `admin-dashboard-blog-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 160),
    excerpt: 'Dashboard test blog excerpt',
    contentHtml: '<p>Dashboard test content</p>',
    coverImageUrl: `https://example.com/blog-cover-${stamp}.jpg`,
    category: 'General',
    status: 'pending',
    submittedAt: new Date()
  });

  const blogComment = await BlogComment.create({
    blogId: blog._id,
    authorId: runner._id,
    content: `Admin dashboard report comment ${stamp}`
  });

  const blogReport = await BlogReport.create({
    targetType: 'comment',
    blogId: blog._id,
    commentId: blogComment._id,
    reporterId: runner._id,
    reason: 'other',
    note: `Admin dashboard report ${stamp}`,
    status: 'open'
  });

  return {
    stamp,
    password,
    admin: {
      id: String(admin._id),
      email: admin.email
    },
    organizer: {
      id: String(organizer._id),
      email: organizer.email
    },
    runner: {
      id: String(runner._id),
      email: runner.email
    },
    pendingApplication: {
      id: String(pendingApplication._id),
      businessName: pendingApplication.businessName,
      applicantEmail: organizer.email
    },
    eventId: String(event._id),
    eventTitle: event.title,
    pendingEvent: {
      id: String(pendingEvent._id),
      title: pendingEvent.title,
      slug: pendingEvent.slug
    },
    draftEvent: {
      id: String(draftEvent._id),
      title: draftEvent.title
    },
    deleteEvent: {
      id: String(deleteEvent._id),
      title: deleteEvent.title,
      registrationId: String(deleteEventRegistration._id)
    },
    bulkDeleteEvents: {
      activeIds: [String(bulkDeleteEventA._id), String(bulkDeleteEventB._id)],
      alreadyDeletedId: String(alreadyDeletedBulkEvent._id)
    },
    registrationId: String(registration._id),
    submissionId: String(submission._id),
    blogId: String(blog._id),
    blogCommentId: String(blogComment._id),
    blogReportId: String(blogReport._id)
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  const userIds = [currentSeed.admin.id, currentSeed.organizer.id, currentSeed.runner.id];
  const eventIds = [
    currentSeed.eventId,
    currentSeed.pendingEvent?.id,
    currentSeed.draftEvent?.id,
    currentSeed.deleteEvent?.id,
    ...(currentSeed.bulkDeleteEvents?.activeIds || []),
    currentSeed.bulkDeleteEvents?.alreadyDeletedId
  ].filter(Boolean);

  await Promise.all([
    Submission.deleteMany({ _id: { $in: [currentSeed.submissionId] } }),
    Registration.deleteMany({ _id: { $in: [currentSeed.registrationId, currentSeed.deleteEvent?.registrationId].filter(Boolean) } }),
    Event.deleteMany({ _id: { $in: eventIds } }),
    OrganiserApplication.deleteMany({ _id: { $in: [currentSeed.pendingApplication.id] } }),
    BlogReport.deleteMany({ _id: { $in: [currentSeed.blogReportId] } }),
    BlogComment.deleteMany({ _id: { $in: [currentSeed.blogCommentId] } }),
    Blog.deleteMany({ _id: { $in: [currentSeed.blogId] } }),
    CommunicationLog.deleteMany({}),
    CommunicationSetting.deleteMany({}),
    CommunicationEventSetting.deleteMany({}),
    User.deleteMany({
      _id: {
        $in: userIds
      }
    })
  ]);

  try {
    const sql = getPostgresClient();
    await sql`delete from audit_critical where target_type = 'event' and target_id in ${sql(eventIds)}`;
    await sql`delete from migration_records where source_collection = 'users' and source_id in ${sql(userIds)}`;
    await sql`delete from app_users where mongo_user_id in ${sql(userIds)}`;
  } catch (error) {
    console.error('Failed to clean Supabase admin dashboard test rows:', error.message);
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

async function waitForAdminSessionReady(cookie) {
  return waitForSessionReady('/admin/dashboard', cookie);
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i += 1) {
    const r = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (r.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
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

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function waitForAuditRecord({ action, targetId }) {
  const sql = getPostgresClient();
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i += 1) {
    const rows = await sql`
      select *
      from audit_critical
      where action = ${action}
        and target_type = 'event'
        and target_id = ${targetId}
      limit 1
    `;
    if (rows[0]) return rows[0];
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Expected audit record for ${action} ${targetId}`);
}
