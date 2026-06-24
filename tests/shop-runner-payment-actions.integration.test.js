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
const TEST_PORT = 3141;
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

test('runner can view the payment page and submit payment proof for an unpaid order', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const pageResponse = await fetch(`${BASE_URL}/orders/${seed.unpaidOrder.orderNumber}/payment`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(pageResponse.status, 200);
  const html = await pageResponse.text();
  assert.match(html, /id="shopPaymentProofForm"/);
  assert.match(html, /Upload Payment Proof/);

  const csrfMatch = html.match(/name="_csrf"\s+value="([^"]*)"/i);
  assert.ok(csrfMatch, 'Expected CSRF token on payment page');
  const csrfToken = csrfMatch[1];

  const form = new FormData();
  form.append('_csrf', csrfToken);
  form.append('paymentMethod', 'gcash');
  form.append('paymentReference', `REF-${seed.stamp}`);
  form.append('paymentProofFile', new Blob([PNG_1PX_BUFFER], { type: 'image/png' }), 'proof.png');

  const submitResponse = await fetch(`${BASE_URL}/orders/${seed.unpaidOrder.orderNumber}/payment-proof`, {
    method: 'POST',
    headers: { Cookie: cookie, 'x-csrf-token': csrfToken },
    body: form,
    redirect: 'manual'
  });
  assert.equal(submitResponse.status, 200);
  const submitBody = await submitResponse.json();
  assert.equal(submitBody.success, true);

  const sql = getPostgresClient();
  const orderRows = await sql`select payment_status from orders where id = ${seed.unpaidOrder.id}`;
  assert.equal(orderRows[0].payment_status, 'proof_submitted');

  const paymentRows = await sql`
    select status, payment_method, payment_reference, proof_image_url
    from shop_payments
    where order_id = ${seed.unpaidOrder.id}
    order by created_at desc
    limit 1
  `;
  assert.equal(paymentRows[0].status, 'pending_review');
  assert.equal(paymentRows[0].payment_method, 'gcash');
  assert.equal(paymentRows[0].payment_reference, `REF-${seed.stamp}`);
  assert.ok(paymentRows[0].proof_image_url);
});

test('runner cannot submit payment proof for an already-paid order', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const pageResponse = await fetch(`${BASE_URL}/orders/${seed.paidOrder.orderNumber}/payment`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(pageResponse.status, 200);
  const html = await pageResponse.text();
  assert.doesNotMatch(html, /id="shopPaymentProofForm"/);
  assert.match(html, /already marked as paid/i);

  const csrf = await getCsrfFromAuthedPage(`/orders/${seed.unpaidOrder.orderNumber}/payment`, cookie);
  const csrfToken = csrf.csrfToken;

  const form = new FormData();
  form.append('_csrf', csrfToken);
  form.append('paymentProofFile', new Blob([PNG_1PX_BUFFER], { type: 'image/png' }), 'proof.png');

  const submitResponse = await fetch(`${BASE_URL}/orders/${seed.paidOrder.orderNumber}/payment-proof`, {
    method: 'POST',
    headers: { Cookie: cookie, 'x-csrf-token': csrfToken },
    body: form,
    redirect: 'manual'
  });
  assert.equal(submitResponse.status, 409);
  const body = await submitResponse.json();
  assert.equal(body.success, false);
});

test('runner can cancel an order that has not started fulfilment', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const csrf = await getCsrfFromAuthedPage(`/orders/${seed.unpaidOrder.orderNumber}/payment`, cookie);

  const cancelResponse = await fetch(`${BASE_URL}/orders/${seed.unpaidOrder.orderNumber}/cancel`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrf.csrfToken },
    body: JSON.stringify({}),
    redirect: 'manual'
  });
  assert.equal(cancelResponse.status, 200);
  const body = await cancelResponse.json();
  assert.equal(body.success, true);
  assert.equal(body.order.fulfilment_status, 'cancelled');

  const sql = getPostgresClient();
  const logs = await sql`
    select new_status, note
    from shop_fulfilment_logs
    where order_id = ${seed.unpaidOrder.id}
    order by created_at desc
    limit 1
  `;
  assert.equal(logs[0].new_status, 'cancelled');
});

test('runner cannot cancel an order that is already being fulfilled', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const csrf = await getCsrfFromAuthedPage(`/orders/${seed.shippedOrder.orderNumber}/payment`, cookie);

  const cancelResponse = await fetch(`${BASE_URL}/orders/${seed.shippedOrder.orderNumber}/cancel`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrf.csrfToken },
    body: JSON.stringify({}),
    redirect: 'manual'
  });
  assert.equal(cancelResponse.status, 409);
  const body = await cancelResponse.json();
  assert.equal(body.success, false);
});

