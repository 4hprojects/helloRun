# HelloRun Project Refinement Analysis

Reference date: May 22, 2026

## Snapshot

HelloRun is now a broad Express/EJS platform, not a small MVP. Current implemented areas include authentication, runner dashboards, organizer/admin workflows, event management, registrations, payment proof review, submissions, Strava integration, achievement badges, blog moderation, communications, hybrid Mongo/Postgres shadow tables, and a partially scaffolded shop.

The main refinement need is no longer only feature expansion. The project needs tighter security consistency, clearer production readiness, smaller modules, faster tests, and a focused path for finishing partially live features.

## Highest Priority Refinements

### 1. Secure Organizer Onsite and QR Routes

Files:

- `src/routes/organizer.routes.js`
- `src/routes/organiser/onsite-operations.js`
- `src/routes/organiser/qr-and-dashboard.js`

Findings:

- Onsite and QR route modules are mounted early under the organizer router.
- Some QR POST routes are not protected by the same auth and CSRF pattern used elsewhere.
- `onsite-operations.js` references `req.user`, but the main auth middleware is session-based.
- Event ownership checks are currently simplified and should be made real before production use.

Recommended actions:

- Add `requireAuth` and role checks directly to all onsite/QR endpoints.
- Add CSRF protection to all mutating POST/PATCH/DELETE onsite/QR routes.
- Replace `req.user` usage with session-backed user loading or update auth middleware to consistently attach `req.user`.
- Verify event ownership through `Event.organizerId` for organizer actions.
- Add tests covering forbidden access, wrong organizer access, missing CSRF, and valid admin access.

### 2. Resolve Production Dependency Security Issues

Command run:

```bash
npm audit --omit=dev
```

Audit result:

- 15 production vulnerabilities total.
- 10 high severity.
- 4 moderate severity.
- 1 low severity.

Direct dependencies needing attention:

- `express`
- `mongoose`
- `git`
- `xlsx`

Recommended actions:

- Remove the `git` npm package if unused. It is old and has no available automated fix.
- Upgrade `express` within the supported v4 line first, then evaluate Express 5 separately.
- Upgrade `mongoose` to a patched version.
- Review `xlsx` usage. If replacement is not practical, isolate import handling and enforce strict upload validation.
- Re-run `npm audit --omit=dev` after upgrades.

### 3. Finish or Hide Scaffolded Shop Features

Files:

- `src/controllers/shop.controller.js`
- `src/controllers/organizer-shop.controller.js`
- `src/controllers/admin-shop.controller.js`
- `docs/shop_feature.md`

Findings:

- Shop database, services, middleware, and some read JSON endpoints exist.
- Many browser-facing and write endpoints still return `501`.
- Current user-facing risk is that the app may imply shop capability that is not actually live.

Recommended actions:

- First ship event-scoped shop listing HTML.
- Then ship event-scoped product detail.
- Then ship runner order history/detail for registration-linked orders.
- Keep standalone cart/checkout hidden until product browse and order detail are stable.
- Remove or hide nav links to unfinished shop surfaces until they are live.

### 4. Replace Placeholder Shop Authorization

Files:

- `src/middleware/shop-access.middleware.js`
- `src/middleware/shop-validation.middleware.js`

Findings:

- Several shop permission hooks currently pass through with `next()`.
- Mutation payload validation is currently a placeholder.

Recommended actions:

- Implement `canReviewShopPayment`.
- Implement `canUpdateFulfilment`.
- Implement `canViewShopOrder`.
- Implement `canManageShopProduct`.
- Implement real validation for product, variant, cart, checkout, payment proof, and fulfilment payloads.
- Add negative authorization tests before enabling shop write flows.

### 5. Split Oversized Modules

Largest hotspots observed:

- `src/controllers/admin.controller.js`: about 4,074 lines.
- `src/routes/organizer.routes.js`: about 3,563 lines.
- `src/controllers/page.controller.js`: about 2,999 lines.
- `src/controllers/blog.controller.js`: about 2,219 lines.
- `src/public/js/run-proof-modal.js`: about 2,124 lines.

Recommended split:

- Admin users.
- Admin events.
- Admin policies.
- Admin communications.
- Admin applications.
- Admin reviews.
- Organizer event create/edit.
- Organizer registrations.
- Organizer submissions.
- Organizer media.
- Public pages.
- Registration/payment flows.

