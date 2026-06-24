# HelloRun — Full App Review & Improvement Backlog

**Reviewed:** June 24, 2026  
**Scope:** Security, UX/Workflows (runners, organisers, admin), Performance, Infrastructure, Technical Debt  
**Status:** Reference backlog — items to be picked up by priority in future sessions

---

## Overall Assessment

| Area | Grade | One-line verdict |
|------|-------|-----------------|
| Security | B+ | Good fundamentals; two real vulnerabilities to fix |
| Runner UX | B+ | Strong onboarding and dashboard; 3 high-value features missing |
| Organiser UX | C+ | Functional but high friction; no cloning, no action center |
| Admin UX | B | Operational tools are solid; metrics and bulk tools need work |
| Performance | B | Leaderboard cached; MongoDB pool and APM are gaps |
| Infrastructure | C+ | No error tracking in production; workers not crash-safe |
| Technical Debt | C | Two 5,000+ line files are a long-term maintenance risk |

---

## SECTION 1 — Security

### Critical (Fix Before Next Release)

#### SEC-1 · Organiser Can Approve Their Own Payment Proof
- **Severity:** Critical
- **Description:** An organiser who is also registered as a runner in their own event can approve their own payment proof. The payment approval handler checks that the organiser owns the event, but does not check whether the registration being approved belongs to the reviewing organiser.
- **Location:** `src/routes/organizer.routes.js` — payment approve route
- **Fix:** Add `if (String(registration.userId) === String(user._id)) return 403` before processing approval. One line.
- **Also:** Flag self-approvals in the audit log with a `[SELF-APPROVAL]` prefix even if not blocked.

#### SEC-2 · Password Reset Token Is Non-Atomic
- **Severity:** High
- **Description:** Password reset uses `findOne` then a separate `updateOne` to clear the token. Between the two round trips a concurrent request using the same token would succeed — the token is usable twice within the race window.
- **Location:** `src/routes/authRoutes.js` lines 812–883
- **Fix:** Replace `findOne` + `updateOne` with a single `findOneAndUpdate` that atomically fetches the user and clears the token.

### High

#### SEC-3 · Timing-System Webhook Has No Rate Limiting
- **Severity:** High
- **Description:** The timing system webhook validates HMAC-SHA256 signatures correctly, but has no rate limiting. A compromised webhook secret allows unlimited bulk result imports.
- **Location:** `src/routes/webhooks/timing-system.js`
- **Fix:** Add `createRateLimiter({ windowMs: 60000, maxRequests: 10 })` before the signature verification middleware.

### Medium

#### SEC-4 · Submission Rate Limit Is IP-Only
- **Severity:** Medium
- **Description:** `resultSubmissionLimiter` uses the default IP-based key. Runners on shared networks can be blocked by others; VPN users can bypass.
- **Location:** `src/routes/pageRoutes.js`
- **Fix:** Add `keyFn: (req) => \`result|${req.session?.userId}|${req.params.registrationId}\``

### What Is Already Correctly Handled ✓
- CSRF tokens on all state-changing POST routes
- Session cookies: `httpOnly`, `sameSite: lax`, `secure` in production
- Google OAuth with state token (10-minute expiry, single-use)
- ObjectId validation before every MongoDB query
- Rate limiting on login, signup, password reset, profile updates
- Webhook HMAC-SHA256 + 5-minute timestamp replay protection
- Audit trail on all admin governance actions
- Input sanitisation (string truncation, regex escape, schema enums)
- Submission metadata IDOR correctly protected in service layer ✓

---

## SECTION 2 — Runner UX

#### RUN-1 · No Public Runner Profile / Lifetime Stats Page [HIGH]
- Runners earn badges and certificates but have no shareable profile. No `/runners/:userId` page exists.
- **Scope:** Display name, avatar, lifetime distance, events completed, badges earned, certificate count.

#### RUN-2 · Cannot Contact an Organiser Directly [HIGH]
- Event detail page has no "Contact organiser" button. Runners must guess or abandon registration.
- **Scope:** Form on event detail page → email routed through HelloRun; organiser email not exposed.

#### RUN-3 · No Event Search by Date or Location [HIGH]
- Events page has type/distance/status filters but no temporal or geographic filters.
- **Scope:** Date range filter (start from / start to) + city/country text search.

#### RUN-4 · Rejected Proof Resubmission Path Is Multi-Step [MEDIUM]
- No direct "Resubmit" button from the dashboard rejection notice — requires 4-step navigation.
- **Scope:** Quick-action button on the rejection card linking to the submission detail.

