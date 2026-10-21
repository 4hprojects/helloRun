# HelloRun Changelog — October 2026

## October 22 — P0/P1 release-hardening candidate

- Consolidated the repository-complete security, delivery, isolated-environment,
  authorization, timezone, promotion, worker, CSP, and service-worker changes on
  `codex/p0-p1-release-hardening`; no deployment or production mutation is implied.
- The final candidate passes 2,524/2,524 DB-free unit tests in 720.1 seconds,
  545/545 isolated integration tests in 1,014.8 seconds, and 46/46 isolated OCR
  tests in 58.0 seconds, plus the syntax/template, format, documentation/link,
  and whitespace gates.
- Updated the certificate-sharing integration harness to cover the accessible
  hidden-copy/toast fallback instead of the retired native prompt, and corrected
  the shared test-server readiness budget from ten seconds to its documented
  forty seconds for cold OCR-enabled boots.
- A final named-volume reset reapplied migrations `001`–`027` and deterministic
  seed data. Verification found five Mongo users, three Mongo events, no
  registrations or submissions, five PostgreSQL app users, two organisers,
  three events, zero sync failures, and no OCR collections.
- PR #19's first workflow exposed that the pinned Lucide and Quill JavaScript
  files were present locally but excluded by the historical vendor ignore rule.
  Commit `928825d` added only those two browser assets; the replacement GitHub
  Actions run then passed every repository check. `PRC-01` remains verification
  pending until branch or ruleset protection makes the recovered check required.

## October 22 — DEC-02 owner acceptance

- The owner accepted the pre-August critical-audit gap as an unrecoverable
  historical limitation. No historical events will be synthesized; the three
  known legacy dead letters remain incident evidence; the limitation stays
  documented; and every new unresolved critical-audit failure is an incident.
- Marked `DEC-02` complete. Deployment verification of the corrected structured
  retry path remains tracked separately and does not imply reconstructed history.

## October 22 — release-candidate integration isolation

- Added an explicit process-local upload backend for integration tests. It is
  accepted only when both `NODE_ENV=test` and `TEST_UPLOAD_STORAGE=memory` are
  set, uses a non-routable public URL, and supports upload/read/list/delete
  behavior without Cloudflare credentials or network access.
- Fixed request-locale handling for clients that send the valid wildcard
  `Accept-Language: *`; dashboard date formatting now falls back to `en-US`
  instead of raising an `Intl.DateTimeFormat` range error.
- The previously failing 36-case upload/admin/submission integration group now
  passes completely. Final full-suite totals are recorded after the clean gate.

## October 20 — OPS-01 container build metadata capture

- Added a first-step postinstall capture that resolves the full commit and branch from
  HelloDeploy/common platform variables or the build checkout, then stores them in the
  image before runtime `.git` may be removed.
- `/healthz` now resolves environment metadata first, the captured artifact second, and
  development `.git` last; it also reports `builtAt`. A local capture correctly reports
  `0c1fd86` from a fresh process without relying on the runtime resolver's Git fallback.
- All 17 deploy-hygiene cases pass. Production still reports `unknown` until this revision
  is deployed; Render failover/restore remains an external supervised drill.
- Refreshed the public read-only baseline: `/healthz` and `/readyz` return 200,
  Mongo is ready, Redis is unconfigured, Strava is disabled, and HelloDeploy
  still reports an unknown commit. The homepage retains the old `unpkg`/inline
  CSP fingerprint and the new vendor URLs return 404, independently confirming
  the repository revision is not yet deployed.

## October 20 — REL-05 service-worker cache boundary

- Verified the public core routes, manifest, service worker, and offline page
  return HTTP 200, then found that Cloudflare rewrites `/sw.js` to a four-hour
  `max-age` and serves it as `REVALIDATED`.
- Hardened the service-worker origin response with browser `no-store`, generic
  CDN `no-store`, and Cloudflare-specific CDN `no-store`. Eleven focused PWA
  cases pass.
- A Cloudflare Cache Rule may override every origin directive, so excluding and
  purging `/sw.js` remains an explicit deployment gate before device update
  behavior can pass.

## October 20 — DEC-07 fixture downstream-impact audit

- Added a reusable read-only fixture-impact command covering Mongo participant/event
  dependencies, asset references, and the PostgreSQL cleanup inventory.
- All 37 fixture-owned events are soft-deleted test data. Their 69 registrations belong
  only to fixture accounts, with no guest/real participants, submissions, or review and
  onsite-adjacent records. The one outside registration also points to soft-deleted test
  data. PostgreSQL contains no matching shadows or dependent rows.
- Five non-deleted fixture-authored blogs remain, including one published, with five
  asset references. No deletion was attempted; their content/R2 disposition, backup,
  exact operation manifest, and explicit owner approval still gate `DEC-07`.

## October 20 — DEC-02 audit-gap record and retry-path correction

- Reconciled the historical claim against production: 344 of 908 current critical-audit
  rows carry pre-fix event dates, while three known pre-fix failure rows are dead letters.
  Exact coverage remains unknowable; the decision record recommends acknowledging the
  gap without synthesizing evidence and awaits explicit owner acceptance.
- Found that the shared sync-failure writer stored context as a JSON string although the
  retry worker expects an object. Changed it to structured `sql.json(context)` storage and
  changed the integration test to exercise the real writer rather than a direct insert.
- Five focused unit cases and both real-database BUG-01 cases pass, including successful
  idempotent replay and resolution of a newly failed critical-audit event.

## October 20 — DEC-05 PostgreSQL consumer inventory

- Corrected the old ten-view estimate: production has 13 public views, two used by
  runtime onsite code and 11 removal candidates with no application runtime reference.
