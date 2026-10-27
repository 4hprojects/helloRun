# HelloRun Current Status

**Source of truth for delivery status**

**Last reconciled:** October 27, 2026

**Evidence window:** repository and GitHub delivery-control verification through
October 27, 2026, based on `main` at `817ed87`

**Forward priorities and the tracked checklist:** [ROADMAP.md](ROADMAP.md)

**Deploying, verifying or rolling back:** [operations/deployment-runbook.md](operations/deployment-runbook.md)

## Implemented and Repository-Verified

The repository contains implementation and focused automated coverage for the
core platform:

- authentication, account recovery, role-aware access, abuse protection, and
  administrator permission tiers. Password, Google, and email-verification
  auto-login now regenerate the session ID before authenticated state is set;
  focused tests also prove a demoted administrator immediately loses sync-health
  access;
- one validated client-IP resolver now supplies all abuse, rate-limit, consent,
  provider-metadata, blog-view, and audit paths. Raw forwarded-header parsing is
  gone and Cloudflare header trust defaults off pending the deployed origin
  spoof check;
- Lucide and Quill browser assets are pinned and served locally, their former
  CDN origins are removed from CSP, and all 336 view script elements carry a
  response nonce. All legacy event-handler attributes are migrated and
  `script-src-attr 'none'` is enforced; deployed CSP-console verification is
  still pending;
- shared accessible confirm, prompt, and toast primitives replace native
  browser dialogs; declarative handlers replace inline attributes. A static
  inventory covers all 171 same-origin POST forms and caught the repaired
  payment-proof CSRF omission. Deployed keyboard, assistive-technology, and
  no-JavaScript checks remain pending;
- repository CI, Dependabot, syntax/template, non-rewriting format, and
  Markdown-link gates are defined. Local gates pass; GitHub required-check and
  deployment enforcement remain unverified;
- the five BUG-01 persistence/worker defects are repository-fixed: standard
  honor confirmation and treadmill OCR persist, bulk rejection uses a narrow
  not-found fallback, new critical-audit failures replay idempotently, and both
  scheduled blog publishers share an atomic lease claim. Legacy audit failures
  without a payload remain unrecoverable; the owner accepted the documented
  non-reconstruction controls under DEC-02 on October 22;
- event creation and management for virtual, onsite, and hybrid workflows;
- runner registration, payment proof, run-proof and accumulated-activity
  submission, organiser review, results, leaderboards, certificates, and
  achievement badges;
- organiser dashboards, registrant/review queues, bulk actions, event
  promotion, analytics, audit workflows, and running groups;
- event promotion now includes signed email-context unsubscribe, opt-out-aware
  and platform-quota-capped recipient previews, exact-count confirmation,
  atomic same-day duplicate prevention, hardened email URLs/subjects, and
  direct admin/organizer route coverage. A supervised deployed provider send
  remains pending;
- event scheduling now interprets organizer wall-clock input in Asia/Manila
  independently of the Node process timezone. Critical registration, dashboard,
  history, and confirmation-email times show confirmed runner-local and official
  Manila equivalents; Strava keeps authoritative UTC and source-local evidence
  separately. Historical production timestamp sampling remains pending;
- the Submitted Entries workspace has its completed responsive polish: compact
  summary/filter controls, clear standard/personal-record/challenge identity,
  touch-safe entry actions, distinct empty states, and accessible progressive
  feedback, with ownership and action contracts unchanged;
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
  organiser walk-in registration at the check-in desk — repaired August 8 and
  verified from its own form in a browser on August 9, which is the check that
  found the defect in the first place — and bulk registrant import
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
  when a registration is cancelled; releasing a kit no longer blanks the
  registration's Postgres shadow row, which had been removing the runner's bib and
  check-in from the race-day console (fixed August 10);
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
  notifies the runner) with a quick-reason dropdown and an optional note, and rejected
  entries offer Approve again. Approving still requires the
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
  distance, elapsed time, run date, location, activity type, elevation gain, steps and
  tracking app or device on any status (reason required; steps and device stay required
  where the event requires them, and OCR mismatch warnings are recomputed from the
  corrected values); the runner is notified by email and in-app, each correction is audit-logged
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

