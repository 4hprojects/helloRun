# DOCUMENT ROLE (SOURCE OF TRUTH)
- Purpose: Product planning, roadmap, detailed tasks, and phase accomplishments.
- Update cadence: When priorities change or a milestone is completed.
- Changelog reference: See CHANGELOG.md for repository-level change history.

## STATUS UPDATE (Apr 22, 2026 - Admin Review Queue + Nav UX Polish + Shop Draft)

### Current reality after latest implementation

### COMPLETED in this cycle
- Documentation structure cleanup:
  - renamed `docs/wireframe.md` to `docs/PRD.md`
  - renamed `docs/dir.md` to `docs/CHANGELOG.md`
  - updated internal references to the new document names
- Added draft shop planning:
  - added Phase 11 Shop / Merchandise Feature to this PRD
  - created `docs/shop_feature.md` for dedicated shop feature planning
- Completed admin review queue polish:
  - added `/admin/reviews` cross-event queue for pending payment proofs and submitted run proofs
  - added payment/result filters, search, sort, counts, and empty state
  - linked admin dashboard pending payment/result review cards to the new queue
  - kept approve/reject actions on the existing event registrants review surface
- Updated navigation UX:
  - replaced main nav text links with icon buttons and hover/focus labels
  - improved hamburger menu into an overlay panel on tablet/mobile
  - made hamburger panel compact, content-width, semi-transparent, right-aligned, and label-visible
  - refined mobile logout action sizing and alignment
- Refreshed `/about` page content:
  - expanded runner and organizer value messaging
  - added platform capability list and trust/momentum sections
  - added clearer calls to browse events and create an account
- Polished auth UI surfaces:
  - improved login/signup primary and Google button contrast and icon treatment
  - compacted the sign-in panel layout while preserving touch-friendly controls
  - refined `/forgot-password` action buttons into a symmetric three-column layout
  - aligned the forgot-password heading icon and compacted the tip message

### Validation signals recorded
- `tests/static-pages.test.js` -> PASS
- `tests/admin-dashboard.test.js` -> PASS
- `tests/submission-review-route-guards.test.js` -> PASS
- `tests/payment-route-guards.test.js` -> PASS
- `tests/runner-dashboard-modal.test.js` -> PASS
- `tests/google-oauth-routes.test.js` -> PASS
- `tests/privacy-signup-consent.test.js` -> PASS

### Still pending from this scope
- Optional visual QA:
  - manual browser check for hamburger overlay on common mobile widths
  - decide whether desktop nav should keep native browser `title` tooltip in addition to custom tooltip

## STATUS UPDATE (Mar 10, 2026 - Run Proof Submission UX + Review Access Expansion)

### Current reality after latest implementation

### COMPLETED in this cycle
- Continued run-proof submission rollout (multi-entry modal pattern):
  - added `Submit Run Proof` CTA in `/runner/dashboard` welcome panel
  - added `Submit Run Proof` CTA in `/` home hero section
  - replaced `/my-registrations` inline result submit form with reusable modal trigger
- Improved submission detail visibility:
  - runner-facing cards now show run date and run location in result details
  - organizer registrant review now shows run date and run location
- Expanded moderation capability:
  - admin accounts can use the existing organizer registrant review flow for payment/result moderation
  - review statuses remain aligned: `submitted`, `approved`, `rejected`
  - admin dashboard now includes direct link from pending-result metric to live review queue

### Validation signals recorded
- `tests/submission-routes.test.js` -> PASS
- `tests/submission.service.test.js` -> PASS
- `tests/submission-review-route-guards.test.js` -> PASS
- `tests/admin-dashboard.test.js` -> PASS
- `tests/static-pages.test.js` -> PASS

### Still pending from this scope
- Optional polish:
  - add active eligible-event count badge on modal trigger buttons

## STATUS UPDATE (Mar 9, 2026 - Privacy Page Navigation UX Polish)

### Current reality after latest implementation

### COMPLETED in this cycle
- Added a second right-side panel on `/privacy`:
  - `Quick Contents` TOC under the existing `At a Glance` card
- TOC generation is now more resilient:
  - primary source: rendered `h1/h2/h3` headings
  - fallback source: bold-leading section labels when heading tags are not present
- Improved long-content sidebar behavior:
  - right-side stack is viewport-bounded
  - TOC list scrolls internally when long
  - `At a Glance` title remains fixed while only card body scrolls

### Validation signals recorded
- `tests/static-pages.test.js` -> PASS

### Still pending from this scope
- Optional UX follow-up:
  - add active-section highlight in TOC while scrolling through policy sections

## STATUS UPDATE (Mar 9, 2026 - Cookie Policy Admin + Consent Enforcement Completed)

### Current reality after latest implementation

### COMPLETED in this cycle
- Cookie Policy now follows the same admin legal-doc workflow as Privacy and Terms:
  - `/admin/cookie-policy` list/history
  - draft create/edit
  - preview + auto-format
  - publish/clone/archive
- Added admin dashboard entry points for Cookie Policy management.
- Public Cookie Policy page is live:
  - `/cookie-policy` (with `/cookies` alias)
  - fallback source: `docs/contents/Cookie Policy.md`
- Signup consent was strengthened:
  - local signup requires acceptance of Terms + Privacy + Cookie policies
  - Google signup intent requires policy consent before redirecting to Google OAuth
  - newly created Google accounts now store accepted policy versions (including cookie policy)
- Added seed utility:
  - `npm run seed:cookie-policy`

### Validation signals recorded
- `tests/admin-dashboard.test.js` -> PASS
- `tests/static-pages.test.js` -> PASS
- `tests/google-oauth-routes.test.js` -> PASS
- `tests/privacy-signup-consent.test.js` -> PASS

### Still pending from this scope
- Ops/release hardening:
  - seed and publish initial cookie policy version in target environment
  - run manual admin smoke on `/admin/cookie-policy` (draft -> preview -> publish path)
  - confirm legal placeholders/encoding cleanup in source markdown before first final legal publish

## STATUS UPDATE (Mar 9, 2026 - Legal Policy System Expanded to Terms and Conditions)

### Current reality after latest implementation

### COMPLETED in this cycle
- Terms and Conditions now follows the same admin workflow as Privacy:
  - list/history
  - create draft
  - edit draft
  - preview and auto-format
  - publish
  - archive
  - clone
- Public terms page is now dynamic:
  - `/terms` loads current published DB version (`slug: terms-of-service`)
  - fallback source is `docs/contents/Terms and Conditions.md`
- Signup consent capture now records both legal docs:
  - privacy policy ID/version + timestamp/IP/user-agent
  - terms policy ID/version + timestamp/IP/user-agent
- Added one-time terms seed command:
  - `npm run seed:terms-policy`

### Validation signals recorded
- `tests/admin-dashboard.test.js` -> PASS
- `tests/static-pages.test.js` -> PASS
- `tests/privacy-signup-consent.test.js` -> PASS

### Still pending from this scope
- Production content hardening:
  - replace remaining placeholder/legal entity fields in privacy/terms drafts
  - remove encoding artifacts from imported markdown source before first live publish
- Operational closeout:
  - run staging publish smoke for both `/privacy` and `/terms`
  - backfill consent metadata for legacy users if needed

## STATUS UPDATE (Mar 9, 2026 - Privacy Policy System Phases 1-6 Completed)

### Current reality after latest implementation

### COMPLETED in this cycle
- Phase 1: Baseline lock completed
  - canonical initial source set to `docs/contents/Privacy Policy.md`
  - baseline integrity snapshot documented in `docs/privacy-policy-phase1-baseline.md`
- Phase 2: Model + seed completed
  - `PrivacyPolicy` model added with version/status/current/audit fields
  - one-time idempotent seed command added: `npm run seed:privacy-policy`
- Phase 3: Admin workflow completed (blog/event-style pattern)
  - policy version list/history page
  - draft create/edit flow
  - clone/publish/archive actions
  - published version read-only behavior enforced
- Phase 4: Public rendering switch completed
  - `/privacy` now renders current published DB version only
  - fallback to `docs/contents/Privacy Policy.md` when no live DB record exists
