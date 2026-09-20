# HelloRun Current Status

**Source of truth for delivery status**

**Last reconciled:** September 16, 2026

**Evidence window:** repository history through September 16, 2026

**Forward priorities and the tracked checklist:** [ROADMAP.md](ROADMAP.md)

**Deploying, verifying or rolling back:** [operations/deployment-runbook.md](operations/deployment-runbook.md)

## Implemented and Repository-Verified

The repository contains implementation and focused automated coverage for the
core platform:

- authentication, account recovery, role-aware access, abuse protection, and
  administrator permission tiers;
- event creation and management for virtual, onsite, and hybrid workflows;
- runner registration, payment proof, run-proof and accumulated-activity
  submission, organiser review, results, leaderboards, certificates, and
  achievement badges;
- organiser dashboards, registrant/review queues, bulk actions, event
  promotion, analytics, audit workflows, and running groups;
- organiser onsite operations surfaces added August 7 — race-day check-in
  console, live check-in board, bib assignment with previewed sequential ranges,
  race-kit release, bib scanning, and onsite results entry/approval — built over
  the existing Phase 7 endpoints, which previously had no user interface;
- the onsite participant loop, also August 7 — a runner race pass showing their
  own bib and an opaque encrypted check-in QR, approved onsite results reaching
  rankings/leaderboards/certificates through the existing submission pipeline,
  and organiser-initiated registration cancellation that frees the slot and
  releases the bib;
- atomic race-category capacity reservation, replacing a count-then-insert that
  let two runners take the same last slot;
- revocable bib QR codes, withdrawn on cancellation and bib reassignment, with
  scanning distinguishing withdrawn from unrecognised and unreadable;
- guest registration without an account, with hashed manage/claim links, plus
  organiser walk-in registration at the check-in desk — repaired and verified end
  to end on August 8 — and bulk registrant import
  from a CSV or XLSX — all three sharing one guest path, so a person with no
  HelloRun account can be entered by any route and later claim the entry with a
  verified email;
- results import from a CSV or XLSX with preview-then-commit, and event-scoped
  race-day staff who can be given `check_in`, `race_kit`, or `results` access to a
  single event without touching the global `User.role`; and runner-initiated
  cancellation requests that the organiser reviews rather than auto-cancelling;
- organiser-defined registration questions, added August 8 — a deliberate subset of
  the form-builder spec (short answer, pick from a list, agreement), asked on every
  registration path and included in the registrants export;
- onsite results for participants without an account, August 8 — a marshal-recorded
  finish time now ranks and reaches the leaderboard, with the certificate and badges
  issued when the registration is claimed with a verified email (migration `025`);
- race-category capacity enforced for the first time, August 8 — the identifier
  fix also repairs the accumulated-challenge target, the minimum submission
  distance and the slot release on cancellation, which all matched the same slug;
- registration transfers, added August 8 — emailed invite, recipient signs their own
  waiver, organiser approval by default, reissued bib QR, and a policy that moves the
  person without touching any payment;
- per-size race-kit stock, added August 8 — sizes chosen at registration by every
  route, atomic claim at the kit table, substitution recorded, and stock returned
  when a registration is cancelled;
- a waitlist for full categories, added August 8 — joining, organiser-managed and
  automatic promotion, offers that hold a real slot and expire, and a worker that
  passes a lapsed slot to the next person in line;
- deploy and test guards added August 8 — `/healthz` reports the running commit,
  the tessdata download cannot fail or hang an install, and `npm test` refuses to
  run database-touching suites against a non-local database;
- shop, cart, registration add-ons, platform merchandise, reporting, and
  settings;
- blog authoring/moderation, scheduled publishing, community comments,
  editorial content, policies, contact, FAQ, consent, and AdSense-related
  crawl/content support;
- responsive runner, organiser, administrator, event-discovery, policy, and
  public-content refinements committed through July 29;
- session-based organizer and runner workspaces, including verified-organizer
  participation in any event, their own included, with reviewing your own
  submission or payment proof as the one remaining conflict-of-interest guard
  (September 14 — replaced the former blanket own-event participation ban);
