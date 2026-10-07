-- Close the Supabase Data API over the public schema.
--
-- HelloRun authenticates with Express sessions backed by MongoDB, not Supabase Auth, and
-- the application reaches Postgres as the `postgres` role. Nothing legitimate uses the
-- `anon` or `authenticated` roles, yet any public-schema table without RLS is readable
-- (and possibly writable) through PostgREST by anyone holding the project's public anon key.
--
-- `auth.uid()` policies would be inert here: no request carries a Supabase Auth session, so
-- the function is always NULL. Instead this migration denies by default:
--   1. RLS enabled on every public table, with no policies (no rows for anon/authenticated).
--   2. All anon/authenticated privileges revoked, now and for future objects.
--   3. Public views switched to security_invoker so they cannot bypass (1).
-- The application role bypasses RLS and is unaffected. FORCE ROW LEVEL SECURITY is
-- deliberately not used: it would bind the table owner, i.e. the application itself.
--
-- Table names are not hard-coded; the loops act on whatever exists when this runs.
--
-- Rollback (emergency only; reopens the Data API):
--   DO $$ DECLARE t record; BEGIN
--     FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--              WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
--     LOOP EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.relname); END LOOP;
--   END $$;
--   GRANT ALL ON ALL TABLES, ALL SEQUENCES, ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT ALL ON TABLES, SEQUENCES, FUNCTIONS TO anon, authenticated;

BEGIN;

-- Guard: if the role applying this (the application role) were subject to RLS, enabling it
-- with no policies would make every application query return zero rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = current_user AND (rolbypassrls OR rolsuper)
  ) THEN
    RAISE EXCEPTION
      'Refusing to enable RLS: role % does not bypass RLS, so the application would lose access to its own tables.',
      current_user;
  END IF;
END $$;

-- 1. Enable RLS on every table and partitioned table in public.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END $$;

-- 2. Revoke Data API roles, for existing and future objects. Skipped where the Supabase
--    roles do not exist (plain local Postgres).
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', api_role);
    END IF;
  END LOOP;
END $$;

-- 3. Views run with the caller's privileges, so they cannot be used to read past RLS.
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.relname);
  END LOOP;
END $$;

COMMIT;