- Phase 5: Security + guardrails completed
  - CSRF enforcement on mutating admin routes
  - stricter version format and transition validation
  - policy action guard checks and publish consistency hardening
- Phase 6: Consent/version logging completed
  - signup now captures accepted privacy policy ID + version + timestamp + IP + user-agent
  - user model extended with `termsAcceptedAt` and `agreedPolicies` fields
  - organizer signup status fixed to valid enum (`not_applied`)

### Validation signals recorded
- Added and executed `tests/privacy-signup-consent.test.js`
- Result: 2/2 passing

### Still pending from this scope
- Phase 7 operational gate:
  - run full release QA checklist
  - execute deployment runbook in staging/production
  - finalize legal content cleanup (encoding/placeholders)

## STATUS UPDATE (Mar 8, 2026 - Events/My Registrations Follow-up)

### Current reality after latest implementation

### COMPLETED in this cycle
- Refreshed `/events/:slug` UI layout:
  - stronger hero + key facts + CTA hierarchy
  - improved media/gallery presentation
  - added mobile sticky registration CTA
- Improved My Registrations privacy:
  - replaced exact DOB rendering with age display and safe fallback (`N/A`)
- Fixed My Registrations asset/runtime issues:
  - added missing `/js/my-reg.js` static file
  - patched payment-proof update flow to avoid legacy full-document validation failures

### SIDE TASKS (non-blocking)
- UI/UX refinement backlog (ongoing):
  - continue polishing `/events/:slug` visual rhythm and CTA conversion flow
  - improve My Registrations readability density and action grouping
  - run a compact mobile typography/tap-target pass across event and registration pages

### Still pending from this scope
- Add CSRF hidden tokens and CSRF-enforced route protection for My Registrations POST forms.

## STATUS UPDATE (Mar 8, 2026 - Runner Groups IA Cleanup + Profile UX Refinement)

### Current reality after latest implementation

### COMPLETED in this cycle
- Simplified Runner Dashboard `Running Groups` panel:
  - reduced to concise membership overview only
  - removed inline search/join/create controls from dashboard
  - retained single `Manage Groups` entry button
- Added dedicated Running Groups management page:
  - `GET /runner/groups`
  - includes search, join, and create flows in one page
- Added/kept focused create-group page flow:
  - `GET /runner/groups/create`
  - `POST /runner/groups/create`
- Added runner personal info subpage:
  - `GET /runner/profile`
  - left quick-menu panel for section navigation
- Added profile panel edit improvements:
  - Contact panel supports mobile editing
  - Emergency Contact name/number editable
  - Identity DOB masked by default with eye icon toggle
  - Save/Cancel actions hidden by default and revealed on Edit
  - Save/Cancel aligned to the right

### Validation signals recorded
- `tests/runner-dashboard-profile.test.js` -> PASS
- `tests/runner-notifications-routes.test.js` -> PASS
- Route/controller syntax checks for runner routes/controller -> PASS

### Still pending from this scope
- Optional: align `running-group-smoke` assertions with latest dashboard markup conventions.

## STATUS UPDATE (Mar 8, 2026 - Runner Dashboard High-Impact Batch: Security + UX)

### Current reality after latest implementation

### COMPLETED in this cycle
- Added authenticated runner password management flow:
  - `GET /runner/security/password`
  - `POST /runner/security/password`
  - Google-only users can set first local password
  - local-password users must provide current password to change password
- Updated runner dashboard Account Security actions:
  - password action now routes directly to authenticated password settings page
- Added relative time labels for dashboard activity/results:
  - `just now`, `Xm ago`, `Xh ago`, `Xd ago`
- Hardened unlink modal accessibility:
  - focus trap inside modal
  - Escape key to close
  - backdrop close
  - return focus to trigger after close
- Completed compact mobile readability pass for runner dashboard list rows:
  - tighter spacing and typography for `item-row` details/actions at small breakpoints
- Expanded and passed targeted regression checks:
  - `tests/runner-dashboard-profile.test.js` (including new password/security coverage)
  - `tests/running-group-smoke.test.js`
  - `tests/google-oauth-routes.test.js`

### Still pending from this scope
- Optional follow-up:
  - include relative-time labels in additional non-dashboard list surfaces for consistency

## STATUS UPDATE (Mar 8, 2026 - Phase 6 Final Closeout: Runner Dashboard Strict Smoke)

### Current reality after latest implementation

### COMPLETED in this cycle
- Executed strict runner dashboard closeout smoke for latest UX changes.
- Step-by-step gate results:
  - Step 1: Dashboard filter bar and query wiring (`eventMode`, `resultStatus`, clear action) -> PASS
  - Step 2: Collapsible panel state controls (Personal Info, Activity, Certificates, Progress, Running Groups) -> PASS
  - Step 3: Google linked account panel state (badge + unlink visible, no set-password CTA when local password exists) -> PASS
  - Step 4: Google-only account panel state (badge + unlink visible, set-password CTA visible with prefilled forgot-password link) -> PASS
  - Step 5: Mobile/responsive coverage for runner dashboard CSS breakpoints (`max-width: 768px`, `max-width: 480px`) -> PASS
  - Step 6: Regression safety checks:
    - `tests/runner-dashboard-profile.test.js` -> PASS
    - `tests/running-group-smoke.test.js` -> PASS
    - `tests/google-oauth-routes.test.js` -> PASS
- Strict closeout outcome: all targeted checks passed (no failures).
- Phase 6 runner dashboard polish is now marked fully closed.

### Still pending from this scope
- None for Phase 6 runner dashboard closeout scope.

## STATUS UPDATE (Mar 8, 2026 - Runner Dashboard UX + OAuth Polish Batch)

### Current reality after latest implementation

### COMPLETED in this cycle
- Consolidated runner dashboard filters into one global filter bar:
  - shared `eventMode` + `resultStatus` controls
  - `Apply Filters` and `Clear` actions
  - removed duplicated per-card filter forms
- Improved Google-linked account UX on runner dashboard:
  - added `Set password` guidance for Google-only users (before unlink)
  - added unlink confirmation prompt on submit
- Improved timestamp display formatting:
  - switched from hardcoded `en-US` string to locale-aware `Intl.DateTimeFormat` using request language
  - applied to dashboard cards, notifications, and running-group detail timestamps
- Added forgot-password email prefill support:
  - `/forgot-password?email=...` now prefills input and preserves value on re-render
- Targeted regression validation passed:
  - `tests/runner-dashboard-profile.test.js`
  - `tests/running-group-smoke.test.js`
  - `tests/google-oauth-routes.test.js`

### Still pending from this scope
- Optional runner dashboard follow-up:
  - switch from browser confirm to inline modal for unlink confirmation
  - compact card-density pass for mobile result/activity rows

## STATUS UPDATE (Mar 8, 2026 - Phase 8 Polish: Runner Google Link Visibility + Safe Unlink)

### Current reality after latest implementation

### COMPLETED in this cycle
- Added runner dashboard account-link visibility:
  - sign-in method label in Personal Information panel
  - `Google linked` badge when a Google identity is attached
- Added safe unlink workflow:
  - `POST /runner/auth/google/unlink`
  - guarded to prevent lockout (unlink blocked if no local password is set)
- Expanded regression coverage:
  - unlink succeeds when local password exists
  - unlink is blocked when local password is missing
- Targeted validation pass:
  - `tests/runner-dashboard-profile.test.js` and `tests/running-group-smoke.test.js` passed

### Still pending from this scope
- Optional OAuth UX follow-up:
  - dedicated account settings panel for link/unlink messaging and re-link actions

## STATUS UPDATE (Mar 8, 2026 - Phase 8 Production Verification: Google Signup/Login)

### Current reality after latest implementation

### COMPLETED in this cycle
- Fixed Google new-user signup path by resolving `userId` counter import gap in `User` model.
- Verified production behavior:
  - Google login works for existing users.
  - Google signup works for brand-new users.
- Phase 8 Google OAuth baseline is now verified in production environment.

