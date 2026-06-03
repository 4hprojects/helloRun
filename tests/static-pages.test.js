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
    { path: '/about', heading: /A running event platform for flexible participation and verified progress/i },
    { path: '/how-it-works', heading: /How It Works/i },
    { path: '/contact', heading: /Contact/i },
    { path: '/faq', heading: /FAQ/i },
    { path: '/privacy', heading: /Privacy Policy/i },
    { path: '/terms', heading: /Terms (of Service|and Conditions)/i },
    { path: '/cookie-policy', heading: /Cookie Policy/i },
    { path: '/data-usage-policy', heading: /Data Usage Policy/i },
    { path: '/refund-and-cancellation-policy', heading: /Refund and Cancellation Policy/i },
    { path: '/organiser-terms', heading: /Organiser Terms/i },
    { path: '/community-guidelines', heading: /Community Guidelines/i },
    { path: '/acceptable-use-policy', heading: /Acceptable Use Policy/i }
  ];

  for (const item of cases) {
    const response = await fetch(`${BASE_URL}${item.path}`);
    assert.equal(response.status, 200, `${item.path} should return 200`);
    const html = await response.text();
    assert.match(html, item.heading, `${item.path} should include page heading`);
  }
});

test('about page includes required trust, privacy, and event-management guidance', async () => {
  const response = await fetch(`${BASE_URL}/about`);
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /How virtual runs work/i);
  assert.match(html, /Why submissions and leaderboards are reviewed/i);
  assert.match(html, /Data privacy and proof handling/i);
  assert.match(html, /href="\/privacy"/i);
  assert.match(html, /Official HelloRun Event/i);
  assert.match(html, /Organiser-Managed Event/i);
  assert.match(html, /Current events/i);
});

test('contact page renders organizer dashboard guidance when sourced from organizer dashboard', async () => {
  const response = await fetch(`${BASE_URL}/contact?source=organizer-dashboard`);
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Organizer Support/i);
  assert.match(html, /include your application ID, event name, or event reference code/i);
  assert.match(html, /mailto:hellorunonline@gmail\.com/i);
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
