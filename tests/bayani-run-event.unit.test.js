const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const {
  SLUG,
  DATES,
  EVENT_DETAILS_MARKDOWN,
  buildBayaniRunEventPayload
} = require('../src/content/events/bayani-run-2026');

test('Bayani Run source preserves the requested dates, free format, and three accumulated goals', () => {
  const id = new mongoose.Types.ObjectId();
  const payload = buildBayaniRunEventPayload({
    organizerId: id,
    approvedBy: id,
    referenceCode: 'HR-BAYANI-2026',
    bannerUrl: 'https://cdn.example.com/banner.webp',
    logoUrl: 'https://cdn.example.com/logo.webp',
    badgeImageUrl: 'https://cdn.example.com/badge.webp',
    posterUrl: 'https://cdn.example.com/poster.webp',
    now: new Date('2026-07-22T00:00:00Z')
  });
  const event = new Event(payload);

  assert.equal(SLUG, 'bayani-run-2026');
  assert.equal(event.validateSync(), undefined);
  assert.equal(event.status, 'published');
  assert.equal(event.feeMode, 'free');
  assert.equal(event.virtualCompletionMode, 'accumulated_distance');
  assert.deepEqual(event.raceCategories.map((category) => [category.name, category.distanceKm]), [
    ['5K Courage', 5],
    ['10K Strength', 10],
    ['21K Hero Challenge', 21]
  ]);
  assert.equal(DATES.publicAt.toISOString(), '2026-08-09T16:00:00.000Z');
  assert.equal(DATES.activityStartAt.toISOString(), '2026-08-23T16:00:00.000Z');
  assert.equal(DATES.activityEndAt.toISOString(), '2026-08-31T15:59:00.000Z');
  assert.equal(event.autoEmailPromotionEnabled, true);
  assert.equal(event.autoEmailPromotionStatus, 'pending');
  assert.equal(event.digitalCertificateEnabled, true);
  assert.equal(event.digitalBadgeEnabled, true);
});

test('Bayani Run copy explains review, accumulation, cultural framing, and no guaranteed recognition', () => {
  assert.match(EVENT_DETAILS_MARKDOWN, /ordinary Filipinos/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /one eligible activity or with several separate eligible activities/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /pending distance remains unofficial/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /not presented as a certified 21\.0975 km half marathon/i);
  assert.match(EVENT_DETAILS_MARKDOWN, /can receive a configured Bayani Run digital badge and certificate/i);
  assert.doesNotMatch(EVENT_DETAILS_MARKDOWN, /guaranteed certificate/i);
  assert.doesNotMatch(EVENT_DETAILS_MARKDOWN, /anywhere.*anytime/i);
});

test('Bayani Run generated artwork is stored in the repository at 16:9 proportions', () => {
  const asset = path.resolve(__dirname, '../assets/events/bayani-run-2026/bayani-run-2026-banner.png');
  assert.equal(fs.existsSync(asset), true);
  const bytes = fs.readFileSync(asset);
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.ok(Math.abs((width / height) - (16 / 9)) < 0.02, `${width}x${height} should be approximately 16:9`);
});

test('Bayani Run creator is default dry-run and requires apply for mutation', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../src/scripts/create-bayani-run-2026.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  assert.match(script, /process\.argv\.includes\('--apply'\)/);
  assert.match(script, /mutation: false/);
  assert.match(script, /Expected \$\{SLUG\} to be absent/);
  assert.equal(pkg.scripts['event:create-bayani-run-2026'], 'node src/scripts/create-bayani-run-2026.js');
});
