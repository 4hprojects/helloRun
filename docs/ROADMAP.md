# HelloRun — Full App Review & Roadmap

**Written:** June 22, 2026
**Based on:** Full codebase audit, user journey review, docs review, and security analysis

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
| `console.error` in `rate-limit.middleware.js` and `onsite-operations.js` — should use `logger.error` | Low | 30 min |
| Dead `notLive()` functions in shop controllers (never called after Phase 11) | Low | 10 min |
| Rate limiting missing on profile update and group creation/join endpoints | Low | 1–2 hrs |
| Some controllers return `error.message` directly in JSON — minor info leak risk | Low | 2–3 hrs |
| DB Priority 2 items (retry worker, query timeouts) not yet done | Medium | 3 days |

### Architecture Health
- **Sessions:** `connect-mongo` confirmed — multi-process deployment is safe
- **Postgres pool:** Raised to 25 connections — handles ~300–500 concurrent users
- **Sync failures:** Now logged to `sync_failure_log` — observable via `/healthz/sync`
- **Remaining risk:** No sync retry worker — failed syncs don't auto-recover

---

## User Journey Gaps Found in Audit

### Runner Experience
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

### Organiser Experience
| Gap | Impact | Notes |
|-----|--------|-------|
| No registrant messaging (bulk email) | High | Can't send "payment due tomorrow" reminders |
| Proof/payment review is one-by-one | High | No bulk approve/reject for obvious cases |
| No revenue visibility on dashboard | Medium | Can't see how much money events generated |
| No event templates or cloning | Medium | Every event built from scratch |
| No registration cap enforcement UI | Medium | Slot limits set but not enforced visibly |
| Organiser application has no progress tracker | Low | Unclear what's needed, what timeline to expect |
| No export for submissions/results | Medium | Can't download run results to CSV |

### Admin Experience
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
| P1 | Admin Governance (audit, notes, suspension, verify) | 2–3 weeks | 🔴 Critical | Safety |
| P2 | Onboarding flow | 1 week | 🔴 Critical | Retention |
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
