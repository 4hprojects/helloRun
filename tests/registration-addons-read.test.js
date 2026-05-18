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
const pageController = require('../src/controllers/page.controller');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3139;
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
  seed = await seedRegistrationAddonFixtures();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }

  await cleanupRegistrationAddonFixtures(seed);
  await mongoose.disconnect();
  await closePostgresClient();
});

test('registration page renders only active and visible registration add-ons', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/register`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Optional Add-ons/i);
  assert.match(html, new RegExp(seed.visibleAddOnName, 'i'));
  assert.match(html, /PHP\s+380/i);

  assert.ok(!html.includes(seed.hiddenAddOnName));
  assert.ok(!html.includes(seed.inactiveAddOnName));
  assert.ok(!html.includes(seed.nonRegistrationAddOnName));
});

test('registration submit rejects tampered add-on ids and does not create registration', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const { csrfToken } = await getCsrfFromAuthedPage(`/events/${seed.event.slug}/register`, cookie);
  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/register`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      participationMode: 'virtual',
      raceDistance: '5K',
      addOnProductIds: '00000000-0000-0000-0000-000000000000',
      waiverAccepted: 'on',
      waiverSignature: `${seed.runner.firstName} ${seed.runner.lastName}`
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const html = await response.text();
  assert.match(html, /One or more selected add-ons are no longer available\./i);

  const registration = await Registration.findOne({ eventId: seed.event._id, userId: seed.runner._id })
    .select('_id')
    .lean();
  assert.equal(registration, null);
});