- Read-only catalog inspection found no dependent view or stored function for any view.
  Retained statement statistics since September 9 contain no calls naming them.
- `shop_platform_fees` is empty with no foreign key, stored-function, or runtime source
  consumer. No object was dropped; saved SQL, dashboards, BI, automation, and ad-hoc
  consumers still require explicit owner confirmation under `DEC-05`.

## October 20 — DEC-01 orphan-record count refresh

- Added a reusable read-only MongoDB orphan audit and refreshed the superseded August
  figures without exposing record identifiers or changing data.
- Production currently has 88 onsite registrations, all tied to unavailable events:
  48 hard-missing and 40 soft-deleted. Across 2,401 single and accumulated submissions,
  1,116 have an unavailable runner, event, or registration reference; all still resolve
  to a registration.
- No deletion was attempted. Retention scope, cross-store/R2 handling, a recoverable
  backup, and explicit owner approval remain required under `DEC-01`.

## October 20 — DEC-04 placeholder verification and DEC-07 fixture discovery

- Verified read-only that the two documented `purge.runner` / `purge.organizer`
  placeholder patterns match zero Mongo users and zero PostgreSQL app-user shadows.
  `DEC-04` is complete without mutation.
- The broader cleanup preview separately found 99 active non-admin `@example.com`
  fixture accounts with 37 events, 70 registrations, and related communication records.
  No records were deleted; classification, downstream analysis, backup, and owner
  approval are tracked independently under `DEC-07`.

## October 20 — TIME-01 production shadow and date-only audit

- Compared the five event schedule instants across production MongoDB and PostgreSQL.
  Ten active non-personal events match completely; CNS Move More has three stale shadow
  values. No historical value was changed pending organiser confirmation.
- Fixed a Manila-midnight boundary where today's birth date could be rejected while UTC
  was still on the prior day, and made age calculation independent of process timezone.
- Three explicit boundary cases, 34 related timezone/presentation cases, all 13 runner
  profile integrations, and all 13 admin/onboarding integrations pass.

## October 20 — OPS-04 production RLS preflight

- Added a reusable, read-only public-schema audit command and ran it against production
  and the isolated control without exposing credentials.
- Production has not applied migration 027: all 36 public tables have RLS disabled,
  both Data API roles retain broad grants across 49 objects, and zero of 13 views use
  `security_invoker`. The application role passes the migration guard.
- The isolated control reports migration 027, 36/36 RLS tables, no Data API table grants,
  and 13/13 invoker views. Production apply remains gated on recoverable backup/rollback
  approval and project-side denial, smoke, and Security Advisor checks.

## October 20 — CONTENT-01 production calendar reconciliation

- Reconciled all 47 October–December planned slugs against production without mutation:
  ten due articles are published and 37 future articles are scheduled correctly, with
  no missing records or scheduler errors.
- Confirmed publication eligibility for all 47 records, complete review gates for all 38
  health/safety articles, and required cover, alt, and SEO metadata. The content-link
  audit validates 101 articles and 1,041 links with zero failures.
- Preserved deliberate `noindex` state pending separate expert/value indexing review.
  Final publication confirmation remains time-gated through December 31.

## October 20 — REL-09/REL-10 production dry-run reconciliation

- The approved-organiser repair queried production in dry-run mode and found zero
  runner/approved mismatches (`matched: 0`, `modified: 0`). No apply or audit rows were
  necessary; the three focused transition guards pass, so `REL-10` is complete.
- The October Active Run artwork dry run resolved the event, certificate template, and
  four current CDN assets without mutation. Dimension-normalized image comparisons show
  those assets do not match the committed replacements; `REL-09` remains pending an
  approved apply and public visual confirmation.

## October 20 — REL-06 isolated step-competition rollout rehearsal

- Changed the legacy event backfill to dry-run by default and added an explicit apply
  command, conflicting-argument rejection, environment-path support, and a reusable
  test boundary.
- Proved on isolated MongoDB that dry-run makes no change, explicit apply repairs only
  the legacy distance event, modern step configuration is untouched, and repeat apply
  is a no-op. Direct PostgreSQL inspection confirmed migration 022 and all expected
  step-competition columns.
- Seventy isolated form/backfill/submission cases and 87 step/UI cases pass. Production
  backfill, browser workflows, flag enablement, and monitoring remain rollout gates.

## October 20 — REL-02 isolated review-history verification

- Added a guarded real-MongoDB integration for review history rather than relying only on
  schema and mocked-service assertions. It writes and reads the evidence snapshot and
  verifies that a rejected submission retains its structured code and reason.
- Recorded one source decision and linked decisions for both a standard submission and an
  accumulated activity. Both linked rows retained `linkedFrom`, while the source decision
  remained independent. The isolated case passes; a supervised deployed review still
  gates completion.

## October 20 — TIME-01 deterministic schedules and runner-local critical times

- Centralized Manila wall-clock parsing and event-form restoration so schedule
  values resolve to the same UTC instant under UTC, Manila, and New York process
  timezones.
- Added paired confirmed-runner/official-Manila critical times to registration
  review, runner dashboard journeys, registration history, and confirmation
  email, with an explicitly labeled Manila fallback for unconfirmed profiles.
- Preserved Strava authoritative UTC and source-local evidence separately and
  prevented auto-acceptance when the exact activity instant is absent. Sixty
  focused cases pass; historical production sampling and deployed checks remain.

## October 20 — UX-02 Submitted Entries workspace polish

- Completed the compact summary/search/filter layout and responsive entry-card
  hierarchy for standard event submissions, personal records, and accumulated
  challenge activities without changing ownership, status, resubmission, proof,
  or certificate contracts.