### Still pending from this scope
- Optional Phase 8 polish:
  - profile-level Google link/unlink controls
  - linked-provider status badge in account/profile UI

## STATUS UPDATE (Mar 8, 2026 - Phase 8 OAuth Baseline: Google Sign-In)

### Current reality after latest implementation

### COMPLETED in this cycle
- Implemented Google OAuth route baseline:
  - `GET /auth/google`
  - `GET /auth/google/callback`
- Added account-linking behavior:
  - existing account with matching email is linked to Google ID
  - existing Google-linked account signs in directly
  - first-time Google user creates runner account with verified email
- Added auth/session integration with existing role-based redirects and safe return-path handling.
- Added login/signup Google CTA buttons in auth UI.
- Added route-level OAuth guard tests:
  - consent redirect
  - invalid-state callback rejection
  - canceled-consent callback handling
- Full regression verification:
  - `npm test` -> `60/60` passing

### Still pending from this scope
- Phase 8 optional follow-up:
  - add profile-level explicit link/unlink controls
  - add callback success flash copy for linked-vs-new account path

## STATUS UPDATE (Mar 8, 2026 - Phase 9 Cross-Device QA Gate + Closeout)

### Current reality after latest implementation

### COMPLETED in this cycle
- Executed strict Phase 9 QA gate suite (sequential) for critical public and dashboard workflows:
  - `tests/public-search-filters.test.js` -> 4/4 pass
  - `tests/runner-dashboard-profile.test.js` -> 2/2 pass
  - `tests/organizer-dashboard-analytics.test.js` -> 1/1 pass
  - `tests/admin-dashboard.test.js` -> 1/1 pass
  - `tests/submission-routes.test.js` -> 4/4 pass
  - `tests/runner-notifications-routes.test.js` -> 3/3 pass
- Strict QA gate outcome:
  - `15/15` tests passed, `0` failed.
- Verified mobile/responsive readiness signals in key CSS surfaces:
  - `style.css` (nav/tap-target minimums)
  - `events.css`
  - `leaderboard.css`
  - `runner-dashboard.css`
  - `organizer-dashboard.css`
  - `create-event.css`
- Phase 9 cross-device/manual QA gate item is now closed for this release pass.

### Still pending from this scope
- Optional non-blocking follow-up:
  - true-device browser matrix pass (iOS Safari + Android Chrome) after next feature batch.

## STATUS UPDATE (Mar 8, 2026 - Phase 9 Kickoff: Test Stability Baseline)

### Current reality after latest implementation

### COMPLETED in this cycle
- Stabilized full-suite execution by switching default test command to sequential mode:
  - `node --test --test-concurrency=1 tests/*.test.js`
- Added optional parallel command for local-only ad hoc runs:
  - `npm run test:parallel`
- Full suite verification passed with the new default:
  - `npm test` -> `51/51` passing

### Still pending from this scope
- Phase 9 next slices:
  - targeted coverage expansion for remaining high-risk negative paths
  - security hardening verification pass
  - performance baseline and index/query tuning
  - cross-device manual QA gate

## STATUS UPDATE (Mar 8, 2026 - Phase 9 Coverage Expansion: High-Risk Negative Paths)

### Current reality after latest implementation

### COMPLETED in this cycle
- Added high-risk negative-path coverage for runner result and notification routes:
  - result submission rejects invalid elapsed time format
  - result submission rejects out-of-range distance
  - notification mark-read `returnTo` is sanitized against open redirects
  - non-runner authenticated user is blocked from runner notifications page
- Full suite verification after test additions:
  - `npm test` -> `55/55` passing

### Still pending from this scope
- Phase 9 remaining slices:
  - security hardening verification pass
  - performance baseline and index/query tuning
  - cross-device manual QA gate

## STATUS UPDATE (Mar 8, 2026 - Phase 9 Security Hardening Verification Pass)

### Current reality after latest implementation

### COMPLETED in this cycle
- Hardened runtime security defaults in server bootstrap:
  - disabled `x-powered-by`
  - added baseline security headers:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- Hardened session configuration:
  - cookie name changed to `hr.sid`
  - `saveUninitialized` disabled
  - cookie defaults set to:
    - `HttpOnly`
    - `SameSite=Lax`
    - `Secure` in production
    - 7-day `maxAge`
- Restricted request-body debug logging:
  - now opt-in via `DEBUG_HTTP_BODIES=1`
  - disabled by default and disabled in production
- Added dedicated security verification tests:
  - headers presence and `x-powered-by` disabled
  - session cookie attribute assertions on login
- Full-suite verification after hardening:
  - `npm test` -> `57/57` passing

### Still pending from this scope
- Optional future hardening:
  - full CSRF token rollout for all state-changing form routes
  - CSP rollout after inline-script refactor

## STATUS UPDATE (Mar 8, 2026 - Phase 9 Performance Baseline + Query/Index Tuning)

### Current reality after latest implementation

### COMPLETED in this cycle
- Added index tuning for the highest-traffic query paths:
  - `Event`:
    - `{ status: 1, eventStartAt: 1, createdAt: -1 }`
    - `{ organizerId: 1, status: 1, eventStartAt: -1 }`
  - `Registration`:
    - `{ userId: 1, registeredAt: -1 }`
    - `{ eventId: 1, registeredAt: -1 }`
    - `{ eventId: 1, paymentStatus: 1, registeredAt: -1 }`
    - `{ eventId: 1, participationMode: 1 }`
  - `Submission`:
    - `{ eventId: 1, status: 1, submittedAt: -1 }`
    - `{ runnerId: 1, status: 1, submittedAt: -1 }`
    - `{ runnerId: 1, status: 1, "certificate.issuedAt": -1 }`
  - `Notification`:
    - `{ userId: 1, readAt: 1, createdAt: -1 }`
  - `Blog`:
    - `{ status: 1, isDeleted: 1, publishedAt: -1 }`
- Baseline timings captured from sequential integration run (`npm test`, 57/57 pass):
  - `/events` combined filter query path: ~3.43s (test fixture + server boot context)
  - `/leaderboard` filtered summary path: ~0.22s
  - `/runner/dashboard` profile/dashboard path: ~3.80s
  - `/organizer/dashboard` analytics path: ~4.43s
  - `/admin/dashboard` snapshot path: ~3.98s

### Still pending from this scope
- Final Phase 9 gate:
  - cross-device manual QA pass

## STATUS UPDATE (Mar 8, 2026 - Phase 3/5/6 Closeout Pass)

### Current reality after latest implementation

### COMPLETED in this cycle
- Executed strict closeout smoke validation for Phases 3, 5, and 6 (sequential run to avoid test-runner port contention):
  - `tests/organizer-waiver-routes.test.js` (2/2)
  - `tests/submission-routes.test.js` (2/2)
  - `tests/submission-review-route-guards.test.js` (3/3)
  - `tests/submission.service.test.js` (8/8)
  - `tests/certificate-access.test.js` (3/3)
  - `tests/leaderboard.service.test.js` (2/2)
  - `tests/runner-dashboard-profile.test.js` (2/2)
  - `tests/organizer-dashboard-analytics.test.js` (1/1)
  - `tests/admin-dashboard.test.js` (1/1)
- Strict closeout result: `24/24` tests passed for the targeted Phase 3/5/6 suites.
- Phase status updated to closed for core scope:
  - Phase 3 core workflows complete
  - Phase 5 core workflows complete
  - Phase 6 core workflows complete

### Still pending from this scope
- Follow-up polish can continue under Phase 9 hardening:
  - cross-device/manual UX verification refinements
  - full-suite test harness stability in a single `npm test` pass

## STATUS UPDATE (Mar 8, 2026 - Phase 7 Completion: Notifications Expansion)

### Current reality after latest implementation

### COMPLETED in this cycle
- Expanded in-app notifications for runner lifecycle events:
  - registration confirmed
  - payment proof submitted
  - payment approved
  - payment rejected
  - result approved
  - result rejected
  - certificate issued
