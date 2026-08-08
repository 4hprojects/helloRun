# Onsite Registration — Delivery Plan

**Status:** Implemented in part; production/live verification pending

**Last reconciled:** August 7, 2026

**Delivery state:** [STATUS.md](../../STATUS.md) · **Priorities:** [ROADMAP.md](../../ROADMAP.md)

Sequencing for the remaining onsite work. The requirements source is the
[implementation pack](README.md), whose architecture and data-model sections are
superseded — read the preface there before using it.

## Where this stands

Onsite events already shipped long before this effort: event types, participation mode,
bib assignment, check-ins, race kits, result imports, QR generation and a timing webhook.
The gap was that no organiser UI existed for any of it.

| Item | State |
|---|---|
| Migration `023` — unique check-in and live-bib indexes | **Applied to production August 7, 2026** |
| `recordCheckIn` upsert; `assignBib` reassignment | Done, repository-verified |
| Check-in console — search, check in, event-wide progress, CSV backup list | Done, repository-verified |
| Bib assignment UI — per-row assign/update plus previewed sequential ranges | Done, repository-verified |
| Race-kit release UI | Done, repository-verified |
| Live check-in board | Done, repository-verified |
| Onsite results entry + approval UI | Done, repository-verified |
| Approved onsite results reach rankings, leaderboard, certificates | Done, repository-verified — needed no migration |
| Runner race pass (own bib + check-in QR) | Done, repository-verified |
| Opaque encrypted bib QR token (no database ids in the code) | Done, repository-verified |
| Bib scanning in the check-in console | Done, repository-verified |
| Organiser-initiated registration cancellation | Done, repository-verified |
| Results import from CSV/XLSX (preview then commit) | Done, repository-verified |
| Event-scoped race-day staff with per-job permissions | Done, repository-verified — needed no migration |
| Runner-initiated cancellation, as an organiser-approved request | Done, repository-verified — needed no migration |
| Onsite pages linked from event-details | Done, repository-verified |
| Real Phase 7 test coverage (placebo files removed) | Done, repository-verified |
| QR token *revocation* | **Done, deployed August 7, 2026** — needed no migration |
| Atomic capacity reservation | **Done, deployed August 7, 2026** — proven under concurrency |
| Walk-in registration | **Blocked** — needs guest registration (see below) |
| Guest registration, waitlist, inventory, transfers, form builder | Not started |

Deployed to production on August 7, 2026, with migration `023` applied first. The onsite
integration suite has now run against the real database (15/15). A hands-on organiser
walkthrough on a draft event is still outstanding.

## What's next — checklist

Verified against code and production on August 7, 2026.

### Done and deployed

Onsite organiser surfaces · onsite results reaching rankings/leaderboard/certificates ·
runner race pass · revocable QR tokens · bib scanning · cancellation both directions ·
results import · race-day staff · atomic capacity · migrations `022`–`024` · shadow
repaired · **guest registration complete** (foundation, flow, organiser toggle, claiming) ·
critical audit writes fixed.

### 1. Unblocked by guest registration — do these next

Both were blocked *only* by the account requirement, which is now gone.

- [x] **Walk-in registration.** Done. On the check-in console, over the guest service, with
      the shadow sync awaited so a bib can be assigned immediately, a duplicate guard across
      both registration types, and opt-in payment capture.
- [x] **Registrant CSV/XLSX import.** Mirror the results import — preview, then commit,
      with per-row outcomes. `exceljs` already reads both formats, and the guest path gives
      it somewhere to put people who have no account. Shipped August 7: shared sheet
      reader with the results import, confirmation emails off by default, emergency
      contact still required for onsite, and a missing category settled at preview.

### 2. Features with no existing foundation

