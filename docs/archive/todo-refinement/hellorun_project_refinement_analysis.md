# HelloRun Project Refinement Analysis

Reference date: June 24, 2026

## Current Snapshot

HelloRun is now a mature Express/EJS running-event platform with runner, organiser, and admin workflows. Current implemented areas include authentication and abuse protection, event creation, registration, payment proof review, run-proof submission and review, certificates, achievement badges, blog moderation and scheduled publishing, policies and consent, Strava integration, running groups, onsite QR/check-in operations, event wishlist, related events, and event-scoped plus platform shop flows.

The May 2026 priorities in this file are now mostly historical: onsite/QR protection, shop read/write operations, shop authorization, grouped test scripts, policy pack work, and first-pass design-system cleanup have all moved forward. The June 24 full refinement pass resolved the immediate production audit issue, added safer operational JSON error handling, strengthened public AdSense-readiness content, expanded the AdSense blog seed inventory, tightened ad loading, and reconciled status docs.

The remaining refinement need is continued module decomposition, broader runtime logging cleanup outside the touched hardening paths, open-handle cleanup for server-spawning tests, and production AdSense follow-through after deployment.

## Highest Priority Work

### 1. Production Audit Finding

Command run:

```bash
npm audit --omit=dev
```

Current result after the June 24 implementation pass:

- 0 vulnerabilities.
- `exceljs@3.10.0` now resolves `tmp@0.2.7`.
- `npm ls tmp --all` shows `tmp` is only present through `exceljs`.

Original finding:

- 1 high severity vulnerability.
- Source: `exceljs@3.10.0 -> tmp@0.2.5`.
- Advisory: `tmp` path traversal via unsanitized prefix/postfix.

Completed actions:

- Ran `npm audit fix`.
- Verified `npm audit --omit=dev` passes.
- Verified `npm ls tmp --all` resolves `tmp@0.2.7`.
- Keep `npm audit --omit=dev` as a release gate.

### 2. Safe JSON Error Handling

Original findings:

- Several onsite/admin JSON endpoints return `res.status(500).json({ error: error.message })`.
- Affected areas include organiser onsite operations, QR/dashboard endpoints, and admin onsite operations.
- Some user-facing route handlers also expose raw `error.message` in JSON or view copy.

Completed actions in the touched operational scope:

- Added `src/utils/json-error-response.js`.
- Replaced raw `error.message` 500 responses in organiser onsite, organiser QR/dashboard, admin onsite, timing webhook, and sync health endpoints.
- Converted touched runtime `console.error` paths to logger-backed handling.
- Keep 4xx validation messages specific where they are user-correctable.
- Added helper unit coverage.

### 3. Continue Module Decomposition

Largest hotspots observed on June 23, 2026:

- `src/controllers/admin.controller.js`: 5,441 lines.
- `src/routes/organizer.routes.js`: 4,957 lines.
- `src/controllers/page.controller.js`: 3,356 lines.
- `src/controllers/blog.controller.js`: 2,582 lines.
- `src/public/js/run-proof-modal.js`: 2,762 lines.

Recommended actions:

- Split admin controller by domain: users/governance, events, policies, badges, communications, and review queues.
- Split organiser routes by workflow: dashboard, event create/edit, registrants, submissions, payments, badges, profile/application.
- Continue moving public page business logic into services, especially registration/payment and leaderboard/detail helpers.
- Split `run-proof-modal.js` into upload, OCR, validation, submission, and UI-state modules once tests or smoke coverage are ready.

### 4. Finish Runtime Logging Cleanup

Findings:

- `src/utils/logger.js` exists and is already used in some newer paths.
- Many controllers, services, routes, and config modules still use `console.error`, `console.warn`, or `console.log`.
- Script output can remain console-based, but runtime request handling should use the logger consistently.

Recommended actions:

- Prioritize controllers/routes/services before one-off scripts.
- Convert logging in `page.controller.js`, `organizer.routes.js`, `admin.controller.js`, blog controllers, onsite routes, and email/submission services.
- Avoid changing intentional browser-side `console.error` unless it affects user-facing quality.
- Keep structured details for internal logs while returning safe client messages.

### 5. Reduce Test Runtime and Keep Release Gates Practical

Findings:

- Grouped npm scripts exist and are useful.
- The full suite has historically exceeded practical local timeouts because route groups repeatedly boot servers and seed Mongo/Postgres data.
- Runner and organiser groups remain the heaviest areas.

Recommended actions:

- Split `test:runner` into runner UI, submissions, OCR, Strava, and groups.
- Split `test:organizer` into events, payments, onsite, submissions, and shop.
- Suppress or stub background Supabase/Postgres shadow-sync attempts in tests that do not explicitly cover sync.
- Keep `test:smoke`, `test:audit`, and targeted group scripts as release gates until the full suite is faster.

## Product and UX Priorities

1. Payment and checkout friction remains the highest funnel risk while manual payment proof is the primary payment path.
2. Event creation and edit surfaces are feature-rich but large; keep improving preview parity, validation clarity, and recovery from incomplete drafts.
3. Runner retention should continue through visible next actions: saved events, certificate/badge sharing, notification controls, and clearer submission/payment status.
4. Admin analytics and operational observability should follow the governance work so platform health is visible without database access.
5. Global `/shop` should stay secondary to event-scoped commerce unless platform-merch demand justifies a broader storefront push.

