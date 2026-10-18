#!/usr/bin/env node
'use strict';

/**
 * Tear down a verification probe, and prove it left nothing behind.
 *
 * This repository has no staging tier, so behaviour is verified by creating throwaway data
 * in production, exercising a path, and deleting it. Twice, a hand-written teardown missed
 * a foreign-key child — the second time leaving a `rankings` row that blocked the
 * `events_core` delete, so an event survived until the failure was noticed.
 *
 * Seventeen Postgres tables reference `events_core`. Writing that list from memory at the
 * bottom of each probe was never going to hold. So this does not have its own list: it
 * delegates to `test-data-cleanup.service`, which keeps one FK-ordered list, deletes
 * `events_core` last, and runs the whole thing in a transaction.
 *
 * The verification is the point. A teardown that fails quietly is what caused the problem,
 * so this re-counts afterwards and throws if anything survived.
 *
 * As a module:
 *   const { teardownProbe } = require('./src/scripts/probe-cleanup');
 *   await teardownProbe([event._id]);      // throws if residue remains
 *
 * As a sweep, for anything an interrupted probe left behind:
 *   node src/scripts/probe-cleanup.js --dry-run
 *   node src/scripts/probe-cleanup.js
 */

const mongoose = require('mongoose');
const Event = require('../models/Event');
const {
  purgePostgresShadowData,
  cascadeDeleteEventsMongo,
  POSTGRES_EVENT_TABLES
} = require('../services/test-data-cleanup.service');
const { getPostgresClient } = require('../db/postgres');

// Probe events are named this way by convention: `ZZ <what> probe` with a `zz-` slug.
// Narrow on purpose — a sweep that deletes by a loose pattern is its own accident.
const PROBE_TITLE = /^ZZ /;
const PROBE_SLUG = /^zz-/;

// Probe accounts and participants use a `zz-` local part on `example.com`, which is a
// reserved domain and cannot belong to a real person.
const PROBE_EMAIL_SQL = 'zz-%@example.com';
const PROBE_EMAIL_MONGO = /^zz-.*@example\.com$/;

/**
 * Probe rows that no longer hang off any event.
 *
 * Everything above finds data by walking down from `events_core`, which is the right shape
 * for a probe that finished. It cannot see a row whose event link was never written or was
 * blanked — and that happened: a shadow row written from a projected document lost its
 * `mongo_event_id`, so the sweep reported clean while the row sat in production.
 *
 * Keyed on the email convention rather than on the missing link, because `event_core_id IS
 * NULL` is true of thousands of legitimate rows from before the events shadow existed.
 */
async function countProbeOrphans(sql) {
  if (!sql) return {};
  const orphans = {};

  const [registrations] = await sql`
    select count(*)::int as count from registrations
    where participant_email like ${PROBE_EMAIL_SQL}
  `;
  if (registrations?.count) orphans['postgres:registrations'] = registrations.count;

  const [users] = await sql`
    select count(*)::int as count from app_users where email like ${PROBE_EMAIL_SQL}
  `;
  if (users?.count) orphans['postgres:app_users'] = users.count;

  return orphans;
}

/**
 * Remove probe rows the event-scoped teardown cannot reach, children first.
 *
 * @param {Function} sql
 * @param {Object} [options]
 * @param {Object} [options.User] - the Mongo model, injectable so the delete order can be
 *   asserted without a database.
 */
async function sweepProbeOrphans(sql, options = {}) {
  const rows = await sql`
    select id from registrations where participant_email like ${PROBE_EMAIL_SQL}
  `;

  for (const row of rows) {
    await sql`delete from bib_assignments where registration_id = ${row.id}`;
    await sql`delete from check_ins where registration_id = ${row.id}`;
    await sql`delete from onsite_results where registration_id = ${row.id}`;
  }
  if (rows.length) {
    await sql`delete from registrations where id = any(${rows.map((row) => row.id)})`;
  }

  const users = await sql`select id from app_users where email like ${PROBE_EMAIL_SQL}`;
  if (users.length) {
    await sql`delete from app_users where id = any(${users.map((user) => user.id)})`;
  }

  // The Mongo accounts behind them, which every probe has had to delete by hand.
  const User = options.User || require('../models/User');
  const mongoUsers = await User.deleteMany({ email: PROBE_EMAIL_MONGO });

  return {
    registrations: rows.length,
    postgresUsers: users.length,
    mongoUsers: mongoUsers.deletedCount || 0
  };
}

/**
 * Count anything still referencing these events, after a teardown claims to be done.
 */
