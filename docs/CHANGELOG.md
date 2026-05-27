# DOCUMENT ROLE (REPOSITORY TRACKER)
- Purpose: File-level repository tracking and chronological implementation changelog.
- Scope: Added/updated/removed files, behavior changes, and session smoke checklist.
- Planning source: See PRD.md for roadmap, backlog, and detailed tasks.

## CHANGELOG - May 27, 2026 (Session: Runner Dashboard Event Progress Status)

### [SESSION] SESSION UPDATE:
- Updated `/runner/dashboard` so runners can see progress and review status for events they signed up for after submitting run proof.
- Added a dedicated Event Progress dashboard card showing:
  - payment-required and payment-review states before proof submission is available
  - run proof needed, pending review, approved, rejected, and certificate-ready states for standard event results
  - accumulated challenge progress with approved distance, pending activity count, rejected activity count, and progress bar
  - contextual actions for payment, submit proof, resubmit proof, view submission, and download certificate
- Kept the existing Result Submissions card intact as the recent submission-history surface.
- Added service-level normalization so dashboard EJS renders prepared status labels, helper text, progress values, and actions instead of owning business-state logic.

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. src/controllers/runner.controller.js
3. src/services/runner-data.service.js
4. src/views/runner/dashboard.ejs
5. src/public/css/runner-dashboard.css
6. tests/runner-dashboard-profile.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --check src\services\runner-data.service.js` -> PASS.
- `node --check src\controllers\runner.controller.js` -> PASS.
- `node --test --test-concurrency=1 tests\runner-dashboard-profile.test.js` -> PASS, 9/9.
- `node --test --test-concurrency=1 tests\runner-dashboard-modal.test.js` -> PASS, 3/3.

---

## CHANGELOG - May 26, 2026 (Session: Event Leaderboard Aligned V1)

### [SESSION] SESSION UPDATE:
- Implemented the aligned V1 leaderboard scope from `docs/features/hellorun_leaderboard_improvement_spec.md`:
  - kept the existing global `/leaderboard` page intact
  - added event-scoped leaderboard routes for page, JSON data, and logged-in runner standing
  - added race-result ranking from approved `Submission` records
  - added accumulated-challenge ranking from approved `AccumulatedActivitySubmission` totals
  - added My Standing and nearby runners support
  - added public-safe search by runner name and registration/confirmation code
- Added compact event leaderboard settings:
  - stored `leaderboardSettings` on `Event`
  - preserved existing `recognitionMode`, `leaderboardMode`, and `leaderboardRecognitionEnabled`
  - mapped current statuses to public labels instead of adding new submission statuses
  - defaulted older events from existing event fields
- Updated public and organiser UI:
  - added `/events/:slug/leaderboard` results page
  - added event summary, filters, status legend, My Standing card, nearby runners, mobile cards, and desktop table
  - added V1 settings controls to organiser create/edit event forms
- Documented V1 leaderboard scope in the PRD:
  - limited current scope to race result and accumulated challenge leaderboards
  - left teams, awards, manual overrides, result inquiries, imports, and caching for later phases

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/PRD.md
3. docs/features/hellorun_leaderboard_improvement_spec.md
4. src/models/Event.js
5. src/services/leaderboard.service.js
6. src/services/event-form.service.js
7. src/controllers/page.controller.js
8. src/routes/pageRoutes.js
9. src/views/pages/event-leaderboard.ejs
10. src/views/organizer/create-event.ejs
11. src/views/organizer/edit-event.ejs
12. src/public/css/leaderboard.css
13. tests/leaderboard.service.test.js
14. tests/event-leaderboard-routes.test.js
15. tests/organizer-waiver-routes.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --check src/services/leaderboard.service.js` -> PASS.
- `node --check src/services/event-form.service.js` -> PASS.
- `node --check src/controllers/page.controller.js` -> PASS.
- `node --test tests/leaderboard.service.test.js tests/event-leaderboard-routes.test.js` -> PASS, 8/8.
- `node --test tests/organizer-waiver-routes.test.js` -> PASS, 31/31.
- Test runs emitted existing Supabase shadow-sync warnings for Mongo-only seeded test records, but all assertions passed.

---

## CHANGELOG - May 26, 2026 (Session: Admin Event Deletion Stabilization + Pricing Snapshot Hardening)

### [SESSION] SESSION UPDATE:
- Stabilized admin event deletion workflows:
  - single event soft-delete now requires admin password confirmation alongside the deletion reason
  - added bulk event soft-delete from `/admin/events` with password confirmation, selected-row handling, progress state, and disabled selection for already deleted events
  - preserved soft-delete semantics: registrations, submissions, media, orders, and uploads are not removed
  - shared admin deletion password verification across single and bulk delete handlers
- Improved admin event management UI maintainability:
  - moved the large inline bulk-delete list script into `src/public/js/admin-events-list.js`
  - kept the EJS template responsible only for markup and CSRF config handoff
  - retained CSRF submission through both `X-CSRF-Token` and `_csrf` payload fields
- Hardened registration pricing snapshot coverage:
  - added route-level coverage for distance-based pricing snapshots
  - added active distance-period pricing snapshot coverage
  - confirmed customized option and package-period registration snapshots remain persisted correctly
  - added inactive package-period rejection coverage
  - confirmed payment proof review uses saved `Registration.paymentAmountDue` rather than recalculating from the current event fee
