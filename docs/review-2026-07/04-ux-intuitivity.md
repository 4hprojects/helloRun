# Intuitivity / UX Findings (code-level) — July 6, 2026

Scope note: this pass reviewed UX as expressed in code — error surfaces, message plumbing, response consistency — not visual design (homepage CSS polish and Run Hub UX were completed June 29–30 and are not re-litigated here). Findings are about what a user sees when something goes *wrong*, which is exactly where a platform handling payments and race results earns or loses trust.

---

## UX-1 · Plain-text 403/429 responses — **P2 · M**

Twelve call sites return bare text where a user sees a browser-default white page:

- Role guards: `res.status(403).send('Access denied')` (`src/middleware/auth.middleware.js` — `requireAdmin`, `requireOrganizer`, `requireApprovedOrganizer`, `requireCanCreateEvents`, `requireFullAdmin`).
- Rate limiter: `res.status(429).send(safeMessage)` (`src/middleware/rate-limit.middleware.js:92`) — a runner double-clicking a submission button during a rush can hit this and land on an unstyled page with no way back.

The app *has* a styled error view (`views/error.ejs`, used by the 404/500 handlers and CSRF failures) — these paths just don't use it.

**Fix:** one shared helper, e.g. `sendErrorResponse(req, res, status, message)` that renders `error.ejs` for HTML requests and `{ success: false, message }` for JSON (`req.accepts(['html','json'])` — the rate limiter already half-does this). Swap the 12 sites. For 429 specifically, include a "wait a moment and try again" line; for 403 organizer-approval cases, keep the specific reason text ("Organizer approval required") — it's already more helpful than a generic denial.

---

## UX-2 · Request timeout always answers JSON — **P2 · S**

`src/server.js:53` — the 30s timeout responds `503 {"error":"Request timed out."}` regardless of request type. A user navigating a slow page gets raw JSON in the browser window, which reads as a crash.

**Fix:** branch on `req.accepts('html')` and render `error.ejs` with a "took too long, please retry" message; keep JSON for XHR. Three lines once UX-1's helper exists.

---

## UX-3 · Flash messages travel in query strings — **P3 · L**

The dominant pattern is `res.redirect('/path?type=success&msg=…')` (dozens of sites, e.g. `runner.controller.js:453,516`). Costs:

- The message re-appears on every refresh and survives in bookmarks/shared links ("Running group created and joined." forever).
- Message text is user-visible in the URL bar and server logs, and inflates analytics URL cardinality.
- Success states are spoofable by URL editing (cosmetic only, but odd).

**Fix (when touched, not as a campaign):** session-flash helper — write `req.session.flash = { type, msg }` before redirect; `populateAuthLocals` (already runs everywhere) moves it to `res.locals.flash` and deletes it; nav partial renders it. Migrate routes opportunistically as they're edited; a big-bang rewrite of dozens of redirects isn't worth it. New code should use the flash helper from day one.

---

## UX-4 · organiser/organizer dual spelling — **P3 · S (document only)**

Both spellings are load-bearing: the role value is `'organiser'` (`user.role === 'organiser'`), URLs are `/organizer/*`, file names mix both (`organizer.routes.js` mounts `routes/organiser/`). This is a recurring papercut for anyone (human or agent) grepping or writing guards — `role === 'organizer'` is a silent always-false bug waiting to happen.

**Fix:** do **not** attempt a rename (the role value is persisted in Mongo and PG shadow tables; URLs are public). Instead add a short "Spelling convention" note to CLAUDE.md and `docs/architecture/user-role-system.md`: *data/role = British `organiser`; URLs/routes/files = American `organizer` unless in `routes/organiser/`*. Consider an ESLint `no-restricted-syntax` rule flagging the literal `'organizer'` in role comparisons once PROC-3 lands.

---

## Checked and healthy

- 404/500 pages render the styled error view with friendly copy.
- Auth flows carry specific, actionable errors (resend-verification link on unverified login, Google-account hint, suspended-account messaging).
- Login preserves `returnTo` intent through the whole flow, including Turnstile re-prompts.
- Enumeration-safe forgot-password copy ("If an account exists…") is correct and consistent.
- Empty states, onboarding nudges, and missed-submission surfacing were addressed in prior sessions (P2 Onboarding, July 1–2 work) and read well in code.
