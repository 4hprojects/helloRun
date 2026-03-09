const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
require('dotenv').config();

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3114;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;

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
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
});

test('public static pages render successfully', async () => {
  const cases = [
    { path: '/about', heading: /About helloRun/i },
    { path: '/how-it-works', heading: /How It Works/i },
    { path: '/contact', heading: /Contact/i },
    { path: '/faq', heading: /FAQ/i },
    { path: '/privacy', heading: /Privacy Policy/i },
    { path: '/terms', heading: /Terms (of Service|and Conditions)/i },
    { path: '/cookie-policy', heading: /Cookie Policy/i }
  ];

  for (const item of cases) {
    const response = await fetch(`${BASE_URL}${item.path}`);
    assert.equal(response.status, 200, `${item.path} should return 200`);
    const html = await response.text();
    assert.match(html, item.heading, `${item.path} should include page heading`);
  }
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
