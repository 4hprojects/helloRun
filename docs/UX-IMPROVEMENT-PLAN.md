# HelloRun — UX Improvement & Efficiency Plan

**Created:** June 22, 2026
**Last updated:** July 17, 2026
**Based on:** Full codebase audit, user journey review, and session implementation history
**See also:** `docs/ROADMAP.md` (priority list), `docs/STATUS.md` (current state)

---

## 1. Executive Summary

HelloRun's core platform is production-ready. All primary flows work:
event creation, runner registration, payment proof, OCR submission, certificates,
badges, leaderboards, running groups, Strava integration, on-site operations,
shop (backend + UI), and admin governance.

**What's shipped (June 2026 session):**
- Phase 11 Shop complete (reports, exports, admin settings)
- DB Architecture Priority 1 (pool size, sync failure logging, `/healthz/sync`)
- Runner Experience UX (payment snapshot, price resolver, cert CTAs, mobile nav)
- Organiser Experience UX (reward validation, wizard phase bar, time-pending indicators)
- Badge system (profile bug fix, type-specific placeholders, upload, earned count)
- Admin Governance (audit trail, notes, verification actions, account suspension)

**What remains:** The backlog below is prioritized, estimated, and fully specified.
Nothing is blocked by a missing dependency.

---

## 1A. Public Landing Page UI/UX Audit and Roadmap

**Audit date:** July 17, 2026

**Status:** Phase 1 implementation started July 17, 2026; first foundation tranche complete.

**Audience strategy:** The approved hero is runner-first; organisers retain a
clear, role-specific conversion path in the audience section.

**Evidence reviewed:** Rendered homepage at 1440px and 390px widths, homepage EJS,
global and homepage CSS, progressive-enhancement JavaScript, homepage controller,
and existing homepage tests.

### Audit Summary

The homepage successfully exposes the core event, leaderboard, blog, and account
paths, and its mobile layout remains usable. The approved direction now uses a
runner-first hero while retaining an explicit organiser conversion path later in
the page. Several sections still repeat similar benefits without showing the two
workflows clearly. The page also has avoidable carousel, content-density, and
performance issues that make it harder to scan than necessary.

The findings below distinguish the **observed condition** from the **recommended
change**. Priorities reflect expected conversion or usability impact; effort is a
relative estimate for planning, not a delivery commitment.

### Prioritised Findings and Recommendations