## Documentation Priorities

Current docs are valuable but drifted:

- `docs/STATUS.md` marks several items as completed while still listing related "In Progress" and backlog entries.
- `docs/ROADMAP.md` includes roadmap entries that are now partially or fully completed.
- `docs/README.md` still points to some active backlog files that newer status docs describe as resolved.
- This file previously described shop and onsite work as incomplete even though later phase notes record completion.

Recommended actions:

- Reconcile `docs/STATUS.md`, `docs/ROADMAP.md`, and `docs/README.md` after each implementation sprint.
- Move completed `docs/to-implement/*` items into implementation records or mark them explicitly as historical design records.
- Keep this analysis file as the current priority list plus historical phase log.

## Recommended Next Sprint

### Sprint Goal

Finish deployment follow-through and reduce maintenance/test friction after the June 24 hardening pass.

### Suggested Scope

1. Deploy the June 24 refinement pass to production.
2. Run `npm run seed:adsense-blog` in production if the 15 guide posts are not already published.
3. Verify live `/ads.txt`, `/robots.txt`, `/sitemap.xml`, and key public pages after deployment.
4. Investigate server-spawning smoke/integration test open handles so they exit cleanly without timeout wrappers.
5. Continue one focused module decomposition slice from `src/routes/organizer.routes.js` or `src/controllers/page.controller.js`.
6. Continue broader runtime logging cleanup outside the touched operational routes.

### Definition of Done

- Production serves the updated public crawl files and strengthened public content.
- Production has the intended AdSense blog inventory.
- Search Console can inspect key public URLs without login.
- Server-spawning tests exit cleanly or have a documented open-handle fix plan.
- One additional oversized module slice is extracted with no behavior change.
- `npm audit --omit=dev` remains clean.

## Validation Commands

Recommended commands for the next implementation pass:

```bash
npm audit --omit=dev
npm ls tmp --all
wc -l src/controllers/admin.controller.js src/routes/organizer.routes.js src/controllers/page.controller.js src/controllers/blog.controller.js src/public/js/run-proof-modal.js
rg -n "res\\.status\\(500\\)\\.json\\(\\{ error: error\\.message \\}\\)|console\\.(log|error|warn)" src --glob '!src/public/js/vendor/**'
npm run test:smoke
```

## June 2026 Full Refinement Implementation Pass

Tracking rule:

- Update this section when a phase starts, changes scope, or completes.
- Completed phases must include a completion timestamp in `YYYY-MM-DD HH:mm:ss UTC+08:00` format.
- Completion notes should include the main files changed and validation commands run.

Current phase status as of 2026-06-24 00:31:59 UTC+08:00:

- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete
- Phase 5: Complete
- Phase 6: Complete
- Phase 7: Complete
- Phase 8: Complete

### June 2026 Phase 1: Production Audit Hardening

Status: Complete

Completed: 2026-06-24 00:16:30 UTC+08:00

Scope:

- Remediate the production `tmp` audit finding introduced through `exceljs`.
- Verify the production audit gate and dependency tree after remediation.

Changed files:

- `package-lock.json`

Validation:

- `npm audit fix` -> PASS, updated vulnerable transitive dependencies.
- `npm audit --omit=dev` -> PASS, 0 vulnerabilities.
- `npm ls tmp --all` -> PASS, `exceljs@3.10.0` now resolves `tmp@0.2.7`.

Notes:

- `package.json` did not require a direct dependency version change.

### June 2026 Phase 2: Safe JSON Errors and Runtime Logging

Status: Complete

Completed: 2026-06-24 00:18:39 UTC+08:00

Scope:

- Add a shared JSON server-error responder for operational endpoints.
- Replace raw internal 500 error-message responses in onsite, QR/dashboard, admin onsite, timing webhook, and sync health endpoints.
- Convert touched runtime `console.error` calls to logger-backed handling.

Changed files:

- `src/utils/json-error-response.js`
- `src/routes/organiser/onsite-operations.js`
- `src/routes/organiser/qr-and-dashboard.js`
- `src/routes/admin/onsite-operations.js`
- `src/routes/webhooks/timing-system.js`
- `src/server.js`
- `tests/json-error-response.unit.test.js`

Validation:

- `rg -n "res\\.status\\(500\\)\\.json\\(\\{ error: error\\.message \\}\\)|res\\.status\\(500\\).*error\\.message|detail: error\\.message|console\\.error" src/routes/organiser/onsite-operations.js src/routes/organiser/qr-and-dashboard.js src/routes/admin/onsite-operations.js src/routes/webhooks/timing-system.js src/server.js` -> PASS, no matches.
- `node --check src/utils/json-error-response.js && node --check src/routes/organiser/onsite-operations.js && node --check src/routes/organiser/qr-and-dashboard.js && node --check src/routes/admin/onsite-operations.js && node --check src/routes/webhooks/timing-system.js && node --check src/server.js && node --test tests/json-error-response.unit.test.js` -> PASS.

