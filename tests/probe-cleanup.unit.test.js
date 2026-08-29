'use strict';

// Tearing down a verification probe.
//
// There is no staging tier, so behaviour is verified by creating throwaway data in
// production and deleting it. Twice a hand-written teardown missed a foreign-key child —
// the second time leaving a `rankings` row that blocked the `events_core` delete, so an
// event survived until the failure was noticed. Seventeen tables reference events_core.
//
// The fix is not a longer list. It is not having a second list at all.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  POSTGRES_EVENT_TABLES,
  cascadeDeleteEventsMongo
} = require('../src/services/test-data-cleanup.service');
const { PROBE_TITLE, PROBE_SLUG } = require('../src/scripts/probe-cleanup');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const probe = read('src/scripts/probe-cleanup.js');
const service = read('src/services/test-data-cleanup.service.js');

test('the probe teardown keeps no delete list of its own', () => {
  // A second list is a second thing to forget a table from.
  assert.match(probe, /purgePostgresShadowData/);
  assert.match(probe, /cascadeDeleteEventsMongo/);
  assert.doesNotMatch(probe, /delete from (?!.*\$\{)/i, 'no hand-written deletes');
  assert.match(probe, /it\s*\n \* delegates to `test-data-cleanup\.service`/);
});

test('the shared list covers what the hand-written teardowns missed', () => {
  const tables = POSTGRES_EVENT_TABLES.map((entry) => entry.table);
  // rankings is the one that actually broke a teardown; the other two were never in the
  // smoke-test script either.
  for (const table of ['rankings', 'badge_progress', 'certificate_audit_logs']) {
    assert.ok(tables.includes(table), `${table} must be in the shared list`);
  }
  // events_core is deleted last, outside the list, once everything referencing it is gone.
  assert.ok(!tables.includes('events_core'));
  assert.match(service, /events_core itself is deleted last, outside this list/);
  // One transaction, so a partial teardown cannot leave Mongo and Postgres disagreeing.
  assert.match(service, /await sql\.begin\(async \(tx\) => \{/);
});

test('an event delete no longer orphans the newer event-scoped models', () => {
  // These were added after the cascade was written, and none of them were in it — so the
  // admin test-data purge orphaned them too, not just a probe.
  for (const model of ['GuestRegistrationToken', 'WaitlistEntry', 'RegistrationTransfer', 'BibQrToken', 'EventCoOrganizer']) {
    assert.match(service, new RegExp(`${model}\\.deleteMany\\(\\{ eventId`), `${model} must be cascaded`);
  }
  assert.match(service, /would otherwise be orphaned by an event delete/);
});

test('teardown proves it worked instead of assuming', () => {
  // A teardown that fails quietly is what caused the problem in the first place.
  assert.match(probe, /async function countResidue/);
  assert.match(probe, /throw new Error\(\s*`Probe teardown left residue in production/);
  // It counts every table in the shared list, so it cannot drift from what was deleted.
  assert.match(probe, /for \(const \{ table, column, viaEventCoreId \} of POSTGRES_EVENT_TABLES\)/);
});

test('the sweep matches probe events narrowly', () => {
  // A loose pattern on a production sweep is its own accident.
  assert.ok(PROBE_TITLE.test('ZZ walkin probe'));
  assert.ok(PROBE_SLUG.test('zz-td-123'));
  assert.ok(!PROBE_TITLE.test('Zamboanga Zoo Run'), 'a real event must not match');
  assert.ok(!PROBE_SLUG.test('zzz-marathon'), 'a real slug must not match');
  assert.ok(!PROBE_SLUG.test('bayani-run-2026'));
});

test('the empty summary and the real summary agree on shape', async () => {
  // deleteMany is never called with an empty id list, so this returns the constant.
  const summary = await cascadeDeleteEventsMongo([]);
  for (const key of ['guestTokensDeleted', 'waitlistEntriesDeleted', 'transfersDeleted', 'bibTokensDeleted', 'coOrganizersDeleted']) {
    assert.equal(summary[key], 0, `${key} must be in the empty summary too`);
  }
});

test('it is runnable as a sweep, with a dry run', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.equal(scripts['probe:cleanup'], 'node src/scripts/probe-cleanup.js');
  assert.match(scripts['probe:cleanup:dry'], /--dry-run/);
  assert.match(probe, /DRY RUN — nothing will be deleted/);
});
