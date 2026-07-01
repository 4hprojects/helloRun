# Phase 1 — Admin Data Exports (CSV/XLSX)

Status: implemented 2026-07-01. All code written and verified via `node --check`,
require-resolution checks, EJS compile checks, and new isolated unit tests
(`tests/admin-export-source.unit.test.js`, all passing). Full `npm run test:admin`
integration suite could not be run in this environment (no live MongoDB/PostgreSQL
available locally — see CLAUDE.md Test Patterns). Move this file to
`docs/done/admin-improvements/` once the integration suite has been run against a live
DB and confirmed green.

## Objective

Add CSV and XLSX export endpoints for the three admin views that currently have none:
`/admin/users` (user directory), `/admin/audit` (critical audit trail), and
`/admin/analytics` (platform analytics) — reusing the export pattern already shipped on
the organiser side, not reinventing it.

## Why This Matters

Admins currently cannot get data out of these three screens except by eyeballing paginated
HTML tables. The organiser side already solved this problem twice (registrant exports,
shop report exports) with a consistent, working pattern (ExcelJS for `.xlsx`, a manual
`csvEscape()` helper for `.csv`, a dedicated rate limiter, and a critical-audit log entry
per export). Admin exports should look and behave identically so support/finance/compliance
staff get one consistent download experience across the whole platform.

## Reference Implementation (read these first)

- `src/routes/organiser/registrants.js` lines 239-386 — full CSV + XLSX export route
  pair (`GET /events/:id/registrants/export` and `/export-xlsx`), including
  `registrantExportLimiter`, `recordCriticalAuditEventInBackground`, and response headers.
- `src/routes/organiser/_shared.js` lines 946-1034 — `getRegistrantExportData()` (headers/rows
  builder) and `csvEscape()`.
- `src/routes/organiser/_shared.js` lines 114-118 — `registrantExportLimiter` definition
  (`createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 10, message: '...' })`).
- `src/controllers/organizer-shop.controller.js` around line 626 — a second, independent
  `csvEscape()` implementation (confirms the pattern is copy-pasted, not centralized —
  this phase should not create a third copy).
- `docs/implementation/phase-11-shop-reports-settings.md` (if present) — narrative writeup
  of the organiser/admin shop reports work this plan is modeled on.

## Files To Touch

- New: `src/utils/tabular-export.js` — shared `csvEscape(value)`, `buildCsvContent(headers, rows)`,
  `buildXlsxBuffer({ sheetName, headers, rows, creator })` helpers (wraps ExcelJS,
  already a dependency in `package.json`).
- `src/routes/admin.routes.js` — add `adminExportLimiter` (new `createRateLimiter` call
  near the existing three limiters) and six new `router.get(...)` export routes.
- `src/controllers/admin/users.controller.js` — add `exportUsersCsv` / `exportUsersXlsx`.
- `src/controllers/admin-audit.controller.js` — add `exportCriticalAuditCsv` /
  `exportCriticalAuditXlsx`.
- `src/services/critical-audit-query.service.js` — add `listCriticalAuditEventsForExport(filters)`
  (reuses the `where` clauses from `listCriticalAuditEvents`, without the `limit`/`offset`);
  add `'admin.users_exported'`, `'admin.audit_exported'`, `'admin.analytics_exported'` to
  `AUDIT_ACTION_GROUPS.exports`.
- `src/controllers/admin/events.controller.js` — add `exportAnalyticsCsv` /
  `exportAnalyticsXlsx` near `analyticsPage`; reuses `getPlatformAnalytics({ since })`
  from `src/services/platform-analytics.service.js`.
- `src/views/admin/users-list.ejs`, `src/views/admin/audit-trail.ejs`,
  `src/views/admin/analytics.ejs` — add Export CSV / Export XLSX links.
- New test file: `tests/admin-export-source.unit.test.js` (or extend an existing
  `tests/admin*.test.js` file — the glob is already picked up by `npm run test:admin`).

## Tasks

