#!/usr/bin/env node

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const { getPostgresClient, closePostgresClient } = require('../db/postgres');

async function statementStats(sql, objectName, extensionSchema) {
  if (!extensionSchema) return { available: false };

  try {
    const pattern = `%${objectName}%`;
    const [result] = extensionSchema === 'extensions'
      ? await sql`
          SELECT COUNT(*)::int AS statement_shapes, COALESCE(SUM(calls), 0)::bigint AS calls
          FROM extensions.pg_stat_statements
          WHERE query ILIKE ${pattern}
        `
      : await sql`
          SELECT COUNT(*)::int AS statement_shapes, COALESCE(SUM(calls), 0)::bigint AS calls
          FROM public.pg_stat_statements
          WHERE query ILIKE ${pattern}
        `;
    return {
      available: true,
      statementShapes: Number(result.statement_shapes),
      calls: Number(result.calls)
    };
  } catch (error) {
    return {
      available: false,
      reason: error.code || error.message
    };
  }
}

async function auditView(sql, name, statementStatsSchema) {
  const [dependents, functions, grants, stats] = await Promise.all([
    sql`
      SELECT view_name
      FROM information_schema.view_table_usage
      WHERE view_schema = 'public'
        AND table_schema = 'public'
        AND table_name = ${name}
      ORDER BY view_name
    `,
    sql`
      SELECT n.nspname AS schema_name, p.proname AS function_name
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND p.prokind IN ('f', 'p')
        AND pg_get_functiondef(p.oid) ILIKE ${`%${name}%`}
      ORDER BY n.nspname, p.proname
    `,
    sql`
      SELECT grantee, array_agg(privilege_type ORDER BY privilege_type) AS privileges
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = ${name}
      GROUP BY grantee
      ORDER BY grantee
    `,
    statementStats(sql, name, statementStatsSchema)
  ]);

  return {
    name,
    dependentViews: dependents.map((row) => row.view_name),
    referencingFunctions: functions.map((row) => `${row.schema_name}.${row.function_name}`),
    grants: grants.map((row) => ({ grantee: row.grantee, privileges: row.privileges })),
    statementStats: stats
  };
}

async function auditPlatformFees(sql, statementStatsSchema) {
  const [rows, tableStats, foreignKeys, functions, grants, stats] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM public.shop_platform_fees`,
    sql`
      SELECT seq_scan, idx_scan, n_tup_ins, n_tup_upd, n_tup_del
      FROM pg_stat_user_tables
      WHERE schemaname = 'public' AND relname = 'shop_platform_fees'
    `,
    sql`
      SELECT conname
      FROM pg_constraint
      WHERE contype = 'f'
        AND (conrelid = 'public.shop_platform_fees'::regclass
          OR confrelid = 'public.shop_platform_fees'::regclass)
      ORDER BY conname
    `,
    sql`
      SELECT n.nspname AS schema_name, p.proname AS function_name
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND p.prokind IN ('f', 'p')
        AND pg_get_functiondef(p.oid) ILIKE '%shop_platform_fees%'
      ORDER BY n.nspname, p.proname
    `,
    sql`
      SELECT grantee, array_agg(privilege_type ORDER BY privilege_type) AS privileges
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = 'shop_platform_fees'
      GROUP BY grantee
      ORDER BY grantee
    `,
    statementStats(sql, 'shop_platform_fees', statementStatsSchema)
  ]);

  const rawTableStats = tableStats[0] || {};
  return {
    name: 'shop_platform_fees',
    rows: Number(rows[0].count),
    tableStats: Object.fromEntries(
      Object.entries(rawTableStats).map(([key, value]) => [key, Number(value || 0)])
    ),
    foreignKeys: foreignKeys.map((row) => row.conname),
    referencingFunctions: functions.map((row) => `${row.schema_name}.${row.function_name}`),
    grants: grants.map((row) => ({ grantee: row.grantee, privileges: row.privileges })),
    statementStats: stats
  };
}

async function main() {
  const sql = getPostgresClient();
  const [views, extension, databaseStats, statementStatsInfo] = await Promise.all([
    sql`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `,
    sql`
      SELECT n.nspname AS schema_name
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'pg_stat_statements'
    `,
    sql`
      SELECT stats_reset
      FROM pg_stat_database
      WHERE datname = current_database()
    `,
    sql`
      SELECT pg_postmaster_start_time() AS server_started_at, stats_reset AS statement_stats_reset_at
      FROM extensions.pg_stat_statements_info
    `.catch(() => [])
  ]);

  const detectedStatsSchema = extension[0]?.schema_name || null;
  const statementStatsSchema = ['public', 'extensions'].includes(detectedStatsSchema)
    ? detectedStatsSchema
    : null;
  const auditedViews = [];
  for (const row of views) {
    auditedViews.push(await auditView(sql, row.table_name, statementStatsSchema));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    caveat: 'Database dependencies and retained statement statistics cannot identify external dashboards, BI tools, or ad-hoc clients with certainty.',
    serverStartedAt: statementStatsInfo[0]?.server_started_at || null,
    statementStatsResetAt: statementStatsInfo[0]?.statement_stats_reset_at || null,
    databaseStatsResetAt: databaseStats[0]?.stats_reset || null,
    views: auditedViews,
    shopPlatformFees: await auditPlatformFees(sql, statementStatsSchema)
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(`[Postgres consumer audit] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closePostgresClient);