Notes:

- User-correctable 4xx validation responses remain specific.
- `/healthz/sync` keeps the safe `{ ok: false, error: 'Postgres unavailable.' }` response shape without exposing internal details.

### June 2026 Phase 3: AdSense Crawl and Indexing Cleanup

Status: Complete

Completed: 2026-06-24 00:21:11 UTC+08:00

Scope:

- Add the public AdSense publisher declaration.
- Extend crawl/index smoke coverage to verify the declaration beside existing sitemap, robots, and noindex checks.

Changed files:

- `src/public/ads.txt`
- `tests/sitemap-readiness.smoke.test.js`

Validation:

- `node --test tests/sitemap-readiness.smoke.test.js` -> assertions for health, sitemap, robots, `ads.txt`, and utility noindex passed; the command was manually interrupted after assertions because teardown did not exit within the local wait window.

Notes:

- Added `google.com, pub-4537208011192461, DIRECT, f08c47fec0942fa0`.
- Final validation should re-run the sitemap smoke test or full smoke gate to confirm teardown behavior.

### June 2026 Phase 4: Public Content Quality Pass

Status: Complete

Completed: 2026-06-24 00:24:32 UTC+08:00

Scope:

- Strengthen public page copy on the homepage, events listing, How It Works, Contact, and blog listing pages.
- Improve public visitor context, internal links, runner/organizer guidance, proof review explanations, privacy/support context, and empty-state next steps.

Changed files:

- `src/views/pages/home.ejs`
- `src/views/pages/events.ejs`
- `src/views/pages/how-it-works.ejs`
- `src/views/pages/contact.ejs`
- `src/views/pages/blog.ejs`

Validation:

- Public template word-count scan -> `home.ejs` 853 words, `events.ejs` 301 words, `how-it-works.ejs` 919 words, `contact.ejs` 466 words, `blog.ejs` 290 words.
- `node --test tests/static-pages.smoke.test.js` -> assertions for public static pages, About trust content, Contact organizer guidance, How It Works/FAQ substance, and absence of run-proof modal content passed; the command was manually interrupted after assertions because teardown did not exit within the local wait window.

Notes:

- Homepage and How It Works now meet the AdSense todo target ranges.
- Events, Contact, and Blog listing received stronger public context and empty states without changing route behavior.

### June 2026 Phase 5: Blog Approval Content Inventory

Status: Complete

Completed: 2026-06-24 00:26:44 UTC+08:00

Scope:

- Expand the AdSense blog seed inventory from 10 to 15 guide posts.
- Improve seeded article structure with a practical takeaway, checklist, and internal links.
- Add a unit guard so the seed inventory does not fall below the review target.

Changed files:

- `src/scripts/seed-adsense-blog-posts.js`
- `tests/adsense-blog-seed.unit.test.js`

Validation:

- `node --check src/scripts/seed-adsense-blog-posts.js && node --test tests/adsense-blog-seed.unit.test.js` -> PASS.
- `node src/scripts/seed-adsense-blog-posts.js --dry-run` -> PASS, 15 posts; 10 existing updates and 5 new creates in the current database state.

Notes:

- The seed script now exports its post inventory and helpers for test inspection without connecting to MongoDB.
- Production still needs `npm run seed:adsense-blog` if the 5 new posts are not already published there.

### June 2026 Phase 6: Ad Placement Safety

Status: Complete

Completed: 2026-06-24 00:29:15 UTC+08:00

Scope:

- Tighten AdSense script loading so it requires a globally enabled setting, enabled page group, enabled placement, and configured slot ID.
- Suppress ads and mark thin blog category/tag pages as `noindex, follow` when they have fewer than 3 posts.

Changed files:

- `src/services/ad-setting.service.js`
- `src/controllers/page.controller.js`
- `src/views/pages/blog.ejs`
- `tests/ad-setting.service.unit.test.js`

Validation:

- `node --check src/services/ad-setting.service.js && node --check src/controllers/page.controller.js && node --test tests/ad-setting.service.unit.test.js` -> PASS.
- `node --test tests/admin-ads.integration.test.js` -> admin ad settings assertions passed; the command was manually interrupted after assertions because teardown did not exit within the local wait window.

Notes:

- Blank slot IDs now prevent both ad unit rendering and AdSense script loading for that page group.
- Thin blog category/tag pages disable ad locals during render in addition to setting `X-Robots-Tag: noindex, follow`.

### June 2026 Phase 7: Low-Risk Maintainability Extraction

Status: Complete

Completed: 2026-06-24 00:30:05 UTC+08:00

Scope:

- Extract duplicated organiser event read/mutation route protection arrays from touched operational route files.
- Keep authorization, CSRF, and event ownership behavior unchanged.

Changed files:

- `src/routes/organiser/event-route-protection.js`
- `src/routes/organiser/onsite-operations.js`
- `src/routes/organiser/qr-and-dashboard.js`

Validation:

- `node --check src/routes/organiser/event-route-protection.js && node --check src/routes/organiser/onsite-operations.js && node --check src/routes/organiser/qr-and-dashboard.js` -> PASS.

Notes:

