const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
require('dotenv').config();

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3122;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      GOOGLE_CALLBACK_URL: `${BASE_URL}/auth/google/callback`
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
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
