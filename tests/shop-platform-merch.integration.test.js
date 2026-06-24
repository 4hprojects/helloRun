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
const TEST_PORT = 3146;
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

test('admin can author a HelloRun platform product but an organizer is denied', async () => {
  const adminCookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', adminCookie);
  const csrfToken = await getCsrfFromAuthedPage('/admin/shop/products/new', adminCookie);

  const createResponse = await fetch(`${BASE_URL}/admin/shop/products`, {
    method: 'POST',
    headers: { Cookie: adminCookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({
      name: `Authored Platform Product ${seed.stamp}`,
      basePrice: 599,
      status: 'active',
      isVisible: true,
      showInEventShop: true
    }),
    redirect: 'manual'
  });
  assert.equal(createResponse.status, 201);
  const createBody = await createResponse.json();
  assert.equal(createBody.success, true);
  assert.equal(createBody.product.owner_type, 'hellorun');
  assert.equal(createBody.product.event_id, null);
  seed.authoredProductId = String(createBody.product.id);

  const editResponse = await fetch(`${BASE_URL}/admin/shop/products/${createBody.product.id}/edit`, {
    headers: { Cookie: adminCookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(editResponse.status, 200);
  const editHtml = await editResponse.text();
  assert.match(editHtml, new RegExp(`Authored Platform Product ${seed.stamp}`));

  const organizerCookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', organizerCookie);

  const deniedEditResponse = await fetch(`${BASE_URL}/admin/shop/products/${createBody.product.id}/edit`, {
    headers: { Cookie: organizerCookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(deniedEditResponse.status, 403);

  const deniedCreateResponse = await fetch(`${BASE_URL}/admin/shop/products`, {
    method: 'POST',
    headers: { Cookie: organizerCookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ name: `Should Not Be Created ${seed.stamp}`, basePrice: 100, status: 'active' }),
    redirect: 'manual'
  });
  assert.equal(deniedCreateResponse.status, 403);
});

test('standalone platform product detail route renders and returns JSON without an event', async () => {
  const htmlResponse = await fetch(`${BASE_URL}/shop/${seed.platformProduct.slug}`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(htmlResponse.status, 200);
  const html = await htmlResponse.text();
  assert.match(html, new RegExp(seed.platformProduct.name));
  assert.doesNotMatch(html, /shop-event-badge/);

  const jsonResponse = await fetch(`${BASE_URL}/shop/${seed.platformProduct.slug}`, {
    headers: { Accept: 'application/json' },
    redirect: 'manual'
  });
  assert.equal(jsonResponse.status, 200);
  const body = await jsonResponse.json();
  assert.equal(body.success, true);
  assert.equal(body.event, null);
  assert.equal(body.product.slug, seed.platformProduct.slug);
});

test('global shop catalog surfaces platform products without an event badge', async () => {
  const response = await fetch(`${BASE_URL}/shop?q=${encodeURIComponent(seed.platformProduct.name)}`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(seed.platformProduct.name));
  assert.match(html, new RegExp(`/shop/${seed.platformProduct.slug}`));
  assert.doesNotMatch(html, new RegExp(`shop-event-badge[\\s\\S]*?${seed.platformProduct.name}`));

  const jsonResponse = await fetch(`${BASE_URL}/shop?q=${encodeURIComponent(seed.platformProduct.name)}`, {
    headers: { Accept: 'application/json' },
    redirect: 'manual'
  });
  assert.equal(jsonResponse.status, 200);
  const body = await jsonResponse.json();
  assert.equal(body.success, true);
  const match = body.products.find((item) => item.slug === seed.platformProduct.slug);
  assert.ok(match, 'Expected platform product to be present in the global catalog');
  assert.equal(match.eventSlug, null);
  assert.equal(match.eventTitle, null);
});

test('runner cannot mix event-shop items and platform items in the same cart', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const eventCsrf = await getCsrfFromAuthedPage(`/events/${seed.event.slug}/shop/${seed.eventProduct.slug}`, cookie);
  const firstAdd = await fetch(`${BASE_URL}/shop/cart/add`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': eventCsrf },
    body: JSON.stringify({ productId: seed.eventProduct.id, variantId: '', quantity: 1 }),
    redirect: 'manual'
  });
  assert.equal(firstAdd.status, 200);

  const platformCsrf = await getCsrfFromAuthedPage(`/shop/${seed.platformProduct.slug}`, cookie);
  const secondAdd = await fetch(`${BASE_URL}/shop/cart/add`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': platformCsrf },
    body: JSON.stringify({ productId: seed.platformProduct.id, variantId: '', quantity: 1 }),
    redirect: 'manual'
  });
  assert.equal(secondAdd.status, 409);
  const secondAddBody = await secondAdd.json();
  assert.equal(secondAddBody.success, false);

  const cartResponse = await fetch(`${BASE_URL}/shop/cart`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });
  const cartBody = await cartResponse.json();
  assert.equal(cartBody.items.length, 1);
  assert.equal(cartBody.items[0].productId, seed.eventProduct.id);

  const itemId = cartBody.items[0].itemId;
  await fetch(`${BASE_URL}/shop/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie, 'x-csrf-token': eventCsrf },
    redirect: 'manual'
  });
});

test('runner can add a platform item to the cart and check out into an order with no owning event', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const platformCsrf = await getCsrfFromAuthedPage(`/shop/${seed.platformProduct.slug}`, cookie);
  const addResponse = await fetch(`${BASE_URL}/shop/cart/add`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': platformCsrf },
    body: JSON.stringify({ productId: seed.platformProduct.id, variantId: '', quantity: 1 }),
    redirect: 'manual'
  });
  assert.equal(addResponse.status, 200);

  const cartCheckResponse = await fetch(`${BASE_URL}/shop/cart`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });
  const cartCheckBody = await cartCheckResponse.json();
  assert.equal(cartCheckBody.items.length, 1);
  assert.equal(cartCheckBody.items[0].productId, seed.platformProduct.id);

  const checkoutCsrf = await getCsrfFromAuthedPage('/shop/checkout', cookie);
  const checkoutResponse = await fetch(`${BASE_URL}/shop/checkout`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': checkoutCsrf },
    body: JSON.stringify({ deliveryMethod: 'pickup' }),
    redirect: 'manual'
  });
  assert.equal(checkoutResponse.status, 200);
  const checkoutBody = await checkoutResponse.json();
  assert.equal(checkoutBody.success, true);
  assert.ok(checkoutBody.orderNumber);
  seed.platformOrderNumber = checkoutBody.orderNumber;

  const sql = getPostgresClient();
  const orderRows = await sql`
    select id, order_number, event_id, organiser_id, order_source, payment_status, fulfilment_status
    from orders
    where order_number = ${checkoutBody.orderNumber}
    limit 1
  `;
  assert.equal(orderRows.length, 1);
  assert.equal(orderRows[0].event_id, null);
  assert.equal(orderRows[0].organiser_id, null);
  assert.equal(orderRows[0].order_source, 'global_shop');
  seed.platformOrderId = String(orderRows[0].id);

  const detailResponse = await fetch(`${BASE_URL}/orders/${checkoutBody.orderNumber}`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });
  assert.equal(detailResponse.status, 200);
  const detailBody = await detailResponse.json();
  assert.equal(detailBody.order.order_number, checkoutBody.orderNumber);
  assert.ok(detailBody.order.items.some((item) => item.name_snapshot === seed.platformProduct.name));
});

test('admin can list platform orders, view detail, and update fulfilment status', async () => {
  assert.ok(seed.platformOrderId, 'Expected a platform order to exist from the checkout test');
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const listResponse = await fetch(`${BASE_URL}/admin/shop/platform-orders`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.equal(listBody.success, true);
  assert.ok(listBody.orders.some((order) => String(order.id) === seed.platformOrderId));

  const detailHtmlResponse = await fetch(`${BASE_URL}/admin/shop/platform-orders/${seed.platformOrderId}`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(detailHtmlResponse.status, 200);
  const detailHtml = await detailHtmlResponse.text();
  assert.match(detailHtml, new RegExp(seed.platformOrderNumber));
  assert.match(detailHtml, /id="shopPlatformFulfilmentForm"/);

  const csrfToken = await getCsrfFromAuthedPage(`/admin/shop/platform-orders/${seed.platformOrderId}`, cookie);
  const fulfilmentResponse = await fetch(`${BASE_URL}/admin/shop/platform-orders/${seed.platformOrderId}/fulfilment`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ fulfilmentStatus: 'preparing', note: 'Packing the order.' }),
    redirect: 'manual'
  });
  assert.equal(fulfilmentResponse.status, 200);
  const fulfilmentBody = await fulfilmentResponse.json();
  assert.equal(fulfilmentBody.success, true);
  assert.equal(fulfilmentBody.order.fulfilment_status, 'preparing');
});

test('admin can review and approve a platform order payment proof', async () => {
  assert.ok(seed.platformOrderId, 'Expected a platform order to exist from the checkout test');
  const sql = getPostgresClient();
  const paymentRows = await sql`
    insert into shop_payments (order_id, payment_method, payment_reference, amount_paid, status)
    values (${seed.platformOrderId}, 'gcash', ${`PLT-REF-${seed.stamp}`}, 599, 'pending_review')
    returning id
  `;
  const paymentId = String(paymentRows[0].id);
  seed.platformPaymentId = paymentId;

  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const listResponse = await fetch(`${BASE_URL}/admin/shop/platform-payment-reviews`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(listResponse.status, 200);
  const listHtml = await listResponse.text();
  assert.match(listHtml, new RegExp(seed.platformOrderNumber));
  assert.match(listHtml, /shop-payment-review-form/);

  const csrfToken = await getCsrfFromAuthedPage('/admin/shop/platform-payment-reviews', cookie);
  const approveResponse = await fetch(`${BASE_URL}/admin/shop/platform-payment-reviews/${paymentId}`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ status: 'paid', reviewNote: 'Proof matches the bank transfer.' }),
    redirect: 'manual'
  });
  assert.equal(approveResponse.status, 200);
  const approveBody = await approveResponse.json();
  assert.equal(approveBody.success, true);
  assert.equal(approveBody.payment.status, 'paid');

  const orderRows = await sql`select payment_status from orders where id = ${seed.platformOrderId} limit 1`;
  assert.equal(orderRows[0].payment_status, 'paid');
});

test('admin can reject a platform order payment proof with a reason', async () => {
  const sql = getPostgresClient();
  const paymentRows = await sql`
    insert into shop_payments (order_id, payment_method, payment_reference, amount_paid, status)
    values (${seed.platformOrderId}, 'gcash', ${`PLT-REJ-${seed.stamp}`}, 599, 'pending_review')
    returning id
  `;
  const paymentId = String(paymentRows[0].id);

  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);
  const csrfToken = await getCsrfFromAuthedPage('/admin/shop/platform-payment-reviews', cookie);

  const missingReasonResponse = await fetch(`${BASE_URL}/admin/shop/platform-payment-reviews/${paymentId}`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ status: 'rejected', rejectionReason: '' }),
    redirect: 'manual'
  });
  assert.equal(missingReasonResponse.status, 400);

  const rejectResponse = await fetch(`${BASE_URL}/admin/shop/platform-payment-reviews/${paymentId}`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ status: 'rejected', rejectionReason: 'Proof image is unreadable.' }),
    redirect: 'manual'
  });
  assert.equal(rejectResponse.status, 200);
  const rejectBody = await rejectResponse.json();
  assert.equal(rejectBody.success, true);
  assert.equal(rejectBody.payment.status, 'rejected');

  const orderRows = await sql`select payment_status from orders where id = ${seed.platformOrderId} limit 1`;
  assert.equal(orderRows[0].payment_status, 'proof_rejected');
});

async function seedFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    userId: `USPLATORG${stamp}`.slice(0, 22),
    email: `shop.platmerch.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'PlatMerch',
    lastName: 'Organizer',
    emailVerified: true
  });

  const runner = await User.create({
    userId: `USPLATRUN${stamp}`.slice(0, 22),
    email: `shop.platmerch.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'PlatMerch',
    lastName: 'Runner',
    emailVerified: true
  });

  const admin = await User.create({
    userId: `USPLATADM${stamp}`.slice(0, 22),
    email: `shop.platmerch.admin.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'PlatMerch',
    lastName: 'Admin',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
      isTestData: true,
    organizerId: organizer._id,
    slug: `shop-platmerch-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `SPM-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Shop Platform Merch Event ${stamp}`.slice(0, 150),
    organiserName: 'PlatMerch Organizer',
    description: 'Platform merch integration fixture',
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
      (${String(organizer._id)}, ${organizer.email}, 'organiser', ${`${organizer.firstName} ${organizer.lastName}`}),
      (${String(admin._id)}, ${admin.email}, 'admin', ${`${admin.firstName} ${admin.lastName}`})
    on conflict (mongo_user_id)
    do update set email = excluded.email
    returning id, mongo_user_id
  `;
  void appUsers;

  const eventCoreRows = await sql`
    insert into events_core (mongo_event_id, slug, title, status, event_type, mongo_organizer_user_id)
    values (${String(event._id)}, ${event.slug}, ${event.title}, 'published', 'virtual', ${String(organizer._id)})
    on conflict (mongo_event_id)
    do update set title = excluded.title
    returning id
  `;
  const eventCoreId = eventCoreRows[0].id;

  const eventProductName = `Platform Merch Event Product ${stamp}`;
  const eventProductSlug = `platmerch-event-product-${stamp}`.toLowerCase().slice(0, 120);
  const eventProductRows = await sql`
    insert into products_core (
      event_id, organiser_id, name, slug, base_price, currency, status,
      owner_type, product_type, is_visible, show_during_registration, show_in_event_shop
    )
    values (
      ${eventCoreId}, null, ${eventProductName}, ${eventProductSlug},
      300, 'PHP', 'active', 'organiser', 'event_shop_item', true, false, true
    )
    returning id, slug
  `;
  const eventProduct = eventProductRows[0];

  const platformProductName = `HelloRun Platform Merch ${stamp}`;
  const platformProductSlug = `hellorun-platform-merch-${stamp}`.toLowerCase().slice(0, 120);
  const platformProductRows = await sql`
    insert into products_core (
      event_id, organiser_id, name, slug, base_price, currency, status,
      owner_type, product_type, is_visible, show_during_registration, show_in_event_shop,
      requires_admin_approval, allow_pickup, allow_delivery, delivery_fee
    )
    values (
      null, null, ${platformProductName}, ${platformProductSlug},
      599, 'PHP', 'active', 'hellorun', 'event_shop_item', true, false, true,
      false, true, false, 0
    )
    returning id, slug
  `;
  const platformProduct = platformProductRows[0];

  return {
    stamp,
    password,
    organizer,
    runner,
    admin,
    event,
    eventProduct: { id: String(eventProduct.id), slug: eventProduct.slug },
    platformProduct: { id: String(platformProduct.id), slug: platformProduct.slug, name: platformProductName },
    ids: {
      mongoEventId: String(event._id),
      mongoOrganizerId: String(organizer._id),
      mongoRunnerId: String(runner._id),
      mongoAdminId: String(admin._id)
    }
  };
}

async function cleanupFixtures(currentSeed) {
  if (!currentSeed) return;

  const sql = getPostgresClient();

  if (currentSeed.platformOrderId) {
    await sql`delete from shop_payments where order_id = ${currentSeed.platformOrderId}`;
    await sql`delete from shop_fulfilment_logs where order_id = ${currentSeed.platformOrderId}`;
    await sql`delete from order_items where order_id = ${currentSeed.platformOrderId}`;
    await sql`delete from orders where id = ${currentSeed.platformOrderId}`;
  }

  const platformProductIds = [currentSeed.platformProduct?.id, currentSeed.authoredProductId].filter(Boolean);
  if (platformProductIds.length) {
    await sql`delete from product_variants where product_id = any(${platformProductIds})`;
    await sql`delete from products_core where id = any(${platformProductIds})`;
  }

  const mongoEventId = currentSeed.ids?.mongoEventId;
  if (mongoEventId) {
    const eventCoreRows = await sql`select id from events_core where mongo_event_id = ${mongoEventId}`;
    if (eventCoreRows.length) {
      const eventCoreId = eventCoreRows[0].id;
      const orderRows = await sql`select id from orders where event_id = ${eventCoreId}`;
      const orderIds = orderRows.map((row) => row.id);
      if (orderIds.length) {
        await sql`delete from shop_payments where order_id = any(${orderIds})`;
        await sql`delete from shop_fulfilment_logs where order_id = any(${orderIds})`;
        await sql`delete from order_items where order_id = any(${orderIds})`;
      }
      await sql`delete from orders where event_id = ${eventCoreId}`;
      const productRows = await sql`select id from products_core where event_id = ${eventCoreId}`;
      const productIds = productRows.map((row) => row.id);
      if (productIds.length) {
        await sql`delete from product_variants where product_id = any(${productIds})`;
      }
      await sql`delete from products_core where event_id = ${eventCoreId}`;
      await sql`delete from events_core where id = ${eventCoreId}`;
    }
  }

  const mongoIds = [
    currentSeed.ids?.mongoRunnerId,
    currentSeed.ids?.mongoOrganizerId,
    currentSeed.ids?.mongoAdminId
  ].filter(Boolean);
  if (mongoIds.length) {
    await sql`delete from app_users where mongo_user_id = any(${mongoIds})`;
  }

  await Event.deleteMany({ _id: currentSeed.event._id });
  await User.deleteMany({
    _id: { $in: [currentSeed.organizer._id, currentSeed.runner._id, currentSeed.admin._id] }
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
  return tokenMatch[1];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
