const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');

const uploadService = require('../src/services/upload.service');
const { synchronizeEventBadgeImages } = require('../src/services/event-badge.service');

test('circular event badge derivative is 512px WebP with transparent corners', async () => {
  const source = await sharp({
    create: {
      width: 800,
      height: 400,
      channels: 3,
      background: { r: 30, g: 120, b: 220 }
    }
  }).png().toBuffer();

  const output = await uploadService._createCircularBadgeImage(source);
  const image = sharp(output);
  const metadata = await image.metadata();
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[((y * info.width + x) * info.channels) + 3];

  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.hasAlpha, true);
  assert.equal(alphaAt(0, 0), 0);
  assert.ok(alphaAt(256, 256) > 240);
});

test('event-wide badge image synchronization updates every row and supports clearing', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://unit-test';
  const calls = [];
  const sql = async (strings, ...values) => {
    calls.push({ text: strings.join('?'), values });
    return [{ id: 'badge-1' }, { id: 'badge-2' }];
  };

  try {
    const updated = await synchronizeEventBadgeImages('mongo-event-1', 'https://cdn.example/badge.webp', { sql });
    const cleared = await synchronizeEventBadgeImages('mongo-event-1', '', { sql });

    assert.equal(updated.updatedCount, 2);
    assert.equal(cleared.updatedCount, 2);
    assert.match(calls[0].text, /UPDATE event_badges/);
    assert.deepEqual(calls[0].values, ['https://cdn.example/badge.webp', 'mongo-event-1']);
    assert.deepEqual(calls[1].values, [null, 'mongo-event-1']);
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
