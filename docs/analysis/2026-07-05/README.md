# HelloRun — Full Codebase Analysis

**Date:** July 5, 2026
**Reviewer:** Claude (fresh-eyes pass)
**Scope:** entire `src/` tree — ~73k lines of JS (71 services, 19 controllers, 25 route files, 34 models, 8 middleware, 24 utils, 2 workers, 39 scripts), 131 EJS views, 98 test files.
**Method:** automated pattern sweeps (audit, dangerous-pattern greps, file inventory) + layer-by-layer reading in dependency order (server → config → middleware → routes → controllers → services → models → utils → views) + a test-suite and dependency assessment. Every Critical/High finding was verified by re-reading the cited `file:line`.

This is a **re-analysis from scratch**, not a diff against the June 24 review. That review's 26 findings were resolved; its four security fixes (SEC-1…SEC-4) were re-checked here and all still hold.

---

## Overall assessment

| Area | Grade | One-line verdict |
|---|---|---|
| Security | A− | Strong authz/CSRF/rate-limiting/upload story; one real stored-XSS via unescaped template output. |
| Correctness | B+ | A few contained bugs — a dead health endpoint, unguarded async middleware, one env-driven silent breakage. |
| Performance | B+ | Solid index/pagination discipline; two unindexed token lookups and a leaky in-memory rate-limit fallback. |
| Code quality | B+ | Clean layering and excellent comments on risky code; three oversized files and a template-hygiene pattern to fix. |
| Dependencies | A− | Zero vulnerabilities; nothing unused; several majors (notably `multer`) worth scheduling. |
| Test suite | B | Good breadth and good mocked-test patterns, but most integration tests can't run safely without staging. |

The application is in good shape. There is **one finding worth fixing before the production push** (SEC-A), and a short list of Medium items that are cheap to close.

---

## Priority backlog

### P0 — fix before the production/AdSense deploy
1. **SEC-A · Stored XSS in `admin/blog-review.ejs`** — author-controlled fields (`title`, `excerpt`, tags, URLs, SEO fields, `contentRaw`) are emitted with unescaped `<%-` into attributes/textareas and execute in the admin's session. Fix = switch those to `<%=`. Low effort, closes a cross-user script-injection into the highest-privilege session. → `security.md`

### P1 — fix soon (cheap, correctness/reliability)
2. **COR-C · `PASSWORD_RESET_EXPIRY` NaN** — if the env var is unset, *every* password-reset link silently fails. Add a default + boot-time validation. → `correctness.md`
3. **COR-A · `/healthz/sync` always 403** — route registered before session middleware; the sync-health endpoint is dead. Move it below `app.use(session())`. → `correctness.md`
4. **COR-B · Unguarded async auth middleware** — `requireAdmin`/`requireFullAdmin`/`requireOrganizer`/… have no try/catch; a Mongo blip hangs the request for 30 s. Wrap in try/catch → `next(err)`. → `correctness.md`
5. **PERF-A · Unindexed token lookups** — add sparse indexes on `passwordResetToken` and `emailVerificationToken`. → `performance.md`

### P2 — hardening & resilience
6. **PERF-B / PERF-C · Rate-limiter fallback leak + permanent Redis-disable** — prune the in-memory bucket Map; stop nulling the Redis client on a transient failure. → `performance.md`
7. **SEC-E · `CSRF_PROTECTION=0` kill-switch** — ignore it (fail-safe) in production; it's also why CSRF is barely tested. → `security.md`, `test-suite.md`
8. **COR-D · Timing-webhook 500 on wrong-length signature** — length-guard before `timingSafeEqual`. → `correctness.md`
9. **SEC-B / SEC-C · Attribute-encoding of `contentHtml`; PDF magic-byte check.** → `security.md`

### P3 — quality / debt (no user-facing urgency)
10. **CQ-2 · Split the three oversized files** (`page.controller.js` 3.5k, `blog.controller.js` 2.6k, `submission.service.js` 2.1k) using the proven barrel + `_shared.js` pattern. → `code-quality.md`
11. **CQ-1 · Template `<%-`/`<%=` convention** sweep + doc note (also closes SEC-A/B durably). → `code-quality.md`
12. **CQ-3 · Unify organiser route auth** onto the existing `protectEventMutation`/`protectEventRead` chains. → `code-quality.md`
13. **CQ-4 · Delete dead code** — `src/config/db.js` (unused) and `src/routes/event.routes.js` (unmounted, byte-identical to `certificateVerification.routes.js`). → `code-quality.md`
14. **CQ-5 · Centralise env config** into a validated boot-time module (would have prevented COR-C). → `code-quality.md`
15. **Test suite** — backfill DB-free unit tests for the stuck live-DB verification backlog; add a rendering test that would have caught SEC-A. → `test-suite.md`
16. **Dependencies** — schedule the `multer` 2.x bump + routine patch bumps. → `dependencies.md`

---

## Reports in this folder
- [`security.md`](security.md) — authz, injection, CSRF/rate-limit, uploads, XSS, secrets, privilege escalation
- [`correctness.md`](correctness.md) — logic bugs, races, unhandled rejections, dual-store consistency
- [`performance.md`](performance.md) — indexes, unbounded queries, memory, request-path work
- [`code-quality.md`](code-quality.md) — duplication, dead code, oversized files, refactoring plan
- [`dependencies.md`](dependencies.md) — audit, outdated/risky, unused
- [`test-suite.md`](test-suite.md) — coverage map, no-staging runnability, quality

## What was verified as already-correct
SEC-1/2/3 fixes hold; admin authorization (`requireAdmin` + `requireFullAdmin` tiering) is thorough and rate-limited; no SQL injection surface (parameterised throughout, allowlisted identifiers in the purge services); upload pipeline re-encodes images through `sharp`; the test-data and test-user purge services are careful, transactional-where-it-matters, and unusually well-documented; auth/session/OAuth handling is solid. Each area report ends with a "handled correctly ✓" section.

> **Constraint honoured:** this was a read-only analysis. No source files were modified and no live-DB commands were run — only these reports and the STATUS/ROADMAP updates were written.