- Stabilized public smoke coverage:
  - added a session-ready wait in the future-public-posting registration visibility test to avoid a login/session-store race.

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. src/controllers/admin.controller.js
3. src/routes/admin.routes.js
4. src/views/admin/event-detail.ejs
5. src/views/admin/events-list.ejs
6. src/public/css/admin.css
7. src/public/js/admin-events-list.js
8. tests/admin-dashboard.test.js
9. tests/registration-addons-read.test.js
10. tests/payment-route-guards.test.js
11. tests/public-search-filters.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --check` on changed controller, route-adjacent static JS, and updated test files -> PASS.
- `node src/scripts/run-test-group.js tests/admin-dashboard.test.js tests/admin-users.test.js` -> PASS, 19/19, about 104 seconds.
- `node src/scripts/run-test-group.js tests/registration-price.service.test.js tests/registration-addons-read.test.js tests/payment-route-guards.test.js` -> PASS, 30/30, about 142 seconds.
- `npm run test:admin` -> PASS, 38/38, about 161 seconds.
- `npm run test:shop` -> PASS, 44/44, about 193 seconds.
- `npm run test:smoke` -> PASS, 48/48, about 151 seconds.
- `npm audit --omit=dev` -> PASS, 0 vulnerabilities.
- `git diff --check` -> PASS, CRLF warnings only.

---

## CHANGELOG - May 26, 2026 (Session: Step 7 Pricing Refactor + Step 12 Responsive Tiles)

### [SESSION] SESSION UPDATE:
- Centralized Step 7 pricing behavior into a shared client module used by both organizer create and edit flows:
  - introduced `src/public/js/organizer-pricing-step.js` as the shared controller for pricing mode toggles, panel visibility, payment field behavior, pricing period toggle handling, package summaries, package add/remove/index handlers, and Step 7 snapshot generation
  - removed duplicated inline package handlers and duplicated snapshot logic from both `create-event.ejs` and `edit-event.ejs`
  - wired both pages to use controller APIs (`setupRegistrationPackageHandlers`, `updatePricingStepSnapshot`, and related helpers) for parity and easier maintenance
- Improved Step 7 reliability and UX consistency:
  - pricing panel switching now uses deterministic non-animated toggles for dropdown mode changes with animation cancellation safeguards
  - package action aria labels and indexing remain synchronized after add/remove operations
  - suggested pricing date actions now trigger refreshed Step 7 snapshot updates
- Updated Step 12 Review content presentation for tablet/mobile:
  - readiness checklist items now render as tile cards at tablet and mobile breakpoints
  - review notes now render as tile cards at tablet and mobile breakpoints
  - review summary remains card-based with explicit 2-column tablet and single-column mobile behavior
- Improved runner pricing visibility on event registration and public event details:
  - `/events/:slug/register` now shows live amount preview for selected race distance when distance-based pricing is active
  - package pricing options on registration now show current active amount/period and disable packages with inactive pricing windows
  - public `/events/:slug` pricing cards now show a current pricing-period badge (when active) for distance-period and package-period pricing

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. src/public/js/organizer-pricing-step.js
3. src/views/organizer/create-event.ejs
4. src/views/organizer/edit-event.ejs
5. src/public/css/create-event.css
6. src/controllers/page.controller.js
7. src/views/pages/event-register.ejs
8. src/public/css/event-register.css
9. src/utils/event-public-view.js
10. src/views/pages/event-details.ejs
11. src/public/css/event-details.css

### [VALIDATION] TEST/RUN CHECKS:
- `get_errors` on changed files -> PASS (no syntax/template/CSS errors reported).
- Static verification confirmed create/edit pages both consume shared pricing controller APIs.

---

## CHANGELOG - May 14, 2026 (Session: Payment Receipt and Run Result Split)

### [SESSION] SESSION UPDATE:
- Distinguished paid-event payment verification from activity completion review:
  - paid events now require a dedicated `Payment Receipt` upload before run result submission is unlocked
  - free events now create registrations with `paymentStatus: paid`
  - run activity evidence is consistently presented as a `Run Result`, not payment proof
  - the existing data separation remains intact: `Registration.paymentProof` stores payment receipts, while `Submission.proof` stores run result evidence
- Updated runner registration UI:
  - `/my-registrations` now renders a distinct `Payment Verification` section for paid/payment-review registrations
  - payment receipt helper copy warns runners not to upload activity screenshots as payment receipts
  - run result actions now say `Submit Run Result`, `Resubmit Run Result`, and `View Run Result Evidence`
  - the run result modal keeps multi-event selection while clarifying that one uploaded activity can be submitted to selected eligible events and personal record
- Updated organizer/admin review UI:
  - review queues now use `Payment Receipts` and `Run Results`
  - payment review screens show fee/payment instructions, confirmation code, and receipt links near the uploaded receipt
  - organizer copy explicitly says activity screenshots in the payment queue should be rejected
- Kept route/schema compatibility:
  - no collection changes
  - no route renames
  - `/submit-result`, `/resubmit-result`, and existing payment receipt routes remain stable

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/PRD.md
3. docs/create_event/create_event.md
4. docs/runner_submitted_entries.md
5. src/controllers/admin.controller.js
6. src/controllers/page.controller.js
7. src/public/css/my-registrations.css
8. src/public/css/organizer-events.css
9. src/public/js/run-proof-modal.js
10. src/routes/organizer.routes.js
11. src/routes/pageRoutes.js
12. src/services/email.service.js
13. src/services/runner-data.service.js
14. src/services/submission.service.js
15. src/services/upload.service.js
16. src/utils/payment-workflow.js
17. src/views/admin/dashboard.ejs
18. src/views/admin/review-queue.ejs
19. src/views/organizer/dashboard.ejs
20. src/views/organizer/event-registrants.ejs
21. src/views/pages/my-registrations.ejs
22. src/views/partials/run-proof-modal.ejs
23. src/views/runner/dashboard.ejs
24. src/views/runner/submissions.ejs
25. tests/admin-dashboard.test.js
26. tests/organizer-dashboard-analytics.test.js
27. tests/payment-route-guards.test.js
28. tests/payment-workflow.test.js
29. tests/runner-dashboard-modal.test.js
30. tests/submission-routes.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `npm test` -> PASS, 316/316.
- Focused payment, submission, admin review, organizer dashboard, runner modal, upload validation, CSRF, and leaderboard tests were also run while isolating regressions.

---

## CHANGELOG - May 14, 2026 (Session: Strava Import MVP)

### [SESSION] SESSION UPDATE:
- Implemented the user-controlled Strava import MVP:
  - runners can connect Strava through OAuth from the profile integrations panel
  - Strava access and refresh tokens are stored encrypted with AES-256-GCM
  - runners can disconnect Strava without deleting existing HelloRun submissions
  - the submit run modal now fetches recent Strava activities only when the runner clicks `Sync Strava Data`
  - runners manually select one Strava activity and submit it to the selected eligible HelloRun event
  - imported Strava activities are saved into the existing regular or accumulated submission review system
  - duplicate Strava activity submissions are blocked per runner/event
  - Strava activity details are stored as a minimal local snapshot for review, leaderboard, and certificate flows
- Added Strava integration routes and APIs:
  - `GET /integrations/strava/connect`
  - `GET /integrations/strava/callback`
  - `POST /integrations/strava/disconnect`
  - `GET /api/strava/connection`
  - `GET /api/strava/activities`
  - `POST /api/events/:eventId/submissions/strava`
- Added graceful missing-config handling for Strava setup. Real OAuth requires `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, and `STRAVA_ENCRYPTION_KEY`.
- Kept automatic background sync out of scope for MVP.

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/PRD.md
3. docs/hellorun_strava_integration_codex.md
4. src/models/StravaConnection.js
5. src/models/Submission.js
6. src/models/AccumulatedActivitySubmission.js
7. src/services/token-encryption.service.js
8. src/services/strava.service.js
9. src/services/strava-submission.service.js
10. src/services/submission.service.js
11. src/routes/strava.routes.js
12. src/server.js
13. src/controllers/runner.controller.js
14. src/views/runner/profile.ejs
15. src/views/partials/run-proof-modal.ejs
16. src/public/js/run-proof-modal.js
17. src/public/css/run-proof-modal.css
18. tests/strava-integration.test.js
19. tests/runner-dashboard-modal.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests\strava-integration.test.js tests\runner-dashboard-modal.test.js` -> PASS, 6/6.
- `node --test --test-concurrency=1 tests\submission.service.test.js` -> PASS, 30/30.
- `node --check` on changed Strava services, routes, modal JS, submission service, and server entrypoint -> PASS.
- `git diff --check` -> PASS.

---

## CHANGELOG - May 13, 2026 (Session: Pending Organizer Event Creation Gate)

### [SESSION] SESSION UPDATE:
- Added pending-organizer provisional event creation:
  - pending organizers stay on `/organizer/dashboard` without an automatic modal
  - clicking `Create New Event` opens a limited-access acknowledgement modal
  - acknowledgement requires a checkbox and electronic signature matching the account full name
  - successful acknowledgement records timestamp, signature name, IP address, and user agent on the user account
  - after acknowledgement, pending organizers can access `/organizer/create-event`
- Updated `/terms` with a visible pending-organizer event creation addendum so terms remain available even when the main terms body is DB-driven.
- Fixed the modal visibility rule so the hidden modal does not display on dashboard load.
- Added route/UI regression coverage for pending organizer dashboard access, signature mismatch, successful acknowledgement, and create-event access.

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/create_event/create_event.md
3. docs/organizer_application_flow.md
4. src/models/User.js
5. src/routes/organizer.routes.js
6. src/views/organizer/dashboard.ejs
7. src/views/pages/terms.ejs
8. src/public/css/organizer-dashboard.css
9. tests/organizer-dashboard-analytics.test.js
10. tests/organizer-waiver-routes.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `$env:CSRF_PROTECTION='0'; node --test --test-concurrency=1 tests/organizer-dashboard-analytics.test.js tests/organizer-waiver-routes.test.js` -> PASS, 25/25.
- `$env:CSRF_PROTECTION='0'; node --test --test-concurrency=1 tests/static-pages.test.js` -> PASS, 2/2.

---

## CHANGELOG - May 13, 2026 (Session: Admin User Management MVP)

### [SESSION] SESSION UPDATE:
- Added the admin user management MVP:
  - new `/admin/users` directory with search, filters, pagination, activity counts, quick user modal, bulk dormant-user delete, and dashboard entry point
  - new `/admin/users/:id` detail page with account, profile, emergency contact, consent, organizer application, recent registrations/submissions, and owned events
  - new `/admin/users/:id/edit` form for admin-editable personal profile fields plus role and organizer status only; system/account data remains read-only
- Refined the `/admin/users` table and modal UX:
  - themed search field and filter controls
  - clickable tri-state table sorting for visible rows
  - compact modal sections with "Open Full Details" in a new tab
  - responsive table behavior with horizontal overflow, compact labels below desktop, icon-only row actions, and a Columns checklist
  - User ID is hidden by default and can be enabled from the column picker
- Added route coverage for admin-only access, list/search/filter, detail views, edit restrictions, delete safeguards, and missing-user handling.

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/user_management_improvement_draft.md
3. src/controllers/admin.controller.js
4. src/routes/admin.routes.js
5. src/views/admin/dashboard.ejs
6. src/views/admin/users-list.ejs
7. src/views/admin/user-detail.ejs
8. src/views/admin/user-edit.ejs
9. src/public/css/admin.css
10. tests/admin-dashboard.test.js
11. tests/admin-users.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `$env:CSRF_PROTECTION='0'; node --test --test-concurrency=1 tests/admin-users.test.js` -> PASS, 7/7.
- Previous dashboard coverage was updated to include the new user-management quick link.

---

## CHANGELOG - May 13, 2026 (Session: Public Event Page Landing Template)

### [SESSION] SESSION UPDATE:
- Reworked `/events/:slug` as the reusable public event landing-page pattern for all published events:
  - added a normalized public event view model for registration state, pricing, optional add-ons, rewards, virtual rules, timeline, signup count, SEO, and rich details
  - rebuilt the public event details EJS template around hero, stats, mechanics, challenge goal, rewards, pricing/add-ons, submission rules, timeline, long-form details, gallery/poster, and CTA sections
  - updated responsive UI for desktop, tablet, mobile, and very small mobile layouts
  - added a semi-transparent 50% contrast layer behind the hero short description so text remains readable over organizer-uploaded banner designs
  - removed the event logo from the public hero after review to keep the hero chips and event message focused
  - changed Event Details rendering to support sanitized Quill HTML while keeping markdown fallback
- Added a dedicated maintenance reference for the public event page:
  - `docs/public_event_page_template.md`
- Updated related notes to point future QR promotion and organizer preview work at the `/events/:slug` public template.

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/PRD.md
3. docs/create_event/create_event.md
4. docs/create_event/create_event_wizard_codex_implementation.md
5. docs/event_qr_promotion_links.md
6. docs/public_event_page_template.md
7. src/controllers/page.controller.js
8. src/utils/event-public-view.js
9. src/views/pages/event-details.ejs
10. src/public/css/event-details.css
11. tests/event-public-view.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --test tests/event-public-view.test.js` -> PASS
- EJS compile check for `src/views/pages/event-details.ejs` -> PASS
- Smoke render for `/events/2026k-hellorun-challenge-4` -> PASS, 200

