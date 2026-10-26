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
const EventPromotion = require('../src/models/EventPromotion');
const DailyEmailUsage = require('../src/models/DailyEmailUsage');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { createEmailUnsubscribeToken } = require('../src/utils/email-unsubscribe-token');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3196;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
let serverProc;
let fixture;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  fixture = await seedFixtures();
  await EventPromotion.syncIndexes();
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      CSRF_PROTECTION: '0',
      EVENT_PROMOTION_SEND_INTERVAL_MS: '0',
      RESEND_API_KEY: '',
      SESSION_SECRET: fixture.secret
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) serverProc.kill('SIGTERM');
  if (fixture) {
    await Promise.all([
      EventPromotion.deleteMany({ eventId: fixture.event._id }),
      Registration.deleteMany({ eventId: fixture.event._id }),
      Event.deleteOne({ _id: fixture.event._id }),
      User.deleteMany({ email: { $in: fixture.emails } }),
      fixture.dailyUsageBefore
        ? DailyEmailUsage.replaceOne({ _id: fixture.dailyUsageBefore._id }, fixture.dailyUsageBefore)
        : DailyEmailUsage.deleteOne({ dateKey: fixture.dateKey, provider: 'resend' })
    ]);
  }
  await mongoose.disconnect();
});

test('promotion pages enforce authentication and full-admin send access', async () => {
  const anonymous = await fetch(`${BASE_URL}/admin/promote`, { redirect: 'manual' });
  assert.equal(anonymous.status, 302);

  const supportCookie = await login(fixture.support.email, fixture.password);
  const supportPage = await fetch(`${BASE_URL}/admin/promote`, { headers: { Cookie: supportCookie }, redirect: 'manual' });
  assert.equal(supportPage.status, 200);
  const supportSend = await postForm('/admin/promote', supportCookie, {
    eventId: fixture.event.id,
    audience: 'all_runners'
  });
  assert.equal(supportSend.status, 403);
});

test('admin preview excludes opt-outs, reports quota cap, and prevents a duplicate send', async () => {
  const cookie = await login(fixture.admin.email, fixture.password);
  const selectedEmails = [fixture.runnerA.email, fixture.runnerB.email, fixture.optedOut.email].join(',');
  const params = new URLSearchParams({ eventId: fixture.event.id, audience: 'selected_emails', selectedEmails });
  const preview = await fetch(`${BASE_URL}/admin/promote/preview?${params}`, {
    headers: { Cookie: cookie }
  });
  assert.equal(preview.status, 200);
  assert.deepEqual(await preview.json(), {
    count: 1,
    rawCount: 2,
    invalidCount: 0,
    optedOutCount: 1,
    capped: false,
    limit: 500,
    platformRemaining: 1,
    platformCapped: true
  });

  const first = await postForm('/admin/promote', cookie, {
    eventId: fixture.event.id,
    audience: 'selected_emails',
    selectedEmails
  });
  assert.equal(first.status, 302);
  assert.match(first.headers.get('location') || '', /type=success/);
  await waitForCampaign({ adminTriggered: true });

  // Reset only the provider counter so the second request reaches the atomic
  // duplicate-key constraint instead of stopping at the advisory quota gate.
  await DailyEmailUsage.updateOne({ dateKey: fixture.dateKey, provider: 'resend' }, { $set: { sentCount: 0 } });
  const duplicate = await postForm('/admin/promote', cookie, {
    eventId: fixture.event.id,
    audience: 'selected_emails',
    selectedEmails
  });
  assert.equal(duplicate.status, 302);
  assert.match(decodeURIComponent(duplicate.headers.get('location') || '').replace(/\+/g, ' '), /already started/);
  assert.equal(await EventPromotion.countDocuments({ eventId: fixture.event._id, adminTriggered: true }), 1);
});

test('organizer preview and send remain event-owned and quota-aware', async () => {
  const cookie = await login(fixture.organizer.email, fixture.password);
  const preview = await fetch(`${BASE_URL}/organizer/promote/preview?eventId=${fixture.event.id}&audience=previous_participants`, {
    headers: { Cookie: cookie }
  });
  assert.equal(preview.status, 200);
  const data = await preview.json();
  assert.equal(data.rawCount, 1);
  assert.equal(data.count, 1);

  const send = await postForm('/organizer/promote', cookie, {
    eventId: fixture.event.id,
    audience: 'previous_participants'
  });
  assert.equal(send.status, 302);
  assert.match(send.headers.get('location') || '', /type=success/);
  const campaign = await waitForCampaign({ adminTriggered: false });
  assert.equal(campaign.selectedCount, 1);
});

