const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3149;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedFixtures();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) serverProc.kill('SIGTERM');
  await cleanupFixtures(seed);
  await mongoose.disconnect();
  await closePostgresClient();
});

// --- Organiser Reports ---

test('organiser shop reports page returns 200', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/reports`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Reports/i);
  assert.match(html, /Payment Status Breakdown/i);
});

test('organiser shop CSV export returns 200 with text/csv content-type', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/reports/export.csv`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const ct = res.headers.get('content-type') || '';
  assert.ok(ct.includes('text/csv'), `Expected text/csv, got: ${ct}`);
  const text = await res.text();
  assert.match(text, /Order #/i);
});

test('organiser shop XLSX export returns 200 with spreadsheet content-type', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/reports/export.xlsx`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const ct = res.headers.get('content-type') || '';
  assert.ok(
    ct.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    `Expected XLSX content-type, got: ${ct}`
  );
  const buf = await res.arrayBuffer();
  assert.ok(buf.byteLength > 0, 'XLSX buffer should be non-empty');
});

// --- Admin Reports ---

test('admin shop reports page returns 200', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/shop/reports`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Shop Reports/i);
  assert.match(html, /Payment Status Breakdown/i);
});

// --- Admin Settings ---

test('admin shop settings page returns 200', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const res = await fetch(`${BASE_URL}/admin/shop/settings`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Shop Settings/i);
  assert.match(html, /payment_methods/i);
  assert.match(html, /shop_enabled/i);
});

test('admin can PATCH shop settings and gets JSON success', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);

  const csrfToken = await getCsrfToken('/admin/shop/settings', cookie);

  const res = await fetch(`${BASE_URL}/admin/shop/settings`, {
    method: 'PATCH',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      shop_enabled: '1',
      payment_methods: 'gcash, bank_transfer',
      fulfilment_defaults: ''
    }),
    redirect: 'manual'
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
});

// --- Access control ---

test('unauthenticated request to organiser reports redirects to login', async () => {
  const res = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/shop/reports`, {
    redirect: 'manual'
  });
  assert.equal(res.status, 302);
  const loc = res.headers.get('location') || '';
  assert.ok(loc.includes('/login'), `Expected redirect to login, got: ${loc}`);
});

test('unauthenticated request to admin reports redirects to login', async () => {
  const res = await fetch(`${BASE_URL}/admin/shop/reports`, {
    redirect: 'manual'
  });
  assert.equal(res.status, 302);
});

// --- Helpers ---

async function seedFixtures() {
  const sql = getPostgresClient();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234!';
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    userId: `USRPTORG${stamp}`.slice(0, 22),
    email: `reports.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Reports',
    lastName: 'Organizer',
    emailVerified: true
  });

  const admin = await User.create({
    userId: `USRPTADM${stamp}`.slice(0, 22),
    email: `reports.admin.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Reports',
    lastName: 'Admin',
    emailVerified: true
  });

  const runner = await User.create({
    userId: `USRPTRUN${stamp}`.slice(0, 22),
    email: `reports.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Reports',
    lastName: 'Runner',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
    organizerId: organizer._id,
    slug: `reports-event-${stamp}`.slice(0, 80),
    referenceCode: `RPT${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Reports Event ${stamp}`.slice(0, 150),
    organiserName: 'Reports Organizer',
    description: 'Reports integration fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
    startDate: new Date(now - 10 * 24 * 60 * 60 * 1000),
    endDate: new Date(now + 30 * 24 * 60 * 60 * 1000),
    cutoffDate: new Date(now + 30 * 24 * 60 * 60 * 1000),
    waiverTemplate: 'I agree',
    packages: [{ name: '5K Run', price: 500, currency: 'PHP', distanceKm: 5 }]
  });

  // Sync event to Postgres
  const organizerRows = await sql`
    select id from organisers where mongo_user_id = ${String(organizer._id)} limit 1
  `;
  const organizerPgId = organizerRows[0]?.id || null;

  const eventCoreRows = await sql`
    insert into events_core (
      mongo_event_id, slug, title, status, organiser_id, start_date, end_date
    )
    values (
      ${String(event._id)},
      ${event.slug},
      ${event.title},
      'published',
      ${organizerPgId},
      ${new Date(now - 10 * 24 * 60 * 60 * 1000)},
      ${new Date(now + 30 * 24 * 60 * 60 * 1000)}
    )
    returning id
  `;
  const eventCoreId = eventCoreRows[0].id;

  // Seed runner in Postgres
  const runnerAppUserRows = await sql`
    select id from app_users where mongo_user_id = ${String(runner._id)} limit 1
  `;
  const runnerAppUserId = runnerAppUserRows[0]?.id || null;

  // Seed a sample order (no items needed for report stats)
  if (runnerAppUserId) {
    const orderNumber = `HR-RPT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await sql`
      insert into orders (
        order_number, buyer_user_id, event_id,
        subtotal, total_amount, currency,
        payment_status, fulfilment_status, order_status
      )
      values (
        ${orderNumber}, ${runnerAppUserId}, ${eventCoreId},
        500, 500, 'PHP',
        'paid', 'pending', 'active'
      )
    `;
  }

  return { organizer, admin, runner, event, eventCoreId, password, stamp };
}

async function cleanupFixtures(s) {
  if (!s) return;
  const sql = getPostgresClient();

  try {
    await sql`delete from orders where event_id = ${s.eventCoreId}`;
    await sql`delete from events_core where id = ${s.eventCoreId}`;
  } catch (_) {}

  await User.deleteOne({ _id: s.organizer._id });
  await User.deleteOne({ _id: s.admin._id });
  await User.deleteOne({ _id: s.runner._id });
  await Event.deleteOne({ _id: s.event._id });
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(res.status, 302);
  const cookies = res.headers.getSetCookie();
  const sessionCookie = cookies.find((c) => c.startsWith('hr.sid='));
  assert.ok(sessionCookie, 'Expected session cookie');
  return sessionCookie.split(';')[0];
}

async function getCsrfToken(pathname, cookie) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual'
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  const match = html.match(/name="_csrf"\s+value="([^"]*)"/i);
  assert.ok(match, `Expected CSRF token on ${pathname}`);
  return match[1];
}

async function waitForServerReady(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/healthz`);
      if (res.ok) return;
    } catch (_) {}
    await sleep(200);
  }
  throw new Error('Server did not become ready in time.');
}

async function waitForSessionReady(pathname, cookie, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (res.status !== 302) return true;
    await sleep(150);
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
