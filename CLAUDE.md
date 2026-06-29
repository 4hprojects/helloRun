# HelloRun — Claude Code Context

## What This Is

HelloRun is a running event management platform. It handles the full lifecycle: event discovery → registration → payment → run proof submission → organiser review → results and certificates.

**Stack:** Node.js · Express · EJS · MongoDB (Mongoose) · PostgreSQL (Supabase) · Redis · Cloudflare R2

**Production:** https://hellorun.online

## Key Commands

```bash
npm run dev          # Start dev server (nodemon)
npm test             # Run full test suite
npm run seed:adsense-blog  # Seed 15 AdSense-quality blog posts to DB
npm run mark-test-events   # Mark existing test events as isTestData:true (sitemap cleanup)
```

## Key Docs

| Doc | Purpose |
|-----|---------|
| `docs/STATUS.md` | **Master source of truth** — completed features, in-progress items, priority backlog |
| `docs/ROADMAP.md` | Session-by-session completion log with feature details |
| `docs/review-backlog.md` | P0–P5 security/UX/infra review (all 26 items resolved Jun 24, 2026) |
| `PRODUCT.md` | Product brief, user personas, brand personality, design principles |
| `docs/architecture/` | DB schema, workflow diagrams, security route matrix |
| `docs/adsense-readiness/` | AdSense implementation status — locally complete, production deployment pending |

## Current Priority (June 29, 2026)

1. **Deploy to production + AdSense** — ops only, no code; all code is done
2. **Homepage P1 fixes** — impeccable critique (27/40): move CTAs to hero-text, replace logo with product screenshot, remove fabricated testimonial
3. **Blog Run Hub UX** — spec at `docs/blog/hellorun-blog-run-hub-ux-todo.md`
4. **Structured data / JSON-LD** — AdSense checklist Phase 6; Organization, BlogPosting, FAQPage, BreadcrumbList
5. **DEBT-1/2** — split `admin.controller.js` and `organizer.routes.js` (section markers already in place)

## Architecture Notes

- **Sessions:** `connect-mongo` — multi-process deployment is safe
- **Auth:** Express sessions + Cloudflare Turnstile on auth forms
- **Uploads:** Cloudflare R2 via multer (5 MB limit, type-validated)
- **Email:** Nodemailer via communication.service.js; opt-out stored on User.emailOptOut
- **Workers:** pg-sync-worker (sync retry), communication-retry-worker, blog-scheduler-worker — all wired into server startup
- **Rate limiting:** Shared Redis limiters across auth, submissions, exports, reviews
- **Monitoring:** Sentry APM (conditional on SENTRY_DSN), `/healthz` + `/readyz` endpoints

## Test Patterns

```bash
node --test tests/admin-governance.integration.test.js
node --test tests/submission.service.integration.test.js
```

Integration tests require live MongoDB + PostgreSQL. Server-spawning smoke tests may leave open handles on teardown (known, low priority).

## Docs Conventions

- `docs/STATUS.md` is updated after every session (add completed rows to table, update In Progress)
- `docs/ROADMAP.md` gets a new "Session Completed (date)" table each session
- `docs/to-implement/` and `docs/implementation/` are **historical design records** — do not treat as active backlog
- `docs/archive/` contains superseded planning files