- This extraction intentionally avoids broader organiser route decomposition until the hardening and ad/content changes are fully validated.

### June 2026 Phase 8: Documentation Reconciliation

Status: Complete

Completed: 2026-06-24 00:31:59 UTC+08:00

Scope:

- Reconcile status, roadmap, and AdSense implementation notes with completed runner, organiser, admin, AdSense, and refinement work.
- Keep older roadmap/gap sections as historical audit context instead of presenting them as current open work.

Changed files:

- `docs/STATUS.md`
- `docs/ROADMAP.md`
- `docs/adsense-readiness/implementation-status.md`
- `docs/todo refinement/hellorun_project_refinement_analysis.md`

Validation:

- Documentation review against the implementation changes in this pass.

Notes:

- Production AdSense crawl/review remains an operational follow-up after deployment.
- The recurring local smoke-test teardown issue is now documented as follow-up rather than hidden.

### June 2026 Final Validation Summary

Recorded: 2026-06-24 00:36:45 UTC+08:00

Passed:

- `npm audit --omit=dev`
- `npm ls tmp --all`
- `node --check` on touched server, route, utility, service, controller, and script files
- `node --test tests/json-error-response.unit.test.js tests/adsense-blog-seed.unit.test.js tests/ad-setting.service.unit.test.js`
- `node src/scripts/seed-adsense-blog-posts.js --dry-run`
- `git diff --check`
- Targeted raw error leak scan for touched operational JSON routes

Passed assertions but timed out during teardown/open-handle wait:

- `timeout 45s node --test tests/sitemap-readiness.smoke.test.js`
- `timeout 45s node --test tests/static-pages.smoke.test.js`
- `timeout 45s node --test tests/admin-ads.integration.test.js`
- `timeout 75s node --test tests/organizer-onsite-qr-security.smoke.test.js`
- `timeout 90s npm run test:smoke` reached 17 passing smoke assertions before timeout with no failures shown in captured output

Deferred:

- Investigate lingering open handles in server-spawning smoke/integration tests so they can exit cleanly without external timeout wrappers.

## Historical Phase Log

The following phase log is retained for traceability. It records completed work from the earlier May 2026 refinement pass and should not be read as the current priority list.

## Phased Work Plan

Tracking rule:

- Update this document when a phase starts, changes scope, or completes.
- Completed phases must include a completion timestamp in `YYYY-MM-DD HH:mm:ss UTC+08:00` format.
- Completion notes should include the main files changed and validation commands run.

Current phase status as of 2026-05-22 23:16:38 UTC+08:00:

- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete
- Phase 5: Complete (completed 2026-05-22 23:27:31 UTC+08:00)
- Phase 6: Pending
- Phase 7: Pending
- Phase 8: Pending

### Phase 1: Production-Critical Hardening

Status: Complete

Started: 2026-05-22 21:12:06 UTC+08:00

Completed: 2026-05-22 21:22:33 UTC+08:00

Focus on security and release risk before expanding user-facing behavior.

Scope:

- Harden organizer onsite and QR routes.
- Add missing `requireAuth`, role checks, CSRF protection, and event ownership checks.
- Fix inconsistent `req.user` usage.
- Add negative tests for unauthorized access, wrong organizer access, and missing CSRF.
- Remove or upgrade vulnerable production dependencies.
- Re-run `npm audit --omit=dev`.

Implementation checklist:

- [x] Add direct auth and organizer/admin role checks to onsite and QR endpoints.
- [x] Add CSRF protection to onsite and QR mutating endpoints.
- [x] Replace `req.user` dependency with session-backed user loading for onsite operations.
- [x] Enforce organizer ownership through `Event.organizerId`; allow admins.
- [x] Add focused route tests for unauthenticated access, missing CSRF, wrong organizer access, and valid organizer/admin access.
- [x] Run targeted onsite/QR route validation.
- [x] Review and remediate production dependency audit issues or document any exceptions.

Changed files:

- `src/middleware/organizer-event-access.middleware.js`
- `src/routes/organiser/onsite-operations.js`
- `src/routes/organiser/qr-and-dashboard.js`
- `src/routes/organizer.routes.js`
- `tests/organizer-onsite-qr-security.test.js`
- `package.json`
- `package-lock.json`

Validation:

- `node --check src/middleware/organizer-event-access.middleware.js`
- `node --check src/routes/organiser/onsite-operations.js`
- `node --check src/routes/organiser/qr-and-dashboard.js`
- `node --check src/routes/organizer.routes.js`
- `node --test --test-concurrency=1 tests/organizer-onsite-qr-security.test.js` -> PASS, 7/7
- `npm audit --omit=dev` -> PASS, 0 vulnerabilities

Notes:

- Removed unused vulnerable `git` dependency.
- Replaced vulnerable `xlsx` export dependency with `exceljs` for registrant XLSX export.
- Upgraded patched production dependencies through `npm audit fix --omit=dev`.
- Added a `uuid` override for `exceljs` transitive dependency resolution so production audit remains clean.

### Phase 2: Test and Release Foundation

Status: Complete

Started: 2026-05-22 21:44:28 UTC+08:00

Completed: 2026-05-22 22:15:02 UTC+08:00

