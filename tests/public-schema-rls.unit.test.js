'use strict';

// The public schema is closed to the Supabase Data API by migration 027: RLS on every table
// with no policies, and anon/authenticated privileges revoked. The application reaches
// Postgres as a role that bypasses RLS, so this costs it nothing. These checks keep later
// migrations from quietly reopening the API.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'src', 'db', 'migrations');
const LOCKDOWN = '027_public_schema_rls_lockdown.sql';
const LOCKDOWN_NUMBER = 27;

const read = (file) => fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
// Comments carry the rollback recipe, which legitimately mentions DISABLE and GRANT.
const withoutComments = (sql) => sql.replace(/--[^\n]*/g, '');
const migrationNumber = (file) => Number.parseInt(file, 10);

test('the lockdown migration enables RLS on every public table without forcing it on the owner', () => {
  const sql = withoutComments(read(LOCKDOWN));

  assert.match(sql, /c\.relkind IN \('r', 'p'\)/);
  assert.match(sql, /ALTER TABLE public\.%I ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(sql, /FORCE ROW LEVEL SECURITY/i);
  assert.doesNotMatch(sql, /CREATE POLICY/i);
});

test('the lockdown migration refuses to run as a role that would be locked out', () => {
  const sql = withoutComments(read(LOCKDOWN));
  const guard = sql.indexOf('rolbypassrls OR rolsuper');
  const enable = sql.indexOf('ENABLE ROW LEVEL SECURITY');

  assert.ok(guard > -1, 'expected a bypass-RLS guard');
  assert.ok(guard < enable, 'the guard must run before RLS is enabled');
  assert.match(sql, /RAISE EXCEPTION/);
});

test('the lockdown migration revokes the Data API roles now and for future objects', () => {
  const sql = withoutComments(read(LOCKDOWN));

  assert.match(sql, /ARRAY\['anon', 'authenticated'\]/);
  for (const kind of ['TABLES', 'SEQUENCES', 'FUNCTIONS']) {
    assert.match(sql, new RegExp(`REVOKE ALL ON ALL ${kind} IN SCHEMA public FROM %I`));
    assert.match(sql, new RegExp(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ${kind} FROM %I`));
  }
  assert.match(sql, /ALTER VIEW public\.%I SET \(security_invoker = true\)/);
  assert.match(sql, /^\s*BEGIN;/m);
  assert.match(sql, /^\s*COMMIT;/m);
});

function findRlsViolations(rawSql) {
  const sql = withoutComments(rawSql);
  const violations = [];
  const created = [...sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi)]
    .map((match) => match[1].toLowerCase());

  for (const table of created) {
    const enables = new RegExp(`ALTER TABLE\\s+(?:IF EXISTS\\s+)?(?:public\\.)?"?${table}"?\\s+ENABLE ROW LEVEL SECURITY`, 'i');
    if (!enables.test(sql)) violations.push(`creates ${table} without enabling RLS`);
  }
  if (/GRANT[^;]*\bTO\s+[^;]*\b(anon|authenticated)\b/i.test(sql)) violations.push('grants to a Data API role');
  if (/DISABLE ROW LEVEL SECURITY/i.test(sql)) violations.push('disables RLS');
  return violations;
}

test('the later-migration check catches what it is meant to catch', () => {
  assert.deepEqual(findRlsViolations('CREATE TABLE public.widgets (id uuid);'), ['creates widgets without enabling RLS']);
  assert.deepEqual(findRlsViolations('GRANT SELECT ON widgets TO anon;'), ['grants to a Data API role']);
  assert.deepEqual(findRlsViolations('ALTER TABLE widgets DISABLE ROW LEVEL SECURITY;'), ['disables RLS']);
  assert.deepEqual(findRlsViolations(
    'CREATE TABLE IF NOT EXISTS widgets (id uuid);\nALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;\n-- GRANT ALL TO anon'
  ), []);
});

test('later migrations enable RLS on any table they create and never reopen the API', () => {
  const later = fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql') && migrationNumber(file) > LOCKDOWN_NUMBER);

  for (const file of later) {
    assert.deepEqual(findRlsViolations(read(file)), [], file);
  }
});
