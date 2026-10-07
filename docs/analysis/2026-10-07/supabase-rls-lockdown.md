# Supabase Data API lockdown: 2026-10-07

## Why deny-by-default, not `auth.uid()` policies

- HelloRun authenticates with Express sessions backed by MongoDB, not Supabase Auth. Users reach Postgres only through the `app_users.mongo_user_id` bridge.
- The application connects as the `postgres` role (`src/db/postgres.js`), which bypasses RLS on Supabase.
- No code uses `supabase-js`, the `anon` key or `auth.uid()`. Since no request ever carries a Supabase Auth session, `auth.uid()` is always NULL, and policies keyed to it would grant nothing.
- The real exposure is PostgREST. Any public-schema table without RLS is reachable by anyone holding the project's public `anon` key.

Migration `src/db/migrations/027_public_schema_rls_lockdown.sql` therefore closes the Data API outright:

- It enables RLS on every public table, with no policies.
- It revokes `anon` and `authenticated` privileges, both now and by default for future objects.
- It sets public views to `security_invoker`.

It refuses to run if the applying role does not bypass RLS. Revisit `auth.uid()` policies only if HelloRun moves to Supabase Auth.

## Local proof (PGlite, Supabase-like roles)

Setup: `app_owner` owns the tables and has `BYPASSRLS` but is not superuser, matching Supabase's `postgres` role. `anon` and `authenticated` hold Supabase's default grants. The "other user" is `authenticated` carrying a JWT `sub` that matches no row.

```
== BEFORE migration
anon            select app_users                           [{"n":2}]
authenticated   select orders (other user)                 [{"n":2}]

== AFTER migration
rls flags        every table relrowsecurity=true, relforcerowsecurity=false (incl. "Mixed Case")
anon            select app_users                           ERROR: permission denied for table app_users
anon            insert app_users                           ERROR: permission denied for table app_users
anon            select view order_summary                  ERROR: permission denied for view order_summary
authenticated   select app_users (other user jwt)          ERROR: permission denied for table app_users
authenticated   update orders (other user jwt)             ERROR: permission denied for table orders
app_owner       select app_users (application)             [{"n":2}]
app_owner       select view order_summary                  [{"n":2}]

== Defence in depth: SELECT later re-granted to anon
anon            select app_users (grant present, RLS on)   [{"n":0}]

== Future table created by the app role after the migration
anon            select later_table                         ERROR: permission denied for table later_table

== Guard: applying as a role WITHOUT bypassrls
migration       refused: Refusing to enable RLS: role app_owner does not bypass RLS, ...
                RLS flags unchanged; app_owner still reads its tables
```

This is not production evidence. The live inventory and the live proof below still have to be run against the project.

## Applying to production (`qkjxiolvxxgyfwlpbkdj`)

1. **Pre-flight**, read-only, in the SQL editor. The second query gives the "tables with RLS disabled" list; save it.
   ```sql
   select rolname, rolbypassrls, rolsuper from pg_roles where rolname = current_user;
   select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','p') order by 2, 1;
   ```
2. **Apply** `027_public_schema_rls_lockdown.sql` as `postgres`, in a quiet window.
3. **Verify:**
   - **Inventory:** re-run the inventory query; every row should be `true`.
   - **Proof as other users:**
     ```sql
     begin;
     set local role anon;  select count(*) from public.app_users;   -- permission denied
     reset role;
     set local role authenticated;
     select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
     select count(*) from public.app_users;                          -- permission denied
     reset role;
     select count(*) from public.app_users;                          -- real count (application role)
     rollback;
     ```
   - **Through the Data API:** call `/rest/v1/app_users?select=id&limit=1` with the anon key; expect an error, not rows.
   - **App smoke test:** homepage, an event page, the shop, `/healthz/sync` as admin, and an organiser registrant list.
   - **Security advisor:** "RLS disabled in public" should be gone. "RLS enabled, no policy" notices are expected.
4. **Rollback**, emergency only: use the SQL in the migration header.