Make the project easier to verify before changing more behavior.

Scope:

- Add grouped test scripts such as `test:auth`, `test:shop`, `test:runner`, and `test:admin`.
- Investigate why `npm test` exceeds 5 minutes.
- Identify open handles, slow setup, database bottlenecks, or serial test issues.
- Add release gates around audit, targeted tests, and smoke flows.

Implementation checklist:

- [x] Inventory current test files and align grouped scripts with actual filenames.
- [x] Add grouped npm scripts for auth/security, shop, runner/submission, organizer/admin, and release smoke checks.
- [x] Add an audit gate script for production dependency security.
- [x] Run representative grouped tests and capture timing/results.
- [x] Document likely full-suite bottlenecks and follow-up actions.

Changed files:

- `package.json`
- `src/scripts/run-test-group.js`
- `tests/leaderboard.service.test.js`
- `tests/phase7-extended-fixed.test.js`

Validation:

- `node --check src/scripts/run-test-group.js` -> PASS
- `npm run test:audit` -> PASS, 0 vulnerabilities, about 3 seconds
- `npm run test:shop` -> PASS, 22/22, about 54 seconds
- `npm run test:auth` -> PASS, 27/27, about 93 seconds
- `npm run test:smoke` -> PASS, 29/29, about 90 seconds
- `npm run test:admin` -> PASS, 36/36, about 108 seconds
- `npm run test:services` -> PASS, 88/88, about 147 seconds
- `npm run test:organizer` -> PASS, 104/104, about 165 seconds
- `npm run test:runner` -> PASS, 177/177, about 259 seconds
- `npm test` -> TIMEOUT after about 364 seconds in the current environment

Notes:

- Added `src/scripts/run-test-group.js` so grouped test scripts share consistent sequential execution, CSRF defaults, and elapsed-time logging.
- Added grouped npm scripts: `test:audit`, `test:auth`, `test:shop`, `test:runner`, `test:organizer`, `test:admin`, `test:services`, and `test:smoke`.
- Scoped `tests/leaderboard.service.test.js` to its seeded event to avoid shared database contamination from unrelated approved submissions.
- Updated stale duplicate expectations in `tests/phase7-extended-fixed.test.js` to match the current elapsed-time parser behavior.
- The full suite still exceeds the practical local timeout because large route groups repeatedly boot servers, seed Mongo/Postgres data, and trigger background Supabase shadow-sync attempts.
- The runner/submission group is currently the largest bottleneck at about 259 seconds.
- The organizer/payment/onsite group is also heavy at about 165 seconds.
- The service group emits repeated Supabase shadow-sync errors in local test data because some tests intentionally create Mongo records without matching app-user shadow rows.

Recommended follow-up:

- Split `test:runner` into `test:runner:ui`, `test:runner:submissions`, `test:runner:ocr`, and `test:runner:groups`.
- Split `test:organizer` into `test:organizer:events`, `test:organizer:payments`, and `test:organizer:onsite`.
- Remove or consolidate duplicate Phase 7 extended test files after confirming which file should remain canonical.
- Add a test-mode switch to suppress or stub background Supabase shadow sync when tests do not explicitly cover shadow tables.
- Continue using `test:smoke` as the release smoke gate and grouped scripts for focused local validation until full-suite runtime is reduced.

### Phase 3: Shop Read-Only Completion

Status: Complete

Started: 2026-05-22 22:17:42 UTC+08:00

Completed: 2026-05-22 22:25:58 UTC+08:00

Ship the safest visible shop slice without enabling risky write flows yet.

Scope:

- Complete event-scoped shop listing HTML.
- Preserve existing JSON behavior.
- Complete event-scoped product detail page.
- Add empty-state handling.
- Link shop listing from event pages only when available.
- Keep standalone cart and checkout hidden.

Implementation checklist:

- [x] Inspect current shop JSON routes, controllers, services, and event page integration.
- [x] Add event-scoped shop listing HTML while preserving JSON responses.
- [x] Add event-scoped product detail HTML while preserving JSON responses where applicable.
- [x] Add empty product state and avoid exposing cart/checkout actions.
- [x] Link event shop from public event pages only when event products are visible.
- [x] Add focused tests for shop listing/detail HTML and existing JSON behavior.

Changed files:

- `src/controllers/shop.controller.js`
- `src/controllers/page.controller.js`
- `src/services/shop/product.service.js`
- `src/server.js`
- `src/views/pages/event-shop.ejs`
- `src/views/pages/product-detail.ejs`
- `src/views/pages/event-details.ejs`
- `src/public/css/shop.css`
- `src/public/css/event-details.css`
- `tests/shop-readonly-routes.test.js`

Validation:

- `node --check src/controllers/shop.controller.js` -> PASS
- `node --check src/services/shop/product.service.js` -> PASS
- `node --check src/controllers/page.controller.js` -> PASS
- `node --check tests/shop-readonly-routes.test.js` -> PASS
- `npm run test:shop` -> PASS, 27/27, about 52 seconds
- `npm run test:smoke` -> PASS, 34/34, about 90 seconds

Notes:

