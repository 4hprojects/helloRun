# PostgreSQL Object Consumer Inventory

**Audit date:** October 20, 2026
**Decision recorded:** October 27, 2026
**Mode:** Read-only repository and production-catalog inspection
**Canonical tasks:** `DEC-05` and `DEBT-03` — complete with no removal

## Result

Production has 13 public views. Two are referenced by application runtime code and must
not be removal candidates:

| Object | Runtime consumer |
|---|---|
| `v_event_checkin_summary` | `src/services/onsite-operations.service.js` |
| `v_bib_assignment_status` | `src/services/onsite-operations.service.js` |

The remaining 11 have no runtime reference in `src/` outside their defining migrations:

| Candidate view | Repository-only references |
|---|
| `v_event_leaderboards_accumulated` | Migrations 006 and 022 |
| `v_event_leaderboards_single` | Migration 006 |
| `v_event_submission_stats` | Migration 006 |
| `v_inventory_status` | Migration 008 |
| `v_onsite_results_by_category` | Migration 007 |
| `v_race_kit_inventory` | Migration 007 |
| `v_runner_certifications` | Migration 006 |
| `v_runner_performance` | Migration 006 |
| `v_shop_order_queue` | Migration 011 and a schema-presence integration test |
| `v_shop_variant_inventory` | Migration 011 and a schema-presence integration test |
| `v_top_events_by_activity` | Migration 006 |

This corrects the earlier backlog estimate of ten unused views. The production schema
contains two shop views that made the current candidate count 11.

## Production dependency and usage evidence

`npm run supabase:audit:object-consumers` found:

- no public view depends on any of the 13 views;
- no stored function or procedure definition references any of them;
- retained `pg_stat_statements` data covers September 9 through October 20 and contains
  zero statement shapes and zero calls naming any of the 13 views; and
- each view is currently granted to `anon`, `authenticated`, `service_role`, and the
  application `postgres` role. Migration 027 is expected to narrow the Data API exposure
  separately; grants are access capability, not evidence of consumption.

Zero retained calls is supporting evidence only. It does not prove that a dormant BI
report, external dashboard, saved query, or ad-hoc operational procedure does not depend
on an object.

## `shop_platform_fees`

The table has zero rows, no foreign keys in either direction, no referencing stored
function, and no runtime source reference. Its only application-repository mentions are
the defining/hardening migrations, smoke-cleanup metadata, a schema-presence test, and
the shop specification. The observed statement-statistics calls and sequential scans
were produced by this audit's own count queries; there is no evidence of application
use.

## Owner check and removal boundary

Before `DEBT-03` creates a removal migration, the owner must confirm whether the 11
candidate views and `shop_platform_fees` appear in:

1. Supabase saved SQL and reports;
2. external dashboard or BI connection definitions;
3. scheduled exports, spreadsheets, and automation;
4. operator runbooks or ad-hoc query libraries; and
5. any client that connects outside this repository.

Record retain/remove for every object. Any approved removal must use a new reversible
migration, preserve the two runtime views, update schema tests, and include a post-deploy
external-consumer check. No production object was changed by this audit.

## Retain decision

Retain all 11 candidate views and `shop_platform_fees` indefinitely. No removal migration
will be created. Their small storage and maintenance cost does not justify the risk of
breaking an unobserved saved SQL query, dashboard, BI connection, spreadsheet,
automation, runbook, or ad-hoc operator workflow.

| Object | Decision |
|---|---|
| `v_event_leaderboards_accumulated` | Retain |
| `v_event_leaderboards_single` | Retain |
| `v_event_submission_stats` | Retain |
| `v_inventory_status` | Retain |
| `v_onsite_results_by_category` | Retain |
| `v_race_kit_inventory` | Retain |
| `v_runner_certifications` | Retain |
| `v_runner_performance` | Retain |
| `v_shop_order_queue` | Retain |
| `v_shop_variant_inventory` | Retain |
| `v_top_events_by_activity` | Retain |
| `shop_platform_fees` | Retain |

Unknown external-consumer status is treated as evidence for retention, not permission to
remove. Any future removal proposal reopens the inventory and requires explicit
confirmation from every external-consumer surface, a reversible migration, updated schema
tests, and post-deploy verification. The two runtime onsite views remain protected and
were never candidates. This no-op decision changes no production object.