- [x] **Waitlist.** Shipped August 8. Diverges from `04-registration-workflows.md`, which
      said a waitlisted person becomes a `Registration` with a `waitlisted` status: measured
      against this codebase, 93 places query registrations and only 4 filter on `status`, so
      that would have put non-registered people into rosters, exports, headcounts, the
      Postgres shadow, bib assignment and check-in. `WaitlistEntry` is its own collection and
      promotion goes through the ordinary registration paths instead. An offer holds a real
      slot through the same atomic reservation, so `createGuestRegistration` gained
      `skipCapacityReservation`, and a worker expires stale offers and passes the slot on.
- [x] **Per-size kit/shirt inventory.** Shipped August 8. Started at registration, as
      predicted — no shirt-size field existed anywhere. `inventory_movements` was not
      reused, and neither were the Postgres `race_kits` quantity columns: nothing has ever
      written those. The counter is on the event in Mongo, mirroring `raceCategories.reserved`,
      and counts kits as they leave the table rather than reserving at registration.
- [x] **Transfers.** Shipped August 8. The policy question was answered by making it
      explicit rather than guessed: transfers are off by default, the deadline falls back to
      registration close and then event start, organiser approval is on by default, and a
      transfer moves the person while touching no money at all — the same rule the
      cancellation flow already follows, since deciding a refund is not ours to decide.

### 3. Operational hygiene — small, and each prevents a repeat

- [ ] **`/healthz` should return the running commit.** There is no way to ask the app which
      build it is. A whole debugging detour came from inferring it, wrongly, from a route
      that 302s for every path.
- [ ] **Make `postinstall` tessdata non-fatal.** It downloads from a third-party host on
      every deploy. A missing OCR pack should degrade OCR, not block shipping the platform.
- [ ] **Guard the live-DB test suites.** `npm test` still reaches production. Everything in
      this work had to be run by hand with that risk held in mind.

### 4. Yours — verification and decisions I cannot make

- [ ] **Hands-on walkthrough on a draft event.** Assign a bib, open the race pass, scan it,
      release a kit, record and approve a result. Everything so far is automated tests and
      synthetic probes; nobody has driven this in a browser.
- [ ] **Step-competition smoke workflows.** `022` was applied because it blocked three
      subsystems, but its own audit and step-only/legacy runs were never done.
      `FEATURE_STEP_COMPETITIONS_ENABLED` stays off until they pass.
- [ ] **Prune or keep orphaned data.** 48 of 108 onsite registrations reference
      hard-deleted events; 1,136 of 1,211 submissions reference deleted users or events.
      No backfill can resolve these.
- [ ] **Accept the audit gap.** Every `audit_critical` write failed until August 7. Records
      before then do not exist and cannot be reconstructed.

### Deferred

- **Dynamic form builder — the rest of it.** The useful subset shipped August 8 as
  organiser-defined questions. Still deferred: file upload, conditional routing,
  profile-linked fields, sections, repeating groups and address composites. Its stated
  reuse source does not exist in this repository. Revisit only with evidence that a short
  answer, a pick from a list and an agreement are insufficient.

## Operating constraint

There is still no isolated database environment, so every migration is a production event
and `npm test` can reach production data. The working rule so far has been: additive,
onsite-only migrations are acceptable one at a time; anything touching the live
registration path or requiring a backfill waits.

`023` was applied on August 7, 2026 after a read-only dry run confirmed it would change no
existing rows. `022_step_competition_events.sql` remains pending on purpose — it alters core
submission, ranking and certificate tables and carries its own backfill and smoke-test gate.

## Phase 1 — Land what exists

No new code. This clears the stacked-unverified-work risk before more is added.

1. Apply migration `023` (reconciles duplicates, then adds two indexes).
2. Deploy, together with the already-merged `b70b50d` guest event-page fix still pending.
3. Verify: check in a participant on a draft event, confirm a rescan reports "already
   checked in" and creates no second row, confirm event-wide totals are correct, download
   the backup list.
4. Run `tests/onsite-operations.service.integration.test.js` — it now carries regression
   tests for the upsert and reassignment paths that have never executed.

### Phase 1 addendum — bugs found while building