- The October–December editorial calendar was reconciled read-only against production
  on October 20. All 47 planned slugs exist: ten due records are published and 37 are
  scheduled on their canonical future dates. All are publication-eligible, every one of
  the 38 health/safety records passes its review gates, metadata is present, and the
  101-article/1,041-link repository audit has zero failures. All remain deliberately
  `noindex` pending separate expert/value indexing review. See the
  [calendar audit](analysis/2026-10-20/editorial-calendar-audit.md); final scheduler
  confirmation remains time-gated through December 31 under `CONTENT-01`.

- The October 20 production time audit compared five Mongo/Postgres instants for every
  active non-personal event. Ten events match completely; CNS Move More has stale shadow
  values for registration open, registration close, and final submission deadline. No
  value was changed pending organiser confirmation. The same review fixed Manila-midnight
  birth-date validation and server-local age calculation, with 29 new/related focused
  cases passing. See the [timezone audit](analysis/2026-10-20/production-timezone-audit.md).

## Implemented, Production or Live Verification Pending

- Platform-aware OCR, optional activity-link review, immutable extraction history,
  reviewer-labelled training samples, dataset snapshots, manually initiated training,
  model activation/rollback, reminders, analytics, and research export are merged into
  `main` as of October 19. The follow-up notice-and-objection training basis and guarded
  historical backfill are also merged. Every feature flag remains off by default, no
  production rollout has occurred, no real-screenshot accuracy baseline exists, the
  policy drafts still need legal review/publication, and native training tools have not
  been installed on the host. Repository completion must not be read as accuracy or
  deployment evidence. See
  [`improvement-plan/ocr-platform-aware/IMPLEMENTATION-PROGRESS.md`](improvement-plan/ocr-platform-aware/IMPLEMENTATION-PROGRESS.md)
  and the canonical rollout task `REL-03` in [ROADMAP.md](ROADMAP.md).

- Review decision history is repository-complete (October 15): an append-only
  `ReviewDecision` collection records every run-proof, accumulated-activity and
  payment-proof decision with its evidence snapshot, and run-proof `rejectionCode` /
  `manualReviewChecklist` are now actually persisted. On October 20 an isolated MongoDB
  integration wrote and read the decision evidence and persisted a rejected submission's
  code and reason. Not deployed; decisions made before deployment have no history rows.
- Linked-entry review is repository-complete (October 15): a manual approve or reject on
  one entry of a multi-event submission applies to every linked entry still awaiting
  review, across organisers and accumulated challenges, and is recorded with
  `ReviewDecision.linkedFrom`. The October 20 isolated integration wrote a source decision
  plus linked standard and accumulated decisions, verified both references, and confirmed
  that the source stayed independent. A supervised deployed workflow remains pending.
- The private Strava viewer launch implementation is repository-complete behind
  `STRAVA_PRIVATE_VIEWER_ENABLED=false`: owner-only on-demand activity viewing,
  production readiness checks, explicit consent copy, official connection branding,
  durable deletion confirmation, crash-recoverable webhook/revocation queues, and
  webhook subscription tooling. Official event submission remains hard-blocked.
  Commit `6e76cec34cfea872ea691d1d860741d241adb7da` was deployed disabled through
  HelloDeploy release 11 on October 9. Public `/readyz` reports Mongo ready, Redis not
  configured, and the Strava viewer disabled; the event-submission endpoint remains
  HTTP 403. Privacy Policy v1.8 and Data Usage Policy v1.3 are live and their Strava
  deletion-confirmation language was verified. The production remediation dry run
  recorded target fingerprint `6c5d9cb2d01a8b1e`, 10 accumulated records, 3
  connections, 1 affected user, 1 event, and 1 duplicate-athlete group. Remediation
  apply remains blocked pending explicit maintenance/backup approval, and Strava's
  subscription API returns HTTP 403 for the configured application credentials, so
  webhook registration, enablement, and supervised OAuth/deauthorization smoke tests
  are still required. HelloDeploy release 10 built but failed activation after a local
  development worker consumed the production job without Docker permission; pausing
  that worker allowed release 11 to complete, and it was then resumed. See
  [`implementation/private-strava-viewer-launch.md`](implementation/private-strava-viewer-launch.md).

