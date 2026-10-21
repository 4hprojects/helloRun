const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3122;
const OAUTH_PORT = 4122;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let oauthServer = null;
let oauthProfile = null;
const seededUserIds = [];

test.before(async () => {
  oauthServer = http.createServer((req, res) => {
    if (req.url === '/token' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ access_token: 'local-test-access-token' }));
    }
    if (req.url === '/userinfo' && oauthProfile) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(oauthProfile));
    }
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'OAuth test fixture is not configured.' }));
  });
  await new Promise((resolve, reject) => {
    oauthServer.once('error', reject);
    oauthServer.listen(OAUTH_PORT, '127.0.0.1', resolve);
  });

  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      GOOGLE_CALLBACK_URL: `${BASE_URL}/auth/google/callback`,
      GOOGLE_TOKEN_URL: `http://127.0.0.1:${OAUTH_PORT}/token`,
      GOOGLE_USERINFO_URL: `http://127.0.0.1:${OAUTH_PORT}/userinfo`
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  if (oauthServer) {
    await new Promise((resolve) => oauthServer.close(resolve));
  }
  if (seededUserIds.length > 0) {
    await ensureConnected();
    await User.deleteMany({ _id: { $in: seededUserIds } });
  }
  await mongoose.disconnect();
});

test('auth/google redirects to Google consent URL', async () => {
  const response = await fetch(`${BASE_URL}/auth/google`, {
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  const location = String(response.headers.get('location') || '');
  assert.match(location, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/i);
  assert.match(location, /client_id=test-google-client-id/i);
  assert.match(location, /state=/i);
});

test('auth/google signup intent requires policy consent marker', async () => {
  const response = await fetch(`${BASE_URL}/auth/google?intent=signup`, {
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  const location = String(response.headers.get('location') || '');
  assert.match(location, /^\/signup\?type=error/i);
  assert.match(location, /agree/i);
});

test('auth/google signup intent with consent redirects to Google consent URL', async () => {
  const response = await fetch(`${BASE_URL}/auth/google?intent=signup&agreePolicies=on`, {
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  const location = String(response.headers.get('location') || '');
  assert.match(location, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/i);
  assert.match(location, /state=/i);
});

test('auth/google/callback rejects invalid state', async () => {
  const initResponse = await fetch(`${BASE_URL}/auth/google`, {
    redirect: 'manual'
  });
  const cookie = String(initResponse.headers.get('set-cookie') || '').split(';')[0];
  assert.ok(cookie);

  const callback = await fetch(`${BASE_URL}/auth/google/callback?code=fake-code&state=wrong-state`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(callback.status, 302);
  const location = String(callback.headers.get('location') || '');
  assert.match(location, /^\/login\?type=error/i);
  assert.match(location, /state/i);
});

test('auth/google/callback handles canceled consent', async () => {
  const callback = await fetch(`${BASE_URL}/auth/google/callback?error=access_denied`, {
    redirect: 'manual'
  });

  assert.equal(callback.status, 302);
  const location = String(callback.headers.get('location') || '');
  assert.match(location, /^\/login\?type=error/i);
  assert.match(location, /canceled/i);
});

test('Google callback rotates the session and preserves the safe return path', async () => {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const user = await User.create({
    email: `google.session.${stamp}@example.com`,
    role: 'runner',
    firstName: 'Google',
    lastName: 'Runner',
    emailVerified: true,
    authProvider: 'google',
    googleId: `google-session-${stamp}`
  });
  seededUserIds.push(user._id);
  oauthProfile = {
    sub: user.googleId,
    email: user.email,
    email_verified: true,
    given_name: user.firstName,
    family_name: user.lastName
  };

  const initResponse = await fetch(`${BASE_URL}/auth/google?returnTo=%2Frunner%2Fprofile`, {
    redirect: 'manual'
  });
  const anonymousCookie = String(initResponse.headers.get('set-cookie') || '').split(';')[0];
  const authorizationUrl = new URL(String(initResponse.headers.get('location') || ''));
  const state = authorizationUrl.searchParams.get('state');
  assert.ok(anonymousCookie);
  assert.ok(state);

  const callback = await fetch(
    `${BASE_URL}/auth/google/callback?code=local-code&state=${encodeURIComponent(state)}`,
    { headers: { Cookie: anonymousCookie }, redirect: 'manual' }
  );

  assert.equal(callback.status, 302);
  assert.equal(callback.headers.get('location'), '/runner/profile');
  const authenticatedCookie = String(callback.headers.get('set-cookie') || '').split(';')[0];
  assert.match(authenticatedCookie, /hr\.sid=/i);
  assert.notEqual(authenticatedCookie, anonymousCookie, 'Google login must rotate the OAuth session ID');
});

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

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}
