'use strict';

// End-to-end: boots the real app (src/server.js) against a disposable LOCAL MongoDB with
// every external service blanked (no Postgres, Redis, R2, email, Turnstile, Strava, Google),
// logs in as a runner, a support-tier admin and a full admin, and exercises the OCR Training
// Center over HTTP: access control, CSRF, every page, a profile change and a real Test OCR
// run on a synthetic image. Skips unless OCR_TEST_MONGODB_URI is local.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const { startTestServer } = require('./helpers/test-server');

const TEST_URI = String(process.env.OCR_TEST_MONGODB_URI || '');
const E2E_DB = TEST_URI.replace(/\/[^/?]*(\?|$)/, '/hellorun_ocr_e2e$1');
const skip = !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(TEST_URI) || String(process.env.DATABASE_URL || '').trim()
  ? 'set OCR_TEST_MONGODB_URI to a local mongodb:// URI and leave DATABASE_URL empty'
  : false;

const PORT = 3197;
const BLANK = [
  'DATABASE_URL', 'REDIS_URL', 'RESEND_API_KEY', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT',
  'R2_PUBLIC_BASE_URL', 'CLOUDFLARE_ACCOUNT_ID', 'TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET', 'STRAVA_ENCRYPTION_KEY', 'STRAVA_REDIRECT_URI', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL', 'GA_MEASUREMENT_ID', 'SENTRY_DSN', 'ADMIN_EMAIL'
];

function redirectMessage(response) {
  const location = response.headers.get('location') || '';
  return new URL(location, 'http://local').searchParams.get('msg') || location;
}

class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  async request(pathname, { method = 'GET', body, headers = {} } = {}) {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      method,
      body,
      redirect: 'manual',
      headers: { cookie: this.cookieHeader(), ...headers }
    });
    for (const cookie of response.headers.getSetCookie?.() || []) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return response;
  }

  async csrf(pathname = '/login') {
    const html = await (await this.request(pathname)).text();
    const match = html.match(/name="_csrf" value="([^"]+)"/);
    assert.ok(match, `CSRF token on ${pathname}`);
    return match[1];
  }

  async postForm(pathname, fields) {
    return this.request(pathname, {
      method: 'POST',
      body: new URLSearchParams(fields).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    });
  }

  async login(email, password) {
    const token = await this.csrf('/login');
    const response = await this.postForm('/login', { email, password, _csrf: token });
    assert.ok([302, 303].includes(response.status), `login ${email} redirected (got ${response.status})`);
    return response;
  }
}

