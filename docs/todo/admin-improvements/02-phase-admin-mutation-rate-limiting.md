# Phase 2 — Admin Mutation Rate Limiting

Status: implemented 2026-07-01. All ~90 previously-unprotected mutating routes in
`src/routes/admin.routes.js` now wrapped by an appropriate limiter (verified via a
source-scan test asserting zero mutating routes are missing a known limiter). Task 0
(fixing the stale `tests/organizer-route-source.unit.test.js`) was done first, since
Task 7 copies its pattern. Verified via `node --check`, a full route-file require/load
check, and `tests/admin-route-source.unit.test.js` (7/7 passing) plus the corrected
`tests/organizer-route-source.unit.test.js` (3/3 passing). Manual 429 smoke-check on
`/admin/promote` and `/admin/communications/test-email` (Task 8) could not be run — no
live server/Redis session in this environment. Move this file to
`docs/done/admin-improvements/` once that manual check has been done against a live
deployment.

## Objective

Close the rate-limiting gaps in `src/routes/admin.routes.js` so every mutating
(`POST`/`PUT`/`PATCH`/`DELETE`) route is covered by one of the existing or newly-added
`createRateLimiter` instances, reusing the same factory and risk-tiering already
established for organiser routes.

## Why This Matters

`src/routes/admin.routes.js` currently defines three limiters (`adminModerationLimiter`,
`adminAccountActionLimiter`, `adminBlogAutosaveLimiter`) and applies them to roughly a
third of its mutating routes. Verified against the live file (186 lines) on 2026-07-01,
approximately 90 mutating routes have **no** rate limiter at all, including:

- Both user-deletion entry points (`POST /users/delete`, `POST /users/:id/delete` — both
  call the same `adminController.deleteUsers`) and `POST /users/:id/edit`.
- `POST /promote` — sends real campaign emails to up to "all_runners"
  (`src/controllers/admin/events.controller.js`, via `notifyWithRetryInBackground`). This
  is the single highest-blast-radius unprotected mutation in the admin panel.
- `POST /communications/test-email` — sends a real email via
  `communicationService.sendTestEmail` (`src/controllers/admin/badges.controller.js`).
- The entire dynamic/static policy-document CRUD surface: 9 POST routes each for
  privacy-policy, terms-and-conditions, and cookie-policy (27 routes), plus — generated in
  a loop — 9 POST routes each for 5 more policy documents (`dataUsage`, `refund`,
  `organiserTerms`, `communityGuidelines`, `acceptableUse`, per
  `src/services/policy-registry.service.js`) = 45 more. 72 unprotected routes from this
  block alone.
- `communications/settings`, `communications/events/:eventKey`, `homepage-carousel`,
  `ads`, badge routes, event edit/media/sitemap, application approve/reject.

`docs/architecture/security_route_matrix.md` already flags this exact class of problem for
organiser routes in its closing note: "Event status and media removal are CSRF-protected
but should still receive dedicated mutation rate limits in the next hardening pass." This
phase is that hardening pass, applied to `/admin/*`.

## Files To Touch

- `src/routes/admin.routes.js` — add new limiters, apply limiters to all currently-bare
  mutating routes.
- `tests/organizer-route-source.unit.test.js` — optional prerequisite fix (see Task 0).
- New: `tests/admin-route-source.unit.test.js` — regex-based source assertions mirroring
  the (fixed) organizer pattern.
- `docs/architecture/security_route_matrix.md` — update the closing note once this phase
  lands (cross-reference with Phase 3, which owns the matrix file itself).

## Tasks

0. **(Optional prerequisite) Fix the stale organizer route-source test.**
   `tests/organizer-route-source.unit.test.js` currently fails 2 of its 3 assertions
   because it reads `src/routes/organizer.routes.js`, which is now a thin barrel (post
   `DEBT-2` split) that no longer contains `registrantExportLimiter` or
   `submissionReviewActionLimiter` — those now live in `src/routes/organiser/registrants.js`.
   Verify with `node --test tests/organizer-route-source.unit.test.js`. Fixing this first
   establishes the exact working pattern to copy in Task 6; if skipped, do not copy the
   currently-broken file paths into the new admin test.

