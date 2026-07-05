# HelloRun — Claude Code Context

## What This Is

HelloRun is a running event management platform. It handles the full lifecycle: event discovery → registration → payment → run proof submission → organiser review → results and certificates.

**Stack:** Node.js · Express · EJS · MongoDB (Mongoose) · PostgreSQL (Supabase) · Redis · Cloudflare R2

**Production:** https://hellorun.online

## Key Commands

```bash
npm run dev          # Start dev server (nodemon)
npm test             # Run full test suite
npm run seed:adsense-blog  # Seed 15 AdSense-quality blog posts to DB
npm run mark-test-events   # Mark existing test events as isTestData:true (sitemap cleanup)
```

## Key Docs

| Doc | Purpose |
|-----|---------|
| `docs/STATUS.md` | **Master source of truth** — completed features, in-progress items, priority backlog |
| `docs/ROADMAP.md` | Session-by-session completion log with feature details |
| `docs/review-backlog.md` | P0–P5 security/UX/infra review (all 26 items resolved Jun 24, 2026) |
| `PRODUCT.md` | Product brief, user personas, brand personality, design principles |
| `docs/architecture/` | DB schema, workflow diagrams, security route matrix |
| `docs/adsense-readiness/` | AdSense implementation status — locally complete, production deployment pending |

## Current Priority (July 2, 2026)

1. **Deploy to production + AdSense** — ops only, no code; all code is done (see STATUS.md In Progress for steps)
2. **Live-DB test verification backlog** — three completed features are source-verified but not yet run against a live MongoDB + PostgreSQL: admin improvements Phases 1–2, admin permission tiers, and the run-proof submission smarts (implausible-single-activity-distance check + OCR "not_detected" auto-approval). Run `npm run test:admin` and `node --test tests/submission.service.integration.test.js` plus the manual smoke checks (rate limits, `support`-tier admin click-through) before treating any of the three as fully verified. See `docs/todo/admin-improvements/` and `docs/to-implement/admin-permission-tiers.md`.
3. **2 leftover placeholder Users** (`purge.runner.*@example.com`, `purge.organizer.*@example.com`) from the test-data-purge verification incident below — harmless but still in the live database, not yet removed.

**Important operational fact (confirmed July 2, 2026): this project has no staging environment.** A single `.env` is used for everything and its `APP_URL` matches production. Live integration tests that write real documents have nowhere safe to run — prefer DB-free unit tests with mocked Mongoose/Postgres clients (pattern: `tests/test-data-cleanup-service.unit.test.js`) over live-DB integration tests going forward.