- Added runner unread notification badge in the top navigation.
- Added/updated automated validation:
  - `tests/payment-route-guards.test.js`
  - `tests/runner-notifications-routes.test.js`
  - `tests/submission.service.test.js`

### Still pending from this scope
- Optional search UX iteration:
  - quick filter chips
  - retained “recent search” suggestions
  - filter state badges in hero/header blocks

## STATUS UPDATE (Mar 7, 2026 - Organizer Create/Edit Waiver UX Hardening)

### Current reality after latest implementation

### COMPLETED in this cycle
- Replaced raw waiver HTML textarea with a non-technical rich editor (Quill) on organizer create/edit event pages.
- Added waiver helper controls for placeholder insertion:
  - `Insert Organizer Name` -> `{{ORGANIZER_NAME}}`
  - `Insert Event Title` -> `{{EVENT_TITLE}}`
- Preserved backend compatibility:
  - editor content syncs to hidden `waiverTemplate` field on change and submit.
- Added server-side waiver sanitization with a waiver-safe allowlist (including headings/lists/links/div).
- Hardened waiver validation:
  - minimum rule now checks plain-text content length from rich HTML.
- Added waiver route tests:
  - sanitization persistence on create
  - rejection of rich HTML shells with insufficient plain text
- Executed strict waiver smoke script:
  - 6/6 steps passed (create page render, controls render, draft submit, sanitize persistence, edit page render).

### Still pending from this scope
- Optional UX refinement:
  - replace confirm/alert dialogs with inline modal/toast pattern.
- Optional safety refinement:
  - sanitize waiver preview rendering on the client side (server sanitization is now active).

## STATUS UPDATE (Mar 7, 2026 - Phase 7 Kickoff: Static Pages + Public Search/Filter UX)

### Current reality after latest implementation

### COMPLETED in this cycle
- Static page baseline is now implemented and routed:
  - `/about`
  - `/how-it-works`
  - `/contact`
  - `/faq`
  - `/privacy`
  - `/terms`
- Public events page now supports query-driven filter/search UX:
  - filters: `q`, `eventType`, `distance`, `status`
  - results summary with active-filter count
  - clear-filters action
  - pagination with preserved query params
  - direct page-number navigation
- Public blog listing UX updated with:
  - results summary
  - conditional clear-filters action
  - filter-aware empty-state copy
- Public leaderboard UX updated with:
  - results summary with active-filter count
  - conditional clear-filters action
  - filter-aware empty-state copy
- Wording consistency pass completed:
  - standardized list-page action label to `Clear filters`.
- Automated validation added:
  - `tests/static-pages.test.js`
  - `tests/public-search-filters.test.js`

### Still pending from this scope
- Optional search UX iteration:
  - quick filter chips
  - retained “recent search” suggestions
  - filter state badges in hero/header blocks

## STATUS UPDATE (Mar 7, 2026 - Phase 4 Payment Proof Workflow)

### Current reality after latest implementation

### COMPLETED in this cycle
- Runner-side payment proof upload flow is live:
  - POST /my-registrations/:registrationId/payment-proof
- Organizer verification flow is live:
  - approve: POST /organizer/events/:id/registrants/:registrationId/payment/approve
  - reject: POST /organizer/events/:id/registrants/:registrationId/payment/reject
- Registration data model extended for payment proof + review metadata:
  - paymentProof, paymentSubmissionCount, paymentReviewedAt/by, reviewNotes, rejectionReason
- UI updates completed:
  - runner my-registrations upload/re-upload + rejection reason visibility
  - organizer registrants table payment status filter + approve/reject action forms
- Notification hooks added:
  - proof submitted (organizer), approved (runner), rejected (runner)
- Automated regression test baseline added:
  - node:test suite for payment workflow transition rules
- Strict end-to-end smoke run completed with seeded runner/organizer accounts:
  - 13/13 steps passed
  - includes submit -> approve/reject -> re-submit -> approve final state verification

### Still pending from this scope
- None within in-app Phase 4 scope.
- External-only follow-up (optional): inbox/provider-level delivery confirmation once Resend log access or real inbox checks are available.

## STATUS UPDATE (Mar 7, 2026 - Sprint B Running Group Foundation Kickoff)

### Current reality after latest implementation

### COMPLETED in this cycle
- Running group foundation baseline is now implemented:
  - RunningGroup model
  - service layer for create/join/leave/search/top groups
  - runner routes:
    - POST /runner/groups/create
    - POST /runner/groups/join
    - POST /runner/groups/leave
  - runner dashboard Running Groups section now supports:
    - current group visibility
    - search + join
    - create + auto-join
    - leave group
- Added responsive UI styling for new running-group interactions.
- Added deeper Sprint B integration:
  - dedicated running-group detail route/page:
    - GET /runner/groups/:slug
  - running-group activity persistence and feed rendering
  - merged dashboard activity stream (registration + running-group events)
- Added Sprint B automated validation:
  - running-group strict smoke script:
    - tests/running-group-smoke.test.js
  - runner dashboard/profile coverage:
    - tests/runner-dashboard-profile.test.js
  - running-group service coverage expanded with activity assertions

### Still pending from this scope
- None for Sprint B scope.

### Final validation pass (Mar 7, 2026)
- Route-level automated guards added and passing:
  - unauthenticated access guards
  - runner ownership guard
  - organizer ownership guard
  - invalid transition guard
- Registration + waiver + export smoke completed:
  - 11/11 checks passed (CSV + XLSX payment/waiver columns validated)
- UI polish verification completed (state-aware):
  - runner my-registrations payment states
  - organizer registrants payment filter/actions/proof links
  - 7/7 checks passed
- Inbox/provider-level delivery remained out-of-scope for terminal-only verification due restricted Resend key; app-side send path had no runtime failures.

## STATUS UPDATE (Mar 7, 2026 - Phase 5 Core Workflows)

### Current reality after latest implementation

### COMPLETED in this cycle
- Result submission workflows are live:
  - POST /my-registrations/:registrationId/submit-result
  - POST /my-registrations/:registrationId/resubmit-result
- Organizer result review workflows are live:
  - POST /organizer/events/:id/submissions/:submissionId/approve
  - POST /organizer/events/:id/submissions/:submissionId/reject
- Certificate issuance is active on approved submissions:
  - GET /my-submissions/:submissionId/certificate
- Public leaderboard now renders approved-submission rankings with filters:
  - event, distance, mode, period
- Runner dashboard certificate/stat cards now use real Phase 5 submission data.
- Automated guard and service validation expanded for Phase 5 flows.

### Still pending from this scope
- End-to-end UX polish pass for edge states (empty/filter combinations and mobile readability).
- Optional notifications expansion for result review/certificate issuance emails.

## STATUS UPDATE (Mar 7, 2026 - Phase 6 Organizer Dashboard Review Queue)

### Current reality after latest implementation

### COMPLETED in this cycle
- Organizer dashboard now includes review-queue analytics:
  - pending payment proof reviews
  - pending result submission reviews
- Organizer dashboard now includes direct review links:
  - `/organizer/events/:id/registrants?payment=proof_submitted`
  - `/organizer/events/:id/registrants?result=submitted`
- Organizer quick actions were corrected to active routes:
  - Participants -> `/organizer/events`
  - Settings -> `/organizer/application-status`
- Strict organizer dashboard smoke script executed:
  - 9/9 steps passed
- Organizer dashboard analytics v2 added:
  - dashboard range filter (`7d`, `30d`, `all`)
  - range-based metrics for registrations, submissions, and approvals
  - per-event queue breakdown with direct payment/result review links
  - quick actions to open next pending payment/result review
- Strict organizer analytics v2 smoke script executed:
  - 7/7 steps passed

### Still pending from this scope
- Additional organizer analytics cards (trend/period breakdown) if needed for Phase 6 completion.

## STATUS UPDATE (Mar 3, 2026 - Documentation Structure and Format)

### Current reality after latest implementation

### COMPLETED in this cycle
- Converted project documentation notes from `.txt` to `.md`.
- Moved project notes into `docs/` for centralized documentation.
- Updated cross-document references to point to `.md` files.

