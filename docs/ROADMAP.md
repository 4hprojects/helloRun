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

- [x] **Guest cancellation files a false failure every time.** Fixed August 8.
      A guest has no in-app inbox, so the notification is now requested only when
      there is an account, and `notify` treats a missing recipient as
      not-applicable rather than as a delivery failure — which also protects the
      payment-approval and shop call sites that pass the same field. Probed live:
      cancellation recorded, zero `failed` rows written.
- [x] **`FEATURE_STEP_COMPETITIONS_ENABLED` gates the form, not the feature.**
      Fixed August 8. Enforced in `applyEventFormData`: steps cannot be
      *introduced* while the flag is off, but an event that already has them keeps
      them — the form replays existing values on every save, so stripping them
      would silently downgrade a configured event. STATUS.md corrected.

### Verification-probe safety

- [x] **Probe teardowns left residue in production, twice.** Fixed August 8. Seventeen
      Postgres tables reference `events_core` and each probe hand-wrote four to six of
      them; the second miss left a `rankings` row that blocked the event delete.
      `scripts/probe-cleanup.js` now delegates to the one FK-ordered list in
      `test-data-cleanup.service`, and **verifies zero residue afterwards rather than
      assuming** — a teardown that failed quietly is what caused this. Runnable as a
      sweep: `npm run probe:cleanup:dry`.
- [x] **An event delete orphaned four event-scoped collections.** Guest tokens,
      waitlist entries, transfers and bib QR tokens were all added after
      `cascadeDeleteEventsMongo` was written and none were in it — so the **admin
      test-data purge** orphaned them too, not just a probe.
- [x] **Two gaps found while fixing the above.** Both fixed August 8, and one of
      them corrected: `orders` and `products_core` reference `events_core` with
      **ON DELETE SET NULL**, not RESTRICT, so the delete never failed — the rows
      simply survived orphaned with a null `event_id` and nothing left to identify
      them by. Both are now purged before the event. And
      `scripts/cleanup-smoke-tests.js` treated "this table has no smoke-test
      metadata columns" as "zero rows found", so it reported a clean sweep for
      tables it had never looked at; it now names them as unchecked.
      `badge_progress` and `certificate_audit_logs` are in the list and correctly
      report as unverifiable — they genuinely lack the columns, which is a
      migration nobody has needed yet.

### Onsite workflow gaps, found by an end-to-end trace on August 8

Full analysis:
[`features/onsite-registration-expansion/workflow-analysis.md`](features/onsite-registration-expansion/workflow-analysis.md).
The feature checklist was complete; the workflow was not. Both blocking defects
live in a seam between features rather than inside one.

- [x] **Walk-in registration 500s through its own form.** Fixed August 8, and
      verified end to end for the first time: the form's own body now registers a
      walk-in, captures the kit size and the organiser's answers, records desk
      payment, and the bib assigns immediately. `validateGuestForm` now rejects a
      missing `participationMode` or `raceDistance` rather than passing them to a
      `save()` failure, both projections carry the kit and question fields, and a
      new test builds the body the *form* serialises rather than supplying its
      own — the specific hole that let this ship.
- [x] **An approved onsite result produces nothing without an account.** Fixed
      August 8. Migration `025` applied: `submissions_core.runner_user_id` is
      nullable; `certificates` and `user_badges` deliberately are not. The result
      ranks and reaches the leaderboard under the participant's name; the
      certificate and badges are handed over when the registration is claimed with
      a verified email. Probed live: shadow row written with a null runner, one
      ranking row created, no certificate issued, claim backfills the runner.
- [x] **Transfer drops the recipient's manage token on organiser approval.** Fixed
      August 8. `completeTransfer` now emails the link to the new holder via a
      `registration.transfer_completed` event, so both approval paths deliver it —
      it is the recipient's credential, not something to hand an organiser in a
      response body. Also makes the auto-approve path durable, which previously
      rendered the link once and lost it if the tab closed.
- [x] **Transfer inherits the previous person's custom answers, and never requires
      an emergency contact.** Both fixed August 8. Answers are cleared — the kit size
      was already replaced and the waiver re-signed, so inheriting a meal choice was
      an omission rather than a policy. An onsite entry now demands the recipient's
      own emergency contact, as every other route into an event does.
- [x] **Bulk import commit trusts client-supplied rows.** Fixed August 8. Both the
      validation and the cross-type duplicate check are re-run at commit, so a
      hand-crafted post cannot skip the preview's checks and a duplicate created
      between the two requests is caught.
- [x] **Import's shadow-sync failure is logged but never recorded.** Fixed August 8.
      It now writes a `sync_failures` row with the same call shape the post-save hook
      uses, so the retry worker can actually see it.
- [x] **The self-serve guest duplicate check ignores accounts.** Fixed August 8.
      The public guest route now uses `findAnyExistingRegistration`, which the
      walk-in desk has always used, so an account holder can no longer register a
      second time as a guest and arrive as two people for one bib.