- Verify the installable PWA added October 3 after deploy:
  - `/manifest.webmanifest`, `/sw.js`, and `/offline.html` load over HTTPS. The
    first and third return `no-cache`, but Cloudflare currently rewrites
    `/sw.js` to `max-age=14400` and serves it as `REVALIDATED`. The repository
    now sends browser/CDN `no-store`; the Cloudflare TTL rule must exclude and
    purge `/sw.js` before the update behavior can pass.
  - Chrome on Android shows **Install HelloRun** and installs the app.
  - iPhone Safari shows Add to Home Screen guidance and no native prompt.
  - The installed app hides the install control.
  - A second deploy surfaces the update prompt.
  - Registration, payment-proof and run-proof POSTs still reach the network.
  Remaining navigation and responsive work is tracked in
  [`improvement-plan/ui-pwa-follow-ups.md`](improvement-plan/ui-pwa-follow-ups.md).

The organiser race-day chain — walk-in, bib, check-in, kit release, result
record and approve, and cancellation — was walked through its own interfaces on
August 9 and is no longer on this list. It was checked against a **local server
on the current commit**, not against production, and not on a phone; both of
those remain open below.

- Validate runner, organiser, and administrator workflows on deployed phone,
  tablet, and desktop layouts, including weak-connectivity onsite behavior.
- Verify organiser onboarding with a real ID OCR upload, restricted paid-event
  gating, and trusted-organiser auto-publishing.
- The isolated administrator export, mutation-limit, permission-tier,
  submission, and OCR gates are complete. The final results were 527/527
  integration tests, 46/46 guarded OCR tests, and 2,486/2,486 unit tests. The
  named-volume reset/reseed left zero sync-failure or dead-letter rows. See the
  [baseline report](analysis/2026-10-20/isolated-integration-baseline.md).
- Confirm certificate, accumulated-challenge reconciliation, upload, policy,
  email, queue, Redis, and worker behavior in the deployed environment.
- Confirm the July public, runner, organiser, policy, blog, running-group, and
  proof-review refinements through supervised browser smoke tests.
- Apply and audit the additive step-competition migration and legacy backfill,
  run the step-only and legacy accumulated-distance smoke workflows, then
  enable `FEATURE_STEP_COMPETITIONS_ENABLED`. The repository implementation is
  complete and the flag is off by default. The write boundary now also rejects
  attempts to introduce step settings while disabled; existing step events retain
  their stored configuration when edited.


## Operational Work Pending

- **Production Supabase Data API lockdown is urgent and unapplied.** The October 20
  read-only preflight found migration 027 absent, RLS disabled on all 36 public tables,
  broad `anon`/`authenticated` grants across 49 table/view objects, and no
  `security_invoker` setting on any of 13 views. The application `postgres` role passes
  the migration's RLS-bypass guard. No SQL was applied because a recoverable backup and
  rollback decision have not been approved; see the
  [preflight record](analysis/2026-10-20/production-rls-preflight.md).

- **October Active Run artwork remains unapplied.** The October 20 production dry run
  found the intended event, certificate template, and existing four CDN assets without
  mutating them. Dimension-normalized pixel comparisons show the live banner, poster,
  logo, and badge are not the committed replacements. `REL-09` therefore still requires
  an approved apply followed by public event, badge, and certificate visual checks.
- **Approved-organiser role reconciliation is complete.** The October 20 production
  dry run found zero accounts with `role: runner` and `organizerStatus: approved`, so no
  role writes or audit events were needed. All three focused role-transition cases pass.

- **PostgreSQL removal candidates are inventoried but not approved.** Production has 13
  public views: two are runtime onsite dependencies and 11 have no repository runtime
  consumer. The 11 candidates have no database dependents or retained statement calls;
  `shop_platform_fees` is empty with no foreign keys or runtime source reference. This
  cannot rule out dormant saved SQL, BI, dashboard, or ad-hoc consumers. `DEC-05` remains
  blocked on that owner inventory; no object was dropped. See the
  [consumer inventory](analysis/2026-10-20/postgres-object-consumer-inventory.md).

- **Fixture-account quarantine is selected and dry-run verified.** The October 27
  Mongo-only refresh found 102 active non-admin `@example.com` accounts, 38 test-data
  events, 70 fixture-only registrations, one fixture submission, and no real or guest
  participant. Five blogs remain, including one published, with five referenced assets.
  The reversible migration suspends accounts and archives blogs while preserving all
  records and R2 assets. Apply remains blocked because the full cross-store refresh hit
  Supabase DNS failure and a current MongoDB backup is not yet recorded. No production
  record changed; see the
  [fixture audit](analysis/2026-10-20/production-placeholder-user-audit.md).

