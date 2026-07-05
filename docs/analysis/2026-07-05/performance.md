# Performance & Scalability — Full Codebase Analysis (July 5, 2026)

**Scope:** N+1 queries, missing/unverified indexes, unbounded queries, sharp/tesseract memory, blocking work on the request path.

Severity key: **High · Medium · Low**.

---

## PERF-A · Password-reset & email-verification token lookups are unindexed collection scans
- **Severity:** Medium
- **Location:** `src/models/User.js:131` (`emailVerificationToken`), `:137` (`passwordResetToken`); queried in `src/routes/authRoutes.js:811`, `:939`
- **Description:** Both token fields are declared as plain `String` with **no index**. Every `GET /reset-password/:token`, `POST /reset-password/:token`, and `GET /verify-email/:token` runs `User.findOne({ <token>: hashedToken, ... })`, which is a full `users` collection scan. It's fine at today's scale but grows linearly with total users and is trivially abusable (each malformed verification/reset link forces a scan). Note these are also the endpoints least protected by rate limits (verify-email has none).
- **Fix:** Add sparse indexes: `userSchema.index({ passwordResetToken: 1 }, { sparse: true })` and `{ emailVerificationToken: 1 }, { sparse: true }`.

## PERF-B · In-memory rate-limit fallback grows without bound
- **Severity:** Medium
- **Location:** `src/middleware/rate-limit.middleware.js:5` (`buckets` Map), `:7` (`inMemoryCheck`)
- **Description:** When Redis is unavailable, limiter state falls back to a module-level `Map` that is **never pruned** — expired windows are overwritten only if the *same key* is seen again. Under real traffic the key space is `path|user|ip`, so the Map accumulates one entry per unique key forever, a slow memory leak that doubles as a cheap memory-exhaustion vector (spray unique IPs/paths). It's also per-process, so limits are inconsistent across a multi-process deployment when Redis is down.
- **Fix:** Periodically sweep expired buckets (e.g. a `setInterval` GC pass, or lazily evict on read when `now - start > windowMs` for a sampled subset), and cap the Map size. Treat Redis as required in production (see PERF-C / the Redis resilience note in `dependencies.md`).

## PERF-C · Redis is disabled permanently after a transient startup failure
- **Severity:** Medium (reliability/perf)
- **Location:** `src/config/redis.js:23`
- **Description:** `redisClient.connect().catch(() => { redisClient = null; })` — a single failed initial connect nulls the client for the entire process lifetime. `retryStrategy` also gives up after 3 attempts. So a brief Redis blip at boot silently downgrades *all* rate limiters to the leaky in-memory fallback (PERF-B) until a full restart, with no self-healing and no alarm.
- **Fix:** Keep the client and let ioredis reconnect (don't null it); surface a health signal (`/readyz` already checks Redis — wire an alert to it) rather than degrading silently.

## PERF-D · Image re-encoding runs synchronously on the upload request path
- **Severity:** Low
- **Location:** `src/services/upload.service.js:686` (`sharp(...).webp().toBuffer()`)
- **Description:** Every non-webp image upload is decoded and re-encoded by `sharp` inline before the R2 PUT. `sharp` is fast and native, and uploads are bounded to 5 MB and rate-limited, so this is acceptable — but it's CPU + memory on the request path, and gallery/certificate flows loop over up to 12 files sequentially (`await` in a `for` loop). Worth being aware of for burst uploads.
- **Fix (optional):** Parallelise the per-file loops with a small concurrency cap, or move heavy branding/certificate re-encodes to a worker if upload latency becomes a complaint. No action needed today.

## PERF-E · `populateAuthLocals` queries the DB on every request
- **Severity:** Low
- **Location:** `src/middleware/auth.middleware.js:74`
- **Description:** For every authenticated request it does a `User.findById(...).select(...).lean()`. It's a single indexed `_id` lookup with a projection, and the runner unread-notification count is cached in-session for 30 s, so this is fine at current scale — flagged only as the first thing to cache (short-TTL user cache) if request volume climbs.

---

## What is already handled correctly ✓
- **Index coverage is broad:** 34/34 models carry indexes (25 via `.index()`, the rest via inline `unique: true` / `index: true`); `User.email` and `User.googleId` are unique-indexed. The token fields in PERF-A are the notable gap.
- **Request timeout guard** (`server.js:55`) kills hung requests at 30 s before they exhaust the Mongo connection pool (`maxPoolSize: 20`).
- **Pagination discipline:** shop and admin list endpoints validate and cap `limit` (`shop-validation.middleware.js:27`, cap 100) and slice bulk inputs (e.g. bulk approval caps at 50 registrations).
- **Non-blocking side effects:** emails, compliance sync, achievement evaluation, audit logging, and `lastLoginAt` updates are all fire-and-forget with error capture, keeping them off the user's critical path.
- **Redis-backed limiters + APM:** shared Redis limiters across auth/submissions/exports/reviews; Sentry tracing at 10% sample in prod; `/healthz` + `/readyz` liveness/readiness split.
- **Static assets** are served with 1-day cache + ETag/Last-Modified in production.
