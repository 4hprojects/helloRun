const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Blog = require('../src/models/Blog');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { buildTrustedEditorialReview } = require('../src/utils/blog-content-eligibility');

function eligibleSitemapBlogRecord(fields, actorId) {
  const words = Array.from({ length: 510 }, (_, index) => `sitemaprunner${index}`);
  const contentHtml = [0, 170, 340].map((start) => `<p>${words.slice(start, start + 170).join(' ')}</p>`).join('');
  const record = { ...fields, contentHtml, contentText: words.join(' '), status: 'published', isDeleted: false };
  return { ...record, ...buildTrustedEditorialReview(record, actorId, new Date()) };
}

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3125;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  seed = await seedFixtures();

  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      APP_URL: BASE_URL
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupFixtures(seed);
  await mongoose.disconnect();
});

test('health and readiness endpoints report healthy state after boot', async () => {
  const health = await fetch(`${BASE_URL}/healthz`);
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.ok, true);

  const ready = await fetch(`${BASE_URL}/readyz`);
  assert.equal(ready.status, 200);
  const readyBody = await ready.json();
  assert.equal(readyBody.ok, true);
  assert.equal(readyBody.dependencies.mongo, 'ready');
});

test('dynamic sitemap includes live public content and excludes auth and placeholder urls', async () => {
  const response = await fetch(`${BASE_URL}/sitemap.xml`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/xml; charset=utf-8');

  const xml = await response.text();
  assert.match(xml, new RegExp(`<loc>${escapeForRegex(`${BASE_URL}/`)}</loc>`));
  assert.match(xml, new RegExp(`<loc>${escapeForRegex(`${BASE_URL}/blog`)}</loc>`));
  for (const policyPath of [
    '/privacy',
    '/terms',
    '/cookie-policy',
    '/data-usage-policy',
    '/refund-and-cancellation-policy',
    '/organiser-terms',
    '/community-guidelines',
    '/acceptable-use-policy'
  ]) {
    assert.match(xml, new RegExp(`<loc>${escapeForRegex(`${BASE_URL}${policyPath}`)}</loc>`));
  }
  assert.match(xml, new RegExp(`<loc>${escapeForRegex(`${BASE_URL}/events/${encodeURIComponent(seed.event.slug)}`)}</loc>`));
  assert.match(xml, new RegExp(`<loc>${escapeForRegex(`${BASE_URL}/blog/${encodeURIComponent(seed.blog.slug)}`)}</loc>`));
  assert.doesNotMatch(xml, new RegExp(`/events/${escapeForRegex(seed.placeholderEvent.slug)}`));

  assert.doesNotMatch(xml, /<loc>.*\/login<\/loc>/i);
  assert.doesNotMatch(xml, /<loc>.*\/leaderboard<\/loc>/i);
  assert.doesNotMatch(xml, /<loc>.*\/shop<\/loc>/i);
  assert.doesNotMatch(xml, /blog\/category\//i);
  assert.doesNotMatch(xml, /what-is-virtual-run-philippines/i);
  assert.doesNotMatch(xml, /virtual-run-vs-traditional-race<\/loc>/i);
  assert.doesNotMatch(xml, /best-running-apps-for-virtual-runs<\/loc>/i);
  assert.doesNotMatch(xml, /how-to-organize-community-virtual-run<\/loc>/i);
  assert.doesNotMatch(xml, /5k-vs-10k-vs-21k-which-distance-should-you-choose/i);
});

test('duplicate blog slugs redirect to canonical posts', async () => {
  const redirects = [
    ['best-running-apps-for-virtual-runs', 'best-apps-to-track-your-virtual-run'],
    ['how-to-organize-community-virtual-run', 'how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'],
    ['virtual-run-vs-traditional-race', 'virtual-run-vs-traditional-race-which-one-should-you-join'],
    ['what-is-virtual-run-philippines', 'what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers'],
    ['5k-vs-10k-vs-21k-which-distance-should-you-choose', 'how-to-choose-between-a-5k-10k-21k-or-distance-challenge']
  ];

  for (const [legacySlug, canonicalSlug] of redirects) {
    const response = await fetch(`${BASE_URL}/blog/${legacySlug}`, { redirect: 'manual' });
    assert.equal(response.status, 301, `${legacySlug} should redirect`);
    assert.equal(response.headers.get('location'), `/blog/${canonicalSlug}`, `${legacySlug} should use its canonical target`);
  }
});

test('public blog page does not render unfinished newsletter copy', async () => {
  const response = await fetch(`${BASE_URL}/blog`);
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.doesNotMatch(html, /Newsletter signups are temporarily unavailable/i);
  assert.doesNotMatch(html, /Stay in the loop/i);
  assert.doesNotMatch(html, /blog-newsletter/i);
});

test('public event page uses cleaned badge wording', async () => {
  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}`);
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.doesNotMatch(html, /Available achievement badges/i);
  assert.doesNotMatch(html, /Badges not enabled/i);
  assert.match(html, /No event badges listed/i);
});

test('robots.txt blocks utility routes and points to sitemap', async () => {
  const response = await fetch(`${BASE_URL}/robots.txt`);
  assert.equal(response.status, 200);
  const body = await response.text();

  assert.match(body, /User-agent:\s*\*/i);
  assert.match(body, /Disallow:\s*\/login/i);
  assert.match(body, /Disallow:\s*\/signup/i);
  assert.match(body, /Disallow:\s*\/admin/i);
  assert.match(body, /Disallow:\s*\/organizer/i);
  assert.match(body, /Disallow:\s*\/runner/i);
  assert.match(body, /Disallow:\s*\/shop\/checkout/i);
  assert.match(body, /Sitemap:\s*https:\/\/hellorun\.online\/sitemap\.xml/i);
});

test('ads.txt exposes the configured AdSense publisher declaration', async () => {
  const response = await fetch(`${BASE_URL}/ads.txt`);
  assert.equal(response.status, 200);
  const body = (await response.text()).trim();

  assert.equal(body, 'google.com, pub-4537208011192461, DIRECT, f08c47fec0942fa0');
});

test('utility pages send noindex metadata and header', async () => {
  const response = await fetch(`${BASE_URL}/login`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');

  const html = await response.text();
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/i);
});

async function seedFixtures() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);

  const author = await User.create({
    userId: `USMAP${stamp}`.slice(0, 22),
    email: `sitemap.author.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Sitemap',
    lastName: 'Author',
    emailVerified: true
  });

  const organizer = await User.create({
    userId: `USMOO${stamp}`.slice(0, 22),
    email: `sitemap.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Sitemap',
    lastName: 'Organizer',
    emailVerified: true
  });

  const now = Date.now();
  const event = await Event.create({
      isTestData: true,
    organizerId: organizer._id,
    slug: `sitemap-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `SM-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Sitemap Event ${stamp}`,
    organiserName: 'Sitemap Organizer',
    description: 'Sitemap coverage event',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps', 'photo', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const placeholderEvent = await Event.create({
    organizerId: organizer._id,
    slug: `shop-empty-event-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `SX-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: `Shop Empty Event ${stamp}`,
    organiserName: 'Sitemap Organizer',
    description: 'Placeholder event should not be indexed.',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const blog = await Blog.create(eligibleSitemapBlogRecord({
    authorId: author._id,
    title: `Sitemap Blog ${stamp}`,
    slug: `sitemap-blog-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 160),
    excerpt: 'Sitemap blog excerpt for testing.',
    coverImageUrl: 'https://example.com/cover.png',
    category: 'General',
    publishedAt: new Date(),
    approvedAt: new Date()
  }, author._id));

  return { author, organizer, event, placeholderEvent, blog };
}

async function cleanupFixtures(currentSeed) {
  if (!currentSeed) return;
  await Promise.all([
    Blog.deleteMany({ _id: currentSeed.blog._id }),
    Event.deleteMany({ _id: { $in: [currentSeed.event._id, currentSeed.placeholderEvent._id] } }),
    User.deleteMany({
      _id: { $in: [currentSeed.author._id, currentSeed.organizer._id] }
    })
  ]);
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/healthz`);
      if (response.status === 200) {
        return;
      }
    } catch (_) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

function escapeForRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