- [x] **Guests have no reachable race pass.** Built August 8. The guest's existing
      manage link now shows their bib and check-in QR — one credential, already
      hashed and already revoked on cancellation and claim, rather than a second
      one. QR check-in works for walk-ins and imported runners for the first time.
- [x] **The onsite roster has no pagination.** Fixed August 8: paging on the
      check-in, bibs, race-kit and results pages, reporting the real total so staff
      can tell "that is everyone" from "there are more". The offline backup export
      pages through instead of silently stopping at 500 — the worst place for a
      truncation, since it is what staff fall back on when connectivity drops.
- [x] **Participation mode is never checked against the event.** Fixed August 8 —
      a guest could hold a confirmed entry that never appeared on the race-day
      roster, because the roster filters on exactly `onsite`.
- [x] **The roster showed cancelled registrations.** Fixed August 8: a cancelled
      entry looked identical to a live one, so a desk could hand over a bib and a
      kit for a registration that no longer existed. `includeCancelled` keeps them
      reachable for an organiser reconciling afterwards.

## 3. Dead code

Removal only, no behaviour change, each independently revertable.

- [x] **14 unreachable partials** in `views/runner/partials/`. Removed August 8,
      24 files down to 10. The two tests that assert these are *not* rendered were
      kept — the consolidation was deliberate and they are the reason not to
      reintroduce them. All 158 views still compile, so no include was left
      dangling.
- [x] **Dead service exports.** 25 removed August 8 across 17 files, ~370 lines.
      The 26th, `getPasswordStrength`, turned out **not** to be dead — it is called
      internally by `validatePassword`, and removing it broke password validation
      until the check caught it. Removing `consumeClaimToken` also surfaced a real
      fact: nothing has ever issued a `claim` token, because claiming is proved by
      a verified email instead. `badge-template.service.js` survives but has no
      `src/` consumer at all — it is reachable only from its test, which is a
      separate decision from dead exports.
- [ ] **11 never-queried Postgres objects** — 10 views plus `shop_platform_fees`,
      including all five Phase-6 reporting views. Verified August 8 as unused by
      the application: no `src/` code references any of them, and the only test
      mentions are schema-existence assertions. **Deliberately not dropped.**
      Views are exactly what a Supabase dashboard query, a BI tool or an ad-hoc
      report would use, and none of that is visible from the repository — so
      dropping them is a silent breakage no test here could catch. Removable once
      it is confirmed nothing outside the app reads them. A twelfth,
      `v_runner_certifications`, became unreachable when its only caller was
      removed as dead code.

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
- [x] **Resolve server-spawning test open handles.** Fixed August 8. All 41 files
      spawned `src/server.js` inline and every one called `kill()` without awaiting
      exit, so the runner held a live handle each time. `tests/helpers/test-server.js`
      waits for the child to actually exit, with a SIGKILL fallback so a hung server
      cannot hang the run.
- [x] **The app ignored SIGTERM entirely.** Found while fixing the above and far
      more serious. Four workers register `process.once('SIGTERM', cleanup)` to clear
      an interval — and any SIGTERM listener replaces Node's default, which is to
      terminate. So the app cleared four timers and carried on serving indefinitely.
      Measured: still alive 8s after SIGTERM, versus 7ms for a bare HTTP server.
      **In production the host asks the service to stop, waits out its whole shutdown
      grace period, then SIGKILLs it** — dropping in-flight requests and making every
      deploy as slow as that timeout. Now exits cleanly in 65ms, closing the HTTP
      server before the databases so a request in flight can finish.

## 6. Measured efficiency and delivery refinement

- [ ] Establish performance baselines before changing request-path behaviour.
- [ ] Reduce avoidable authenticated-user lookups and request-time OCR work.
- [ ] Confirm edge compression, asset versioning, caching and bundle behaviour.
- [ ] Complete residual communication delivery and unsubscribe observability.

## 7. Documentation hygiene

- [x] **Status headers on `features/`.** Added August 8 to the 14 files that had
      none. Each was checked against the code first — all describe shipped work,
      so all are labelled implemented rather than blanket-stamped. They stay where
      they are rather than moving to `implementation/`: 11 of them are linked from
      other documents, and relocating would break those links for a filing tidy-up.
- [x] **`PRD.md` and `ux-improvement-plan.md` were behind their own edits.** Both
      addressed August 8, differently and on purpose. The PRD was genuinely missing
      requirements the system now meets — registration without an account, category
      capacity, waitlists, per-size kit stock, organiser questions, transfers — so
      those were written in and its date moved. `ux-improvement-plan.md` was not
      re-dated: its UX recommendations have not been re-audited, and moving the date
      would claim they had. It now states what it is authoritative for (the specs
      four implementation records cite) and that its progress narrative is a
      June–July snapshot superseded by STATUS and ROADMAP.

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