async function seedFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    userId: `USPAYORG${stamp}`.slice(0, 22),
    email: `shop.payact.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'PayAct',
    lastName: 'Organizer',
    emailVerified: true
  });

  const runner = await User.create({
    userId: `USPAYRUN${stamp}`.slice(0, 22),
    email: `shop.payact.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'PayAct',
    lastName: 'Runner',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
      isTestData: true,
    organizerId: organizer._id,
    slug: `shop-payact-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `SPA-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Shop Payment Action Event ${stamp}`.slice(0, 150),
    organiserName: 'PayAct Organizer',
    description: 'Runner payment-proof and cancellation action fixture',
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

  const eventCoreRows = await sql`
    insert into events_core (mongo_event_id, slug, title, status, event_type, mongo_organizer_user_id)
    values (${String(event._id)}, ${event.slug}, ${event.title}, 'published', 'virtual', ${String(organizer._id)})
    on conflict (mongo_event_id)
    do update set title = excluded.title
    returning id
  `;
  const eventCoreId = eventCoreRows[0].id;

  const appUsers = await sql`
    insert into app_users (mongo_user_id, email, role_snapshot, display_name)
    values
      (${String(runner._id)}, ${runner.email}, 'runner', ${`${runner.firstName} ${runner.lastName}`}),
      (${String(organizer._id)}, ${organizer.email}, 'organiser', ${`${organizer.firstName} ${organizer.lastName}`})
    on conflict (mongo_user_id)
    do update set email = excluded.email
    returning id, mongo_user_id
  `;
  const runnerBridge = appUsers.find((row) => row.mongo_user_id === String(runner._id));

  const productName = `Payment Action Tee ${stamp}`;
  const productRows = await sql`
    insert into products_core (
      event_id, organiser_id, name, slug, base_price, currency, status,
      owner_type, product_type, is_visible, show_during_registration, show_in_event_shop
    )
    values (
      ${eventCoreId}, null, ${productName},
      ${`payment-action-tee-${stamp}`.toLowerCase().slice(0, 120)},
      300, 'PHP', 'active', 'organiser', 'event_shop_item', true, false, true
    )
    returning id
  `;
  const productId = productRows[0].id;

  async function createOrder({ paymentStatus, fulfilmentStatus, orderStatus, suffix }) {
    const orderNumber = `HR-PAYACT-${String(stamp).replace(/\W/g, '').slice(-10)}-${suffix}`;
    const rows = await sql`
      insert into orders (
        order_number, buyer_user_id, event_id, subtotal, total_amount,
        payment_status, order_status, order_source, fulfilment_status,
        delivery_fee, platform_fee, currency
      )
      values (
        ${orderNumber}, ${runnerBridge.id}, ${eventCoreId}, 300, 300,
        ${paymentStatus}, ${orderStatus}, 'event_shop', ${fulfilmentStatus},
        0, 0, 'PHP'
      )
      returning id
    `;
    const orderId = rows[0].id;

    await sql`
      insert into order_items (
        order_id, product_id, variant_id, name_snapshot, variant_snapshot,
        quantity, unit_price, line_total
      )
      values (${orderId}, ${productId}, null, ${productName}, '{}'::jsonb, 1, 300, 300)
    `;

    return { id: orderId, orderNumber };
  }

  const unpaidOrder = await createOrder({
    paymentStatus: 'unpaid',
    fulfilmentStatus: 'not_started',
    orderStatus: 'pending',
    suffix: 'UNPAID'
  });
  const paidOrder = await createOrder({
    paymentStatus: 'paid',
    fulfilmentStatus: 'not_started',
    orderStatus: 'processing',
    suffix: 'PAID'
  });
  const shippedOrder = await createOrder({
    paymentStatus: 'unpaid',
    fulfilmentStatus: 'shipped',
    orderStatus: 'shipped',
    suffix: 'SHIPPED'
  });

  return {
    stamp,
    password,
    organizer,
    runner,
    event,
    productId: String(productId),
    unpaidOrder,
    paidOrder,
    shippedOrder,
    orderIds: [unpaidOrder.id, paidOrder.id, shippedOrder.id],
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
        await sql`delete from shop_fulfilment_logs where order_id = any(${orderIds})`;
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
  await User.deleteMany({
    _id: { $in: [currentSeed.runner._id, currentSeed.organizer._id] }
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  const tokenMatch = html.match(/name="_csrf"\s+value="([^"]*)"/i);
  assert.ok(tokenMatch, `Expected CSRF token on ${pathname}`);
  return { csrfToken: tokenMatch[1] };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
