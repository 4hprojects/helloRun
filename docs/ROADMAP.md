# HelloRun Roadmap

**Forward-looking priorities only**

**Last reconciled:** August 8, 2026

**Delivery state:** [STATUS.md](STATUS.md)

## How this list works

Items are ranked by what it costs to leave them undone, not by size. Each is
ticked in the same commit that implements it, with a one-line note of the
evidence. Anything requiring a production migration or a hands-on session says so
and stops for a decision.

## 1. Verify what is live

Everything below the line has been verified by DB-free tests and by live probes
against throwaway data. **None of it has been used by a human in a browser.**
That is now the single largest risk on this list, because the whole August 7–8
run — guest registration, walk-in, waitlist, kit inventory, transfers, custom
questions, capacity — is deployed and reachable by real users.

- [ ] Walk a draft event end to end in a browser: register as a guest and claim
      it, assign a bib, open the race pass, scan it, release a kit, record and
      approve a result, cancel and confirm the slot returns.
- [ ] Responsive and weak-connectivity checks on the onsite surfaces, which are
      used on a phone at a start line.
- [ ] Finish the AdSense crawl, sitemap, content-seed and review operations.

Completion requires recorded production observations, not repository tests.

## 2. Live behaviour that is wrong

- [ ] **Guest cancellation files a false failure every time.**
      `services/registration-cancellation.service.js` passes a null `userId` to
      the in-app notification, which throws, is caught, and writes a
      `status: 'failed'` communication-log row. Harmless to the participant —
      the cancellation persists and the email still sends — but it is exactly
      the noise that hides a real failure.
- [ ] **`FEATURE_STEP_COMPETITIONS_ENABLED` gates the form, not the feature.**
      It is read only when building organiser form data, so it hides the
      controls; `applyEventFormData` still normalises and writes
      `challengeMetrics`, `primaryChallengeMetric` and `targetSteps` from any
      posted body. Enforce it server-side, and correct the claim in STATUS.md.

## 3. Dead code

Removal only, no behaviour change, each independently revertable.

- [ ] **14 unreachable partials** in `views/runner/partials/`. The dashboard
      includes four and the AJAX refresh is restricted to the same four by a
      whitelist. Two existing tests deliberately assert these are *not* rendered —
      the consolidation was intentional and those assertions stay.
- [ ] **26 dead service exports.** Notably `token.service.js` (3 of 5),
      `badge-template.service.js` (whose live exports have no `src/` consumer at
      all — the service is test-only), the unfinished pub/sub half of
      `realtime-checkin.service.js`, and the `list*` entry point of four shop
      services.
- [ ] **11 never-queried Postgres objects** — 10 views plus `shop_platform_fees`,
      including all five Phase-6 reporting views. **Needs a migration and
      explicit approval before it is applied.**

## 4. Environment and test isolation

- [x] **Prevent tests from writing to production.** Shipped August 8: any group
      that is not DB-free unit tests is refused unless the configured databases
      are local, with an explicit `ALLOW_REMOTE_TEST_DB=1` override.
- [ ] Create isolated development/staging data services. Until this exists,
      every live verification is a probe against production with throwaway data.
- [ ] Execute the deferred live-database verification backlog in that
      environment.
- [ ] Document and test backup, restore, rollback and deployment runbooks.

Detailed plan:
[`improvement-plan/phase-2-environments-and-data-safety.md`](improvement-plan/phase-2-environments-and-data-safety.md).

## 5. Security, process, and runtime hardening

- [x] **`/healthz` reports the running commit.** Shipped August 8, after a deploy
      was reported as verified from a route that answers 302 whether or not it
      shipped.
- [x] **Cross-event write protection.** Shipped August 8: bib assignment,
      check-in and onsite results resolved a registration by id alone, so an
      organiser could write against another organiser's runner.
- [ ] Close the remaining improvement-plan acceptance checks.
- [ ] Verify the login/session, proxy/IP, CSP, CI, dependency, shutdown and Redis
      safeguards against the deployed topology. Note Redis is **not** configured
      in production, so the shared rate limiters run on their in-memory fallback.
- [ ] Complete CQ-3 organiser authorization-chain unification, with focused
      authorization tests and supervised runtime smoke coverage. Related: every
      `/organizer/*` route re-implements its ownership check by convention rather
      than through middleware.
- [ ] Resolve server-spawning test open handles.

## 6. Measured efficiency and delivery refinement

- [ ] Establish performance baselines before changing request-path behaviour.
- [ ] Reduce avoidable authenticated-user lookups and request-time OCR work.
- [ ] Confirm edge compression, asset versioning, caching and bundle behaviour.
- [ ] Complete residual communication delivery and unsubscribe observability.

## 7. Documentation hygiene

- [ ] 14 files in `features/` carry no status header, and 8 have not been touched
      since May–June. Add the label
      [`DOCUMENTATION-CONVENTIONS.md`](DOCUMENTATION-CONVENTIONS.md) requires, or
      move superseded ones to `archive/`.
- [ ] `ux-improvement-plan.md` and `PRD.md` declare dates behind their own edits.

## 8. Product expansion

The onsite event lifecycle is complete — the pack's sequenced work all landed on
August 7–8 and is recorded in
[`features/onsite-registration-expansion/delivery-plan.md`](features/onsite-registration-expansion/delivery-plan.md).
What remains of that spec is deliberately deferred, with reasons, in
[`features/onsite-registration-expansion/05-form-builder.md`](features/onsite-registration-expansion/05-form-builder.md).

- [ ] Decide whether to prune orphaned data: 48 of 108 onsite registrations
      reference hard-deleted events, and 1,136 of 1,211 submissions reference
      deleted users or events. No backfill resolves these. Tooling exists —
      `scripts/diagnose-broken-registrations.js` reports,
      `repair-registration-references.js` and `backfill-missing-references.js` fix.
- [ ] Accept the `audit_critical` gap: every write failed until August 7 and
      those records cannot be reconstructed.
- [ ] Deepen platform analytics and reporting.
- [ ] Prioritise backlog items using production usage and support evidence.
- [ ] Evaluate mobile-app integration without duplicating unstable web workflows.

## Historical Roadmap

The former full-app review and mixed completion roadmap is preserved at
[`archive/roadmaps/full-app-review-roadmap-2026-06-22.md`](archive/roadmaps/full-app-review-roadmap-2026-06-22.md).
