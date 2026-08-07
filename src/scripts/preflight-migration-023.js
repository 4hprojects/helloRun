#!/usr/bin/env node
/**
 * Read-only pre-flight for migration 023 (onsite check-in and live-bib uniqueness).
 *
 * Migration 023 deletes duplicate check_ins rows and voids surplus live bib assignments.
 * This script reports exactly how many rows that would touch, and changes nothing, so the
 * blast radius is known before the migration runs.
 *
 * There is no staging database, so DATABASE_URL may point at production. Every statement
 * here is a SELECT; there is deliberately no code path that writes.
 *
 *   node src/scripts/preflight-migration-023.js
 */

require('dotenv').config();

const { getPostgresClient, closePostgresClient } = require('../db/postgres');

const MIGRATION_FILE = '023_onsite_checkin_bib_uniqueness.sql';

function describeTarget() {
  const raw = String(process.env.DATABASE_URL || '');
  if (!raw) return '(DATABASE_URL unset)';
  try {
    const url = new URL(raw);
    // Host and database only — never echo credentials.
    return `${url.hostname}${url.pathname}`;
  } catch (_error) {
    return '(unparseable DATABASE_URL)';
  }
}

async function main() {
  const sql = getPostgresClient();

  console.log('Migration 023 pre-flight — READ ONLY, nothing is modified.');
  console.log(`Target: ${describeTarget()}`);
  console.log('');

  const applied = await sql`
    SELECT filename, applied_at FROM schema_migrations WHERE filename = ${MIGRATION_FILE} LIMIT 1
  `.catch(() => []);

  if (applied.length > 0) {
    console.log(`Already applied on ${applied[0].applied_at}. Nothing further to do.`);
    return;
  }
  console.log('Not yet applied.');
  console.log('');

  const [checkIns] = await sql`SELECT COUNT(*)::int AS total FROM check_ins`;
  const [bibs] = await sql`SELECT COUNT(*)::int AS total FROM bib_assignments`;

  // Same partitioning the migration uses, so these counts are what it would act on.
  const [duplicateCheckIns] = await sql`
    SELECT COUNT(*)::int AS surplus FROM (
      SELECT ROW_NUMBER() OVER (
        PARTITION BY event_core_id, registration_id
        ORDER BY COALESCE(checked_in_at, created_at) ASC, created_at ASC, id ASC
      ) AS row_rank
      FROM check_ins
    ) ranked
    WHERE ranked.row_rank > 1
  `;

  const [surplusBibs] = await sql`
    SELECT COUNT(*)::int AS surplus FROM (
      SELECT ROW_NUMBER() OVER (
        PARTITION BY event_core_id, registration_id
        ORDER BY assigned_at ASC, created_at ASC, id ASC
      ) AS row_rank
      FROM bib_assignments
      WHERE assignment_status <> 'voided'
    ) ranked
    WHERE ranked.row_rank > 1
  `;

  console.log(`check_ins rows            : ${checkIns.total}`);
  console.log(`  would be DELETED        : ${duplicateCheckIns.surplus}`);
  console.log(`bib_assignments rows      : ${bibs.total}`);
  console.log(`  would be VOIDED         : ${surplusBibs.surplus}`);
  console.log('');

  const destructive = duplicateCheckIns.surplus + surplusBibs.surplus;
  if (destructive === 0) {
    console.log('No existing rows would be changed. The migration would only add two indexes.');
  } else {
    console.log(`${destructive} existing row(s) would be modified or removed.`);
    console.log('Take a database backup before applying.');
  }

  console.log('');
  console.log('Apply with:  npm run supabase:migrate');
}

main()
  .catch((error) => {
    console.error(`Pre-flight failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePostgresClient();
  });
