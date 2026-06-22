# HelloRun — UX Improvement & Efficiency Plan

**Created:** June 22, 2026
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
