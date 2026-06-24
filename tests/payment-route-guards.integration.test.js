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
const Notification = require('../src/models/Notification');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3101;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const PNG_1PX_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQeRlmQAAAAASUVORK5CYII=',
  'base64'
);

let serverProc = null;
const seededFixtures = [];

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

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
  await cleanupSeededFixtures();
  await mongoose.disconnect();
  await closePostgresClient();
});

test('unauthenticated payment-proof upload redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/my-registrations/000000000000000000000000/payment-proof`, {
    method: 'POST',
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

test('runner cannot upload payment proof for another runner registration', async () => {
  const seed = await seedRouteGuardData('ownership-upload');
  const runnerSession = await login(seed.runnerA.email, seed.password);
  await assertRunnerSessionReady(runnerSession);
  const form = buildProofFormData();
  form.append('_csrf', await getCsrfToken('/my-registrations', runnerSession));

  const response = await fetch(`${BASE_URL}/my-registrations/${seed.registrationB._id}/payment-proof`, {
    method: 'POST',
    headers: {
      Cookie: runnerSession
    },
    body: form,
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /my-registrations\?type=error/);
  assert.match(location, /Registration\+not\+found\+or\+inaccessible/);
});

test('organizer cannot approve payment proof when registration is not proof_submitted', async () => {
  const seed = await seedRouteGuardData('invalid-transition');
  const organizerSession = await login(seed.ownerOrganizer.email, seed.password);
  await assertOrganizerSessionReady(organizerSession);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/approve`,
    organizerSession,
    { reviewNotes: 'Should fail transition check' }
  );

  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /type=error/);
  assert.match(location, /submitted\+payment\+receipts\+can\+be\+approved/);
});

test('organizer payment approval is stale-safe after first transition', async () => {
  const seed = await seedRouteGuardData('approve-stale-safe', {
    paymentStatusA: 'proof_submitted',
    paymentProofUrlA: 'https://example.com/proofs/approve-stale-safe.png'
  });
  const organizerSession = await login(seed.ownerOrganizer.email, seed.password);
  await assertOrganizerSessionReady(organizerSession);
  const path = `/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/approve`;

  const first = await postForm(path, organizerSession, { reviewNotes: 'First approval wins.' });
  assert.equal(first.status, 302);
  assert.match(first.headers.get('location') || '', /type=success/);

  const second = await postForm(path, organizerSession, { reviewNotes: 'Second approval should fail.' });
  assert.equal(second.status, 302);
  const secondLocation = second.headers.get('location') || '';
  assert.match(secondLocation, /type=error/);
  assert.match(secondLocation, /submitted\+payment\+receipts\+can\+be\+approved/);

  const updated = await Registration.findById(seed.registrationA._id).lean();
  assert.equal(updated.paymentStatus, 'paid');
  assert.equal(String(updated.paymentReviewedBy), String(seed.ownerOrganizer._id));
});

test('organizer payment rejection is stale-safe after first transition', async () => {
  const seed = await seedRouteGuardData('reject-stale-safe', {
    paymentStatusA: 'proof_submitted',
    paymentProofUrlA: 'https://example.com/proofs/reject-stale-safe.png'
  });
  const organizerSession = await login(seed.ownerOrganizer.email, seed.password);
  await assertOrganizerSessionReady(organizerSession);
  const path = `/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/reject`;

  const first = await postForm(path, organizerSession, {
    rejectionReason: 'Receipt is unreadable',
    reviewNotes: 'First rejection wins.'
  });
  assert.equal(first.status, 302);
  assert.match(first.headers.get('location') || '', /type=success/);

  const second = await postForm(path, organizerSession, {
    rejectionReason: 'Duplicate rejection attempt',
    reviewNotes: 'Second rejection should fail.'
  });
  assert.equal(second.status, 302);
  const secondLocation = second.headers.get('location') || '';
  assert.match(secondLocation, /type=error/);
  assert.match(secondLocation, /submitted\+payment\+receipts\+can\+be\+rejected/);

  const updated = await Registration.findById(seed.registrationA._id).lean();
  assert.equal(updated.paymentStatus, 'proof_rejected');
  assert.equal(updated.paymentRejectionReason, 'Receipt is unreadable');
  assert.equal(String(updated.paymentReviewedBy), String(seed.ownerOrganizer._id));
});

test('non-owner organizer cannot review payment proof for another organizer event', async () => {
  const seed = await seedRouteGuardData('organizer-ownership');
  const otherOrganizerSession = await login(seed.otherOrganizer.email, seed.password);
  await assertOrganizerSessionReady(otherOrganizerSession);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/approve`,
    otherOrganizerSession,
    { reviewNotes: 'Should fail owner check' }
  );

  assert.equal(response.status, 404);
});

test('payment-proof review page enforces auth and event ownership', async () => {
  const seed = await seedRouteGuardData('review-page-access', {
    paymentStatusA: 'proof_submitted',
    paymentProofUrlA: 'https://example.com/proofs/access.png'
  });

  const unauthenticated = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/payment-proofs/review`, {
    redirect: 'manual'
  });
  assert.equal(unauthenticated.status, 302);
  assert.equal(unauthenticated.headers.get('location'), '/login');

  const runnerSession = await login(seed.runnerA.email, seed.password);
  await assertRunnerSessionReady(runnerSession);
  const runnerResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/payment-proofs/review`, {
    headers: { Cookie: runnerSession },
    redirect: 'manual'
  });
  assert.equal(runnerResponse.status, 403);

  const otherOrganizerSession = await login(seed.otherOrganizer.email, seed.password);
  await assertOrganizerSessionReady(otherOrganizerSession);
  const otherOrganizerResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/payment-proofs/review`, {
    headers: { Cookie: otherOrganizerSession },
    redirect: 'manual'
  });
  assert.equal(otherOrganizerResponse.status, 404);
});

test('payment-proof review page renders pending proof workflow', async () => {
  const seed = await seedRouteGuardData('review-page-render', {
    paymentStatusA: 'proof_submitted',
    paymentProofUrlA: 'https://example.com/proofs/render.png',
    paymentAmountDueA: 615
  });
  const organizerSession = await login(seed.ownerOrganizer.email, seed.password);
  await assertOrganizerSessionReady(organizerSession);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/payment-proofs/review`, {
    headers: { Cookie: organizerSession },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Payment Proof Review/i);
  assert.match(html, new RegExp(escapeRegex(seed.event.title)));
  assert.match(html, /Pending Review/i);
  assert.match(html, /Runner Alpha/i);
  assert.match(html, new RegExp(escapeRegex(seed.runnerA.email)));
  assert.match(html, new RegExp(escapeRegex(seed.registrationA.confirmationCode)));
  assert.match(html, /PHP 615\.00/i);
  assert.match(html, /Owner Organizer Payments/i);
  assert.match(html, /Use confirmation code as transfer reference/i);
  assert.match(html, /https:\/\/example\.com\/proofs\/render\.png/i);
  assert.match(html, new RegExp(`/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/approve`));
  assert.match(html, new RegExp(`/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/reject`));
});

