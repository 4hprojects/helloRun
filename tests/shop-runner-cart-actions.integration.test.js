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
const TEST_PORT = 3142;
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

test('cart starts empty for a fresh runner session', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const response = await fetch(`${BASE_URL}/shop/cart`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.items, []);
  assert.equal(body.summary.itemCount, 0);
});

test('runner must select a variant before adding a variant-bearing product to cart', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const csrfToken = await getCsrfFromAuthedPage(`/events/${seed.eventA.slug}/shop/${seed.productA.slug}`, cookie);

  const response = await fetch(`${BASE_URL}/shop/cart/add`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ productId: seed.productA.id, variantId: '', quantity: 1 }),
    redirect: 'manual'
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.match(body.message, /select a variant/i);
});

test('runner cannot add an out-of-stock variant to the cart', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const csrfToken = await getCsrfFromAuthedPage(`/events/${seed.eventA.slug}/shop/${seed.productA.slug}`, cookie);

  const response = await fetch(`${BASE_URL}/shop/cart/add`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ productId: seed.productA.id, variantId: seed.outOfStockVariantId, quantity: 1 }),
    redirect: 'manual'
  });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.match(body.message, /out of stock/i);
});

test('runner can add an in-stock variant to the cart, view it, update its quantity, then remove it', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const csrfToken = await getCsrfFromAuthedPage(`/events/${seed.eventA.slug}/shop/${seed.productA.slug}`, cookie);

  const addResponse = await fetch(`${BASE_URL}/shop/cart/add`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ productId: seed.productA.id, variantId: seed.inStockVariantId, quantity: 2 }),
    redirect: 'manual'
  });
  assert.equal(addResponse.status, 200);
  const addBody = await addResponse.json();
  assert.equal(addBody.success, true);

  const cartResponse = await fetch(`${BASE_URL}/shop/cart`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });
  assert.equal(cartResponse.status, 200);
  const cartBody = await cartResponse.json();
  assert.equal(cartBody.items.length, 1);
  assert.equal(cartBody.items[0].productId, seed.productA.id);
  assert.equal(cartBody.items[0].variantId, seed.inStockVariantId);
  assert.equal(cartBody.items[0].quantity, 2);
  assert.equal(cartBody.summary.itemCount, 2);
  assert.equal(cartBody.summary.subtotal, cartBody.items[0].lineTotal);

  const itemId = cartBody.items[0].itemId;

  const updateResponse = await fetch(`${BASE_URL}/shop/cart/items/${itemId}`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ quantity: 4 }),
    redirect: 'manual'
  });
  assert.equal(updateResponse.status, 200);
  const updateBody = await updateResponse.json();
  assert.equal(updateBody.success, true);

  const afterUpdateResponse = await fetch(`${BASE_URL}/shop/cart`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });
  const afterUpdateBody = await afterUpdateResponse.json();
  assert.equal(afterUpdateBody.items[0].quantity, 4);

  const removeResponse = await fetch(`${BASE_URL}/shop/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie, 'x-csrf-token': csrfToken },
    redirect: 'manual'
  });
  assert.equal(removeResponse.status, 200);
  const removeBody = await removeResponse.json();
  assert.equal(removeBody.success, true);

  const afterRemoveResponse = await fetch(`${BASE_URL}/shop/cart`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });
  const afterRemoveBody = await afterRemoveResponse.json();
  assert.deepEqual(afterRemoveBody.items, []);
  assert.equal(afterRemoveBody.summary.itemCount, 0);
});

test('runner cannot add items from a different event while the cart already holds items from another event', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const csrfTokenA = await getCsrfFromAuthedPage(`/events/${seed.eventA.slug}/shop/${seed.productA.slug}`, cookie);

  const firstAdd = await fetch(`${BASE_URL}/shop/cart/add`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfTokenA },
    body: JSON.stringify({ productId: seed.productA.id, variantId: seed.inStockVariantId, quantity: 1 }),
    redirect: 'manual'
  });
  assert.equal(firstAdd.status, 200);

  const csrfTokenB = await getCsrfFromAuthedPage(`/events/${seed.eventB.slug}/shop/${seed.productB.slug}`, cookie);
  const secondAdd = await fetch(`${BASE_URL}/shop/cart/add`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfTokenB },
    body: JSON.stringify({ productId: seed.productB.id, variantId: '', quantity: 1 }),
    redirect: 'manual'
  });
  assert.equal(secondAdd.status, 409);
  const secondAddBody = await secondAdd.json();
  assert.equal(secondAddBody.success, false);
  assert.match(secondAddBody.message, /different event/i);

  const cartResponse = await fetch(`${BASE_URL}/shop/cart`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });
  const cartBody = await cartResponse.json();
  assert.equal(cartBody.items.length, 1);
  assert.equal(cartBody.items[0].productId, seed.productA.id);

  const itemId = cartBody.items[0].itemId;
  await fetch(`${BASE_URL}/shop/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie, 'x-csrf-token': csrfTokenA },
    redirect: 'manual'
  });
});