---

## CHANGELOG - May 12, 2026 (Session: Edit Event Wizard Alignment)

### [SESSION] SESSION UPDATE:
- Refined `/organizer/events/:id/edit` to match the guided `/organizer/create-event` builder experience:
  - added the 12-step wizard sidebar, tablet pills, mobile mini-strip, and mobile step overlay to edit-event
  - split edit sections into the same Event Type, Core Details, Schedule, Location/Virtual, Race Categories, Rewards, Pricing, Payment, Event Details, Media, Waiver, and Review flow
  - preserved existing edit-event media previews and immediate media removal behavior
  - added an edit-page Preview action using the existing `/organizer/preview-event` path
  - added draft-only `Submit for Review`, which saves changes, validates publish readiness, and transitions drafts to `pending_review`
  - hid the draft submit action for published and pending-review events

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/create_event/create_event.md
3. docs/create_event/create_event_wizard_codex_implementation.md
4. src/routes/organizer.routes.js
5. src/views/organizer/edit-event.ejs
6. tests/organizer-waiver-routes.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/organizer-waiver-routes.test.js` -> PASS, 22/22.
- `npm test` was run with a longer timeout; organizer coverage passed, but the full suite still failed on unrelated runner submission route assertions and an existing upload-message assertion.

---

## CHANGELOG - May 11, 2026 (Session 17: Create Event â€” Sub-Desktop Wizard Nav)

### [SESSION] SESSION UPDATE:
- Implemented 3-tier responsive wizard navigation for `/organizer/create-event` at sub-desktop widths:
  - **Tablet (â‰¤1024px)**: sticky horizontal scrollable pills bar docked below site nav
  - **Mobile (â‰¤640px)**: sticky mini progress strip (step counter, title, chevron toggle, 3px progress bar)
  - **Mobile overlay**: full-page nav overlay opened by the mini-strip chevron toggle; shows all 11 steps; dismissed by close button, backdrop click, or Escape key
- Fixed icons not rendering across all pages: root cause was a duplicate `const eventStartInput` declaration in the create-event IIFE that caused a `SyntaxError`, preventing `lucide.createIcons()` from running
- Fixed sticky top offsets: wizard nav strips now use CSS custom property `--nav-h` set via JS (`nav.offsetHeight`) on load + resize, so they always dock correctly below the site nav regardless of breakpoint
- Fixed icon-only button rendering: added `padding: 0; line-height: 1` resets to `.wizard-mini-toggle` and `.wizard-nav-overlay-close` to remove browser default button padding
- Fixed chevron rotation animation: `transition: transform 0.2s ease` moved to unified `i, svg` rule so animation fires on the Lucide-generated `<svg>` element (not the replaced `<i>`)
- Fixed global back-to-top icon: updated `style.css` to target both `i` and `svg` for `.global-back-to-top`

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. src/views/organizer/create-event.ejs
3. src/public/css/create-event.css
4. src/public/css/style.css

### [VALIDATION] TEST/RUN CHECKS:
- Server starts and `GET /organizer/create-event` renders without JS errors in browser console
- At â‰¤1024px: pills bar appears sticky below site nav; pills scroll horizontally; active pill auto-scrolls into view
- At â‰¤640px: mini strip appears sticky; chevron rotates on overlay open/close; progress bar fills per step
- Overlay: opens on toggle tap; backdrop/close/Escape all dismiss; active step highlighted
- All Lucide icons (nav, mini-strip chevron, overlay close, back-to-top, waiver toolbar) render correctly

---

## CHANGELOG - May 10, 2026 (Session: Create Event Organizer Setup V1 Notes)

### [SESSION] SESSION UPDATE:
- Refined `/organizer/create-event` and organizer edit-event setup defaults and guidance:
  - guided blank create forms now default Organizer Name from the account owner's first and last name
  - added Organizer Name and Description tooltips using the existing form help-icon pattern
  - moved Race Distances before Event Type in Core Details
  - defaulted Event Format to accumulated distance challenge for virtual/hybrid setup
  - kept Target Distance visible with race-distance auto-fill, because accumulated progress depends on it
  - removed organizer-facing Minimum Activity Distance and Milestones controls from create/edit forms
  - defaulted Final Submission Deadline to Event End + 14 days for accumulated challenges, with tooltip guidance
  - stopped showing Minimum Activity and Milestones in organizer preview
  - kept legacy minimum-distance enforcement for existing events that already have a minimum configured

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/create_event/create_event.md
3. src/routes/organizer.routes.js
4. src/services/event-form.service.js
5. src/views/organizer/create-event.ejs
6. src/views/organizer/edit-event.ejs
7. src/views/organizer/event-preview.ejs
8. tests/organizer-waiver-routes.test.js
9. tests/submission.service.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/organizer-waiver-routes.test.js` -> PASS
- `node --test --test-concurrency=1 tests/submission.service.test.js` -> PASS