test('signed unsubscribe works without a login and rejects tampering', async () => {
  const token = createEmailUnsubscribeToken({
    userId: fixture.runnerB.id,
    key: 'event.promotion'
  }, fixture.secret);
  const response = await fetch(`${BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`, { redirect: 'manual' });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /You are unsubscribed/);
  const updated = await User.findById(fixture.runnerB.id).lean();
  assert.ok(updated.notificationPreferences.emailOptOut.includes('event.promotion'));

  const invalid = await fetch(`${BASE_URL}/unsubscribe?token=${encodeURIComponent(`${token}x`)}`, { redirect: 'manual' });
  assert.equal(invalid.status, 400);
});

async function seedFixtures() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const password = 'PromoRoute1!';
  const passwordHash = await bcrypt.hash(password, 10);
  const base = { passwordHash, emailVerified: true, accountStatus: 'active' };
  const [admin, support, organizer, runnerA, runnerB, optedOut] = await User.create([
    { ...base, userId: `PRA${stamp}`.slice(0, 22), email: `promo.admin.${stamp}@example.com`, role: 'admin', adminTier: 'full', firstName: 'Promo', lastName: 'Admin' },
    { ...base, userId: `PRS${stamp}`.slice(0, 22), email: `promo.support.${stamp}@example.com`, role: 'admin', adminTier: 'support', firstName: 'Promo', lastName: 'Support' },
    { ...base, userId: `PRO${stamp}`.slice(0, 22), email: `promo.organizer.${stamp}@example.com`, role: 'organiser', organizerStatus: 'approved', firstName: 'Promo', lastName: 'Organizer' },
    { ...base, userId: `PR1${stamp}`.slice(0, 22), email: `promo.runner.a.${stamp}@example.com`, role: 'runner', firstName: 'Runner', lastName: 'A' },
    { ...base, userId: `PR2${stamp}`.slice(0, 22), email: `promo.runner.b.${stamp}@example.com`, role: 'runner', firstName: 'Runner', lastName: 'B' },
    { ...base, userId: `PR3${stamp}`.slice(0, 22), email: `promo.optout.${stamp}@example.com`, role: 'runner', firstName: 'Runner', lastName: 'Optout', notificationPreferences: { emailOptOut: ['event.promotion'] } }
  ]);

  const now = Date.now();
  const event = await Event.create({
    isTestData: true,
    organizerId: organizer._id,
    slug: `promotion-route-${stamp}`.toLowerCase(),
    referenceCode: `PR-${String(stamp).slice(-8)}`,
    title: `Promotion Route Test ${stamp}`,
    organiserName: 'Promo Organizer',
    organizerDisplayName: 'Promo Organizer',
    description: 'Promotion route integration fixture',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 86_400_000),
    registrationCloseAt: new Date(now + 86_400_000),
    eventStartAt: new Date(now + 172_800_000),
    eventEndAt: new Date(now + 259_200_000),
    proofTypesAllowed: ['gps', 'photo', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });
  await Registration.create({
    eventId: event._id,
    userId: runnerA._id,
    participant: { firstName: 'Runner', lastName: 'A', email: runnerA.email },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'paid',
    waiver: { accepted: true, version: 1, signature: 'Runner A', acceptedAt: new Date(), templateSnapshot: DEFAULT_WAIVER_TEMPLATE, renderedSnapshot: DEFAULT_WAIVER_TEMPLATE },
    confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')}`,
    registeredAt: new Date()
  });

  const dateKey = new Date().toISOString().slice(0, 10);
  const dailyUsageBefore = await DailyEmailUsage.findOne({ dateKey, provider: 'resend' }).lean();
  await DailyEmailUsage.updateOne(
    { dateKey, provider: 'resend' },
    { $set: { totalLimit: 1, sentCount: 0 } },
    { upsert: true }
  );
  return {
    admin, support, organizer, runnerA, runnerB, optedOut, event, dateKey, dailyUsageBefore, password,
    secret: `promotion-route-secret-${stamp}`,
    emails: [admin, support, organizer, runnerA, runnerB, optedOut].map((user) => user.email)
  };
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('hr.sid='));
  assert.ok(cookie);
  return cookie.split(';')[0];
}

function postForm(route, cookie, body) {
  return fetch(`${BASE_URL}${route}`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    redirect: 'manual'
  });
}

async function waitForCampaign(query, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const campaign = await EventPromotion.findOne({ eventId: fixture.event._id, ...query }).lean();
    if (campaign) return campaign;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Promotion campaign was not created in time.');
}

async function waitForServerReady(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/healthz`);
      if (response.ok) return;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Server did not become ready in time.');
}
