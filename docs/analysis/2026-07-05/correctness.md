# Correctness & Bugs — Full Codebase Analysis (July 5, 2026)

**Scope:** logic errors, race conditions, unhandled promise rejections, Mongo↔Postgres shadow-sync consistency, error handling.

Severity key: **Critical · High · Medium · Low**.

---

## COR-A · `/healthz/sync` is dead — always returns 403
- **Severity:** Medium
- **Location:** `src/server.js:133` (route) vs. `:208` (session middleware)
- **Description:** The `GET /healthz/sync` handler is registered at line 133, but the session middleware is not mounted until line 208. Express runs middleware in registration order, so at the time this handler executes `req.session` is always `undefined`, the `req.session?.role !== 'admin'` guard is always true, and the endpoint returns 403 for everyone — including a legitimately logged-in admin. The sync-health dashboard/endpoint is effectively unreachable.
- **Fix:** Move the `/healthz/sync` route registration to after `app.use(session(...))` (i.e. below line 224), alongside the other authenticated routes. `/healthz` and `/readyz` correctly need no session and can stay where they are.

## COR-B · Async auth guards have no error handling → request hangs on DB error
- **Severity:** Medium
- **Location:** `src/middleware/auth.middleware.js` — `requireAdmin` (140), `requireFullAdmin` (165), `requireOrganizer` (179), `requireApprovedOrganizer` (193), `requireCanCreateEvents` (207)
- **Description:** These are `async` functions that `await User.findById(...)` with **no `try/catch`**. Express 4 does not catch rejected promises from middleware, so a transient Mongo error inside any of them produces an unhandled rejection and the request never receives a response — it hangs until the 30 s request-timeout in `server.js:55` fires (503). The sibling middleware `organizer-event-access.middleware.js` and `shop-access.middleware.js` *do* wrap their bodies in `try/catch` and call `next(error)`, so this is an inconsistency as much as a bug.
- **Fix:** Wrap each guard body in `try/catch (err) { next(err); }` (or extract a shared `asyncGuard` wrapper). Low effort, removes a whole class of hangs.

## COR-C · `PASSWORD_RESET_EXPIRY` misconfig silently breaks every reset link
- **Severity:** Medium
- **Location:** `src/routes/authRoutes.js:774`
- **Description:** `passwordResetExpires: new Date(Date.now() + parseInt(process.env.PASSWORD_RESET_EXPIRY))`. If the env var is unset or non-numeric, `parseInt(undefined)` is `NaN`, `Date.now() + NaN` is `NaN`, and `new Date(NaN)` is an Invalid Date. The reset email still sends, but the stored expiry can never satisfy `passwordResetExpires: { $gt: Date.now() }` at redemption time, so **100% of reset links fail** with "invalid or expired" — a silent, hard-to-diagnose production breakage tied entirely to one env var.
- **Fix:** `const ttl = Number(process.env.PASSWORD_RESET_EXPIRY) || 60 * 60 * 1000;` with a sane default, and fail-fast at boot (like the existing `SESSION_SECRET` check) if it's required.

## COR-D · Timing-webhook signature check throws 500 on a wrong-length signature
- **Severity:** Low–Medium
- **Location:** `src/routes/webhooks/timing-system.js:43`
- **Description:** `crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))` throws a `RangeError` when the two buffers differ in length (Node requirement). `hmac` is always 64 hex chars; an attacker (or a misconfigured sender) supplying a signature of any other length triggers the throw. There's no `try/catch` in the middleware, so it surfaces as a generic 500 instead of a clean 401 — noisier logs and a slightly different oracle than intended.
- **Fix:** Guard first: `if (signature.length !== hmac.length) return res.status(401)...;` then compare. Consider wrapping the handler in try/catch too.

## COR-E · Multi-store purge is not atomic across Mongo and Postgres
- **Severity:** Low (accepted trade-off, worth documenting)
- **Location:** `src/services/test-user-cleanup.service.js:367` (`purgeTestUsers`); same shape in `test-data-cleanup.service.js`
- **Description:** Postgres deletion runs first inside a single transaction (good — fail-closed), but the subsequent MongoDB cascade (`clearActorReferences`, `cascadeDeleteOwnedMongoData`, `User.deleteMany`) is a sequence of independent operations with no cross-store transaction. If a Mongo step throws midway, Postgres shadow rows are already gone, leaving a partially-purged state. For an admin-triggered, re-runnable, test-fixture cleanup this is acceptable, but the partial-failure mode should be documented and the operation made safely idempotent (re-running finishes the job).
- **Fix:** None required now; add a note in the service header and ensure each step tolerates already-deleted inputs (it largely does, via `$in` on possibly-empty sets).

---

## What is already handled correctly ✓
- **Process-level guards:** `unhandledRejection` and `uncaughtException` handlers log + report to Sentry; `uncaughtException` exits so the platform can restart cleanly (`src/server.js:15–25`).
- **Password reset race:** eliminated — the redemption path is a single atomic `findOneAndUpdate` that both sets the new hash and clears the token (`authRoutes.js:868`).
- **Self-approval race:** the bulk approval loop uses `Promise.allSettled` and re-checks `canOrganizerReviewPaymentProof` + self-ownership per registration, so partial failures don't abort the batch and skipped items are counted (`review.js:328`).
- **Shadow-sync resilience:** background sync failures are recorded via `recordSyncFailureInBackground` and retried by `pg-sync-worker`; live user-facing writes are never blocked on the Postgres mirror (fire-and-forget with error capture).
- **Purge ordering:** both purge services do Postgres-in-a-transaction *before* any Mongo deletion, and NULL "actor" references rather than deleting parent rows — the correct cascade discipline for a dual-store model.
- **Input coercion:** route handlers consistently `String(...).trim().slice(...)` untrusted input and validate ObjectId/UUID shape via `shop-validation.middleware.js` before querying.