- Added touch-safe actions, distinct filtered/unfiltered empty states, visible
  focus treatment, reduced-motion support, and busy/copy/unsaved-change feedback.
- Twenty-one presentation/template tests and all 28 isolated route scenarios
  pass across authentication, ownership, filters, detail/proof access, correction,
  and certificate paths.

## October 20 — BUG-01 persistence and worker defect set

- Added the missing standard-submission honor-confirmation field and carried it
  through create, resubmit, and personal-record payloads. Added `treadmill` to
  both stored OCR enums and the sanitizer allowlist.
- Narrowed admin bulk-reject fallback: accumulated review is attempted only
  when the standard service returns its explicit not-found code; authorization,
  stale-state, validation, and infrastructure errors no longer change paths.
- Made new background critical-audit failures retryable by recording the
  complete original event, timestamp, and idempotency key. The sync worker now
  replays that payload and resolves it; older sparse rows remain explicit dead
  letters because reconstructing them would invent audit evidence.
- Replaced the two independent scheduled-blog scans with one shared atomic
  claim/lease service, including stale-claim recovery and conditional publish,
  failure, and release updates.
- Passed ten focused unit/integration regressions, including two competing
  publishers against isolated MongoDB and a real PostgreSQL audit replay.

## October 20 — SEC-04 organiser event authorization chain

- Added canonical event read/mutation and participant-review middleware for
  both `:eventId` and legacy `:id` routes. The guard reloads current account
  state, rejects restricted/suspended/closed accounts, and retains owner,
  active co-organiser, full-admin, and support-admin access semantics.
- Applied the shared chain across event-scoped registrant lists and exports,
  participant messaging/cancellation/correction, payment review, run-proof
  review, activity-link checks, and submission decisions. Existing handler
  checks remain as defense in depth while the middleware provides one route
  boundary.
- Passed 16 focused guard/source cases and the existing 25-test submission
  review route suite in the isolated environment. Supervised deployed
  200/403/404 checks remain, so `SEC-04` is verification pending.

## October 20 — PRC-01 repository delivery gate

- Added a read-only GitHub Actions workflow for pushes to `main` and pull
  requests: locked install without lifecycle network calls, JS/EJS syntax,
  non-rewriting format, documentation, and the complete DB-free unit suite.
  Explicit unreachable-loopback/blank data-service variables prevent accidental
  production access.
- Added weekly grouped npm Dependabot updates and monthly GitHub Actions updates;
  major dependency upgrades remain manual.
- Added reusable repository commands: `lint:check`, `format:check`, and
  `docs:check`. The final October 20 rerun covers 1,061 JavaScript files, 181 EJS
  templates, 90 automation files, and 265 Markdown files.
- The first syntax run correctly failed on a duplicated invalid tail in
  `backfill-missing-references.js`; removed the duplicate and passed the rerun.
- After the later security, audit, and deploy-metadata follow-ups, synchronized
  the affected static assertions and passed their focused 134/134 group. The
  expanded complete DB-free unit gate then passed 2,524/2,524 in 720.1 seconds. Final local
  checks covered 1,068 JavaScript files, 181 EJS templates, 95 automation files,
  and, after adding the public deployment baseline, 273 Markdown files without an
  error.
- Audited GitHub delivery controls without changing them. `main` is currently
  unprotected, the repository ruleset collection is empty, and the baseline
  head has no checks or Actions runs. Added the exact post-publication
  pass/fail/recovery and required-check sequence to the evidence record.
  GitHub required-check/deployment enforcement remains, so `PRC-01` is
  verification pending.

## October 20 — SEC-03 vendored assets and CSP nonce rollout

- Vendored Lucide 0.468.0 and Quill 1.3.7 JS/CSS with third-party license
  notices, changed every view to local asset URLs, and removed `unpkg` and
  `jsdelivr` from script, style, and connection CSP directives.
- Added a cryptographically random response nonce and applied it to all 336
  script elements across 180 EJS templates. `script-src-elem` now enforces the
  nonce. Migrated all 29 inventoried legacy event-handler attributes to
  declarative listeners and changed `script-src-attr` to `'none'`.
- Passed 31 focused asset/editor/PWA tests, three vendoring/CSP regressions, the
  live response-nonce integration check, an all-template compile audit, and
  local HTTP delivery checks for all three assets. The handler inventory and
  repository syntax/template gate also pass. Deployed icon/editor and CSP
  report checks remain, so `SEC-03` is verification pending.

## October 20 — SEC-05 interaction and CSRF inventory

- Replaced first-party native browser dialogs with shared keyboard-accessible
  confirm/prompt surfaces and live-region toasts. Declarative auto-submit and
  image-fallback behavior replaced the final inline handlers while preserving
  original submit-button `name` and `formaction` semantics.
- Audited 171 same-origin POST forms and fixed the missing CSRF field on the
  multipart payment-proof flow. External `mailto:` composition remains outside
  the application boundary by design.
- Four static interaction/CSRF regressions, 20 focused CSP/UI tests, 13 CSRF
  route checks, and 12 payment-route guard cases pass. Deployed keyboard,
  assistive-technology, and no-JavaScript checks remain, so `SEC-05` is
  verification pending.

## October 20 — COM-01 event-promotion safety completion

- Added signed 30-day unsubscribe links for known recipients, with a public
  success result and fail-closed invalid/expired handling. Unknown manually
  entered addresses retain the authenticated preference fallback.
- Hardened promotion subjects and HTML URLs, capped admin preview/send to the
  live platform quota, showed the exact preview count in confirmation, and
  added an atomic same-day event/audience/recipient duplicate key.