async function countResidue(mongoEventIds, sql) {
  const ids = mongoEventIds.map(String);
  const residue = {};

  const events = await Event.countDocuments({ _id: { $in: ids } });
  if (events) residue['mongo:events'] = events;

  if (!sql) return residue;

  const coreRows = await sql`select id from events_core where mongo_event_id = any(${ids})`;
  if (coreRows.length) residue['postgres:events_core'] = coreRows.length;

  const coreIds = coreRows.map((row) => row.id);
  for (const { table, column, viaEventCoreId } of POSTGRES_EVENT_TABLES) {
    const values = viaEventCoreId ? coreIds : ids;
    if (!values.length) continue;
    try {
      const rows = await sql.unsafe(
        `select count(*)::int as count from "${table}" where "${column}" = any($1)`,
        [values]
      );
      if (rows[0]?.count) residue[`postgres:${table}`] = rows[0].count;
    } catch (error) {
      // A table or column that does not exist cannot hold residue.
      if (!['42P01', '42703'].includes(String(error?.code || ''))) throw error;
    }
  }

  return residue;
}

/**
 * Delete everything a probe created, then prove it.
 *
 * @param {Array} eventIds - the Mongo Event ids the probe created
 * @param {Object} [options]
 * @param {boolean} [options.quiet]
 * @returns {Promise<Object>} the Mongo cascade summary
 * @throws when anything still references those events
 */
async function teardownProbe(eventIds, options = {}) {
  const ids = (eventIds || []).filter(Boolean).map(String);
  if (!ids.length) return null;

  const sql = getPostgresClient();

  // Postgres first, in a transaction. If it fails, nothing is deleted anywhere, and the
  // Mongo events stay so the residue is still findable.
  await purgePostgresShadowData(ids, { sql });
  const summary = await cascadeDeleteEventsMongo(ids.map((id) => new mongoose.Types.ObjectId(id)));

  const residue = await countResidue(ids, sql);
  if (Object.keys(residue).length > 0) {
    throw new Error(
      `Probe teardown left residue in production: ${JSON.stringify(residue)}. ` +
        'Delete it before continuing.'
    );
  }

  if (!options.quiet) {
    const deleted = Object.entries(summary)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => `${key.replace(/Deleted$/, '')}=${count}`)
      .join(' ');
    console.log(`probe teardown: clean${deleted ? ` (${deleted})` : ''}`);
  }
  return summary;
}

/**
 * Find probe events an interrupted run left behind.
 */
async function findStrandedProbeEvents() {
  return Event.find({ $or: [{ title: PROBE_TITLE }, { slug: PROBE_SLUG }] })
    .select('_id title slug createdAt')
    .lean();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGODB_URI);

  const host = new URL(process.env.MONGODB_URI).hostname;
  console.log(`${dryRun ? 'DRY RUN — nothing will be deleted' : 'DELETING'} against ${host}`);

  const sql = getPostgresClient();

  const stranded = await findStrandedProbeEvents();
  console.log(`Stranded probe events: ${stranded.length}`);
  stranded.forEach((event) => console.log(`  ${event.slug}  ${event.title}`));

  if (dryRun) {
    const orphans = await countProbeOrphans(sql);
    console.log(
      Object.keys(orphans).length
        ? `Orphaned probe rows: ${JSON.stringify(orphans)}`
        : 'Orphaned probe rows: none'
    );
    return;
  }

  if (stranded.length) {
    await teardownProbe(stranded.map((event) => event._id));
  }

  // Anything the event-scoped teardown could not see, plus the throwaway accounts.
  const swept = await sweepProbeOrphans(sql);
  const sweptSummary = Object.entries(swept)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${key}=${count}`)
    .join(' ');
  if (sweptSummary) console.log(`orphan sweep: ${sweptSummary}`);

  const remaining = await countProbeOrphans(sql);
  if (Object.keys(remaining).length > 0) {
    throw new Error(`Probe orphans survived the sweep: ${JSON.stringify(remaining)}`);
  }

  console.log('All stranded probe data removed, and verified gone.');
}

if (require.main === module) {
  require('dotenv').config();
  main()
    .catch((error) => {
      console.error(`probe-cleanup failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect().catch(() => {});
      const { closePostgresClient } = require('../db/postgres');
      await closePostgresClient().catch(() => {});
    });
}

module.exports = {
  teardownProbe,
  countResidue,
  countProbeOrphans,
  sweepProbeOrphans,
  findStrandedProbeEvents,
  PROBE_TITLE,
  PROBE_SLUG,
  PROBE_EMAIL_SQL,
  PROBE_EMAIL_MONGO
};
