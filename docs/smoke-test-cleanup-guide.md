okay# HelloRun Smoke Test Data Cleanup Guide

## Purpose

This guide defines the implementation plan for cleaning database records and uploaded files created by HelloRun smoke tests.

The goal is to keep staging, preview, production-like, and production smoke environments free of fake runners, organisers, events, registrations, payment receipts, run results, policy drafts, badge records, shop records, reports, audit records, and uploaded proof files while avoiding accidental deletion of real data.

This is both an implementation guide and a status record. The first cleanup foundation has been implemented in the repo; environments still need to apply the Supabase migration before Postgres smoke metadata can be written or cleaned up.

---

## Current HelloRun Architecture

HelloRun currently uses:

- MongoDB/Mongoose as the primary application database.
- Supabase/Postgres as a shadow and ledger layer for users, policies, event core data, registrations, payments, submissions, certificates, rankings, onsite operations, badges, shop, audit, and migration records.
- Cloudflare R2 through `src/services/upload.service.js` for organiser documents, event branding, payment receipts, run result evidence, blog images, and generated certificate files.
- Repo scripts under `src/scripts`, not a root-level `scripts` directory.
- Existing repo tests that usually clean their own fixtures by explicit IDs; this guide is mainly for persistent staging or deployment smoke runs that create realistic data outside the normal test process.
- Implemented cleanup entrypoints:
  - `src/utils/smoke-test-meta.js`
  - `src/utils/smoke-test-schema.js`
  - `src/scripts/cleanup-smoke-tests.js`
  - `src/scripts/run-smoke-tests.js`
  - `src/db/migrations/015_smoke_test_cleanup_metadata.sql`

---

## Core Rule

Never delete smoke data by title, slug, email, name, or partial string alone.

Every destructive cleanup must require smoke metadata:

- Primary cleanup: `isSmokeTest=true` and `testRunId=<target run>`.
- Fallback cleanup: `isSmokeTest=true` and `expiresAt < now()`.

Required MongoDB metadata:

```js
{
  isSmokeTest: true,
  testRunId: "smoke-2026-05-23-001",
  createdByTest: "smoke",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
}
```

Required Supabase/Postgres metadata:

```sql
is_smoke_test boolean not null default false,
test_run_id text,
created_by_test text,
expires_at timestamptz
```

R2 uploads must either use a smoke-only prefix or be tracked by smoke-tagged database records before cleanup is considered safe.

---

## Planned Implementation Phases

### Phase 0: Documentation alignment

Status: implemented.

Update this guide before changing cleanup behavior.

This phase records the current repo-specific cleanup target areas:

- Utility path: `src/utils/smoke-test-meta.js`
- Cleanup script path: `src/scripts/cleanup-smoke-tests.js`
- Supabase migration location: `src/db/migrations`
- Existing live sync smoke script: `src/scripts/smoke-supabase-live-sync.js`
- Upload integration point: `src/services/upload.service.js`

This phase has already added the repo-specific file paths and implementation boundaries.

### Phase 1: Metadata foundation

Status: implemented.

`src/utils/smoke-test-meta.js` creates and maps smoke metadata.

Recommended API:

```js
function createTestRunId(now = new Date()) {
  return `smoke-${now.toISOString().replace(/[:.]/g, "-")}`;
}

function createSmokeTestMeta(options = {}) {
  const now = options.now || new Date();
  const testRunId = options.testRunId || process.env.SMOKE_TEST_RUN_ID || createTestRunId(now);

  return {
    isSmokeTest: true,
    testRunId,
    createdByTest: "smoke",
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
  };
}

function toPostgresSmokeMeta(smokeMeta) {
  return {
    is_smoke_test: smokeMeta.isSmokeTest,
    test_run_id: smokeMeta.testRunId,
    created_by_test: smokeMeta.createdByTest,
    expires_at: smokeMeta.expiresAt
  };
}

module.exports = {
  createTestRunId,
  createSmokeTestMeta,
  toPostgresSmokeMeta
};
```

`src/utils/smoke-test-schema.js` adds shared MongoDB schema fields and indexes. It also auto-tags new documents when `SMOKE_TEST_RUN_ID` is set, unless `SMOKE_TEST_AUTO_TAG=0`.

Recommended MongoDB smoke indexes:

```js
schema.index({ isSmokeTest: 1, testRunId: 1 });
schema.index({ isSmokeTest: 1, expiresAt: 1 });
```