- Added four isolated route scenarios for full-admin access, opt-outs, platform
  and organiser quotas, ownership, duplicate rejection, and signed-link
  behavior. Together with focused service/source/email cases, 29 promotion
  checks pass. One supervised deployed provider send remains, so `COM-01` is
  verification pending.

## October 20 — SEC-02 canonical client-IP handling

- Added one validated client-IP resolver and migrated rate limits, auth abuse
  controls, consents, blog views, provider metadata, and critical/OCR/admin
  audits to it. Application source no longer reads raw `X-Forwarded-For` or
  directly consumes `req.ip` outside the resolver.
- Rejected malformed and multi-value addresses, normalized IPv4-mapped values,
  and made unknown-address rate-limit keys deterministic.
- Added `TRUST_CLOUDFLARE_IP_HEADER`, defaulting off. The Cloudflare header is
  used only after an operator explicitly records that direct-origin spoofing is
  blocked.
- Passed five focused resolver unit tests plus the rate-limit enforcement and
  local-auth integration checks. The deployed known-IP/origin probe remains, so
  `SEC-02` is verification pending alongside `OPS-05`.

## October 20 — SEC-01 session fixation and stale-role hardening

- Regenerated the session before establishing authenticated state for password
  login, Google OAuth callback, and email-verification auto-login.
- Preserved the validated Google return path and first-login signal across the
  rotation, and limited local OAuth endpoint overrides to `NODE_ENV=test` for
  deterministic callback coverage.
- Changed `/healthz/sync` to reload the current user role/account state rather
  than trusting the cached session role. A demoted administrator is denied on
  the next request.
- Passed 16 focused integration tests covering all three auth paths, cookie
  hardening, Google return-state preservation, and stale-role denial. Deployed
  supervised smoke verification remains, so `SEC-01` is verification pending.

## October 20 — OPS-02 isolated development and test tier

- Added loopback-only MongoDB 7 and PostgreSQL 16 services, an ignored local
  development environment template, migrations, an idempotent five-user/
  three-event seed, and a volume-scoped reset workflow.
- Strengthened non-production boot and test guards: remote data services are
  refused by default, explicit exceptions require visibly non-production
  database names, and remote Redis remains forbidden. The seed accepts only
  loopback, non-production targets.
- Applied migrations `001`–`027`, verified two repeat seed runs, passed 27
  focused environment/guard tests, and booted the application with healthy
  `/healthz` and `/readyz` responses.
- Rehearsed migration `027` with temporary Supabase-like Data API roles: all 36
  public tables had RLS enabled, application access remained available, and
  `anon`/`authenticated` plus a future-table probe were denied. Production
  application remains `OPS-04` work requiring backup and project access.
- Ran the full isolated integration baseline: 527 tests in 1,137.4 seconds,
  with 451 passing and 76 failing. Recorded the failure clusters and residual
  shadow/dead-letter cleanup as active `OPS-06` work; no production credentials
  were used.
- A second complete checkpoint passed 491 of 527 tests and reduced the active
  failure set from 76 to 36. The repair pass kept production test-data
  visibility disabled by default.
- Completed the repair set: the final isolated integration gate passed 527/527
  in 1,217.8 seconds, the guarded Mongo-only OCR gate passed 46/46 in 75.1
  seconds, and the DB-free unit gate passed 2,486/2,486 in 927.2 seconds.
- Raised the isolated MongoDB service's file-descriptor limit from 1,024 to
  65,536 after the first OCR invocation exposed handle exhaustion. The clean
  rerun completed with zero container restarts.
- Converted the local MongoDB service to a single-node replica set so
  transaction-backed workflows, including scheduled blog revision approval,
  execute in the isolated tier.
- Re-ran the documentation audit after adding the environment evidence: all
  264 Markdown files retain one H1, balanced fences, valid heading progression,
  and zero broken relative links.
- Removed and recreated only the named development volumes after the baseline,
  then reapplied all migrations and the seed successfully. Final checks found
  five Mongo users, three events, no registrations/submissions, an empty OCR
  database, and zero Postgres sync-failure or dead-letter rows. `OPS-06` is
  complete.

## October 20 — OPS-01 HelloDeploy runbook reconciliation

- Confirmed read-only that production is healthy through the HelloDeploy route:
  `/healthz` and `/readyz` return HTTP 200 and responses include
  `x-hellodeploy-route: hellorun.online`.
- Replaced the obsolete direct-PM2 deployment instructions with the current
  HelloDeploy specific-commit release, health-gated activation, retained-release
  rollback, and failure-triage procedure.
- Corrected the Cloudflare Tunnel sample to terminate at nginx on port 80 rather
  than a nonexistent service on port 3000.
- Recorded two remaining blockers rather than claiming completion: public build
  metadata is currently `unknown`, and the repository does not contain the
  Render hostname or exact Cloudflare failover control. `OPS-01` is now in
  progress and `REL-01` is blocked on trustworthy served-commit evidence.

## October 19 — Documentation reconciliation and canonical backlog

- Rebuilt `docs/ROADMAP.md` as the sole detailed backlog: 43 tasks across six
  ordered phases, each with an allowed state, relative size, dependency,
  completion evidence, and supporting source.
- Reconciled STATUS and OCR documentation with `main` at `0c1fd86`: OCR phases
  0–6 and notice/objection backfill support are merged, flags-off by default,
  and still undeployed with legal, data, infrastructure, measurement, and
  rollout gates open.
- Archived the completed June full-app review and generic PWA implementation
  pack; removed the remaining `docs/to do/` tree and labelled archived
  checklists as non-canonical.
