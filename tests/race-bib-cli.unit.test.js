'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs: parseBackfill } = require('../src/scripts/backfill-race-bibs');
const { parseArgs: parseRelease } = require('../src/scripts/release-race-bib-design');

test('backfill defaults to dry-run and caps batches', () => {
  assert.deepEqual(parseBackfill(['--event-slug=pilot', '--batch-size=999']), { eventSlug: 'pilot', batchSize: 500, apply: false });
  assert.throws(() => parseBackfill(['--event-slug=pilot', '--apply']), /matching --confirm-event-slug/);
  assert.equal(parseBackfill(['--event-slug=pilot', '--apply', '--confirm-event-slug=pilot']).apply, true);
});

test('release requires version and repeated slug before apply', () => {
  assert.deepEqual(parseRelease(['--event-slug=pilot', '--version=1']), { eventSlug: 'pilot', version: 1, apply: false });
  assert.throws(() => parseRelease(['--event-slug=pilot', '--version=1', '--apply', '--confirm-event-slug=other']), /matching --confirm-event-slug/);
  assert.throws(() => parseRelease(['--event-slug=pilot', '--version=0']), /positive --version/);
});