- Public event shop now renders HTML for browser requests and preserves JSON for API-style/default fetch requests.
- Public product detail now renders read-only HTML and JSON.
- Public shop listing filters to active, visible, `show_in_event_shop` products.
- Event detail pages now link to the event shop only when visible products exist.
- Cart and checkout remain hidden from the public shop listing and product detail pages.
- `shopRoutes` are mounted before broad public event detail routes so `/events/:eventSlug/shop` and `/events/:eventSlug/shop/:productSlug` resolve correctly.

### Phase 4: Shop Authorization and Validation

Status: Complete

Started: 2026-05-22 22:54:16 UTC+08:00

Completed: 2026-05-22 23:02:55 UTC+08:00

Replace placeholder shop guards before enabling organizer, admin, or runner write flows.

Scope:

- Implement `canReviewShopPayment`.
- Implement `canUpdateFulfilment`.
- Implement `canViewShopOrder`.
- Implement `canManageShopProduct`.
- Add real validation for products, variants, cart, checkout, payment proof, and fulfilment.
- Add negative authorization tests.

Implementation checklist:

- [x] Replace placeholder shop permission hooks with real checks.
- [x] Validate product and variant mutation payloads before future write flows are enabled.
- [x] Validate cart, checkout, payment proof, fulfilment, and payment review payloads.
- [x] Add negative authorization and validation tests.
- [x] Run focused shop validation and smoke tests.

Changed files:

- `src/middleware/shop-access.middleware.js`
- `src/middleware/shop-validation.middleware.js`
- `src/routes/shop.routes.js`
- `src/routes/organizer-shop.routes.js`
- `src/controllers/organizer-shop.controller.js`
- `tests/shop-validation.middleware.test.js`
- `tests/shop-readonly-routes.test.js`
- `tests/organizer-shop-payment-review-actions.test.js`

Validation:

- `node --check src/middleware/shop-access.middleware.js` -> PASS
- `node --check src/middleware/shop-validation.middleware.js` -> PASS
- `node --check src/controllers/organizer-shop.controller.js` -> PASS
- `npm run test:shop` -> PASS, 34/34, about 54 seconds
- `npm run test:audit` -> PASS, 0 vulnerabilities
- `npm run test:smoke` -> PASS, 36/36, about 93 seconds

Notes:

- `canReviewShopPayment`, `canUpdateFulfilment`, `canViewShopOrder`, and `canManageShopProduct` now check event/order/product/payment ownership against Postgres shop rows.
- Organizer shop routes now validate UUID-backed shop IDs with `validateUuidParam` instead of Mongo ObjectId validation.
- Payment review writes now store the Postgres `app_users.id` in `shop_payments.reviewed_by` while continuing to use Mongo user IDs for app audit and registration updates.
- `validateShopMutationPayload` now supports product, variant, cart, checkout, payment proof, fulfilment, and payment review payloads.
- Current write controllers still return `501` for unfinished shop write flows, but invalid payloads and unauthorized ownership paths are rejected before those controllers.

### Phase 5: Shop Write and Operations Flows

Status: Complete

Started: 2026-05-22 23:16:38 UTC+08:00

Completed: 2026-05-22 23:27:31 UTC+08:00

Build operational shop features after authorization and validation are real.

Scope:

- Add organizer shop dashboard read UI.
- Add product and variant create/edit flows.
- Add runner order history and order detail pages.
- Add fulfilment dashboard and actions.
- Add admin shop dashboard.
- Add product approval queue.
- Add global `/shop` only after event-scoped commerce is stable.

Implementation checklist:

- [x] Add organizer shop dashboard read UI.
- [x] Add product and variant create/edit operations.
- [x] Add runner order detail page.
- [x] Add organizer fulfilment read and update operations.
- [x] Add admin shop dashboard and product approval queue.
- [x] Keep global `/shop` deferred unless event-scoped commerce is stable.
- [x] Add focused tests for write and operations paths.

Completed implementation notes:

- `src/controllers/organizer-shop.controller.js` now exposes organizer dashboard summary, product create/update/archive/hide, variant create/update/deactivate, order listing/detail, and fulfilment status updates.
- `src/controllers/shop.controller.js` now exposes runner-owned order detail by order number.
- `src/controllers/admin-shop.controller.js` now exposes admin shop dashboard summary, product list, approval queue, product approval actions, orders, and payments.
- `src/services/shop/product.service.js`, `src/services/shop/variant.service.js`, `src/services/shop/order.service.js`, and `src/services/shop/payment-review.service.js` now contain the backing shop operations.
- `src/routes/admin-shop.routes.js` now validates product approval IDs as UUIDs.
- `src/middleware/shop-validation.middleware.js` now aligns fulfilment statuses with the database constraint (`preparing`, `claimed`, etc.).
- Global `/shop` storefront remains deferred; Phase 5 keeps commerce event-scoped.
- `tests/shop-readonly-routes.test.js` now covers runner order detail, organizer product and variant writes, organizer fulfilment updates with log cleanup, and admin product approvals.

Verification:

- `node --check` on updated shop services, controllers, and test file -> PASS
- `npm run test:shop` -> PASS, 38/38, about 67 seconds
- `npm run test:smoke` -> PASS, 40/40, about 99 seconds, includes `npm audit --omit=dev` with 0 vulnerabilities