| Area | Priority / effort | Observed condition | Recommended change | Expected outcome | Dependencies | Measurable acceptance criteria |
|---|---|---|---|---|---|---|
| Conversion and hierarchy | High / Medium | The approved hero prioritises runner event discovery; the organiser proposition becomes explicit in the audience section. | Keep the runner hero concise and ensure the organiser section has an equally unambiguous, role-specific destination. | Runners receive a direct first action while organisers can still identify their route without signup ambiguity. | Approved page messaging and role-prefilled signup. | The hero contains the approved `View Events` and `Sign Up Free` actions; the organiser audience card remains clearly labelled and links to organiser-prefilled signup. |
| Hero effectiveness | High / Medium | The hero explains several capabilities in one paragraph, leaves substantial unused visual space, offers limited product proof, and does not explain what “no GPS lock-in” means. | Tighten the promise, explain accepted proof flexibility in plain language, and add a lightweight product or activity visual plus one credible trust signal. | Faster comprehension and a stronger first impression without changing the brand identity. | Suitable existing or newly approved visual asset; verified trust data. | A five-second review identifies what HelloRun is, who it serves, and both next actions; the visual has meaningful alternative text when informative and does not cause layout shift. |
| Navigation | High / Medium | Desktop primary navigation is icon-only and depends on hover/focus tooltips, increasing recall effort and reducing first-visit clarity. | Use persistent text labels or a labelled icon-and-text hybrid for core public destinations; retain current active states, authenticated actions, and the mobile menu. | Faster navigation recognition for new and returning visitors. | Shared navigation affects all pages and roles, so changes require cross-page regression checks. | Home, Events, Blog, and Leaderboard are identifiable without hovering; current-page state remains visible; the menu works by mouse, touch, and keyboard at the 900px breakpoint. |
| Content repetition | High / Medium | “What HelloRun does” and “Why HelloRun” repeat flexibility, progress, and platform-lightweight messaging. | Consolidate them into one concise value section supported by a separate workflow section. Remove copy that does not add a new decision-relevant benefit. | Shorter page length, clearer narrative, and less cognitive repetition. | Final content hierarchy. | Every retained section has a unique purpose; no core benefit is explained in substantially similar language twice; heading order remains logical. |
| How-it-works clarity | High / Medium | The homepage does not show what happens after a runner joins or an organiser creates an event. Review, submission, payment, leaderboard, and certificate steps are only implied. | Add parallel, concise runner and organiser workflows with links to deeper guidance. | Visitors understand the service before committing to signup. | Existing `/how-it-works`, event, and organiser onboarding routes. | Both workflows show three to four ordered steps and an explicit next action; steps remain readable without JavaScript. |
| CTA clarity | High / Low | “Start Running” and “Create Events” both link to the same generic `/signup` page, with no visible indication that signup supports role selection. | Use audience-specific labels and role-aware destinations. If role-prefill is introduced, define a validated query contract such as `/signup?role=runner|organiser` with a safe generic fallback. | Reduced uncertainty and fewer unnecessary signup decisions. | Signup route/form support for an optional role-prefill interface. | Each CTA’s destination preserves its stated intent; invalid role values fall back safely; analytics can distinguish runner and organiser CTA selections. |
| Event carousel | High / Medium | Cards contain long descriptions and dense metadata; mobile controls overlay the card; page position is primarily visual; repeated links increase noise. | Shorten/clamp descriptions, establish a consistent metadata hierarchy, move mobile controls outside content, and announce carousel page/status changes accessibly. | Faster event comparison and more reliable touch/keyboard interaction. | Existing carousel settings and progressive-enhancement script. | Cards remain understandable with JavaScript disabled; controls are at least 44×44px; focus is visible; current page is exposed to assistive technology; long content does not create uneven or obscured controls. |
| Trust and proof | High / Medium | The controller computes active-event, approved-finish, and approved-organiser statistics, but `home.ejs` does not render `stats`. Verified results appear only when a leaderboard candidate exists. | Display verified, accurately labelled statistics or remove the unused controller work. Pair quantitative proof with organiser credibility and participant outcomes; keep graceful fallbacks. | Stronger credibility and removal of unused data/query work. | Product approval for public metrics and definitions; current database counts. | Every displayed metric has a clear label and source definition; zero values are handled honestly; if metrics are not approved, the unused queries and view input are removed and covered by tests. |
| Visual consistency and CSS ownership | High / Medium | Global `style.css` and homepage `helloRun.css` both define landing-page selectors. The global `.audience` rule sets a gradient via `background`, while the later homepage rule changes only `background-color`, leaving the gradient image active. | Give homepage styles explicit ownership, remove obsolete duplicate rules, and reset full background layers where needed. Prefer shared tokens for intentionally global primitives. | Predictable rendering and safer future maintenance. | Inventory of selectors shared by other public pages. | The audience section renders the intended background at all target widths; no homepage selector relies on accidental source order; visual regression checks show no unintended changes on other pages. |
| Accessibility | High / Medium | There is no homepage skip link/main target; custom card links, carousel controls, and dots do not have complete local `:focus-visible` coverage; carousel changes are not announced. | Add a skip link and main landmark target, comprehensive focus treatment, semantic labels, live carousel status, contrast checks, and adequate touch targets. | WCAG-aligned keyboard and assistive-technology access. | Shared layout/navigation changes and carousel script updates. | Keyboard users can skip navigation and reach every control in a logical order; no focus indicator is hidden; interactive targets meet 44×44px where practical; normal text meets 4.5:1 contrast and large text 3:1; reduced-motion preference is respected. |
| Mobile UX | High / Medium | Mobile is functional but produces a long first-session scroll, text-heavy event cards, tightly stacked sections, and overlaid carousel arrows. | Reduce above-the-fold copy, tighten repeated sections, simplify cards, improve spacing rhythm, and keep important CTAs full-width or comfortably tappable. | Better scanning and less fatigue on common phone widths. | Content consolidation and carousel changes. | At 390px there is no horizontal page overflow; controls do not cover text or images; body copy remains at least 16px where feasible; primary actions are reachable and visibly distinct. |
| Performance and layout stability | Medium / Medium | Homepage event and blog images omit intrinsic `width`/`height` and responsive sources; Lucide loads from a third-party `latest` URL; lazy loading exists but resource priority is not explicit. | Add intrinsic dimensions/aspect-ratio protection, responsive image candidates where supported, explicit priority for only true above-the-fold media, and review pinning or self-hosting the icon script. | Lower layout shift and more predictable loading on slower connections. | Image transformation/source capabilities and asset hosting decision. | Images reserve space before loading; no below-the-fold image is eagerly prioritised; the icon dependency is version-pinned or self-hosted; performance checks record no new regression in LCP or CLS. |
| Footer information architecture | Medium / Low | The required legal/resource links form a long, dense list, particularly on mobile. | Group links under clearer categories and use a mobile-friendly stacked or disclosure treatment while retaining all destinations in the HTML. | Faster scanning without reducing compliance visibility. | Confirmation of which links must remain globally visible. | Every current legal link remains present and keyboard accessible; groups have descriptive headings; the 390px layout does not create cramped two-column labels. |
| Resilience and empty states | Medium / Low | Featured events and blog sections disappear when empty, while the leaderboard silently falls back to a text-only hero. The page does not explain these states or offer equivalent next steps. | Define purposeful server-rendered fallbacks for no events, no posts, and no leaderboard; do not render empty carousel controls. | The page remains coherent and actionable during new deployments, outages, or sparse content periods. | Existing controller fallbacks and content policy. | Each dynamic section has a tested populated and empty state; empty states include a relevant action where one exists; failure of optional content does not fail the homepage. |