---

### [SESSION] SESSION UPDATE:
- Updated create-event planning notes after Organizer Setup V1 implementation:
  - marked panel reorder, reward amount fields, towel, custom merchandise, registration packages, package pricing periods, delivery/claiming setup, special reward benefits, V1 `pricingMode`, suggested setup total, and final fee override as implemented
  - updated accumulated-distance notes to reflect existing activity-level submissions, approved-distance rollups, organizer review support, certificate eligibility, and leaderboard rows
  - clarified remaining scope: runner package/category selection, active price resolver, payment amount snapshot, payment proof amount enforcement, race category pricing, review/certificate release dates, and badge unlock logic
  - recorded V1 product decisions for internal reward costs, independently configured package prices, flat delivery fee, and informational special benefits

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/create_event/create_event.md

### [VALIDATION] TEST/RUN CHECKS:
- Documentation-only update; automated tests not rerun in this note pass.
- Previous implementation verification: `node --test tests/organizer-waiver-routes.test.js` -> PASS
- Previous implementation verification: `npm test` -> PASS, 287 tests

---

## CHANGELOG - May 9, 2026 (Session: Create Event Details, Fees, Payment QR, and Rewards)

### [SESSION] SESSION UPDATE:
- Expanded `/organizer/create-event` and edit/admin edit event setup:
  - preloads the 2026K accumulated challenge default content from `docs/template/2026k_accumulated_run_challenge_template.md`
  - adds full editable Event Details content for long-form rules, FAQ, and instructions, stored internally as `eventDetailsMarkdown`
  - keeps `description` as the short event listing/card summary
  - adds free/paid fee configuration with amount and currency
  - adds paid-event payment QR upload, optional account name, and optional payment instructions
  - adds digital badge, digital certificate, physical rewards, and physical reward notes
  - expands physical rewards with medal, shirt, patch, and finisher kit item toggles
  - places leaderboard recognition with accumulated challenge leaderboard settings
  - paid drafts can save without QR, while paid submit-for-review requires fee amount, currency, and payment QR