- organiser self-participation, audited September 16 — organisers and co-organisers can
  register, upload and submit end to end, including on events they manage; reviewing your
  own entry is permitted and recorded as `submission.self_reviewed` rather than blocked,
  which previously deadlocked a sole organiser; admins remain excluded from participating
  by design; payment-proof self-approval remains blocked;
- approved-entry reversal, added September 16 — a dedicated approved-entries page for
  organisers, co-organisers and admins, where an approval can be reversed to rejected;
  the reversal revokes any issued certificate, withdraws badges earned off the entry
  (restoring them if it is approved again), deletes the published ranking row and flushes
  the leaderboard cache, under its own audit action;
- status decisions on the per-runner submissions page, added September 20 — organisers,
  co-organisers and admins can approve, reject or reverse an entry without leaving the page.
  Pending entries offer Approve and Reject, approved entries offer Reject approval (the
  existing reversal, which also revokes the certificate, withdraws badges and ranking, and
  notifies the runner), and rejected entries offer Approve again. Approving still requires the
  full proof checklist and rejecting a reason, because it calls the same review services;
  each decision is audited and the runner is notified as on the review page;
- per-event submission review mode, added September 20 — organisers choose on the event
  create and edit forms how run submissions are reviewed: "Reviewed and validated by
  HelloRun" (default; entries that pass the checks are auto-approved, anything flagged
  waits) or "I review every submission" (nothing is auto-approved, Strava syncs included).
  It applies to new submissions only, events created before it default to system
  validation, validation still runs and its signals are shown to the reviewer, and runner
  submit messages follow the event's mode;
- per-runner submissions page and organizer value corrections, added September 20 —
  a "Submissions" button on each registrants row (also linked from the individual review
  page and the run-proof queue) opens every entry one runner submitted for the event,
  standard and accumulated. Organisers, co-organisers and admins can correct an entry's
  distance, elapsed time, run date, location and activity type on any status (reason
  required); the runner is notified by email and in-app, each correction is audit-logged
  as `submission.values_corrected` and kept as before/after history on the entry, and an
  approved entry's ranking, leaderboard cache, certificate (standard) or challenge
  progress (accumulated) are recalculated, and value-dependent badges follow the
  corrected values in both directions (lifetime distance milestones and the corrected
  runner's rank badges are revoked or restored, accumulated challenge badges are
  refreshed); per-entry badges depend only on status and category and are unaffected.
  Rank badges of runners displaced by someone else's entry are not revoked, as before;
- run-proof review queue redesign, September 20 — responsive desktop, tablet and phone
  layouts with visible validation signals, moved to a dedicated scoped stylesheet;
- post-signup registration edits, added September 15 — organisers and co-organisers
  change a registrant's leaderboard choice, contact snapshot and name from the
  registrants page (reason required, audited, runner notified), and runners change
  their own leaderboard choice and event contact details from their registrations
  page; both flush the cached leaderboard;
- the reusable `@hellorun/threaded-comments` package and HelloRun blog
  integration.

Repository verification means the implementation and its recorded focused
tests exist. It does not imply that every workflow has been exercised against
production services.

## Implemented, Production or Live Verification Pending

- Validate runner, organiser, and administrator workflows on deployed phone,
  tablet, and desktop layouts, including weak-connectivity onsite behavior.
- Verify organiser onboarding with a real ID OCR upload, restricted paid-event
  gating, and trusted-organiser auto-publishing.
- Run the administrator export, mutation-limit, permission-tier, and
  submission-smarts integration suites only after a safe non-production
  database environment exists.
- Confirm certificate, accumulated-challenge reconciliation, upload, policy,
  email, queue, Redis, and worker behavior in the deployed environment.
- Confirm the July public, runner, organiser, policy, blog, running-group, and
  proof-review refinements through supervised browser smoke tests.
- Apply and audit the additive step-competition migration and legacy backfill,
  run the step-only and legacy accumulated-distance smoke workflows, then
  enable `FEATURE_STEP_COMPETITIONS_ENABLED`. The repository implementation is
  complete and the flag is off by default — but see the correction below: the
  flag hides the organiser controls rather than disabling the feature.


## Operational Work Pending

