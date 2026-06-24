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

test('runner can read own shop order detail JSON', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/orders/${seed.orderNumber}`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.order.order_number, seed.orderNumber);
  assert.ok(Array.isArray(body.order.items));
  assert.ok(body.order.items.some((item) => item.name_snapshot === seed.productName));
});

test('runner can view shop order detail HTML page', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/orders/${seed.orderNumber}`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(seed.orderNumber));
  assert.match(html, new RegExp(seed.productName));
  assert.match(html, /Order Status/i);
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

test('public event shop route renders product listing HTML for browser requests', async () => {
  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/shop`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(seed.productName));
  assert.match(html, /Event Shop/i);
  assert.match(html, new RegExp(`/events/${seed.event.slug}/shop/${seed.productSlug}`));
  assert.doesNotMatch(html, /Add to Cart/i);
  assert.doesNotMatch(html, /Checkout Now/i);
});

test('public product detail renders for browser requests with a sign-in prompt to add to cart', async () => {
  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/shop/${seed.productSlug}`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(seed.productName));
  assert.match(html, /Medium \/ Blue/i);
  assert.match(html, /Log in.*as a runner to add this product to your cart/is);
  assert.doesNotMatch(html, /id="shopAddToCartForm"/);
});

test('public product detail returns JSON for API-style requests', async () => {
  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/shop/${seed.productSlug}`, {
    headers: { Accept: 'application/json' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.event.slug, seed.event.slug);
  assert.equal(body.product.slug, seed.productSlug);
  assert.ok(body.variants.some((item) => item.name === 'Medium / Blue'));
});

test('public event shop renders empty state when no visible products exist', async () => {
  const response = await fetch(`${BASE_URL}/events/${seed.emptyEvent.slug}/shop`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /No shop items yet/i);
  assert.doesNotMatch(html, /Add to Cart/i);
});

test('global shop catalog renders product listing HTML with event badges for browser requests', async () => {
  const response = await fetch(`${BASE_URL}/shop`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /HelloRun Shop/i);
  assert.match(html, new RegExp(seed.productName));
  assert.match(html, new RegExp(`/events/${seed.event.slug}/shop/${seed.productSlug}`));
  assert.match(html, new RegExp(`shop-event-badge[\\s\\S]*?${seed.event.title}`));
  assert.doesNotMatch(html, /Add to Cart/i);
});

test('global shop catalog returns read-only product list JSON across events', async () => {
  const response = await fetch(`${BASE_URL}/shop`, {
    headers: { Accept: 'application/json' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.products));
  assert.ok(body.products.some((item) => item.name === seed.productName && item.eventSlug === seed.event.slug));
  assert.ok(body.pagination);
  assert.equal(body.pagination.currentPage, 1);
});

test('global shop catalog search filters products by name', async () => {
  const matching = await fetch(`${BASE_URL}/shop?q=${encodeURIComponent(seed.productName)}`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(matching.status, 200);
  const matchingHtml = await matching.text();
  assert.match(matchingHtml, new RegExp(seed.productName));
  assert.match(matchingHtml, /products? found/i);

  const nonMatching = await fetch(`${BASE_URL}/shop?q=${encodeURIComponent(`no-such-product-${Date.now()}`)}`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(nonMatching.status, 200);
  const nonMatchingHtml = await nonMatching.text();
  assert.match(nonMatchingHtml, /No matching products/i);
  assert.match(nonMatchingHtml, /Clear filters/i);
});

test('global shop catalog event filter narrows results to a single event', async () => {
  const response = await fetch(`${BASE_URL}/shop?event=${encodeURIComponent(seed.event.slug)}`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(seed.productName));
  assert.match(html, new RegExp(`Browsing: ${seed.event.title}`));

  const emptyEventResponse = await fetch(`${BASE_URL}/shop?event=${encodeURIComponent(seed.emptyEvent.slug)}`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(emptyEventResponse.status, 200);
  const emptyEventHtml = await emptyEventResponse.text();
  assert.match(emptyEventHtml, /No matching products/i);
  assert.match(emptyEventHtml, new RegExp(`Browsing: ${seed.emptyEvent.title}`));
});

test('public event detail links to shop only when visible products exist', async () => {
  const withShop = await fetch(`${BASE_URL}/events/${seed.event.slug}`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(withShop.status, 200);
  const withShopHtml = await withShop.text();
  assert.match(withShopHtml, new RegExp(`/events/${seed.event.slug}/shop`));

  const withoutShop = await fetch(`${BASE_URL}/events/${seed.emptyEvent.slug}`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(withoutShop.status, 200);
  const withoutShopHtml = await withoutShop.text();
  assert.doesNotMatch(withoutShopHtml, new RegExp(`/events/${seed.emptyEvent.slug}/shop`));
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

test('owner organizer can read product variants after product ownership check', async () => {
  const cookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/products/${seed.productId}/variants`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(body.variants.some((item) => item.variant_name === 'Medium / Blue'));
});