- Updated event display surfaces:
  - event preview, public event detail, organizer event detail, and admin event detail render fee/reward information
  - long Event Details content is rendered through sanitized HTML with table support
- Explicitly deferred runner paid-registration enforcement:
  - runner signup/payment-proof flow is unchanged in this session
  - event-level payment data is now stored for the next runner payment-proof step

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/create_event/create_event.md
3. src/controllers/admin.controller.js
4. src/controllers/page.controller.js
5. src/models/Event.js
6. src/routes/organizer.routes.js
7. src/services/event-form.service.js
8. src/services/upload.service.js
9. src/utils/event-template.js
10. src/utils/markdown.js
11. src/views/organizer/create-event.ejs
12. src/views/organizer/edit-event.ejs
13. src/views/organizer/event-details.ejs
14. src/views/organizer/event-preview.ejs
15. src/views/pages/event-details.ejs
16. src/views/admin/event-detail.ejs
17. src/public/css/create-event.css
18. src/public/css/event-details.css
19. src/public/css/event-manage.css
20. src/public/css/admin.css
21. tests/organizer-waiver-routes.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --check src/routes/organizer.routes.js` -> PASS
- `node --check src/services/event-form.service.js` -> PASS
- `node --check src/controllers/admin.controller.js` -> PASS
- `node --check src/controllers/page.controller.js` -> PASS
- `node --test --test-concurrency=1 tests/organizer-waiver-routes.test.js` -> PASS
- `node --test --test-concurrency=1 tests/public-search-filters.test.js` -> PASS
- Superseded by May 10 full-suite verification: `npm test` -> PASS, 287 tests
- `git diff --check` on touched files -> PASS

---

## CHANGELOG - May 8, 2026 (Session: Organizer Dashboard Mobile Actions Polish)

### [SESSION] SESSION UPDATE:
- Refined `/organizer/dashboard` responsive action layout:
  - placed the mobile Create Event tile in the same row as organizer verification status and approval date
  - added spacing before the next dashboard panel so the header action row does not crowd the analytics card
  - changed draft event action from `Continue Editing` to `Edit`
  - converted draft Edit and View Registrants actions to project secondary button styling with scoped widths and alignment
  - converted Review Queue actions from text buttons to square icon-only secondary buttons
  - positioned Review Queue icon buttons in the upper-right corner of each queue card
- Updated the organizer dashboard analytics test to assert the new icon-only review action markup.

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. src/public/css/organizer-dashboard.css
3. src/views/organizer/dashboard.ejs
4. tests/organizer-dashboard-analytics.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/organizer-dashboard-analytics.test.js` -> PASS
- `node --test --test-concurrency=1 tests/static-pages.test.js` -> PASS
- `git diff --check` before commit -> PASS

---

## CHANGELOG - May 8, 2026 (Session: Accumulated Activity Submissions + Leaderboard Polish)

### [SESSION] SESSION UPDATE:
- Added accumulated-distance activity submission support:
  - introduced `AccumulatedActivitySubmission` records for multi-proof virtual challenges
  - added progress aggregation, certificate issuance on completion, review notifications, and organizer activity counts
  - routed runner submissions for accumulated events through activity records while keeping single-activity submissions unchanged
  - exposed accumulated progress on My Registrations and organizer registrant review pages
- Updated organizer create/edit event setup for accumulated challenges:
  - allowed publishing configured accumulated-distance events
  - added target distance, minimum activity distance, accepted activity type validation, and inline help
  - auto-fills a single selected race distance into the accumulated target when appropriate
  - compacted waiver editor helper actions into icon buttons with tooltips
