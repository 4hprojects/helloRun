'use strict';

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const { getPostgresClient, closePostgresClient } = require('../db/postgres');

async function auditPublicSchemaRls(sql = getPostgresClient()) {
  const [role] = await sql`
    select current_user as name, rolbypassrls as bypass_rls, rolsuper as superuser
    from pg_roles
    where rolname = current_user
  `;
  const migration = await sql`
    select filename, applied_at
    from schema_migrations
    where filename = '027_public_schema_rls_lockdown.sql'
  `;
  const [tables] = await sql`
    select
      count(*)::int as total,
      count(*) filter (where c.relrowsecurity)::int as rls_enabled,
      count(*) filter (where not c.relrowsecurity)::int as rls_disabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  `;
  const tableGrants = await sql`
    select grantee, privilege_type, count(*)::int as object_grants
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
    group by grantee, privilege_type
    order by grantee, privilege_type
  `;
  const [views] = await sql`
    select
      count(*)::int as total,
      count(*) filter (
        where coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']::text[]
      )::int as security_invoker
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  `;
  const [policies] = await sql`
    select count(*)::int as total
    from pg_policies
    where schemaname = 'public'
  `;

  return {
    role,
    migration027: {
      recorded: migration.length === 1,
      appliedAt: migration[0]?.applied_at || null
    },
    tables,
    dataApiTableGrants: tableGrants,
    views,
    policies: policies.total
  };
}

async function main() {
  const result = await auditPublicSchemaRls();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error?.message || error);
      process.exitCode = 1;
    })
    .finally(() => closePostgresClient().catch(() => {}));
}

module.exports = { auditPublicSchemaRls };
