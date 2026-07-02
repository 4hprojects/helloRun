# HelloRun — Full App Review & Roadmap

**Written:** June 22, 2026
**Based on:** Full codebase audit, user journey review, docs review, and security analysis

**Latest reconciliation:** July 2, 2026

---

## Session Completed (July 1–2, 2026)

| Feature | Completed | Notes |
|---------|-----------|-------|
| Run-proof submission smarts + dashboard status view | Jul 1 | Accumulated-distance challenge target now defaults to the event's calendar year when the organiser leaves it blank (client pre-fill in `create-event.ejs`/`edit-event.ejs` + server fallback in `event-form.service.js`); added category-aware OCR mismatch warnings and an implausible-single-activity-distance check for accumulated challenges (`accumulated-activity.service.js`, `submission.service.js`); runner dashboard gained a "Missed Submissions" section for events whose window closed with no proof, using the previously-unused `isSubmissionWindowOpen()`; replaced the raw "Result Submissions" list with a recency-sorted per-event status view reusing the existing Event Progress card pipeline (`runner.controller.js`, `runner-data.service.js`, `dashboard.ejs`) |
| Submission auto-approval audit script + admin correction tool | Jul 1 | New read-only CLI `src/scripts/audit-submission-auto-approval.js` (534 lines) reports why Submission/AccumulatedActivitySubmission docs do or don't auto-approve today, grouped by review-reason, OCR confidence, name-match status, and detected source — first run written to `logs/submission-auto-approval-audit-2026-07-01T15-00-43-575Z.json` and directly motivated the OCR name-match fix below; shared review panel (`submission-review.ejs`) now surfaces `detectedSource`, `validation.method`, `submissionMode`, `autoApprovalEligible`, and raw `reviewReason`; new full-tier-admin-only correction action lets an admin fix run data or override the review outcome without changing status, gated behind existing `requireFullAdmin`/`isFullAdminTier` (invisible to organisers and support-tier admins) |
| OCR auto-approval fix: treat "no name detected" like "matched" | Jul 2 | The audit script showed `ocr_name_not_matched` blocking 28% of accumulated-activity submissions with a 100% "approved anyway" manual-override rate, and every one of those was already independently caught by the confidence threshold or suspicious-activity flag — the name-check wasn't load-bearing. `submission.service.js` now auto-approves OCR name status `not_detected` the same as `matched`, while still blocking `mismatched` (a different name actually found) |
| Test fixture fix: accumulated-challenge distance red flag | Jul 2 | The "auto-approve clean OCR and issue certificate only on completion" integration test set the event's accumulated target to 10km but left the registration's generic `5K` `raceDistance` label unaligned; since `resolveAccumulatedTargetDistanceKm()` prefers a registration's own category over the event target (real, documented per-registrant-tier behavior), the test resolved a target of 5km and a legitimate 6km activity tripped the implausible-single-activity-distance check added above. Aligned the registration's `raceDistance` with the intended target, matching the sibling accumulated snapshot test's existing pattern |
| Admin test-data purge | Jul 2 | New `src/services/test-data-cleanup.service.js`: `getTestDataCounts()` (read-only preview) and `purgeTestData()` cascade-hard-deletes every `Event` flagged `isTestData: true` plus linked Registrations/Submissions/AccumulatedActivitySubmissions/EventPromotions/CertificateTemplates in MongoDB, and the matching shadow rows across 16 Postgres tables (FK-safe order derived from the actual migration files, Postgres transactional and run before any Mongo write); `/admin/events?testData=1` gained a live-count summary and a full-tier-admin-only "Permanently Purge All Test Data" action (password + reason + typed `PURGE` confirmation, reusing the existing bulk-delete confirm-modal pattern); new route `POST /admin/events/test-data/purge` with a dedicated `adminTestDataPurgeLimiter` (5/hour) and `admin.test_data.purged` audit logging; `docs/architecture/security_route_matrix.md` updated. Bonus fix: `deleteEvent`/`bulkDeleteEvents` were calling `verifyAdminDeletionPassword` without ever importing it — a latent `ReferenceError` that would have broken single/bulk event deletion in production, fixed as a side effect of wiring the new handler. **Run for real** against the live database on Jul 2: purged 336 `isTestData` events (up from the 198 counted June 24) plus 336 registrations, 9 submissions, 4 accumulated submissions, 1 promotion, 101 certificate templates, confirming the feature works end-to-end |
| Test-data purge verification incident + correction | Jul 2 | First verification attempt (`tests/test-data-cleanup-service.integration.test.js`) connected to the live database without a target check first — this project has no staging tier (single `.env`, matches production `APP_URL`) — and left orphaned fixture docs behind after an unrelated bug (fixture didn't sync the runner `User` to Postgres `app_users` before `syncSubmissionShadow`, which correctly refused a `NOT NULL` `runner_user_id`) killed the test before `purgeTestData()` was ever called. Root-caused, then replaced with a DB-free `tests/test-data-cleanup-service.unit.test.js` (mocked Mongoose statics + a mocked `postgres.js` client) after adding optional `sql`/audit dependency-injection to the service, matching the existing `achievement.service.js` pattern; the leftover fixture Event (itself tagged `isTestData: true`) was cleaned up by the real purge run above rather than a separate manual delete |

## Session Completed (July 1, 2026)

| Feature | Completed | Notes |
|---------|-----------|-------|
| Admin improvements Phase 1: CSV/XLSX exports | Jul 1 | New `src/utils/tabular-export.js` (csvEscape/buildCsvContent/buildXlsxBuffer/buildMultiSheetXlsxBuffer, wraps ExcelJS); 6 new GET routes behind `requireAdmin` + new `adminExportLimiter` (10/10min, session-keyed): `/admin/{users,audit,analytics}/export.{csv,xlsx}`; `listCriticalAuditEventsForExport()` reuses existing filter predicates, capped at 10k rows; analytics export uses a generic recursive object flattener (survives future `getPlatformAnalytics()` schema changes); 3 new audit action strings added to `AUDIT_ACTION_GROUPS.exports`; fixed a latent missing-`logger`-import bug in `admin-audit.controller.js` hit while adding handlers; `tests/admin-export-source.unit.test.js` (5 tests, DB-free) |
| Admin improvements Phase 2: mutation rate limiting | Jul 1 | ~90 previously-unprotected mutating `/admin/*` routes (incl. both user-delete entry points and `POST /promote`, a mass-email endpoint with zero prior protection) now covered by 3 new limiters (`adminContentSettingsLimiter`, `adminTestEmailLimiter`, `adminPromotionLimiter`) plus existing ones reused where appropriate; removed a redundant inline `requireCsrfProtection` call on `/promote`; fixed `tests/organizer-route-source.unit.test.js`, stale since the DEBT-2 route split; new `tests/admin-route-source.unit.test.js` (7 tests) asserts zero mutating admin routes lack a limiter |
| Admin improvements Phase 3: security matrix + dead code cleanup | Jul 1 | `docs/architecture/security_route_matrix.md` gained an `/admin/*` section (every row cross-checked against live route source before commit); documented (not fixed) the `requireAdmin` vs `requireRole('admin')` guard inconsistency; deleted `src/routes/admin/onsite-operations.js` + its sole dependency `src/services/onsite-operations-bulk.service.js` after confirming via full-tree grep neither was mounted in `server.js` or referenced anywhere (6 endpoints + no-op `verifyAdminAccess` middleware were unreachable dead code) |
| Admin improvements Phase 4: future considerations backlog | Jul 1 | `docs/done/admin-improvements/future-considerations.md` — backlog-level capture (problem statement + rough shape only) of role-based admin permission tiers, admin-editable email template UI, and admin "login as user" impersonation; no code changes |
| Admin improvements plan docs | Jul 1 | `docs/todo/admin-improvements/` (00–02) + `docs/done/admin-improvements/` (03, 04, future-considerations.md) — phased markdown plan with objectives/tasks/acceptance criteria/agent prompts per phase, following the `docs/adsense-readiness/phases/` precedent; Phases 1–2 remain in `todo/` pending live-DB integration test verification and a manual rate-limit smoke check (no MongoDB/Postgres/live server available in the implementing environment) |
| Admin permission tiers | Jul 1 | Promoted from the Phase 4 future-considerations backlog and implemented same session. `User.adminTier` (enum `full`/`support`, default `full` — existing admins never locked out); new `requireFullAdmin` middleware (`src/middleware/auth.middleware.js`) gates 24 routes: user/event deletion, `/promote`, communications settings + test-email, homepage-carousel, ads, all policy-document `:id/publish` routes (hardcoded + dynamic loop), and all 6 Phase-1 export routes; `src/controllers/admin/users.controller.js#updateUser` blocks self-tier-changes and blocks support-tier admins from granting/editing anyone's admin role or tier (closes the "just promote yourself via the edit form" bypass); tier selector + status badges added to `user-edit.ejs`/`users-list.ejs`; `admin.user.admin_tier_changed` audit action added; spec/record at `docs/to-implement/admin-permission-tiers.md`; `tests/admin-permission-tier-source.unit.test.js` (9 tests, DB-free) |

## Session Completed (June 30, 2026)

| Feature | Completed | Notes |
|---------|-----------|-------|
| Structured data / JSON-LD | Jun 30 | `Organization` in `head.ejs` (site-wide, static); `BlogPosting` + `BreadcrumbList` in `blog-post.ejs` (dynamic: `post.*`, `authorDisplay`, `seo.*`); `FAQPage` in `faq.ejs` (all 23 Q&A pairs hardcoded); `safeJson()` helper prevents `</script>` injection; all 3 schemas validated via JSON.parse render test |
| DEBT-1: admin.controller.js split | Jun 30 | 5,682-line monolith → 10-line barrel + `src/controllers/admin/` with `_shared.js` (166 exports), `users.controller.js` (9), `applications.controller.js` (4), `events.controller.js` (12), `badges.controller.js` (17), `submissions.controller.js` (2), `policy.controller.js` (52); `admin.routes.js` unchanged; dead code (lines 3099–5005, ~1,906 lines of overridden per-type policy) excluded; 2 live bugs fixed: missing `evaluateOrganiserAchievementsInBackground` import + undefined `formatPolicyContentFromRequest` |
| DEBT-2: organizer.routes.js split | Jun 30 | 5,530-line monolith → 23-line barrel + 8 sub-routers under `src/routes/organiser/`: `_shared.js` (1,782 lines, 183 exports), `dashboard.js` (452 lines), `event-creation.js` (527 lines), `event-management.js` (906 lines), `registrants.js` (386 lines), `review.js` (1,325 lines), `profile.js` (365 lines), `qr-and-dashboard.js`, `onsite-operations.js`; all `node --check` passes |
| Platform Analytics enhancements | Jun 30 | `/admin/analytics`: date-range tabs (7D/30D/90D/1Y), 5 MongoDB sections (user status, organiser funnel, event breakdown, submission breakdown, run-type distribution with CSS progress bars), `hasSupa` guard for no-Supabase graceful degradation; logger import bug fixed in `platform-analytics.service.js` |
| Event Promotion feature | Jun 30 | New `EventPromotion` model (tracks campaigns + per-organiser daily quota); `event.promotion` event key registered in `communication-events.registry.js` + `communication.service.js`; `sendEventPromotionEmail` in `email.service.js` (poster image, CTA button, opt-out footer); organiser page at `/organizer/promote` (event picker, audience radio, AJAX preview, quota bar, campaign history, 20/day cap); admin page at `/admin/promote` (all events, all-runners audience option, platform quota display, no daily cap); CLAUDE.md Nodemailer→Resend fix |

## Session Completed (June 29, 2026 — evening)

| Feature | Completed | Notes |
|---------|-----------|-------|
| Homepage CSS polish | Jun 29 | Impeccable re-run: 30/40 (up from 27/40), 0 P0/P1; `hero-title` → `clamp(2rem, 5vw, 3.25rem)`; ~130 lines dead CSS removed; `.btn` transition enumerated; blockquote full-border; heart-pop easing fixed |
| Blog Run Hub — Phase 1: route dead code | Jun 29 | Removed dead `GET /blog` + `GET /blog/:slug` from `blog.routes.js`; added route-ownership comment in `server.js` |
| Blog Run Hub — Phase 2: `/blog` listing reframe | Jun 29 | Header renamed to "Run Hub"; 4 intent tiles (Virtual Runs, Training Tips, Race Prep, Organiser Guides); "Featured Guides" heading; intent labels on post cards |
| Blog Run Hub — Phase 3: `/blog/:slug` journey layer | Jun 29 | Audience chips (category-mapped "For: X" + up to 2 tags); Run Action Panel (3 category-mapped quick links); "Next step" CTA strip before related posts; "Continue this path" heading replaces "Related Posts" |
| CSS quality improvements | Jun 29 | `blog.css`: run-hub-tiles, intent-label components; `blog-pages.css`: audience-chips, run-action-panel, post-next-step; blockquote redesigned (full border, no side-stripe); heart-pop easing corrected to ease-out-quint |

## Session Completed (June 25–29, 2026)

| Feature | Completed | Notes |
|---------|-----------|-------|
| PRODUCT.md — product brief, user personas (Runner/Organiser), brand personality, design principles, accessibility targets | Jun 25 | Root-level `PRODUCT.md` added as product source of truth |
| Impeccable live config — detector wired into main layout for in-browser UI critique | Jun 25 | `.impeccable/` config files added |
| Homepage distill pass — cut four redundancies, copy tightened, layout bolder | Jun 25 | `a5d3f7d`, `c61d254` commits; impeccable critique score 27/40 (3 P1 issues remain — see STATUS.md) |
| Admin published blog queue cards — improved card design and information density | Jun 25 | `80a1b82` commit |

---

## Session Completed (June 24, 2026)

| Feature | Completed | Tests |
|---------|-----------|-------|
| Production audit hardening — `tmp` transitive dependency patched through lockfile | Jun 24 | `npm audit --omit=dev`, `npm ls tmp --all` |
| Safe operational JSON errors — generic 500 responses with internal logger details | Jun 24 | `tests/json-error-response.unit.test.js` |
| AdSense crawl files — public `/ads.txt` declaration added | Jun 24 | sitemap smoke assertions |
| Public content quality pass — home, events, How It Works, Contact, blog listing | Jun 24 | static page smoke assertions |
| AdSense blog seed inventory — 15 guide posts, practical takeaway/checklist structure | Jun 24 | `tests/adsense-blog-seed.unit.test.js`, seed dry-run |
| Safer ad loading — script loads only when a configured slot can render; thin category/tag pages noindex/ad-free | Jun 24 | `tests/ad-setting.service.unit.test.js`, admin ad assertions |
| Organiser route protection extraction | Jun 24 | `node --check` route validation |
| Run completion workflow hardening — SQL injection fix, DB indexes (proof.hash/certificate.url/Strava PR), approval latency (cert+notify background), parallel notifications, accumulated cert atomic lock, Redis leaderboard cache, parallel multi-reg submissions, auto Supabase ranking sync | Jun 24 | `ranking.service.unit.test.js` |
| P4 Personal Leaderboard Rank — "Ranked #N of M verified runners" in My Standing card | Jun 24 | — |
| Organizer Workflow Phase 1A — CSRF protection added to payment review, run-proof review, event status, and media removal mutations; security matrix expanded | Jun 24 | `tests/csrf-route-guards.integration.test.js` |
| Organizer Workflow Phase 1B — atomic payment review transitions with stale-action protection and shadow-sync preservation | Jun 24 | `tests/payment-route-guards.integration.test.js` |
| Organizer Workflow Phase 1C — run-proof review transitions guarded by exact-status updates for standard and accumulated submissions | Jun 24 | `tests/submission-review-route-guards.integration.test.js` |
| Organizer Workflow Phase 2A — run-proof review queue uses DB counts/search and bounded sorted fetches before merging standard + accumulated proofs | Jun 24 | `tests/submission-review-route-guards.integration.test.js` |
| Organizer Workflow Phase 2B — payment-proof review queue paginated with exact filtered counts and bounded registration fetches | Jun 24 | `tests/payment-route-guards.integration.test.js` |
| Organizer Workflow Phase 2C — registrants page paginated with DB-side result-status narrowing across standard and accumulated submissions | Jun 24 | `tests/submission-review-route-guards.integration.test.js` |
| Organizer Workflow Phase 3A — organizer dashboard registration/submission metrics collapsed into aggregate facets to reduce count-query fan-out | Jun 24 | `tests/organizer-dashboard-analytics.integration.test.js` |
| Organizer Workflow Phase 3B — registrants summary cards collapsed into grouped aggregation counts for registration and result statuses | Jun 24 | `tests/submission-review-route-guards.integration.test.js` |
| Organizer Workflow Phase 3C — unpaid-payment reminder action batches runner lookup instead of querying once per registrant | Jun 24 | `tests/csrf-route-guards.integration.test.js` |
| Organizer Workflow Phase 4A — runner submit-run modal now shows upload deadline for eligible event targets | Jun 24 | `tests/submission.service.integration.test.js`, `tests/runner-dashboard-modal.integration.test.js` |
| Organizer Workflow Phase 4B — late/closed upload fallback now tells runners why only Personal Record is available | Jun 24 | `tests/submission.service.integration.test.js`, `tests/runner-dashboard-modal.integration.test.js` |
| Organizer Workflow Phase 5A — runner submission eligibility lookup now uses the shared rate limiter to reduce modal refresh storms | Jun 24 | `tests/runner-dashboard-modal.integration.test.js` |
| Organizer Workflow Phase 5B — Strava activity refresh and Strava result submission endpoints now use shared rate limits | Jun 24 | `tests/strava-integration.integration.test.js` |
| Organizer Workflow Phase 5C — organizer registrant CSV/XLSX export routes now use a shared export rate limiter | Jun 24 | `tests/organizer-route-source.unit.test.js` |
| Organizer Workflow Phase 5D — organizer shop report CSV/XLSX export routes now use a shared export rate limiter | Jun 24 | `tests/organizer-route-source.unit.test.js` |
| Organizer Workflow Phase 5E — run-proof single and bulk review mutations now use a dedicated submission review action limiter | Jun 24 | `tests/organizer-route-source.unit.test.js` |
| Runtime Stabilization Phase 6A — accumulated activity service now lazily loads submission helpers to remove circular dependency warnings/failures | Jun 24 | `tests/submission.service.integration.test.js --test-name-pattern accumulated` |
| Runtime Stabilization Phase 6B — submission service tests can run cert/notification background work inline for deterministic certificate/email assertions | Jun 24 | `tests/submission.service.integration.test.js` |
| Runtime Stabilization Phase 6C — submission service tests can suppress shadow/ranking sync side effects for quiet deterministic output | Jun 24 | `tests/submission.service.integration.test.js` |
| Runtime Stabilization Phase 6D — runner screenshot and Strava result submissions now use short-lived Mongo idempotency locks to block concurrent duplicate retries | Jun 24 | `tests/submission-idempotency.service.integration.test.js`, `tests/submission-idempotency-source.unit.test.js`, `tests/submission-routes.integration.test.js` |
| Runtime Stabilization Phase 6E — payment receipt uploads now use short-lived Mongo idempotency locks to block concurrent duplicate retries | Jun 24 | `tests/submission-idempotency.service.integration.test.js`, `tests/submission-idempotency-source.unit.test.js`, `tests/page-controller-payment-proof-sync.unit.test.js` |
| Runtime Stabilization Phase 6F — shop order payment receipt uploads now use short-lived Mongo idempotency locks to block concurrent duplicate retries | Jun 24 | `tests/submission-idempotency-source.unit.test.js`, `tests/shop-runner-payment-actions.integration.test.js` |
| Runtime Stabilization Phase 7A — payment receipt submissions and organiser CSV/XLSX exports now emit critical audit events | Jun 24 | `tests/audit-source.unit.test.js`, `tests/page-controller-payment-proof-sync.unit.test.js` |
| Runtime Stabilization Phase 7B — admin and event-scoped organiser audit consoles now filter critical actions by group, target, actor, date, and search | Jun 24 | `tests/audit-source.unit.test.js` |
| Runtime Stabilization Phase 7C — audit consoles now flag high export volume, many rejection actions, and rapid review/export activity | Jun 24 | `tests/audit-source.unit.test.js` |
| Runtime Stabilization Phase 8A — high-impact organiser notifications now queue failed sends for retry without blocking review/reminder actions | Jun 24 | `tests/communication-retry-source.unit.test.js` |
| Runtime Stabilization Phase 8B — admin Communications now has a retry queue view with filters, payload inspection, and manual retry controls | Jun 24 | `tests/communication-retry-source.unit.test.js` |
| Runtime Stabilization Phase 8C — retry queue hygiene now dead-letters stale jobs, cleans old sent/dead rows, and surfaces queue health on Communications | Jun 24 | `tests/communication-retry-source.unit.test.js` |
| Runtime Stabilization Phase 8D — admin Communications now warns on recent dead letters, stale retry jobs, and overdue due retries before users report delivery failures | Jun 24 | `tests/communication-retry-source.unit.test.js` |
| Runtime Stabilization Phase 8E — admin Communications now ranks failing notification event types across 24h/7d using delivery logs and retry queue records | Jun 24 | `tests/communication-retry-source.unit.test.js` |
| Runtime Stabilization Phase 8F — notification delivery digest now links to an event failure detail view with recent errors, recipients, sources, and retry status | Jun 24 | `tests/communication-retry-source.unit.test.js` |
| Runtime Stabilization Phase 8G — retry queue operations now keep an admin-visible action trail for manual retries, auto dead letters, and hygiene cleanup | Jun 24 | `tests/communication-retry-source.unit.test.js` |
| Runtime Stabilization Phase 8H — retry action trail now has retention cleanup plus action/event/actor filters for focused operator audits | Jun 24 | `tests/communication-retry-source.unit.test.js` |
| Badge system refinement — early generation at event save, wizard Badges step (13 steps), event logo fallback, badge previews on event detail page | Jun 24 | — |
| P5 Social sharing — certificate verify share buttons + og:image; submission detail share strip; badge detail already complete | Jun 24 | — |
| P8 Email notification settings — Notifications section on runner profile; 5 opt-outable types; emailOptOut on User model; service respects opt-out | Jun 24 | — |
| P4 Personal leaderboard rank — "Ranked #N of M verified runners" in My Standing card | Jun 24 | — |
| P11 Admin user management gaps — accountStatus filter; lastLoginAt tracking + display; earned badge list on user detail | Jun 24 | `tests/admin-governance.integration.test.js` |
| P15 Platform Analytics — /admin/analytics with totals, funnel (approval rate + avg review time), 12-month growth table, top events, top organisers, shop revenue | Jun 24 | — |
| Sitemap customization — isTestData/excludeFromSitemap on Event model; migration script marks 198 test events; test fixtures updated (51 insertions); admin per-event sitemap toggle; sitemap cleaned 232 → 33 URLs on production | Jun 24 | — |
| P0 Security — organiser self-approval blocked + audit logged; atomic password reset token; webhook rate limit | Jun 24 | — |
| P1 Reliability — Sentry APM; unhandledRejection handler; Mongoose pool maxPoolSize:20; request timeout; admin Show All capped | Jun 24 | — |
| P2 Organiser UX — registration capacity enforcement; event cloning (/events/:id/clone); unpaid count in dashboard; per-user submission rate limit | Jun 24 | — |
| P3 Runner UX — public runner profile /runners/:userId; event date range filter; contact organiser form on event detail | Jun 24 | — |
| P4 Organiser quality — OCR badge tooltips; draft saved toast; admin bulk reject submissions; Message Runner modal | Jun 24 | — |
| P5 Infrastructure — static cache headers; Redis /readyz check; worker backoff; 480 console.* → logger; section markers on large files | Jun 24 | — |

---

## Session Completed (June 21–22, 2026)

| Feature | Completed | Tests |
|---------|-----------|-------|
| Docs reorganization — 91 files into architecture/, design/, implementation/, etc. | Jun 21 | — |
| docs/README.md + docs/STATUS.md created | Jun 21 | — |
| docs/architecture/db-architecture-assessment.md | Jun 22 | — |
| Phase 11 Shop — organiser/admin reports, CSV/XLSX exports, admin settings, migration 017 | Jun 21 | 77/77 |
| DB Architecture Priority 1 — pool size (25), sync failure logging (migration 018), `/healthz/sync` | Jun 22 | 44/44 |
| Runner Experience UX — payment snapshot, live price resolver, certificate CTAs, mobile bottom nav | Jun 22 | — |
| Organiser Experience UX — reward/pricing validation, wizard phase bar, time-pending indicators | Jun 22 | 6/6 unit |
| Badge system — profile imageUrl bug fix, type-specific placeholders, definition-level image (migration 019), upload, earned count | Jun 22 | 44/44 |

---

## Security & Technical Health Assessment

### Security (Grade: B+ → A- with minor fixes)
| Area | Status | Notes |
|------|--------|-------|
| Admin route protection | ✅ Secure | All routes behind `requireAdmin` |
| Organiser route protection | ✅ Secure | `requireApprovedOrganizer` enforced |
| CSRF protection | ✅ Secure | All mutations use token validation |
| XSS protection | ✅ Secure | Sanitize-html with strict allowlist |
| File uploads | ✅ Secure | Type validation, 5MB limit, R2 storage |
| Session security | ✅ Secure | `connect-mongo`, httpOnly, sameSite, secure |
| Email verification | ✅ Enforced | Cannot log in without verified email |
| Webhook security | ✅ Secure | HMAC-SHA256 + timestamp replay protection |
| Rate limiting | ✅ Mostly | Auth/payment protected; profile/groups missing |
| Redirect validation | ✅ Secure | `resolveSafeReturnTo()` path-only check |

### Technical Debt
| Item | Severity | Effort |
|------|----------|--------|
| Dead `notLive()` functions in shop controllers (never called after Phase 11) | Low | 10 min |
| Full-suite/server-spawning test teardown leaves open handles in local runs | Low | 1–2 hrs |
| Broader runtime `console.*` cleanup outside touched hardening paths | Low | 1 day |
| Large controller/route files remain expensive to maintain | Medium | phased refactor |

### Architecture Health
- **Sessions:** `connect-mongo` confirmed — multi-process deployment is safe
- **Postgres pool:** Raised to 25 connections — handles ~300–500 concurrent users
- **Sync failures:** Now logged to `sync_failure_log` — observable via `/healthz/sync`
- **Sync retry:** Priority 2 retry worker and query timeout work recorded as completed June 22
- **AdSense readiness:** Local code readiness improved June 24; production crawl and review remain operational steps

---

## User Journey Gaps Found in Audit

### Runner Experience *(mostly resolved by June 22 implementation pass; retained for audit history)*
| Gap | Impact | Notes |
|-----|--------|-------|
| No onboarding flow after signup | High | Users land on homepage with no "what to do next" |
| Manual payment (screenshot receipts) | High | Highest friction in the registration funnel |
| No proof metadata editing | Medium | Rejected submissions require full resubmit |
| No personal leaderboard rank shown | Medium | "You are #42" missing from leaderboard views |
| No certificate/badge social sharing | Medium | No OG-tagged share page |
| No event wishlist/favorites | Medium | Can't bookmark events to register later |
| No profile picture | Low | Default icon on all profiles |
| Registration form has no draft saving | Medium | Leaving mid-form loses all data |
| Notifications not prominent | Low | Bell icon buried, no urgent surfacing |
| No email notification settings UI | Medium | Can't control which emails are received |

### Organiser Experience *(partially resolved by June 22 implementation pass; retained for audit history)*
| Gap | Impact | Notes |
|-----|--------|-------|
| No registrant messaging (bulk email) | High | Can't send "payment due tomorrow" reminders |
| Proof/payment review is one-by-one | High | No bulk approve/reject for obvious cases |
| No revenue visibility on dashboard | Medium | Can't see how much money events generated |
| No event templates or cloning | Medium | Every event built from scratch |
| No registration cap enforcement UI | Medium | Slot limits set but not enforced visibly |
| Organiser application has no progress tracker | Low | Unclear what's needed, what timeline to expect |
| No export for submissions/results | Medium | Can't download run results to CSV |

### Admin Experience *(core governance/user-management items resolved by June 22 implementation pass; retained for audit history)*
| Gap | Impact | Notes |
|-----|--------|-------|
| No user management UI | High | Can't search, view, or act on runner accounts |
| No audit trail for admin actions | High | Can't see who changed what |
| No account suspension workflow | High | Can't restrict problematic accounts |
| No bulk review actions | Medium | Must approve items one-by-one |
| No platform analytics | Medium | No "total runners," "approval rates," "revenue" |
| No admin notes on user profiles | Medium | No way to log support context |

---

## Priority Roadmap

This section is retained as the June 22 audit roadmap. Several items below were implemented after the audit; use `docs/STATUS.md` and the June 24 session table above as the current source of truth before starting new work.

### P1 — Admin Governance
**Spec:** `docs/to-implement/admin-governance.md`
**Effort:** 2–3 weeks | **Impact:** Platform compliance and safety

Four features, build in order:
1. **Admin Audit Trail** — `AdminAuditLog` model, `logAction()` service, wire into role changes/organiser status/deletion, UI on `/admin/users/:id`
2. **Admin Notes** — Append-only notes array on user, `POST /admin/users/:id/notes`, visible in admin user detail
3. **Resend Verification + Email Override** — `POST /admin/users/:id/resend-verification` and `/verify-email` (manual override with reason + rate limit)
4. **Account Suspension** — `accountStatus` field on User, middleware enforcement on login, admin status selector with reason + confirmation

**Tests:** `tests/admin-governance.integration.test.js` covering each workflow

---

### P2 — Onboarding Flow
**Spec:** Not yet documented — discovered in audit
**Effort:** 1 week | **Impact:** New user retention

New users sign up and land on the homepage with no guidance. Needs:
- Post-signup redirect to onboarding wizard or prompt modal (3 steps: Complete Profile → Browse Events → Register)
- Profile completeness reminder on first dashboard visit
- Welcome email (confirms email, links to "Getting Started" guide)
- Empty-state CTAs on dashboard when runner has no registrations/submissions

**Note:** Does not require a full wizard — a simple "next steps" banner on first login is MVP.

---

### P3 — DB Architecture Priority 2
**Spec:** `docs/architecture/db-architecture-assessment.md` — Priority 2 section
**Effort:** 3 days | **Impact:** Stability before scaling

- **Sync retry worker** (`src/workers/pg-sync-worker.js`) — polls `sync_failure_log` for unresolved failures, retries sync, marks resolved, moves to dead-letter after 3 fails
- **Postgres query timeouts** — add `statement_timeout: 8000` to postgres.js client config
- **Session store confirmation** — already done (connect-mongo confirmed)

---

### P4 — Personal Leaderboard Ranking *(Quick Win — ~2 hrs)*
**Effort:** 2 hours | **Impact:** High UX value for competitive runners

On the event leaderboard page, after fetching all rankings, find the current runner's position and display: `"Your rank: #42 of 156"` above the table. Single query addition + one EJS block.

---

### P5 — Certificate & Badge Social Sharing
**Effort:** 3 days | **Impact:** Organic growth / viral loop

- Public certificate verify page (`/certificates/verify/:certNumber`) already exists — needs OG meta tags (title, description, image) so sharing to Twitter/LinkedIn/Facebook shows a rich preview
- Badge verification page (`/badges/:userBadgeId`) — same OG tag treatment
- "Share" button on both pages that opens native share or copies URL
- Optional: generate a shareable card image (PNG) via server-side canvas or SVG for each certificate/badge

---

### P6 — Proof Rejection — Guidance + Edit Capability
**Effort:** 1 week | **Impact:** Reduces runner frustration, reduces resubmit rate

- On submission detail (`/runner/submissions/:id`): when `status === 'rejected'`, show an explanation block based on rejection reason type with "what to fix" guidance
- Allow editing distance/time metadata on rejected submissions without resubmitting the proof image
- New route: `PATCH /runner/submissions/:id/metadata` — updates distance/elapsed fields on a rejected submission, resets status to 'submitted'

---

### P7 — Bulk Organiser Actions
**Effort:** 1 week | **Impact:** Saves organisers hours per event

- **Payment proof:** "Approve Selected" and "Reject Selected" with shared reason on the payment proof review queue
- **Run submissions:** "Approve Selected" on the organiser submissions hub
- **Registrant email:** "Send Email to Filtered" — allows organiser to email all unpaid registrants (or all registered) from the registrant page

---

### P8 — Email Notification Settings UI
**Effort:** 3 days | **Impact:** Retention — prevents blanket unsubscribes

The `CommunicationSetting` and `CommunicationEventSetting` models exist in MongoDB. Needs a UI surface in runner profile (`/runner/profile#notifications`) where runners can toggle:
- Payment reminders
- Submission status updates
- Badge earned notifications
- Event starting soon reminders
- Certificate ready alerts

---

### P9 — Profile Picture Upload *(Quick Win — ~3 hrs)*
**Effort:** 3 hours | **Impact:** Perceived quality, community feel

Reuses existing R2 upload infrastructure. Add a file input to runner profile with multer single-image upload to `profile-images/` R2 category. Store URL on User model. Display in nav, dashboard, and public badge collection.

---

### P10 — Event Wishlist / Favorites
**Effort:** 3 days | **Impact:** Discovery and return visits

Runners can "save" an event to return to later. New `savedEvents[]` array on User model. Heart/bookmark icon on event cards and detail pages. Saved events shown in a "Saved Events" section on dashboard.

---

### P11 — Admin User Management UI
**Effort:** 1 week | **Dependency:** Builds on P1 (Admin Governance)
**Impact:** Admin can act on problem accounts

- `GET /admin/users` — searchable, filterable list (role, status, join date, email verified)
- `GET /admin/users/:id` — full profile view with: registration history, submission history, badge list, audit log (from P1), admin notes (from P1), account status controls (from P1)

Partially in `docs/implementation/user_management_improvement_draft.md` — review for existing implementation.

---

### P12 — Blog Scheduled Publishing
**Effort:** 2 days | **Dependency:** Blog already live (Phases A–E)

- Add `scheduledAt` field to Blog model
- Cron job (every 5 min) checks for blogs with `scheduledAt <= now()` and `status === 'scheduled'`, publishes them
- Add "Schedule" option in blog editor alongside "Submit for Review"

---

### P13 — AdSense Deployment *(Zero Code — Ops Only)*
**Effort:** ~1 hour operational | **Impact:** Revenue

All 8 phases of AdSense readiness are implemented (PR #10). Remaining steps:
1. Deploy current main to production
2. Seed the 10 guide blog posts in production database
3. Verify `/robots.txt` and `/sitemap.xml` are reachable
4. Submit/refresh sitemap in Google Search Console
5. Wait for crawl (2–4 weeks), then re-request AdSense review

---

### P14 — Related Events / Recommendations
**Effort:** 3 days | **Impact:** Discovery and engagement

On event detail page, after the main content, show 3 "Similar Events" based on:
- Same race distances
- Same event type (virtual/onsite)
- Same organiser (other events by same organiser)
- Fallback: upcoming events with open registration

---

### P15 — Platform Analytics for Admins
**Effort:** 1 week | **Impact:** Admin visibility into platform health

New `/admin/analytics` page with Postgres aggregate queries:
- Total runners, organisers, events (by month)
- Registration / submission / approval rates
- Average time-to-review (payment proofs and run submissions)
- Top events by registrations, top organisers by events, top distances
- Revenue tracking (total shop orders + amounts)

---

## Priority Summary Table

| # | Feature | Effort | Impact | Type |
|---|---------|--------|--------|------|
| P1 | Admin Governance (audit, notes, suspension, verify) | 2–3 weeks | 🔴 Critical | Safety | ✅ Done |
| P2 | Onboarding flow | 1 week | 🔴 Critical | Retention | ✅ Done (was already built) |
| P3 | DB Architecture Priority 2 (retry worker, timeouts) | 3 days | 🟠 High | Stability |
| P4 | Personal leaderboard ranking | 2 hrs | 🟠 High | UX |
| P5 | Certificate & badge social sharing | 3 days | 🟠 High | Growth |
| P6 | Proof rejection guidance + edit | 1 week | 🟠 High | UX |
| P7 | Bulk organiser actions | 1 week | 🟠 High | Organiser UX |
| P8 | Email notification settings UI | 3 days | 🟡 Medium | Retention |
| P9 | Profile picture upload | 3 hrs | 🟡 Medium | Polish |
| P10 | Event wishlist / favorites | 3 days | 🟡 Medium | Discovery |
| P11 | Admin user management UI | 1 week | 🟡 Medium | Admin UX |
| P12 | Blog scheduled publishing | 2 days | 🟡 Medium | Blog |
| P13 | AdSense deployment (ops only) | 1 hr ops | 🟠 High | Revenue |
| P14 | Related events / recommendations | 3 days | 🟡 Medium | Engagement |
| P15 | Platform analytics for admins | 1 week | 🟡 Medium | Admin UX |

---

## Quick Wins (< 1 day, high visible value)

| Item | Effort |
|------|--------|
| P4 — Personal leaderboard ranking | 2 hrs |
| P9 — Profile picture upload | 3 hrs |
| P13 — AdSense deployment checklist (ops) | 1 hr |
| Remove dead `notLive()` functions in shop controllers | 10 min |
| Add rate limiting to profile update and group endpoints | 1–2 hrs |
| Replace `console.error` with `logger.error` in rate-limit middleware and onsite-operations | 30 min |

---

## Out of Scope (Long-Term / Future)

- Integrated payment gateway (Stripe/PayPal) — major architecture change, high effort
- Video submission proof support — new upload pipeline needed
- GPS/device tracking integration (Garmin, Apple Watch native) — requires mobile app
- Community event reviews / organiser reputation system — moderation overhead
- Public runner profiles with bios and social sharing — requires privacy policy update
- Email template editor UI — admin-editable transactional emails
- Automated proof approval rules engine — ML/heuristic system
- Event cloning / template library — organiser tooling
- In-app push notifications (requires service worker / mobile app)