1. **Create the shared export util** (`src/utils/tabular-export.js`). Do not modify
   `src/routes/organiser/_shared.js` or `src/controllers/organizer-shop.controller.js` in
   this phase — leave their existing `csvEscape()` copies untouched to avoid any
   regression risk; the new util is for admin code only (a follow-up cleanup could later
   migrate the organiser files onto it, but that is out of scope here).

2. **Add `adminExportLimiter`** in `src/routes/admin.routes.js`, mirroring
   `registrantExportLimiter`:
   ```js
   const adminExportLimiter = createRateLimiter({
     windowMs: 10 * 60 * 1000,
     maxRequests: 10,
     message: 'Too many exports. Please wait a few minutes and try again.',
     keyFn: (req) => `admin-export|${String(req.session?.userId || 'anon')}`
   });
   ```

3. **User directory export** — in `src/controllers/admin/users.controller.js`, add
   `exportUsersCsv` / `exportUsersXlsx` that:
   - Reuse `normalizeAdminUserFilters(req.query)`, `buildAdminUserQuery(filters)`,
     `getAdminUserSort(filters.sort)` (already imported from `./_shared` at the top of this
     file) — i.e. the same filters as `listUsers`.
   - Cap rows at the existing `ADMIN_USERS_ALL_CAP = 5000` constant already used in
     `listUsers` for `perPage=all` — do not introduce a second cap constant.
   - Select the same fields already queried in `listUsers`
     (`userId email firstName lastName mobile country dateOfBirth gender role
     organizerStatus emailVerified authProvider accountStatus lastLoginAt createdAt`).
   - Register routes in `admin.routes.js`:
     `router.get('/users/export.csv', requireAdmin, adminExportLimiter, adminController.exportUsersCsv);`
     and the `.xlsx` equivalent. Forward the full querystring so "export current filtered
     view" matches the list page, same UX contract as the organiser registrant export.

4. **Audit trail export** — in `src/controllers/admin-audit.controller.js`, add
   `exportCriticalAuditCsv` / `exportCriticalAuditXlsx` calling the new
   `listCriticalAuditEventsForExport(filters)` in
   `src/services/critical-audit-query.service.js`. Reuse the exact `where` predicates from
   `listCriticalAuditEvents` but drop `limit`/`offset`; cap at a safe maximum (recommend
   10,000 rows) to bound the Postgres read. Export columns:
   `action, target_type, target_id, status_from, status_to, notes, ip_address, user_agent,
   actor_mongo_user_id, actor_display_name, actor_email, created_at` (same fields already
   selected in the HTML view). Handle the `DATABASE_URL` unavailable case (see
   `emptyAuditResult`) the same way the HTML view does — do not throw. Register routes in
   `admin.routes.js`.

5. **Analytics export** — in `src/controllers/admin/events.controller.js`, add
   `exportAnalyticsCsv` / `exportAnalyticsXlsx` reusing `getPlatformAnalytics({ since })`
   for the same `range` param (`7d/30d/90d/365d`, default `365d`) as `analyticsPage`.
   Inspect the full return shape of `getPlatformAnalytics()` in
   `src/services/platform-analytics.service.js` before finalizing the export layout —
   since this is a nested aggregate object rather than a flat row list, render it as
   multiple labeled sections in the CSV (blank-line-separated blocks) and as one worksheet
   per top-level section in the XLSX. Register routes in `admin.routes.js`.

6. **Add export links to the three views**, near each view's existing filter form/range
   tabs (`users-list.ejs`, `audit-trail.ejs`, `analytics.ejs`), following whatever CSS
   classes the organiser shop-reports view already uses for its CSV/XLSX buttons, for
   visual consistency.

7. **Audit logging for exports** — call `recordCriticalAuditEventInBackground` in each new
   export handler with actions `admin.users_exported`, `admin.audit_exported`,
   `admin.analytics_exported`, matching the `organiser.registrants_exported` convention in
   `src/routes/organiser/registrants.js`. Add these three new action strings to
   `AUDIT_ACTION_GROUPS.exports` in `src/services/critical-audit-query.service.js`
   (currently only `organiser.registrants_exported` and `organiser.shop_orders_exported`)
   so admin exports are visible in the existing "Exports" filter/anomaly-signal group
   instead of being invisible to it.

