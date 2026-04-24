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
const TEST_PORT = 3115;
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
  seed = await seedPublicFilterFixture();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

test('events page applies combined filters and status filter', async () => {
  const combined = await fetch(
    `${BASE_URL}/events?eventType=virtual&distance=5K&status=upcoming&q=Sunrise`
  );
  assert.equal(combined.status, 200);
  const combinedHtml = await combined.text();
  assert.match(combinedHtml, /Virtual Sunrise 5K/i);
  assert.match(combinedHtml, /Open Registration/i);
  assert.match(combinedHtml, /Registration closes/i);
  assert.doesNotMatch(combinedHtml, /Onsite Trail 10K/i);
  assert.doesNotMatch(combinedHtml, /Old City Run/i);
  assert.match(combinedHtml, /active filter/i);

  const closed = await fetch(`${BASE_URL}/events?status=closed&q=Old%20City`);
  assert.equal(closed.status, 200);
  const closedHtml = await closed.text();
  assert.match(closedHtml, /Old City Run/i);
  assert.doesNotMatch(closedHtml, /Virtual Sunrise 5K/i);
  assert.match(closedHtml, /active filter/i);
  assert.match(closedHtml, /Closed \/ Past/i);
  assert.match(closedHtml, /Past Event/i);
});

test('events page search matches organiser name and rendered country name', async () => {
  const organiserSearch = await fetch(`${BASE_URL}/events?q=Public%20Organizer`);
  assert.equal(organiserSearch.status, 200);
  const organiserHtml = await organiserSearch.text();
  assert.match(organiserHtml, /Virtual Sunrise 5K/i);
  assert.match(organiserHtml, /Onsite Trail 10K/i);
  assert.match(organiserHtml, /active filter/i);
  assert.match(organiserHtml, /<title>Results for &#34;Public Organizer&#34; Events - helloRun<\/title>/i);
  assert.match(organiserHtml, /<h1>Results for &#34;Public Organizer&#34; Events<\/h1>/i);
  assert.match(organiserHtml, /[0-9,]+ events match results for &#34;Public Organizer&#34;/i);

  const countrySearch = await fetch(`${BASE_URL}/events?q=Philippines&eventType=onsite&distance=10K&status=open`);
  assert.equal(countrySearch.status, 200);
  const countryHtml = await countrySearch.text();
  assert.match(countryHtml, /Onsite Trail 10K/i);
  assert.match(countryHtml, /<strong>Search:<\/strong>\s*Philippines/i);
  assert.match(countryHtml, /<meta name="description" content="Browse open on-site 10k results for &#34;Philippines&#34; on helloRun and find your next race or virtual challenge\.">/i);
  assert.match(countryHtml, /<h1>Open On-site 10K Results for &#34;Philippines&#34; Events<\/h1>/i);
  assert.match(countryHtml, /[0-9,]+ events? match(?:es)? open on-site 10k results for &#34;Philippines&#34;/i);
});

test('closed events are sorted with the most recently closed items first', async () => {
  const response = await fetch(`${BASE_URL}/events?status=closed&q=ChronologyCheck`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const recentIndex = html.indexOf('Recent Closed Run');
  const oldIndex = html.indexOf('Old City Run');
  assert.notEqual(recentIndex, -1);
  assert.notEqual(oldIndex, -1);
  assert.ok(recentIndex < oldIndex, 'recently closed event should appear before older closed event');
  assert.match(html, /Registration Closed|Past Event/i);
});

test('events pagination keeps active filters in page links', async () => {
  const response = await fetch(
    `${BASE_URL}/events?eventType=virtual&distance=5K&status=upcoming&q=Sunrise&page=2`
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Page 2 of/i);
  assert.match(html, /<strong>Search:<\/strong>\s*Sunrise/i);
  assert.match(html, /<strong>Mode:<\/strong>\s*Virtual/i);
  assert.match(html, /<strong>Distance:<\/strong>\s*5K/i);
  assert.match(html, /<strong>Status:<\/strong>\s*Upcoming/i);
  assert.match(
    html,
    /href="\/events\?eventType=virtual&amp;distance=5K&amp;status=upcoming"[^>]*>\s*<span><strong>Search:<\/strong>\s*Sunrise<\/span>/i
  );
  assert.match(
    html,
    /href="\/events\?q=Sunrise&amp;eventType=virtual&amp;distance=5K&amp;status=upcoming"[^>]*class="pagination-prev/i
  );
  assert.match(
    html,
    /class="events-page-number active"[^>]*aria-current=/i
  );
  assert.match(
    html,
    /\/events\?q=Sunrise&amp;eventType=virtual&amp;distance=5K&amp;status=upcoming&amp;page=2/i
  );
  assert.match(
    html,
    /href="\/events\?q=Sunrise&amp;eventType=virtual&amp;distance=5K"[^>]*>\s*<span><strong>Status:<\/strong>\s*Upcoming<\/span>/i
  );
  assert.doesNotMatch(
    html,
    /q=&amp;|eventType=&amp;|distance=&amp;|status=all/i
  );
});

test('blog page applies search and category filters', async () => {
  const response = await fetch(`${BASE_URL}/blog?q=nutrition&category=Nutrition&sort=latest`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Nutrition for New Runners/i);
  assert.doesNotMatch(html, /Trail Training Basics/i);
  assert.match(html, /Clear filters/i);
});

test('leaderboard shows filter summary and clear action when filtered', async () => {
  const response = await fetch(`${BASE_URL}/leaderboard?distance=5K&period=30d`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /active filter/i);
  assert.match(html, /Clear filters/i);
});

async function seedPublicFilterFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    userId: `UPSF${stamp}`.slice(0, 22),
    email: `public.filters.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Public',
    lastName: 'Organizer',
    emailVerified: true
  });

  const author = await User.create({
    userId: `UPSB${stamp}`.slice(0, 22),
    email: `public.filters.author.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Blog',
    lastName: 'Author',
    emailVerified: true
  });

  const now = Date.now();

  const upcomingVirtual = await Event.create({
    organizerId: organizer._id,
    slug: `virtual-sunrise-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `PV-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: 'Virtual Sunrise 5K',
    organiserName: 'Public Organizer',
    description: 'Sunrise virtual challenge event.',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 10 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 11 * 24 * 60 * 60 * 1000),
    city: 'Manila',
    country: 'PH',
    proofTypesAllowed: ['gps', 'photo', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const extraUpcomingVirtualEvents = [];
  for (let i = 1; i <= 11; i += 1) {
    // Seed enough matching events to force at least 3 pages for the same filter set.
    // With 12 matching records and page size 9, page 2 is guaranteed to exist.
    // Keep the query text and distance/mode identical for deterministic filter matches.
    // Vary dates/slugs so records remain unique.
    const extraEvent = await Event.create({
      organizerId: organizer._id,
      slug: `virtual-sunrise-${stamp}-extra-${i}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
      referenceCode: `PX-${String(stamp).replace(/\D/g, '').slice(-4)}${String(i).padStart(2, '0')}`,
      title: `Virtual Sunrise 5K Extra ${i}`,
      organiserName: 'Public Organizer',
      description: `Sunrise virtual challenge event extra ${i}.`,
      status: 'published',
      eventType: 'virtual',
      eventTypesAllowed: ['virtual'],
      raceDistances: ['5K'],
      registrationOpenAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      registrationCloseAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
      eventStartAt: new Date(now + (10 + i) * 24 * 60 * 60 * 1000),
      eventEndAt: new Date(now + (11 + i) * 24 * 60 * 60 * 1000),
      city: 'Manila',
      country: 'PH',
      proofTypesAllowed: ['gps', 'photo', 'manual'],
      waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      waiverVersion: 1
    });
    extraUpcomingVirtualEvents.push(extraEvent);
  }

  const upcomingOnsite = await Event.create({
    organizerId: organizer._id,
    slug: `onsite-trail-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `PO-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: 'Onsite Trail 10K',
    organiserName: 'Public Organizer',
    description: 'Onsite trail event.',
    status: 'published',
    eventType: 'onsite',
    eventTypesAllowed: ['onsite'],
    raceDistances: ['10K'],
    registrationOpenAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 6 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 12 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 13 * 24 * 60 * 60 * 1000),
    city: 'Cebu',
    country: 'PH',
    venueName: 'City Trails',
    proofTypesAllowed: ['gps', 'photo'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const oldEvent = await Event.create({
    organizerId: organizer._id,
    slug: `old-city-run-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `PC-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: 'Old City Run',
    organiserName: 'Public Organizer',
    description: 'Old run event now closed. ChronologyCheck.',
    status: 'published',
    eventType: 'hybrid',
    eventTypesAllowed: ['virtual', 'onsite'],
    raceDistances: ['5K', '10K'],
    registrationOpenAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now - 20 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now - 19 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now - 18 * 24 * 60 * 60 * 1000),
    city: 'Davao',
    country: 'PH',
    proofTypesAllowed: ['gps'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const recentClosedEvent = await Event.create({
    organizerId: organizer._id,
    slug: `recent-closed-run-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    referenceCode: `PR-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    title: 'Recent Closed Run',
    organiserName: 'Public Organizer',
    description: 'Recently closed event. ChronologyCheck.',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
    city: 'Makati',
    country: 'PH',
    proofTypesAllowed: ['gps', 'photo'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1
  });

  const nutritionBlog = await Blog.create({
    authorId: author._id,
    title: 'Nutrition for New Runners',
    slug: `nutrition-runners-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 150),
    excerpt: 'Nutrition basics for race preparation.',
    contentHtml: '<p>Nutrition planning for runners.</p>',
    contentText: 'Nutrition planning for runners',
    coverImageUrl: `https://example.com/nutrition-${stamp}.jpg`,
    category: 'Nutrition',
    status: 'published',
    publishedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
  });

  const trainingBlog = await Blog.create({
    authorId: author._id,
    title: 'Trail Training Basics',
    slug: `trail-training-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 150),
    excerpt: 'How to train for trail races.',
    contentHtml: '<p>Trail training plans.</p>',
    contentText: 'Trail training plans',
    coverImageUrl: `https://example.com/training-${stamp}.jpg`,
    category: 'Training',
    status: 'published',
    publishedAt: new Date(now - 1 * 24 * 60 * 60 * 1000)
  });

  const draftBlog = await Blog.create({
    authorId: author._id,
    title: 'Private Draft Blog',
    slug: `private-draft-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 150),
    excerpt: 'Draft should not appear.',
    contentHtml: '<p>draft</p>',
    contentText: 'draft',
    coverImageUrl: `https://example.com/draft-${stamp}.jpg`,
    category: 'General',
    status: 'draft'
  });

  return {
    userIds: [String(organizer._id), String(author._id)],
    eventIds: [String(upcomingVirtual._id)]
      .concat(extraUpcomingVirtualEvents.map((item) => String(item._id)))
      .concat([String(upcomingOnsite._id), String(oldEvent._id), String(recentClosedEvent._id)]),
    blogIds: [String(nutritionBlog._id), String(trainingBlog._id), String(draftBlog._id)]
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed) return;
  await ensureConnected();
  await Promise.all([
    Event.deleteMany({ _id: { $in: currentSeed.eventIds || [] } }),
    Blog.deleteMany({ _id: { $in: currentSeed.blogIds || [] } }),
    User.deleteMany({ _id: { $in: currentSeed.userIds || [] } })
  ]);
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

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}