### Phased Landing-Page Roadmap

#### Implementation Progress — July 17, 2026

- Implemented the approved runner-focused hero copy and direct `View Events` and
  `Sign Up Free` actions while preserving the optional homepage leaderboard.
- Added allowlisted `runner`/`organiser` signup role-prefill URLs and matching
  signup messaging; invalid values safely retain the generic signup state.
- Replaced icon-only presentation for the four core desktop public navigation
  destinations with persistent icon-and-text labels, retaining active and mobile
  menu behaviour.
- Added homepage skip navigation, an addressable main landmark, broader visible
  focus coverage, 44px carousel pagination/control targets, and a polite carousel
  page-status announcement.
- Fixed the `.audience` cascade conflict by resetting the complete background in
  homepage CSS rather than only its background colour.
- Redesigned the audience section using the login page's unified split-panel
  language: an immersive runner brand panel paired with a clean organiser panel,
  vertical capability rows, and inverse full-width conversion actions.
- Replaced the visually competing returning-runner button with a lower-emphasis,
  accessible registration shortcut beneath the primary hero actions.
- Balanced the closing signup and event-discovery actions with equal dimensions,
  consistent typography, and complementary filled/outlined colour treatments.
- Added focused source regression coverage and manually rendered the page at
  390px and 1440px. Remaining Phase 1 work is wider cross-page regression and
  accessibility verification before declaring the phase complete.

#### Phase 1 — High-Impact Foundations

- Finalise the approved runner-first hero and the distinct organiser CTA map.
- Improve labelled desktop navigation while preserving role-aware navigation and
  mobile behaviour.
- Add the skip link, main target, baseline focus styles, touch-target rules, and
  reduced-motion coverage.
- Resolve homepage/global CSS ownership, including the `.audience` background
  conflict.

**Phase completion:** Runner and organiser journeys are clear and usable at
390px, 768px, 1024px, and 1440px; keyboard navigation is complete; the intended visual style
does not depend on cascade accidents; existing authenticated navigation remains
unchanged in capability.

#### Phase 2 — Content and Conversion

- Replace repetitive benefits with a concise value narrative and parallel runner
  and organiser workflows.
- Clarify proof flexibility and what happens after registration or event creation.
- Surface approved trust metrics and verified outcomes, or remove unused `stats`
  controller work if public display is rejected.
- Add role-aware signup intent and distinct conversion analytics events.

**Phase completion:** Copy has no material repetition; both workflows are
understandable without JavaScript; every CTA has one clear audience and expected
destination; metric labels and definitions are approved and testable.

#### Phase 3 — Discovery Components

- Simplify event cards and redesign carousel controls/status for responsive,
  keyboard, touch, and assistive-technology use.
- Reduce blog-card density and ensure cards have a consistent reading hierarchy.
- Add server-rendered empty states for events, posts, and leaderboard content.
- Reorganise footer resources without removing required links.

**Phase completion:** Dynamic sections work in populated, empty, error-fallback,
and JavaScript-disabled states; mobile controls never obscure content; footer and
cards remain scannable at all target widths.

#### Phase 4 — Polish and Optimisation

- Add intrinsic/responsive image handling and audit above-the-fold priorities.
- Pin or self-host the icon dependency where feasible.
- Refine motion and interaction feedback under normal and reduced-motion modes.
- Measure audience-path CTA use and validate conversion changes after release.

**Phase completion:** No material LCP or CLS regression; reduced-motion checks
pass; event instrumentation distinguishes runner and organiser paths without
collecting unnecessary personal data; post-release results can be compared with
the pre-change baseline.

### Interfaces and Compatibility Guardrails

- Preserve server-rendered EJS and progressive enhancement. Core navigation,
  content, and CTAs must remain useful without client-side JavaScript.
- Preserve existing homepage inputs: `featuredEvents`, `carouselSettings`,
  `homeLeaderboard`, `recentPosts`, authentication/role locals, and `stats` until
  the trust-metric decision is implemented.
- No database or public API change is required by the audit. A future optional
  role-prefill contract must accept only `runner` or `organiser`, preserve posted
  form data, and fall back to unselected signup for missing or invalid values.
