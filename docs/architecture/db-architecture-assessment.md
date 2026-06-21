# HelloRun — Hybrid Database Architecture Assessment & Roadmap

**Written:** June 22, 2026
**Author context:** Internal reference for current and future developers
**Related docs:** `database/hellorun_hybrid_database_schema_architecture.md`, `security_route_matrix.md`

---

## 1. Architecture Overview

The app runs three data stores simultaneously, each owning a distinct responsibility:

```
Request → Express (Node.js)
               │
     ┌─────────┼──────────────┐
     ▼         ▼              ▼
  MongoDB   Postgres       R2 (Files)
 (Mongo DB) (Supabase)  (Cloudflare)
```

### MongoDB (Atlas)
Runtime source of truth for auth and document-heavy data:
- Users, sessions, roles, OAuth tokens, email verification
- Events, registrations, submissions (OCR data, review notes)
- Blog, notifications, communication logs
- Running groups, Strava connections, policy content

### Supabase / PostgreSQL
Relational + transactional layer added progressively through 17 migrations:
- **Bridge tables** — `app_users`, `organisers`, `events_core` (Postgres mirrors of MongoDB records, kept in sync via background hooks)
- **Transactional data** — `orders`, `shop_payments`, `order_items` (shop is Postgres-first, not a shadow)
- **Rankings & report views** — leaderboard snapshots, 6 SQL aggregation views
- **Audit & compliance** — `audit_critical`, `policy_consents` (immutable ledger)
- **Platform config** — `shop_platform_config`

### Cloudflare R2
S3-compatible object storage for all binary assets:
- Organiser docs, event banners/logos/gallery
- Payment proofs, run proof screenshots, certificate PDFs
- Product/shop images, blog assets, result import files

---

## 2. Data Ownership Map

| Entity | Primary store | Postgres role | Notes |
|--------|--------------|---------------|-------|
| Users / auth | MongoDB | Bridge (`app_users`) | Sessions stay in MongoDB |
| Events | MongoDB | Shadow (`events_core`) | Core fields mirrored; content stays in Mongo |
| Registrations | MongoDB | Shadow (`registrations`) | Payment status mirrored |
| Submissions | MongoDB | Shadow (`submissions_core`) | OCR data intentionally stays in Mongo |
| Certificates | Split | Primary (`certificates`) | PDFs in R2, metadata in Postgres |
| Rankings | Postgres | Primary (`rankings`) | Computed from MongoDB submissions |
| Shop (orders/payments) | Postgres | Primary | MongoDB only stores product content/media |
| Audit trail | Postgres | Primary (`audit_critical`) | Append-only, never modified |
| Blog | MongoDB | None | Document-native, no Postgres shadow |
| Files | R2 | None | URLs stored in MongoDB/Postgres per entity |

**Sync direction:** MongoDB write → background hook → Postgres shadow update (eventual consistency, fire-and-forget)

**Exception:** Shop writes go directly to Postgres first. MongoDB has no orders collection.

---

## 3. What's Working Well

### Shadow sync was the right incremental strategy
Starting MongoDB-only and layering Postgres progressively avoided a high-risk big-bang migration. Features shipped continuously while the data layer matured. The 17 migrations represent a clean, ordered evolution rather than an emergency rewrite.

### Postgres for commerce is architecturally correct
Orders, inventory, and payments need ACID transactions — something MongoDB's multi-document transactions technically support but at significant operational complexity. Building the shop Postgres-first from Phase 8 was the right call. The shop is now the most reliable subsystem in the codebase.

### R2 for file storage is cost-efficient
Zero egress fees, global CDN distribution, S3-compatible SDK. No concerns here at any scale level the app is likely to reach.

### Audit trail is solid
`audit_critical` and `policy_consents` are append-only Postgres tables that log every critical action (organiser approval, payment review, submission review, certificate issuance). This is a compliance asset.

---

## 4. Real Concerns

### 4.1 Double-write risk — most critical

Every MongoDB write triggers a background Postgres sync hook. The sync is fire-and-forget — there is no retry queue, no dead-letter mechanism, and no observable failure state.

**What this means in practice:**
- If the Postgres connection pool is saturated when a sync fires, the hook throws silently
- The MongoDB record is updated; the Postgres shadow is not
- The two stores are now out of sync with no automatic recovery
- Backfill scripts exist but are manual — they don't run continuously

**Failure scenario:**
```
1. Runner registers for event
2. MongoDB Registration created ✅
3. Background hook fires to sync registrations_core
4. Postgres pool at max connections — hook throws ❌
5. MongoDB has the registration; Postgres does not
6. Leaderboard query against Postgres rankings misses this runner
7. No alert fires; nobody notices until someone checks manually
```