- **Critical audit history has an unrecoverable coverage gap.** The malformed service
  insert was fixed on August 7, but the production ledger is not simply empty before
  then: 344 of 908 current rows carry earlier event dates. Three known legacy failures
  remain dead letters, and the total missing population is unknowable because neither
  deployment history nor every failed attempt was durably retained. Synthesizing actor,
  before-state, or timestamps would invent evidence. The October 20 review also fixed
  string-encoded retry context and verified the real failure-writer-to-worker path in
  isolation. On October 22 the owner accepted the prepared
  [decision record](analysis/2026-10-20/critical-audit-history-gap.md): no synthetic
  history, retention of the three dead letters, continued disclosure of the gap, and
  incident handling for new unresolved failures. Deployment remains tracked separately.

- **Residual shadow gaps are retained orphaned evidence, not sync faults.** The October 20 read-only
  refresh found 88 current onsite registrations; all reference unavailable events (48
  hard-missing and 40 soft-deleted). Across 1,076 single-activity and 1,325 accumulated
  submissions, 1,116 have an unavailable runner, event, or registration reference;
  every submission still resolves to a registration. The older August population has
  therefore been superseded by the [current count audit](analysis/2026-10-20/production-mongo-orphan-audit.md).
  On October 27 the owner chose retain-in-place: no source row, shadow row, or proof
  object is deleted, reconstructed, or relinked. Operator queues already require
  accessible events. OCR, shadow, and step-default backfills now exclude unavailable
  references while retaining legitimate guest rows. A future disposal proposal requires
  a new decision, current exact manifest, cross-store/R2 plan, and recoverable backup.
- **Step-competition production verification is still outstanding.** On October 20 the
  isolated database was audited: migration `022` is recorded, every expected PostgreSQL
  column has the intended nullability, and a real MongoDB legacy row passed dry-run,
  explicit apply, and repeat-apply idempotence checks. The operator command now defaults
  to dry-run and requires the separate `:apply` command to mutate. Seventy isolated
  form/backfill/submission cases and 87 step/UI cases pass. Production backfill output,
  supervised step-only and legacy browser workflows, flag enablement, and monitoring
  remain pending under `REL-06`.


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
  Render hosting. That August topology was later replaced by a HelloDeploy-managed
  container behind nginx and the Cloudflare Tunnel; Render remains the unverified
  backup origin.