test('owner organizer can create and update products and variants', async () => {
  const cookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', cookie);
  const csrfToken = await getCsrfToken(`/organizer/events/${seed.event._id}/shop`, cookie);

  const productResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/products`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      name: `Managed Product ${Date.now()}`,
      basePrice: 375,
      status: 'draft'
    }),
    redirect: 'manual'
  });
  assert.equal(productResponse.status, 201);
  const productBody = await productResponse.json();
  assert.equal(productBody.success, true);
  assert.equal(productBody.product.status, 'draft');

  const updateResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/products/${productBody.product.id}`, {
    method: 'PATCH',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      name: productBody.product.name,
      slug: productBody.product.slug,
      basePrice: 425,
      status: 'active',
      isVisible: true,
      showInEventShop: true
    }),
    redirect: 'manual'
  });
  assert.equal(updateResponse.status, 200);
  const updateBody = await updateResponse.json();
  assert.equal(updateBody.success, true);
  assert.equal(Number(updateBody.product.base_price), 425);

  const variantResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/products/${productBody.product.id}/variants`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      variantName: 'Large / Green',
      sku: `SKU-${Date.now()}`,
      stockQuantity: 12
    }),
    redirect: 'manual'
  });
  assert.equal(variantResponse.status, 201);
  const variantBody = await variantResponse.json();
  assert.equal(variantBody.success, true);
  assert.equal(variantBody.variant.variant_name, 'Large / Green');
});

test('owner organizer can update order fulfilment', async () => {
  const cookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', cookie);
  const csrfToken = await getCsrfToken(`/organizer/events/${seed.event._id}/shop`, cookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/orders/${seed.orderId}/fulfilment`, {
    method: 'PATCH',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      fulfilmentStatus: 'preparing',
      note: 'Preparing for pickup'
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.order.fulfilment_status, 'preparing');

  const sql = getPostgresClient();
  const logs = await sql`
    select new_status, note
    from shop_fulfilment_logs
    where order_id::text = ${seed.orderId}
    order by created_at desc
    limit 1
  `;
  assert.equal(logs[0].new_status, 'preparing');
});

test('owner organizer can view shop manager HTML pages', async () => {
  const cookie = await login(seed.ownerOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', cookie);

  const dashboardResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(dashboardResponse.status, 200);
  const dashboardHtml = await dashboardResponse.text();
  assert.match(dashboardHtml, /Shop Manager/i);
  assert.match(dashboardHtml, new RegExp(seed.productName));
  assert.match(dashboardHtml, new RegExp(seed.orderNumber));

  const newProductResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/products/new`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(newProductResponse.status, 200);
  const newProductHtml = await newProductResponse.text();
  assert.match(newProductHtml, /New Product/i);
  assert.match(newProductHtml, /id="shopProductForm"/);

  const editProductResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/products/${seed.productId}/edit`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(editProductResponse.status, 200);
  const editProductHtml = await editProductResponse.text();
  assert.match(editProductHtml, /Edit Product/i);
  assert.match(editProductHtml, new RegExp(seed.productName));

  const orderDetailResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/orders/${seed.orderId}`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(orderDetailResponse.status, 200);
  const orderDetailHtml = await orderDetailResponse.text();
  assert.match(orderDetailHtml, new RegExp(seed.orderNumber));
  assert.match(orderDetailHtml, new RegExp(seed.productName));
  assert.match(orderDetailHtml, /id="shopFulfilmentForm"/);
});

test('admin can list and approve shop products', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);
  const csrfToken = await getCsrfToken('/admin/shop', cookie);

  const approvalsResponse = await fetch(`${BASE_URL}/admin/shop/product-approvals`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(approvalsResponse.status, 200);
  const approvalsBody = await approvalsResponse.json();
  assert.equal(approvalsBody.success, true);
  assert.ok(approvalsBody.products.some((product) => String(product.id) === seed.productId));

  const approveResponse = await fetch(`${BASE_URL}/admin/shop/product-approvals/${seed.productId}`, {
    method: 'PATCH',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({ status: 'approved' }),
    redirect: 'manual'
  });
  assert.equal(approveResponse.status, 200);
  const approveBody = await approveResponse.json();
  assert.equal(approveBody.success, true);
  assert.equal(approveBody.product.requires_admin_approval, false);
  assert.equal(approveBody.product.status, 'active');
});

test('admin can view shop dashboard HTML page', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/admin/shop`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Admin Shop/i);
  assert.match(html, /Pending Product Approvals/i);
  assert.match(html, /Recent Orders/i);
  assert.match(html, /Recent Payments/i);
});