This is the highest-risk pattern in the codebase and should be the first thing addressed.

---

### 4.2 Postgres connection pool is undersized

Default: `POSTGRES_MAX_CONNECTIONS=5`

Five connections shared across all concurrent requests is extremely conservative. Each request that touches Postgres (shop, rankings, audit, settings) holds a connection for the duration of the query. At low traffic this is fine. At 50+ concurrent users hitting shop/reports pages simultaneously, the pool exhausts and requests queue or fail.

The issue is compounded by background sync hooks also competing for connections from the same pool.

---

### 4.3 No session sharing strategy for multi-process deployment

Sessions are stored server-side in memory (or MongoDB via `connect-mongo`, to be confirmed). If the app is ever run as multiple Node processes — PM2 cluster mode, Docker replicas, horizontal scaling — each process has its own session store. A user logged in on process A gets a 302 on the next request if it hits process B.

This is not a problem today if the app runs as a single process. It becomes critical the moment you scale horizontally.

---

### 4.4 Two sources of truth for the same entity

Registrations, events, and users exist in both MongoDB (runtime) and Postgres (shadow). Every feature touching these entities must reason about both databases. This:
- Doubles cognitive load for new developers
- Doubles points of failure per feature
- Makes it unclear which store to query for a given use case
- Creates subtle bugs when the two stores drift (see 4.1)

The architecture document acknowledges this as "shadow layer — MongoDB remains runtime source" but gives no exit timeline. Left unresolved, this compounds as the codebase grows.

---

### 4.5 No read replica or connection pooling middleware

There is no PgBouncer, pgpool, or equivalent. Supabase provides a built-in connection pooler (Supavisor) in Transaction mode, but it is not currently wired. At scale, each Node process opening its own raw Postgres connections can exhaust Supabase's connection limit.

---

## 5. Traffic & Load Assessment

| Traffic level | State | Primary bottleneck |
|--------------|-------|--------------------|
| <100 concurrent users | Stable | None |
| 100–300 concurrent users | Manageable | Postgres pool (5 connections) |
| 300–500 concurrent users | At risk | Pool exhaustion + sync failures |
| 500+ concurrent users | Degraded | Queued/failed Postgres requests |
| Multi-process deployment | Broken | Session store not shared |

The MongoDB layer will not be the bottleneck. Atlas handles horizontal read scaling natively. The constraint is Postgres connectivity and the sync architecture.

---

## 6. Implementation Roadmap

### Priority 1 — Immediate (before significant traffic growth)

#### 1a. Raise Postgres connection pool size
**File:** `.env`
```
POSTGRES_MAX_CONNECTIONS=25
POSTGRES_IDLE_TIMEOUT=30
POSTGRES_CONNECT_TIMEOUT=10
```
Also enable Supabase's built-in Supavisor pooler:
- In Supabase dashboard → Project Settings → Database → Connection Pooling
- Switch to **Transaction mode** connection string for the app
- This lets many Node connections share a small set of actual Postgres server connections

**Impact:** Eliminates pool exhaustion at 100–500 concurrent users. Zero code changes.

---

#### 1b. Add sync failure logging with alerting
**File:** All background sync hooks (search for `InBackground`, `recordCriticalAuditEventInBackground`, post-save hooks in `Event`, `Registration`, `Submission` models)

Add a structured error catch around every background sync that:
1. Logs the failed entity type, entity ID, and error to a `sync_failures` table or a dedicated log stream
2. Marks the MongoDB document with a `_pgSyncPending: true` flag so a recovery worker can find it

Minimal implementation (no new infrastructure):
```js
// wrap every background sync hook
async function safePgSync(entityType, entityId, syncFn) {
  try {
    await syncFn();
  } catch (err) {
    console.error('[pg-sync-failure]', { entityType, entityId, error: err.message });
    // optionally: await markSyncPending(entityType, entityId);
  }
}
```

**Impact:** Makes invisible failures visible. First step toward guaranteed consistency.

---

#### 1c. Add a sync health check endpoint
Create `GET /healthz/sync` (admin-only) that:
- Counts MongoDB documents modified in the last 24h
- Cross-references the corresponding Postgres shadow rows
- Returns a mismatch count and a sample of drifted IDs

This gives you an operational dashboard for data consistency without needing external tooling.

---

### Priority 2 — Medium term (before multi-instance deployment)