- **Current deployment evidence is incomplete (October 20).** Public `/healthz`
  and `/readyz` return HTTP 200, Mongo is ready, Redis is not configured, and the
  Strava viewer is disabled. The response includes
  `x-hellodeploy-route: hellorun.online`, confirming the HelloDeploy primary, but
  `/healthz` reports both `commit` and `commitShort` as `unknown`. The currently
  served revision therefore cannot be verified from the application until build
  metadata is supplied to the container and a new release is checked. See
  [the deployment runbook](operations/deployment-runbook.md#2-verifying-a-deploy-actually-landed).
- **Served-commit capture is repository-complete.** The install hook now records the
  checked-out SHA, branch, and build time into an ignored image artifact before runtime
  `.git` can disappear. `/healthz` reads environment metadata first, then that captured
  artifact, then development `.git`. Seventeen deploy-hygiene cases and a local capture
  of `0c1fd86` pass. Production remains `unknown` until this revision is deployed and
  verified, so `OPS-01` is still in progress rather than complete.
- **The October 20 public deployment fingerprint still predates the repository
  hardening.** The homepage loads Lucide from `unpkg`, CSP still permits the
  legacy CDN/inline behavior, and the new vendored Lucide/Quill URLs return 404.
  This confirms the unpublished revision has not landed; it is the baseline for
  the post-deployment `SEC-03` comparison. See the
  [public smoke record](analysis/2026-10-20/public-deployment-smoke.md).
- **October Active Run 2026 artwork swap.** The event went live on October 3 with a
  banner and poster derived from the September artwork. Replacement artwork is
  committed; run `npm run event:update-october-active-run-2026-artwork -- --apply` to
  publish it to the live event and its badges.
- Deploy the current revision and complete the AdSense crawl/review procedure.
- Configure and verify production Redis plus Cloudflare Tunnel/nginx client-IP
  handling.
- The isolated loopback MongoDB/PostgreSQL development tier, deterministic seed,
  reset workflow, and strengthened boot/test guards were completed October 20.
  See the [environment runbook](operations/isolated-development.md). `OPS-06`
  is complete; provider-backed restore and deployed verification remain separate
  blocked or verification-pending tasks.
- The two narrowly identified `purge.runner` / `purge.organizer` placeholder users are
  already absent from both production stores; `DEC-04` closed without mutation. A
  separate read-only preview now finds 102 active non-admin `@example.com` fixture
  accounts. Reversible quarantine is selected under `DEC-07`; cross-store preflight and
  current backup evidence still gate apply. See the
  [placeholder audit](analysis/2026-10-20/production-placeholder-user-audit.md).
- Verify backup/restore and graceful-deployment procedures.

## Active Engineering Follow-Up

The canonical backlog is [ROADMAP.md](ROADMAP.md). Detailed engineering and
rollout context is indexed by
[`improvement-plan/README.md`](improvement-plan/README.md).
Open themes include:

- remaining process and environment safety-net checks;
- CQ-3 organiser authorization-chain unification is repository-complete across
  event-scoped participant and proof-review routes; supervised deployed
  200/403/404 runtime verification remains;
- request-path and asset efficiency work that depends on measurement;
- server-spawning test open-handle investigation;
- platform-aware OCR, activity verification and training: Phases 0–6 plus the
  notice-and-objection/backfill follow-up are merged and repository-verified on
  `main` (not deployed; every feature flag defaults off). No accuracy has been
  measured on labelled real screenshots, no real Tesseract training run has
  happened (tools not installed; host change needs approval), and rollback has
  not been rehearsed in staging (none exists). See
  [`improvement-plan/ocr-platform-aware/IMPLEMENTATION-PROGRESS.md`](improvement-plan/ocr-platform-aware/IMPLEMENTATION-PROGRESS.md);
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

On October 19, 2026:

- all 262 Markdown files were reviewed under the canonical ownership rules;
- ROADMAP became the sole detailed backlog, with every incomplete task assigned
  a priority, phase, dependency, state, and completion-evidence requirement;
- every file containing unchecked task boxes was classified as active,
  verification-only, deferred, historical, or an acceptance example;
- the superseded June review and PWA pack moved into the existing archive
  taxonomy, and `docs/to do/` was removed; and
- the repository-wide Markdown audit found zero broken relative links, files
  without exactly one H1, unbalanced code fences, or heading-level jumps.

Application tests were not rerun for the October 19 documentation-only
reconciliation; no application code, route, schema, or runtime policy source
changed in that reconciliation. On October 20, the new isolated tier ran the
focused guard tests, the final 527/527 integration gate, the 46/46 OCR gate,
and the 2,486/2,486 unit gate described above.

After the October 20 implementation and audit follow-ups, the expanded DB-free
unit gate passed 2,524/2,524 in 720.1 seconds. The final October 22 candidate
also passed 545/545 isolated integration tests in 1,014.8 seconds and 46/46
isolated OCR tests in 58.0 seconds. The eight files whose source assertions were
synchronized with the nonce, shared-middleware, status-copy, image-fallback,
and client-IP changes also pass as a focused 134/134 group. The earlier 2,486
unit and 527 integration totals remain the evidence for the original
isolated-environment baseline at the time it was recorded. The final reset
left only deterministic seed data, zero registrations/submissions or sync
failures, and no OCR collections.

GitHub delivery controls are complete as of October 27. PR #19 merged the
repository gate, and the resulting `main` run passed. Branch protection now
requires an up-to-date `verify` check and a pull request, applies to
administrators, blocks force pushes and deletion, and requires resolved
conversations. Controlled PR #27 failed on deliberate invalid syntax at
`5e18c86` and reported `BLOCKED`; recovery commit `3660f5f` passed and restored
`CLEAN`. The proof PR closed without merging its temporary content. See the
[GitHub controls audit](analysis/2026-10-20/github-delivery-controls-audit.md).

After adding the isolated-environment runbook, test evidence, and calendar audit on October 20,
the same Markdown audit passed across all 265 Markdown files: one H1 per file,
balanced fences, no heading-level jumps, and zero broken relative links. Root-
relative application routes were checked as web paths rather than filesystem
links.

On July 31, 2026:

- the repository-wide Markdown audit found no missing H1 titles, unbalanced
  fences, heading-level jumps, exact duplicate documents, or broken relative
  links;
- the focused event-promotion documentation consumer test passed 9/9;
- the DB-free unit suite passed 933/933;
- no live-database integration suite was run.
