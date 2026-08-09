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
const {
  PROBE_TITLE,
  PROBE_SLUG,
  PROBE_EMAIL_MONGO,
  countProbeOrphans,
  sweepProbeOrphans
} = require('../src/scripts/probe-cleanup');

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

test('a probe row with no event left is still found', async () => {
  // The event-scoped teardown walks down from events_core, so it cannot see a row whose
  // event link was never written — which happened when a projected save blanked
  // `mongo_event_id`, and the sweep then reported clean with the row still in production.
  const queries = [];
  const sql = (strings, ...values) => {
    queries.push({ text: strings.join('?'), values });
    return Promise.resolve([{ count: 2 }]);
  };

  const orphans = await countProbeOrphans(sql);

  assert.equal(orphans['postgres:registrations'], 2);
  assert.equal(orphans['postgres:app_users'], 2);
  assert.ok(
    queries.every((query) => query.values.includes('zz-%@example.com')),
    'the sweep must key on the probe email convention, not on the missing event link — ' +
      'thousands of legitimate rows have a null event_core_id'
  );
});

test('the orphan sweep matches probe addresses and nothing else', () => {
  assert.ok(PROBE_EMAIL_MONGO.test('zz-org-1786275367902@example.com'));
  assert.ok(PROBE_EMAIL_MONGO.test('zz-shadow-123@example.com'));
  assert.ok(!PROBE_EMAIL_MONGO.test('zz-real@hellorun.online'), 'only the reserved domain');
  assert.ok(!PROBE_EMAIL_MONGO.test('runner@example.com'), 'a real address must not match');
  assert.ok(!PROBE_EMAIL_MONGO.test('buzz-org@example.com'), 'the prefix is anchored');
});

test('the orphan sweep deletes children before the rows they hang off', async () => {
  const order = [];
  const sql = (strings) => {
    const text = strings.join('?');
    const match = text.match(/delete from (\w+)|select id from (\w+)/i);
    if (match) order.push(match[1] || match[2]);
    return Promise.resolve([{ id: 'row-1' }]);
  };

  const User = { deleteMany: async () => ({ deletedCount: 0 }) };
  await sweepProbeOrphans(sql, { User });

  const registrationsDelete = order.lastIndexOf('registrations');
  for (const child of ['bib_assignments', 'check_ins', 'onsite_results']) {
    assert.ok(
      order.indexOf(child) < registrationsDelete,
      `${child} must be deleted before the registration it references`
    );
  }
});

test('it is runnable as a sweep, with a dry run', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.equal(scripts['probe:cleanup'], 'node src/scripts/probe-cleanup.js');
  assert.match(scripts['probe:cleanup:dry'], /--dry-run/);
  assert.match(probe, /DRY RUN — nothing will be deleted/);
});