#### 2a. Move session store to MongoDB (if not already)
Confirm sessions are persisted via `connect-mongo`. If sessions are in-memory, they don't survive process restarts and won't work across multiple Node instances.

**File:** `src/server.js` or wherever `express-session` is configured
```js
const MongoStore = require('connect-mongo');
app.use(session({
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  // ...
}));
```

MongoDB is the right session store here — it's already the auth source of truth and Atlas handles the scaling. Redis would also work but adds another dependency.

**Impact:** Enables horizontal scaling (PM2 cluster, Docker replicas, multi-dyno).

---

#### 2b. Build a background sync retry worker
Create a lightweight worker process (`src/workers/pg-sync-worker.js`) that:
1. Polls for MongoDB documents with `_pgSyncPending: true` every 60s
2. Attempts to re-sync each pending document to Postgres
3. Clears the flag on success; increments a retry counter on failure
4. After 3 failed retries, moves the record to a `sync_dead_letter` collection for manual review

This converts the fire-and-forget pattern into an at-least-once delivery guarantee.

---

#### 2c. Add Postgres query timeouts
Every Postgres query should have an explicit statement timeout to prevent a slow query from holding a connection indefinitely:
```js
// in postgres.js client config
client = postgres(connectionString, {
  max: Number(process.env.POSTGRES_MAX_CONNECTIONS || 25),
  idle_timeout: 30,
  connect_timeout: 10,
  statement_timeout: 8000  // 8 seconds max per query
});
```

---

### Priority 3 — Long term (architectural cleanup)

#### 3a. Complete the MongoDB → Postgres migration for relational entities

The current shadow sync is a halfway point. The endgame should be:

| Entity | Target state |
|--------|-------------|
| Users / auth | Stay in MongoDB (auth is document-native) |
| Sessions | Stay in MongoDB |
| Events (core fields) | Migrate reads to Postgres `events_core` |
| Registrations | Migrate reads to Postgres `registrations` |
| Submissions (official state) | Migrate reads to Postgres `submissions_core` |
| Submissions (OCR data) | Stay in MongoDB permanently |
| Blog | Stay in MongoDB permanently |
| Notifications | Stay in MongoDB permanently |

**Migration path per entity:**
1. Verify Postgres shadow is current and complete (use health check from 1c)
2. Switch read queries from MongoDB model to Postgres query in a feature-flagged route
3. Run both reads in parallel for 1–2 weeks; log any discrepancies
4. Remove MongoDB read; shadow sync becomes a write-only backstop
5. Eventually remove shadow sync for that entity entirely

This is a multi-month effort. Do it entity by entity, not all at once.

---

#### 3b. Define a clear DB ownership contract in code

Add a `src/db/ownership.js` file that documents which store owns which entity — not as documentation but as enforced convention:

```js
// src/db/ownership.js
// Single source of truth for which DB owns each entity.
// If you're adding a new query, check here first.

module.exports = {
  // MongoDB is primary — Postgres is shadow/sync
  events:        { primary: 'mongodb', postgres: 'shadow' },
  registrations: { primary: 'mongodb', postgres: 'shadow' },
  users:         { primary: 'mongodb', postgres: 'bridge' },

  // Postgres is primary — MongoDB has no counterpart
  orders:        { primary: 'postgres', mongodb: 'none' },
  rankings:      { primary: 'postgres', mongodb: 'none' },
  audit:         { primary: 'postgres', mongodb: 'none' },

  // MongoDB only — no Postgres counterpart needed
  blog:          { primary: 'mongodb', postgres: 'none' },
  notifications: { primary: 'mongodb', postgres: 'none' },
  ocr_data:      { primary: 'mongodb', postgres: 'none' },
};
```

This forces the question "which DB do I query?" to be answered by convention, not guesswork.

---

## 7. Summary

| Concern | Severity | Fix difficulty | Priority |
|---------|----------|---------------|----------|
| Silent sync failures (no retry/alert) | High | Low | 1 — immediate |
| Postgres pool too small (5 connections) | High | Trivial | 1 — immediate |
| No session sharing for multi-process | Medium | Low | 2 — before scaling |
| No sync retry worker | Medium | Medium | 2 — before scaling |
| No query timeouts on Postgres | Medium | Trivial | 2 — before scaling |
| Dual source of truth (Mongo + Postgres) | Medium | High | 3 — long term |
| No DB ownership contract in code | Low | Low | 3 — long term |

The architecture is sound for current traffic. The risks are operational, not structural — most can be mitigated with configuration changes and a small amount of defensive code before the first real load spike hits.