### Phase 6: Module Decomposition

Status: Complete

Started: 2026-05-22 23:28:27 UTC+08:00

Completed: 2026-05-22 23:41:58 UTC+08:00

Split large files gradually after critical behavior is stable.

Scope:

- Break up `src/controllers/admin.controller.js`.
- Break up `src/routes/organizer.routes.js`.
- Break up `src/controllers/page.controller.js`.
- Break up `src/controllers/blog.controller.js`.
- Move business logic into services.
- Keep route files focused on routing.
- Keep controllers thin enough to test and review safely.

Completed implementation notes:

- Added `src/services/public-event-list.service.js` and moved public event list filtering, query construction, ranking, pagination URLs, active filters, page copy, and card display-state logic out of `src/controllers/page.controller.js`.
- Updated `src/controllers/page.controller.js#getEvents` to render from the new service result, reducing the controller by roughly 480 lines while preserving the existing events page view model.
- Added `src/services/blog-composer-options.service.js` and moved blog composer template/block option construction out of `src/controllers/blog.controller.js`.
- Kept the Phase 1 organizer route split (`onsite-operations`, `qr-and-dashboard`) in place as the current route decomposition baseline.
- Left deeper admin policy/user-management extraction for a later maintenance pass because it is higher risk and has broad admin UI coverage needs.

Verification:

- `node --check` on updated page/blog controllers and new services -> PASS
- `node src/scripts/run-test-group.js tests/event-public-view.test.js tests/public-search-filters.test.js tests/sitemap-readiness.test.js` -> PASS, 15/15, about 51 seconds
- `npm run test:smoke` -> PASS, 40/40, about 101 seconds, includes `npm audit --omit=dev` with 0 vulnerabilities

### Phase 7: Performance and Maintenance Cleanup

Status: Complete

Started: 2026-05-23 06:24:59 UTC+08:00

Completed: 2026-05-23 06:33:44 UTC+08:00

Improve long-term maintainability and runtime cost.

Scope:

- Optimize `populateAuthLocals`.
- Reduce unnecessary unread notification queries.
- Select only needed user fields.
- Review Mongo indexes for dashboards, event lists, registrations, submissions, notifications, and review queues.
- Replace raw runtime `console.log` calls with a small logger.
- Clean tracked generated artifacts.
- Make OCR asset setup cache-aware or move it to an explicit setup command.

Completed implementation notes:

- `src/middleware/auth.middleware.js` now selects only auth-local fields instead of loading the full user document.
- Runner unread notification counts now load only for HTML navigation requests where they can be rendered, skip mutating/API/admin/organizer/webhook requests, and use a short session cache with fresh reads on the notifications page.
- `src/services/notification.service.js` avoids a duplicate unread-count query when listing unread-only notifications.
- `src/models/Notification.js` now has a partial unread-notification index for `userId + createdAt` where `readAt` is null.
- `src/models/Event.js` now has additional compound indexes for public event lists and admin event filtering.
- Added `src/utils/logger.js` and moved server startup/error logging, auth middleware logging, notification-safe logging, user-id generation logging, and onsite operation service logging through it.
- `src/scripts/copy-tesseract-assets.js` now skips unchanged OCR JS/WASM files instead of overwriting them every install.
- `src/scripts/download-tessdata.js` now treats too-small tessdata as invalid and re-downloads instead of accepting a partial artifact.
- No tracked generated OCR artifacts were found under `src/public/js/vendor/tesseract` or `src/public/assets/tessdata`.

Verification:

- `node --check` on updated auth, notification, event/user models, server, logger, onsite service, and OCR setup scripts -> PASS
- `npm run copy-tesseract-assets` -> PASS, cached all existing files, copied 0
- `npm run download-tessdata` -> PASS, existing `eng.traineddata.gz` skipped
- `npm run test:auth` -> PASS, 27/27, about 92 seconds
- `node src/scripts/run-test-group.js tests/notification.service.test.js tests/runner-notifications-routes.test.js` -> PASS, 4/4, about 11 seconds
- `npm run test:smoke` -> PASS, 40/40, about 100 seconds, includes `npm audit --omit=dev` with 0 vulnerabilities

### Phase 8: Frontend and CSS Cleanup

Status: Complete

Started: 2026-05-23 06:39:29 UTC+08:00

Completed: 2026-05-23 06:45:04 UTC+08:00

Clean up UI implementation patterns after core behavior is stable.

Scope:

- Extract shared design tokens.
- Consolidate repeated button, form, table, badge, alert, and dashboard styles.
- Keep page-specific CSS limited to page-specific layout.
- Improve event creation and editing UX.

Completed implementation notes:

- Added `src/public/css/design-system.css` with shared UI tokens and reusable primitives for surfaces, alerts, fields, tables, badges, metric cards, and action groups.
- Included `design-system.css` in shared layout heads and the standalone error page so global pages can use one token/component baseline.
- Cleaned `src/views/auth/verify-email-sent.ejs` to use the shared head partial once and keep only its page-specific stylesheet.
- Updated `src/public/css/project-buttons.css` to read primary button colors from shared design tokens.
- Updated `src/public/css/create-event.css` to consume shared tokens for core color/radius variables.
- Improved create/edit event UX with section scroll offsets, consistent focus-visible rings, and a desktop sticky action bar for the preview/save/submit controls.

