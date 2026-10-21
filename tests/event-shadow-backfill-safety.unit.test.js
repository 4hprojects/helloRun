'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const packageJson = require('../package.json');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src/scripts/backfill-event-core-shadow.js'),
  'utf8'
);

test('event shadow backfill is dry-run by default with a separate apply command', () => {
  assert.match(packageJson.scripts['supabase:backfill:event-core'], /--dry-run/);
  assert.match(packageJson.scripts['supabase:backfill:event-core:apply'], /--apply/);
  assert.match(source, /const dryRun = !apply/);
  assert.match(source, /Choose either --dry-run or --apply/);
});

test('event shadow repair validates and scopes an optional event id', () => {
  assert.match(source, /--event-id=/);
  assert.match(source, /mongoose\.isValidObjectId\(eventId\)/);
  assert.match(source, /\.\.\.\(eventId \? \{ _id: eventId \} : \{\}\)/);
  assert.match(source, /const skipOrganisers = Boolean\(eventId\)/);
});