Three defects surfaced under the deleted placebo tests and are now fixed with real
coverage: `getCheckInVelocity` bound a parameter inside an `INTERVAL '...'` literal and
threw (both dashboard endpoints 500'd); `estimateCheckInCompletion` fabricated a velocity
when no one had checked in recently; and `decodeQRData` reported success for any input
that did not throw. All three sat in the Phase 7 code the new UI builds on.

## Phase 2 — Complete the race-day loop

**The onsite finisher dead end is closed.** An approved onsite result is now materialised
as an approved `Submission`, so rankings, the leaderboard and certificates all work through
the paths they already used. This needed **no migration**: `Submission.participationMode`
already carried `'onsite'` and `leaderboard.service.js` already filtered on it. The
alternative — teaching three services to read `onsite_results` directly — was rejected
because every future consumer would have had to remember both sources.

The race-day loop now runs end to end: a runner gets a bib and a race pass, staff scan or
search to check them in, release the kit, record a finish, and approving it reaches the
leaderboard and certificates.

1. ~~**QR token**~~ — **done, without a migration.** The plaintext payload is replaced by
   an opaque AES-256-GCM token, so the code carries no database id and cannot be edited.
   Only *revocation* needs stored token hashes, and that alone remains queued.
2. ~~**Scanner**~~ — **done.** Uses the browser's `BarcodeDetector`, with manual code entry
   where that is unavailable. Handles valid, already checked in, cancelled, wrong event,
   unknown bib, and unreadable; payment is a warning, not a refusal.
3. ~~**Bib assignment UI**~~ — per-row assign/update plus a preview-then-confirm sequential
   range, over the existing `POST /events/:eventId/bibs/assign` and a new bounded,
   rate-limited `assign-bulk` endpoint that returns per-row outcomes.
4. ~~**Race-kit release UI**~~ — added `markRaceKitReleased`, which records pickup on the
   bib assignment. The Phase 7 schema has no per-participant kit record, so a bib must
   exist before a kit can be released; the page states this rather than failing.

## Phase 3 — Registration correctness

**Atomic capacity.** [registration.controller.js:296-306](../../../src/controllers/page/registration.controller.js#L296-L306)
does `countDocuments()` then inserts, so two people can take the last slot. A correct fix
needs a `reserved` counter on `Event.raceCategories` plus a backfill of existing events —
the first change here that touches the live registration path, and the first requiring a
backfill. Preserve today's effective policy (reserve on submit) exactly; this is a
correctness fix, not a behaviour change.

Best done once an isolated environment exists, or with a rehearsed backup and a narrow
deploy window.

## Phase 4 — Deferred, each needs its own decision

- **Guest registration** — relax `Registration.userId` and replace the unique
  `{eventId, userId}` index, *and* relax `runner_user_id NOT NULL` on `bib_assignments`,
  `check_ins` and `onsite_results`. Two migrations, both on live tables.
- ~~**Staff roles**~~ — **done, without a migration.** `EventStaff` scopes a grant to one
  event with named permissions, leaving the global `User.role` untouched. A new Mongo
  collection needs no migration.
- **Waitlist, per-size kit inventory and transfers** all shipped August 8.
- **Walk-in registration** — not code-only after all. `Registration.userId` is
  `required: true`, and a genuine walk-in has no account, so this is blocked by exactly the
  same constraint as guest registration. Only an account-holder variant could be built
  today, which would be a confusing feature ("register a walk-in, but only if they already
  have an account"), so it was skipped rather than half-built. Do it with guest
  registration.
- **Form builder** — largest item; its stated reuse source does not exist in this
  repository. Revisit only with evidence that fixed fields are insufficient.

## Verification standard

Unit suite (`npm run test:unit`) must stay green — 1127/1127 as of August 7. New coverage
goes in `*.unit.test.js`, since `test:unit` excludes `.integration.` and `.smoke.` files.
Do not run the live-DB suites until an approved non-production database exists; treat
everything until then as repository-verified, not production-verified.