test('payment-proof review page paginates pending proofs and preserves filters', async () => {
  const seed = await seedRouteGuardData('review-page-pagination', {
    paymentStatusA: 'proof_submitted',
    paymentProofUrlA: 'https://example.com/proofs/page-a.png',
    paymentStatusB: 'proof_submitted',
    paymentProofUrlB: 'https://example.com/proofs/page-b.png'
  });

  const extraRegistrations = Array.from({ length: 50 }, (_, index) => buildRegistrationPayload({
    eventId: seed.event._id,
    user: {
      _id: new mongoose.Types.ObjectId(),
      firstName: 'Runner',
      lastName: `Page ${index}`,
      email: `phase4.review-page-pagination.extra-${index}.${Date.now()}@example.com`,
      mobile: '09171230000',
      country: 'PH',
      gender: 'male',
      emergencyContactName: 'Emergency Extra',
      emergencyContactNumber: '09170000999'
    },
    paymentStatus: 'proof_submitted',
    paymentProofUrl: `https://example.com/proofs/page-extra-${index}.png`
  }));
  await Registration.insertMany(extraRegistrations);

  const organizerSession = await login(seed.ownerOrganizer.email, seed.password);
  await assertOrganizerSessionReady(organizerSession);

  const response = await fetch(
    `${BASE_URL}/organizer/events/${seed.event._id}/payment-proofs/review?q=Runner`,
    {
      headers: { Cookie: organizerSession },
      redirect: 'manual'
    }
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Showing <strong>50<\/strong> of <strong>52<\/strong> payment proofs/i);
  assert.match(html, /Page 1 of 2/i);
  assert.match(html, new RegExp(`/organizer/events/${seed.event._id}/payment-proofs/review\\?q=[^"]+&amp;page=2`, 'i'));
});

