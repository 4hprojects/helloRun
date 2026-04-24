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
  assert.match(xml, new RegExp(`<loc>${escapeForRegex(`${BASE_URL}/events/${encodeURIComponent(seed.event.slug)}`)}</loc>`));
  assert.match(xml, new RegExp(`<loc>${escapeForRegex(`${BASE_URL}/blog/${encodeURIComponent(seed.blog.slug)}`)}</loc>`));

  assert.doesNotMatch(xml, /<loc>.*\/login<\/loc>/i);
  assert.doesNotMatch(xml, /blog\/category\//i);
  assert.doesNotMatch(xml, /what-is-virtual-run-philippines/i);
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

  const blog = await Blog.create({
    authorId: author._id,
    title: `Sitemap Blog ${stamp}`,
    slug: `sitemap-blog-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 160),
    excerpt: 'Sitemap blog excerpt for testing.',
    contentHtml: '<p>This is enough content for a published sitemap blog post test.</p>',
    contentText: 'This is enough content for a published sitemap blog post test.',
    coverImageUrl: 'https://example.com/cover.png',
    category: 'General',
    status: 'published',
    publishedAt: new Date(),
    approvedAt: new Date()
  });

  return { author, organizer, event, blog };
}

async function cleanupFixtures(currentSeed) {
  if (!currentSeed) return;
  await Promise.all([
    Blog.deleteMany({ _id: currentSeed.blog._id }),
    Event.deleteMany({ _id: currentSeed.event._id }),
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
