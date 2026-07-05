# Test-Suite Assessment — Full Codebase Analysis (July 5, 2026)

**Scope:** coverage map, unit vs. integration split, live-DB runnability under the no-staging constraint, test quality.

## Composition (98 test files)
| Type | Count | Notes |
|---|---|---|
| `*.unit.test.js` | 35 | DB-free where they follow the preferred mocked pattern |
| `*.integration.test.js` | 56 | ~41 connect to a live MongoDB and/or the live Postgres client |
| `*.smoke.test.js` | 6 | Server-spawning; may leave open handles on teardown (known) |

Runner: `src/scripts/run-test-group.js` → `node --test --test-concurrency=1`. Named groups in `package.json` (`test:auth`, `test:runner`, `test:organizer`, `test:admin`, `test:services`, …) map cleanly onto feature areas — good ergonomics.

## The core problem: integration tests vs. no staging
- **~41 of 56 integration tests** reference `MONGODB_URI` / `mongoose.connect` / `getPostgresClient()` directly. With a single `.env` whose `APP_URL` matches production and no staging tier (confirmed in `CLAUDE.md`), **running these connects to the production database.** They are therefore effectively un-runnable as a safe CI gate today — which is exactly the incident that produced the July 1–2 orphaned-fixture cleanup.
- This makes the 3 items in the STATUS "live-DB verification backlog" (admin Phases 1–2, permission tiers, run-proof smarts) structurally stuck: the tests that would verify them can't be run safely.

### Recommendation
Continue the migration the team already started: prefer **DB-free `*.unit.test.js` with mocked Mongoose statics / injected `sql` client** over live integration tests. The models for this already exist and are good:
- `tests/test-data-cleanup-service.unit.test.js` and the new `tests/test-user-cleanup-service.unit.test.js` (dependency-injected `sql`, mocked models) — this is the pattern to copy.
- The `*-source.unit.test.js` family (`admin-route-source`, `admin-permission-tier-source`, `admin-export-source`, `event-promotion-source`) asserts route/middleware wiring by inspecting source — a pragmatic way to verify authz coverage without a DB.

Backfill DB-free unit tests for the three stuck backlog features, then treat the live integration tests as *supervised, one-off* tools rather than an automated suite.

## CSRF coverage gap in the harness
- `run-test-group.js:12` sets `CSRF_PROTECTION=0` **by default**, so the standard test run exercises the app with CSRF disabled. Only `tests/csrf-route-guards.integration.test.js` re-enables it. Net effect: CSRF enforcement is validated by exactly one test file, and every other mutation-route test proves nothing about CSRF. Consider running the suite (or a subset) with CSRF on to catch missing tokens in forms/fetch calls. (See SEC-E — the kill-switch itself should also be neutered in production.)

## Coverage observations
- **Well covered:** auth/abuse, admin governance + route-source wiring, permission tiers, blog workflow, shop read paths, submission service, achievements, certificates, event promotion, shadow-sync bridges.
- **Thin / worth adding:** the security-relevant view-rendering (no test would have caught SEC-A — add a rendering test asserting author-controlled fields are HTML-escaped in `blog-review.ejs`); the auth-guard error paths (COR-B — a test that makes `User.findById` reject and asserts `next(err)` is called); `PASSWORD_RESET_EXPIRY` defaulting (COR-C).
- **Smoke tests** leave open handles on teardown — low priority, already tracked; keep them out of the fast unit loop.

## Quality
Where tests follow the mocked/injected pattern they are clean, focused, and fast. The weakness is not test *quality* but test *runnability*: too much of the assertion value is locked behind live-DB integration tests that can't be run without risking production. Shifting that value into DB-free unit tests is the single highest-impact testing improvement.