### Still pending from this scope
- Optional cleanup: remove remaining legacy `.txt` duplicates (`blog_feature.txt`, `mongodb_schema.txt`, `organiser_flow.txt`) when no longer needed.

## STATUS UPDATE (Feb 27, 2026 - Blog Admin Edit Hardening)

### Current reality after latest implementation

### COMPLETED in this cycle
- Admin review page now supports inline editing of blog fields.
- Debounced admin autosave endpoint is active:
  - PATCH /admin/blog/posts/:id/autosave
- Revision/audit tracking added:
  - BlogRevision model
  - before/after + changedFields per meaningful autosave
- Review page now includes Change History panel with revision details.
- Moderation UI now adapts to selected status while editing.

### Still pending from this scope
- End-to-end and regression test pass (manual + automated) for autosave + moderation interaction.
- Optional UX iteration for history readability on very large content diffs.

## STATUS UPDATE (Feb 27, 2026 - Blog Phase A Tasks 1 to 10)

### Current reality after latest implementation

### IN PROGRESS
- Phase 3: Event Creation & Management (advanced)
- Phase 4: Registration System (payment proof flow still pending)
- Phase 7: Blog System (Phase A backend + UI now functional)

### Completed in this cycle
- Task 1: Blog data foundation
  - Blog model with statuses, categories, moderation fields, SEO fields, indexes
- Task 2: Author backend
  - create/edit draft, submit for review, delete own draft/rejected, list own posts
- Task 3: Admin moderation backend
  - pending queue, preview, approve, reject (reason required), archive
- Task 4: Public read backend
  - /blog list + /blog/:slug published-only detail
- Task 5: Cover upload integration
  - JPG/PNG upload path wired to Cloudflare R2 with replacement cleanup
- Task 6: Author UI
  - My Blogs dashboard + create/edit form + submit/delete actions
- Task 7: Admin UI
  - Blog queue page + review page + approve/reject/archive forms
- Task 8: Public UI + SEO
  - blog list/detail templates + dedicated CSS + canonical/meta/OG/Twitter support
- Task 9: Security/validation pass
  - server-side content sanitization
  - URL validation hardening
  - rate limits for author/admin write actions
- Task 10: View policy
  - implemented 24-hour view dedupe:
    - logged-in user: 1 view/post/24h
    - anonymous IP: 1 view/post/24h
  - excludes admin and author self-views from count

### Still pending from this scope
- E2E testing pass for all blog flows (author/admin/public)
- Final UX polish pass (spacing/typography consistency, empty states, badges)
- Optional: migrate any existing placeholder content to blog model documents
- Optional: add sitemap integration for published blog posts (if not yet automatic)

### Manual smoke checklist (latest)
- [ ] Author dashboard and form flows are stable on desktop/mobile
- [ ] Admin queue/review moderation actions are stable and state-safe
- [ ] Public /blog and /blog/:slug render correctly with SEO tags
- [ ] View count policy matches 24-hour dedupe expectations
- [ ] Cover upload/replacement/deletion behavior is correct in R2 + MongoDB

---

## STATUS UPDATE (Feb 27, 2026 - Organizer Event Record UX + Reference Code)

### Current reality after latest implementation

### IN PROGRESS
- Phase 3: Event Creation & Management (advanced)
- Phase 4: Registration System (account flow active; payment-proof still pending)
- Phase 6: Dashboards (runner data cards active; organizer UX refinements ongoing)

### Completed in this cycle
- Event creation success flow improved:
  - organizer is redirected to /organizer/events (My Events) after create/publish
- User-facing language improved:
  - organizer UI changed from "slug" wording to "Event URL"
- Event details audit section redesigned:
  - "Audit" replaced by "Event Record"
  - shows friendly Reference Code, organizer name, and public event page path
  - copy actions added for reference code and event link
  - raw Event ID / Organizer ID moved under collapsible "Technical details"
- Persistent reference code implemented:
  - Event.referenceCode added to schema (unique + immutable)
  - generated at event creation using:
    - abbreviation from event title + YYDDMM
    - collision-safe suffix when needed (-02, -03, ...)
- Backfill tool added for legacy events:
  - npm run backfill:event-reference-codes

### Still pending from this scope
- Run backfill in target environments and verify no duplicate index/data issues
- Replace fallback reference-code usage after full backfill completion
- Optional: surface reference code in registrants/export views for support workflows

### Manual smoke checklist (latest)
- [ ] Create event redirects to My Events with success banner
- [ ] Newly created event contains referenceCode in MongoDB
- [ ] Backfill script updates old events without referenceCode
- [ ] Event Record copy buttons work on desktop and mobile
- [ ] Technical details collapse/expand behavior is stable
- [ ] "Event URL" wording appears consistently in organizer screens

---

## STATUS UPDATE (Feb 26, 2026 - Organizer Branding & Media Upgrade)

### Current reality after latest implementation

### IN PROGRESS
- Phase 3: Event Creation & Management (advanced; branding/media now functional)
- Phase 4: Registration System (account flow active; payment-proof still pending)
- Phase 6: Dashboards (runner data cards + organizer media visibility upgraded)

### Completed in this cycle
- Organizer Branding & Media panel reorganized per media type:
  - Event Logo
  - Event Banner
  - Promotional Poster
  - Gallery Images
- Promotional Poster is now fully functional:
  - URL input + file upload
  - saved to MongoDB and uploaded to Cloudflare R2
  - visible in organizer/public event detail views
- Gallery Images are now fully functional:
  - URL list + multiple file upload
  - saved to MongoDB and uploaded to Cloudflare R2
  - visible in organizer/public event detail views
- Edit-event media management unified:
  - preview + contextual remove actions for logo/banner/poster/gallery
  - gallery supports single-image remove and remove-all
- Immediate persistence on media remove:
  - clicking remove now calls backend API immediately
  - MongoDB updates immediately
  - Cloudflare delete attempted immediately
- Banner ratio policy relaxed:
  - no strict blocking; 3:1 is recommendation only
- Upload error mapping improved:
  - 400 errors now show under the correct media field

### Still pending from this scope
- E2E test pass for all media actions on mobile + desktop
- Guardrails for partial Cloudflare delete failures (orphan cleanup job)

### Manual smoke checklist (latest)
- [ ] Create event saves logo/banner/poster/gallery correctly
- [ ] Edit page remove X works immediately for logo/banner/poster
- [ ] Gallery single-remove and remove-all work immediately
- [ ] Removed media no longer appears after page refresh
- [ ] MongoDB media fields match post-remove state
- [ ] Public event details render poster/gallery correctly
- [ ] Mobile form interactions are stable on Chrome Android

---

## STATUS UPDATE (Feb 26, 2026 - Runner Dashboard Data + Refactor)

### Current reality after latest implementation

### IN PROGRESS
- Phase 3: Event Creation & Management (advanced)
- Phase 4: Registration System (account flow active; payment-proof still pending)
- Phase 6: Dashboards (runner dashboard now partially data-driven)

### Completed in this cycle
- Runner dashboard now uses real registration data cards:
  - Upcoming events (based on eventStartAt)
  - Past events
  - Activity log (recent registrations)
  - Progress statistics (total/upcoming/past/unpaid/paid)
- Continue Payment placeholder CTA added:
  - shown only when paymentStatus is unpaid
  - links to /my-registrations for now
- Profile completeness flow added:
  - percentage progress bar
  - required-field completion count
  - missing fields list
- Runner routes/controller refactor completed:
  - moved runner dashboard/profile handlers out of authRoutes.js
  - created dedicated:
    - src/routes/runner.routes.js
    - src/controllers/runner.controller.js
    - src/services/runner-data.service.js
- Runner data source unified:
  - shared registration fetch service now reused by:
    - /runner/dashboard
    - /my-registrations
- Running group feature placeholder added on dashboard:
  - "Running groups (create/join) coming soon."

### Still pending from this scope
- Payment proof upload + organizer verification workflow (Phase 4)
- Runner activity expansion beyond registration events (future)
- Running group backend (create/join/search) implementation (future)