- Classified every source file with unchecked task boxes so historical and
  acceptance-example boxes no longer compete with ROADMAP.
- Normalized Markdown structure across 262 files. The final audit reports one
  H1 per file, balanced fences, no heading-level jumps, and zero broken relative
  links.

## October 17–18 — Platform-aware OCR, activity verification and training (feature branch)

Implemented originally on `feature/platform-aware-ocr-training` and merged to
`main` through PR #17 and PR #18 by October 19; not deployed. Every feature flag
defaults off, and with them off behavior is unchanged. Details and evidence:
`docs/improvement-plan/ocr-platform-aware/IMPLEMENTATION-PROGRESS.md`.

- **Server OCR** re-reads stored run proofs in a background worker (`OCR_SERVER_PIPELINE_ENABLED`)
  with evidence-based Strava/COROS/Garmin detection and a generic fallback. With
  `OCR_SERVER_AUTO_APPROVAL_ENABLED`, auto-approval no longer trusts OCR values posted by the
  browser.
- **Optional activity link** (`ACTIVITY_URL_ENABLED`), parsed without any network request;
  reviewer link checks; duplicate-activity and near-duplicate-screenshot review flags.
- **Ground truth**: unchecked opt-in consent, private line crops, literal-transcription review,
  immutable dataset snapshots with leak-free splits, tesstrain export.
- **Manual training** in a separate, resource-limited worker; held-out evaluation with per-platform
  gates; full-admin approve, activate (checksum-verified, compare-and-set) and rollback.
- **Admin reminders**, analytics and a privacy-minimised research export.
- `ReviewDecision` evidence snapshots now include the server OCR reading, activity link and
  duplicate signals when present.
- Coverage: OCR unit tests, six local-MongoDB integration suites (39 tests) and an end-to-end
  boot test, all run through the repository DB guard.

## October 17 — Platform-aware OCR plan: Phase 0 assessment

- The approved OCR, activity-verification and training plan moved to
  `docs/improvement-plan/ocr-platform-aware/`, with a Phase 0 report in
  `IMPLEMENTATION-PROGRESS.md`. It covers the verified architecture, a gap table, security
  findings and owner decisions.
- Main finding: auto-approval relies on OCR values the browser sends. Phase 1
  will add a server-side re-read of the stored proof.
- New offline benchmark harness: `npm run ocr:benchmark`
  (`src/scripts/ocr-benchmark.js`, `src/utils/ocr/benchmark-metrics.js`). It
  reports per-platform/layout exact-field accuracy, CER, completeness and
  latency, and prints `N/A` when nothing was measured. Images and labels stay
  in git-ignored `benchmarks/ocr/local/`; samples without a consent basis are
  skipped.
- No application behaviour changed. DB-free coverage:
  `tests/ocr-benchmark.unit.test.js`.

## October 15 — Linked-entry review for multi-event submissions

- A runner who sends one proof to several events in one submission now gets **one review**.
  A manual approve or reject on any of those entries (shared `submissionAttemptId`) is
  applied to every linked entry still awaiting review, across organisers and including
  accumulated-challenge activities. The linked entries' own event rules are not re-checked,
  and their verification checklist is not required.
- The cascade never overrides an existing decision: approval follows only to `submitted`
  (and accumulated `needs_clarification`) entries, rejection only to `submitted` entries,
  so a cascaded rejection never reverses an approval. Approval reversals and accumulated
  clarification requests stay on their own entry.
- Each linked entry goes through the normal review path (shadow sync, rankings,
  certificate, notification, accumulated progress and certificate reconciliation) and
  records its own audit row and `ReviewDecision`, with a new `linkedFrom` reference and a
  review note naming the source entry and event.
- New `src/services/linked-entry-review.service.js`. The full-page review shows which other
  events a decision will also apply to, and the organiser success messages report how many
  linked entries followed. The runner submit modal and the FAQ now say that entries
  submitted together share one review.
- DB-free coverage: `tests/linked-entry-review.service.unit.test.js`.

## October 15 — Review decision history

- **Fix: run-proof rejection codes were never saved.** `rejectionCode` and
  `manualReviewChecklist` were written by `reviewSubmission` but existed only in an unused
  `commonActivityFields` object, not in `submissionSchema`, so Mongoose strict mode dropped
  them. Both are now schema fields and the dead block is gone. Past run-proof rejections
  have no code and cannot be backfilled. Accumulated activities and payment proofs were
  unaffected.
- **New append-only `ReviewDecision` collection** (`src/models/ReviewDecision.js`,
  `src/services/review-decision.service.js`). Every approve, reject, auto-approve, reversal
  and needs-clarification decision on run submissions, accumulated activities and payment
  proofs writes one row: actor, role, self-review, attempt number, code, reason, notes,
  checklist, the event's acceptance rules, and an evidence snapshot (metrics, proof key and
  hash, OCR payload, validation, suspicion flag) taken *before* the decision. Resubmission
  and approval no longer erase why an earlier attempt was decided as it was. Writes run in
  the background and never fail a review.
- Rejection rows in the Postgres critical audit now lead with `[code]`, so the trail can
  be searched by reason.
- Resubmission no longer deletes a replaced run proof or payment receipt that a recorded
  decision references, so the history keeps the image the reviewer saw. This grows R2
  storage by one file per decided-then-replaced attempt.
- Payment resubmission now also clears `paymentRejectionCode` (it kept the stale code).
- Test-data and test-user cleanup also delete `ReviewDecision` rows.
- DB-free coverage: `tests/review-decision.service.unit.test.js`.

## October 9 — Admin-approved organiser role reconciliation

