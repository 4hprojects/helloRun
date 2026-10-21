# Production Public-Schema RLS Preflight

**Run date:** October 20, 2026
**Mode:** Read-only
**Canonical task:** `OPS-04` in [ROADMAP](../../ROADMAP.md)

## Result

Production migration `027_public_schema_rls_lockdown.sql` is not applied. The
application connection uses the expected `postgres` role, which has `BYPASSRLS` and is
not a superuser, so it satisfies the migration guard.

| Check | Production | Isolated control |
|---|---:|---:|
| Migration 027 recorded | No | Yes |
| Public tables | 36 | 36 |
| Tables with RLS enabled | 0 | 36 |
| Tables with RLS disabled | 36 | 0 |
| Public views | 13 | 13 |
| Views using `security_invoker` | 0 | 13 |
| Public RLS policies | 0 | 0 |

Both `anon` and `authenticated` retain all seven table privilege types reported by
`information_schema.role_table_grants` across 49 public table/view objects. This is the
exposure migration 027 is intended to close.

The new read-only command below produced both inventories without printing connection
strings or credentials:

```bash
npm run supabase:audit:public-schema
DOTENV_CONFIG_PATH=.env.development npm run supabase:audit:public-schema
```

## Apply gate

Do not treat this preflight as authorization to mutate production. Before applying 027,
record a recoverable Supabase backup or point-in-time recovery checkpoint and approve
the emergency rollback decision. Project-side access is also required for the Data API
anon-key denial probe and Security Advisor confirmation.

After approval, apply in a quiet window and immediately run:

1. the same audit command, expecting 36/36 tables with RLS and 13/13 invoker views;
2. application-role reads and the documented `SET LOCAL ROLE` denial transaction;
3. the external Data API denial request;
4. homepage, event, shop, admin sync-health, and organiser registrant-list smoke checks;
5. the Security Advisor review and rollback/no-rollback decision record.