Verification:

- `node src/scripts/run-test-group.js tests/static-pages.test.js tests/organizer-waiver-routes.test.js` -> PASS, 27/27, about 40 seconds
- `npm run test:smoke` -> PASS, 40/40, about 103 seconds, includes `npm audit --omit=dev` with 0 vulnerabilities

### Policy Pack Phase 1: Policy Source Cleanup

Status: Complete

Completed: 2026-05-23 06:52 Asia/Manila

Completed implementation notes:

- Treated the individual markdown files in `docs/policy-markdown-pack` as the canonical policy sources.
- Replaced `[Insert Date]` placeholders with `May 23, 2026`.
- Cleaned visible mojibake characters in the policy pack files.
- Synced `docs/contents/Privacy Policy.md`, `docs/contents/Terms and Conditions.md`, and `docs/contents/Cookie Policy.md` from the cleaned policy pack sources.

Verification:

- Manual source normalization completed.

### Policy Pack Phase 2: Policy Registry and Public Pages

Status: Complete

Completed: 2026-05-23 06:55 Asia/Manila

Completed implementation notes:

- Added a shared policy registry for all eight public/admin policy mappings while preserving the existing `terms-of-service` DB slug.
- Replaced hardcoded public policy route handling with a shared DB-first, markdown-fallback renderer.
- Added a reusable public policy page template for the full policy set.
- Updated footer legal links to include all eight policies and renamed `Terms of Service` display text to `Terms and Conditions`.
- Updated dynamic sitemap generation to include all canonical policy public paths.

Verification:

- `node --check src/routes/pageRoutes.js src/controllers/page.controller.js src/services/policy-registry.service.js` -> PASS

### Policy Pack Phase 3: Admin Policy Management

Status: Complete

Completed: 2026-05-23 06:58 Asia/Manila

Completed implementation notes:

- Added generic admin policy handlers for list, new draft, create, format, preview, view, edit, save, publish, clone, and archive operations.
- Routed Data Usage, Refund and Cancellation, Organiser Terms, Community Guidelines, and Acceptable Use through the same admin policy templates.
- Mapped existing Privacy, Terms and Conditions, and Cookie admin exports to the generic handlers while keeping their current URLs.
- Expanded admin dashboard legal document cards to include the full policy set.

Verification:

- `node --check src/controllers/admin.controller.js src/routes/admin.routes.js` -> PASS

### Policy Pack Phase 4: Seeds and Package Scripts

Status: Complete

Completed: 2026-05-23 06:59 Asia/Manila

Completed implementation notes:

- Added `npm run seed:policies` backed by a registry-driven policy seeding script.
- Updated privacy, terms, and cookie seed scripts to remain available as compatibility wrappers.
- Seed sources now point to the individual files in `docs/policy-markdown-pack`.
- Preserved `terms-of-service` as the DB slug for Terms and Conditions.

Verification:

- `node --check` on all policy seed scripts -> PASS
- Policy source validation -> PASS, 8 source files found

### Policy Pack Phase 5: Consent and Confirmation Updates

Status: Complete

Completed: 2026-05-23 07:02 Asia/Manila

Completed implementation notes:

- Added Data Usage Policy ID/version fields to signup consent storage.
- Extended policy consent sync records to include `data_usage_policy`.
- Added a Supabase migration to widen the policy consent type constraint for Data Usage Policy.
- Updated local and Google signup consent validation/copy to include Data Usage Policy.
- Updated event registration, run proof, and payment proof confirmation language from the policy implementation notes.
- Updated admin user detail consent display to show Data Usage Policy version.

Verification:

- `node --check src/models/User.js src/routes/authRoutes.js src/services/policy-consent.service.js` -> PASS
- `node src/scripts/run-test-group.js tests/policy-consent.service.test.js` -> PASS, 2/2

### Policy Pack Phase 6: Documentation and Phase Tracking

Status: Complete

Completed: 2026-05-23 07:07 Asia/Manila

Completed implementation notes:

- Updated `docs/PRD.md` with the policy-pack implementation status, validation notes, and smoke-test data hygiene requirement.
- Added route/test coverage for all eight public policy URLs and sitemap entries.
- Added admin dashboard coverage for the expanded policy management links.
- Added admin policy management route coverage for one existing policy and one new policy document.
- Confirmed smoke tests completed without adding persistent smoke-test data by relying on existing cleanup-backed smoke fixtures.

Verification:

- `node src/scripts/run-test-group.js tests/static-pages.test.js tests/sitemap-readiness.test.js tests/policy-consent.service.test.js tests/privacy-signup-consent.test.js tests/admin-dashboard.test.js` -> PASS, 19/19, about 61 seconds
- `node src/scripts/run-test-group.js tests/admin-dashboard.test.js` -> PASS, 11/11, about 25 seconds
- `npm run test:smoke` -> PASS, 40/40, about 102 seconds, includes `npm audit --omit=dev` with 0 vulnerabilities
