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

  const stranded = await findStrandedProbeEvents();
  console.log(`Stranded probe events: ${stranded.length}`);
  stranded.forEach((event) => console.log(`  ${event.slug}  ${event.title}`));

  if (!stranded.length || dryRun) return;

  await teardownProbe(stranded.map((event) => event._id));
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

module.exports = { teardownProbe, countResidue, findStrandedProbeEvents, PROBE_TITLE, PROBE_SLUG };