- Preserve all existing public, authenticated, organiser, and admin navigation
  destinations when changing the shared navigation presentation.

### Validation Plan for Future Implementation

- Perform visual and interaction checks at approximately 390px, 768px, 1024px,
  and 1440px, including long event titles/descriptions and slow or failed images.
- Complete a keyboard-only pass covering skip navigation, menus, CTAs, carousel,
  cards, footer links, and back-to-top behaviour.
- Verify screen-reader names, heading order, landmark structure, carousel status,
  contrast, touch-target sizing, and `prefers-reduced-motion` behaviour.
- Exercise populated and empty variants for featured events, recent posts, and
  homepage leaderboard, plus guest and authenticated navigation states.
- Extend source/integration coverage for homepage rendering, role-prefilled
  signup if introduced, carousel state, empty fallbacks, and removal or display
  of `stats`. Supplement automated coverage with manual responsive and
  accessibility checks.

### Assumptions

- This document remains the single source for the landing-page audit and roadmap;
  no separate audit file is created.
- The audit was recorded before implementation. Phase 1 work began on July 17,
  2026; later roadmap phases remain unstarted.
- Future changes continue the current HelloRun identity rather than introducing a
  new brand system.
- Runner event discovery is the primary hero conversion goal. Organiser
  acquisition remains a required, explicit secondary journey with preserved
  role intent.

---

## 2. Runner Experience Improvements

### 2.1 Onboarding (P2 — High Priority)

**Problem:** New users sign up and land on the homepage with no guided next step.
No welcome email, no profile completion prompt, no "what to do first" guidance.
This is the single largest retention risk — users who don't know what to do on
day 1 don't return.

**What to build:**
- First-login detection: `req.session.firstLogin = true` set by signup handler
- Dashboard welcome banner (dismissed on click, stored in session):
  "Welcome to HelloRun! Complete your profile → Browse events → Register for your first event"
- Profile completeness prompt: if `completenessScore < 60%`, show a persistent
  nudge in the dashboard header with a "Complete Profile" CTA
- Welcome email: trigger `communicationService.notify('account.welcome', ...)` on
  user creation — sends within 5 minutes of signup with 3 clear next steps
- Empty-state CTAs: dashboard sections (registrations, submissions, badges) show
  actionable empty states ("No events yet — Browse Events →") instead of blank

**Files:** `src/routes/authRoutes.js` (signup handler), `src/views/runner/dashboard.ejs`,
`src/services/communication.service.js`, communication events registry

**Effort:** 1 week | **Impact:** 🔴 Critical — day-1 retention

---

### 2.2 Personal Leaderboard Ranking (P4 — Quick Win)

**Problem:** Runners see the leaderboard but can't find their own position.
No "You are #42 of 156 runners" shown anywhere.

**What to build:**
- In the leaderboard route, after fetching rankings, find the logged-in runner's
  position: `rankings.findIndex(r => r.mongoUserId === req.session.userId) + 1`
- Pass `myRank` and `myEntry` to the leaderboard view
- In `src/views/pages/event-leaderboard.ejs`: add a highlighted "Your Ranking"
  card above the main table when `myRank > 0`

**Files:** Leaderboard route in `src/routes/pageRoutes.js` or event routes,
`src/views/pages/event-leaderboard.ejs`

**Effort:** 2–3 hours | **Impact:** 🟠 High — every competitive runner wants this

---

### 2.3 Certificate & Badge Social Sharing (P5)

**Problem:** Certificates and badges can't be shared to social media. Public verify
pages exist but have no Open Graph tags — sharing produces generic previews.

**What to build:**
- Add OG meta tags to `src/views/pages/badge-verification.ejs`:
  - `og:title` = "{BadgeName} — Verified HelloRun Badge"
  - `og:description` = "Earned by {RunnerName} on {Date}"
  - `og:image` = `badge.imageUrl` or `/images/hellorun-badge-default.png`
- Same treatment for the certificate verification page
- "Share" button on both pages: Web Share API on mobile, clipboard fallback on
  desktop, with a brief "Link copied!" toast
- On runner profile badge cards (`profile.ejs`): improve existing "Share" link
  (currently a plain external-link icon) with clipboard copy + Web Share

**Files:** `src/views/pages/badge-verification.ejs`, certificate verify view,
`src/views/runner/profile.ejs`

**Effort:** 3 days | **Impact:** 🟠 High — shareable achievements drive organic discovery

---

### 2.4 Proof Rejection Guidance + Edit Capability (P6)

**Problem:** When a submission is rejected, runners see the reason but no guidance
on how to fix it. They also can't correct metadata (wrong distance entered)
without fully resubmitting from scratch.