- **Critical audit history has a gap.** Every `audit_critical` write failed until the
  insert was fixed on August 7 — postgres.js was building a select rather than an
  insert, and the background caller only logged it. Payment approvals, submission
  reviews, cancellations and staff changes made before that date were not recorded and
  cannot be reconstructed.

- **Residual shadow gaps are orphaned data, not sync faults.** After repairing users,
  events, registrations and submissions on August 7, what remains points at records
  hard-deleted from Mongo: 48 of 108 onsite registrations reference deleted events, and
  1,136 of 1,211 submissions reference deleted users or events. Decide whether to prune
  those Mongo rows or leave them; no backfill can resolve them.
- **Step-competition verification is still outstanding.** Migration `022` was applied on
  August 7 because it was blocking the event and submission shadows, but its own audit,
  legacy backfill, and step-only/legacy accumulated-distance smoke workflows have not
  been run.
- **`FEATURE_STEP_COMPETITIONS_ENABLED` does less than this document previously implied.**
  Verified August 8: it is read only when building organiser form data, so it hides the
  Competition Metrics controls on the create/edit event forms. `applyEventFormData` still
  normalises and writes `challengeMetrics`, `primaryChallengeMetric` and `targetSteps`
  from any posted body, with no flag check. "The flag is off" therefore means the controls
  are hidden, not that the feature is disabled. Tracked as a fix in
  [ROADMAP.md](ROADMAP.md).


- ~~Deploy `b70b50d` (guest event-page 500).~~ **Resolved August 7.** It shipped with
  the onsite merge; a signed-out request to a real event URL now returns `HTTP 200`,
  verified against production.
- ~~Production was fully down — `502` on every route, including `/healthz` and
  `/readyz`.~~ **Resolved August 10.** `hellorun`'s `.env` `PORT` had drifted to
  `3000`; nginx's live config for this site proxies to `3002`, and `3000` was
  already held by an unrelated app (`hellotasks`) on the same host, so `hellorun`
  crash-looped on `EADDRINUSE` for 600+ PM2 restarts. Fixed by correcting `PORT`
  and restarting only the `hellorun` process; `/healthz`, `/readyz`, and a spread
  of public pages verified live afterward. This also corrected a standing
  documentation error: this document and
  [the deployment runbook](operations/deployment-runbook.md) previously described
  Render hosting — production runs via PM2 + nginx + a Cloudflare Tunnel on a
  single host, not Render.
- Deploy the current revision and complete the AdSense crawl/review procedure.
- Configure and verify production Redis plus Cloudflare Tunnel/nginx client-IP
  handling.
- Create an isolated development or staging data environment and enforce a
  live-database test guard.
- Remove the two narrowly identified placeholder users from the earlier purge
  incident with an explicitly approved production operation.
- Verify backup/restore and graceful-deployment procedures.

## Active Engineering Follow-Up

The canonical active plan is [`improvement-plan/README.md`](improvement-plan/README.md).
Open themes include:

- remaining process and environment safety-net checks;
- CQ-3 organiser authorization-chain unification, which needs supervised
  runtime verification;
- request-path and asset efficiency work that depends on measurement;
- server-spawning test open-handle investigation;
- residual event-promotion delivery/unsubscribe refinements listed in
  [`improvement-plan/event-promotion-follow-ups.md`](improvement-plan/event-promotion-follow-ups.md).

## Backlog

- Advanced platform analytics and reporting beyond the implemented baseline.
- Mobile-app integration after the web workflows and operational safeguards
  are stable.

## Historical Status

The former detailed completion table is preserved at
[`archive/status/status-through-2026-07-15.md`](archive/status/status-through-2026-07-15.md).
Implementation history after that date is summarized in
[`changelog/2026-07-july.md`](changelog/2026-07-july.md).

## Documentation Reconciliation Verification

On July 31, 2026:

- the repository-wide Markdown audit found no missing H1 titles, unbalanced
  fences, heading-level jumps, exact duplicate documents, or broken relative
  links;
- the focused event-promotion documentation consumer test passed 9/9;
- the DB-free unit suite passed 933/933;
- no live-database integration suite was run.