1. **Add three new rate limiters** to `src/routes/admin.routes.js`, alongside the existing
   three, using the same `createRateLimiter` factory from
   `src/middleware/rate-limit.middleware.js`:
   ```js
   const adminContentSettingsLimiter = createRateLimiter({
     windowMs: 10 * 60 * 1000,
     maxRequests: 120,
     message: 'Too many settings/content changes. Please wait and try again.'
   });
   const adminTestEmailLimiter = createRateLimiter({
     windowMs: 60 * 60 * 1000,
     maxRequests: 20,
     message: 'Too many test emails sent. Please wait an hour and try again.',
     keyFn: (req) => `admin-test-email|${String(req.session?.userId || 'anon')}`
   });
   const adminPromotionLimiter = createRateLimiter({
     windowMs: 60 * 60 * 1000,
     maxRequests: 5,
     message: 'Too many promotion campaigns sent. Please wait an hour and try again.',
     keyFn: (req) => `admin-promote|${String(req.session?.userId || 'anon')}`
   });
   ```
   (Numbers above are starting proposals — confirm with the user/product owner before
   finalizing, especially `adminPromotionLimiter`'s threshold given its blast radius.)

2. **Apply `adminAccountActionLimiter`** (existing, already used for notes/verification/
   account-status) to:
   - `POST /users/delete`
   - `POST /users/:id/edit`
   - `POST /users/:id/delete`

3. **Apply `adminModerationLimiter`** (existing, already used for bulk-delete/approve/
   archive/delete/bulk-reject/blog moderation) to:
   - `POST /badges/recalculate`
   - `POST /badge-definitions/:badgeDefinitionId/status`
   - `POST /badge-definitions/:badgeDefinitionId/email`
   - `POST /user-badges/:userBadgeId/revoke`
   - `POST /events/:id/edit`
   - `POST /events/:id/media/remove`
   - `POST /events/:id/sitemap-toggle`
   - `POST /applications/:id/approve`
   - `POST /applications/:id/reject`

4. **Apply `adminContentSettingsLimiter`** to:
   - `POST /communications/settings`
   - `POST /communications/events/:eventKey`
   - `POST /homepage-carousel`
   - `POST /ads`
   - Every `POST` route in the privacy-policy, terms-and-conditions, and cookie-policy
     hardcoded blocks.
   - Every `POST` route generated inside the dynamic policy-document loop — this is a
     single code location, so adding the limiter there covers all 5 generated policy
     documents in one edit.
   - Optional cleanup (nice-to-have, not required for acceptance): the 3 hardcoded blocks
     duplicate the same 9-route shape as the loop; consider refactoring them to also run
     through a small local `registerPolicyMutationRoutes(prefix, controllerNamespace)`
     helper so the limiter (and any future middleware) only needs to be applied once. Do
     this only if it can be done without changing any route path or behavior.

5. **Apply `adminTestEmailLimiter`** to `POST /communications/test-email`.

6. **Apply `adminPromotionLimiter`** to `POST /promote`. Note this route may have an
   explicit inline `requireCsrfProtection` call in addition to the global CSRF middleware
   already applied to all POSTs — this is redundant, not incorrect; you may remove the
   redundant inline call as a small cleanup once you've confirmed nothing else depends on
   it, but it is not required for this phase's acceptance criteria.

7. **Add `tests/admin-route-source.unit.test.js`**, mirroring the corrected version of
   `tests/organizer-route-source.unit.test.js`: read `src/routes/admin.routes.js` as text
   and assert (via regex, `[\s\S]*` between the route path and the limiter name) that each
   route above is now wrapped by its assigned limiter. Follow the exact `fs.readFileSync` +
   `assert.match` pattern already in use.

8. **Manual/automated smoke check**: hitting `POST /admin/promote` or
   `POST /admin/communications/test-email` repeatedly should return HTTP 429 once the
   configured threshold is exceeded (see `tests/rate-limiter-enforcement.integration.test.js`
   for the existing pattern of asserting this behavior).

## Acceptance Criteria

- Every currently-unprotected mutating route enumerated above now passes through one of:
  `adminAccountActionLimiter`, `adminModerationLimiter`, `adminContentSettingsLimiter`,
  `adminTestEmailLimiter`, `adminPromotionLimiter`.
- No route that already had a limiter lost it or had it changed.
- `tests/admin-route-source.unit.test.js` passes.
- `npm run test:admin` passes; if Task 0 was done, `npm run test:organizer` also passes.
- Manual verification: `/admin/promote` and `/admin/communications/test-email` return 429
  after their configured thresholds.

## Agent Prompt

```txt
You are working on the HelloRun codebase. Complete Phase 2 of the admin improvements plan:
close the rate-limiting gaps on mutating /admin/* routes.

Before editing:
1. Read src/routes/admin.routes.js in full (do not assume the line numbers in the plan
   are still exact — this file may have shifted).
2. Read src/middleware/rate-limit.middleware.js to confirm the createRateLimiter API.
3. Read src/routes/organiser/_shared.js for the existing organiser limiter examples
   (paymentReviewActionLimiter, registrantExportLimiter, directMessageLimiter) to match
   style/conventions.
4. Optionally run: node --test tests/organizer-route-source.unit.test.js — if it fails,
   consider fixing it first (see Task 0 in the phase doc) since Task 7 below copies its
   exact pattern.

Tasks:
1. Add three new rate limiters to admin.routes.js: adminContentSettingsLimiter (120 req /
   10 min), adminTestEmailLimiter (20 req / hour, keyed by session), adminPromotionLimiter
   (5 req / hour, keyed by session).
2. Wrap the user delete/edit routes (/users/delete, /users/:id/edit, /users/:id/delete)
   with the existing adminAccountActionLimiter.
3. Wrap badge, event edit/media/sitemap-toggle, and application approve/reject routes with
   the existing adminModerationLimiter.
4. Wrap communications/settings, communications/events/:eventKey, homepage-carousel, ads,
   and every POST route across the privacy-policy/terms-and-conditions/cookie-policy blocks
   and the dynamic policy-document loop with the new adminContentSettingsLimiter.
5. Wrap communications/test-email with adminTestEmailLimiter.
6. Wrap /promote with adminPromotionLimiter.
7. Add tests/admin-route-source.unit.test.js asserting (via source regex, following the
   tests/organizer-route-source.unit.test.js pattern) that each route above is wrapped by
   its assigned limiter.
8. Do not remove or weaken any existing limiter usage.

Acceptance checks:
- npm run test:admin passes.
- New admin-route-source test passes.
- Manually confirm 429s on /admin/promote and /admin/communications/test-email after
  exceeding the configured thresholds.

Report the files changed and the exact routes now covered.
```