TTL indexes may be added only after confirming the model stores temporary smoke-only data safely. TTL should be a fallback, not the primary cleanup path.

### Phase 2: Smoke fixture tagging

Status: partially implemented.

Persistent smoke setup scripts and factories should use one shared `testRunId`. The shared MongoDB schema plugin auto-tags new documents when `SMOKE_TEST_RUN_ID` is present, and `src/scripts/run-smoke-tests.js` sets that variable for the smoke gate.

MongoDB model areas to cover when a smoke flow creates them:

- `User`
- `OrganiserApplication`
- `Event`
- `Registration`
- `Submission`
- `AccumulatedActivitySubmission`
- `Notification`
- `PrivacyPolicy`
- blog models such as `Blog`, `BlogComment`, `BlogLike`, `BlogRevision`, `BlogReport`, and `BlogView`
- badge models such as `BadgeContent` and `BadgeTemplate`
- shop Mongo content models such as `ShopProductContent`, `ShopMediaMetadata`, `ShopOrderNotes`, and `ShopPolicySnapshot`
- communication models such as `CommunicationLog`, `CommunicationSetting`, `CommunicationEventSetting`, and `DailyEmailUsage` only when smoke setup creates isolated records for them
- `RunningGroup` and `RunningGroupActivity` if smoke flows create community data
- `StravaConnection` only if a smoke flow creates test OAuth connection records

Supabase/Postgres table areas to cover when a smoke flow writes to them:

- Identity and migration: `app_users`, `organisers`, `migration_records`
- Policy/audit: `policy_consents`, `audit_critical`
- Events: `events_core`, `event_distances`, `event_categories`
- Registration/payment: `registrations`, `payments`
- Submission/certificate/ranking: `submissions_core`, `certificates`, `rankings`
- Onsite operations: `race_kits`, `bib_assignments`, `check_ins`, `result_imports`, `onsite_results`
- Badges: `event_badges`, `user_badges`, `badge_audit_logs`
- Shop: `products_core`, `product_variants`, `inventory_movements`, `orders`, `order_items`, `shop_payments`, `shop_fulfilment_logs`, `shop_platform_fees`, `achievement_merchandise_rules`

Global seed/config tables such as `badge_definitions` should not be deleted by routine smoke cleanup unless a smoke run explicitly creates test-only definitions tagged with smoke metadata.

### Phase 3: Cleanup script

Status: implemented.

Created:

```txt
src/scripts/cleanup-smoke-tests.js
```

Added package scripts:

```json
{
  "scripts": {
    "smoke:cleanup": "node src/scripts/cleanup-smoke-tests.js",
    "smoke:cleanup:dry": "node src/scripts/cleanup-smoke-tests.js --dry-run --expired",
    "smoke:full": "node src/scripts/run-smoke-tests.js"
  }
}
```

`smoke:full` runs through `src/scripts/run-smoke-tests.js`, which calls cleanup after the smoke gate even if smoke validation fails.

Required CLI options:

```bash
node src/scripts/cleanup-smoke-tests.js --dry-run
node src/scripts/cleanup-smoke-tests.js --test-run-id smoke-2026-05-23-001
node src/scripts/cleanup-smoke-tests.js --expired
node src/scripts/cleanup-smoke-tests.js --force-production
```

Script requirements:

- Refuse destructive cleanup when `NODE_ENV=production` unless `--force-production` is supplied.
- Require either `--test-run-id` or `--expired`; do not run broad cleanup by default.
- Count records before deleting.
- Delete children before parents.
- Print a clear summary.
- Exit non-zero on serious cleanup or validation failure.
- Support dry run without deleting database records or R2 objects.

### Phase 4: Safety and verification

Status: implemented in the cleanup script for non-dry-run cleanup.

After cleanup, validate that no records remain for the target `testRunId`.

The validation should check each implemented cleanup area and fail if any matching smoke records remain.

Example MongoDB validation:

```js
const remaining = await Event.countDocuments({
  isSmokeTest: true,
  testRunId
});

if (remaining > 0) {
  throw new Error(`Cleanup failed. Remaining Event records: ${remaining}`);
}
```

Example Postgres validation:

```sql
select count(*)
from events_core
where is_smoke_test = true
  and test_run_id = 'smoke-2026-05-23-001';
```

Expected result for every cleanup target:

```txt
0
```