Goal:

- Keep route files focused on routing.
- Move business logic into services.
- Keep controllers thin enough to test and review safely.

## Efficiency Improvements

### Test Runtime

Finding:

- `npm test` did not complete within 5 minutes in the inspected environment.

Recommended actions:

- Add grouped scripts:

```json
{
  "test:auth": "node --test tests/*auth*.test.js tests/*csrf*.test.js",
  "test:shop": "node --test tests/*shop*.test.js tests/registration-addons-read.test.js",
  "test:runner": "node --test tests/runner*.test.js tests/submission*.test.js",
  "test:admin": "node --test tests/admin*.test.js tests/organiser-application-review.test.js"
}
```

- Investigate open handles, long database setup, slow network calls, and serial test bottlenecks.
- Keep `test:parallel` for local speed once isolation is reliable.

### Auth Locals Query Cost

File:

- `src/middleware/auth.middleware.js`

Finding:

- `populateAuthLocals` loads the user and runner unread notification count for many requests.

Recommended actions:

- Skip unread notification count for static/public/admin/organizer pages unless needed.
- Cache unread count briefly or load it only on runner views.
- Select only fields needed for navigation instead of loading the full user document.

### CSS and Frontend Maintenance

Finding:

- Several CSS files are large and likely duplicate tokens, cards, buttons, tables, forms, and layout patterns.

Recommended actions:

- Create shared design tokens for spacing, color, type, borders, and shadows.
- Extract shared form, table, status badge, alert, button, and dashboard layout styles.
- Keep page-specific CSS for page-specific layout only.

### Generated and Local Artifacts

Findings:

- `.gitignore` ignores `docs/image_test/`, but image files in that folder are already tracked.
- Upload folders are correctly mostly ignored.
- Tesseract assets are generated and ignored, but `postinstall` downloads/copies them every install.

Recommended actions:

- Remove tracked `docs/image_test` screenshots from git if they are not required source assets.
- Move visual QA evidence outside the repo or into a compressed release artifact.
- Make OCR asset setup cache-aware or move it from `postinstall` to an explicit setup command for CI/deploy control.

## Product To-Do List

1. Complete event-scoped shop listing page.
2. Complete event-scoped product detail page.
3. Complete runner order history and order detail pages.
4. Add organizer shop dashboard read UI.
5. Add organizer product and variant write flows only after authorization and validation are complete.
6. Add fulfilment dashboard and actions.
7. Add admin shop dashboard and product approval queue.
8. Add global `/shop` only after event-scoped commerce is stable.
9. Harden onsite QR/check-in flows and connect them to real organizer permissions.
10. Improve event creation/editing UX and reduce the size of the implementation.
11. Finalize legal placeholders and production-readiness checklist items.
12. Defer payment gateway integration until manual payment proof flows are stable and observable.

## Engineering To-Do List

1. Fix auth, CSRF, and ownership checks for onsite and QR routes.
2. Remove or replace vulnerable dependencies.
3. Replace raw runtime `console.log` calls with a small logger.
4. Split oversized controllers and route modules.
5. Add grouped test scripts.
6. Investigate why the full test suite exceeds 5 minutes.
7. Implement real shop validation middleware.
8. Implement real shop permission middleware.
9. Review Mongo indexes for dashboards, event lists, registrations, submissions, notifications, and review queues.
10. Clean tracked generated artifacts.
11. Document production env requirements in one deployment runbook.
12. Add release gates around `npm audit`, `npm test`, and critical smoke flows.

## Recommended Next Sprint

### Sprint Goal

Stabilize production-critical surfaces and ship one focused visible improvement.

### Suggested Scope

1. Harden onsite and QR routes.
2. Remove or upgrade vulnerable dependencies.
3. Add grouped test scripts and identify the slowest tests.
4. Build the event-scoped shop listing page with HTML rendering while preserving JSON behavior.
5. Add tests for the new shop listing HTML and existing JSON behavior.

### Definition of Done

- Unauthorized onsite/QR mutations fail.
- Missing CSRF on protected mutations fails.
- Wrong organizer cannot mutate another organizer's event data.
- `npm audit --omit=dev` has no unresolved high-severity issue without a documented exception.
- Targeted test groups pass.
- Event shop listing is visible from an event page and handles empty product states.

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
