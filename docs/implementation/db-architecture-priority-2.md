# DB Architecture Priority 2 — Sync Retry Worker + Query Timeouts

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026
**Tests:** 17/17 auth (subset) + 6/6 unit passing
**Spec:** P3 from `docs/ROADMAP.md`, `docs/architecture/db-architecture-assessment.md`

---

## Problem

The sync failure logging (Priority 1, migration 018) makes failures *visible* via `sync_failure_log` and `/healthz/sync` — but does nothing to *recover* them. Failed MongoDB→Postgres syncs accumulate silently until manual intervention. Under traffic, drift grows unchecked.

Additionally, no Postgres query timeout is set, meaning a slow or hung query holds a connection indefinitely until the pool exhausts.

---

## What Was Built

### Step 1 — Migration 020: Retry tracking columns
- `src/db/migrations/020_sync_failure_retry_count.sql`
- Adds `retry_count INT NOT NULL DEFAULT 0` and `last_retry_at TIMESTAMPTZ` to `sync_failure_log`
- `retry_count = -1` is the dead-letter sentinel (stops reprocessing)

### Step 2 — Postgres query timeout
- `src/db/postgres.js` — `statement_timeout` added to client config
- Default: 8000ms (8 seconds), overridable via `POSTGRES_STATEMENT_TIMEOUT` env var
- Prevents slow queries from holding connections indefinitely

### Step 3 — Sync Retry Worker
- `src/workers/pg-sync-worker.js` — **new file**
- Polls every 60 seconds (configurable via `PG_SYNC_RETRY_INTERVAL_MS`)
- Fetches up to 20 unresolved failures with `retry_count >= 0 AND retry_count < 3`, oldest first
- Per sync_type retry logic:

| sync_type | Retry approach |
|-----------|---------------|
| `event` | `Event.findById(entity_id)` → `syncEventShadow()` |
| `registration` | `Registration.findById(entity_id)` → `syncRegistrationPaymentShadow()` |
| `submission` | `Submission.findById(entity_id)` → `syncSubmissionShadow()` |
| `policy_consent` / `user_compliance` | `User.findById(entity_id)` → `syncPolicyConsentsForMongoUser()` |
| `critical_audit` | Dead-lettered immediately — context too sparse to reconstruct |

- On success: `resolved_at = now()`
- On failure: `retry_count++`, `last_retry_at = now()`, `error_message` updated
- After 3 retries: `retry_count = -1` (dead-letter), logged as error
- Skips when `NODE_ENV === 'test'` or `DATABASE_URL` not set
- Clears interval on `SIGTERM`/`SIGINT` for graceful shutdown

### Step 4 — Wire worker into server.js
- `startSyncRetryWorker()` called after `await connectToDatabase()`, before `app.listen()`

---

## Files Changed

| File | Change |
|------|--------|
| `src/db/migrations/020_sync_failure_retry_count.sql` | **New** — retry_count + last_retry_at columns |
| `src/db/postgres.js` | Add `statement_timeout` to client config |
| `src/workers/pg-sync-worker.js` | **New** — full retry worker |
| `src/server.js` | Import + start worker after DB connect |

---

## Configuration (`.env` optional overrides)

```
POSTGRES_STATEMENT_TIMEOUT=8000     # ms, default 8000
PG_SYNC_RETRY_INTERVAL_MS=60000    # ms, default 60000
```

---

## Verification Checklist

- [ ] `npm run supabase:migrate` → migration 020 applied
- [ ] `retry_count` and `last_retry_at` columns exist on `sync_failure_log`
- [ ] Server starts → `[pg-sync-worker] Started (interval: 60000ms)` in logs
- [ ] Syntax check: `node --check src/workers/pg-sync-worker.js` passes
- [ ] `GET /healthz/sync` → 200, still returns failure counts correctly
- [ ] `npm run test:auth` → 44/44 passing
- [ ] Worker does NOT start in test environment