---

## Cleanup Order

Clean child records before parent records.

Recommended cross-store order:

```txt
1. R2 objects referenced by smoke records or under a smoke prefix
2. MongoDB notifications, communication logs, comments, likes, views, and transient child records
3. MongoDB badge/shop/blog/content child records
4. MongoDB accumulated activity submissions and submissions
5. MongoDB registrations
6. MongoDB events
7. MongoDB organiser applications
8. MongoDB running groups and activities
9. MongoDB Strava connections
10. MongoDB smoke users
11. Supabase/Postgres badge audit logs and user/event badge links
12. Supabase/Postgres shop payments, fulfilment logs, order items, orders, inventory movements, variants, and products
13. Supabase/Postgres onsite results, imports, check-ins, bib assignments, and race kits
14. Supabase/Postgres certificates, rankings, and submissions_core
15. Supabase/Postgres payments and registrations
16. Supabase/Postgres event_distances, event_categories, and events_core
17. Supabase/Postgres organisers
18. Supabase/Postgres policy_consents, audit_critical, migration_records, and app_users
```

The exact implementation should use tagged filters and foreign-key-aware queries. Parent records must not be deleted first.

---

## Supabase/Postgres Migration Plan

Add smoke metadata columns to tables that can receive smoke-created rows.

Example pattern:

```sql
alter table events_core
add column if not exists is_smoke_test boolean not null default false,
add column if not exists test_run_id text,
add column if not exists created_by_test text,
add column if not exists expires_at timestamptz;

create index if not exists idx_events_core_smoke
on events_core (is_smoke_test, test_run_id, expires_at);
```

Apply the same pattern to required smoke-write tables, including:

```txt
app_users
organisers
events_core
event_distances
event_categories
registrations
payments
submissions_core
certificates
rankings
race_kits
bib_assignments
check_ins
result_imports
onsite_results
event_badges
user_badges
badge_audit_logs
products_core
product_variants
inventory_movements
orders
order_items
shop_payments
shop_fulfilment_logs
shop_platform_fees
achievement_merchandise_rules
policy_consents
audit_critical
migration_records
```

Postgres cleanup is implemented in `src/scripts/cleanup-smoke-tests.js`. Environments must run `npm run supabase:migrate` before Postgres smoke metadata writes and cleanup can work. If the migration has not been applied yet, cleanup treats missing smoke metadata columns as zero matching rows.

---

## R2 Cleanup Plan

Current upload keys are smoke-aware when `SMOKE_TEST_RUN_ID` is set. Default keys remain category/user based.

Default key examples:

```txt
payments/proofs/{userId}/...
results/proofs/{userId}/...
event-branding/banner/{userId}/...
event-branding/logo/{userId}/...
event-branding/poster/{userId}/...
event-branding/gallery/{userId}/...
event-payments/qr/{userId}/...
blog/covers/{userId}/...
blog/gallery/{userId}/...
```

Smoke-run key examples:

```txt
smoke-tests/{testRunId}/payments/proofs/...
smoke-tests/{testRunId}/results/proofs/...
smoke-tests/{testRunId}/event-branding/banner/...
```

`src/services/upload.service.js` now applies the smoke prefix automatically when `SMOKE_TEST_RUN_ID` is present (unless `SMOKE_TEST_OBJECT_PREFIX=0`).

`src/scripts/cleanup-smoke-tests.js` now deletes:
- R2 keys collected from smoke-tagged MongoDB records.
- All objects listed under `smoke-tests/{testRunId}/` when `--test-run-id` is supplied.

Do not delete all objects under a generic user/category prefix unless that prefix is smoke-only.

`src/services/upload.service.js` exposes both `deleteObjects(keys)` and `listObjectKeysByPrefix(prefix)` and the cleanup script uses both paths.

---

## End-to-End Smoke Flow

The smoke runner should use one `testRunId` from setup through cleanup.

Recommended flow:

```txt
1. Generate or read SMOKE_TEST_RUN_ID.
2. Create all smoke records with smoke metadata.
3. Upload smoke files with smoke-traceable R2 keys.
4. Run the smoke journey.
5. In a finally block, run cleanup by testRunId.
6. Validate that no smoke records or files remain for testRunId.
7. Exit with the original smoke failure if validation failed before cleanup, or with cleanup failure if cleanup failed.
```

