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

test('virtual registration does not ask for emergency contact when runner profile has none', async () => {
  const cookie = await login(seed.noEmergencyRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const { csrfToken, html } = await getCsrfFromAuthedPage(`/events/${seed.event.slug}/register`, cookie);

  assert.ok(!html.includes('Emergency Contact Name *'));
  assert.ok(!html.includes('Emergency Contact Number *'));

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
      waiverAccepted: 'on',
      waiverSignature: `${seed.noEmergencyRunner.firstName} ${seed.noEmergencyRunner.lastName}`
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /registered=1/i);

  const registration = await Registration.findOne({ eventId: seed.event._id, userId: seed.noEmergencyRunner._id })
    .select('participant participationMode')
    .lean();
  assert.ok(registration, 'Expected virtual registration without emergency contact');
  assert.equal(registration.participationMode, 'virtual');
  assert.equal(registration.participant.emergencyContactName, '');
  assert.equal(registration.participant.emergencyContactNumber, '');
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
    .select('_id raceDistance addOns addOnsSubtotal addOnsCurrency paymentAmountDue paymentCurrency pricingSnapshot')
    .lean();

  assert.ok(registration, 'Expected created registration');
  assert.equal(Array.isArray(registration.addOns), true);
  assert.equal(registration.addOns.length, 1);
  assert.equal(registration.addOns[0].productId, seed.visibleAddOnId);
  assert.equal(registration.addOns[0].name, seed.visibleAddOnName);
  assert.equal(registration.addOns[0].unitPrice, 380);
  assert.equal(registration.addOnsSubtotal, 380);
  assert.equal(registration.addOnsCurrency, 'PHP');
  assert.equal(registration.paymentAmountDue, 380);
  assert.equal(registration.paymentCurrency, 'PHP');

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
  assert.equal(Number(orders[0].subtotal), 760);
  assert.equal(Number(orders[0].total_amount), 760);
  assert.equal(orders[0].currency, 'PHP');

  const orderItems = await sql`
    select product_id, name_snapshot, quantity, unit_price, line_total
    from order_items
    where order_id = ${orders[0].id}
    order by id asc
  `;
  assert.equal(orderItems.length, 2);
  const feeItem = orderItems.find((item) => item.product_id === null);
  const addOnItem = orderItems.find((item) => String(item.product_id) === seed.visibleAddOnId);
  assert.ok(feeItem, 'Expected registration fee order item');
  assert.ok(addOnItem, 'Expected add-on order item');
  assert.equal(feeItem.name_snapshot, '5K');
  assert.equal(Number(feeItem.quantity), 1);
  assert.equal(Number(feeItem.unit_price), 380);
  assert.equal(Number(feeItem.line_total), 380);
  assert.equal(addOnItem.name_snapshot, seed.visibleAddOnName);
  assert.equal(Number(addOnItem.quantity), 1);
  assert.equal(Number(addOnItem.unit_price), 380);
  assert.equal(Number(addOnItem.line_total), 380);

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
  assert.equal(Number(shopPayments[0].amount_paid), 760);
  assert.equal(shopPayments[0].payment_method, 'manual_receipt');
  assert.match(String(shopPayments[0].proof_image_url || ''), /https?:\/\//i);
});

test('registration submit persists distance-based price snapshot', async () => {
  const cookie = await login(seed.distanceRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const { csrfToken, html } = await getCsrfFromAuthedPage(`/events/${seed.distanceEvent.slug}/register`, cookie);
  assert.match(html, /Race Distance/i);
  assert.match(html, /10K/i);

  const response = await fetch(`${BASE_URL}/events/${seed.distanceEvent.slug}/register`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      participationMode: 'virtual',
      raceDistance: '10K',
      waiverAccepted: 'on',
      waiverSignature: `${seed.distanceRunner.firstName} ${seed.distanceRunner.lastName}`
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /registered=1/i);

  const registration = await Registration.findOne({ eventId: seed.distanceEvent._id, userId: seed.distanceRunner._id })
    .select('raceDistance pricingSnapshot paymentAmountDue paymentCurrency paymentStatus')
    .lean();

  assert.ok(registration, 'Expected created registration');
  assert.equal(registration.raceDistance, '10K');
  assert.equal(registration.paymentStatus, 'unpaid');
  assert.equal(registration.paymentAmountDue, 750);
  assert.equal(registration.paymentCurrency, 'PHP');
  assert.equal(registration.pricingSnapshot.pricingMode, 'distance_based');
  assert.equal(registration.pricingSnapshot.source, 'distance_based');
  assert.equal(registration.pricingSnapshot.raceDistance, '10K');
  assert.equal(registration.pricingSnapshot.amount, 750);
});

test('registration submit persists active distance-period price snapshot', async () => {
  const cookie = await login(seed.periodRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const { csrfToken, html } = await getCsrfFromAuthedPage(`/events/${seed.distancePeriodEvent.slug}/register`, cookie);
  assert.match(html, /raceDistancePricingPreviewData/i);
  assert.match(html, /Early Bird/i);

  const response = await fetch(`${BASE_URL}/events/${seed.distancePeriodEvent.slug}/register`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      participationMode: 'virtual',
      raceDistance: '5K',
      waiverAccepted: 'on',
      waiverSignature: `${seed.periodRunner.firstName} ${seed.periodRunner.lastName}`
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /registered=1/i);

  const registration = await Registration.findOne({ eventId: seed.distancePeriodEvent._id, userId: seed.periodRunner._id })
    .select('pricingSnapshot paymentAmountDue paymentCurrency paymentStatus')
    .lean();

  assert.ok(registration, 'Expected created registration');
  assert.equal(registration.paymentStatus, 'unpaid');
  assert.equal(registration.paymentAmountDue, 400);
  assert.equal(registration.paymentCurrency, 'PHP');
  assert.equal(registration.pricingSnapshot.pricingMode, 'distance_based_period');
  assert.equal(registration.pricingSnapshot.source, 'distance_based');
  assert.equal(registration.pricingSnapshot.raceDistance, '5K');
  assert.equal(registration.pricingSnapshot.pricingPeriodCode, 'early_bird');
  assert.equal(registration.pricingSnapshot.pricingPeriodLabel, 'Early Bird');
  assert.equal(registration.pricingSnapshot.amount, 400);

  const myRegistrationsResponse = await fetch(`${BASE_URL}/my-registrations`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(myRegistrationsResponse.status, 200);
  const myRegistrationsHtml = await myRegistrationsResponse.text();
  assert.match(myRegistrationsHtml, /Registration fee:<\/strong>\s*PHP 400\.00/i);
  assert.match(myRegistrationsHtml, /Pricing period:<\/strong>\s*Early Bird/i);
});

test('registration submit persists customized paid signup option snapshot', async () => {
  const cookie = await login(seed.customRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const { csrfToken, html } = await getCsrfFromAuthedPage(`/events/${seed.customEvent.slug}/register`, cookie);
  assert.match(html, /Signup Option/i);
  assert.match(html, /5K - Medal \+ Shirt \+ Race Kit/i);
  assert.match(html, /PHP\s+850\.00/i);

  const selectedOptionId = String(seed.customEvent.customizedOptions[0]._id);
  const response = await fetch(`${BASE_URL}/events/${seed.customEvent.slug}/register`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      participationMode: 'virtual',
      raceDistance: '5K',
      customizedOptionId: selectedOptionId,
      waiverAccepted: 'on',
      waiverSignature: `${seed.customRunner.firstName} ${seed.customRunner.lastName}`
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /registered=1/i);

  const registration = await Registration.findOne({ eventId: seed.customEvent._id, userId: seed.customRunner._id })
    .select('pricingSnapshot paymentAmountDue paymentCurrency paymentStatus')
    .lean();

  assert.ok(registration, 'Expected created registration');
  assert.equal(registration.paymentStatus, 'unpaid');
  assert.equal(registration.paymentAmountDue, 850);
  assert.equal(registration.paymentCurrency, 'PHP');
  assert.equal(registration.pricingSnapshot.pricingMode, 'customized_options');
  assert.equal(registration.pricingSnapshot.source, 'customized_option');
  assert.equal(registration.pricingSnapshot.selectedOptionId, selectedOptionId);
  assert.equal(registration.pricingSnapshot.optionDescription, '5K - Medal + Shirt + Race Kit');
  assert.equal(registration.pricingSnapshot.amount, 850);

  const sql = getPostgresClient();
  const orders = await sql`
    select id, subtotal, total_amount, currency
    from orders
    where customer_note = ${`registration:${String(registration._id)}`}
    order by created_at desc
    limit 1
  `;
  assert.equal(orders.length, 1);
  assert.equal(Number(orders[0].subtotal), 850);
  assert.equal(Number(orders[0].total_amount), 850);
  assert.equal(orders[0].currency, 'PHP');

  const orderItems = await sql`
    select product_id, name_snapshot, quantity, unit_price, line_total
    from order_items
    where order_id = ${orders[0].id}
    order by id asc
  `;
  assert.equal(orderItems.length, 1);
  assert.equal(orderItems[0].product_id, null);
  assert.equal(orderItems[0].name_snapshot, '5K - Medal + Shirt + Race Kit');
  assert.equal(Number(orderItems[0].quantity), 1);
  assert.equal(Number(orderItems[0].unit_price), 850);
  assert.equal(Number(orderItems[0].line_total), 850);
});

test('registration submit persists package-period selection snapshot', async () => {
  const cookie = await login(seed.packageRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const { csrfToken, html } = await getCsrfFromAuthedPage(`/events/${seed.packageEvent.slug}/register`, cookie);
  assert.match(html, /Registration Package/i);
  assert.match(html, /Medal \+ Shirt/i);

  const response = await fetch(`${BASE_URL}/events/${seed.packageEvent.slug}/register`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      participationMode: 'virtual',
      raceDistance: '5K',
      registrationPackageId: 'pkg-medal-shirt',
      waiverAccepted: 'on',
      waiverSignature: `${seed.packageRunner.firstName} ${seed.packageRunner.lastName}`
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /registered=1/i);

  const registration = await Registration.findOne({ eventId: seed.packageEvent._id, userId: seed.packageRunner._id })
    .select('pricingSnapshot paymentAmountDue paymentCurrency paymentStatus')
    .lean();

  assert.ok(registration, 'Expected created registration');
  assert.equal(registration.paymentStatus, 'unpaid');
  assert.equal(registration.paymentAmountDue, 899);
  assert.equal(registration.paymentCurrency, 'PHP');
  assert.equal(registration.pricingSnapshot.pricingMode, 'package_period');
  assert.equal(registration.pricingSnapshot.source, 'registration_package');
  assert.equal(registration.pricingSnapshot.packageId, 'pkg-medal-shirt');
  assert.equal(registration.pricingSnapshot.packageName, 'Medal + Shirt');
  assert.deepEqual(registration.pricingSnapshot.packageIncludedItems, ['Medal', 'Shirt']);
  assert.equal(registration.pricingSnapshot.pricingPeriodCode, 'early_bird');
  assert.equal(registration.pricingSnapshot.pricingPeriodLabel, 'Early Bird');
  assert.equal(registration.pricingSnapshot.amount, 899);

  const sql = getPostgresClient();
  const orders = await sql`
    select id, subtotal, total_amount, currency
    from orders
    where customer_note = ${`registration:${String(registration._id)}`}
    order by created_at desc
    limit 1
  `;
  assert.equal(orders.length, 1);
  assert.equal(Number(orders[0].subtotal), 899);
  assert.equal(Number(orders[0].total_amount), 899);
  assert.equal(orders[0].currency, 'PHP');

  const orderItems = await sql`
    select name_snapshot, variant_snapshot, quantity, unit_price, line_total
    from order_items
    where order_id = ${orders[0].id}
    order by id asc
  `;
  assert.equal(orderItems.length, 1);
  assert.equal(orderItems[0].name_snapshot, 'Medal + Shirt');
  assert.equal(orderItems[0].variant_snapshot.packageId, 'pkg-medal-shirt');
  assert.equal(orderItems[0].variant_snapshot.packageName, 'Medal + Shirt');
  assert.equal(Number(orderItems[0].quantity), 1);
  assert.equal(Number(orderItems[0].unit_price), 899);
  assert.equal(Number(orderItems[0].line_total), 899);

  const myRegistrationsResponse = await fetch(`${BASE_URL}/my-registrations`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(myRegistrationsResponse.status, 200);
  const myRegistrationsHtml = await myRegistrationsResponse.text();
  assert.match(myRegistrationsHtml, /Registration package:<\/strong>\s*Medal \+ Shirt/i);
  assert.match(myRegistrationsHtml, /Pricing period:<\/strong>\s*Early Bird/i);

  const organizerCookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', organizerCookie);
  const registrantsResponse = await fetch(`${BASE_URL}/organizer/events/${seed.packageEvent._id}/registrants`, {
    headers: { Cookie: organizerCookie },
    redirect: 'manual'
  });
  assert.equal(registrantsResponse.status, 200);
  const registrantsHtml = await registrantsResponse.text();
  assert.match(registrantsHtml, /Medal \+ Shirt/i);
  assert.match(registrantsHtml, /Early Bird/i);

  const csvResponse = await fetch(`${BASE_URL}/organizer/events/${seed.packageEvent._id}/registrants/export`, {
    headers: { Cookie: organizerCookie },
    redirect: 'manual'
  });
  assert.equal(csvResponse.status, 200);
  const csv = await csvResponse.text();
  assert.match(csv, /Registration Package/);
  assert.match(csv, /Medal \+ Shirt/);
});

test('registration submit rejects inactive package-period pricing', async () => {
  const cookie = await login(seed.inactivePackageRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);

  const { csrfToken, html } = await getCsrfFromAuthedPage(`/events/${seed.inactivePackageEvent.slug}/register`, cookie);
  assert.match(html, /Registration Package/i);
  assert.match(html, /Inactive Medal Pack/i);

  const response = await fetch(`${BASE_URL}/events/${seed.inactivePackageEvent.slug}/register`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfToken,
      participationMode: 'virtual',
      raceDistance: '5K',
      registrationPackageId: 'pkg-inactive-medal',
      waiverAccepted: 'on',
      waiverSignature: `${seed.inactivePackageRunner.firstName} ${seed.inactivePackageRunner.lastName}`
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const errorHtml = await response.text();
  assert.match(errorHtml, /No registration package is currently open for pricing dates/i);

  const registration = await Registration.findOne({ eventId: seed.inactivePackageEvent._id, userId: seed.inactivePackageRunner._id })
    .select('_id')
    .lean();
  assert.equal(registration, null);
});

test('registrant export includes structured race category snapshot columns', async () => {
  const organizerCookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', organizerCookie);

  const csvResponse = await fetch(`${BASE_URL}/organizer/events/${seed.categoryEvent._id}/registrants/export`, {
    headers: { Cookie: organizerCookie },
    redirect: 'manual'
  });
  assert.equal(csvResponse.status, 200);
  const csv = await csvResponse.text();

  assert.match(csv, /Race Category ID/);
  assert.match(csv, /Race Category Name/);
  assert.match(csv, /Race Category Type/);
  assert.match(csv, /cat-open-10k/);
  assert.match(csv, /10K Open/);
  assert.match(csv, /distance/);
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

  const noEmergencyRunner = await User.create({
    userId: `URNEMG${stamp}`.slice(0, 22),
    email: `registration.noemergency.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Virtual',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000081',
    country: 'PH'
  });

  const customRunner = await User.create({
    userId: `URCUST${stamp}`.slice(0, 22),
    email: `registration.custom.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Custom',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000021',
    country: 'PH',
    emergencyContactName: 'Emergency Custom',
    emergencyContactNumber: '09170000022'
  });

  const packageRunner = await User.create({
    userId: `URPKG${stamp}`.slice(0, 22),
    email: `registration.package.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Package',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000031',
    country: 'PH',
    emergencyContactName: 'Emergency Package',
    emergencyContactNumber: '09170000032'
  });

  const distanceRunner = await User.create({
    userId: `URDIST${stamp}`.slice(0, 22),
    email: `registration.distance.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Distance',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000051',
    country: 'PH',
    emergencyContactName: 'Emergency Distance',
    emergencyContactNumber: '09170000052'
  });

  const periodRunner = await User.create({
    userId: `URPER${stamp}`.slice(0, 22),
    email: `registration.period.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Period',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000061',
    country: 'PH',
    emergencyContactName: 'Emergency Period',
    emergencyContactNumber: '09170000062'
  });

  const inactivePackageRunner = await User.create({
    userId: `URINPKG${stamp}`.slice(0, 22),
    email: `registration.inactive.package.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Inactive',
    lastName: 'Package',
    emailVerified: true,
    mobile: '09170000071',
    country: 'PH',
    emergencyContactName: 'Emergency Inactive',
    emergencyContactNumber: '09170000072'
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

  const customEvent = await Event.create({
    organizerId: organizer._id,
    slug: `registration-custom-option-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RGC-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Registration Custom Option Event ${stamp}`.slice(0, 150),
    organiserName: 'Add-ons Organizer',
    description: 'Registration customized option fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    pricingMode: 'customized_options',
    feeCurrency: 'PHP',
    paymentAccountName: 'HelloRun Payments',
    paymentQrImageUrl: 'https://example.com/payment-qr.png',
    raceDistances: ['5K'],
    customizedOptions: [
      { shortDescription: '5K - Medal + Shirt + Race Kit', amount: 850 },
      { shortDescription: '10K - Medal + Shirt + Race Kit', amount: 1050 }
    ],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['running_app_sync'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const packageEvent = await Event.create({
    organizerId: organizer._id,
    slug: `registration-package-period-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RGP-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Registration Package Event ${stamp}`.slice(0, 150),
    organiserName: 'Add-ons Organizer',
    description: 'Registration package period fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    pricingMode: 'package_period',
    feeCurrency: 'PHP',
    paymentAccountName: 'HelloRun Payments',
    paymentQrImageUrl: 'https://example.com/payment-qr.png',
    raceDistances: ['5K'],
    registrationPackages: [
      {
        packageId: 'pkg-medal-shirt',
        name: 'Medal + Shirt',
        includedItems: { medal: true, shirt: true },
        pricingPeriods: [
          {
            label: 'Early Bird',
            code: 'early_bird',
            startAt: new Date(now - 24 * 60 * 60 * 1000),
            endAt: new Date(now + 24 * 60 * 60 * 1000),
            amount: 899
          },
          {
            label: 'Regular',
            code: 'regular',
            startAt: new Date(now + 24 * 60 * 60 * 1000),
            endAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
            amount: 999
          }
        ]
      }
    ],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['running_app_sync'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const distanceEvent = await Event.create({
    organizerId: organizer._id,
    slug: `registration-distance-price-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RGD-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Registration Distance Price Event ${stamp}`.slice(0, 150),
    organiserName: 'Add-ons Organizer',
    description: 'Registration distance-based pricing fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    pricingMode: 'distance_based',
    feeCurrency: 'PHP',
    paymentAccountName: 'HelloRun Payments',
    paymentQrImageUrl: 'https://example.com/payment-qr.png',
    raceDistances: ['5K', '10K'],
    distancePricing: [
      { distance: '5K', amount: 500 },
      { distance: '10K', amount: 750 }
    ],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['running_app_sync'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const distancePeriodEvent = await Event.create({
    organizerId: organizer._id,
    slug: `registration-distance-period-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RGE-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Registration Distance Period Event ${stamp}`.slice(0, 150),
    organiserName: 'Add-ons Organizer',
    description: 'Registration distance period pricing fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    pricingMode: 'distance_based_period',
    feeCurrency: 'PHP',
    paymentAccountName: 'HelloRun Payments',
    paymentQrImageUrl: 'https://example.com/payment-qr.png',
    raceDistances: ['5K'],
    pricingPeriods: [
      {
        label: 'Early Bird',
        code: 'early_bird',
        startAt: new Date(now - 24 * 60 * 60 * 1000),
        endAt: new Date(now + 24 * 60 * 60 * 1000)
      },
      {
        label: 'Regular',
        code: 'regular',
        startAt: new Date(now + 24 * 60 * 60 * 1000),
        endAt: new Date(now + 3 * 24 * 60 * 60 * 1000)
      }
    ],
    distancePricing: [
      { distance: '5K', earlyBirdAmount: 400, regularAmount: 500 }
    ],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['running_app_sync'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const inactivePackageEvent = await Event.create({
    organizerId: organizer._id,
    slug: `registration-inactive-package-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RGI-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Registration Inactive Package Event ${stamp}`.slice(0, 150),
    organiserName: 'Add-ons Organizer',
    description: 'Registration inactive package pricing fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    pricingMode: 'package_period',
    feeCurrency: 'PHP',
    paymentAccountName: 'HelloRun Payments',
    paymentQrImageUrl: 'https://example.com/payment-qr.png',
    raceDistances: ['5K'],
    registrationPackages: [
      {
        packageId: 'pkg-inactive-medal',
        name: 'Inactive Medal Pack',
        includedItems: { medal: true },
        pricingPeriods: [
          {
            label: 'Expired Early Bird',
            code: 'early_bird',
            startAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
            endAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
            amount: 499
          }
        ]
      }
    ],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['running_app_sync'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const categoryEvent = await Event.create({
    organizerId: organizer._id,
    slug: `registration-category-export-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `RGX-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Registration Category Export Event ${stamp}`.slice(0, 150),
    organiserName: 'Add-ons Organizer',
    description: 'Registration category export fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    pricingMode: 'distance_based',
    feeCurrency: 'PHP',
    paymentAccountName: 'HelloRun Payments',
    paymentQrImageUrl: 'https://example.com/payment-qr.png',
    raceDistances: ['10K'],
    raceCategories: [
      {
        categoryId: 'cat-open-10k',
        name: '10K Open',
        type: 'distance',
        distanceLabel: '10K'
      }
    ],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['running_app_sync'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  await Registration.create({
    eventId: categoryEvent._id,
    userId: runner._id,
    confirmationCode: `HR-C${String(stamp).replace(/\D/g, '').slice(-5).padStart(5, '0')}`,
    participant: {
      firstName: 'Category',
      lastName: 'Runner',
      email: `registration.category.runner.${stamp}@example.com`,
      mobile: '09170000041',
      country: 'PH',
      emergencyContactName: 'Emergency Category',
      emergencyContactNumber: '09170000042'
    },
    participationMode: 'virtual',
    raceDistance: '10K',
    pricingSnapshot: {
      pricingMode: 'distance_based',
      source: 'distance',
      raceCategoryId: 'cat-open-10k',
      raceCategoryName: '10K Open',
      raceCategoryType: 'distance',
      raceDistance: '10K',
      amount: 750,
      currency: 'PHP'
    },
    paymentAmountDue: 750,
    paymentCurrency: 'PHP',
    status: 'pending_payment',
    paymentStatus: 'unpaid',
    waiver: {
      accepted: true,
      version: 1,
      signature: 'Category Runner',
      acceptedAt: new Date(now),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    registeredAt: new Date(now)
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
    noEmergencyRunner,
    customRunner,
    packageRunner,
    distanceRunner,
    periodRunner,
    inactivePackageRunner,
    organizer,
    event,
    customEvent,
    packageEvent,
    distanceEvent,
    distancePeriodEvent,
    inactivePackageEvent,
    categoryEvent,
    visibleAddOnName,
    visibleAddOnId: String(visibleAddOn?.id || ''),
    hiddenAddOnName,
    inactiveAddOnName,
    nonRegistrationAddOnName,
    ids: {
      mongoEventId: String(event._id),
      customMongoEventId: String(customEvent._id),
      packageMongoEventId: String(packageEvent._id),
      distanceMongoEventId: String(distanceEvent._id),
      distancePeriodMongoEventId: String(distancePeriodEvent._id),
      inactivePackageMongoEventId: String(inactivePackageEvent._id),
      categoryMongoEventId: String(categoryEvent._id)
    }
  };
}

async function cleanupRegistrationAddonFixtures(currentSeed) {
  if (!currentSeed) return;

  const sql = getPostgresClient();
  const eventMongoIds = [
    currentSeed.ids?.mongoEventId,
    currentSeed.ids?.customMongoEventId,
    currentSeed.ids?.packageMongoEventId,
    currentSeed.ids?.distanceMongoEventId,
    currentSeed.ids?.distancePeriodMongoEventId,
    currentSeed.ids?.inactivePackageMongoEventId,
    currentSeed.ids?.categoryMongoEventId
  ].filter(Boolean);

  for (const eventMongoId of eventMongoIds) {
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
    where mongo_user_id = any(${[
      String(currentSeed.runner._id),
      String(currentSeed.noEmergencyRunner._id),
      String(currentSeed.customRunner._id),
      String(currentSeed.packageRunner._id),
      String(currentSeed.distanceRunner._id),
      String(currentSeed.periodRunner._id),
      String(currentSeed.inactivePackageRunner._id),
      String(currentSeed.organizer._id)
    ]})
  `;

  await Event.deleteOne({ _id: currentSeed.event._id });
  await Event.deleteOne({ _id: currentSeed.customEvent._id });
  await Event.deleteOne({ _id: currentSeed.packageEvent._id });
  await Event.deleteOne({ _id: currentSeed.distanceEvent._id });
  await Event.deleteOne({ _id: currentSeed.distancePeriodEvent._id });
  await Event.deleteOne({ _id: currentSeed.inactivePackageEvent._id });
  await Event.deleteOne({ _id: currentSeed.categoryEvent._id });
  await Registration.deleteMany({ eventId: currentSeed.event._id, userId: currentSeed.runner._id });
  await Registration.deleteMany({ eventId: currentSeed.event._id, userId: currentSeed.noEmergencyRunner._id });
  await Registration.deleteMany({ eventId: currentSeed.customEvent._id, userId: currentSeed.customRunner._id });
  await Registration.deleteMany({ eventId: currentSeed.packageEvent._id, userId: currentSeed.packageRunner._id });
  await Registration.deleteMany({ eventId: currentSeed.distanceEvent._id, userId: currentSeed.distanceRunner._id });
  await Registration.deleteMany({ eventId: currentSeed.distancePeriodEvent._id, userId: currentSeed.periodRunner._id });
  await Registration.deleteMany({ eventId: currentSeed.inactivePackageEvent._id, userId: currentSeed.inactivePackageRunner._id });
  await Registration.deleteMany({ eventId: currentSeed.categoryEvent._id, userId: currentSeed.runner._id });
  await User.deleteMany({
    _id: {
      $in: [
        currentSeed.runner._id,
        currentSeed.noEmergencyRunner._id,
        currentSeed.customRunner._id,
        currentSeed.packageRunner._id,
        currentSeed.distanceRunner._id,
        currentSeed.periodRunner._id,
        currentSeed.inactivePackageRunner._id,
        currentSeed.organizer._id
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
    csrfToken: tokenMatch[1],
    html
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
