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

Verified against the code on August 7, 2026.

### A. Yours, not code. Everything else waits on this.

- [x] Apply migration `023_onsite_checkin_bib_uniqueness.sql`. Dry run showed both
      tables empty, so it added two indexes and changed no rows. It had to be applied with
      `--only=` because migration `022` sits ahead of it in the queue and was failing; the
      two are independent (023 touches `check_ins`/`bib_assignments`, 022 touches
      `submissions_core`/`rankings`/`certificates`).
- [x] Deploy. Merged to `main` and pushed on August 7, 2026; Render auto-deployed. This
      also carried the pending `b70b50d`, and the signed-out `/events/:slug` 500 is now
      resolved — a real event URL returns 200 while logged out.
- [x] Production smoke: `/healthz` 200, `/readyz` reports mongo ready, `/events` 200, and
      the new onsite routes redirect to login rather than erroring.
- [x] Ran `tests/onsite-operations.service.integration.test.js` against production —
      **15/15**, including the two tests that prove the new indexes work: a repeated
      check-in updates the existing row rather than duplicating, and reassigning a bib
      updates the live row. Verified afterwards that the suite left no orphan rows.
- [ ] Still worth doing by hand: a real organiser walkthrough on a draft event — assign a
      bib, open the race pass, scan it, release a kit, record and approve a result.

### B. Unblocked by A, in priority order

- [x] **Atomic capacity reservation.** Done. The bound is enforced inside the update that
      takes the slot, so the check and the claim cannot come apart; verified live with 20
      concurrent attempts at 3 slots giving exactly 3 winners. No event currently uses a
      slot limit, so the change had zero production exposure and the backfill was a no-op.
- [x] **QR token revocation.** Done, and it needed no migration — a Mongo collection
      suffices. Identity is stable across renders so a runner's screenshot survives, and
      revocation fires on cancellation and on bib reassignment.
- [~] **Guest registration.** Foundation done and deployed: `participantType`, a
      conditionally-required `userId`, a partial unique index, and migration `024`
      relaxing the Postgres NOT NULLs. Still to do: drop the old Mongo index once the
      schema change is live (the script refuses until then), then the guest flow itself
      — registration without an account, a hashed management token, and the claim flow.

### C. Migration-free, available any time

- [ ] **Waitlist.** Confirmed absent — zero references anywhere. Needs event settings plus
      a waitlist state, and touches the event builder.
- [ ] **Per-size kit/shirt inventory.** Confirmed absent — there is no shirt-size field
      anywhere in the codebase, so this starts with capturing the size at registration.
      `inventory_movements` is shop-only and keyed on product variants; do not reuse it.
- [ ] **Registration transfers.** Confirmed absent. Needs a policy decision first: who may
      transfer, until when, and what happens to the money.

### D. Unrelated to onsite, found along the way

- [x] **`organiser.direct_message` and `organiser.runner_contact` had no email sender.**
      Fixed: both now send, with `reply_to` so replies reach the other person. A test now
      fails if any registered event lacks a sender.

### Deferred

- **Dynamic form builder.** Largest item in the pack; its stated reuse source does not
  exist in this repository. Revisit only with evidence that fixed fields are insufficient.

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
- **Waitlist, inventory, transfers** — none exist.
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
