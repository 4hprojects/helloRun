# DOCUMENT ROLE (REPOSITORY TRACKER)
- Purpose: File-level repository tracking and chronological implementation changelog.
- Scope: Added/updated/removed files, behavior changes, and session smoke checklist.
- Planning source: See PRD.md for roadmap, backlog, and detailed tasks.

## CHANGELOG - April 22, 2026 (Session: Admin Review Queue + Navigation UX + Shop Draft)

### [SESSION] SESSION UPDATE:
- Cleaned up planning docs:
  - renamed `docs/wireframe.md` to `docs/PRD.md`
  - renamed `docs/dir.md` to `docs/CHANGELOG.md`
  - updated references to the new document names
- Added shop planning:
  - added Phase 11 Shop / Merchandise Feature to `docs/PRD.md`
  - created `docs/shop_feature.md`
- Added dedicated admin payment/result review queue:
  - new `GET /admin/reviews`
  - cross-event queue for registrations with `paymentStatus: proof_submitted`
  - cross-event queue for submissions with `status: submitted`
  - filters for all/payments/results, oldest/newest sort, and search
  - dashboard links now point pending review metrics to the admin queue
- Updated navigation:
  - converted shared nav links to Lucide icon controls with hover/focus labels
  - improved tablet/mobile hamburger menu into a compact overlay panel
  - made mobile labels right-aligned with icons on the right
  - refined mobile logout button size, placement, and styling
- Refreshed `/about` page content:
  - expanded runner/organizer value messaging
  - added platform capability list and trust/momentum sections
  - added browse events and account creation calls to action
- Polished auth UI surfaces:
  - improved login/signup primary and Google button contrast, hover color, icon treatment, and Google mark sizing
  - compacted the sign-in panel layout
  - refined `/forgot-password` secondary action buttons into a symmetric three-column layout
  - moved the key icon beside the forgot-password title and compacted the tip message

### [NEW] NEW FILES:
1. docs/shop_feature.md
2. src/views/admin/review-queue.ejs

### [RENAMED] RENAMED FILES:
1. docs/wireframe.md -> docs/PRD.md
2. docs/dir.md -> docs/CHANGELOG.md

### [UPDATED] UPDATED FILES (major):
1. docs/PRD.md
2. docs/CHANGELOG.md
3. src/controllers/admin.controller.js
4. src/routes/admin.routes.js
5. src/views/admin/dashboard.ejs
6. src/views/layouts/nav.ejs
7. src/public/css/admin.css
8. src/public/css/style.css
9. src/public/js/main.js
10. tests/admin-dashboard.test.js
11. src/views/pages/about.ejs
12. src/public/css/static-pages.css
13. src/views/auth/login.ejs
14. src/views/auth/signup.ejs
15. src/views/auth/forgot-password.ejs
16. src/public/css/login.css
17. src/public/css/signup.css
18. src/public/css/forgot-password.css

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/static-pages.test.js` -> PASS
- `node --test --test-concurrency=1 tests/admin-dashboard.test.js` -> PASS
- `node --test --test-concurrency=1 tests/submission-review-route-guards.test.js` -> PASS
- `node --test --test-concurrency=1 tests/payment-route-guards.test.js` -> PASS
- `node --test --test-concurrency=1 tests/runner-dashboard-modal.test.js` -> PASS
- `node --test --test-concurrency=1 tests/google-oauth-routes.test.js` -> PASS
- `node --test --test-concurrency=1 tests/privacy-signup-consent.test.js` -> PASS

## CHANGELOG - March 10, 2026 (Session: Run Proof Modal Rollout + Admin Review Access)

### [SESSION] SESSION UPDATE:
- Continued phased rollout for run-result submissions:
  - added `Submit Run Proof` trigger in runner dashboard welcome header
  - replaced inline result submit/resubmit form in `/my-registrations` with reusable modal trigger
  - added public home (`/`) hero trigger for logged-in runners; guests are redirected to login before submission
- Improved result visibility:
  - organizer registrant table now shows run date and run location for each submission
  - my registrations result details now include run date, run location, and proof link
- Expanded moderation access:
  - existing organizer registrant review routes now support admin accounts in the same workflow
  - admin can approve/reject payment and result submissions in-place
  - admin dashboard pending-result metric now links to a direct review queue route

### [UPDATED] UPDATED FILES (major):
1. src/views/runner/dashboard.ejs
2. src/public/css/runner-dashboard.css
3. src/views/pages/my-registrations.ejs
4. src/public/css/my-registrations.css
5. src/views/pages/home.ejs
6. src/routes/organizer.routes.js
7. src/views/organizer/event-registrants.ejs
8. src/services/submission.service.js
9. src/controllers/admin.controller.js
10. src/views/admin/dashboard.ejs
11. docs/privacy_policy.md
12. docs/PRD.md
13. docs/CHANGELOG.md

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/submission-routes.test.js` -> PASS
- `node --test --test-concurrency=1 tests/submission.service.test.js` -> PASS
- `node --test --test-concurrency=1 tests/submission-review-route-guards.test.js` -> PASS
- `node --test --test-concurrency=1 tests/admin-dashboard.test.js` -> PASS
- `node --test --test-concurrency=1 tests/static-pages.test.js` -> PASS

## CHANGELOG - March 9, 2026 (Session: Privacy Page TOC + Sidebar UX Refinement)

### [SESSION] SESSION UPDATE:
- Refined `/privacy` page usability for long legal content:
  - added secondary right-panel `Quick Contents` (TOC) below `At a Glance`
  - TOC auto-build now supports heading-based content (`h1/h2/h3`)
  - added fallback TOC extraction for bold-leading section labels when proper headings are missing
- Improved sticky sidebar behavior:
  - balanced right panel height within viewport
  - made TOC list scroll internally when content is long
  - updated `At a Glance` panel so title remains visible while only body content scrolls

### [UPDATED] UPDATED FILES (major):
1. src/views/pages/privacy.ejs
2. src/public/css/static-pages.css
3. docs/privacy_policy.md
4. docs/PRD.md
5. docs/CHANGELOG.md

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/static-pages.test.js` -> PASS

## CHANGELOG - March 9, 2026 (Session: Cookie Policy Admin Workflow + Signup Consent Gate)

### [SESSION] SESSION UPDATE:
- Added full Cookie Policy admin workflow, matching Privacy/Terms lifecycle:
  - list/history
  - create/edit draft
  - auto-format/preview
  - publish
  - clone
  - archive
- Added Cookie Policy management entry points in admin dashboard and quick-action menu.
- Added one-time cookie policy seed utility:
  - `npm run seed:cookie-policy`
- Tightened signup policy consent enforcement:
  - local signup now requires acceptance of Terms + Privacy + Cookie policies
  - Google signup intent now requires policy consent before OAuth redirect
  - new Google-created accounts now persist legal policy version metadata including cookie policy

### [NEW] NEW FILES:
1. src/scripts/seed-cookie-policy.js

### [UPDATED] UPDATED FILES (major):
1. package.json
2. src/controllers/admin.controller.js
3. src/routes/admin.routes.js
4. src/views/admin/dashboard.ejs
5. src/routes/authRoutes.js
6. src/models/User.js
7. src/views/auth/signup.ejs
8. src/public/js/signup.js
9. tests/admin-dashboard.test.js
10. tests/google-oauth-routes.test.js
11. tests/privacy-signup-consent.test.js
12. docs/privacy_policy.md
13. docs/PRD.md
14. docs/CHANGELOG.md

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/admin-dashboard.test.js` -> PASS
- `node --test --test-concurrency=1 tests/google-oauth-routes.test.js` -> PASS
- `node --test --test-concurrency=1 tests/privacy-signup-consent.test.js` -> PASS

## CHANGELOG - March 9, 2026 (Session: Terms and Conditions Workflow Expansion + Versioned Consent)

### [SESSION] SESSION UPDATE:
- Extended the existing admin-editable legal policy system from Privacy-only to Privacy + Terms:
  - added full Terms version lifecycle under `/admin/terms-and-conditions`
  - reused shared admin policy templates for both documents
  - added Terms management entry points on admin dashboard
- Switched public `/terms` rendering to published DB policy with fallback to:
  - `docs/contents/Terms and Conditions.md`
- Extended signup legal consent logging:
  - now stores accepted Terms policy ID/version alongside Privacy policy acceptance metadata
- Added Terms one-time seed utility:
  - `npm run seed:terms-policy`

### [NEW] NEW FILES:
1. src/scripts/seed-terms-policy.js