- Improved leaderboard handling:
  - includes accumulated-distance leaderboard rows using approved total distance
  - improves mobile leaderboard cards and filter controls
- Added a planning note for event QR promotion links and route scope.

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. docs/event_qr_promotion_links.md
3. src/controllers/page.controller.js
4. src/models/AccumulatedActivitySubmission.js
5. src/public/css/create-event.css
6. src/public/css/leaderboard.css
7. src/routes/organizer.routes.js
8. src/services/accumulated-activity.service.js
9. src/services/leaderboard.service.js
10. src/services/runner-data.service.js
11. src/services/submission.service.js
12. src/utils/submission-window.js
13. src/views/organizer/create-event.ejs
14. src/views/organizer/edit-event.ejs
15. src/views/organizer/event-registrants.ejs
16. src/views/pages/leaderboard.ejs
17. src/views/pages/my-registrations.ejs
18. tests/organizer-waiver-routes.test.js
19. tests/submission.service.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/submission.service.test.js` -> PASS
- `node --test --test-concurrency=1 tests/organizer-waiver-routes.test.js` -> PASS
- `node --test --test-concurrency=1 tests/runner-submissions-routes.test.js` -> PASS
- `node --test --test-concurrency=1 tests/leaderboard.service.test.js` -> PASS
- `git diff --check` before commit -> PASS

---

## CHANGELOG - May 8, 2026 (Session: Organizer Dashboard Layout + Support Link Polish)

### [SESSION] SESSION UPDATE:
- Reworked `/organizer/dashboard` header and sidebar presentation:
  - compacted the desktop dashboard header into a two-column layout
  - grouped the welcome/create-event area with the analytics/stat panel
  - moved the organizer profile card into the header-side context
  - kept Quick Actions as a compact two-column panel with clearer icon/title/description alignment
  - improved responsive tablet/mobile grid behavior for analytics, stats, event cards, and action controls
- Updated organizer dashboard action behavior:
  - Payment, Result, Continue Editing, View Registrants, Review, Help links open in new tabs where requested
  - Payment and Result actions use dedicated blue queue-review buttons with icons
  - Getting Started is now an accessible collapsible card with ARIA state and explicit hide styling
- Updated support navigation:
  - organizer dashboard Contact Support now routes to `/contact?source=organizer-dashboard`
  - `/contact` renders organizer-specific guidance when sourced from the organizer dashboard

### [UPDATED] UPDATED FILES:
1. docs/CHANGELOG.md
2. src/public/css/organizer-dashboard.css
3. src/routes/pageRoutes.js
4. src/views/organizer/dashboard.ejs
5. src/views/pages/contact.ejs
6. tests/organizer-dashboard-analytics.test.js
7. tests/static-pages.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/static-pages.test.js` -> PASS
- `node --test --test-concurrency=1 tests/organizer-dashboard-analytics.test.js` -> PASS
- `git diff --check` on touched dashboard/contact files -> PASS

---

## CHANGELOG - May 7, 2026 (Session: Project-Wide Button Standard)

### [SESSION] SESSION UPDATE:
- Documented the `/login` button treatment as the project-wide button standard:
  - 12px radius
  - Poppins 600 typography
  - non-uppercase labels with normal letter spacing
  - icon+label structure where useful
  - consistent hover lift and disabled behavior
- Recorded `/admin/events` as the first admin management area using the standard through `.admin-events-page .admin-event-action-btn`.
- Added a shared `project-buttons.css` stylesheet to enforce the standard across public, runner, organizer, admin, blog, auth, and error surfaces.
- Updated the legacy global `.btn` base style so it no longer defaults to gradient, uppercase, letter-spaced, pill-shaped buttons.
- Fixed `/leaderboard` nav icon rendering by adding the missing page-level `lucide.createIcons()` call.
- Added a nav-scoped reset in `project-buttons.css` so the real top navigation keeps compact icon-button styling while non-nav action links can still reuse project button classes.
- Updated create-event notes to reflect the current draft -> admin review -> approval/publish lifecycle.

### [UPDATED] UPDATED FILES:
1. docs/PRD.md
2. docs/CHANGELOG.md
3. docs/ui-ux-reference.md
4. docs/sitetheme.md
5. docs/create_event/create_event.md
6. src/public/css/project-buttons.css
7. src/public/css/style.css
8. src/views/layouts/head.ejs
9. src/views/layouts/main.ejs
10. src/views/error.ejs
11. src/views/pages/leaderboard.ejs
12. src/public/css/leaderboard.css

### [VALIDATION] TEST/RUN CHECKS:
- CSS brace balance check for `project-buttons.css` and `style.css` -> PASS
- `git diff --check` on changed implementation files -> PASS
- `CSRF_PROTECTION=0 node --test --test-concurrency=1 tests/static-pages.test.js tests/admin-dashboard.test.js tests/public-search-filters.test.js` -> PASS
- `/leaderboard` render check returned `200` and includes `lucide.createIcons()`.

---

## CHANGELOG - May 1, 2026 (Session: Events Mobile Search + Image Fallbacks)

### [SESSION] SESSION UPDATE:
- Tightened the public `/events` mobile experience:
  - reduced the Event Discovery hero panel on mobile so event cards appear sooner
  - kept search as a dedicated full-width row above compact filters
  - emphasized the mobile search input with a thicker blue border
  - moved the search icon to the right side of the textbox and covered Lucide SVG replacement
  - kept Mode, Distance, and Status as a compact single-row dropdown group without visible labels
  - removed the mobile Apply button by auto-submitting when dropdown filters change
- Improved public event imagery:
  - event cards now always render an image
  - missing, stale, or inaccessible event banners fall back to `/images/helloRun-icon.webp`
  - event detail banner display uses the same fallback
