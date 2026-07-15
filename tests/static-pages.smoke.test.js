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

test('public policy pages include complete AdSense and data usage disclosures', async () => {
  const dataUsage = await fetch(`${BASE_URL}/data-usage-policy`);
  assert.equal(dataUsage.status, 200);
  const dataUsageHtml = await dataUsage.text();
  assert.doesNotMatch(dataUsageHtml, /Initial data usage policy/i);
  assert.match(dataUsageHtml, /OCR-assisted screenshot reading|Activity proof/i);

  const privacy = await fetch(`${BASE_URL}/privacy`);
  assert.equal(privacy.status, 200);
  const privacyHtml = await privacy.text();
  assert.match(privacyHtml, /Google AdSense/i);
  assert.match(privacyHtml, /web beacons/i);
  assert.match(privacyHtml, /IP addresses/i);
  assert.match(privacyHtml, /browser or device identifiers/i);

  const cookie = await fetch(`${BASE_URL}/cookie-policy`);
  assert.equal(cookie.status, 200);
  const cookieHtml = await cookie.text();
  assert.match(cookieHtml, /Advertising Cookies and Google AdSense/i);
  assert.match(cookieHtml, /web beacons/i);
  assert.match(cookieHtml, /IP addresses/i);
  assert.match(cookieHtml, /Google advertising preferences/i);
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
  assert.match(html, /Henson M\. Sagorsor/i);
  assert.match(html, /Benguet, Philippines/i);
  assert.match(html, /Current events/i);
});

test('contact page renders organizer dashboard guidance when sourced from organizer dashboard', async () => {
  const response = await fetch(`${BASE_URL}/contact?source=organizer-dashboard`);
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Organizer Support/i);
  assert.match(html, /include your application ID, event name, or event reference code/i);
  assert.match(html, /mailto:hellorunonline@gmail\.com/i);
  assert.match(html, /Benguet, Philippines/i);
  assert.match(html, /Data and Privacy Requests/i);
});

test('how it works and faq are substantial public resources', async () => {
  const how = await fetch(`${BASE_URL}/how-it-works`);
  assert.equal(how.status, 200);
  const howHtml = await how.text();
  assert.match(howHtml, /Runner Workflow/i);
  assert.match(howHtml, /Accumulated Distance Challenges/i);
  assert.match(howHtml, /Common Proof Mistakes/i);
  assert.doesNotMatch(howHtml, /run-proof-modal-dialog/i);

  const faq = await fetch(`${BASE_URL}/faq`);
  assert.equal(faq.status, 200);
  const faqHtml = await faq.text();
  assert.match(faqHtml, /Runner Questions/i);
  assert.match(faqHtml, /Proof Submission Questions/i);
  assert.match(faqHtml, /Leaderboard and Certificate Questions/i);
  assert.match(faqHtml, /Organizer Questions/i);
});

test('public static pages do not render run proof modal content', async () => {
  for (const pathname of ['/about', '/contact', '/how-it-works', '/faq']) {
    const response = await fetch(`${BASE_URL}${pathname}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.doesNotMatch(html, /run-proof-modal-dialog/i, `${pathname} should not include run proof modal`);
    assert.doesNotMatch(html, /Submit your recorded run here/i, `${pathname} should not include run proof nav callout`);
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
