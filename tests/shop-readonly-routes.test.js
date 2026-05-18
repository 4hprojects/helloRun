const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3138;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

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
  seed = await seedShopReadonlyFixtures();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }

  await cleanupShopReadonlyFixtures(seed);
  await mongoose.disconnect();
  await closePostgresClient();
});

test('unauthenticated runner order route redirects to login', async () => {
  const response = await fetch(`${BASE_URL}/orders`, {
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

test('runner can read own shop orders JSON', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/orders`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.orders));
  assert.ok(body.orders.length >= 1);
  assert.equal(body.orders[0].order_number, seed.orderNumber);
});

test('public event shop route returns read-only product list JSON', async () => {
  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/shop`, {
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.event.slug, seed.event.slug);
  assert.ok(Array.isArray(body.products));
  assert.ok(body.products.some((item) => item.name === seed.productName));
});

test('owner organizer can read event shop products and payment review queue JSON', async () => {
  const cookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', cookie);

  const productsResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/products`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(productsResponse.status, 200);
  const productsBody = await productsResponse.json();
  assert.equal(productsBody.success, true);
  assert.ok(Array.isArray(productsBody.products));
  assert.ok(productsBody.products.some((item) => item.name === seed.productName));

  const reviewsResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/payment-reviews`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(reviewsResponse.status, 200);
  const reviewsBody = await reviewsResponse.json();
  assert.equal(reviewsBody.success, true);
  assert.ok(Array.isArray(reviewsBody.items));
  assert.ok(reviewsBody.items.some((item) => item.order_number === seed.orderNumber));
});

test('non-owner organizer is denied when reading another organizer event shop data', async () => {
  const cookie = await login(seed.otherOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/products`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 403);
});

async function seedShopReadonlyFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const ownerOrganizer = await User.create({
    userId: `USHOPORG${stamp}`.slice(0, 22),
    email: `shop.owner.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Owner',
    lastName: 'Organizer',
    emailVerified: true
  });

  const otherOrganizer = await User.create({
    userId: `USHOPOTR${stamp}`.slice(0, 22),
    email: `shop.other.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Other',
    lastName: 'Organizer',
    emailVerified: true
  });

  const runner = await User.create({
    userId: `USHOPRUN${stamp}`.slice(0, 22),
    email: `shop.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Runner',
    lastName: 'Shop',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
    organizerId: ownerOrganizer._id,
    slug: `shop-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `SHP-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Shop Readonly Event ${stamp}`.slice(0, 150),
    organiserName: 'Shop Organizer',
    description: 'Shop readonly route integration fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
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

  const appUsers = await sql`
    insert into app_users (mongo_user_id, email, role_snapshot, display_name)
    values
      (${String(runner._id)}, ${runner.email}, 'runner', ${`${runner.firstName} ${runner.lastName}`}),
      (${String(ownerOrganizer._id)}, ${ownerOrganizer.email}, 'organiser', ${`${ownerOrganizer.firstName} ${ownerOrganizer.lastName}`})
    on conflict (mongo_user_id)
    do update set email = excluded.email
    returning id, mongo_user_id
  `;

  const runnerBridge = appUsers.find((row) => row.mongo_user_id === String(runner._id));

  const eventCoreRows = await sql`
    insert into events_core (mongo_event_id, slug, title, status, event_type, mongo_organizer_user_id)
    values (${String(event._id)}, ${event.slug}, ${event.title}, 'published', 'virtual', ${String(ownerOrganizer._id)})
    on conflict (mongo_event_id)
    do update set title = excluded.title
    returning id, mongo_event_id
  `;
  const eventCore = eventCoreRows[0];

  const productName = `Shop Product ${stamp}`;
  await sql`
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
      ${eventCore.id},
      null,
      ${productName},
      ${`shop-product-${stamp}`.toLowerCase().slice(0, 120)},
      250,
      'PHP',
      'active',
      'organiser',
      'event_shop_item',
      true,
      false,
      true
    )
  `;

  const orderNumber = `HR-SHOP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const orders = await sql`
    insert into orders (
      order_number,
      buyer_user_id,
      event_id,
      subtotal,
      total_amount,
      payment_status,
      order_status,
      order_source,
      fulfilment_status,
      delivery_fee,
      platform_fee,
      currency
    )
    values (
      ${orderNumber},
      ${runnerBridge.id},
      ${eventCore.id},
      250,
      250,
      'unpaid',
      'pending',
      'event_shop',
      'not_started',
      0,
      0,
      'PHP'
    )
    returning id
  `;

  await sql`
    insert into shop_payments (
      order_id,
      payment_method,
      payment_reference,
      amount_paid,
      status
    )
    values (
      ${orders[0].id},
      'gcash',
      ${`REF-${stamp}`},
      250,
      'pending_review'
    )
  `;

  return {
    password,
    ownerOrganizer,
    otherOrganizer,
    runner,
    event,
    orderNumber,
    productName,
    ids: {
      mongoEventId: String(event._id),
      mongoRunnerId: String(runner._id),
      mongoOwnerOrganizerId: String(ownerOrganizer._id)
    }
  };
}

async function cleanupShopReadonlyFixtures(currentSeed) {
  if (!currentSeed) return;

  const sql = getPostgresClient();
  const eventMongoId = currentSeed.ids?.mongoEventId;
  const runnerMongoId = currentSeed.ids?.mongoRunnerId;
  const ownerMongoId = currentSeed.ids?.mongoOwnerOrganizerId;

  if (eventMongoId) {
    const eventCoreRows = await sql`select id from events_core where mongo_event_id = ${eventMongoId}`;
    if (eventCoreRows.length) {
      const eventCoreId = eventCoreRows[0].id;
      const orderRows = await sql`select id from orders where event_id = ${eventCoreId}`;
      const orderIds = orderRows.map((row) => row.id);

      if (orderIds.length) {
        await sql`delete from shop_payments where order_id = any(${orderIds})`;
      }
      await sql`delete from orders where event_id = ${eventCoreId}`;
      await sql`delete from products_core where event_id = ${eventCoreId}`;
      await sql`delete from events_core where id = ${eventCoreId}`;
    }
  }

  if (runnerMongoId || ownerMongoId) {
    const ids = [runnerMongoId, ownerMongoId].filter(Boolean);
    await sql`delete from app_users where mongo_user_id = any(${ids})`;
  }

  await Event.deleteOne({ _id: currentSeed.event._id });
  await User.deleteMany({
    _id: {
      $in: [
        currentSeed.ownerOrganizer._id,
        currentSeed.otherOrganizer._id,
        currentSeed.runner._id
      ]
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
