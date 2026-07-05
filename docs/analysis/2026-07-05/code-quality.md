# Code Quality, Tech Debt & Refactoring — Full Codebase Analysis (July 5, 2026)

**Scope:** duplication, dead code, oversized files, inconsistent patterns, and concrete refactoring recommendations in priority order.

The codebase is, overall, in good shape: consistent service/controller/route layering, thorough inline comments on the risky bits (the purge services are exemplary), broad test presence, and a clean dependency tree. The items below are the highest-leverage cleanups, not alarms.

---

## Refactoring recommendations (priority order)

### CQ-1 · Fix the `<%-` vs `<%=` template-hygiene pattern (also closes SEC-A/SEC-B)
- **Where:** `src/views/admin/blog-review.ejs`, `src/views/blog/author-form.ejs`, plus a sweep of the other 41 non-`include` `<%-` sites flagged in Pass 1.
- **Problem:** `<%-` (unescaped) is being used for plain-text scalar fields that should be `<%=` (escaped). This is both the root cause of the stored-XSS finding and a systemic correctness/readability issue — a reader can't tell intended-raw-HTML from an accidental raw emit.
- **Action:** Reserve `<%-` for values that are *deliberately* pre-sanitised HTML (`contentHtml`, `policyHtml`, `eventDetailsHtml`, `waiverHtml`, `safeJson(...)`). Everything else → `<%=`. Add a short convention note to `docs/` so it doesn't regress. **Do this first** — it's the one quality issue with a security consequence.

### CQ-2 · Split the three oversized files
- **`src/controllers/page.controller.js` — 3,564 lines.** This is the single biggest file and mixes home, events, registration, submissions, public profiles, badges, blog-public, policy, sitemap, and leaderboard concerns. Split by concern into `page/` sub-controllers behind a barrel, mirroring the admin-controller split that already worked well (`src/controllers/admin/_shared.js` + sub-controllers).
- **`src/controllers/blog.controller.js` — 2,583 lines.** Separate public rendering, author authoring/autosave, admin moderation, and the RSS feed into sub-modules.
- **`src/services/submission.service.js` — 2,111 lines.** Factor the OCR/plausibility-check logic and the accumulated-challenge logic into their own service modules; keep `submission.service.js` as the orchestrator.
- **Why:** these three are the files most likely to hide the *next* bug (the June review already found live bugs when splitting `admin.controller.js`). Follow the proven barrel + `_shared.js` pattern.

### CQ-3 · Unify the organiser route auth pattern
- **Where:** `src/routes/organiser/review.js`, `event-management.js`, `registrants.js` vs. the existing `src/routes/organiser/event-route-protection.js`.
- **Problem:** A clean, reusable middleware chain already exists — `protectEventMutation = [requireAuth, requireCsrfProtection, requireOrganizerEventAccess]` — but most organiser handlers instead do `requireAuth` at the router level and then re-implement role + event-ownership checks *inside* each handler (`canAccessRegistrantReview`, `getRegistrantAccessibleEventOrNull`). The in-handler checks are correct, but it's ~1,300 lines of `review.js` repeating a pattern the middleware would express once.
- **Action:** Migrate handlers to the `protectEventRead` / `protectEventMutation` chains where the access model matches; keep bespoke checks only where the "admin may also access" or "registrant-scoped" logic genuinely differs. Reduces duplication and shrinks the attack surface for a missed check.

### CQ-4 · Remove dead code
- **`src/config/db.js`** (`connectDB`) — no `require` sites anywhere; `server.js` has its own `connectToDatabase()`. Delete it. (Left over after the connection logic moved into `server.js`.)
- Cross-check any other `docs/`-referenced "deleted" modules haven't left dangling requires (the June session already removed the admin `onsite-operations.js`; the organiser one at `src/routes/organiser/onsite-operations.js` **is** live via the barrel — keep it).

### CQ-5 · Reduce `process.env` sprawl in services
- **Where:** 132 direct `process.env.*` reads across `src/services`.
- **Problem:** Config is read ad-hoc deep in the call graph (e.g. `PASSWORD_RESET_EXPIRY`, upload limits, R2 keys, feature toggles), which is exactly how COR-C (silent NaN) slipped in. There's no single validated config surface.
- **Action:** Introduce a small `src/config/env.js` that reads, validates, and defaults every required env var **once at boot** (fail-fast, like the existing `SESSION_SECRET` check), and have services import typed values from it. Incremental — start with the security/money-relevant vars.

### CQ-6 · De-duplicate the two purge cascades
- **Where:** `src/services/test-data-cleanup.service.js` and `src/services/test-user-cleanup.service.js`.
- **Note:** These already share `purgePostgresShadowData` / `cascadeDeleteEventsMongo`, which is good. The remaining duplication is the "list of collections to cascade" knowledge, expressed twice. Low priority — only worth it if a third purge tool appears. Flagging so the shared surface is kept in sync when models change.

---

## Smaller notes
- **`parseInt` without radix** appears at 14 call sites (`token.service.js`, `qr-code.service.js`, `result-import-validation.service.js`, `authRoutes.js:774`, `timing-system.js:30`, …). Mostly harmless with decimal input, but `parseInt(x, 10)` should be the house style; `authRoutes.js:774` is the one that actually bites (COR-C).
- **Duplicate route file:** `src/routes/event.routes.js` and `src/routes/certificateVerification.routes.js` are byte-identical (both define the certificate-verify routes). `event.routes.js` does not appear to be mounted in `server.js` — confirm and delete if dead.
- **Comment accuracy:** `ranking.service.js:196` says "Use template literal for safe query construction" above a `sql.unsafe(query, params)` call — it's parameterised (safe) but not a template literal; fix the comment to avoid future confusion.
- **Consistency in error rendering:** middleware variously `res.status().send('Access denied')` (plain text) vs. `render('error', …)` vs. `json({...})`. Not a bug; a small unification would improve UX and testability.