**What to build:**
- Rejection guidance block on `src/views/runner/submission-detail.ejs`:
  when `status === 'rejected'`, show a collapsible "How to fix this" section
  mapped to common rejection reasons:
  - Screenshot unclear → tip on screenshot quality
  - Distance mismatch → tip on GPS accuracy
  - Wrong date → tip on correct date format
- Metadata edit route: `PATCH /runner/submissions/:id/metadata` — allows editing
  `distanceKm`, `elapsedMs`, `runDate` on rejected submissions only; resets
  status to 'submitted' and increments `submissionCount`
- Inline edit form on submission detail for rejected entries

**Files:** `src/views/runner/submission-detail.ejs`, runner routes,
`src/services/submission.service.js` (new `editRejectedSubmission`)

**Effort:** 1 week | **Impact:** 🟠 High — reduces resubmit friction

---

### 2.5 Email Notification Settings UI (P8)

**Problem:** `CommunicationSetting` and `CommunicationEventSetting` MongoDB models
exist and track preferences, but there's no UI for runners to control which emails
they receive. Without this, frustrated runners unsubscribe from everything.

**What to build:**
- New section on runner profile (`/runner/profile#notifications`): list of
  notification toggles (payment reminders, submission status, badge earned,
  event reminders, certificate ready)
- `GET /runner/profile/notifications` — load current settings
- `PATCH /runner/profile/notifications` — update preferences (JSON body)
- Each toggle updates the corresponding `CommunicationEventSetting` document

**Files:** `src/views/runner/profile.ejs`, `src/routes/runner.routes.js`,
`src/services/communication.service.js` (existing setting read/write patterns)

**Effort:** 3 days | **Impact:** 🟡 Medium — prevents blanket unsubscribes

---

### 2.6 Profile Picture Upload (P9 — Quick Win)

**Problem:** Every runner profile shows a default icon. No avatar upload facility.

**What to build:**
- Check `avatarUrl` vs `profileImageUrl` usage in views — consolidate to one field
- Upload route: `POST /runner/profile/avatar` — uses existing `uploadBufferToR2`
  with category `profile-images/`, saves URL to user
- Profile page: circular avatar display + "Change Photo" overlay button
- Show avatar in nav greeting and public badge collection page

**Files:** `src/models/User.js`, `src/routes/runner.routes.js`,
`src/views/runner/profile.ejs`, `src/views/layouts/nav.ejs`,
`src/services/upload.service.js` (add `uploadBadgeImage`-style middleware)

**Effort:** 3–4 hours | **Impact:** 🟡 Medium — perceived polish, community feel

---

### 2.7 Event Wishlist / Favorites (P10)

**Problem:** Runners can't save events to return to later. Without this, runners
who were considering an event lose track of it.

**What to build:**
- Add `savedEvents: [ObjectId]` array to User model (refs to Event)
- Toggle route: `POST /events/:slug/save` — adds/removes, returns `{ saved: bool }` JSON
- Heart/bookmark icon on event cards and event detail page — JS toggle, highlights if saved
- "Saved Events" section on runner dashboard (below upcoming events)

**Files:** `src/models/User.js`, `src/routes/pageRoutes.js`,
`src/views/pages/events.ejs`, `src/views/pages/event-details.ejs`,
`src/views/runner/dashboard.ejs`

**Effort:** 3 days | **Impact:** 🟡 Medium — discovery, return visits

---

## 3. Organiser Experience Improvements

### 3.1 Bulk Review Actions (P7)

**Problem:** Organisers review payment proofs and run submissions one by one.
No bulk approve/reject. For events with 50+ registrants, this is hours of manual work.

**What to build:**

**Payment proofs — bulk action:**
- Add checkboxes to payment proof review cards
- `POST /organizer/events/:id/payment-reviews/bulk` — accepts array of registration
  IDs + action (approve/reject) + shared reason; processes each via existing
  payment review service
- Returns `{ approved: N, rejected: N }` count

**Submissions — bulk action:**
- Add checkboxes to submissions hub cards
- `POST /organizer/submissions/bulk` — accepts array of submission IDs + action
- Each approval triggers existing `reviewSubmission()` which handles badge
  evaluation and certificate generation

**Bulk registrant email:**
- "Email All Unpaid" button on registrants page: compose modal pre-filled with
  "Your payment for {Event} is due", sends via `communicationService.notify()`
  to filtered registrants

**Files:** `src/views/organizer/payment-proof-review.ejs`,
`src/views/organizer/submissions.ejs`, `src/routes/organizer.routes.js`,
`src/services/submission.service.js`

**Effort:** 1 week | **Impact:** 🟠 High — hours saved per event

---

### 3.2 Registration Cap Enforcement UI

**Problem:** Slot limits can be set on race categories but there's no visible
indicator of slots used vs. remaining in the organiser workspace.

**What to build:**
- In the organiser event workspace, for each race category: show
  `{registered} / {slots} slots filled` with a mini progress bar