async function seedFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    userId: `USCARTORG${stamp}`.slice(0, 22),
    email: `shop.cartact.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'CartAct',
    lastName: 'Organizer',
    emailVerified: true
  });

  const runner = await User.create({
    userId: `USCARTRUN${stamp}`.slice(0, 22),
    email: `shop.cartact.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'CartAct',
    lastName: 'Runner',
    emailVerified: true
  });

  const now = Date.now();

  async function createEvent(suffix) {
    return Event.create({
      isTestData: true,
      organizerId: organizer._id,
      slug: `shop-cartact-${suffix}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
      referenceCode: `SCA${suffix}-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
      title: `Shop Cart Action Event ${suffix} ${stamp}`.slice(0, 150),
      organiserName: 'CartAct Organizer',
      description: 'Runner cart action fixture',
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
  }

  const eventA = await createEvent('a');
  const eventB = await createEvent('b');

  const sql = getPostgresClient();

  async function bridgeEvent(mongoEvent) {
    const rows = await sql`
      insert into events_core (mongo_event_id, slug, title, status, event_type, mongo_organizer_user_id)
      values (${String(mongoEvent._id)}, ${mongoEvent.slug}, ${mongoEvent.title}, 'published', 'virtual', ${String(organizer._id)})
      on conflict (mongo_event_id)
      do update set title = excluded.title
      returning id
    `;
    return rows[0].id;
  }

  const eventCoreIdA = await bridgeEvent(eventA);
  const eventCoreIdB = await bridgeEvent(eventB);

  await sql`
    insert into app_users (mongo_user_id, email, role_snapshot, display_name)
    values
      (${String(runner._id)}, ${runner.email}, 'runner', ${`${runner.firstName} ${runner.lastName}`}),
      (${String(organizer._id)}, ${organizer.email}, 'organiser', ${`${organizer.firstName} ${organizer.lastName}`})
    on conflict (mongo_user_id)
    do update set email = excluded.email
  `;

  async function createProduct(eventCoreId, suffix, basePrice) {
    const slug = `cart-action-${suffix}-${stamp}`.toLowerCase().slice(0, 120);
    const rows = await sql`
      insert into products_core (
        event_id, organiser_id, name, slug, base_price, currency, status,
        owner_type, product_type, is_visible, show_during_registration, show_in_event_shop
      )
      values (
        ${eventCoreId}, null, ${`Cart Action Product ${suffix} ${stamp}`}, ${slug},
        ${basePrice}, 'PHP', 'active', 'organiser', 'event_shop_item', true, false, true
      )
      returning id, slug
    `;
    return rows[0];
  }

  const productA = await createProduct(eventCoreIdA, 'a', 400);
  const productB = await createProduct(eventCoreIdB, 'b', 150);

  async function createVariant(productId, suffix, { stock, reserved, sold }) {
    const rows = await sql`
      insert into product_variants (
        product_id, variant_name, sku, size, colour,
        stock_quantity, reserved_quantity, sold_quantity, is_active
      )
      values (
        ${productId}, ${`Variant ${suffix}`}, ${`SKU-CART-${suffix}-${String(stamp).replace(/\W/g, '').slice(-8)}`},
        'M', 'Black', ${stock}, ${reserved}, ${sold}, true
      )
      returning id
    `;
    return rows[0].id;
  }

  const inStockVariantId = await createVariant(productA.id, 'instock', { stock: 10, reserved: 1, sold: 1 });
  const outOfStockVariantId = await createVariant(productA.id, 'oos', { stock: 2, reserved: 2, sold: 0 });

  return {
    stamp,
    password,
    organizer,
    runner,
    eventA,
    eventB,
    productA: { id: String(productA.id), slug: productA.slug },
    productB: { id: String(productB.id), slug: productB.slug },
    inStockVariantId: String(inStockVariantId),
    outOfStockVariantId: String(outOfStockVariantId),
    ids: {
      mongoEventIdA: String(eventA._id),
      mongoEventIdB: String(eventB._id)
    }
  };
}

async function cleanupFixtures(currentSeed) {
  if (!currentSeed) return;

  const sql = getPostgresClient();
  const mongoEventIds = [currentSeed.ids?.mongoEventIdA, currentSeed.ids?.mongoEventIdB].filter(Boolean);

  for (const mongoEventId of mongoEventIds) {
    const eventCoreRows = await sql`select id from events_core where mongo_event_id = ${mongoEventId}`;
    if (eventCoreRows.length) {
      const eventCoreId = eventCoreRows[0].id;
      const productRows = await sql`select id from products_core where event_id = ${eventCoreId}`;
      const productIds = productRows.map((row) => row.id);
      if (productIds.length) {
        await sql`delete from product_variants where product_id = any(${productIds})`;
      }
      await sql`delete from products_core where event_id = ${eventCoreId}`;
      await sql`delete from events_core where id = ${eventCoreId}`;
    }
  }

  await sql`
    delete from app_users
    where mongo_user_id = any(${[String(currentSeed.runner._id), String(currentSeed.organizer._id)]})
  `;

  await Event.deleteMany({ _id: { $in: [currentSeed.eventA._id, currentSeed.eventB._id] } });
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
  return tokenMatch[1];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