test('payment-proof review page filters reviewed items and empty search states', async () => {
  const seed = await seedRouteGuardData('review-page-filters', {
    paymentStatusA: 'proof_submitted',
    paymentProofUrlA: 'https://example.com/proofs/filter-pending.png',
    paymentStatusB: 'proof_rejected',
    paymentProofUrlB: 'https://example.com/proofs/filter-rejected.png'
  });
  await Registration.updateOne(
    { _id: seed.registrationB._id },
    {
      $set: {
        paymentReviewedAt: new Date(),
        paymentReviewedBy: seed.ownerOrganizer._id,
        paymentRejectionReason: 'Receipt reference does not match',
        paymentReviewNotes: 'Ask runner to upload the correct receipt.'
      }
    }
  );

  const organizerSession = await login(seed.ownerOrganizer.email, seed.password);
  await assertOrganizerSessionReady(organizerSession);

  const rejectedResponse = await fetch(
    `${BASE_URL}/organizer/events/${seed.event._id}/payment-proofs/review?status=rejected&q=${encodeURIComponent(seed.runnerB.email)}`,
    {
      headers: { Cookie: organizerSession },
      redirect: 'manual'
    }
  );
  assert.equal(rejectedResponse.status, 200);
  const rejectedHtml = await rejectedResponse.text();
  assert.match(rejectedHtml, /Rejected/i);
  assert.match(rejectedHtml, /Runner Beta/i);
  assert.match(rejectedHtml, /Receipt reference does not match/i);
  assert.match(rejectedHtml, /Ask runner to upload the correct receipt/i);
  assert.match(rejectedHtml, /Owner Organizer/i);
  assert.doesNotMatch(rejectedHtml, /Approve Payment/i);

  const noMatchResponse = await fetch(
    `${BASE_URL}/organizer/events/${seed.event._id}/payment-proofs/review?q=no-match-${Date.now()}`,
    {
      headers: { Cookie: organizerSession },
      redirect: 'manual'
    }
  );
  assert.equal(noMatchResponse.status, 200);
  const noMatchHtml = await noMatchResponse.text();
  assert.match(noMatchHtml, /No payment proofs found/i);
});