- Runners whose organizer status was set to Approved through Admin → Users → Edit kept
  `role: 'runner'`. Organizer workspace access is keyed on role, so those accounts had no
  Organizer mode switch, dashboard, or event tools.
- The admin user edit now promotes an approved runner to `organiser`, matching the
  application-approval path; the existing `admin.user.role_changed` audit event records it.
  It never demotes and never changes admins. The edit form explains the behaviour.
- Added `src/scripts/repair-approved-organiser-roles.js` for existing accounts (dry-run by
  default; `--apply` writes and records audit events). Running it in production is
  operator work.
- DB-free coverage: `tests/admin-user-role-reconcile.unit.test.js`.

## October 9 — Private Strava viewer launch controls

- Added an off-by-default `STRAVA_PRIVATE_VIEWER_ENABLED` gate and readiness failure
  when an enabled deployment lacks any required Strava configuration.
- Kept connected activities owner-only and request-scoped; official event submission
  remains hard-blocked. Existing connections retain a disconnect path while viewing is
  disabled.
- Expanded pre-connect consent disclosures and replaced generic OAuth controls with the
  official Strava connection asset.
- Disconnect now creates a durable in-app and email deletion confirmation containing
  only the receipt ID, completion time, and remote-revocation status.
- Webhook and revocation work now uses atomic claims, processing leases, stale-job
  recovery, bounded retries, and expiry handling.
- Added idempotent operator commands to list, create, verify, and delete the single
  Strava webhook subscription without printing credentials.
- Superseded the historical event-submission MVP documentation with
  `docs/implementation/private-strava-viewer-launch.md`; production remediation,
  policy publishing, provider configuration, deployment, and live smoke verification
  remain operator work.

## October 8 — Injection hardening

- **Review.** Postgres is parameterised throughout (`postgres.js` tagged templates; the
  three `sql.unsafe` sites take values as `$n` and identifiers from code-defined lists).
  MongoDB inputs were coerced on every traced path (auth, public filters, search, IDs),
  and every user-supplied regex is escaped.
- **Global operator-key guard.** Requests whose query string or body carries a
  `$`-prefixed key (`?email[$ne]=x`, `{"id": {"$ne": null}}`) are refused with 400 before
  any handler runs (`src/middleware/operator-key-guard.middleware.js`). Multipart bodies,
  which multer parses later and nests from names such as `email[$ne]`, get the same check
  through the nine `upload*` middlewares in `upload.service.js`.
- **Comment adapters.** Blog and running-group comment lookups passed an invalid ID through
  unchanged, so `{"replyToCommentId": {"$ne": null}}` matched the first active comment on
  the same post. Invalid IDs now map to `null` and match nothing.
- DB-free coverage: `tests/operator-key-guard.unit.test.js`.

## October 7 — Ownership audit, shop variant IDOR, Data API lockdown

- **Route ownership audit.** All 486 routes were traced to where each checks that the
  caller may touch the resource ID. No route takes the acting user's ID from the request.
  Evidence: `docs/analysis/2026-10-07/route-ownership-audit.md`.
- **Shop variant IDOR fixed.** `PATCH`/`DELETE …/shop/products/:productId/variants/:variantId`
  (organiser and admin) updated variants by ID alone and compared the product only after
  the write had committed. Variant IDs are public on product pages, so any organiser could
  change another organiser's (or HelloRun's) variant price, stock or active state.
  `updateVariant`/`deactivateVariant` now take the product ID and scope the UPDATE to it.
  DB-free coverage: `tests/shop-variant-ownership.unit.test.js`.
- **Migration 027 — public schema closed to the Supabase Data API (not yet applied).**
  RLS enabled on every public table with no policies, `anon`/`authenticated` privileges
  revoked now and by default, and public views set to `security_invoker`. The application
  role bypasses RLS and is unaffected; the migration refuses to run as a role that does not.
  `auth.uid()` policies were not used because HelloRun does not use Supabase Auth.
  Proved on a local PGlite database; production application and verification are pending.
  DB-free coverage: `tests/public-schema-rls.unit.test.js`. Evidence:
  `docs/analysis/2026-10-07/supabase-rls-lockdown.md`.

## October 4 — Accessibility and interaction pass (phase F)

- **Audit.** 26 priority pages from the pack's migration order were checked in headless
  Chromium at 390px, as guest, runner, organiser and admin, against the local seeded
  stack. The checks:
  - targets under 24×24px (WCAG 2.2, 2.5.8; inline sentence links exempt, stretched
    links measured by their real hit area);
  - form controls, buttons and links without an accessible name;
  - images without `alt`;
  - duplicate IDs;
  - exactly one visible `<h1>`;
  - overlapping fixed bottom bars.
  Runner and guest journeys were already clean. After the fixes below, **all 26 pages
  pass every check**.
- **28 admin pages had no `<h1>`.** The title was an `<h2>`, so screen-reader heading
  navigation had no page title. Each title is now the page `<h1>`. A computed-style
  comparison before and after confirms identical size, weight, line height and box at
  390px and 1280px.
- **Small targets raised to 24px** at component level, without changing text size:
  - organiser breadcrumbs, dashboard section links, utility links, Top Events rows and
    event-list titles;
  - admin metric links, section links, sortable table headers and digest links;
  - the event detail "Browse all events" link.
- **Stretched links.** The 9px "Registrations" label on organiser event tiles and the
  related-event title links now take taps across their whole tile or card. Focus is
  shown on the container. Hit-testing confirmed every point in the area reaches the
  link.
- No overflow regressions at 320–1440px on the touched pages.
- DB-free coverage: `tests/interaction-targets.unit.test.js`.