### Manual smoke checklist (latest)
- [ ] Runner dashboard loads without errors for users with 0 registrations
- [ ] Upcoming/Past split follows eventStartAt correctly
- [ ] Continue Payment appears only for unpaid registrations
- [ ] Profile completeness percentage and missing fields are accurate
- [ ] /my-registrations and /runner/dashboard show consistent registration data
- [ ] Runner profile update works via new runner routes/controller

---
CURRENT ACTIVE BACKLOG (Next 2 Sprints)

### Sprint A (Immediate)
1. [DONE] Phase 4 payment proof upload flow (runner side)
2. [DONE] Organizer payment verification flow (approve/reject + notes)
3. [DONE] Payment status lifecycle polish in runner and organizer views
4. [DONE] Smoke tests for registration, waiver, and export flows

### Sprint B (After Payment Flow)
1. [DONE] Runner dashboard iteration 2:
   - [DONE] richer activity feed (registration + running-group + submission/certificate activity)
   - [DONE] richer activity feed integration via running-group activity events
   - [DONE] certificate/stat cards backed by real Phase 5 data where available
   - [DONE] dashboard UX polish (filters/state retention, KPI strip, status/activity badges)
2. [DONE] Running group foundation:
   - [DONE] define data model and create/join/search/leave baseline behavior
   - [DONE] add running-group specific test coverage + deeper dashboard integration
   - [DONE] add strict smoke automation for running-group detail/join flow
3. [DONE] Test coverage:
   - [DONE] runner profile update
   - [DONE] runner dashboard data grouping
   - [DONE] payment workflow regressions

### Notes
- CHANGELOG.md should record file-level implementation history only.
- PRD.md remains the master planning and task document.

### Sprint B Exit Criteria (Sign-off Gate)
- [x] Running-group foundation supports create/join/leave/search/top behavior.
- [x] Dedicated running-group detail page is live (`GET /runner/groups/:slug`).
- [x] Running-group activity is persisted for create/join/leave actions.
- [x] Runner dashboard activity feed includes running-group events.
- [x] Strict running-group smoke automation passes (`tests/running-group-smoke.test.js`).
- [x] Runner profile update coverage passes (`tests/runner-dashboard-profile.test.js`).
- [x] Runner dashboard grouping/stats coverage passes (`tests/runner-dashboard-profile.test.js`).
- [x] Payment workflow regression suite remains green after Sprint B changes.
- [x] Full automated test suite passes (`npm test`).
- [x] Phase 5-dependent certificate/stat cards backed by real data.

### Phase 5 Exit Criteria (Sign-off Gate)
- [x] Runner can submit result proof for paid, active registrations.
- [x] Runner can resubmit result proof after organizer rejection.
- [x] Organizer can approve/reject submitted results with ownership and status guards.
- [x] Approved results trigger certificate issuance metadata on submission records.
- [x] Runner can download certificate only for own approved submissions.
- [x] Public leaderboard renders approved submissions only.
- [x] Leaderboard filters work for event, distance, mode, and period.
- [x] Runner dashboard certificate/stat cards are backed by real submission data.
- [x] Automated route/service guard coverage added for submission and certificate flows.
- [x] Full automated test suite passes (`npm test`).
- [x] Manual cross-device UX pass completed for submissions/review/leaderboard/certificate download.
- [x] Optional notification expansion for result review + certificate issuance finalized.

---
How we will build helloRun step-by-step

PROJECT OVERVIEW & STATUS (Feb 26, 2026)

### COMPLETED PHASES
[DONE] Phase 0: Project Skeleton (Nov 2024) - 100%
[DONE] Phase 1: Authentication System (Feb 2025) - 100%
[DONE] Phase 2A: Organizer Signup Flow - 100%
[DONE] Phase 2B: Organizer Application Forms & Status - 100%

### IN PROGRESS
[DONE] Phase 3: Event Creation & Management (core scope complete)
[DONE] Phase 4: Registration System (payment proof + verification workflow completed and smoke-tested)
[DONE] Phase 5: Submission, Results & Leaderboard (core scope complete)
[DONE] Phase 6: Dashboards (runner/organizer/admin core scope complete)

### UPCOMING PHASES
[DONE] Phase 7: Additional Features (static pages + public search/filter UX baseline and notifications expansion implemented)
[PENDING] Phase 8: Google OAuth (Optional)
[IN_PROGRESS] Phase 9: Testing & Optimization
[PENDING] Phase 10: Production Deployment
[DRAFT] Phase 11: Shop / Merchandise Feature

### QUICK STATS
- Total Users: TBD (after deployment)
- Total Events: 0 (awaiting Phase 3)
- Platform Status: Development
- Last Major Update: Feb 26, 2026 (Runner dashboard data cards + runner route/controller refactor)

---

Phase 0: Project skeleton (MVC baseline) [DONE] COMPLETED (Nov 2024)

Goal: You can run the app locally with pages loading.

### What you built
[DONE] Express server
[DONE] EJS views with layouts
[DONE] MVC folders structure
[DONE] MongoDB connection
[DONE] Base layout + navigation + footer components
[DONE] Mobile-responsive navigation with hamburger menu
[DONE] Lucide icons integration
[DONE] Google Analytics integration (GA4)

### What you have after Phase 0
[DONE] / home page (fully styled with hero, features, audience sections)
[DONE] /events events page (UI ready for dynamic content)
[DONE] /login and /signup pages (fully functional UI with improved password toggle)
[DONE] /forgot-password page (compact UI, no scrolling required)
[DONE] Complete password reset flow (forgot, reset, success, expired)
[DONE] Complete email verification flow (sent, success, expired, resend)
[DONE] Error page
[DONE] Responsive navigation with mobile menu
[DONE] Footer with links
[DONE] SEO ready (sitemap.xml, robots.txt)
[DONE] Google Analytics 4 tracking on all pages

---

Phase 1: Auth (MongoDB) with email verification [DONE] COMPLETED (100%) - Feb 3, 2025

Goal: Users can sign up, verify email, and log in securely.

Feature 1A: Email/password signup [DONE] COMPLETED (Nov 2024)
[DONE] Create User model with email verification fields
[DONE] Auto-increment userId (U000001, U000002, etc.)
[DONE] Counter model for sequential IDs
[DONE] Hash password with bcrypt
[DONE] Block duplicate email
[DONE] Save role: "runner" or "organiser"
[DONE] Email verification required before login
[DONE] Migration scripts for existing users

Feature 1B: Email verification [DONE] COMPLETED (Dec 2024)
[DONE] Generate verification token on signup
[DONE] Send verification email via Resend
[DONE] /verify-email/:token endpoint
[DONE] Token expiry (24 hours)
[DONE] Resend verification email feature
[DONE] User cannot login until verified
[DONE] Professional email templates

Feature 1C: Password reset [DONE] COMPLETED (Feb 3, 2025)
[DONE] Request password reset
[DONE] Generate reset token (1 hour expiry)
[DONE] Send reset email via Resend
[DONE] Verify reset token
[DONE] Update password
[DONE] Handle expired tokens
[DONE] Rate limiting (3 resets per 24 hours)
[DONE] Email notifications
[DONE] Confirmation email after password reset
[DONE] Professional reset-password UI with strength indicator
[DONE] Real-time password validation
[DONE] Password visibility toggle (eye/eye-off icons)
[DONE] Common password detection
[DONE] Sequential/repeated character detection
[DONE] Accessible form with ARIA support
[DONE] Client-side validation with debouncing
[DONE] Password match validation
[DONE] Animated strength indicator (gradient)

Feature 1D: Session management [DONE] COMPLETED (Nov 2024)
[DONE] express-session with MongoDB store
[DONE] Session timeout (7 days)
[DONE] Remember me option
[DONE] Secure cookies
[DONE] CSRF protection

Feature 1E: Login [DONE] COMPLETED (Dec 2024)
[DONE] Email/password validation
[DONE] Check email verified before login
[DONE] bcrypt password comparison
[DONE] Create session
[DONE] Redirect to dashboard or complete profile
[DONE] Professional login UI with password toggle
[DONE] Error handling and validation
[DONE] Logged-in users redirected away from /login and /signup (Feb 19, 2026)