- Warning badge when category is >80% full
- Visible on both event detail (`/organizer/events/:id`) and registrant list

**Files:** `src/views/organizer/event-details.ejs`,
`src/views/organizer/event-registrants.ejs`,
organiser dashboard route (add category slot counts to event detail data)

**Effort:** 2 days | **Impact:** 🟡 Medium — avoids overselling

---

### 3.3 Event Cloning

**Problem:** Organisers build every event from scratch. Annual and recurring events
require re-entering identical data every cycle.

**What to build:**
- Clone route: `POST /organizer/events/:id/clone` — creates a new `Event` document
  copying: title (append " (Copy)"), type, distances, categories, rewards,
  pricing config, waiver, virtual rules, proof types
  Resets: status → draft, dates → null, slug → new unique value
- "Clone Event" button on event detail page with confirmation modal
- Redirect to edit page for the cloned event

**Files:** `src/routes/organizer.routes.js`, `src/views/organizer/event-details.ejs`

**Effort:** 3 days | **Impact:** 🟡 Medium — huge time saver for recurring organisers

---

### 3.4 Revenue Dashboard for Organisers

**Problem:** Organisers have no visibility into revenue generated by their events.
Only raw registration counts are shown.

**What to build:**
- Add revenue section to organiser dashboard: total fees collected (sum of
  `paymentAmountDue` for paid registrations), per-event breakdown
  via `Registration.aggregate([{ $group: { _id: '$eventId', total: { $sum: '$paymentAmountDue' } } }])`
- Shop revenue from Postgres via `orderService.listOrdersByMongoEventId()`
- Combined summary card on organiser dashboard

**Files:** `src/routes/organizer.routes.js` (dashboard route),
`src/views/organizer/dashboard.ejs`

**Effort:** 2 days | **Impact:** 🟡 Medium — organiser trust and financial visibility

---

## 4. Admin Experience Improvements

### 4.1 Platform Analytics Dashboard (P15)

**Problem:** Admins have no visibility into platform health. No "total runners,"
"registration trends," "approval rates," or revenue figures in one place.

**What to build:**
- New page: `GET /admin/analytics` with:
  - Registrations by month (MongoDB `$group` by `createdAt` month)
  - Submission approval rate (approved / total, per event)
  - Average time-to-review: payment proofs and run submissions
  - Top events by registrations and approvals
  - Shop revenue summary (Postgres `orders` aggregate)
  - Active user count (users with registration in last 30 days)
- Link from admin dashboard "Shortcuts" section

**Files:** New `src/views/admin/analytics.ejs`, `src/routes/admin.routes.js`,
`src/controllers/admin.controller.js`

**Effort:** 1 week | **Impact:** 🟡 Medium — platform health visibility

---

### 4.2 Bulk Admin Review Actions

**Problem:** Admins review payment receipts and submissions one by one.

**What to build:**
- Same pattern as organiser bulk actions (P7), admin-scoped:
  `POST /admin/reviews/bulk` — approve/reject multiple items across all events
- "Select All Pending" checkbox on existing admin review queues

**Files:** `src/routes/admin.routes.js`, `src/views/admin/dashboard.ejs`

**Effort:** 3 days | **Dependency:** Build after P7 (same pattern)

---

## 5. Platform Efficiency Improvements

### 5.1 DB Architecture Priority 2 (P3)

**Problem:** Failed MongoDB→Postgres syncs are now logged (`sync_failure_log`),
but not automatically retried. Under load, failures accumulate silently.

**What to build:**

**Sync retry worker** (`src/workers/pg-sync-worker.js`):
- Polls `sync_failure_log` WHERE `resolved_at IS NULL` every 60 seconds
- Retries the appropriate sync function per `sync_type`
  (event → `syncEventShadow`, registration → `syncRegistrationPaymentShadow`, etc.)
- On success: sets `resolved_at = now()`
- After 3 retries: marks entry as dead-letter in `notes`
- Started in `src/server.js` after DB connections are established

**Migration 020** (`src/db/migrations/020_sync_failure_retry_count.sql`):
```sql
ALTER TABLE sync_failure_log ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
```

**Postgres query timeouts:**
- In `src/db/postgres.js`: add `statement_timeout: 8000` to client config
- Prevents slow queries from holding connections indefinitely

**Files:** New `src/workers/pg-sync-worker.js`, `src/db/postgres.js`,
`src/server.js`, migration 020

**Effort:** 3 days | **Impact:** 🟠 High — data consistency under load

---

### 5.2 AdSense Deployment (P13 — Ops Only, Zero Code)

