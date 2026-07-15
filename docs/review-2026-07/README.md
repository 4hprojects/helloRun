# Full Codebase Review — July 6, 2026

Scope: process, efficiency, intuitivity, and security across `src/` (~44k lines), test harness, and ops posture. This review deliberately **excludes** everything already resolved in `docs/review-backlog.md` (26 items, June 24), the June 24 Organizer Workflow / Runtime Stabilization phases, and the **July 5 analysis** (`docs/analysis/2026-07-05/`) whose P0/P1/P2 batches are confirmed fixed in source (blog-review XSS, healthz/sync ordering, guard try/catch, reset-expiry NaN, limiter Map leak, CSRF kill-switch fail-safe, webhook length guard). Everything below is **new** — found in areas the July 5 pass didn't flag: session lifecycle, proxy/IP topology, deploy pipeline, and error-surface UX.

## Files in this review

| File | Area | Findings |
|------|------|----------|
| [01-security.md](01-security.md) | Security | SEC-1 … SEC-9 |
| [02-efficiency.md](02-efficiency.md) | Efficiency | EFF-1 … EFF-4 |
| [03-process-dx.md](03-process-dx.md) | Process & developer experience | PROC-1 … PROC-6 |
| [04-ux-intuitivity.md](04-ux-intuitivity.md) | Intuitivity / UX (code-level) | UX-1 … UX-4 |

Priorities: **P0** = fix before/with production deploy · **P1** = first week after deploy · **P2** = hardening backlog · **P3** = opportunistic polish.
Effort: **S** ≤ 1 hour · **M** ≤ half day · **L** = multi-session.

## Phased implementation plan

### Phase 1 — Pre-deploy blockers (do before or with the production deploy)
The deploy itself is the current #1 priority; these ride along with it.

| Item | Priority | Effort |
|------|----------|--------|
| PROC-1 · CI on GitHub main (audit + DB-free unit tests) — pushes to main auto-deploy to Render today with zero gate | P0 | M |
| PROC-2 · Live-DB test guard (`ALLOW_LIVE_DB_TESTS=1` + DB-host banner) | P0 | S |
| SEC-3 · Configure `REDIS_URL` in production (rate limiters currently per-process in-memory) | P0 | S (ops) |
| SEC-4 · Verify `trust proxy` / client-IP resolution behind Cloudflare + Render | P0 | S |
| SEC-1 · `req.session.regenerate()` at every login entry point | P1 | S |
| SEC-2 · Stop writing the full user document into the session store | P1 | S |

### Phase 2 — Post-deploy hardening (first 1–2 weeks live)

| Item | Priority | Effort |
|------|----------|--------|
| SEC-5 · CSRF token on `POST /login` | P2 | S |
| SEC-6 · Invalidate other sessions after password reset/change | P2 | M |
| SEC-7 · `select: false` on `passwordHash` + reset/verify token fields | P2 | M |
| EFF-2 · Graceful shutdown (SIGTERM) — Render sends it on every deploy | P1 | S |
| UX-1 · Replace plain-text 403/429 responses with the styled error page / JSON by `Accept` | P2 | M |
| UX-2 · Request-timeout handler should render HTML for page navigations | P2 | S |
| Carry-over: live-DB verification backlog from `docs/STATUS.md` (admin Phases 1–2, permission tiers, submission smarts) | P1 | M |

### Phase 3 — Efficiency & DX

| Item | Priority | Effort |
|------|----------|--------|
| EFF-1 · Single per-request user fetch (`req.currentUser`) shared by locals + role middleware | P2 | M |
| Carry-over: CQ-3 organiser auth-chain unification (from `docs/analysis/2026-07-05/`) — needs a running app, pairs well with the staging work below | P2 | L |
| PROC-3 · ESLint + formatter, wired into CI | P1 | M |
| PROC-4 · Minimal staging path (second Render service + Atlas free tier + Supabase branch) | P2 | L |
| EFF-3 · Origin compression (`compression` middleware) | P3 | S |
| SEC-8 · Align `/healthz/sync` admin check with DB-backed role check | P3 | S |

### Phase 4 — Long-term polish

| Item | Priority | Effort |
|------|----------|--------|
| SEC-9 · CSP nonce migration away from `'unsafe-inline'` scripts | P3 | L |
| UX-3 · Session-flash messages instead of `?type=…&msg=…` query params | P3 | L |
| UX-4 · Document organiser/organizer spelling convention | P3 | S |
| PROC-5 · `docs/` archive pass (26 top-level entries, stray dirs) | P3 | S |
| PROC-6 · Webhook HMAC over raw body bytes | P3 | S |
| EFF-4 · Front-end asset minification pipeline (optional) | P3 | L |

## What was checked and found healthy

- **Injection:** every user-supplied search term goes through `escapeRegex` before `new RegExp`; the one prior SQL injection (ranking.service) was already fixed June 24. No `$where`, no raw string interpolation into queries found.
- **Uploads:** multer memory storage → R2, MIME allowlists **plus** magic-byte content checks (`upload.service.js:674`), size limits, no local-disk writes in prod paths.
- **Webhooks:** HMAC-SHA256 with timestamp replay window and length-checked `timingSafeEqual`.
- **Password reset:** hashed tokens, TTL, atomic `findOneAndUpdate` consumption, enumeration-safe responses, per-user email throttle.
- **CSRF:** session-token pattern with timing-safe compare, production kill-switch fail-safe; coverage on register/logout/reset and (per June 24 work) organizer mutations. Gap is only `POST /login` (SEC-5).
- **Headers:** nosniff, frame-deny with a scoped SAMEORIGIN allowlist, HSTS, Referrer-Policy, Permissions-Policy, CSP (weak only via `unsafe-inline`, SEC-9).
- **Rate limiting:** shared Redis-or-memory limiter with bucket sweep + hard cap; keyed limits across auth, signup, exports, reviews, webhooks.
- **DB:** indexes present on hot models, PG pool bounded with statement timeout, aggregate-facet dashboards, `Promise.all` parallelism in hot controllers.