### Done this session (July 1–2)
- Run-proof submission smarts — accumulated-challenge target defaults to event calendar year, category-aware OCR mismatch warnings, implausible-single-activity-distance check; runner dashboard "Missed Submissions" section + recency-sorted status view
- Submission auto-approval audit script (`src/scripts/audit-submission-auto-approval.js`) + admin correction tool (full-tier-admin-only, gated behind `requireFullAdmin`)
- OCR auto-approval fix — "name not detected" now auto-approves like "matched" (audit showed the name-check caught nothing the confidence/suspicious-activity checks didn't already catch)
- Fixed a test fixture that was silently exercising the wrong accumulated-distance target, masking whether the new distance-plausibility check actually worked
- Admin test-data purge — `/admin/events?testData=1` full-tier-admin-only permanent-delete action (`src/services/test-data-cleanup.service.js`), cascades across MongoDB and 16 Postgres shadow tables; run for real against the live database, purged 336 `isTestData` events plus everything linked to them
- Verification incident + correction — a live integration test connected to production without a target check and left orphaned fixtures behind (cleaned up by the real purge run above); replaced with a DB-free mocked unit test after adding `sql`/audit dependency-injection to the service

### Done previous session (July 1)
- Admin improvements Phase 1 — CSV/XLSX exports for `/admin/{users,audit,analytics}`
- Admin improvements Phase 2 — closed rate-limiting gaps on ~90 admin mutation routes
- Admin improvements Phase 3 — extended security route matrix; deleted dead `onsite-operations.js` (admin, unmounted)

### Done previous session (July 1)
- Admin improvements Phase 1 — CSV/XLSX exports for `/admin/{users,audit,analytics}`
- Admin improvements Phase 2 — closed rate-limiting gaps on ~90 admin mutation routes
- Admin improvements Phase 3 — extended security route matrix; deleted dead `onsite-operations.js` (admin, unmounted)
- Admin improvements Phase 4 — future-considerations backlog doc (permission tiers, email templates, impersonation)
- Admin permission tiers — `User.adminTier` (full/support), `requireFullAdmin` middleware gating 24 high-risk routes, privilege-escalation guards in the user-edit flow; promoted from Phase 4 backlog to implemented same session

### Done previous session (June 29–30)
- Homepage CSS polish — 30/40, 0 P0/P1 remaining
- Blog Run Hub UX — all 3 phases complete (`/blog` as Run Hub, intent tiles, audience chips, action panel)
- Structured data / JSON-LD — Organization, BlogPosting, BreadcrumbList, FAQPage all done
- DEBT-1 — `admin.controller.js` split (barrel + `_shared.js` + 6 sub-controllers); 2 live bugs fixed
- DEBT-2 — `organizer.routes.js` split (barrel + `_shared.js` + 8 sub-routers); analytics enhancements
- Event Promotion — `EventPromotion` model, `event.promotion` event key, organiser page, admin page

## Architecture Notes

- **Sessions:** `connect-mongo` — multi-process deployment is safe
- **Auth:** Express sessions + Cloudflare Turnstile on auth forms
- **Uploads:** Cloudflare R2 via multer (5 MB limit, type-validated)
- **Email:** Resend via `src/services/email.service.js`; all sends go through `notify()` in `communication.service.js`; opt-out stored on `User.notificationPreferences.emailOptOut[]` (array of event keys)
- **Workers:** pg-sync-worker (sync retry), communication-retry-worker, blog-scheduler-worker — all wired into server startup
- **Rate limiting:** Shared Redis limiters across auth, submissions, exports, reviews
- **Monitoring:** Sentry APM (conditional on SENTRY_DSN), `/healthz` + `/readyz` endpoints
- **EJS escaping convention (enforced by `tests/blog-template-escaping.unit.test.js`):** use `<%= %>` for everything by default. `<%- %>` is allowed only for: `include(...)`; JSON embedded in `<script>` when written as `JSON.stringify(x).replace(/</g, '<')` (or the blog-post `safeJson` helper) so `</script>` in the data can't terminate the tag; the layout `body`; and server-sanitized HTML fields that pass through `utils/sanitize.js` (`contentHtml`, `policyHtml`, `eventDetailsHtml`, `waiverHtml`, …). Adding a new raw output means extending that test's allowlist deliberately.

## Test Patterns

```bash
node --test tests/admin-governance.integration.test.js
node --test tests/submission.service.integration.test.js
```

Integration tests require live MongoDB + PostgreSQL. Server-spawning smoke tests may leave open handles on teardown (known, low priority).

**No staging environment exists.** A single `.env` is used everywhere and its `APP_URL` matches production — running an `*.integration.test.js` file connects to the real database, not a sandbox. For new tests that touch Mongoose models or the Postgres client, prefer a DB-free `*.unit.test.js` with mocked statics/client (see `tests/test-data-cleanup-service.unit.test.js`) unless a live run is a deliberate, supervised, one-off action.

## Docs Conventions

- `docs/STATUS.md` is updated after every session (add completed rows to table, update In Progress)
- `docs/ROADMAP.md` gets a new "Session Completed (date)" table each session
- `docs/to-implement/` and `docs/implementation/` are **historical design records** — do not treat as active backlog
- `docs/archive/` contains superseded planning files