test('registration submit persists selected add-ons snapshot', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const { csrfToken } = await getCsrfFromAuthedPage(`/events/${seed.event.slug}/register`, cookie);
  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/register`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      participationMode: 'virtual',
      raceDistance: '5K',
      addOnProductIds: seed.visibleAddOnId,
      waiverAccepted: 'on',
      waiverSignature: `${seed.runner.firstName} ${seed.runner.lastName}`
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /registered=1/i);

  const registration = await Registration.findOne({ eventId: seed.event._id, userId: seed.runner._id })
    .select('_id addOns addOnsSubtotal addOnsCurrency')
    .lean();

  assert.ok(registration, 'Expected created registration');
  assert.equal(Array.isArray(registration.addOns), true);
  assert.equal(registration.addOns.length, 1);
  assert.equal(registration.addOns[0].productId, seed.visibleAddOnId);
  assert.equal(registration.addOns[0].name, seed.visibleAddOnName);
  assert.equal(registration.addOns[0].unitPrice, 380);
  assert.equal(registration.addOnsSubtotal, 380);
  assert.equal(registration.addOnsCurrency, 'PHP');

  const sql = getPostgresClient();
  const orders = await sql`
    select id, order_number, order_source, payment_status, order_status, fulfilment_status, subtotal, total_amount, currency
    from orders
    where customer_note = ${`registration:${String(registration._id)}`}
    order by created_at desc
    limit 1
  `;
  assert.equal(orders.length, 1);
  assert.equal(orders[0].order_source, 'registration_checkout');
  assert.equal(orders[0].payment_status, 'unpaid');
  assert.equal(orders[0].order_status, 'pending');
  assert.equal(orders[0].fulfilment_status, 'not_started');
  assert.equal(Number(orders[0].subtotal), 380);
  assert.equal(Number(orders[0].total_amount), 380);
  assert.equal(orders[0].currency, 'PHP');

  const orderItems = await sql`
    select product_id, name_snapshot, quantity, unit_price, line_total
    from order_items
    where order_id = ${orders[0].id}
    order by id asc
  `;
  assert.equal(orderItems.length, 1);
  assert.equal(String(orderItems[0].product_id), seed.visibleAddOnId);
  assert.equal(orderItems[0].name_snapshot, seed.visibleAddOnName);
  assert.equal(Number(orderItems[0].quantity), 1);
  assert.equal(Number(orderItems[0].unit_price), 380);
  assert.equal(Number(orderItems[0].line_total), 380);

  await pageController.__testCreateRegistrationAddOnOrderIfNeeded({
    registration,
    event: seed.event,
    user: seed.runner,
    selectedAddOns: registration.addOns,
    addOnsSubtotal: registration.addOnsSubtotal,
    currency: registration.addOnsCurrency
  });

  const orderCountRows = await sql`
    select count(*)::int as count
    from orders
    where customer_note = ${`registration:${String(registration._id)}`}
      and order_source = 'registration_checkout'
  `;
  assert.equal(orderCountRows[0].count, 1);

  const paymentCsrf = await getCsrfFromAuthedPage('/my-registrations', cookie);
  const paymentForm = new FormData();
  paymentForm.append('_csrf', paymentCsrf.csrfToken);
  paymentForm.append('paymentProofFile', new Blob([PNG_1PX_BUFFER], { type: 'image/png' }), 'payment-proof.png');

  const uploadResponse = await fetch(`${BASE_URL}/my-registrations/${registration._id}/payment-proof`, {
    method: 'POST',
    headers: {
      Cookie: cookie
    },
    body: paymentForm,
    redirect: 'manual'
  });
  assert.equal(uploadResponse.status, 302);

  const shopPayments = await sql`
    select id, status, amount_paid, payment_method, proof_image_url
    from shop_payments
    where order_id = ${orders[0].id}
    order by created_at desc
    limit 1
  `;
  assert.equal(shopPayments.length, 1);
  assert.equal(shopPayments[0].status, 'pending_review');
  assert.equal(Number(shopPayments[0].amount_paid), 380);
  assert.equal(shopPayments[0].payment_method, 'manual_receipt');
  assert.match(String(shopPayments[0].proof_image_url || ''), /https?:\/\//i);
});

async function seedRegistrationAddonFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runner = await User.create({
    userId: `URADDON${stamp}`.slice(0, 22),
    email: `registration.addons.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Addon',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000011',
    country: 'PH',
    emergencyContactName: 'Emergency Addon',
    emergencyContactNumber: '09170000012'
  });

  const organizer = await User.create({
    userId: `UOADDON${stamp}`.slice(0, 22),
    email: `registration.addons.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Addons',
    lastName: 'Organizer',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
    organizerId: organizer._id,
    slug: `registration-addons-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RGA-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Registration Add-ons Event ${stamp}`.slice(0, 150),
    organiserName: 'Add-ons Organizer',
    description: 'Registration add-on rendering fixture',
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

  const visibleAddOnName = `Race Bib Frame ${stamp}`;
  const hiddenAddOnName = `Hidden Addon ${stamp}`;
  const inactiveAddOnName = `Inactive Addon ${stamp}`;
  const nonRegistrationAddOnName = `Shop Only Addon ${stamp}`;

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
    values
      (
        ${eventCoreId},
        null,
        ${visibleAddOnName},
        ${`visible-addon-${stamp}`.toLowerCase().slice(0, 120)},
        380,
        'PHP',
        'active',
        'organiser',
        'event_shop_item',
        true,
        true,
        true
      ),
      (
        ${eventCoreId},
        null,
        ${hiddenAddOnName},
        ${`hidden-addon-${stamp}`.toLowerCase().slice(0, 120)},
        120,
        'PHP',
        'active',
        'organiser',
        'event_shop_item',
        false,
        true,
        true
      ),
      (
        ${eventCoreId},
        null,
        ${inactiveAddOnName},
        ${`inactive-addon-${stamp}`.toLowerCase().slice(0, 120)},
        220,
        'PHP',
        'draft',
        'organiser',
        'event_shop_item',
        true,
        true,
        true
      ),
      (
        ${eventCoreId},
        null,
        ${nonRegistrationAddOnName},
        ${`shop-only-addon-${stamp}`.toLowerCase().slice(0, 120)},
        490,
        'PHP',
        'active',
        'organiser',
        'event_shop_item',
        true,
        false,
        true
      )
    returning id, name
  `;

  const visibleAddOn = inserted.find((row) => row.name === visibleAddOnName);

  return {
    password,
    runner,
    organizer,
    event,
    visibleAddOnName,
    visibleAddOnId: String(visibleAddOn?.id || ''),
    hiddenAddOnName,
    inactiveAddOnName,
    nonRegistrationAddOnName,
    ids: {
      mongoEventId: String(event._id)
    }
  };
}

async function cleanupRegistrationAddonFixtures(currentSeed) {
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

  await Event.deleteOne({ _id: currentSeed.event._id });
  await Registration.deleteMany({ eventId: currentSeed.event._id, userId: currentSeed.runner._id });
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
