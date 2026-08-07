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
| Migration `023` — unique check-in and live-bib indexes | Written, **not applied** |
| `recordCheckIn` upsert; `assignBib` reassignment | Done, repository-verified |
| Check-in console — search, check in, event-wide progress, CSV backup list | Done, repository-verified |
| Bib assignment UI — per-row assign/update plus previewed sequential ranges | Done, repository-verified |
| Race-kit release UI | Done, repository-verified |
| Live check-in board | Done, repository-verified |
| Onsite results entry + approval UI | Done, repository-verified |
| Approved onsite results reach rankings, leaderboard, certificates | Done, repository-verified — needed no migration |
| Onsite pages linked from event-details | Done, repository-verified |
| Real Phase 7 test coverage (placebo files removed) | Done, repository-verified |
| QR scanning | Not started — blocked on token work below |
| Atomic capacity reservation | Not started — needs a Mongo migration |
| Guest registration, staff roles, waitlist, inventory, transfers, CSV import, form builder | Not started |

Nothing is deployed. No work here has run against a real database.

## Operating constraint

There is still no isolated database environment, so every migration is a production event
and `npm test` can reach production data. The working rule so far has been: additive,
onsite-only migrations are acceptable one at a time; anything touching the live
registration path or requiring a backfill waits.

`023` is the first migration under that rule and has not been applied yet. **It must be
applied before the current code deploys** — `recordCheckIn` and `assignBib` use its indexes
as `ON CONFLICT` targets and will error without it.

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

The console is currently manual-search only, so the bib QR codes the platform already
generates have no reader. That is now the largest remaining functional gap.

1. **QR token** — replace the plaintext `EVENT:{mongoId}|BIB:{n}|TIME:{ts}` in
   [qr-code.service.js](../../../src/services/qr-code.service.js) with a random token whose
   hash is stored, verified server-side, and revocable on cancellation or bib reassignment.
   Additive onsite-only migration for the token store. Keep the legacy decode path behind a
   flag until printed codes are known to be out of circulation.
2. **Scanner** — camera capture in the check-in console, resolving a token to the existing
   check-in action. Must handle the pack's response cases: valid, already checked in,
   cancelled, unpaid, wrong event, invalid, revoked.
Steps 3 and 4 below are **done** and needed no migration:

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
- **Staff roles** — `User.role` is only `runner|organiser|admin`. Until this exists,
  race-day check-in requires the organiser's own login on their own device. Worth telling
  pilot organisers explicitly.
- **Waitlist, inventory, transfers, CSV import** — none exist.
- **Form builder** — largest item; its stated reuse source does not exist in this
  repository. Revisit only with evidence that fixed fields are insufficient.

## Verification standard

Unit suite (`npm run test:unit`) must stay green — 1086/1086 as of August 7. New coverage
goes in `*.unit.test.js`, since `test:unit` excludes `.integration.` and `.smoke.` files.
Do not run the live-DB suites until an approved non-production database exists; treat
everything until then as repository-verified, not production-verified.