test.describe('OCR Training Center end to end', { skip, timeout: 240000 }, () => {
  let server;
  const password = 'Correct-Horse-9-Battery';

  test.before(async () => {
    await mongoose.connect(E2E_DB);
    await mongoose.connection.db.dropDatabase();
    const hash = await bcrypt.hash(password, 10);
    const base = { passwordHash: hash, emailVerified: true, accountStatus: 'active', authProvider: 'local', createdAt: new Date(), updatedAt: new Date() };
    await mongoose.connection.db.collection('users').insertMany([
      { ...base, email: 'runner@example.test', firstName: 'Rae', lastName: 'Runner', role: 'runner' },
      { ...base, email: 'support@example.test', firstName: 'Sam', lastName: 'Support', role: 'admin', adminTier: 'support' },
      { ...base, email: 'full@example.test', firstName: 'Fil', lastName: 'Full', role: 'admin', adminTier: 'full' }
    ]);
    const env = { MONGODB_URI: E2E_DB, NODE_ENV: 'development', SESSION_SECRET: 'e2e-session-secret-for-local-tests-only', APP_URL: `http://127.0.0.1:${PORT}`,
      OCR_SERVER_PIPELINE_ENABLED: 'true', OCR_SERVER_AUTO_APPROVAL_ENABLED: 'true', ACTIVITY_URL_ENABLED: 'true', OCR_REMINDERS_ENABLED: 'true', CSRF_PROTECTION: '1' };
    for (const name of BLANK) env[name] = '';
    server = await startTestServer({ port: PORT, env });
  });

  test.after(async () => {
    if (server) await server.stop();
    await mongoose.connection.db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  });

  test('the app boots with every OCR flag on and reports healthy', async () => {
    const health = await fetch(`${server.baseUrl}/healthz`);
    assert.equal(health.status, 200);
    const ready = await fetch(`${server.baseUrl}/readyz`);
    assert.equal(ready.status, 200);
  });

  test('anonymous users are sent to login and runners are refused', async () => {
    const anonymous = await fetch(`${server.baseUrl}/admin/ocr-training`, { redirect: 'manual' });
    assert.equal(anonymous.status, 302);
    assert.match(anonymous.headers.get('location'), /\/login/);
    const runner = new Client(server.baseUrl);
    await runner.login('runner@example.test', password);
    for (const pathname of ['/admin/ocr-training', '/admin/ocr-training/samples', '/admin/ocr-training/models', '/admin/ocr-training/datasets/aaaaaaaaaaaaaaaaaaaaaaaa/manifest.json']) {
      assert.equal((await runner.request(pathname)).status, 403, pathname);
    }
  });

  test('a support admin can use the pages but cannot deploy, export or change settings', async () => {
    const support = new Client(server.baseUrl);
    await support.login('support@example.test', password);
    for (const section of ['', '/samples', '/platforms', '/jobs', '/models', '/analytics', '/settings', '/audit']) {
      const response = await support.request(`/admin/ocr-training${section}`);
      assert.equal(response.status, 200, `support ${section || '/'}`);
    }
    const token = await support.csrf('/admin/ocr-training/settings');
    assert.equal((await support.postForm('/admin/ocr-training/settings', { _csrf: token, 'dataset.minTestSamples': '3' })).status, 403);
    assert.equal((await support.postForm('/admin/ocr-training/models/rollback', { _csrf: token, reason: 'not allowed here', confirmation: 'ROLLBACK', registryVersion: '0' })).status, 403);
    assert.equal((await support.request('/admin/ocr-training/analytics/research-export.csv')).status, 403);
    const models = await (await support.request('/admin/ocr-training/models')).text();
    assert.doesNotMatch(models, /Type ACTIVATE|Type ROLLBACK/);
  });

  test('a full admin: CSRF enforced, settings saved, profile change audited, Test OCR runs', async () => {
    const admin = new Client(server.baseUrl);
    await admin.login('full@example.test', password);
    for (const section of ['', '/samples', '/platforms', '/jobs', '/models', '/analytics', '/settings', '/audit']) {
      const response = await admin.request(`/admin/ocr-training${section}`);
      assert.equal(response.status, 200, `full ${section || '/'}`);
      const html = await response.text();
      assert.match(html, /OCR Training Center/);
    }
    assert.equal((await admin.postForm('/admin/ocr-training/settings', { 'dataset.minTestSamples': '3' })).status, 403, 'missing CSRF token');

    const token = await admin.csrf('/admin/ocr-training/settings');
    const saved = await admin.postForm('/admin/ocr-training/settings', { _csrf: token, 'dataset.minTestSamples': '3', 'notifications.timezone': 'Asia/Manila' });
    assert.equal(saved.status, 302);
    assert.match(redirectMessage(saved), /OCR settings saved/);
    const invalid = await admin.postForm('/admin/ocr-training/settings', { _csrf: token, 'notifications.timezone': 'Mars/Base' });
    assert.match(redirectMessage(invalid), /valid IANA timezone/);

    const noNote = await admin.postForm('/admin/ocr-training/platforms/strava/status', { _csrf: token, status: 'active', notes: '' });
    assert.match(redirectMessage(noNote), /needs a note/);
    const enabled = await admin.postForm('/admin/ocr-training/platforms/strava/status', { _csrf: token, status: 'active', notes: 'E2E smoke: enable for test only' });
    assert.match(redirectMessage(enabled), /strava is now active/);
    const audit = await (await admin.request('/admin/ocr-training/audit')).text();
    assert.match(audit, /ocr\.profile_status_changed/);
    assert.match(audit, /ocr\.settings_updated/);

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><rect width="100%" height="100%" fill="#fff"/>'
      + ['STRAVA', 'Morning Run', 'Distance 5.02 km', 'Moving Time 28:30'].map((line, index) => `<text x="60" y="${150 + index * 120}" font-size="56" font-family="DejaVu Sans, sans-serif">${line}</text>`).join('')
      + '</svg>';
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const form = new FormData();
    form.append('_csrf', token);
    form.append('profileMode', 'production');
    form.append('ocrTestImage', new Blob([png], { type: 'image/png' }), 'synthetic.png');
    const started = Date.now();
    const result = await admin.request('/admin/ocr-training/platforms/test', { method: 'POST', body: form });
    assert.equal(result.status, 200);
    const html = await result.text();
    assert.match(html, /Test result/);
    assert.match(html, /5\.02 km/);
    assert.match(html, /Platform <strong>strava<\/strong>/);
    console.log(`# e2e Test OCR round trip: ${Date.now() - started} ms`);

    const unsafe = new FormData();
    unsafe.append('_csrf', token);
    unsafe.append('ocrTestImage', new Blob([Buffer.from('GIF89a not really')], { type: 'image/gif' }), 'x.gif');
    const rejected = await admin.request('/admin/ocr-training/platforms/test', { method: 'POST', body: unsafe });
    assert.equal(rejected.status, 302);
    assert.match(redirectMessage(rejected), /JPEG, PNG or WebP/);
  });

  test('runner pages still load with every OCR flag on', async () => {
    const runner = new Client(server.baseUrl);
    await runner.login('runner@example.test', password);
    const page = await runner.request('/runner/submissions');
    assert.ok([200, 302].includes(page.status));
  });
});
