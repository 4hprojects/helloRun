# Phase 2 — Environments & Data Safety

**Current ownership:** `DEC-01`, `DEC-04`, `DEC-07`, `OPS-02`–`OPS-06` in
[ROADMAP.md](../ROADMAP.md) · **Delivery state:** [STATUS.md](../STATUS.md)
**Reconciled:** October 20, 2026

**Priority:** P1–P2 · **Effort:** ~1–2 days ops + a supervised verification session · **When:** immediately after the production/AdSense deploy.

**Why this phase exists:** "no staging environment" is currently listed as a permanent fact, and it is the root cause of the largest open liability: **three shipped feature sets (admin improvements 1–2, permission tiers, submission smarts) plus the whole onboarding rework are running in production without ever having been exercised against a real database.** The July 2 incident (integration test wrote fixtures into prod) came from the same root. This phase removes the root cause instead of managing around it.

---

## PRC-8 · Separate dev/test data from production (complete)

Implemented October 20 as the repository-owned, loopback-only environment in
[`operations/isolated-development.md`](../operations/isolated-development.md).
The implementation uses Docker MongoDB/PostgreSQL services, explicit environment
loading, boot and test guards, a deterministic seed, and a volume-scoped reset.
The full integration command now runs without production credentials.

Cheapest viable ladder — pick the rung that fits the budget, in order of preference:

1. **Separate dev database, same clusters (free):** create `hellorun_dev` on the existing MongoDB cluster and a second Supabase project (free tier) or schema. Introduce `.env.development` / `.env.production` split — `validate-env.js` already exists and can enforce that `NODE_ENV=development` refuses to boot when `MONGODB_URI` points at the production DB name (add a `PROD_DB_GUARD` check: if URI contains the prod db name and `NODE_ENV !== 'production'`, exit loudly). This alone makes `npm run dev` and integration tests safe.
2. **Seed script:** a `npm run seed:dev` that creates a known cast (admin full/support, approved + unverified organizer, runners, 2–3 events in different states) so a fresh dev DB is usable in minutes. Reuse fixtures from the integration tests.
3. **Optional true staging (later):** a second Render service off a `staging` branch with the dev `.env`. Only worth it once the dev-DB split has proven itself.

**Deliverable ordering matters:** do the env split *first*, then the live-verification backlog below runs against the dev DB instead of production.

## VERIFY-1 · Burn down the live-verification backlog (in progress)

Once a safe DB target exists, run in one supervised session:
- `ALLOW_LIVE_DB=1 npm run test:admin` (admin improvements Phases 1–2, permission tiers)
- `ALLOW_LIVE_DB=1 node --test tests/submission.service.integration.test.js` (submission smarts, OCR "not_detected" auto-approval)
- Manual: 429 smoke on `/admin/promote` + `/admin/communications/test-email`; `support`-tier admin click-through of the 24 gated routes
- Onboarding live smoke (tracked in `docs/implementation/organizer-onboarding-simplification.md`): signup → acknowledgement → free virtual event; real ID upload → OCR verdict on `/admin/applications/:id`; paid-setup block for non-approved organizer; trusted auto-publish
- Then update the records under
  `docs/implementation/verification-pending/` with the approved environment,
  results, and completion date.

The first complete isolated baseline ran October 20 at 451 of 527 passing. The
identified failures were repaired and the final guarded rerun passed 527 of 527,
with zero fixture, sync-failure, or dead-letter residue after reset. The investigation
and final evidence are recorded in
[`analysis/2026-10-20/isolated-integration-baseline.md`](../analysis/2026-10-20/isolated-integration-baseline.md).
No production database was used. Provider and supervised browser checks remain under
their individual ROADMAP tasks rather than this completed repository baseline.

## OPS-1 · Redis in production (P2)

Rate limiters currently run on the in-memory fallback in prod (no `REDIS_URL`): counters reset on every deploy, and the moment the service scales to 2 instances, every limit doubles and the login-abuse thresholds stop being global. Sessions are fine (Mongo-backed).
**Action:** provision a small managed Redis (Render Key Value free tier / Upstash), set `REDIS_URL`, confirm `redis: "ready"` in `/readyz`. Until then, document "single instance only" as a hard constraint on the Render service.

## CLEAN-1 · Verify the 2 placeholder users (complete)

The October 20 production audit found zero users matching
`purge.runner.*@example.com` or `purge.organizer.*@example.com`, and no matching
PostgreSQL shadows. No deletion was necessary. The separately discovered 99-account
fixture footprint is not part of this completed narrow task; it is governed by `DEC-07`
and the [placeholder audit](../analysis/2026-10-20/production-placeholder-user-audit.md).

## DATA-1 · Decide orphan-record retention (blocked)

The October 20 read-only production refresh supersedes the August counts. All 88
current onsite registrations reference unavailable events, and 1,116 of 2,401 current
submissions across both collections have an unavailable runner, event, or registration
reference. No deletion was attempted. Exact definitions and overlapping counts are in
the [orphan audit](../analysis/2026-10-20/production-mongo-orphan-audit.md).

`DEC-01` requires an owner-approved retain/quarantine/delete scope and recoverable
backup before any cross-store or R2 mutation.

## PRC-7 · Ops runbook (P2)

Create `docs/RUNBOOK.md` — one page, checklists only:
- **Deploy:** pre-deploy check (CI green, unit suite), deploy, post-deploy smoke list (login, event page, submission modal, `/readyz`, `/healthz/sync` as admin), rollback = Render previous-deploy button.
- **Backups/restore:** confirm MongoDB Atlas continuous backup is enabled + Supabase PITR tier; write down the actual restore click-path *before* it's needed; note that R2 objects and the sessions collection are excluded/ephemeral.
- **Origin lockdown (pairs with SEC-N3):** restrict Render origin to Cloudflare IPs (or Authenticated Origin Pulls) so `CF-Connecting-IP` is trustworthy and the origin can't be hit directly.
- **Env inventory:** which vars are set in prod (SENTRY_DSN? REDIS_URL after OPS-1?) — today this is only discoverable by reading the Render dashboard; keep the list (names only, no values) in the runbook.
- **Incident notes:** where logs live (Render log stream; retention limits), Sentry project link, who to contact at Resend/Cloudflare.

---

## Exit criteria
- [x] `npm run dev:isolated` and guarded integration tests refuse unsafe remote targets
- [ ] Seeded dev DB; verification backlog executed; verification-pending
  records updated with evidence
- [ ] Redis live in prod (or single-instance constraint documented)
- [x] Original two placeholder patterns verified absent
- [ ] RUNBOOK.md exists with a tested restore path