test('payment approve creates runner in-app notification', async () => {
  const seed = await seedRouteGuardData('notify-approve', {
    paymentStatusA: 'proof_submitted',
    paymentProofUrlA: 'https://example.com/proofs/approve.png'
  });
  const organizerSession = await login(seed.ownerOrganizer.email, seed.password);
  await assertOrganizerSessionReady(organizerSession);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/approve`,
    organizerSession,
    { reviewNotes: 'Approved payment proof for notification test' }
  );

  assert.equal(response.status, 302);

  const audit = await waitForAuditRecord({
    action: 'payment.approved',
    targetId: String(seed.registrationA._id)
  });
  assert.equal(audit.status_from, 'proof_submitted');
  assert.equal(audit.status_to, 'paid');
  assert.equal(audit.actor_mongo_user_id, String(seed.ownerOrganizer._id));

  const runnerSession = await login(seed.runnerA.email, seed.password);
  await assertRunnerSessionReady(runnerSession);
  const notificationsPage = await fetch(`${BASE_URL}/runner/notifications`, {
    headers: { Cookie: runnerSession }
  });
  const html = await notificationsPage.text();
  assert.match(html, /Payment Approved/i);
  assert.match(html, new RegExp(escapeRegex(seed.event.title), 'i'));
  assert.match(html, /payment_approved/i);
});

test('payment reject creates runner in-app notification', async () => {
  const seed = await seedRouteGuardData('notify-reject', {
    paymentStatusA: 'proof_submitted',
    paymentProofUrlA: 'https://example.com/proofs/reject.png'
  });
  const organizerSession = await login(seed.ownerOrganizer.email, seed.password);
  await assertOrganizerSessionReady(organizerSession);

  const response = await postForm(
    `/organizer/events/${seed.event._id}/registrants/${seed.registrationA._id}/payment/reject`,
    organizerSession,
    {
      rejectionReason: 'Need clearer receipt',
      reviewNotes: 'Please upload a higher-resolution copy.'
    }
  );

  assert.equal(response.status, 302);

  const audit = await waitForAuditRecord({
    action: 'payment.rejected',
    targetId: String(seed.registrationA._id)
  });
  assert.equal(audit.status_from, 'proof_submitted');
  assert.equal(audit.status_to, 'proof_rejected');
  assert.equal(audit.actor_mongo_user_id, String(seed.ownerOrganizer._id));
  assert.equal(audit.notes, 'Need clearer receipt');

  const runnerSession = await login(seed.runnerA.email, seed.password);
  await assertRunnerSessionReady(runnerSession);
  const notificationsPage = await fetch(`${BASE_URL}/runner/notifications`, {
    headers: { Cookie: runnerSession }
  });
  const html = await notificationsPage.text();
  assert.match(html, /Payment Needs Update/i);
  assert.match(html, new RegExp(escapeRegex(seed.event.title), 'i'));
  assert.match(html, /payment_rejected/i);
});

async function seedRouteGuardData(tag, options = {}) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runnerA = await User.create({
    userId: `UTESTR${stamp}A`,
    email: `phase4.${tag}.runnera.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Alpha',
    emailVerified: true,
    mobile: '09171234567',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Emergency A',
    emergencyContactNumber: '09170000001'
  });

  const runnerB = await User.create({
    userId: `UTESTR${stamp}B`,
    email: `phase4.${tag}.runnerb.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Beta',
    emailVerified: true,
    mobile: '09171234568',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Emergency B',
    emergencyContactNumber: '09170000002'
  });

  const ownerOrganizer = await User.create({
    userId: `UTESTO${stamp}A`,
    email: `phase4.${tag}.organizer.owner.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Owner',
    lastName: 'Organizer',
    emailVerified: true
  });

  const otherOrganizer = await User.create({
    userId: `UTESTO${stamp}B`,
    email: `phase4.${tag}.organizer.other.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Other',
    lastName: 'Organizer',
    emailVerified: true
  });

  const now = new Date();
  const event = await Event.create({
    organizerId: ownerOrganizer._id,
    slug: `phase4-${tag}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `TG-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Phase4 Guard Event ${tag} ${stamp}`,
    organiserName: 'Owner Organizer',
    description: 'Route guard test event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    feeAmount: 380,
    feeCurrency: 'PHP',
    paymentAccountName: 'Owner Organizer Payments',
    paymentInstructions: 'Use confirmation code as transfer reference.',
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const registrationA = await Registration.create(
    buildRegistrationPayload({
      eventId: event._id,
      user: runnerA,
      paymentStatus: options.paymentStatusA || 'unpaid',
      paymentProofUrl: options.paymentProofUrlA || '',
      paymentAmountDue: options.paymentAmountDueA
    })
  );

  const registrationB = await Registration.create(
    buildRegistrationPayload({
      eventId: event._id,
      user: runnerB,
      paymentStatus: options.paymentStatusB || 'unpaid',
      paymentProofUrl: options.paymentProofUrlB || '',
      paymentAmountDue: options.paymentAmountDueB
    })
  );

  const fixture = {
    password,
    runnerA,
    runnerB,
    ownerOrganizer,
    otherOrganizer,
    event,
    registrationA,
    registrationB
  };
  seededFixtures.push(fixture);
  return fixture;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegistrationPayload({ eventId, user, paymentStatus, paymentProofUrl = '', paymentAmountDue = 380 }) {
  const hasProof = String(paymentProofUrl || '').trim().length > 0;
  const amountDue = Number.isFinite(Number(paymentAmountDue)) && Number(paymentAmountDue) >= 0
    ? Number(paymentAmountDue)
    : 380;
  return {
    eventId,
    userId: user._id,
    participant: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile || '',
      country: user.country || '',
      gender: user.gender || '',
      emergencyContactName: user.emergencyContactName || '',
      emergencyContactNumber: user.emergencyContactNumber || '',
      runningGroup: ''
    },
    participationMode: 'virtual',
    raceDistance: '5K',
    pricingSnapshot: {
      pricingMode: 'distance_based',
      source: 'distance_based',
      raceDistance: '5K',
      amount: amountDue,
      currency: 'PHP'
    },
    paymentAmountDue: amountDue,
    paymentCurrency: 'PHP',
    status: 'confirmed',
    paymentStatus,
    ...(hasProof
      ? {
          paymentProof: {
            url: String(paymentProofUrl),
            key: '',
            mimeType: 'image/png',
            size: 100,
            uploadedAt: new Date(),
            submittedBy: user._id
          }
        }
      : {}),
    waiver: {
      accepted: true,
      version: 1,
      signature: `${user.firstName} ${user.lastName}`,
      acceptedAt: new Date(),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    registeredAt: new Date()
  };
}

function buildProofFormData() {
  const form = new FormData();
  form.append('paymentProofFile', new Blob([PNG_1PX_BUFFER], { type: 'image/png' }), 'proof.png');
  return form;
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      email,
      password
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302, 'login should redirect');
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'login should set session cookie');
  return setCookie.split(';')[0];
}