---

Phase 2: Organiser application + manual approval [DONE] COMPLETED (100%)

Goal: Runner can apply to become organiser. Admin can approve.

Feature 2A: Organiser signup flow [DONE] COMPLETED
[DONE] User signs up and selects "Event Organizer" role
[DONE] Email verification sent (same as runner)
[DONE] After verification, redirect to /organizer/complete-profile
[DONE] Upload service created (multer configuration)
[DONE] File validation (PDF, JPEG, PNG only, max 5MB)
[DONE] Secure file storage in /public/uploads/organizer-docs/

Feature 2B: Document upload & profile completion [DONE] COMPLETED (Feb 14, 2026)
[DONE] 3-step form wizard (Business Info -> Documents -> Review & Confirm)
[DONE] Drag-and-drop file upload with preview
[DONE] File type validation (PDF, JPG, PNG)
[DONE] File size validation (max 5MB)
[DONE] AJAX form submission
[DONE] Application status tracking page with timeline
[DONE] Auto-refresh status every 5 minutes
[DONE] Copy application ID to clipboard
[DONE] Email notification on submission
[DONE] Mobile responsive design
[DONE] Accessibility features

Feature 2C: Admin reviews [DONE] COMPLETED (Feb 24, 2026)
[DONE] Admin dashboard page
[DONE] List all applications
[DONE] Filter by status (pending, under_review, approved, rejected)
[DONE] View application details
[DONE] View uploaded documents
[DONE] Approve/reject with email notifications
[DONE] Admin routes (/admin/applications)
Delivered: controller + UI + email integration + validation hardening (Feb 24, 2026)

---

Phase 3: Event creation (organiser only) [CORE] COMPLETED (core scope)

Goal: Organizers can create running events.

[DONE] Event.js model created
[DONE] Registration.js model created
[DONE] Create event page UI
[DONE] Event creation controller
[DONE] Image upload integration
[DONE] Edit/delete events
[DONE] Event status management

---

Phase 4: Registration + payment proof [PAYMENT] PENDING

Goal: Runner joins event and uploads payment proof for verification.
[PENDING] Registration form
[PENDING] Upload payment proof
[PENDING] Organiser verifies payment
[PENDING] Email notifications

---

Phase 5: Submissions, Results & Leaderboard [RUNNER] COMPLETED (core scope)

Goal: Runner submits run proof, organiser approves, certificate generated, leaderboard populated.
[DONE] Submit result (distance, time, proof)
[DONE] Organiser review and approve
[DONE] Auto-generate certificate PDF
[DONE] Download certificate
[DONE] Leaderboard page (top runners, fastest times, event rankings)
[DONE] Filter leaderboard by event, distance, category
[DONE] Public leaderboard (visible to all users)
[DONE] /leaderboard route + placeholder page (Feb 19, 2026)
[DONE] Nav link added (Feb 19, 2026)

---

Phase 6: Dashboards & Analytics [ANALYTICS] COMPLETED (core scope)

[DONE] Runner Dashboard baseline (upcoming, past, results, certificates, activity, running groups)
[DONE] Organiser Dashboard baseline (event overview, review queues, analytics ranges/trends, top events)
[DONE] Admin Dashboard baseline (platform stats + pending organizer applications queue)

---

Phase 7: Additional Pages & Features [FEATURES] COMPLETED (core scope)

[DONE] Static pages (/about, /how-it-works, /contact, /faq, /privacy, /terms)
[IN_PROGRESS] Blog system:
  [DONE] Phase A foundation (author/admin/public pages, moderation, SEO, view policy)
  [DONE] Admin inline edit + autosave + revision history
  [PENDING] comments/likes and advanced growth features
[IN_PROGRESS] Search & filters (public events/blog/leaderboard baseline delivered)
[DONE] Notifications system

---

Phase 8: Google OAuth (Optional) [SECURITY] PENDING
[PENDING] Passport.js integration
[PENDING] Merge accounts (if email exists)

---

Phase 9: Testing & Optimization [TESTING] PENDING
[PENDING] Unit & integration tests
[PENDING] Performance & security audit
[PENDING] Cross-browser & mobile testing

---

Phase 10: Deployment [DEPLOY] PENDING
[PENDING] Production database, SSL, domain (hellorun.online)
[PENDING] Monitoring, backups, launch

---

Phase 11: Shop / Merchandise Feature [COMMERCE] DRAFT

Goal: Add a HelloRun shop for running-related merchandise that supports the platform brand, events, organizers, and runner community.

[DRAFT] Public shop/catalog page for HelloRun-related merch
[DRAFT] Product detail pages with images, variants, pricing, and stock status
[DRAFT] Cart and checkout planning
[DRAFT] Admin product management
[DRAFT] Order tracking for runners/customers
[DRAFT] Optional organizer/event-specific merch collections

Detailed draft: See docs/shop_feature.md

---

FILES STRUCTURE (Updated Feb 19, 2026)

src/
  config/
    db.js
    session.js
  controllers/
    auth.controller.js
    page.controller.js
  middleware/
    auth.middleware.js             <- REWRITTEN Feb 19 (populateAuthLocals, redirectIfAuth, requireAuth, requireAdmin, requireOrganizer, requireApprovedOrganizer)
    role.middleware.js
  models/
    User.js
    user.model.js
    Counter.js
    counter.model.js
    Event.js
    Registration.js
    OrganiserApplication.js
    Submission.js
  routes/
    authRoutes.js                 <- ALL auth routes (login, signup, register, verify, reset, logout)
    pageRoutes.js                 <- Public pages (home, events, blog, about, leaderboard)
    organizer.routes.js           <- Organizer profile & application (Phase 2B)
    event.routes.js               <- Phase 3 (scaffolded)
    admin.routes.js               <- Phase 2C completed (Feb 24, 2026)
  services/
    upload.service.js
    email.service.js
    password.service.js
    token.service.js
    counter.service.js
  scripts/
    initCounter.js
    migrateUserIds.js
    setup-uploads.js
    clean-users.js
  views/
    layouts/
      head.ejs                     <- Reusable head with GA
      nav.ejs                      <- Auth-aware nav with Blog + Leaderboard links
      footer.ejs
      main.ejs
    pages/
      home.ejs                     <- Full landing page (hero, features, how-it-works, CTA)
      events.ejs                   <- Auth-based content
      blog.ejs                     <- Placeholder
      about.ejs                    <- Placeholder
      leaderboard.ejs              <- Placeholder (Phase 5 data)
      index.ejs
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
    organizer/
      complete-profile.ejs         <- 3-step form wizard
      application-status.ejs       <- Status tracking with timeline
    admin/
      applications-list.ejs        <- Phase 2C completed (Feb 24, 2026)
      application-details.ejs      <- Phase 2C completed (Feb 24, 2026)
    error.ejs
  public/
    css/
      style.css                    <- Global styles + nav user menu
      helloRun.css                 <- Landing page styles
      login.css
      signup.css
      forgot-password.css
      reset-password.css
      events.css
      complete-profile.css
      application-status.css
      verify-email-sent.css
    js/
      main.js
      auth.js
      signup.js
      reset-password.js
      complete-profile.js
      application-status.js
    images/
      helloRun-icon.webp
    uploads/
      .gitkeep
      organizer-docs/
      event-images/
      profile-photos/
    robots.txt
    sitemap.xml
  server.js

.env
.env.example
.gitignore
package.json
package-lock.json
README.md
CHANGELOG.md
PRD.md
dns.txt
sitemap.md
organiser_flow.md
user-role-system.md
sitetheme.md
seo key words.md

---

TECHNICAL STACK (Updated Feb 19, 2026)

### Backend
[DONE] Node.js + Express
[DONE] MongoDB + Mongoose
[DONE] express-session + connect-mongo
[DONE] bcrypt for password hashing
[DONE] Resend for email delivery
[DONE] UUID for token generation
[DONE] multer for file uploads

