# Phase 2 — Environments & Data Safety

**Priority:** P1–P2 · **Effort:** ~1–2 days ops + a supervised verification session · **When:** immediately after the production/AdSense deploy.

**Why this phase exists:** "no staging environment" is currently listed as a permanent fact, and it is the root cause of the largest open liability: **three shipped feature sets (admin improvements 1–2, permission tiers, submission smarts) plus the whole onboarding rework are running in production without ever having been exercised against a real database.** The July 2 incident (integration test wrote fixtures into prod) came from the same root. This phase removes the root cause instead of managing around it.

---

## PRC-8 · Separate dev/test data from production (P1)

Cheapest viable ladder — pick the rung that fits the budget, in order of preference:

1. **Separate dev database, same clusters (free):** create `hellorun_dev` on the existing MongoDB cluster and a second Supabase project (free tier) or schema. Introduce `.env.development` / `.env.production` split — `validate-env.js` already exists and can enforce that `NODE_ENV=development` refuses to boot when `MONGODB_URI` points at the production DB name (add a `PROD_DB_GUARD` check: if URI contains the prod db name and `NODE_ENV !== 'production'`, exit loudly). This alone makes `npm run dev` and integration tests safe.
2. **Seed script:** a `npm run seed:dev` that creates a known cast (admin full/support, approved + unverified organizer, runners, 2–3 events in different states) so a fresh dev DB is usable in minutes. Reuse fixtures from the integration tests.
3. **Optional true staging (later):** a second Render service off a `staging` branch with the dev `.env`. Only worth it once the dev-DB split has proven itself.

**Deliverable ordering matters:** do the env split *first*, then the live-verification backlog below runs against the dev DB instead of production.

## VERIFY-1 · Burn down the live-verification backlog (P1)

Once a safe DB target exists, run in one supervised session:
- `ALLOW_LIVE_DB=1 npm run test:admin` (admin improvements Phases 1–2, permission tiers)
- `ALLOW_LIVE_DB=1 node --test tests/submission.service.integration.test.js` (submission smarts, OCR "not_detected" auto-approval)
- Manual: 429 smoke on `/admin/promote` + `/admin/communications/test-email`; `support`-tier admin click-through of the 24 gated routes
- Onboarding live smoke (tracked in `docs/to-implement/organizer-onboarding-simplification.md`): signup → acknowledgement → free virtual event; real ID upload → OCR verdict on `/admin/applications/:id`; paid-setup block for non-approved organizer; trusted auto-publish
- Then move `docs/todo/admin-improvements/01-*.md`, `02-*.md` → `docs/done/admin-improvements/` and clear the STATUS.md In Progress entries.

## OPS-1 · Redis in production (P2)

Rate limiters currently run on the in-memory fallback in prod (no `REDIS_URL`): counters reset on every deploy, and the moment the service scales to 2 instances, every limit doubles and the login-abuse thresholds stop being global. Sessions are fine (Mongo-backed).
**Action:** provision a small managed Redis (Render Key Value free tier / Upstash), set `REDIS_URL`, confirm `redis: "ready"` in `/readyz`. Until then, document "single instance only" as a hard constraint on the Render service.

## CLEAN-1 · Delete the 2 placeholder users (P2)

`purge.runner.*@example.com` / `purge.organizer.*@example.com` — leftover from July 2. Narrow, explicit, supervised delete (they're Users; `purgeTestData()` intentionally doesn't touch Users). One-off script with an email-regex allowlist and a dry-run flag, run once, delete the script or park it in `src/scripts/`.

## PRC-7 · Ops runbook (P2)

Create `docs/RUNBOOK.md` — one page, checklists only:
- **Deploy:** pre-deploy check (CI green, unit suite), deploy, post-deploy smoke list (login, event page, submission modal, `/readyz`, `/healthz/sync` as admin), rollback = Render previous-deploy button.
- **Backups/restore:** confirm MongoDB Atlas continuous backup is enabled + Supabase PITR tier; write down the actual restore click-path *before* it's needed; note that R2 objects and the sessions collection are excluded/ephemeral.
- **Origin lockdown (pairs with SEC-N3):** restrict Render origin to Cloudflare IPs (or Authenticated Origin Pulls) so `CF-Connecting-IP` is trustworthy and the origin can't be hit directly.
- **Env inventory:** which vars are set in prod (SENTRY_DSN? REDIS_URL after OPS-1?) — today this is only discoverable by reading the Render dashboard; keep the list (names only, no values) in the runbook.
- **Incident notes:** where logs live (Render log stream; retention limits), Sentry project link, who to contact at Resend/Cloudflare.

---

## Exit criteria
- [ ] `npm run dev` and integration tests physically cannot write to production (boot guard)
- [ ] Seeded dev DB; verification backlog executed; `docs/todo/admin-improvements/` emptied into `docs/done/`
- [ ] Redis live in prod (or single-instance constraint documented)
- [ ] Placeholder users gone
- [ ] RUNBOOK.md exists with a tested restore path
