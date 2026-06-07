const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const AdSetting = require('../src/models/AdSetting');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3124;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT)
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedFixture();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

test('admin ad settings page enforces access and updates manual placement settings', async () => {
  const unauthenticated = await fetch(`${BASE_URL}/admin/ads`, {
    redirect: 'manual'
  });
  assert.equal(unauthenticated.status, 302);
  assert.equal(unauthenticated.headers.get('location'), '/login');

  const cookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', cookie);
  const pageResponse = await fetch(`${BASE_URL}/admin/ads`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(pageResponse.status, 200);
  const html = await pageResponse.text();
  assert.match(html, /Ad Settings/i);
  assert.match(html, /Manual AdSense placements/i);
  assert.match(html, /ca-pub-4537208011192461/i);

  const csrfMatch = html.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(csrfMatch);

  const updateResponse = await fetch(`${BASE_URL}/admin/ads`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrfMatch[1],
      enabled: 'on',
      scriptEnabled: 'on',
      publisherId: 'ca-pub-4537208011192461',
      group_home_enabled: 'on',
      placement_home_after_features_enabled: 'on',
      slot_home_after_features: '1234567890',
      group_blogPost_enabled: 'on',
      placement_blogPost_in_article_enabled: 'on',
      slot_blogPost_in_article: '9876543210'
    }),
    redirect: 'manual'
  });
  assert.equal(updateResponse.status, 302);

  const setting = await AdSetting.findOne({ key: 'ads.global' }).lean();
  assert.ok(setting);
  assert.equal(setting.enabled, true);
  assert.equal(setting.scriptEnabled, true);
  assert.equal(setting.pageGroups.home.enabled, true);
  assert.equal(setting.pageGroups.home.placements.after_features.enabled, true);
  assert.equal(setting.pageGroups.home.placements.after_features.slotId, '1234567890');
  assert.equal(setting.pageGroups.blogPost.placements.in_article.slotId, '9876543210');
  assert.equal(setting.pageGroups.events.enabled, false);

  const homeResponse = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
  assert.equal(homeResponse.status, 200);
  const homeHtml = await homeResponse.text();
  assert.match(homeHtml, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-4537208011192461/i);
  assert.match(homeHtml, /data-ad-group="home" data-ad-placement="after_features"/i);
  assert.match(homeHtml, /data-ad-slot="1234567890"/i);

  const loginResponse = await fetch(`${BASE_URL}/login`, { redirect: 'manual' });
  assert.equal(loginResponse.status, 200);
  assert.doesNotMatch(await loginResponse.text(), /adsbygoogle/i);

  const adminResponse = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(adminResponse.status, 200);
  assert.doesNotMatch(await adminResponse.text(), /adsbygoogle/i);
});

async function seedFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await User.create({
    userId: `UADSA${stamp}`.slice(0, 22),
    email: `admin.ads.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Ads',
    emailVerified: true
  });

  return {
    stamp,
    password,
    admin: {
      id: String(admin._id),
      email: admin.email
    }
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  await Promise.all([
    AdSetting.deleteMany({}),
    User.deleteMany({ _id: currentSeed.admin.id })
  ]);
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  return setCookie.split(';')[0];
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch (error) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}
