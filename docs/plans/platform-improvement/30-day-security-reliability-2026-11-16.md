# 30-Day Security and Reliability Plan — November 16 to December 15, 2026

**Document role:** Canonical execution plan  
**Lifecycle:** Active through December 15, 2026  
**Last reconciled:** November 15, 2026  
**Canonical owners:** `OPS-01`, `OPS-03`–`OPS-05`, `REL-01`, `REL-02`,
`REL-05`, `REL-11`, `SEC-01`–`SEC-05`, `COM-01`, `DEC-03`, `DEC-06`, and
`DEC-07` in [ROADMAP](../../ROADMAP.md)  
**Verification boundary:** Production, provider, legal, backup, and
second-operator claims require dated external evidence

No new product feature enters this cycle. Production changes use isolated,
reversible windows and preserve the live Active Quest event.

## November 15 starting evidence

- Documentation PR #44 passed required CI and merged to `main` as
  `394d8dfbe6aa368a805aaabefce68464ebbf38a2`.
- `/healthz` returns HTTP 200 through HelloDeploy but still reports
  `commit: "unknown"`.
- `/readyz` reports MongoDB ready, Redis `not_configured`, and the private Strava
  viewer disabled.
- `/sw.js` returns browser and CDN `no-store`; vendored Lucide and Quill assets
  return HTTP 200; the homepage CSP uses a per-response script nonce and blocks
  script attributes.
- Migrations 027 and 028 are already recorded from October 29. Migration 027
  must not be reapplied. The current schema reports 36/36 public tables with
  RLS, 13/13 views with `security_invoker`, and no `anon` or `authenticated`
  table grants.
- Active Quest verification finds all 12 authoritative MongoDB events covered
  by Postgres shadows. The 592 additional shadow rows remain outside the
  authoritative set.
- The fixture cross-store audit matches the reviewed manifest. Quarantine stays
  blocked until current backup evidence and the dedicated apply window exist.

Detailed sanitized output is in the
[November 15 baseline](../../analysis/2026-11-15/security-reliability-baseline.md).

## Week 1 — Deployment identity

1. Fetch `origin/main` at the production-window preflight and record its exact
   40-character SHA as the immutable HelloDeploy target.
2. Record pre-deploy health, readiness, public Active Quest, login, signup,
   registration gate, submission gate, and admin gate results.
3. Deploy the exact SHA through **Deploy a Specific Commit**. Do not change OCR,
   Strava, scheduler, or other feature flags.
4. Require `/healthz.build.commit` to equal the full target SHA and confirm the
   previous healthy release remains selectable for rollback.
5. Run authenticated login, registration, proof-submission, review, and admin
   smoke checks.
6. Have a second operator execute retained-release rollback and restoration from
   the runbook. Record both served SHAs and deployment numbers.
7. Update `OPS-01`, `REL-01`, eligible `SEC-03` evidence, `REL-05`, STATUS,
   ROADMAP, and the changelog.

## Week 2 — Recovery proof and remaining PostgreSQL verification

Use separate windows.

### Recovery rehearsal

1. Confirm current Atlas and Supabase recovery points.
2. Restore both into isolated infrastructure.
3. Exercise the R2 loss/recovery procedure without deleting production objects.
4. Record duration, RPO/RTO observations, shadow reconciliation, and rollback
   notes.
5. Close `OPS-03` only after the second operator reproduces the procedure.

### PostgreSQL lockdown verification

Migration 027 is already recorded. Do not run the migration command.

1. Confirm the ledger timestamps and schema counts again inside the approved
   window.
2. Verify application-role reads.
3. Verify external Data API denial for both `anon` and an authenticated test
   session.
4. Run application smoke checks and Supabase Security Advisor.
5. Record the rollback decision and backup reference that covered the original
   October 29 apply.
6. Close `OPS-04` only when these remaining checks exist.

## Week 3 — Redis, client IP, and deployed security

1. Configure production Redis in its own window without changing application
   behavior.
2. Require `/readyz.dependencies.redis` to report `ready`.
3. Demonstrate shared rate limiting across application replicas.
4. Verify one known request resolves to the real client IP.
5. Probe the approved direct origin with forged headers. Untrusted headers must
   not override the socket or trusted proxy result.
6. Complete deployed evidence for session rotation, CSP and console behavior,
   organizer/admin authorization, keyboard/focus/assistive technology, and
   no-JavaScript mutation forms.
7. Close `OPS-05` and security tasks only from recorded production evidence.

## Week 4 — Governance, cleanup, and live verification

1. Obtain the `DEC-03` retention, deletion, payment-evidence, and legal-hold
   decisions.
2. Obtain the `DEC-06` OCR legal basis, policy versions, publication, notice
   period, and durable approval reference. Keep every OCR flag off.
3. Confirm a current recoverable MongoDB backup.
4. Rerun the fixture audit. If counts still match, create a mode-`0600` rollback
   manifest and quarantine fixture accounts in a dedicated window.
5. Verify rollback, suspended accounts, archived fixture blogs, and preserved
   participant/evidence records.
6. Complete supervised `REL-02`, device `REL-05`, and provider-send `COM-01`
   checks.
7. Collect remaining `REL-11` deployment, backup, flag, administrator-audit,
   and public-route evidence.

Badge and certificate finalization remains scheduled for December 18 or later.
It cannot close inside this cycle.

## Every production window

1. Run read-only preflight.
2. Confirm exact target and recoverable backup.
3. Make one scoped change.
4. Run automated and browser smoke checks.
5. Obtain second-operator evidence review.
6. Roll back on health, authentication, registration, submission, review,
   Active Quest, or database-access regression.
7. Update STATUS, ROADMAP, the dated audit record, and changelog.

Never combine deployment metadata, Redis, fixture quarantine, recovery rehearsal,
or CNS data repair. Migration 027 needs verification only; it is not a pending
change.

## Deferred

OCR rollout, Strava enablement, step-competition rollout, the broad device and
workflow matrix, AdSense approval, performance work, general UX work, dependency
majors, controller refactors, deeper analytics, COROS, and mobile-app work remain
outside this cycle. `CONTENT-01` remains time-gated through December 31.