#### RUN-5 · Strava Cannot Cross-Submit to Multiple Events [LOW]
- Screenshot proofs can target multiple events; Strava submissions cannot.
- Low priority — inherent Strava API limitation.

---

## SECTION 3 — Organiser UX

#### ORG-1 · No Event Cloning / Templating [HIGH]
- Every event requires the full 13-step wizard from scratch. Monthly series organisers re-enter everything.
- **Scope:** "Clone this event" on organiser event detail. Copies all settings except dates and registrations.

#### ORG-2 · No Pending Action Indicator on Organiser Dashboard [HIGH]
- Dashboard shows analytics but not "You have 12 payment proofs to review."
- **Contrast:** Admin dashboard has an Action Center. Organisers need the same.
- **Scope:** "Actions Needed" card showing pending payment proofs, run proofs, unpaid registrations with links.

#### ORG-3 · Cannot Message a Specific Runner [HIGH]
- Can only bulk email unpaid registrants. No way to contact individual runners about issues.
- **Scope:** "Message runner" button on registrant row → email via HelloRun → logged in audit trail.

#### ORG-4 · Registration Capacity Limits Are Not Enforced [HIGH]
- `slots` field exists on race categories in the Event model but registration flow never checks it.
- **Scope:** Block registration when `confirmed+paid count >= slots`. Show remaining slots on form.

#### ORG-5 · 13-Step Wizard Has No Save Confirmation [MEDIUM]
- No visible "Draft saved" feedback when navigating between steps.
- **Scope:** 3-second toast after step navigation.

#### ORG-6 · OCR/Validation Signal Labels Are Unexplained [MEDIUM]
- "OCR mismatch", "Suspicious flag" badges on proof review cards have no tooltip.
- **Scope:** `title` attributes or tooltip component explaining each signal.

---

## SECTION 4 — Admin UX

#### ADM-1 · Admin "Show All" Is Unbounded [MEDIUM]
- User list and event list "Show All" sets `limit: 0` in Mongoose — loads entire collection.
- **Location:** `src/controllers/admin.controller.js` listUsers; event list in organizer.routes.js
- **Fix:** Cap at 5,000 records. Show banner when truncated.

#### ADM-2 · No Bulk Admin Actions on Submissions [MEDIUM]
- Submissions can only be approved or rejected one-by-one from the admin view.
- **Scope:** Checkboxes + "Bulk Reject Selected" with shared reason field.

---

## SECTION 5 — Performance

#### PERF-1 · No Application Performance Monitoring (APM) [HIGH]
- Zero production error visibility. Errors go to stdout — lost in PM2/systemd/Docker.
- **Fix:** Integrate Sentry free tier. `@sentry/node` + `Sentry.init()` + error handler middleware. ~2 hours.

#### PERF-2 · No `process.on('unhandledRejection')` Handler [HIGH]
- Async errors in background workers that escape try/catch are silently swallowed.
- **Location:** `src/server.js`
- **Fix:**
  ```js
  process.on('unhandledRejection', (reason) => {
    logger.error('[UnhandledRejection]', { reason: reason?.message || reason });
  });
  process.on('uncaughtException', (error) => {
    logger.error('[UncaughtException]', { error: error.message });
    process.exit(1);
  });
  ```

#### PERF-3 · Mongoose Pool Uses Default 5 Connections [HIGH]
- `src/server.js` connects without `maxPoolSize`. Default is 5. Postgres was set to 25 — MongoDB was missed.
- **Fix:** Add `maxPoolSize: 20, minPoolSize: 5` to `mongoose.connect()`.

#### PERF-4 · No Request Timeout Middleware [MEDIUM]
- Long-running exports or aggregations hang indefinitely.
- **Fix:** `res.setTimeout(30000, ...)` middleware — one line.

#### PERF-5 · No Redis Health Check in `/readyz` [MEDIUM]
- `/readyz` checks MongoDB and Postgres but not Redis. Redis outage goes undetected.
- **Fix:** Add `PING` check; return degraded status rather than failing hard.

### Already Optimised ✓
- Redis leaderboard cache (60s TTL, invalidated on approval)
- Postgres pool: 25 connections, 8s query timeout
- Organiser dashboard: aggregate facets
- Rate limiters on all export and write endpoints
- Bounded pagination on all list endpoints

---

## SECTION 6 — Infrastructure & Observability