### [UPDATED] UPDATED FILES (major):
1. package.json
2. src/controllers/admin.controller.js
3. src/routes/admin.routes.js
4. src/routes/pageRoutes.js
5. src/routes/authRoutes.js
6. src/models/User.js
7. src/views/admin/dashboard.ejs
8. src/views/admin/privacy-policy-list.ejs
9. src/views/admin/privacy-policy-form.ejs
10. src/views/pages/terms.ejs
11. tests/privacy-signup-consent.test.js
12. tests/static-pages.test.js
13. docs/privacy_policy.md
14. docs/PRD.md
15. docs/CHANGELOG.md

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/admin-dashboard.test.js` -> PASS
- `node --test --test-concurrency=1 tests/static-pages.test.js` -> PASS
- `node --test --test-concurrency=1 tests/privacy-signup-consent.test.js` -> PASS

## CHANGELOG - March 9, 2026 (Session: Privacy Policy System Phases 1-6 + Consent Logging)

### [SESSION] SESSION UPDATE:
- Completed privacy policy management build-out across Phases 1-6:
  - canonical baseline lock (`docs/contents/Privacy Policy.md`)
  - versioned `PrivacyPolicy` model and one-time seed script
  - admin version-management workflow (list/history, draft, edit, clone, publish, archive)
  - public `/privacy` now serves current published DB version with safe fallback
  - CSRF and status/version guard hardening on admin policy routes
  - signup consent logging tied to accepted privacy-policy ID/version/timestamp/IP/user-agent
- Fixed signup organizer-status mismatch:
  - changed invalid `incomplete` value to valid enum `not_applied`
- Added automated consent verification test suite and passed run:
  - `tests/privacy-signup-consent.test.js` -> 2/2 PASS

### [NEW] NEW FILES:
1. src/models/PrivacyPolicy.js
2. src/scripts/seed-privacy-policy.js
3. src/utils/markdown.js
4. src/views/admin/privacy-policy-list.ejs
5. src/views/admin/privacy-policy-form.ejs
6. tests/privacy-signup-consent.test.js
7. docs/privacy-policy-phase1-baseline.md

### [UPDATED] UPDATED FILES (major):
1. package.json
2. src/routes/admin.routes.js
3. src/controllers/admin.controller.js
4. src/routes/pageRoutes.js
5. src/routes/authRoutes.js
6. src/models/User.js
7. src/views/admin/dashboard.ejs
8. src/views/pages/privacy.ejs
9. src/views/admin/application-details.ejs
10. src/views/admin/blog-review.ejs
11. src/public/css/admin.css
12. docs/privacy_policy.md
13. docs/PRD.md
14. docs/CHANGELOG.md

### [REMOVED] REMOVED FILES:
1. src/views/admin/privacy-policy-editor.ejs

## CHANGELOG - March 8, 2026 (Session: Events/My Registrations UX Follow-up + Privacy Patch)

### [SESSION] SESSION UPDATE:
- Refined event details UX (`/events/:slug`):
  - new hero + key facts + CTA structure
  - improved media/gallery presentation and mobile sticky CTA
- Improved My Registrations privacy:
  - replaced raw DOB display with age label
- Fixed My Registrations runtime issues:
  - added missing static client script at `/js/my-reg.js`
  - replaced payment-proof `registration.save()` path with targeted `Registration.updateOne(...)` to avoid legacy validation failures
- Added side-task tracking for continued UI/UX polish in planning notes.

### [NEW] NEW FILES:
1. src/public/css/event-details.css
2. src/public/js/my-reg.js

### [UPDATED] UPDATED FILES (major):
1. src/views/pages/event-details.ejs
2. src/controllers/page.controller.js
3. src/views/pages/my-registrations.ejs
4. docs/PRD.md
5. docs/CHANGELOG.md

## CHANGELOG - March 8, 2026 (Session: Runner Groups Panel Simplification + Dedicated Group/Profile Flows)

### [SESSION] SESSION UPDATE:
- Simplified runner dashboard `Running Groups` card to overview-only content plus one `Manage Groups` action.
- Moved group management actions out of dashboard into dedicated page flows:
  - added `GET /runner/groups` (search, join, create in one place)
  - retained `GET /runner/groups/create` as focused create entry
- Added runner personal info subpage and profile section UX refinements:
  - `GET /runner/profile`
  - left-side quick menu
  - editable Contact/Emergency fields
  - DOB masked by default with eye-icon toggle
  - Save/Cancel hidden by default and right-aligned when editing
- Added/confirmed CSRF hidden tokens in new state-changing forms.
- Validation checks run:
  - `tests/runner-dashboard-profile.test.js` -> PASS
  - `tests/runner-notifications-routes.test.js` -> PASS

### [NEW] NEW FILES:
1. src/views/runner/groups.ejs
2. src/views/runner/profile.ejs
3. src/public/css/runner-profile.css
4. src/public/js/runner-profile.js

### [UPDATED] UPDATED FILES (major):
1. src/views/runner/dashboard.ejs
2. src/views/runner/create-group.ejs
3. src/views/runner/password-settings.ejs
4. src/controllers/runner.controller.js
5. src/routes/runner.routes.js
6. src/public/css/runner-dashboard.css
7. src/public/js/runner-dashboard.js
8. docs/PRD.md
9. docs/CHANGELOG.md

## CHANGELOG - March 8, 2026 (Session: Runner Dashboard High-Impact Security + UX Batch)

### [SESSION] SESSION UPDATE:
- Implemented authenticated runner password settings flow:
  - added `GET /runner/security/password`
  - added `POST /runner/security/password`
  - supports Google-only first-password setup and local-password change validation
- Updated Account Security action routing:
  - dashboard password action now points to `/runner/security/password`
- Added relative-time labels for dashboard activity and result timestamps.
- Replaced unlink confirm dialog behavior with accessible inline modal handling:
  - focus trap
  - Escape/backdrop close
  - focus return to trigger
- Applied compact mobile spacing/typography refinements for dashboard `item-row` content/action layout.
- Extended runner profile test suite with new password flow cases and verified targeted regressions.

### [NEW] NEW FILES:
1. src/views/runner/password-settings.ejs

### [UPDATED] UPDATED FILES (major):
1. src/controllers/runner.controller.js
2. src/routes/runner.routes.js
3. src/views/runner/dashboard.ejs
4. src/public/js/runner-dashboard.js
5. src/public/css/runner-dashboard.css
6. tests/runner-dashboard-profile.test.js
7. docs/PRD.md
8. docs/CHANGELOG.md

## CHANGELOG - March 8, 2026 (Session: Phase 6 Runner Dashboard Final Closeout Smoke)

### [SESSION] SESSION UPDATE:
- Ran strict runner dashboard closeout smoke covering:
  - consolidated filter controls (`eventMode`, `resultStatus`, clear flow)
  - collapsible panel states and toggle behavior
  - Google-linked account state rendering (badge/unlink)
  - Google-only account state rendering (set-password guidance path)
  - mobile breakpoint coverage verification in dashboard CSS
- Additional targeted account-state probe executed against live dashboard HTML:
  - linked account UI state checks: PASS
  - Google-only account UI state checks: PASS
- Targeted regression suites all passed:
  - `tests/runner-dashboard-profile.test.js`
  - `tests/running-group-smoke.test.js`
  - `tests/google-oauth-routes.test.js`
- Updated planning notes to mark Phase 6 runner polish as fully closed.

### [UPDATED] UPDATED FILES (major):
1. docs/PRD.md
2. docs/CHANGELOG.md

## CHANGELOG - March 8, 2026 (Session: Runner Dashboard UX Consolidation + OAuth Polish)

### [SESSION] SESSION UPDATE:
- Implemented runner dashboard UX consolidation:
  - replaced duplicated per-card filter forms with a shared top filter bar (`eventMode`, `resultStatus`)
  - added clear-filters action and supporting styles
- Improved Google-linked runner UX:
  - added guidance CTA for Google-only users to set local password before unlinking
  - added unlink confirmation prompt in dashboard JS
- Improved timestamp rendering:
  - migrated dashboard/notification/group-detail date labels to locale-aware formatting via `Intl.DateTimeFormat`
- Added forgot-password email prefill support for auth guidance flow:
  - `/forgot-password?email=...` now prefills and preserves email value on re-renders
- Targeted regression suite passed:
  - `tests/runner-dashboard-profile.test.js`
  - `tests/running-group-smoke.test.js`
  - `tests/google-oauth-routes.test.js`

### [UPDATED] UPDATED FILES (major):
1. src/views/runner/dashboard.ejs
2. src/public/css/runner-dashboard.css
3. src/public/js/runner-dashboard.js
4. src/controllers/runner.controller.js
5. src/routes/authRoutes.js
6. src/views/auth/forgot-password.ejs
7. docs/PRD.md
8. docs/CHANGELOG.md

## CHANGELOG - March 8, 2026 (Session: Phase 8 Polish - Runner Google Link Badge + Safe Unlink)

### [SESSION] SESSION UPDATE:
- Added Google account-link visibility in runner dashboard Personal Information panel:
  - sign-in method display
  - `Google linked` badge for linked accounts
- Added safe unlink endpoint for runner:
  - `POST /runner/auth/google/unlink`
  - blocks unlink when no local password is set to avoid account lockout
- Added test coverage for unlink behavior:
  - success path when password exists
  - guarded error path when password is missing
- Targeted regression run passed:
  - `tests/runner-dashboard-profile.test.js`
  - `tests/running-group-smoke.test.js`

### [UPDATED] UPDATED FILES (major):
1. src/routes/runner.routes.js
2. src/controllers/runner.controller.js
3. src/views/runner/dashboard.ejs
4. src/public/css/runner-dashboard.css
5. tests/runner-dashboard-profile.test.js
6. docs/PRD.md
7. docs/CHANGELOG.md

## CHANGELOG - March 8, 2026 (Session: Phase 8 Production Verification + Google Signup Fix)

### [SESSION] SESSION UPDATE:
- Investigated production issue where Google login worked but Google signup (new account path) failed.
- Root-cause fix applied:
  - imported missing `getNextSequence` and `formatUserId` helpers in `src/models/User.js`
  - ensured new Google-auth users can receive generated `userId` on create
- Production verification completed:
  - existing-user Google login: PASS
  - new-user Google signup: PASS

### [UPDATED] UPDATED FILES (major):
1. src/models/User.js
2. docs/PRD.md
3. docs/CHANGELOG.md

## CHANGELOG - March 8, 2026 (Session: Phase 8 Google OAuth Baseline)

### [SESSION] SESSION UPDATE:
- Added Google OAuth baseline routes and callback handling:
  - `GET /auth/google`
  - `GET /auth/google/callback`
- Implemented account-linking rules:
  - match by `googleId` first
  - else match by email and link Google ID
  - else create new Google-authenticated runner account
- Added Google sign-in CTA buttons to login/signup pages.
- Added OAuth route coverage for:
  - auth redirect URL generation
  - callback invalid-state rejection
  - callback canceled-consent handling
- Full regression verification:
  - `npm test` passed (`60/60`)

### [NEW] NEW FILES:
1. src/services/google-oauth.service.js
2. tests/google-oauth-routes.test.js

### [UPDATED] UPDATED FILES (major):
1. src/routes/authRoutes.js
2. src/models/User.js
3. src/views/auth/login.ejs
4. src/views/auth/signup.ejs
5. src/public/css/login.css
6. src/public/css/signup.css
7. tests/runner-notifications-routes.test.js
8. docs/PRD.md
9. docs/CHANGELOG.md

## CHANGELOG - March 8, 2026 (Session: Phase 9 Cross-Device QA Gate + Closeout)

### [SESSION] SESSION UPDATE:
- Executed strict Phase 9 QA gate suites sequentially:
  - `tests/public-search-filters.test.js`
  - `tests/runner-dashboard-profile.test.js`
  - `tests/organizer-dashboard-analytics.test.js`
  - `tests/admin-dashboard.test.js`
  - `tests/submission-routes.test.js`
  - `tests/runner-notifications-routes.test.js`
- QA gate result: `15/15` passing, `0` failing.
- Performed responsive CSS audit for key cross-device surfaces:
  - navigation and touch-target baseline (`src/public/css/style.css`)
  - public lists (`src/public/css/events.css`, `src/public/css/leaderboard.css`)
  - role dashboards (`src/public/css/runner-dashboard.css`, `src/public/css/organizer-dashboard.css`)
  - organizer form surface (`src/public/css/create-event.css`)
- Marked Phase 9 cross-device/manual QA gate as complete in planning notes.

### [UPDATED] UPDATED FILES (major):
1. docs/PRD.md
2. docs/CHANGELOG.md

## CHANGELOG - March 8, 2026 (Session: Phase 9 Kickoff - Test Stability Baseline)

### [SESSION] SESSION UPDATE:
- Started Phase 9 with test execution stability.
- Updated npm scripts:
  - default `npm test` now runs sequentially with `--test-concurrency=1`
  - added `npm run test:parallel` for optional local parallel runs
- Verified full-suite reliability after update:
  - `npm test` passed (51/51)

### [UPDATED] UPDATED FILES (major):
1. package.json
2. docs/PRD.md

## CHANGELOG - March 8, 2026 (Session: Phase 9 Coverage Expansion - High-Risk Negative Paths)

### [SESSION] SESSION UPDATE:
- Added high-risk negative-path route coverage for:
  - invalid result submission payloads (`elapsedTime`, `distanceKm`)
  - open-redirect hardening on runner notification mark-read `returnTo`
  - runner-route role guard behavior for non-runner authenticated users
- Full-suite regression after additions:
  - `npm test` passed (55/55)

### [UPDATED] UPDATED FILES (major):
1. tests/submission-routes.test.js
2. tests/runner-notifications-routes.test.js
3. docs/PRD.md

## CHANGELOG - March 8, 2026 (Session: Phase 9 Security Hardening Verification Pass)

### [SESSION] SESSION UPDATE:
- Hardened app-level security defaults:
  - disabled `x-powered-by`
  - added baseline security response headers
  - hardened session cookie configuration (`hr.sid`, `HttpOnly`, `SameSite=Lax`, prod `Secure`)
  - disabled request-body debug logging by default (opt-in via `DEBUG_HTTP_BODIES=1`)
- Added security regression test coverage for headers and session-cookie attributes.
- Full regression verification completed:
  - `npm test` passed (57/57)

### [NEW] NEW FILES:
1. tests/security-hardening.test.js

### [UPDATED] UPDATED FILES (major):
1. src/server.js
2. src/routes/authRoutes.js
3. docs/PRD.md

## CHANGELOG - March 8, 2026 (Session: Phase 9 Performance Baseline + Index Tuning)

### [SESSION] SESSION UPDATE:
- Completed performance-focused model index tuning for event, registration, submission, notification, and blog query paths.
- Verified no regressions after tuning:
  - `npm test` passed (57/57)
- Recorded baseline route timing snapshot in planning notes for:
  - events filters
  - leaderboard filters
  - runner dashboard
  - organizer dashboard
  - admin dashboard

### [UPDATED] UPDATED FILES (major):
1. src/models/Event.js
2. src/models/Registration.js
3. src/models/Submission.js
4. src/models/Notification.js
5. src/models/Blog.js
6. docs/PRD.md

## CHANGELOG - March 8, 2026 (Session: Phase 3/5/6 Closeout Smoke + Status Finalization)

### [SESSION] SESSION UPDATE:
- Ran strict Phase 3/5/6 closeout validation suites sequentially.
- Targeted smoke/check suites all passed:
  - tests/organizer-waiver-routes.test.js (2/2)
  - tests/submission-routes.test.js (2/2)
  - tests/submission-review-route-guards.test.js (3/3)
  - tests/submission.service.test.js (8/8)
  - tests/certificate-access.test.js (3/3)
  - tests/leaderboard.service.test.js (2/2)
  - tests/runner-dashboard-profile.test.js (2/2)
  - tests/organizer-dashboard-analytics.test.js (1/1)
  - tests/admin-dashboard.test.js (1/1)
- Closeout result: 24/24 targeted tests passed.
- Updated planning notes to mark Phase 3, 5, and 6 as completed for core scope.

### [UPDATED] UPDATED FILES (major):
1. docs/PRD.md

## CHANGELOG - March 8, 2026 (Session: Phase 7 Completion - Notifications Expansion)

### [SESSION] SESSION UPDATE:
- Completed Phase 7 notifications expansion for in-app runner alerts.
- Wired notification creation to core lifecycle actions:
  - registration confirmation
  - payment proof submitted
  - payment approved/rejected
  - result approved/rejected
  - certificate issued
- Added runner unread notification badge in top navigation.
- Added regression coverage for payment and submission notification triggers.

### [UPDATED] UPDATED FILES (major):
1. src/services/notification.service.js
2. src/controllers/page.controller.js
3. src/routes/organizer.routes.js
4. src/services/submission.service.js
5. src/middleware/auth.middleware.js
6. src/views/layouts/nav.ejs
7. src/public/css/style.css
8. tests/submission.service.test.js
9. tests/payment-route-guards.test.js
10. tests/runner-notifications-routes.test.js
11. docs/PRD.md

### MANUAL/TEST CHECKLIST (Latest):
- [x] `node --test tests/payment-route-guards.test.js tests/runner-notifications-routes.test.js tests/submission.service.test.js` passes

## CHANGELOG - March 7, 2026 (Session: Organizer Waiver Editor Batches 2-6)

### [SESSION] SESSION UPDATE:
- Completed organizer waiver editor implementation across create/edit event pages using Quill.
- Replaced technical raw waiver textarea flow with rich editor + hidden field sync (`waiverTemplate`) for backend compatibility.
- Added non-technical placeholder insertion controls:
  - Insert Organizer Name (`{{ORGANIZER_NAME}}`)
  - Insert Event Title (`{{EVENT_TITLE}}`)
- Added server-side waiver sanitization in organizer routes with waiver-specific allowlist.
- Hardened waiver validation to use meaningful plain-text length from rich HTML.
- Added focused waiver route tests and executed strict smoke checks.

### [NEW] NEW FILES:
1. tests/organizer-waiver-routes.test.js

### [UPDATED] UPDATED FILES (major):
1. src/views/organizer/create-event.ejs
2. src/views/organizer/edit-event.ejs
3. src/public/css/create-event.css
4. src/routes/organizer.routes.js
5. src/utils/sanitize.js
6. docs/PRD.md

### MANUAL/TEST CHECKLIST (Latest):
- [x] `node --test tests/organizer-waiver-routes.test.js` passes (2/2)
- [x] `node --test tests/organizer-dashboard-analytics.test.js` passes (1/1)
- [x] Strict waiver smoke script passes (6/6):
  - organizer login
  - create-event page editor controls rendered
  - create-event draft submit works
  - saved waiver is sanitized and placeholders retained
  - edit-event page editor controls rendered

## CHANGELOG - March 7, 2026 (Session: Phase 7 Kickoff - Static Pages + Public Search/Filter UX)

### [SESSION] SESSION UPDATE:
- Implemented Phase 7 static page baseline end-to-end:
  - `/about`
  - `/how-it-works`
  - `/contact`
  - `/faq`
  - `/privacy`
  - `/terms`
- Added shared static-page styling and route wiring for all six pages.
- Implemented public list filter/search improvements:
  - Events page:
    - query filters (`q`, `eventType`, `distance`, `status`)
    - results summary + active-filter count
    - clear-filters action
    - pagination with filter query persistence
    - direct page-number links (active page state)
  - Blog page:
    - results summary + clear-filters action
    - filter-aware empty-state message
  - Leaderboard page:
    - results summary + active-filter count
    - conditional clear-filters action
    - filter-aware empty-state message
- UX wording consistency pass:
  - standardized action label to `Clear filters` across filtered public list pages.

### [NEW] NEW FILES:
1. src/public/css/static-pages.css
2. src/views/pages/how-it-works.ejs
3. src/views/pages/contact.ejs
4. src/views/pages/faq.ejs
5. src/views/pages/privacy.ejs
6. src/views/pages/terms.ejs
7. tests/static-pages.test.js
8. tests/public-search-filters.test.js

### [UPDATED] UPDATED FILES (major):
1. src/routes/pageRoutes.js
2. src/views/pages/about.ejs
3. src/controllers/page.controller.js
4. src/views/pages/events.ejs
5. src/public/css/events.css
6. src/views/pages/blog.ejs
7. src/public/css/blog.css
8. src/views/pages/leaderboard.ejs
9. src/public/css/leaderboard.css
10. docs/PRD.md

### MANUAL/TEST CHECKLIST (Latest):
- [x] Static public pages render with expected headings (`tests/static-pages.test.js`)
- [x] Events filters apply correctly and preserve query params through pagination
- [x] Blog filters apply correctly with clear-filters UX
- [x] Leaderboard filter summary and clear-filters UX render correctly
- [x] Public search/filter regression suite passes (`tests/public-search-filters.test.js`)

## CHANGELOG - March 7, 2026 (Session: Phase 5 Optional Notification Expansion)

### [SESSION] SESSION UPDATE:
- Added runner notification triggers on result review lifecycle:
  - result approved email
  - result rejected email
  - certificate available email (when certificate URL is issued on approval)
- Notification trigger logic now executes from the shared submission review service path.
- Added automated coverage to validate notification triggers on approve/reject outcomes.
- Full regression run completed:
  - `npm test` passed (39/39).

### [UPDATED] UPDATED FILES (major):
1. src/services/submission.service.js
2. src/services/email.service.js
3. tests/submission.service.test.js
4. docs/PRD.md

### MANUAL SMOKE CHECKLIST (Latest):
- [x] Result approval triggers runner notification flow (service-level verified)
- [x] Result rejection triggers runner notification flow (service-level verified)
- [x] Certificate availability trigger fires on approval with issued certificate URL

## CHANGELOG - March 7, 2026 (Session: Phase 5 Cross-Device UX Polish Smoke)

### [SESSION] SESSION UPDATE:
- Executed strict Phase 5 UX smoke flow covering:
  - runner result submission from `/my-registrations`
  - organizer result approval from registrants queue
  - certificate access via `/my-submissions/:submissionId/certificate`
  - filtered leaderboard rendering (`eventId`, `distance`, `mode`, `period`)
- Added mobile-readiness verification for key Phase 5 pages by confirming responsive media-query coverage in:
  - `src/public/css/events.css`
  - `src/public/css/organizer-events.css`
  - `src/public/css/leaderboard.css`
- Found and fixed a responsiveness gap:
  - added `@media (max-width: 768px)` styles to leaderboard layout
- Final strict smoke result: 12/12 steps passed.

### [UPDATED] UPDATED FILES (major):
1. src/public/css/leaderboard.css
2. docs/PRD.md

### MANUAL SMOKE CHECKLIST (Latest):
- [x] Runner submit-result flow works end-to-end with valid proof upload
- [x] Organizer approve flow updates submission status and certificate metadata
- [x] Runner certificate endpoint returns valid download redirect/access path
- [x] Leaderboard filter combinations render approved-result data
- [x] Mobile-readiness checks pass for my-registrations, organizer registrants, and leaderboard pages

## CHANGELOG - March 7, 2026 (Session: Phase 6 Organizer Dashboard Review Queue + Smoke)

### [SESSION] SESSION UPDATE:
- Implemented organizer dashboard refinement slice:
  - added pending payment review and pending result review metrics
  - added actionable review queue links to filtered registrants views
  - fixed broken quick action links (`/organizer/participants`, `/organizer/settings`)
  - mapped quick actions to working routes (`/organizer/events`, `/organizer/application-status`)
- Executed strict organizer dashboard smoke run (scripted manual flow):
  - final result: 9/9 steps passed
  - covered dashboard load, queue cards, queue links, quick action routes, and filtered review page access

### [UPDATED] UPDATED FILES (major):
1. src/routes/organizer.routes.js
2. src/views/organizer/dashboard.ejs
3. src/public/css/organizer-dashboard.css
4. docs/PRD.md

### MANUAL SMOKE CHECKLIST (Latest):
- [x] Organizer dashboard loads as approved organizer
- [x] Queue metrics render for pending payment/result reviews
- [x] Queue links route to filtered registrants views
- [x] Quick actions avoid broken routes and point to active organizer pages

## CHANGELOG - March 7, 2026 (Session: Phase 6 Organizer Analytics v2)

### [SESSION] SESSION UPDATE:
- Added organizer dashboard analytics v2 features:
  - range filter support (`7d`, `30d`, `all`)
  - range-based metrics (registrations, submissions, approved results)
  - per-event review queue breakdown with payment/result review links
  - quick controls for opening next pending payment/result reviews
- Ran strict organizer analytics smoke script:
  - final result: 7/7 steps passed

### [UPDATED] UPDATED FILES (major):
1. src/routes/organizer.routes.js
2. src/views/organizer/dashboard.ejs
3. src/public/css/organizer-dashboard.css
4. docs/PRD.md

### MANUAL SMOKE CHECKLIST (Latest):
- [x] Organizer dashboard range filter renders and applies
- [x] Range analytics metrics render for selected window
- [x] Queue-by-event breakdown renders with actionable links
- [x] Next pending payment/result quick actions open filtered registrant pages

## CHANGELOG - March 7, 2026 (Session: Phase 6 Runner Dashboard Iteration 2 Closeout)

### [SESSION] SESSION UPDATE:
- Completed Runner Dashboard iteration 2 polish and validation:
  - added KPI strip summary on runner dashboard
  - improved result status visibility and activity-type labeling
  - preserved filter state (`eventMode`, `resultStatus`, `groupQ`) across dashboard card forms
  - aligned activity rendering with submission/certificate timeline events
- Strict smoke/test validation executed:
  - `node --test tests/runner-dashboard-profile.test.js` -> PASS (2/2)
  - `node --test tests/running-group-smoke.test.js` -> initial FAIL (legacy `Group Update:` expectation), then PASS after test update
  - `node --test tests/submission.service.test.js` -> PASS (7/7)

### [UPDATED] UPDATED FILES (major):
1. src/views/runner/dashboard.ejs
   - Added KPI strip and improved activity/result card rendering
2. src/public/css/runner-dashboard.css
   - Added KPI, status badge, and activity badge styling + responsive adjustments
3. src/controllers/runner.controller.js
   - Ensured merged activity consistency for validation-error render path
4. src/services/submission.service.js
   - Fixed missing mongoose import for performance snapshot aggregation
5. tests/running-group-smoke.test.js
   - Updated dashboard activity assertion to current UI contract
6. tests/submission.service.test.js
   - Added performance snapshot coverage
7. docs/PRD.md
   - Marked Sprint B item 1 (Runner dashboard iteration 2) as done

### MANUAL SMOKE CHECKLIST (Latest):
- [x] Runner dashboard/profile regression checks pass
- [x] Running-group strict smoke script passes against current dashboard UI
- [x] Submission snapshot/service regression checks pass

## CHANGELOG - March 7, 2026 (Session: Phase 5 Buildout - Submissions, Certificates, Leaderboard, Dashboard Stats)

### [SESSION] SESSION UPDATE:
- Implemented major Phase 5 delivery milestones:
  - P5-A submission model + service lifecycle
  - P5-B runner submit/resubmit result flow
  - P5-C organizer submission review flow (approve/reject)
  - P5-D certificate generation + secured runner download endpoint
  - P5-E live leaderboard page with approved-submission filters
  - P5-F runner dashboard certificate/stat card integration
- Added route guards and service coverage for new Phase 5 flows.
- Executed full regression:
  - `npm test` passed (36/36).

### [NEW] NEW FILES:
1. src/services/submission.service.js
2. src/services/certificate.service.js
3. src/services/leaderboard.service.js
4. src/public/css/leaderboard.css
5. tests/submission.service.test.js
6. tests/submission-routes.test.js
7. tests/submission-review-route-guards.test.js
8. tests/certificate-access.test.js
9. tests/leaderboard.service.test.js

### [UPDATED] UPDATED FILES (major):
1. src/models/Submission.js
   - Added full Phase 5 submission schema fields + indexes

2. src/services/upload.service.js
   - Added result-proof upload middleware/helpers
   - Added generic binary buffer upload helper used by certificate issuance

3. src/controllers/page.controller.js
   - Added result submit/resubmit handlers
   - Added secured certificate download handler
   - Added leaderboard render handler integration

4. src/routes/pageRoutes.js
   - Added:
     - POST /my-registrations/:registrationId/submit-result
     - POST /my-registrations/:registrationId/resubmit-result
     - GET /my-submissions/:submissionId/certificate
   - Replaced leaderboard placeholder route handler with controller-backed data flow

5. src/routes/organizer.routes.js
   - Added result review routes:
     - POST /organizer/events/:id/submissions/:submissionId/approve
     - POST /organizer/events/:id/submissions/:submissionId/reject
   - Added result status filtering + summary counts in registrants page context

6. src/controllers/runner.controller.js
   - Added runner submission/certificate summary integration for dashboard

7. src/views/pages/my-registrations.ejs
   - Added result submit/resubmit forms + submission lifecycle display
   - Added certificate download links for approved submissions

8. src/views/organizer/event-registrants.ejs
   - Added result columns, filters, and organizer approve/reject forms

9. src/views/pages/leaderboard.ejs
   - Replaced placeholder with live ranking table + filters

10. src/views/runner/dashboard.ejs
    - Replaced Phase 5 placeholder certificate card with live certificate list/count
    - Added submission statistics to progress metrics card

11. docs/PRD.md
    - Updated Sprint B deferred item and Phase 5 status/progress checkpoints

### Key Behavior Changes
  - Runners can submit and resubmit result proofs from My Registrations.
  - Organizers can review submitted results directly in Registrants view.
  - Approved results now generate downloadable certificates.
  - Public leaderboard now shows approved-result rankings with filters.
  - Runner dashboard now displays real submission and certificate metrics.

## CHANGELOG - March 7, 2026 (Session: Sprint B Running Group Integration + Coverage)

### [SESSION] SESSION UPDATE:
- Completed Sprint B running-group deeper integration and validation:
  - added running-group detail page with recent activity feed
  - merged running-group activity into runner dashboard activity log
  - added strict smoke test automation for running-group flows
  - added runner profile + dashboard grouping automated coverage
- Executed regression tests after implementation:
  - full test suite passed (20/20).

### [NEW] NEW FILES:
1. src/models/RunningGroupActivity.js
2. src/views/runner/group-detail.ejs
3. tests/running-group-smoke.test.js
4. tests/runner-dashboard-profile.test.js

### [UPDATED] UPDATED FILES (major):
1. src/services/running-group.service.js
   - Added group activity logging for create/join/leave actions
   - Added group lookup by slug and activity query methods
   - Added current-runner group activity fetch helper

2. src/controllers/runner.controller.js
   - Added running-group detail page handler
   - Added merged activity feed behavior (registration + group activity)
   - Added safe returnTo support for group create/join/leave redirects

3. src/routes/runner.routes.js
   - Added: GET /runner/groups/:slug

4. src/views/runner/dashboard.ejs
   - Added links/actions to group detail page
   - Added mixed activity rendering for running-group updates
   - Added returnTo hidden fields for group action forms

5. src/public/css/runner-dashboard.css
   - Added styles for group detail page actions and inline group action layout

6. tests/running-group.service.test.js
   - Expanded service assertions for activity and slug/current-group helpers

7. docs/PRD.md
   - Updated Sprint B backlog and status to reflect completed integration and coverage

### Key Behavior Changes
  - Runners can open dedicated group pages at /runner/groups/:slug.
  - Running group create/join/leave actions now produce timeline activity entries.
  - Runner dashboard activity log now includes group events alongside registrations.
  - Group action flows preserve origin page via safe returnTo redirects.

### MANUAL SMOKE CHECKLIST (Latest):
- [x] Unauthenticated running-group detail route redirects to /login
- [x] Runner can create a group and see it on dashboard
- [x] Group detail page loads and displays recent activity
- [x] Second runner can join from detail flow and activity reflects join

## CHANGELOG - March 7, 2026 (Session: Phase 4 Payment Proof Workflow + E2E Smoke)

### [SESSION] SESSION UPDATE:
- Implemented Phase 4 payment proof workflow end-to-end:
  - runner proof upload/re-upload
  - organizer approve/reject with notes/reason
  - payment metadata persistence + status transitions
  - notification hooks + UI updates
- Added automated payment workflow regression tests (node:test).
- Ran strict E2E smoke with seeded users/events/registrations:
  - submit -> approve/reject -> re-submit -> approve
  - final result: 13/13 steps passed.

### [NEW] NEW FILES:
1. src/utils/payment-workflow.js
2. tests/payment-workflow.test.js

### [UPDATED] UPDATED FILES (major):
1. src/models/Registration.js
   - Added payment proof and review metadata fields
   - Expanded paymentStatus lifecycle
   - Removed duplicate confirmationCode index declaration (startup warning cleanup)

2. src/services/upload.service.js
   - Added payment proof upload middleware + R2 helper

3. src/controllers/page.controller.js
   - Added runner payment proof submit handler
   - Added transition guards and organizer notification trigger

4. src/routes/pageRoutes.js
   - Added protected + rate-limited payment proof upload route

5. src/routes/organizer.routes.js
   - Added approve/reject payment routes
   - Added payment-status filtering, summary counts, and export columns

6. src/views/pages/my-registrations.ejs
   - Added runner payment proof form, statuses, and rejection visibility

7. src/views/organizer/event-registrants.ejs
   - Added organizer payment review controls and payment columns

8. src/public/css/events.css
9. src/public/css/organizer-events.css
   - Added Phase 4 UI styles for payment workflow states/forms

10. src/services/email.service.js
    - Added payment submitted/approved/rejected email functions

11. src/services/runner-data.service.js
12. src/controllers/runner.controller.js
    - Updated unpaid logic to include rejected-proof re-submit path

13. package.json
    - test script now runs node:test suite

### Key Behavior Changes
  - Runner can now upload payment proof from /my-registrations.
  - Organizer can approve/reject submitted proof directly from event registrants view.
  - Rejected proof can be re-submitted; latest approved state clears rejection reason.
  - Payment workflow state transitions are now validated by shared utility + automated tests.

### MANUAL SMOKE CHECKLIST (Latest):
- [x] Runner can submit payment proof for unpaid registration
- [x] Organizer can approve submitted proof
- [x] Organizer can reject submitted proof with reason
- [x] Runner can see rejection reason and re-submit
- [x] Re-submission can be approved and finalized as paid
- [x] Final DB state matches expected payment lifecycle
- [ ] Inbox-level delivery confirmed for submitted/approved/rejected emails

## CHANGELOG - March 7, 2026 (Session: Phase 4 QA/Polish + Exit Criteria Closeout)

### [SESSION] SESSION UPDATE:
- Completed Phase 4 stabilization and QA closeout:
  - added route-level guard tests (auth + ownership + invalid transition)
  - improved mobile/tablet usability for payment UI in runner and organizer screens
  - completed registration + waiver + export smoke checks
- Updated planning status in PRD.md to mark Phase 4 done within in-app scope.

### [NEW] NEW FILES:
1. tests/payment-route-guards.test.js

### [UPDATED] UPDATED FILES (major):
1. src/public/css/organizer-events.css
   - Responsive improvements for payment action forms, filter controls, and registrants table readability

2. src/public/css/events.css
   - Improved mobile ergonomics for my-registrations payment-proof form and badge legibility

3. docs/PRD.md
   - Added final validation notes and moved Sprint A smoke item + Phase 4 status to done

### Key Behavior Changes
  - Route-level protections for payment workflow are now covered by automated tests.
  - Payment review controls are easier to use on small screens.
  - Runner payment proof UI remains readable and actionable at mobile widths.

### MANUAL SMOKE CHECKLIST (Latest):
- [x] Registration form + waiver submission flow
- [x] CSV export includes waiver and payment workflow columns
- [x] XLSX export includes waiver and payment workflow columns
- [x] Runner payment UI states render as expected (mobile-aware)
- [x] Organizer payment UI states/actions render as expected (mobile-aware)

## CHANGELOG - March 7, 2026 (Session: Sprint B Running Group Foundation Baseline)

### [SESSION] SESSION UPDATE:
- Implemented baseline running group feature for runner dashboard:
  - create, search, join, and leave workflows
  - current group visibility and popular group listing
- Added backend model/service and runner endpoints for group operations.

### [NEW] NEW FILES:
1. src/models/RunningGroup.js
2. src/services/running-group.service.js

### [UPDATED] UPDATED FILES (major):
1. src/controllers/runner.controller.js
   - Dashboard now loads running-group context (current group, top groups, search results)
   - Added create/join/leave handlers

2. src/routes/runner.routes.js
   - Added:
     - POST /runner/groups/create
     - POST /runner/groups/join
     - POST /runner/groups/leave

3. src/views/runner/dashboard.ejs
   - Replaced running-group placeholder with functional UI flows

4. src/public/css/runner-dashboard.css
   - Added styles for running-group search/create/join/leave blocks

5. docs/PRD.md
   - Added Sprint B running-group kickoff status update

### Key Behavior Changes
  - Runner can create a new running group and auto-join immediately.
  - Runner can search and join existing running groups.
  - Runner can leave the current running group from dashboard.

## CHANGELOG - March 3, 2026 (Session: Documentation Standardization to Markdown + docs/)

### [SESSION] SESSION UPDATE:
- Standardized project planning/reference notes from `.txt` to `.md`.
- Created `docs/` directory and moved documentation files from project root.

### [NEW] NEW FILES:
1. docs/blog_feature.md
2. docs/CHANGELOG.md
3. docs/mongodb_schema.md
4. docs/organiser_flow.md
5. docs/seo key words.md
6. docs/sitetheme.md
7. docs/user-role-system.md
8. docs/PRD.md

### [REMOVED] REMOVED FILES:
1. dir.txt
2. PRD.txt
3. sitetheme.txt
4. user-role-system.txt
5. seo key words.txt
6. current-dir.txt

### [UPDATED] UPDATED FILES (major):
1. docs/CHANGELOG.md
   - Updated planning source reference to `PRD.md`
2. docs/PRD.md
   - Updated changelog/source references from `.txt` to `.md`

### Key Behavior Changes
  - Documentation now has a single canonical format (`.md`).
  - Root directory is cleaner; docs are now centralized under `docs/`.

## CHANGELOG - February 27, 2026 (Session: Blog Admin Edit + Autosave + Revision History)

### [SESSION] SESSION UPDATE:
- Implemented admin inline editing on blog review page with debounced autosave and revision tracking.

### [NEW] NEW FILES:
1. src/models/BlogRevision.js

### [UPDATED] UPDATED FILES (major):
1. src/routes/admin.routes.js
     - Added admin autosave endpoint:
       - PATCH /admin/blog/posts/:id/autosave
     - Added dedicated autosave rate limiter guard

2. src/controllers/blog.controller.js
     - Added autosaveBlogPostAdmin handler
     - Added partial-payload normalization for admin autosave
     - Added status transition consistency handling during autosave
     - Added revision logging (before/after + changedFields)
     - Added renderAdminReviewPage revision loading for history panel

3. src/views/admin/blog-review.ejs
     - Added full admin editable panel for post fields
     - Added debounced autosave client flow + save state badges
     - Added unsaved-change guard on page unload
     - Added moderation action panel UX refinements
     - Added dynamic moderation action visibility by selected status
     - Added Change History panel with expandable before/after details

### Key Behavior Changes
  - Admin can edit blog content/metadata directly from review page.
  - Edits autosave to backend without manual submit.
  - Each meaningful autosave now creates a BlogRevision record.
  - Review page now shows recent revision history (editor, time, changed fields, before/after).

### MANUAL SMOKE CHECKLIST (Latest):
- [ ] Admin review page autosaves after typing pause (~900ms)
- [ ] Autosave status transitions: Unsaved -> Saving -> Saved
- [ ] Validation errors show autosave failure state
- [ ] Status change via autosave updates moderation action visibility correctly
- [ ] BlogRevision records are created only when fields actually change
- [ ] Change History panel renders recent revision entries correctly

## CHANGELOG - February 27, 2026 (Session: Blog Phase A Build - Tasks 1 to 10)

### [SESSION] SESSION UPDATE:
- Implemented Blog Phase A foundation end-to-end:
  data model, author flow, admin moderation flow, public read pages, cover upload,
  SEO metadata support, security guardrails, and view-count policy.

### [NEW] NEW FILES:
1. src/models/Blog.js
2. src/models/BlogView.js
3. src/routes/blog.routes.js
4. src/controllers/blog.controller.js
5. src/services/blog-view.service.js
6. src/utils/blog.js
7. src/utils/sanitize.js
8. src/middleware/rate-limit.middleware.js
9. src/public/css/blog-pages.css
10. src/views/blog/author-dashboard.ejs
11. src/views/blog/author-form.ejs
12. src/views/admin/blog-queue.ejs
13. src/views/admin/blog-review.ejs
14. src/views/pages/blog-post.ejs

### [UPDATED] UPDATED FILES (major):
1. src/routes/pageRoutes.js
     - /blog now uses dynamic controller listing
     - added /blog/:slug detail route

2. src/controllers/page.controller.js
     - added published blog list/detail handlers
     - added filter/sort/pagination support
     - added SEO payload generation (canonical/meta/OG/Twitter)
     - added 24-hour view tracking hook (user/IP based)
     - excludes admin and author self-views from count

3. src/views/pages/blog.ejs
     - replaced static "coming soon" page with real listing UI

4. src/views/layouts/head.ejs
     - now supports optional SEO fields:
       description, canonical, Open Graph, Twitter card tags

5. src/routes/admin.routes.js
     - added admin blog moderation page routes
     - added admin moderation API routes
     - added moderation rate limiter guard

6. src/routes/blog.routes.js
     - added author dashboard/form routes
     - kept JSON endpoints for API use
     - added write/submit rate limiter guards
     - wired cover upload middleware

7. src/services/upload.service.js
     - added blog cover upload middleware and R2 upload helper

### Key Behavior Changes
  - Authors can create/edit draft posts, submit for review, and delete draft/rejected posts.
  - Admin can review queue, approve/reject with reason, and archive published posts.
  - Public users can browse published posts via /blog and read /blog/:slug pages.
  - Blog views now follow 24-hour dedupe policy:
    - logged-in user: max 1 counted view per post per 24h
    - anonymous: max 1 counted view per IP per post per 24h
  - Public blog pages now emit canonical + social metadata for SEO sharing.

### MANUAL SMOKE CHECKLIST (Latest):
- [ ] Author create/edit/submit/delete flows work via UI pages
- [ ] Admin queue/review approve-reject-archive flows work via UI pages
- [ ] /blog listing filters/sort/pagination work with real data
- [ ] /blog/:slug increments views once per 24h policy
- [ ] Admin and author self-view do not increment public view counter
- [ ] Cover upload (JPG/PNG <= 5MB) works and old cover cleanup executes
- [ ] SEO tags render correctly in page source for blog list/detail

## CHANGELOG - February 27, 2026 (Session: Organizer UX + Event Reference Code Persistence)

### [SESSION] SESSION UPDATE:
- Improved organizer-facing language and records UX; introduced persistent event reference codes.

### [UPDATED] UPDATED FILES (major):
1. src/routes/organizer.routes.js
     - Create-event success now redirects to /organizer/events (My Events)
     - Added referenceCode generation during event creation

2. src/models/Event.js
     - Added referenceCode field (unique, sparse, immutable)

3. src/views/organizer/events.ejs
     - Replaced technical label wording:
       - "slug" -> "Event URL" (search placeholder + card label)

4. src/views/organizer/event-details.ejs
     - Replaced "Audit" section with user-friendly "Event Record"
     - Added:
       - Reference Code display
       - Organizer name and public event path display
       - Copy Reference Code / Copy Event Link actions
       - Collapsible "Technical details" for raw Event ID/Organizer ID
     - Now uses stored event.referenceCode (fallback kept for legacy records)

5. src/public/css/event-manage.css
     - Added styles for Event Record actions and technical details block

6. package.json
     - Added script:
       - backfill:event-reference-codes

### [NEW] NEW FILES:
1. src/utils/referenceCode.js
     - Shared reference-code builder:
       - format: AAA-YYDDMM
       - collision-safe suffixing: -02, -03, ...

2. src/scripts/backfill-event-reference-codes.js
     - One-time backfill tool for existing events missing referenceCode

### Key Behavior Changes
  - New events now persist a unique user-facing referenceCode
  - Organizer create-event flow lands on My Events after successful save/publish
  - Organizer event details hide raw IDs behind technical toggle
  - UI language is less technical ("Event URL" instead of "slug")

### MANUAL SMOKE CHECKLIST (Latest):
- [ ] Create event redirects to /organizer/events with success message
- [ ] New events store referenceCode in MongoDB
- [ ] Existing events backfilled via npm run backfill:event-reference-codes
- [ ] Event details show Reference Code and copy buttons work
- [ ] Technical details toggle reveals raw Event ID/Organizer ID correctly
- [ ] Organizer events page shows "Event URL" wording consistently

## CHANGELOG - February 26, 2026 (Session: Organizer Branding & Media Functional Upgrade)

### [SESSION] SESSION UPDATE:
- Organizer Branding & Media was refactored into per-item sections and made fully functional
  for Event Logo, Event Banner, Promotional Poster, and Gallery Images.

### [UPDATED] UPDATED FILES (major):
1. src/views/organizer/create-event.ejs
     - Reorganized Branding & Media to per-item flow:
       info/rules -> upload controls (for each media type)
     - Added functional poster + gallery inputs
     - Added live poster preview and gallery preview
     - Relaxed banner ratio from required to recommended

2. src/views/organizer/edit-event.ejs
     - Applied same per-item media layout as create-event
     - Added contextual image removal controls:
       - X remove overlay for logo/banner/poster (visible only if media exists)
       - Gallery per-image remove + remove-all controls
     - Added immediate remove behavior via API call (no full form submit needed)

3. src/routes/organizer.routes.js
     - Extended create/edit event persistence for:
       - posterImageUrl
       - galleryImageUrls
     - Added immediate media-remove endpoint:
       - POST /organizer/events/:id/media/remove
       - updates MongoDB immediately
       - deletes Cloudflare objects immediately when possible
     - Improved upload error mapping by source field

4. src/services/upload.service.js
     - Extended branding upload fields:
       - posterImageFile
       - galleryImageFiles[]
     - Extended R2 upload flow for poster/gallery
     - Added upload error field tracking for precise UI errors

5. src/models/Event.js
     - Added:
       - posterImageUrl (String)
       - galleryImageUrls (String[])

6. src/views/organizer/event-details.ejs
     - Added organizer-side rendering for poster and gallery

7. src/views/pages/event-details.ejs
     - Added public rendering for poster and gallery

8. src/views/organizer/event-preview.ejs
     - Added poster URL and gallery count to preview snapshot

9. src/public/css/create-event.css
     - Added per-item media block styling
     - Added overlay remove button styles
     - Added gallery thumbnail/remove styles

10. src/public/css/event-manage.css
     - Added organizer detail styles for poster/gallery

11. src/public/css/events.css
     - Added public event-detail styles for poster/gallery

### Key Behavior Changes
  - Poster and gallery are now first-class event media (URL or upload)
  - Media removal can now persist immediately on X-confirm (edit page)
  - Banner ratio is guidance only (not hard-blocked)
  - 400 upload errors now map to the correct field in UI

### MANUAL SMOKE CHECKLIST (Latest):
- [ ] Create event: logo/banner/poster/gallery inputs save correctly
- [ ] Edit event: X remove on logo/banner/poster updates immediately
- [ ] Edit event: gallery single-remove and remove-all update immediately
- [ ] MongoDB media fields match latest UI actions
- [ ] Cloudflare objects are deleted for removed/replaced assets
- [ ] Public event details show poster/gallery when available

## REPOSITORY STRUCTURE SNAPSHOT (High-Level)

helloRun/
  src/
    config/
      db.js
      session.js
    controllers/
      admin.controller.js
      auth.controller.js
      page.controller.js
      runner.controller.js
    middleware/
      auth.middleware.js
      role.middleware.js
    models/
      Counter.js
      Event.js
      OrganiserApplication.js
      Registration.js
      Submission.js
      User.js
    routes/
      admin.routes.js
      authRoutes.js
      event.routes.js
      organizer.routes.js
      pageRoutes.js
      runner.routes.js
    services/
      counter.service.js
      email.service.js
      password.service.js
      runner-data.service.js
      token.service.js
      upload.service.js
    scripts/
      backfill-event-reference-codes.js
    utils/
      country.js
      referenceCode.js
      waiver.js
    views/
      admin/
        applications-list.ejs
        application-details.ejs
        dashboard.ejs
      auth/
        login.ejs
        signup.ejs
        forgot-password.ejs
        reset-password.ejs
        reset-password-expired.ejs
        reset-email-sent.ejs
        reset-success.ejs
        resend-verification.ejs
        verify-email-sent.ejs
        verify-email-success.ejs
        verify-email-expired.ejs
        verify-email-result.ejs
      layouts/
        head.ejs
        nav.ejs
        footer.ejs
        main.ejs
      organizer/
        dashboard.ejs
        create-event.ejs
        edit-event.ejs
        event-details.ejs
        event-registrants.ejs
        events.ejs
        event-preview.ejs
        complete-profile.ejs
        application-status.ejs
      pages/
        home.ejs
        events.ejs
        event-details.ejs
        event-register.ejs
        my-registrations.ejs
        blog.ejs
        about.ejs
        leaderboard.ejs
        index.ejs
      runner/
        dashboard.ejs
      error.ejs
    public/
      css/
      images/
      js/
      uploads/
      robots.txt
      sitemap.xml
    server.js
  .env
  .env.example
  .gitignore
  package.json
  package-lock.json
  README.md
  dir.txt
  PRD.txt
## CHANGELOG - February 26, 2026 (Session: Runner Dashboard Data Cards + Route Refactor)

### [SESSION] SESSION UPDATE:
- Runner dashboard was upgraded from placeholders to real data cards, and runner route logic
  was refactored out of authRoutes.js for maintainability.

### [UPDATED] UPDATED FILES (major):
1. src/views/runner/dashboard.ejs
     - Replaced placeholder cards with real cards for upcoming, past, activity, and stats
     - Added profile completeness progress + missing-fields UI
     - Added "Continue Payment" CTA (placeholder flow) for unpaid registrations only
     - Added running-group placeholder section (no backend yet)

2. src/public/css/runner-dashboard.css
     - Added styling for data-list cards, profile completeness bar, compact stat rows,
       and warning CTA button

3. src/public/js/runner-dashboard.js
     - Removed obsolete placeholder fetch stubs
     - Kept practical UI behavior (logout confirm, profile submit guard)

4. src/controllers/page.controller.js
     - Switched /my-registrations to use shared runner registration data service

5. src/server.js
     - Registered new runner routes module

### [NEW] NEW FILES (3):
1. src/routes/runner.routes.js
     - Dedicated runner route ownership for dashboard + profile update

2. src/controllers/runner.controller.js
     - Runner dashboard data shaping
     - Profile update handling
     - Profile completeness computation

3. src/services/runner-data.service.js
     - Shared runner registration data source for dashboard and my-registrations
     - Upcoming/past/activity/stats derivation helpers

### Key Behavior Changes
  - Runner dashboard now displays real registration-driven content
  - Upcoming/past classification uses eventStartAt
  - Continue Payment button appears only when paymentStatus is unpaid
  - Profile completeness is visible and actionable
  - Runner logic is now decoupled from authRoutes.js

### MANUAL SMOKE CHECKLIST (Latest):
- [ ] /runner/dashboard renders for users with no registrations
- [ ] Upcoming vs past split is correct by eventStartAt
- [ ] Continue Payment appears only for unpaid records
- [ ] Profile completeness percentage and missing fields are correct
- [ ] /my-registrations and dashboard registration counts are consistent
- [ ] /runner/profile update succeeds through new runner routes/controller

## CHANGELOG - February 25, 2026 (Session: Waiver + Profile Snapshot + Organizer Export Upgrade)

### [SESSION] SESSION UPDATE:
- Organizer and runner registration flows were refined with mandatory waivers,
  richer runner profile snapshot data, and export tooling improvements.

### [UPDATED] UPDATED FILES (major):
1. src/models/User.js
     - Added runner profile fields:
       mobile, country, dateOfBirth, gender,
       emergencyContactName, emergencyContactNumber, runningGroup

2. src/models/Event.js
     - Added mandatory waiver fields:
       waiverTemplate (required), waiverVersion

3. src/models/Registration.js
     - Extended participant snapshot:
       dateOfBirth, gender, emergencyContactName, emergencyContactNumber, runningGroup
     - Added waiver snapshot object:
       accepted, version, signature, acceptedAt, templateSnapshot, renderedSnapshot

4. src/utils/waiver.js (NEW)
     - Added default waiver template
     - Added placeholder rendering helpers:
       {{ORGANIZER_NAME}}, {{EVENT_TITLE}}

5. src/routes/authRoutes.js + src/views/runner/dashboard.ejs + src/public/js/runner-dashboard.js + src/public/css/runner-dashboard.css
     - Added runner profile management UI + validation + save route
     - Added running group suggestion support

6. src/controllers/page.controller.js + src/views/pages/event-register.ejs + src/public/css/events.css
     - Registration now uses runner profile snapshot data
     - Added mandatory waiver checkbox/signature validation
     - Enforced signature must match account full name
     - Added waiver rendering and persistence at registration time

7. src/routes/organizer.routes.js + src/views/organizer/*
     - Added closed-event edit guard (cannot edit closed events)
     - Added mandatory waiver template handling in create/edit
     - Added waiver version bump on template change
     - Added live waiver preview context support and default template injection
     - Added registrants CSV export and XLSX export (with filters)
     - Added waiver/profile columns in registrants table + search expansion

8. package.json / package-lock.json
     - Added xlsx dependency for Excel export

### Key Behavior Changes
  - Event waiver is now always required
  - Organizer can edit published events, but not closed events
  - Existing registrations remain valid after waiver updates
  - New registrants accept current waiver version only
  - Organizer can export registrants as CSV and XLSX

### MANUAL SMOKE CHECKLIST (Latest):
- [ ] Create event shows waiver editor + live preview
- [ ] Reset waiver button prompts confirmation and restores default
- [ ] Edit published event works; edit closed event blocked
- [ ] Runner registration enforces waiver checkbox + strict signature match
- [ ] Registrants table shows waiver/profile snapshot fields
- [ ] CSV export downloads valid filtered data
- [ ] XLSX export downloads valid filtered data


## CHANGELOG - February 24, 2026 (Session: Phase 4 Kickoff - Account Registration Flow)

### [SESSION] SESSION UPDATE: Published events are now viewable publicly, and account-required event registration is implemented (initial pass).

### Phase Status Snapshot
  - Phase 3 (Event Creation & Management): In progress, major working baseline complete (create/edit/list/details/status + public published view)
  - Phase 4 (Registration System): In progress (account-required registration flow now implemented)

### Implemented In This Pass
1. Public published event viewing
     - /events now lists only published events
     - /events/:slug shows public event details
     - draft/closed events are blocked from public details

2. Account-required event registration
     - GET /events/:slug/register (requires login)
     - POST /events/:slug/register (requires login)
     - If not logged in: redirect to login, then return to intended register page

3. Registration guards and rules
     - Event must be published
     - Registration window must be open
     - Participation mode must be allowed by event type/modes
     - One registration per user per event (duplicate blocked)
     - Registration email is enforced from logged-in helloRun account

4. Data + email integration
     - Registration model implemented with unique indexes and confirmation code
     - Confirmation email added (graceful failure: DB success does not roll back on email send failure)

5. User registration visibility
     - Added /my-registrations (auth required)
     - Added "My Registrations" navigation and page entry links

### MANUAL SMOKE CHECKLIST (Published Events + Registration):
- [ ] /events shows published events only
- [ ] /events/:slug returns 404 for draft/closed/unavailable events
- [ ] Logged-out user opening /events/:slug/register is redirected to /login
- [ ] After login, user returns to intended /events/:slug/register page
- [ ] Eligible account can register once successfully
- [ ] Duplicate registration attempt is blocked with clear message
- [ ] Invalid participation mode is blocked
- [ ] Closed registration window is blocked
- [ ] Confirmation code appears after successful registration
- [ ] Confirmation email send is attempted (without breaking successful registration on failure)
- [ ] /my-registrations displays newly created registration record
## CHANGELOG - February 24, 2026 (Session: Organizer Phase 3 Polish)

### [SESSION] SESSION UPDATE: Organizer event management polish (search/sort, timeline metadata, preview hardening)

### [UPDATED] UPDATED FILES (8):
1. src/routes/organizer.routes.js
     - Added GET /organizer/preview-event for create-form preview rendering
     - Added organizer events list query support:
       - status: draft | published | closed
       - q: free-text search (title, organiserName, slug, venue, city, country)
       - sort: newest | oldest | start_asc | start_desc
     - Added safe regex escaping for text search
     - Normalized proofTypesAllowed input to allowed values only (gps, photo, manual)
     - Hardened persistence by event type:
       - onsite: clears virtual proof rules
       - virtual/hybrid: keeps virtual fields

2. src/views/organizer/create-event.ejs
     - Kept event type as dropdown (virtual, onsite, hybrid)
     - Fixed branding preview JS to avoid null-image runtime errors
     - Preview button now lands on working /organizer/preview-event route

3. src/views/organizer/event-preview.ejs (NEW)
     - Added full event preview page for unsaved form data
     - Shows validation summary and schema-aligned field snapshot

4. src/views/organizer/edit-event.ejs
     - Refactored to sectioned layout aligned with create form
     - Added event type conditional sections (location and virtual rules)

5. src/views/organizer/events.ejs
     - Added search input and sort dropdown in filter bar
     - Added no-match empty state for filtered searches

6. src/public/css/organizer-events.css
     - Added search input sizing rules in filter bar

7. src/views/organizer/event-details.ejs
     - Added timeline metadata card (created, updated, registration checkpoints)
     - Added audit card (eventId, organizerId)

8. src/public/css/event-manage.css
     - Added safer code wrapping for long IDs

### MANUAL SMOKE CHECKLIST (Organizer Events):
- [ ] Approved organizer can open /organizer/create-event
- [ ] Event Type dropdown values are exactly: virtual, onsite, hybrid
- [ ] Preview button opens /organizer/preview-event and shows validation state
- [ ] Save Draft creates event with status=draft
- [ ] Publish creates event with status=published
- [ ] /organizer/events supports:
      - status filter
      - text query q
      - sort option changes ordering
- [ ] /organizer/events empty filtered results show "No matching events"
- [ ] /organizer/events/:id shows Timeline + Audit sections
- [ ] Draft -> Published transition works when event data is valid
- [ ] Published -> Closed transition works
- [ ] Invalid transition attempts are blocked with clear message
## CHANGELOG - February 24, 2026
### [SESSION] SESSION UPDATE: PHASE 2C ADMIN REVIEW HARDENING COMPLETE
### [UPDATED] UPDATED FILES (6):
1. src/controllers/admin.controller.js - Full review logic, status transition guards, reject validation, admin-safe 404/500 rendering, query filter support
2. src/routes/admin.routes.js - Cleaned route comments, confirmed requireAdmin coverage
3. src/views/admin/applications-list.ejs - Added status filter, free-text search, improved table + empty state
4. src/views/admin/application-details.ejs - Added review action panel, rejection reason constraints, reviewed metadata, safer document links
5. src/views/admin/dashboard.ejs - Added actionable metrics cards + filtered CTAs
6. src/public/css/admin.css (NEW) - Dedicated admin styling for dashboard/list/detail views
### [DONE] PHASE 2C DELIVERABLES COMPLETED:
  - Admin list filters: status + search query
  - Approve/reject flow hardened with valid status transitions
  - Rejection reason server-side validation (min/max)
  - User status/role consistency updates on decision
  - Real email notifications via email.service with graceful failure handling
  - Improved admin UX and feedback messaging


## CHANGELOG - February 19, 2026 (Session 3 - LATEST)

### [NAV] NAV UPDATE: BLOG + LEADERBOARD LINKS

### [UPDATED] UPDATED FILES (2):
1. src/views/layouts/nav.ejs
     - Added Blog link (/blog) in public nav links
     - Added Leaderboard link (/leaderboard) in public nav links
     - Both visible to all users (logged in and logged out)

2. src/routes/pageRoutes.js
     - Added GET /leaderboard route (placeholder page)

### [NEW] NEW FILES (1):
1. src/views/pages/leaderboard.ejs
     - Placeholder page with "Coming soon" message
     - Will be populated with real data in Phase 5 (Submissions & Results)

## CHANGELOG - February 19, 2026 (Session 2)

### [TOOLS] AUTH MIDDLEWARE REWRITE & NAV FIX

### [UPDATED] UPDATED FILES (4):
1. src/middleware/auth.middleware.js (FULL REWRITE)
     - Removed old duplicate exports.setUserContext / exports.requireAuth pattern
     - Single `const User = require(...)` at top of file (fixed User is not defined)
     - Consolidated into clean named functions:
       - populateAuthLocals - Sets res.locals for nav (isAuthenticated, isAdmin, isOrganizer, etc.)
       - redirectIfAuth - Redirects logged-in users away from login/signup to their dashboard
       - requireAuth - Protects routes requiring login
       - requireAdmin - Protects admin-only routes
       - requireOrganizer - Protects organiser-only routes
       - requireApprovedOrganizer - Protects approved-organiser-only routes
     - Single module.exports at bottom (no more exports.xxx conflicts)

2. src/routes/authRoutes.js
     - Added `redirectIfAuth` middleware to GET/POST login, signup, register routes
     - Logged-in users redirected to role-based dashboard instead of seeing login page
     - Added `handleRegistration` function definition before router.post references

3. src/views/layouts/nav.ejs
     - Role-based dashboard links (Admin -> /admin/dashboard, Organizer -> /organizer/dashboard, Runner -> /runner/dashboard)
     - Pending organizer -> /organizer/application-status
     - Auth-aware: shows Login/Sign Up when logged out, Hi [Name] + Logout when logged in
     - Added aria labels for accessibility
     - Logout icon with lucide icons

4. src/public/css/style.css
     - .nav-user styles (border-left separator, username, logout button)
     - .nav-auth-buttons styles (Login/Sign Up button group)
     - .nav-login-btn / .nav-signup-btn styles
     - .nav-logout-btn with orange outline, hover fill
     - Mobile responsive nav-user and nav-auth-buttons (768px breakpoint)
     - .logout-form inline display

### [FIXED] BUGS FIXED:
  [DONE] User is not defined in populateAuthLocals (missing require at top of file)
  [DONE] requireAuth is not defined (old exports pattern conflicting with module.exports)
  [DONE] Nav always showing Login/Sign Up even when logged in (populateAuthLocals crashing)
  [DONE] Logged-in users could access /login and /signup pages (added redirectIfAuth)
  [DONE] handleRegistration is not defined (function defined after reference)

### [REMOVED] REMOVED:
  - src/routes/index.routes.js (dead file)
  - src/routes/index.js (dead file)
  - Old exports.setUserContext pattern from auth.middleware.js
  - Old exports.requireAuth pattern from auth.middleware.js

## CHANGELOG - February 19, 2026 (Session 1)

### [DESIGN] HOME PAGE & UI IMPROVEMENTS

### [UPDATED] UPDATED FILES (2):
1. src/views/pages/home.ejs
     - Replaced Font Awesome icon placeholder with helloRun-icon.webp logo
     - Full landing page: hero, features, how-it-works, testimonial, CTA sections
     - Proper <head> include with GA tracking
     - Font Awesome CDN for section icons

2. src/public/css/helloRun.css
     - Improved button contrast (WCAG AA compliant)
     - .btn-primary: darker orange (#e8873a) for white text readability
     - .btn-outline: dark slate (#1e293b) border/text for hero visibility
     - .cta-section .btn-primary: dark slate (#1e293b) for CTA contrast
     - .hero-logo styles for responsive image sizing
     - .hero-buttons z-index fix for clickability
     - Comprehensive mobile responsive styles (768px & 480px breakpoints)
     - Stacked buttons on mobile, scaled hero visual, single-column features

### [FIXED] BUGS FIXED:
  [DONE] Hero buttons not clickable (z-index / pointer-events fix)
  [DONE] Poor button contrast on light backgrounds
  [DONE] Hero visual using placeholder icon instead of actual logo

## CHANGELOG - February 17, 2026 (Session 2)

### [TOOLS] BUG FIXES & UI IMPROVEMENTS

### [UPDATED] UPDATED FILES (4):
1. src/views/auth/resend-verification.ejs
     - Fixed: readOnly instead of disabled on email input during submit
     - Added: Disable input & button after successful email send
     - Added: "[DONE] Verification link sent" button text on success
     - Added: "Try again" link for retry after success
     - Prevents spam submissions

2. src/views/auth/verify-email-success.ejs
     - Compact layout to avoid scrolling
     - Reduced padding and icon sizes
     - Tighter spacing throughout

3. src/views/auth/forgot-password.ejs
     - Added "Resend Verification Email" link in auth-links section

4. src/routes/page.routes.js
     - Added routes: GET /, /events, /blog, /about
     - Fixed 404 errors for nav links

### [NEW] NEW FILES (3):
1. src/views/pages/home.ejs - Landing page placeholder
2. src/views/pages/blog.ejs - Blog placeholder
3. src/views/pages/about.ejs - About placeholder

### [FIXED] BUGS FIXED:
  [DONE] req.body empty on POST /resend-verification (disabled input fix)
  [DONE] 404 on /, /events, /blog, /about (missing page routes)

## CHANGELOG - February 17, 2026 (Session 1)

### [DESIGN] UI/UX IMPROVEMENT: VERIFY EMAIL SENT PAGE

### [NEW] NEW FILES (1):
1. src/public/css/verify-email-sent.css (NEW - extracted & optimized)
     - Compact design with reduced padding & spacing
     - Two-panel layout (40% illustration + 60% content)
     - Smooth animations (slideUp, scaleIn, float, pulse)
     - Mobile-responsive (768px & 480px breakpoints)
     - Custom scrollbar styling
     - 450+ lines of optimized CSS
     - Unique class prefixes (verify-*) to prevent conflicts

### [UPDATED] UPDATED FILES (1):
1. src/views/auth/verify-email-sent.ejs
     - Removed inline styles (moved to separate CSS file)
     - Linked new verify-email-sent.css stylesheet
     - HTML structure unchanged for full compatibility

### [CLEANUP] CLEANUP: AUTHENTICATION ROUTES CONSOLIDATION

### [DONE] REMOVED FILES (1):
1. src/routes/auth.routes.js (incomplete, causing duplication)

### [DONE] CONSOLIDATED FILES (1):
1. src/routes/authRoutes.js - Single source of truth for all auth routes

## CHANGELOG - February 14-17, 2026

### [MODULE] PHASE 2B: ORGANIZER APPLICATION SYSTEM - FORMS & STATUS [DONE] COMPLETE (Feb 14)

### [NEW] NEW FILES (6):
1. src/views/organizer/complete-profile.ejs (3-step form wizard, 400+ lines)
2. src/public/css/complete-profile.css (professional styling, 600+ lines)
3. src/public/js/complete-profile.js (form logic & validation, 500+ lines)
4. src/views/organizer/application-status.ejs (status timeline, 350+ lines)
5. src/public/css/application-status.css (status styling, 800+ lines)
6. src/public/js/application-status.js (auto-refresh & copy, 150+ lines)

### [UPDATED] UPDATED FILES (1):
1. src/routes/organizer.routes.js

## CHANGELOG - February 5, 2026

### [NEW] SESSION UPDATE: LOGIN FLOW & NAVIGATION ENHANCEMENT

### [DONE] UPDATED FILES (11):
1. src/controllers/auth.controller.js - Role-based login redirects
2. src/controllers/page.controller.js - Flash message handling
3. src/middleware/auth.middleware.js - setUserContext middleware
4. src/routes/authRoutes.js - Login & logout handlers
5. src/views/layouts/nav.ejs - User menu with role-based nav
6. src/views/pages/events.ejs - Auth-based hero content
7. src/public/css/style.css - User menu styles
8. src/public/css/events.css (NEW) - Events page styling
9. src/server.js - Route prefix cleanup
10. .gitignore - Updated with upload directories
11. package.json - Dependencies verified