## October 4 — Account menu

- **What signed-in users now get.** The header user area is an account menu. It
  replaces the bare "Hi, name" greeting and the separate logout icon.
  - **Desktop:** an avatar button opens a panel with **My profile**, **Install HelloRun**
    (only when the browser can install), the **runner/organiser switch**, and **Log
    out**.
  - **Phones:** the same items appear inline in the menu under "Signed in as …".
  - **Without JavaScript:** the items stay visible inline, so Log out is always
    reachable.
- **Accessibility.** The button is a disclosure (`aria-expanded` and `aria-controls`).
  Opening it focuses the first item. Escape closes it and returns focus to the button.
  Clicking outside, tabbing away, or choosing an item also closes it. The logic is
  `initAccountMenu` in `main.js`.
- **Install and workspace controls moved.** Signed-in users see Install HelloRun in this
  menu, keeping one install control per screen; guests keep it in the header. The
  workspace switch moved here from the header icon row. The profile entry comes from
  `accountMenu` in `src/config/navigation.js`.
- **Mobile menu fixes:**
  - The menu is capped to the viewport and scrolls internally. Previously, because the
    header is sticky, a long menu on a short phone (320×568) had no way to reach Log
    out.
  - An unscoped desktop `.nav .nav-user` rule was adding a stray left border and indent
    to the mobile user section; that is fixed.
- **Removed dead CSS.** The old icon-style logout button (`.nav-logout-btn`) is gone from
  `style.css` and `project-buttons.css`.
- **Verified in headless Chromium** against the local seeded stack:
  - **Viewports:** desktop at 1024, 1280 and 1440px, and phones at 320×568 and 390px.
  - **Roles:** runner and organiser.
  - **States:** menu open and closed, plus with JavaScript disabled.
  - **Keyboard:** dismissal and focus return.
  - **Overflow:** none, for any role, with the menus open or closed.

## October 4 — Responsive foundation and measured overflow fixes

- **Measured, not assumed.** Overflow was checked in headless Chromium against the real
  app.
  - **Setup:** the app ran against an ephemeral local MongoDB seeded with long-content
    fixtures. Every external service was blanked or pointed at a dead port.
  - **Coverage:** about 80 guest, runner, organiser and admin pages, at 12 widths from
    320 to 1440px.
  - **Method:** the old `body` clip was lifted during measurement so hidden overflow
    would show.
  - **Not covered:** pages backed by PostgreSQL (organiser event shop and audit) returned
    500 locally and were not measured.
- **Guest mobile menu bug fixed.** Below 900px, Log in and Sign Up were laid out side by
  side, which pushed **Sign Up outside the menu**. `body { overflow-x: hidden }` then
  clipped it, so guests on phones could not reach Sign Up from the menu. An unscoped
  `.nav .nav-auth-buttons { display: flex }` was overriding the mobile `display:
  contents`; the mobile rule is now re-asserted after it.
- **Mobile menu missing on six pages.** These pages never loaded `main.js`, which drives
  the menu button: organiser certificate setup, organiser complete-profile, admin
  promote, reset password, and both certificate verification pages. Every page with the
  shared nav now loads it.
- **Other overflows fixed:**
  - Cookie Policy choice buttons at 320–360px.
  - Admin page headers on analytics and promote, which now wrap their actions.
  - The organiser registrant roster at 761–800px: the header now wraps and the column
    minimums are lower.
  - Signed-in `/events` at 761–768px, where the global `.btn { width: 100% }` widened a
    header action.
  - 18 `repeat(auto-fit|auto-fill, minmax(≥200px, …))` grids now use
    `minmax(min(100%, N), …)`. This is identical wherever the container is at least N
    wide.
- **`body { overflow-x: hidden }` removed.** It hid the bugs above and broke
  `position: sticky`. With it gone, no measured page overflows at any width.
- **Shared foundation in `design-system.css`:**
  - spacing, gutter and z-index tokens, plus documented reference breakpoints;
  - `.hr-container`, `.hr-grid` and `.hr-table-wrap`;
  - a site-wide reduced-motion rule.
- **Skip link on every page.** It is rendered once by `layouts/nav.ejs` and replaces the
  home-only link. `main.js` gives the first `<main>` the `#main-content` target when a
  page lacks it.
- **DB-free coverage:** `tests/responsive-foundation.unit.test.js`. It guards against a
  returning body clip, fixed grid minimums of 200px or more, a missing or duplicate skip
  link, pages without the menu script, the mobile auth-button ordering, and each
  overflow fix.

## October 3 — Navigation consolidated into one configuration

- `src/config/navigation.js` is now the single source of truth for the global
  navigation. Each destination is defined once. `buildNavigation(locals)`, exposed as
  `app.locals.buildNavigation`, returns the header row, the guest sign-in actions, the
  workspace switch and the mobile bottom tabs for the current visitor and workspace, and
  marks the current page.
- `layouts/nav.ejs` only renders that result. Header links share the new
  `layouts/nav-item.ejs` partial. The hard-coded duplicates are gone; for example,
  `/runner/notifications` was previously written out in three branches.
- Behaviour changes, deliberately limited:
  - Every bottom-tab bar now has at most five destinations. The runner and organiser
    workspace switch was a sixth tab; it now lives only in the header menu, which is
    also the mobile menu.
  - The organiser notification bell now gets `aria-current` when it is the current page.
  - Redundant or ineffective attributes were removed: `role="navigation"` on `<nav>` and
    `aria-label` on the plain `.nav-user` div. All nav icons are now `aria-hidden`.
  - Rendered markup is otherwise unchanged. This was checked by diffing the old and new
    templates for the guest, runner, organiser, pending-organiser and admin cases.
