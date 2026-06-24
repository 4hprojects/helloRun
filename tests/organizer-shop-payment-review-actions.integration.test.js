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
const TEST_PORT = 3140;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const PNG_1PX_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360606060000000050001a5f645400000000049454e44ae426082',
  'hex'
);

let serverProc = null;
let seed = null;

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
  seed = await seedFixtures();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }

  await cleanupFixtures(seed);
  await mongoose.disconnect();
  await closePostgresClient();
});

test('organizer shop payment review approve/reject syncs statuses, notifications, and critical audit logs', async () => {
  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', runnerCookie);

  const registerCsrf = await getCsrfFromAuthedPage(`/events/${seed.event.slug}/register`, runnerCookie);
  const registerResponse = await fetch(`${BASE_URL}/events/${seed.event.slug}/register`, {
    method: 'POST',
    headers: {
      Cookie: runnerCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: registerCsrf.csrfToken,
      participationMode: 'virtual',
      raceDistance: '5K',
      addOnProductIds: seed.visibleAddOnId,
      waiverAccepted: 'on',
      waiverSignature: `${seed.runner.firstName} ${seed.runner.lastName}`
    }),
    redirect: 'manual'
  });
  assert.equal(registerResponse.status, 302);

  const registration = await Registration.findOne({ eventId: seed.event._id, userId: seed.runner._id })
    .select('_id paymentStatus')
    .lean();
  assert.ok(registration);
  assert.equal(registration.paymentStatus, 'unpaid');

  const paymentCsrf = await getCsrfFromAuthedPage('/my-registrations', runnerCookie);
  const paymentForm = new FormData();
  paymentForm.append('_csrf', paymentCsrf.csrfToken);
  paymentForm.append('paymentProofFile', new Blob([PNG_1PX_BUFFER], { type: 'image/png' }), 'payment-proof.png');

  const uploadResponse = await fetch(`${BASE_URL}/my-registrations/${registration._id}/payment-proof`, {
    method: 'POST',
    headers: { Cookie: runnerCookie },
    body: paymentForm,
    redirect: 'manual'
  });
  assert.equal(uploadResponse.status, 302);

  const sql = getPostgresClient();
  const orders = await sql`
    select id
    from orders
    where customer_note = ${`registration:${String(registration._id)}`}
      and order_source = 'registration_checkout'
    limit 1
  `;
  assert.equal(orders.length, 1);

  const shopPayments = await sql`
    select id, status
    from shop_payments
    where order_id = ${orders[0].id}
    order by created_at desc
    limit 1
  `;
  assert.equal(shopPayments.length, 1);
  assert.equal(shopPayments[0].status, 'pending_review');

  const organizerCookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', organizerCookie);

  const organizerCsrf = await getCsrfFromAuthedPage('/organizer/dashboard', organizerCookie);
  const invalidReviewResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/payment-reviews/${shopPayments[0].id}`, {
    method: 'PATCH',
    headers: {
      Cookie: organizerCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: organizerCsrf.csrfToken,
      status: 'rejected',
      rejectionReason: 'bad'
    }),
    redirect: 'manual'
  });
  assert.equal(invalidReviewResponse.status, 400);

  const approveResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/payment-reviews/${shopPayments[0].id}`, {
    method: 'PATCH',
    headers: {
      Cookie: organizerCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: organizerCsrf.csrfToken,
      status: 'paid',
      reviewNote: 'Payment approved by organizer'
    }),
    redirect: 'manual'
  });
  assert.equal(approveResponse.status, 200);

  const registrationAfterApprove = await Registration.findById(registration._id)
    .select('paymentStatus paymentReviewNotes paymentRejectionReason')
    .lean();
  assert.ok(registrationAfterApprove);
  assert.equal(registrationAfterApprove.paymentStatus, 'paid');
  assert.equal(registrationAfterApprove.paymentReviewNotes, 'Payment approved by organizer');
  assert.equal(registrationAfterApprove.paymentRejectionReason, '');

  const approvedNotification = await Notification.findOne({
    userId: seed.runner._id,
    type: 'payment_approved'
  }).sort({ createdAt: -1 }).lean();
  assert.ok(approvedNotification);

  await waitForAuditRecord({
    sql,
    action: 'payment.approved',
    targetType: 'shop_payment',
    targetId: String(shopPayments[0].id)
  });

  const resetRows = await sql`
    update shop_payments
    set status = 'pending_review', reviewed_by = null, reviewed_at = null, rejection_reason = null, review_note = null
    where id = ${shopPayments[0].id}
    returning id
  `;
  assert.equal(resetRows.length, 1);

  const rejectResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/payment-reviews/${shopPayments[0].id}`, {
    method: 'PATCH',
    headers: {
      Cookie: organizerCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: organizerCsrf.csrfToken,
      status: 'rejected',
      rejectionReason: 'Receipt is blurry and unreadable',
      reviewNote: 'Please upload a clearer proof'
    }),
    redirect: 'manual'
  });
  assert.equal(rejectResponse.status, 200);

  const registrationAfterReject = await Registration.findById(registration._id)
    .select('paymentStatus paymentReviewNotes paymentRejectionReason')
    .lean();
  assert.ok(registrationAfterReject);
  assert.equal(registrationAfterReject.paymentStatus, 'proof_rejected');
  assert.equal(registrationAfterReject.paymentReviewNotes, 'Please upload a clearer proof');
  assert.equal(registrationAfterReject.paymentRejectionReason, 'Receipt is blurry and unreadable');

  const rejectedNotification = await Notification.findOne({
    userId: seed.runner._id,
    type: 'payment_rejected'
  }).sort({ createdAt: -1 }).lean();
  assert.ok(rejectedNotification);

  await waitForAuditRecord({
    sql,
    action: 'payment.rejected',
    targetType: 'shop_payment',
    targetId: String(shopPayments[0].id)
  });
});

async function waitForAuditRecord({ sql, action, targetType, targetId }, timeoutMs = 7000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const rows = await sql`
      select id
      from audit_critical
      where action = ${action}
        and target_type = ${targetType}
        and target_id = ${targetId}
      order by created_at desc
      limit 1
    `;
    if (rows.length) return;
    await sleep(150);
  }
  throw new Error(`Expected audit_critical record for ${action} ${targetType}:${targetId}`);
}

async function seedFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runner = await User.create({
    userId: `URSPAY${stamp}`.slice(0, 22),
    email: `shop.payment.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Shop',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000021',
    country: 'PH',
    emergencyContactName: 'Emergency Shop',
    emergencyContactNumber: '09170000022'
  });

  const organizer = await User.create({
    userId: `UOSPAY${stamp}`.slice(0, 22),
    email: `shop.payment.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Shop',
    lastName: 'Organizer',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
      isTestData: true,
    organizerId: organizer._id,
    slug: `shop-payment-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `SPY-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Shop Payment Event ${stamp}`.slice(0, 150),
    organiserName: 'Shop Organizer',
    description: 'Organizer payment review action fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    feeAmount: 380,
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const sql = getPostgresClient();
  const eventCoreRows = await sql`
    insert into events_core (mongo_event_id, slug, title, status, event_type, mongo_organizer_user_id)
    values (${String(event._id)}, ${event.slug}, ${event.title}, 'published', 'virtual', ${String(organizer._id)})
    on conflict (mongo_event_id)
    do update set title = excluded.title
    returning id
  `;
  const eventCoreId = eventCoreRows[0].id;

  const visibleAddOnName = `Payment Review Addon ${stamp}`;
  const inserted = await sql`
    insert into products_core (
      event_id,
      organiser_id,
      name,
      slug,
      base_price,
      currency,
      status,
      owner_type,
      product_type,
      is_visible,
      show_during_registration,
      show_in_event_shop
    )
    values (
      ${eventCoreId},
      null,
      ${visibleAddOnName},
      ${`payment-review-addon-${stamp}`.toLowerCase().slice(0, 120)},
      380,
      'PHP',
      'active',
      'organiser',
      'event_shop_item',
      true,
      true,
      true
    )
    returning id
  `;

  return {
    password,
    runner,
    organizer,
    event,
    visibleAddOnId: String(inserted[0].id),
    ids: {
      mongoEventId: String(event._id)
    }
  };
}

async function cleanupFixtures(currentSeed) {
  if (!currentSeed) return;

  const sql = getPostgresClient();
  const eventMongoId = currentSeed.ids?.mongoEventId;

  if (eventMongoId) {
    const eventCoreRows = await sql`select id from events_core where mongo_event_id = ${eventMongoId}`;
    if (eventCoreRows.length) {
      const eventCoreId = eventCoreRows[0].id;
      const orderRows = await sql`select id from orders where event_id = ${eventCoreId}`;
      const orderIds = orderRows.map((row) => row.id);
      if (orderIds.length) {
        const paymentRows = await sql`select id from shop_payments where order_id = any(${orderIds})`;
        const paymentIds = paymentRows.map((row) => String(row.id));
        if (paymentIds.length) {
          await sql`delete from audit_critical where target_type = 'shop_payment' and target_id = any(${paymentIds})`;
        }
        await sql`delete from order_items where order_id = any(${orderIds})`;
        await sql`delete from shop_payments where order_id = any(${orderIds})`;
        await sql`delete from orders where id = any(${orderIds})`;
      }
      await sql`delete from products_core where event_id = ${eventCoreId}`;
      await sql`delete from events_core where id = ${eventCoreId}`;
    }
  }

  await sql`
    delete from app_users
    where mongo_user_id = any(${[String(currentSeed.runner._id), String(currentSeed.organizer._id)]})
  `;

  await Notification.deleteMany({ userId: currentSeed.runner._id, type: { $in: ['payment_approved', 'payment_rejected'] } });
  await Registration.deleteMany({ eventId: currentSeed.event._id, userId: currentSeed.runner._id });
  await Event.deleteOne({ _id: currentSeed.event._id });
  await User.deleteMany({
    _id: {
      $in: [currentSeed.runner._id, currentSeed.organizer._id]
    }
  });
}

async function waitForServerReady(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/healthz`);
      if (response.ok) return;
    } catch (_) {}
    await sleep(200);
  }
  throw new Error('Server did not become ready in time.');
}

async function waitForSessionReady(pathname, cookie, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.status !== 302) return true;
    await sleep(150);
  }
  return false;
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  const cookies = response.headers.getSetCookie();
  const sessionCookie = cookies.find((value) => value.startsWith('hr.sid='));
  assert.ok(sessionCookie, 'Expected session cookie from login response');
  return sessionCookie.split(';')[0];
}

async function getCsrfFromAuthedPage(pathname, cookie) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  const tokenMatch = html.match(/name="_csrf"\s+value="([^"]+)"/i);
  assert.ok(tokenMatch, `Expected CSRF token on ${pathname}`);
  return {
    csrfToken: tokenMatch[1]
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