8. **Tests** — add source-level assertions (mirroring
   `tests/organizer-route-source.unit.test.js`) that all six new routes in
   `src/routes/admin.routes.js` are wrapped by `adminExportLimiter`, plus integration tests
   asserting correct `Content-Type`/`Content-Disposition` headers and non-empty buffers for
   both CSV and XLSX, and a 429 after `maxRequests + 1` rapid calls (pattern:
   `tests/rate-limiter-enforcement.integration.test.js`).

## Acceptance Criteria

- `GET /admin/users/export.csv` and `/export.xlsx` download the currently-filtered user
  list, capped at 5,000 rows, with a visible warning when capped (consistent with the
  existing `perPage=all` cap warning in `listUsers`).
- `GET /admin/audit/export.csv` and `/export.xlsx` download the currently-filtered
  critical audit rows.
- `GET /admin/analytics/export.csv` and `/export.xlsx` download the current range's
  platform analytics.
- All six routes require `requireAdmin`, share `adminExportLimiter`, and write a
  `recordCriticalAuditEventInBackground` entry tagged with one of the three new export
  actions.
- The three new export actions appear under the existing "Exports" filter group on
  `/admin/audit`.
- `npm run test:admin` passes, including the new export tests.
- No behavior change to any organiser export route or file.

## Agent Prompt

```txt
You are working on the HelloRun codebase (Node/Express/EJS, MongoDB + Postgres/Supabase
hybrid). Complete Phase 1 of the admin improvements plan: add CSV/XLSX exports to
/admin/users, /admin/audit, and /admin/analytics.

Before editing:
1. Read src/routes/organiser/registrants.js (lines 239-386) and
   src/routes/organiser/_shared.js (lines 114-118, 946-1034) to understand the exact
   existing export pattern (ExcelJS + csvEscape + rate limiter + audit log entry).
2. Read src/routes/admin.routes.js in full and confirm current line numbers for the
   analytics/users/audit routes (they may have shifted since this plan was written).
3. Read src/services/critical-audit-query.service.js and
   src/services/platform-analytics.service.js in full to understand the exact data shapes
   you'll be exporting.

Tasks:
1. Create src/utils/tabular-export.js with shared csvEscape/buildCsvContent/buildXlsxBuffer
   helpers. Do not modify existing organiser export files.
2. Add an adminExportLimiter to src/routes/admin.routes.js (createRateLimiter, 10 requests
   per 10 minutes, keyed by session userId).
3. Add exportUsersCsv/exportUsersXlsx to src/controllers/admin/users.controller.js reusing
   the existing filter-building helpers from ./_shared.
4. Add exportCriticalAuditCsv/exportCriticalAuditXlsx to
   src/controllers/admin-audit.controller.js, plus a new
   listCriticalAuditEventsForExport() in critical-audit-query.service.js that reuses the
   existing WHERE clauses without pagination, capped at 10,000 rows.
5. Add exportAnalyticsCsv/exportAnalyticsXlsx to src/controllers/admin/events.controller.js
   reusing getPlatformAnalytics().
6. Wire all six routes into admin.routes.js behind requireAdmin + adminExportLimiter.
7. Add Export CSV/XLSX links to the three admin views.
8. Record a recordCriticalAuditEventInBackground entry per export, using new action
   strings admin.users_exported / admin.audit_exported / admin.analytics_exported, and add
   them to AUDIT_ACTION_GROUPS.exports.
9. Add/extend tests under tests/admin*.test.js covering headers, row counts, and rate
   limiting.

Acceptance checks:
- All six export endpoints return correct content-type and non-empty file bodies.
- npm run test:admin passes.
- No organiser export route or file changed behavior.

Report the files changed.
```