async function postForm(routePath, cookie, payload = {}) {
  const csrfToken = await getCsrfToken('/organizer/dashboard', cookie);
  return fetch(`${BASE_URL}${routePath}`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      ...payload
    }),
    redirect: 'manual'
  });
}

async function getCsrfToken(pathname, cookie) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  const tokenMatch = html.match(/name="_csrf"\s+value="([^"]+)"/i)
    || html.match(/<meta name="csrf-token" content="([^"]+)"/i);
  assert.ok(tokenMatch, `Expected CSRF token on ${pathname}`);
  return tokenMatch[1];
}

async function assertOrganizerSessionReady(cookie) {
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true, 'organizer session should be active');
}

async function assertRunnerSessionReady(cookie) {
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true, 'runner session should be active');
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'GET',
      headers: {
        Cookie: cookie
      },
      redirect: 'manual'
    });
    const location = response.headers.get('location');
    if (location !== '/login') {
      return true;
    }
    // Session store write can lag by a few ms in CI/local runs.
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
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function cleanupSeededFixtures() {
  if (!seededFixtures.length) return;
  const userIds = [];
  const eventIds = [];
  const registrationIds = [];

  for (const seed of seededFixtures) {
    userIds.push(
      String(seed.runnerA._id),
      String(seed.runnerB._id),
      String(seed.ownerOrganizer._id),
      String(seed.otherOrganizer._id)
    );
    eventIds.push(String(seed.event._id));
    registrationIds.push(String(seed.registrationA._id), String(seed.registrationB._id));
  }

  await Promise.all([
    Notification.deleteMany({ userId: { $in: userIds } }),
    Registration.deleteMany({ _id: { $in: registrationIds } }),
    Event.deleteMany({ _id: { $in: eventIds } }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);

  try {
    const sql = getPostgresClient();
    await sql`delete from audit_critical where target_type = 'registration' and target_id in ${sql(registrationIds)}`;
    await sql`delete from migration_records where source_collection = 'users' and source_id in ${sql(userIds)}`;
    await sql`delete from app_users where mongo_user_id in ${sql(userIds)}`;
  } catch (error) {
    console.error('Failed to clean Supabase payment route guard test rows:', error.message);
  }
}

async function waitForAuditRecord({ action, targetId }) {
  const sql = getPostgresClient();
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i += 1) {
    const rows = await sql`
      select *
      from audit_critical
      where action = ${action}
        and target_type = 'registration'
        and target_id = ${targetId}
      limit 1
    `;
    if (rows[0]) return rows[0];
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Expected audit record for ${action} ${targetId}`);
}