### Frontend
[DONE] EJS templating
[DONE] Lucide icons
[DONE] Vanilla JavaScript
[DONE] CSS3 with custom properties
[DONE] Mobile-first responsive design

### Security
[DONE] Password hashing (bcrypt)
[DONE] Secure session cookies
[DONE] Email verification required
[DONE] Password reset tokens (1 hour expiry)
[DONE] Rate limiting on password reset (3/24hrs)
[DONE] CSRF protection
[DONE] Input validation and sanitization
[DONE] Common password blocking
[DONE] Auth middleware (populateAuthLocals, redirectIfAuth, requireAuth, role guards)

---

AUTH MIDDLEWARE (Updated Feb 19, 2026)

File: src/middleware/auth.middleware.js

### Exports
  populateAuthLocals    - Sets res.locals for all views (isAuthenticated, user, isAdmin, isOrganizer, isApprovedOrganizer, isAuthPage)
  redirectIfAuth        - Redirects logged-in users away from /login, /signup (to role-based dashboard)
  requireAuth           - Protects routes requiring login (redirects to /login)
  requireAdmin          - Protects admin-only routes
  requireOrganizer      - Protects organiser-only routes
  requireApprovedOrganizer - Protects approved-organiser-only routes

Usage in server.js:
  app.use(populateAuthLocals)  <- BEFORE all routes
  
### Usage in routes
  router.get('/login', redirectIfAuth, ...)
  router.get('/dashboard', requireAuth, ...)
  router.get('/admin/*', requireAdmin, ...)

---

NAVIGATION BEHAVIOR (Updated Feb 19, 2026)

### Logged Out
  [Logo] [Home] [Events] [Blog] [Leaderboard] [Login] [Sign Up]

### Logged In (Runner)
  [Logo] [Home] [Events] [Blog] [Leaderboard] [Dashboard] [Hi, Name] [Logout]

### Logged In (Pending Organizer)
  [Logo] [Home] [Events] [Blog] [Leaderboard] [My Application] [Hi, Name] [Logout]

### Logged In (Approved Organizer)
  [Logo] [Home] [Events] [Blog] [Leaderboard] [Dashboard] [Hi, Name] [Logout]

### Logged In (Admin)
  [Logo] [Home] [Events] [Blog] [Leaderboard] [Admin] [Hi, Name] [Logout]

### Auth Page Redirect
  Logged-in user visits /login or /signup -> redirected to role-based dashboard

---

TIMELINE TRACKING (Updated Feb 24, 2026)

Phase 0:  [DONE] Completed - Nov 2024
Phase 1:  [DONE] Completed - Feb 2025
Phase 2A: [DONE] Completed - Dec 2024
Phase 2B: [DONE] Completed - Feb 14, 2026
Phase 2C: [DONE] Completed - Feb 24, 2026
Phase 3:  [NEXT] After Phase 2C
Phase 4:  [NEXT] After Phase 3
Phase 5:  [NEXT] After Phase 4 (includes Leaderboard)
Phase 6:  [NEXT] After Phase 5
Phase 7:  [NEXT] After Phase 6
Phase 8:  [NEXT] Optional
Phase 9:  [NEXT] Before launch
Phase 10: [NEXT] Launch

Estimated remaining: ~17-18 hours

---

DEPLOYMENT CHECKLIST (Production Ready)

### PRE-DEPLOYMENT REQUIREMENTS
- [ ] Environment Variables
- [ ] NODE_ENV=production
- [ ] PORT (assigned by hosting)
- [ ] MONGODB_URI (production database)
- [ ] SESSION_SECRET (strong, random)
- [ ] RESEND_API_KEY (production)
- [ ] EMAIL_FROM (verified domain)
- [ ] GA_MEASUREMENT_ID
- [ ] ADMIN_EMAIL
- [ ] UPLOAD_MAX_SIZE
- [ ] UPLOAD_ALLOWED_TYPES

- [ ] Database Setup
- [ ] MongoDB Atlas cluster configured
- [ ] Production database created
- [ ] Database user with proper permissions
- [ ] IP whitelist configured
- [ ] Indexes created
- [ ] Counter collection initialized

- [ ] Email Service
- [ ] Resend account verified
- [ ] Domain verified (hellorun.online)
- [ ] DNS records configured (SPF, DKIM)
- [ ] Email templates tested

- [ ] Security Hardening
- [ ] Rate limiting (express-rate-limit)
- [ ] Helmet.js for security headers
- [ ] CORS configured
- [ ] Input sanitization
- [ ] Secure session cookies (secure: true, httpOnly: true)

- [ ] SSL/HTTPS
- [ ] SSL certificate
- [ ] HTTPS redirect
- [ ] Secure cookies enabled

- [ ] Domain & DNS
- [ ] Domain purchased (hellorun.online)
- [ ] DNS A record configured
- [ ] WWW subdomain configured

- [ ] Analytics & Monitoring
- [ ] Google Analytics 4 verified
- [ ] Google Search Console configured
- [ ] Sitemap submitted
- [ ] Error tracking (Sentry or similar)
- [ ] Uptime monitoring

---

BLOG SYSTEM PLAN (Phase 7B - Future)

### IMPLEMENTED (current baseline)
[DONE] Blog model and status workflow
[DONE] Author dashboard + create/edit/submit flow
[DONE] Admin queue/review + approve/reject/archive
[DONE] Public /blog and /blog/:slug
[DONE] Admin autosave edit endpoint and revision history tracking

### BlogPost Model
[PENDING] postId, slug, title, excerpt, content, featuredImage
[PENDING] authorId, category, tags, status (draft/published/archived)
[PENDING] publishedAt, views, readTime, SEO fields

### Categories
[PENDING] Training, Nutrition, Gear, Motivation, Race Tips, Injury Prevention, General

### Routes
[PENDING] GET /blog, GET /blog/:slug (public)
[PENDING] GET/POST /admin/blog/* (admin CRUD)

### Dependencies to add
[PENDING] slugify, rich text editor (TinyMCE or Quill)

---

LEADERBOARD PLAN (Phase 5 - Future)

Data Source: Approved submissions from Phase 5

### Features
[PENDING] Top runners by total distance
[PENDING] Fastest times per event
[PENDING] Event-specific rankings
[PENDING] Filter by distance category (5K, 10K, 21K, 42K)
[PENDING] Filter by event
[PENDING] Filter by time period (weekly, monthly, all-time)
[PENDING] Public page (visible to all, no login required)
[DONE] /leaderboard route + placeholder page (Feb 19, 2026)
[DONE] Nav link added (Feb 19, 2026)

---

SHOP FEATURE PLAN (Phase 11 - Draft)

Detailed planning source: docs/shop_feature.md

### Product intent
[DRAFT] Sell merch related to running, HelloRun events, and runner community identity.
[DRAFT] Keep the first version lightweight: catalog, product detail, basic cart/order intent, and admin-managed products.
[DRAFT] Avoid making marketplace/vendor complexity part of the MVP unless needed later.

### Example merch categories
[DRAFT] HelloRun shirts and singlets
[DRAFT] Finisher shirts and event shirts
[DRAFT] Caps, socks, towels, race belts, bib holders
[DRAFT] Digital or printable event add-ons if useful later

### MVP scope
[PENDING] Product model
[PENDING] Product image upload/storage
[PENDING] Public `/shop` catalog
[PENDING] Public `/shop/:slug` product detail page
[PENDING] Admin product create/edit/archive flow
[PENDING] Cart and checkout decision: payment gateway now vs manual order/reservation first
[PENDING] Order model and customer order history

### Future scope
[PENDING] Event-specific merch bundles during registration
[PENDING] Organizer-created merch after approval
[PENDING] Discount codes and runner rewards
[PENDING] Inventory alerts and low-stock dashboard
[PENDING] Shipping/provider integration

---

DETAILED CHANGELOGS -> See CHANGELOG.md
All session-by-session changelogs are maintained in CHANGELOG.md.
This file (PRD.md) focuses on phase plans, architecture, and status tracking.