#### INFRA-1 · ~500 `console.*` Calls Bypass the Structured Logger [MEDIUM]
- Quick Wins pass converted the main paths; ~500 remain throughout controllers and services.
- **Fix:** Global `console.log → logger.info`, `console.error → logger.error` pass. ~1 day.

#### INFRA-2 · Static Assets Served Without Cache Headers [LOW]
- `express.static('public')` at defaults — browsers re-validate on every load.
- **Fix:** `express.static('public', { maxAge: '7d' })` — one line.

#### INFRA-3 · Background Workers Have No Crash-Safe Restart Logic [MEDIUM]
- `pg-sync-worker.js` and `communication-retry-worker.js` continue on errors but silently fail if the DB drops mid-batch.
- **Fix:** DB ping at loop start; wait 30s and retry on failure.

---

## SECTION 7 — Technical Debt

#### DEBT-1 · `admin.controller.js` Is 5,500+ Lines [MEDIUM]
- Every admin feature in one file. Hardest to navigate, test, and debug.
- **Refactor:** `admin-users.controller.js`, `admin-events.controller.js`, `admin-blog.controller.js`, etc.
- **Effort:** ~1 week.

#### DEBT-2 · `organizer.routes.js` Is 5,300+ Lines [MEDIUM]
- Routes and business logic mixed. Every organiser feature inline.
- **Refactor:** Extract to feature-scoped controllers.
- **Effort:** ~1 week.

#### DEBT-3 · `multer` on Legacy LTS Branch [LOW]
- `multer@1.4.5-lts.1` receives security patches only. Consider migrating on next dependency cycle.

---

## Prioritised Backlog

### P0 — Security (~2 hours total)
| ID | Task | Effort |
|----|------|--------|
| SEC-1 | Block organiser self-approval of own payment | 30 min |
| SEC-2 | Atomic password reset token | 1 hr |
| SEC-3 | Rate limit webhook endpoint | 30 min |

### P1 — Reliability & Observability (~1 day total)
| ID | Task | Effort |
|----|------|--------|
| PERF-2 | `unhandledRejection` + `uncaughtException` handlers | 30 min |
| PERF-1 | Integrate Sentry APM | 2 hrs |
| PERF-3 | Mongoose pool size (`maxPoolSize: 20`) | 15 min |
| ADM-1 | Cap admin "Show All" at 5,000 records | 1 hr |
| PERF-4 | Request timeout middleware (30s) | 15 min |

### P2 — Organiser UX (~1 week total)
| ID | Task | Effort |
|----|------|--------|
| ORG-4 | Enforce registration capacity (slots field) | 2–3 days |
| ORG-1 | Event cloning | 2–3 days |
| ORG-2 | Pending action center on organiser dashboard | 1–2 days |
| SEC-4 | Per-user submission rate limiting | 1 hr |

### P3 — Runner UX (~1 week total)
| ID | Task | Effort |
|----|------|--------|
| RUN-1 | Public runner profile page | 2–3 days |
| RUN-3 | Event search by date range and city | 1–2 days |
| RUN-2 | Contact organiser on event detail | 1–2 days |
| RUN-4 | "Resubmit" quick-action on rejection | 1 day |

### P4 — Organiser Quality of Life (~1 week total)
| ID | Task | Effort |
|----|------|--------|
| ORG-3 | Message specific runner | 2–3 days |
| ORG-5 | "Draft saved" toast in wizard | 1 day |
| ORG-6 | Tooltips on OCR/validation badges | 1 day |
| ADM-2 | Bulk reject submissions (admin) | 1–2 days |

### P5 — Infrastructure & Technical Debt (~3 weeks total)
| ID | Task | Effort |
|----|------|--------|
| INFRA-1 | Replace `console.*` with `logger` | 1 day |
| INFRA-2 | Static asset cache headers | 15 min |
| INFRA-3 | Worker crash-safe restart logic | 1 day |
| PERF-5 | Redis health check in `/readyz` | 1 hr |
| DEBT-1 | Split `admin.controller.js` | 1 week |
| DEBT-2 | Split `organizer.routes.js` | 1 week |

---

## Summary

| Priority | Items | Est. Effort |
|----------|-------|-------------|
| P0 Security | 3 | ~2 hours |
| P1 Reliability | 5 | ~1 day |
| P2 Organiser UX | 4 | ~1 week |
| P3 Runner UX | 4 | ~1 week |
| P4 Organiser quality | 4 | ~1 week |
| P5 Technical debt | 6 | ~3 weeks |
| **Total** | **26** | **~6–7 weeks** |
