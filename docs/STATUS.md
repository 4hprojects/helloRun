# HelloRun Current Status

**Source of truth for delivery status**

**Last reconciled:** August 7, 2026

**Evidence window:** repository history through July 29, 2026

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
- results import from a CSV or XLSX with preview-then-commit, and event-scoped
  race-day staff who can be given `check_in`, `race_kit`, or `results` access to a
  single event without touching the global `User.role`; and runner-initiated
  cancellation requests that the organiser reviews rather than auto-cancelling;
- shop, cart, registration add-ons, platform merchandise, reporting, and
  settings;
- blog authoring/moderation, scheduled publishing, community comments,
  editorial content, policies, contact, FAQ, consent, and AdSense-related
  crawl/content support;
- responsive runner, organiser, administrator, event-discovery, policy, and
  public-content refinements committed through July 29;
- session-based organizer and runner workspaces, including verified-organizer
  participation in other organizers' events and own-event conflict guards;
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
  complete and the flag remains disabled by default.

## Operational Work Pending

- **Investigate 420 unresolved `sync_failure_log` entries**, 411 of them submissions
  reading "App user not found". The user and registration shadows were repaired on
  August 7, so re-running the submission shadow backfill may now clear most of these;
  they have not been retried since.

- **Migration `022_step_competition_events.sql` is still pending and was failing.**
  Its `CREATE OR REPLACE VIEW v_event_leaderboards_accumulated` inserts
  `primary_metric` ahead of `approved_distance_km`, and Postgres cannot rename or
  reorder an existing view column that way, so the whole migration aborted — and
  because the runner is strictly ordered, it blocked every later migration too.
  A `DROP VIEW IF EXISTS` now precedes the create (safe: a view holds no data and
  this one has no dependents), but **022 has deliberately not been applied**: it
  alters `submissions_core`, `rankings`, and `certificates`, and still needs the
  audit, legacy backfill, and step-only smoke workflows listed above before
  `FEATURE_STEP_COMPETITIONS_ENABLED` is turned on.

- **Deploy `b70b50d` to production (guest event-page 500).** `GET /events/:slug`
  currently returns 500 for every signed-out visitor because production is
  serving the prior commit `f1f1b46`, whose `isOwnOrganizerEvent` call threw on
  a null guest user. The fix is merged (`b70b50d`, code-only, no migration) with
  regression tests; it needs the auto-deploy to roll out, then a signed-out
  `HTTP 200` verification on a real event URL. See the
  [August 6 changelog entry](changelog/2026-08-august.md).
- Deploy the current revision and complete the AdSense crawl/review procedure.
- Configure and verify production Redis plus Cloudflare/Render client-IP
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