- Visibility remains presentation only. Route guards are unchanged.
- The footer stays separate, because it holds content and policy pages.
- DB-free coverage: the new `tests/navigation-config.unit.test.js` covers role and
  workspace visibility, the five-tab limit, active-page matching, the notification
  summary, and checks that each destination has a GET route. The nav tests that matched
  template source text now assert on rendered output through `tests/helpers/render-nav.js`.

## October 3 — Installable PWA foundation and Install HelloRun

- HelloRun can now be installed as a Progressive Web App. `src/public/manifest.webmanifest`
  (`id`, `start_url` and `scope` set to `/`, standalone, theme `#c2410c`, background
  `#f8fafc`) is linked from `layouts/head.ejs`, together with `theme-color`, application-name
  metadata, and shortcuts to `/events` and `/my-registrations`.
- Icons generated from `helloRun-icon.png` in `src/public/images/pwa/`: 192 and 512 standard,
  a 512 maskable icon with the logo inside the safe zone, and a 180×180 opaque Apple touch
  icon. This replaces the 32×32 favicon that was previously used as the touch icon.
- Conservative service worker, `src/public/sw.js`. It does not intercept non-GET requests
  or cross-origin requests. Page HTML is never cached: navigations always go to the network
  and fall back to the static `/offline.html`. Only same-origin `/css/`, `/js/` and
  `/images/` assets are cached, stale-while-revalidate, excluding `/js/vendor/`.
- `/sw.js` is served by its own route (`src/utils/service-worker.js`) with `no-cache` and a
  cache version stamped from the deployed commit. Each deploy therefore installs a new
  worker, and that worker deletes the previous caches. The manifest and offline page are
  also `no-cache`.
- When a new worker is waiting, the page shows "A new version of HelloRun is available" with
  a Refresh button. The page reloads only when the user clicks it.
- `src/public/js/pwa.js` holds the install state. It publishes the state as `data-pwa-install`
  on `<html>`:
  - Chromium's `beforeinstallprompt` enables an **Install HelloRun** nav control that opens
    the native prompt. The prompt only opens on a click.
  - On iPhone and iPad browser tabs, the control opens Add to Home Screen guidance instead.
  - The control is hidden when the app is already installed, running standalone, inside
    in-app webviews, and on browsers that offer no install path.
  - `pwa.css` controls visibility.
- DB-free coverage: `tests/pwa-foundation.unit.test.js`. It checks the manifest and icon
  dimensions, the shortcut routes, the head and nav wiring, and the install-module
  invariants. It also runs the real worker in a VM sandbox against mocked caches and
  fetch, confirming that writes, API and cross-origin requests are ignored, navigations
  are not cached, the offline fallback works, and static assets are cached.
- Not yet verified: installation on a real Android or iOS device, and the update flow
  against a production deploy.

## October 3 — Admin promotion live send status

- `/admin/promote` has a **Live Send Status** card under Recipient Preview. It shows every
  campaign that is currently sending (admin, organiser and automatic-publish), with a progress
  bar, sent/failed/skipped/queued counters and a per-recipient list
  (pending → sending → sent/failed/skipped/suppressed/queued). It polls
  `GET /admin/promote/live` every 3 seconds while a campaign is sending, pauses while the tab is
  hidden, and updates the Recent Campaigns row when a campaign finishes. Recipient emails are
  shown to full administrators only; the endpoint requires `requireFullAdmin`.
- `dispatchEventPromotionCampaign` now records progress after each recipient through a
  best-effort tracker. `EventPromotion` gains `deliveries` (capped at 1,000; counters stay
  exact beyond the cap), `deliveryListTruncated`, `processedCount`, `lastProgressAt` and
  `completedAt`, plus a `{ status, createdAt }` index. A campaign with no progress for two
  minutes is shown as stalled.
- After a send, the redirect includes the new `campaign` id so the page tracks it immediately.
- DB-free coverage: `tests/admin-promote-live-status.unit.test.js`. No live-database
  verification was run.

## October 3 — October Active Run 2026 published

### October Active Run 2026

- **Live at `/events/october-active-run-2026`** (reference `OAR-260210`, event
  `6abfdb46e6176464b7c200d2`). Free virtual accumulated-distance challenge with six
  categories: 25K, 50K, 75K, 100K, 150K and 200K.
- Activity window October 1–31, 2026; registration closes October 22, 2026 at
  11:59 PM Asia/Manila; final proof deadline November 14, 2026. Activities from
  October 1 onward count even though the event was published on October 3.
- Event content lives in `src/content/events/october-active-run-2026.js`;
  `npm run event:create-october-active-run-2026` is dry-run unless `--apply` is passed.
  The apply run uploaded the banner, poster and badge to R2, published the certificate
  template, and created 19 finisher badges (none deferred). Automatic email promotion
  is disabled.
- The banner and poster published on October 3 are text edits of the September Active
  Run artwork.

### October Active Run artwork replacement

- New illustrated banner (1920×1080), poster (1080×1620) and transparent badge
  (1254×1254) replace the September-derived artwork in
  `assets/events/october-active-run-2026/`: rice terraces at sunset with palms, a runner
  and a walker on a winding road, in HelloRun green, orange and gold. The badge drops the
  maple-leaf motif.
- `npm run event:update-october-active-run-2026-artwork` uploads the committed artwork
  to R2, updates the event's banner, poster, logo and badge URLs and the active
  certificate template's logo and artwork, and re-synchronises the badge image on the
  event's PostgreSQL badges. It is dry-run unless `--apply` is passed and keeps the
  previous R2 objects so already-shared links still resolve.