`src/scripts/smoke-supabase-live-sync.js` currently syncs recent existing records and does not create tagged smoke data. If it becomes a persistent data smoke runner, it should be updated to generate/tag its own records and call cleanup in `finally`.

---

## Logging Format

Cleanup should print a concise summary.

Example:

```txt
Smoke test cleanup summary
Test Run ID: smoke-2026-05-23-001
Expired Cleanup: false
Dry Run: false
Production Forced: false

MongoDB
- Notification: 4 deleted
- Submission: 1 deleted
- AccumulatedActivitySubmission: 2 deleted
- Registration: 1 deleted
- Event: 1 deleted
- OrganiserApplication: 1 deleted
- User: 2 deleted

Supabase/Postgres
- badge_audit_logs: 1 deleted
- user_badges: 2 deleted
- certificates: 1 deleted
- rankings: 3 deleted
- submissions_core: 2 deleted
- payments: 1 deleted
- registrations: 1 deleted
- event_distances: 2 deleted
- event_categories: 1 deleted
- events_core: 1 deleted
- organisers: 1 deleted
- app_users: 2 deleted

R2
- objects: 3 deleted
- prefix objects: 3
```

---

## Test Plan

Implemented validation:

- `node --test --test-concurrency=1 tests/smoke-test-cleanup.test.js`
- Focused shadow-sync tests for event, registration/payment, submission, and user bridge services.
- `npm run smoke:cleanup:dry`
- `npm run test:smoke`

Latest validation signals (May 23, 2026):

- `npm run supabase:migrate` applied `015_smoke_test_cleanup_metadata.sql` in the current environment.
- `npm run smoke:cleanup:dry` completed successfully with metadata-scoped MongoDB and Supabase/Postgres checks and no runtime cleanup errors.

Future implementation tests:

- Add broader integration tests for destructive cleanup against a seeded disposable database.
- Add cleanup ordering tests using mocked Mongo/Postgres/R2 adapters.
- Add an integration smoke seed in a non-production database, run dry cleanup, verify counts remain, run destructive cleanup, then verify zero records remain.
- Run `npm run supabase:migrate` in each environment before depending on Postgres smoke cleanup.

## Staging Verification Runbook (One Command)

Use this in a staging or production-like environment after deploying the latest cleanup code.

PowerShell one-command verification:

```powershell
$runId = "smoke-staging-$(Get-Date -Format 'yyyyMMdd-HHmmss')"; $env:SMOKE_TEST_RUN_ID = $runId; npm run supabase:migrate; npm run smoke:full; node src/scripts/cleanup-smoke-tests.js --dry-run --test-run-id $runId --audit-log-file logs/smoke-cleanup-audit.jsonl
```

What this command does:

1. Generates one shared `testRunId` for the full staging smoke run.
2. Applies pending Supabase/Postgres migrations, including smoke metadata migration when not yet applied.
3. Runs smoke tests through `smoke:full`, which always runs cleanup in a `finally` path.
4. Runs a post-cleanup dry verification scoped to the same `testRunId` and appends audit evidence to `logs/smoke-cleanup-audit.jsonl`.

Pass criteria:

1. `npm run supabase:migrate` shows no migration failures (skip/applied are both acceptable).
2. `npm run smoke:full` exits with status `0`.
3. The final dry-run summary for `--test-run-id <runId>` reports zero remaining smoke records/files for that run.
4. `logs/smoke-cleanup-audit.jsonl` includes an entry for the same `testRunId` with `dryRun: true` and section summaries.

Failure handling:

1. If migration fails, stop rollout and fix DB connectivity/migration issues first.
2. If smoke tests fail but cleanup succeeded, treat as functional smoke failure (not cleanup regression).
3. If cleanup validation fails (remaining smoke records/files), block release and investigate model/table cleanup gaps before re-running.

## Legacy Untagged Smoke Data Report (No Deletion)

Use this report before touching older untagged data. This script does not modify records.

Default command:

```bash
npm run smoke:report:legacy
```

Tagging command (safe-by-default dry run):

```bash
node src/scripts/tag-legacy-smoke-candidates.js --test-run-id legacy-smoke-backfill-YYYYMMDD
```

Expanded tagging command (includes linked candidates such as Event and Submission records tied to registration/user candidates):

```bash
node src/scripts/tag-legacy-smoke-candidates.js --test-run-id legacy-smoke-backfill-YYYYMMDD --include-linked
```