- Hardened R2 public URL handling:
  - removed the fallback that saved R2 API endpoint URLs as public image URLs
  - new R2 uploads now require `R2_PUBLIC_BASE_URL` to point at a public bucket URL or custom domain

### [UPDATED] UPDATED FILES (major):
1. docs/PRD.md
2. docs/CHANGELOG.md
3. src/views/pages/events.ejs
4. src/views/pages/event-details.ejs
5. src/public/css/events.css
6. src/public/js/main.js
7. src/services/upload.service.js

### [VALIDATION] TEST/RUN CHECKS:
- `CSRF_PROTECTION=0 node --test tests/public-search-filters.test.js` -> PASS
- `CSRF_PROTECTION=0 node --test tests/upload-validation.test.js tests/certificate-access.test.js` -> PASS
- `git diff --check` on changed files -> PASS

## CHANGELOG - April 30, 2026 (Session: PRD Expansion + Runner Entry UX Polish)

### [SESSION] SESSION UPDATE:
- Expanded `docs/PRD.md` so HelloRun is positioned as a runner and organiser platform:
  - clarified virtual, onsite, and hybrid running event modes
  - scoped virtual monitoring to proof/OCR/review workflows, not live GPS
  - scoped onsite support to registration, participant operations, result import/manual encoding, rankings, certificates, and reports
  - added draft Phases 13-16 and cross-cutting terminology/readiness gates
- Improved runner run-submission entry points:
  - made the landing-page `Already registered? Log your latest run.` CTA more visible
  - made the same CTA visible to logged-out users
  - added a mobile/tablet `Log latest run` nav icon immediately left of the hamburger for guests and runner accounts
  - preserved post-login intent so guest submit-run clicks route to login and then auto-open the run-proof modal on `/runner/dashboard`
- Fixed responsive UI details:
  - restored the `/login` submit button below desktop widths
  - changed the `/runner/dashboard` mobile `At a glance` KPI panel from tiles to list rows

### [UPDATED] UPDATED FILES (major):
1. docs/PRD.md
2. docs/CHANGELOG.md
3. src/views/pages/home.ejs
4. src/views/layouts/nav.ejs
5. src/views/auth/login.ejs
6. src/public/css/helloRun.css
7. src/public/css/style.css
8. src/public/css/login.css
9. src/public/css/runner-dashboard.css
10. src/public/js/run-proof-modal.js
11. src/routes/authRoutes.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --check src/public/js/run-proof-modal.js` -> PASS
- `node --check src/routes/authRoutes.js` -> PASS
- `git diff --check` on changed files -> PASS
- Full automated suite not run for this documentation/UI batch.

## CHANGELOG - April 29, 2026 (Session: Runner Submissions UI Planning Notes)

### [SESSION] SESSION UPDATE:
- Captured the next `/runner/submissions` UI improvement pass as planning-only work:
  - improve summary/filter/card hierarchy across mobile, tablet, and desktop
  - keep event entries and personal-record submissions visible
  - improve card scan quality, badges, action layout, and empty states
  - preserve shared hamburger navigation and avoid duplicate run-proof modal markup
- No UI implementation was started in this note update.

### [UPDATED] UPDATED FILES (major):
1. docs/runner_submitted_entries.md
2. docs/PRD.md
3. docs/CHANGELOG.md

### [VALIDATION] TEST/RUN CHECKS:
- Not run; documentation-only planning update.

## CHANGELOG - April 28, 2026 (Session: Runner Run-Proof Modal Process Hardening)

### [SESSION] SESSION UPDATE:
- Improved the `/runner/dashboard` run-proof modal process:
  - modal now opens immediately and shows an in-modal eligible-event loading state
  - step 1 now uses analysis language (`Analyse Screenshot`) instead of implying the screenshot is the final submission
  - OCR unavailable/failure states now continue to the details step for manual entry
  - returning from details to screenshot keeps the cached OCR state instead of forcing a fresh analysis
  - dashboard resubmission triggers can preselect their registration through `data-run-proof-registration-id`
- Hardened accidental exit behavior:
  - outside/backdrop clicks open the reusable confirmation dialog
  - header Close on step 1 opens the same confirmation dialog
  - Escape routes through the same confirmation path
  - keyboard refresh (`F5`, `Ctrl+R`, `Cmd+R`) opens the reusable confirmation dialog with refresh-specific copy
  - browser-controlled refresh/tab close/navigation remains protected by native `beforeunload` because custom dialogs are blocked for those events
- Added focused modal regression coverage for the process contract.

### [UPDATED] UPDATED FILES (major):
1. docs/PRD.md
2. docs/CHANGELOG.md
3. src/views/partials/run-proof-modal.ejs
4. src/public/js/run-proof-modal.js
5. src/public/css/run-proof-modal.css
6. tests/runner-dashboard-modal.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --check src/public/js/run-proof-modal.js` -> PASS
- `node --test --test-concurrency=1 tests/runner-dashboard-modal.test.js` with `CSRF_PROTECTION=0` -> PASS
- `node --test --test-concurrency=1 tests/runner-dashboard-profile.test.js` with `CSRF_PROTECTION=0` -> PASS
- `node --test --test-concurrency=1 tests/ocr-proof-reader.test.js` with `CSRF_PROTECTION=0` -> PASS
- `npm test` -> TIMEOUT in current command window after roughly 3 minutes

## CHANGELOG - April 28, 2026 (Session: Events Search Ranking + Responsive Polish)

### [SESSION] SESSION UPDATE:
- Fixed the `/events` search regression by ranking searched results before pagination:
  - exact title/organizer matches now rank ahead of description-only matches
  - location and rendered country-name/code matches are included in relevance ranking
  - non-search `/events` sorting and pagination behavior remains unchanged
- Hardened `tests/public-search-filters.test.js`:
  - added cleanup for stale public-filter seed artifacts
  - adjusted pagination filler data so organizer-name search assertions stay deterministic
  - added coverage for high-value organizer matches outranking description-only matches