All 8 phases of AdSense readiness are implemented (PR #10). Deployment steps:

1. Confirm current `main` is deployed to production
2. Seed the 10 guide blog posts in the production database
3. Verify `/robots.txt` and `/sitemap.xml` are publicly reachable
4. Submit/refresh sitemap in Google Search Console
5. Wait 2–4 weeks for crawl, then re-request AdSense review

**Effort:** ~1 hour operational | **Impact:** 🟠 High — revenue unlock

---

### 5.3 Blog Scheduled Publishing (P12)

**Problem:** Blog posts can only be published immediately. No way to schedule
a post for a future date.

**What to build:**
- Add `scheduledAt: Date` field to Blog model
- Update blog editor: "Schedule" option with datetime picker alongside
  "Submit for Review"
- New status: `'scheduled'` — admin-approved posts with a future `scheduledAt`
- Background worker (extend pg-sync-worker or add new): every 5 minutes, find
  blogs WHERE `status = 'scheduled' AND scheduledAt <= now()`, publish them

**Files:** `src/models/Blog.js`, blog admin/editor views,
`src/workers/pg-sync-worker.js` (extend)

**Effort:** 2 days | **Impact:** 🟡 Medium — content planning for blog team

---

### 5.4 Related Events / Recommendations (P14)

**Problem:** Event detail page has no "you might also like" section. Users who
finish reading one event have no next step to discover more.

**What to build:**
- At bottom of `src/views/pages/event-details.ejs`: "Similar Events" section (3 cards)
- Query logic (priority order):
  1. Same organiser's other published open events
  2. Events with matching race distances
  3. Upcoming events with open registration (fallback)
- Exclude the current event; cap at 3 results

**Files:** `src/routes/pageRoutes.js` (event detail route),
`src/views/pages/event-details.ejs`

**Effort:** 3 days | **Impact:** 🟡 Medium — discovery, time-on-site

---

### 5.5 Rate Limiting Gaps (Technical Debt — Quick Fix)

**Problem:** Profile update and group creation/join endpoints have no rate limiting.

**What to build:**
- `profileUpdateLimiter` (10 req/min per session) on:
  `POST /runner/profile`, `PATCH /runner/profile/*`
- `groupActionLimiter` (5 req/min) on group create/join routes
- Follow existing `createRateLimiter()` pattern in `src/middleware/rate-limit.middleware.js`

**Effort:** 1 hour | **Impact:** 🟢 Low — security hardening

---

### 5.6 Console.error → Logger Migration (Technical Debt)

**Problem:** `src/middleware/rate-limit.middleware.js` (line 51) and
`src/routes/organiser/onsite-operations.js` (8 instances) use `console.error`
instead of `logger.error` from `src/utils/logger.js`. Reduces log aggregation quality.

**What to build:** Replace all `console.error` in those two files with `logger.error`.

**Effort:** 30 minutes | **Impact:** 🟢 Low — observability

---

## 6. Quick Wins Table

Items completable in under 1 day with high visible value:

| Item | File(s) | Effort |
|------|---------|--------|
| Personal leaderboard ranking ("You are #42") | leaderboard route + view | 2–3 hrs |
| Profile picture upload | User model, runner routes, profile.ejs | 3–4 hrs |
| OG tags on badge + certificate verify pages | badge-verification.ejs, cert view | 2 hrs |
| AdSense deployment checklist | Ops only — no code | 1 hr |
| Rate limiting on profile/group endpoints | rate-limit middleware, routes | 1 hr |
| `console.error` → `logger.error` migration | rate-limit.middleware, onsite-ops | 30 min |

---

## 7. Prioritized Backlog

| # | Feature | Category | Effort | Impact | Status |
|---|---------|----------|--------|--------|--------|
| P2 | Onboarding flow | Runner UX | 1 week | 🔴 Critical | Not started |
| P3 | DB Architecture Priority 2 (retry worker, timeouts) | Technical | 3 days | 🟠 High | Not started |
| P4 | Personal leaderboard ranking | Runner UX | 2–3 hrs | 🟠 High | Not started |
| P5 | Certificate & badge social sharing | Runner UX | 3 days | 🟠 High | Not started |
| P6 | Proof rejection guidance + edit | Runner UX | 1 week | 🟠 High | Not started |
| P7 | Bulk organiser actions | Organiser UX | 1 week | 🟠 High | Not started |
| P8 | Email notification settings UI | Runner UX | 3 days | 🟡 Medium | Not started |
| P9 | Profile picture upload | Runner UX | 3–4 hrs | 🟡 Medium | Not started |
| P10 | Event wishlist / favorites | Runner UX | 3 days | 🟡 Medium | Not started |
| P11 | Admin user management UI | Admin UX | — | ✅ Done | Complete (governance) |
| P12 | Blog scheduled publishing | Blog | 2 days | 🟡 Medium | Not started |
| P13 | AdSense deployment | Revenue | 1 hr ops | 🟠 High | Not started (ops only) |
| P14 | Related events / recommendations | Discovery | 3 days | 🟡 Medium | Not started |
| P15 | Platform analytics for admins | Admin UX | 1 week | 🟡 Medium | Not started |
| — | Registration cap enforcement UI | Organiser UX | 2 days | 🟡 Medium | Not started |
| — | Event cloning | Organiser UX | 3 days | 🟡 Medium | Not started |
| — | Revenue dashboard for organisers | Organiser UX | 2 days | 🟡 Medium | Not started |
| — | Bulk admin review actions | Admin UX | 3 days | 🟡 Medium | Not started |
| — | Rate limiting gaps | Technical | 1 hr | 🟢 Low | Not started |
| — | `console.error` → `logger.error` | Technical | 30 min | 🟢 Low | Not started |

---

## 8. Implementation Notes

### Reusable Patterns (avoid reinventing)

**R2 file upload:**
```js
uploadService.uploadBufferToR2({ userId, buffer, contentType, category, fileName })
```
Used for: badge images ✅, event gallery ✅. Reuse for profile pictures, any future uploads.
Just change the `category` string — everything else is the same.

**Rate limiting:**
```js
createRateLimiter({ windowMs, maxRequests, message, keyFn })
// src/middleware/rate-limit.middleware.js
```
Supports Redis with in-memory fallback. `keyFn` defaults to `path|session|ip`.

**Audit logging:**
```js
recordCriticalAuditEventInBackground({ action, targetType, targetId, statusFrom, statusTo, notes, actorMongoUserId, ipAddress, userAgent })
// src/services/critical-audit.service.js
```
Use for any admin or system action. Writes to Postgres `audit_critical` table.

**Background sync pattern:**
```js
someAsyncFn().catch((error) => {
  logger.error('Sync failed:', { ... });
  recordSyncFailureInBackground('sync_type', entityId, error, { context });
});
```

**Communication/email:**
```js
communicationService.notify(eventKey, { email: { to, firstName, ... }, notification: { userId, message, ... } })
```
Register new event keys in `src/services/communication-events.registry.js`.

**CSV/XLSX export:** Follow the ExcelJS pattern in `src/routes/organizer.routes.js`
lines 2044–2163 (registrant export). Reuse for any new tabular export.

---

### Dependency Map

```
P2  (Onboarding)          → No dependencies
P3  (DB Priority 2)       → Requires sync_failure_log table ✅ (done)
P4  (Leaderboard rank)    → No dependencies
P5  (Social sharing)      → No dependencies
P6  (Proof edit)          → Reuses submission.service.js review pattern
P7  (Bulk organiser)      → Reuses submission.service.reviewSubmission() ✅
P8  (Email settings)      → CommunicationSetting model ✅ exists
P9  (Profile picture)     → uploadService.uploadBufferToR2 ✅ exists
P10 (Wishlist)            → No dependencies
P12 (Blog schedule)       → Blog model + can share worker with P3
P14 (Related events)      → Event.find() pattern ✅ already used
P15 (Admin analytics)     → Postgres aggregate queries + MongoDB $group
Bulk admin (4.2)          → Build after P7 (same pattern, different scope)
```

---

### Testing Strategy

| Change type | Test approach |
|-------------|--------------|
| New service function | Unit test in isolation (follow `event-reward-pricing-validation.unit.test.js`) |
| New routes | Integration test (follow `admin-governance.integration.test.js` spawn + fetch pattern) |
| CSS-only changes | No automated test needed |
| OG tag additions | No automated test; verify manually with social share debugger |
| Workers / cron | Unit test the worker logic; integration test via DB state check |
| View-only copy changes | No test needed |

---

## 9. Out of Scope (Long-Term / Future)

Major architecture changes or low-priority at current scale:

- **Integrated payment gateway** (Stripe/PayPal) — replaces manual receipt upload;
  requires full refactor of registration + payment flow; high effort, high reward
- **Mobile app** (React Native / Expo) — unlocks push notifications, GPS tracking,
  offline mode; separate project entirely
- **GPS / device tracking** beyond Strava (Garmin Connect, Apple Health, Google Fit)
- **Video proof submissions** — requires transcoding pipeline (FFmpeg, cloud media)
- **Automated proof approval rules engine** — ML/heuristic for obvious Strava/GPS proofs
- **Community event reviews** — organiser reputation/rating system; moderation overhead
- **Email template editor** — admin-editable transactional email HTML
- **In-app push notifications** — requires service worker + user permission flow
- **Multi-language / i18n** — full internationalisation

---

*Maintained by the HelloRun development team. Update the Status column as items are
completed. Cross-reference `docs/STATUS.md` for build timestamps and test counts,
and `docs/ROADMAP.md` for the condensed priority list.*