Apply tagging before cleanup:

```bash
node src/scripts/tag-legacy-smoke-candidates.js --test-run-id legacy-smoke-backfill-YYYYMMDD --apply
node src/scripts/cleanup-smoke-tests.js --test-run-id legacy-smoke-backfill-YYYYMMDD
```

Optional scoped command examples:

```bash
node src/scripts/report-legacy-smoke-candidates.js --since-days 180 --limit 500 --output logs/legacy-smoke-candidates-180d.json
node src/scripts/report-legacy-smoke-candidates.js --include-tagged --output logs/legacy-smoke-candidates-all.json
```

What it reports:

1. Potentially legacy smoke-like records in key MongoDB models that are currently untagged by default.
2. Candidate reasons only, including smoke/test keywords, test email domains, and `smoke-tests/` storage key patterns.
3. A JSON report with per-model scanned counts and candidate entries.

Safe handling process for old data:

1. Run the report and review candidates manually.
2. Approve records that are genuinely legacy smoke artifacts.
3. Tag approved records with smoke metadata (`isSmokeTest`, `testRunId`, `createdByTest`, `expiresAt`).
4. Run cleanup by `testRunId` or `--expired` after tagging.

Do not run direct destructive deletion based only on report keyword matches.

Latest legacy backfill execution (May 23, 2026):

1. Report generated: `logs/legacy-smoke-candidates.json` with 500 candidates.
2. Tagging applied with `testRunId=legacy-smoke-backfill-20260523`.
3. Cleanup by run id deleted 250 `Registration` records and 250 `User` records.
4. Post-cleanup dry verification by run id returned zero remaining records/files.

Expanded legacy backfill execution (May 23, 2026):

1. Refreshed report generated 584 candidates after linked-candidate enrichment.
2. Tagging applied with `testRunId=legacy-smoke-backfill-20260523c` and `--include-linked`.
3. Cleanup by run id deleted:
  - `User`: 371
  - `Registration`: 129
  - `Submission`: 30
  - `Event`: 54
  - R2 objects: 10
4. Post-cleanup dry verification by run id returned zero remaining records/files.

---

## Safety Checklist Before Implementation Is Considered Complete

- [x] `src/utils/smoke-test-meta.js` exists.
- [x] Persistent smoke-created Mongo records can include `isSmokeTest`, `testRunId`, `createdByTest`, and `expiresAt`.
- [x] Persistent smoke-created Supabase/Postgres rows can include `is_smoke_test`, `test_run_id`, `created_by_test`, and `expires_at` after migration.
- [x] Cleanup script lives at `src/scripts/cleanup-smoke-tests.js`.
- [x] Package scripts point to `node src/scripts/...`.
- [x] Cleanup supports `--dry-run`.
- [x] Cleanup supports `--test-run-id`.
- [x] Cleanup supports `--expired`.
- [x] Cleanup refuses production by default.
- [x] Cleanup deletes child records before parent records.
- [x] R2 cleanup uses keys collected from smoke-tagged records.
- [x] Smoke-only R2 prefix listing exists.
- [x] Smoke runner executes cleanup after the smoke gate.
- [x] Final validation fails if matching smoke records remain.
- [x] Local/dev migration run includes `015_smoke_test_cleanup_metadata.sql`.
- [x] Legacy untagged smoke candidate report exists (`smoke:report:legacy`) and does not delete data.
- [x] Legacy candidate tagging script exists (`smoke:tag:legacy`) with dry-run default and explicit `--apply`.
- [x] Expanded linked-candidate tagging is available via `--include-linked`.
- [ ] Supabase migration has been applied in staging/production environments.

---

## Suggested Future Codex Task Prompt

```txt
Extend sustainable smoke test data cleanup for HelloRun using docs/smoke-test-cleanup-guide.md as the source of truth.

Requirements:
1. Apply and verify src/db/migrations/015_smoke_test_cleanup_metadata.sql in the target environment.
2. Add smoke-only R2 prefix listing and deletion for smoke-tests/{testRunId}/.
3. Add a disposable integration seed that creates smoke-tagged MongoDB, Supabase/Postgres, and R2 records.
4. Verify dry-run cleanup keeps seeded records.
5. Verify destructive cleanup removes seeded records and final validation fails if anything remains.
6. Extend persistent smoke setup scripts so all created records share one testRunId.
7. Do not delete data based only on title, slug, email, or name.
```