test('non-owner organizer cannot read product variants for another organizer event', async () => {
  const cookie = await login(seed.otherOrganizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/products/${seed.productId}/variants`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 403);
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

  const admin = await User.create({
    userId: `USHOPADM${stamp}`.slice(0, 22),
    email: `shop.admin.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Shop',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
      isTestData: true,
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

  const emptyEvent = await Event.create({
      isTestData: true,
    organizerId: ownerOrganizer._id,
    slug: `shop-empty-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `SHE-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Shop Empty Event ${stamp}`.slice(0, 150),
    organiserName: 'Shop Organizer',
    description: 'Shop readonly empty state fixture',
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
      (${String(ownerOrganizer._id)}, ${ownerOrganizer.email}, 'organiser', ${`${ownerOrganizer.firstName} ${ownerOrganizer.lastName}`}),
      (${String(admin._id)}, ${admin.email}, 'admin', ${`${admin.firstName} ${admin.lastName}`})
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

  const emptyEventCoreRows = await sql`
    insert into events_core (mongo_event_id, slug, title, status, event_type, mongo_organizer_user_id)
    values (${String(emptyEvent._id)}, ${emptyEvent.slug}, ${emptyEvent.title}, 'published', 'virtual', ${String(ownerOrganizer._id)})
    on conflict (mongo_event_id)
    do update set title = excluded.title
    returning id, mongo_event_id
  `;
  const emptyEventCore = emptyEventCoreRows[0];

  const productName = `Shop Product ${stamp}`;
  const productSlug = `shop-product-${stamp}`.toLowerCase().slice(0, 120);
  const productRows = await sql`
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
      ${productSlug},
      250,
      'PHP',
      'active',
      'organiser',
      'event_shop_item',
      true,
      false,
      true
    )
    returning id, slug
  `;
  const product = productRows[0];

  await sql`
    insert into product_variants (
      product_id,
      variant_name,
      sku,
      size,
      colour,
      stock_quantity,
      reserved_quantity,
      sold_quantity,
      is_active
    )
    values (
      ${product.id},
      'Medium / Blue',
      ${`SKU-${String(stamp).replace(/\W/g, '').slice(-10)}`},
      'M',
      'Blue',
      10,
      1,
      2,
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
    insert into order_items (
      order_id,
      product_id,
      variant_id,
      name_snapshot,
      variant_snapshot,
      quantity,
      unit_price,
      line_total
    )
    values (
      ${orders[0].id},
      ${product.id},
      null,
      ${productName},
      '{}'::jsonb,
      1,
      250,
      250
    )
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
    admin,
    runner,
    event,
    emptyEvent,
    orderNumber,
    orderId: String(orders[0].id),
    productName,
    productId: String(product.id),
    productSlug: product.slug,
    ids: {
      mongoEventId: String(event._id),
      emptyMongoEventId: String(emptyEvent._id),
      mongoRunnerId: String(runner._id),
      mongoOwnerOrganizerId: String(ownerOrganizer._id),
      mongoAdminId: String(admin._id)
    }
  };
}

async function cleanupShopReadonlyFixtures(currentSeed) {
  if (!currentSeed) return;

  const sql = getPostgresClient();
  const eventMongoId = currentSeed.ids?.mongoEventId;
  const emptyEventMongoId = currentSeed.ids?.emptyMongoEventId;
  const runnerMongoId = currentSeed.ids?.mongoRunnerId;
  const ownerMongoId = currentSeed.ids?.mongoOwnerOrganizerId;
  const adminMongoId = currentSeed.ids?.mongoAdminId;

  if (eventMongoId || emptyEventMongoId) {
    const mongoEventIds = [eventMongoId, emptyEventMongoId].filter(Boolean);
    const eventCoreRows = await sql`select id from events_core where mongo_event_id = any(${mongoEventIds})`;
    if (eventCoreRows.length) {
      const eventCoreIds = eventCoreRows.map((row) => row.id);
      const orderRows = await sql`select id from orders where event_id = any(${eventCoreIds})`;
      const orderIds = orderRows.map((row) => row.id);

      if (orderIds.length) {
        await sql`delete from shop_payments where order_id = any(${orderIds})`;
        await sql`delete from shop_fulfilment_logs where order_id = any(${orderIds})`;
        await sql`delete from order_items where order_id = any(${orderIds})`;
      }
      await sql`delete from orders where event_id = any(${eventCoreIds})`;
      const productRows = await sql`select id from products_core where event_id = any(${eventCoreIds})`;
      const productIds = productRows.map((row) => row.id);
      if (productIds.length) {
        await sql`delete from product_variants where product_id = any(${productIds})`;
      }
      await sql`delete from products_core where event_id = any(${eventCoreIds})`;
      await sql`delete from events_core where id = any(${eventCoreIds})`;
    }
  }

  if (runnerMongoId || ownerMongoId || adminMongoId) {
    const ids = [runnerMongoId, ownerMongoId, adminMongoId].filter(Boolean);
    await sql`delete from app_users where mongo_user_id = any(${ids})`;
  }

  await Event.deleteMany({ _id: { $in: [currentSeed.event._id, currentSeed.emptyEvent._id] } });
  await User.deleteMany({
    _id: {
      $in: [
        currentSeed.ownerOrganizer._id,
        currentSeed.otherOrganizer._id,
        currentSeed.admin._id,
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

async function getCsrfToken(pathname, cookie) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: {
      Cookie: cookie,
      Accept: 'text/html'
    },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  const match = html.match(/name="_csrf"\s+value="([^"]*)"/i);
  assert.ok(match, `Expected CSRF token on ${pathname}`);
  return match[1];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