- Polished `/events` tablet/mobile UI:
  - improved filter grid behavior on tablet
  - made mobile filters/actions full-width and touch-friendly
  - tightened card wrapping, description clamping, active filter chips, and pagination controls

### [UPDATED] UPDATED FILES (major):
1. docs/PRD.md
2. docs/CHANGELOG.md
3. src/controllers/page.controller.js
4. src/public/css/events.css
5. tests/public-search-filters.test.js

### [VALIDATION] TEST/RUN CHECKS:
- `node --test --test-concurrency=1 tests/public-search-filters.test.js` -> PASS
- `node --test --test-concurrency=1 tests/static-pages.test.js` -> PASS
- `npm test` -> PASS, 200/200 tests

## CHANGELOG - April 26, 2026 (Session: Shared Floating Back-To-Top Button)

### [SESSION] SESSION UPDATE:
- Promoted the floating `Back to top` button into a shared site-level implementation:
  - added one reusable floating button in the shared footer include
  - centralized scroll/visibility/smooth-scroll behavior in shared `main.js`
  - moved styling into shared `style.css`
  - removed duplicated page-level back-to-top buttons and inline handlers from blog and static/legal pages
- Added reusable documentation for this UI pattern:
  - created a standalone markdown reference for lifting the floating button into other projects

### [UPDATED] UPDATED FILES (major):
1. docs/CHANGELOG.md
2. docs/floating-back-to-top-pattern.md
3. src/views/layouts/footer.ejs
4. src/public/css/style.css
5. src/public/js/main.js
6. src/views/pages/blog.ejs
7. src/views/pages/blog-post.ejs
8. src/views/pages/privacy.ejs
9. src/views/pages/terms.ejs
10. src/views/pages/cookie-policy.ejs
11. src/views/pages/faq.ejs

### [VALIDATION] TEST/RUN CHECKS:
- Code-level verification completed for:
  - shared footer-level button injection
  - shared scroll listener + smooth scroll behavior
  - removal of duplicated page-specific back-to-top handlers
- Live browser verification not run in this session

## CHANGELOG - April 25, 2026 (Session: Runner Dashboard Responsive Card Polish)

### [SESSION] SESSION UPDATE:
- Refined `/runner/dashboard` card ordering and responsive action alignment:
  - moved `Upcoming Events` ahead of `Account` in the dashboard grid
  - kept the Account-card `View Profile` icon pinned to the upper right on tablet/mobile widths
  - corrected the Account-card hover tooltip so it renders inside the card instead of clipping or overflowing off the right edge
  - aligned the `View all registrations` CTA in `Progress Statistics` to the lower right, including explicit tablet/mobile breakpoint handling
- Scoped the changes to the runner dashboard surface only:
  - no shared card overflow rules were loosened globally
  - responsive overrides were kept local to the affected runner dashboard controls

### [UPDATED] UPDATED FILES (major):
1. docs/PRD.md
2. docs/CHANGELOG.md
3. src/views/runner/dashboard.ejs
4. src/public/css/runner-dashboard.css

### [VALIDATION] TEST/RUN CHECKS:
- Code-level responsive/CSS cascade review completed for:
  - Account card header/button alignment
  - Account tooltip placement and right-edge containment
  - Progress Statistics CTA alignment at desktop, tablet, mobile, and below-mobile breakpoints
- Live browser verification not run in this session

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
  - finalized mobile hamburger behavior so `Login` / `Sign Up` stay full-width like the other menu rows
  - restored the intended horizontal divider between main nav items and guest actions in the mobile overlay
  - confirmed via live browser inspection that the earlier auth-row misalignment came from the guest-action wrapper shrinking inside the panel
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

## CHANGELOG - April 25, 2026 (Session: Landing Page Acquisition Refresh)

### [SESSION] SESSION UPDATE:
- Reworked `/` to behave as an acquisition page instead of a runner-first utility surface:
  - primary hero CTA changed to `View Events`
  - secondary hero CTA changed to `Sign Up Free`
  - logged-in runner-only run-proof action reduced to a lighter inline action
- Replaced generic hero proof labels with live platform stats:
  - active events
  - approved finishes
  - approved organizers
- Added dynamic recent blog cards on the homepage for freshness and content discovery.
- Aligned landing-page button treatment with auth CTA styling:
  - squared `12px` corners
  - richer warm-orange primary buttons
  - warm-tinted secondary buttons instead of generic gray outlines
- Refined landing hero responsiveness:
  - desktop keeps the split layout with the right panel top-aligned
  - non-desktop widths collapse into a centered stacked hero
- Refined the main home-page explanation sections after the acquisition refresh:
  - `What helloRun does` now uses a compact editorial split layout with three product pillars
  - `Why helloRun` now mirrors that tighter layout instead of using the previous quote-box treatment
  - the audience section stayed as two cards, but was compacted, had centered CTAs restored, and now uses heading-level icons instead of generic label strips
- Polished the blog surface on `/`:
  - replaced the shared outline `Visit Blog` button with a dedicated compact CTA plus arrow icon
  - added fallback behavior so homepage blog cards use `/images/helloRun-icon.webp` when the cover image is missing or broken

### [UPDATED] UPDATED FILES (major):
1. src/controllers/page.controller.js
2. src/routes/pageRoutes.js
3. src/views/pages/home.ejs
4. src/public/css/helloRun.css
5. docs/sitetheme.md
6. docs/PRD.md
7. docs/CHANGELOG.md
8. docs/ui-ux-reference.md

### [VALIDATION] TEST/RUN CHECKS:
- `node -e "require('./src/controllers/page.controller'); require('./src/routes/pageRoutes'); console.log('ok')"` with temporary `RESEND_API_KEY` env override -> PASS
- `npm test` -> TIMEOUT in current environment

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
