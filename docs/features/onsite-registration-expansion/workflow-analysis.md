# Onsite Registration Workflow — End-to-End Analysis

**Status: Both blocking defects fixed; ten further gaps open**

**Last reconciled:** August 8, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

The feature checklist in [delivery-plan.md](delivery-plan.md) is complete: every
item the implementation pack asked for is built, tested and deployed. This
document asks a different question — **does the workflow work end to end?** — and
the answer was no.

The gap between those two statements is the point of this document. Features were
verified individually. The seams between them were not, and both blocking defects
live in a seam.

Everything here was verified by running the path, not by reading it.

---

## 1. The six ways into an onsite event

| | Account | Guest self-serve | Walk-in | Bulk import | Waitlist claim | Transfer |
|---|---|---|---|---|---|---|
| **Works end to end?** | yes | yes | yes (fixed Aug 8) | yes | yes | partly |
| `participantType` | `account` | `guest` | `guest` | `guest` | `guest` | `account` if the recipient has one, else `guest` |
| `userId` | set | `null` | `null` | `null` | `null` | recipient's, or `null` |
| Shadow write | fire-and-forget | fire-and-forget | **awaited** | fire-and-forget | fire-and-forget | already exists |
| Manage token | n/a | issued + shown | issued, **dropped by the route** | issued, undeliverable unless emails on | issued + shown | emailed (fixed Aug 8) |
| Capacity reserved | yes | yes | yes | yes | held by the offer | same slot |
| Kit size captured | yes | yes | yes (fixed Aug 8) | **no** | yes | replaced |
| Custom answers | yes | yes | yes (fixed Aug 8) | **no** | yes | cleared (fixed Aug 8) |
| Emergency contact | required | required when onsite | required (fixed Aug 8) | required when onsite | required when onsite | required (fixed Aug 8) |
| Duplicate check | unique index | guests only | guests **and** accounts | in-file + cross-type, preview only | guests only | recipient not already entered |

Only the walk-in awaits the Postgres shadow write, because it is the only path
where somebody assigns a bib seconds later. That was a deliberate call and it is
still right.

## 2. The race-day chain

| Stage | State | Note |
|---|---|---|
| Bib assignment | works | Scoped to the event since August 8; guests permitted since migration `024` |
| Race pass / bib QR | **account only** | `requireAuth` + `requireRunnerWorkspace`, and scoped by `userId` — a guest row has none |
| Check-in | works | Name/code search; scan works only for account holders who can open a pass |
| Race kit release | works | Atomic per-size claim, substitution recorded |
| Result recording | works | |
| Result approval | works | Writes `onsite_results` |
| → Submission | works | Guests allowed since migration `025` |
| → Ranking / leaderboard | works | A guest ranks under the participant's name |
| → Badges | **account only, by design** | Issued on claim |
| → Certificate | **account only, by design** | Issued on claim |

Five of the six entry paths produce a guest. The chain used to stop at "approved"
for all of them; it now runs to the leaderboard, with the two account-scoped
outcomes waiting on a claim.

---

## 3. Blocking defects

### B1 — Walk-in registration has never worked through its interface — FIXED August 8

The check-in form posted neither `participationMode` nor `raceDistance`. Both are
`required` on `src/models/Registration.js`. `validateGuestForm` returned no error
for either, so the request passed validation and died at `save()`. Reproduced
before the fix:

```
validateGuestForm errors : {}
participationMode it set : ""
Registration validates   : NO — participationMode
```

Two causes, not one:

1. `validateGuestForm` (`src/services/guest-registration.service.js`) never checked
   `participationMode`, though its own docstring says everything `Registration`
   requires must come from the form because a guest has no profile to fall back
   on. It now rejects both fields.
2. `src/routes/organiser/onsite-pages.js` omitted `raceDistances` from the
   check-in page projection, so the category `<select>` rendered **zero options**
   and no `raceDistance` was posted either. Both that projection and the walk-in
   route's now carry the kit and question fields too.

**Verified end to end on August 8**, for the first time: the form's own body
registers a walk-in, captures the kit size and the organiser's answers, records
desk payment, and the bib assigns immediately.

**Why the tests passed.** `tests/walk-in-registration.unit.test.js:28` calls
`createWalkInRegistration` directly with `participationMode: 'onsite'` supplied,
and the route-level assertions only string-match the file. The live probe did the
same. Every check exercised the service; none exercised the seam between the form
and the service, which is exactly where the break was. The replacement test
renders the view, builds the body the form serialises, and asserts a Registration
made from it validates.

### B2 — A guest's finish time produces nothing — FIXED August 8

`src/services/onsite-result-submission.service.js:119` throws when
`registration.userId` is null, under this comment:

> Guest registrations have no runner to rank or certificate. Not an error today,
> because guest registration does not exist yet, but it will be once it does.

Guest registration now exists and is the output of five of six paths. The
organiser approves the result, `onsite_results` records it, and
`submissionCreated: false` comes back silently — no submission, no ranking, no
leaderboard entry, no badge, no certificate.

**Agreed direction:** rank the result and withhold only what needs an account. A
marshal-recorded finish time is a fact about the race, not about an account, and
the leaderboard already falls back to the participant's name. Certificates and
badges stay withheld — they key on `app_users` with `NOT NULL` foreign keys, and
the codebase deliberately treats an email typed at a desk as *not* proof of
identity. They are issued retroactively when the person claims the registration
with a verified email.

**Verified live on August 8:** the submission is created with a null runner, its
Postgres shadow row is written, one ranking row is created, no certificate is
issued, and claiming the registration backfills the runner on the submission and
on the onsite tables.

---

## 4. Further gaps

| # | Gap | What happens to a participant |
|---|---|---|
| 3 | ~~Transfer drops the manage token on organiser approval~~ | **Fixed Aug 8** — emailed to the new holder on both approval paths |
| 4 | ~~Transfer never resets `customAnswers`~~ | **Fixed Aug 8** — cleared, so the previous person's answers do not follow |
| 5 | ~~Transfer never requires an emergency contact~~ | **Fixed Aug 8** — demanded for an onsite entry, as everywhere else |
| 6 | Import commit trusts client-supplied rows | Validation and duplicate checks run only in preview, a separate request |
| 7 | Import's shadow-sync `.catch` logs but records no sync failure | The retry worker never sees it; recovery depends on the post-save hook having failed too |
| 8 | Guest duplicate check ignores accounts | An account holder can register again as a guest and arrive twice for one bib. The walk-in path already solves this |
| 9 | No guest-reachable race pass | Every guest, walk-in, imported and waitlist-claimed participant must be checked in by name or code |
| 10 | Roster has no pagination | `limit` capped at 500, no `skip`. On a 900-runner event, 400 people are reachable only by exact search |
| 11 | Mode is never checked against the event | A guest can register `virtual` for an onsite-only event and vanish from the roster |
| 12 | Roster has no status filter | Cancelled registrations sit on the race-day list |

---

## 5. What is genuinely done

Not a defect list only — most of this works:

- Atomic category capacity, enforced for the first time on August 8 across every
  pricing mode, with a counter that survives an organiser save.
- Waitlist with offers that hold a real slot, expire, and pass on automatically.
- Per-size kit stock with an atomic claim, substitution recorded, and stock
  returned on cancellation.
- Transfers that move the person and never the money, with the recipient signing
  their own waiver and the previous holder's bib QR revoked.
- Guest registration, claiming by verified email, walk-in and bulk import all
  sharing one guest path.
- Organiser-defined registration questions, and both on the registrants export.
- Cross-event write protection on bib assignment, check-in and results.

---

## 6. How this was missed

Worth recording, because it is a process finding rather than a code one.

Every feature here shipped with unit tests and a live probe against production
using throwaway data. Both blocking defects survived that.

- **B1** survived because the tests called the service with correct arguments.
  The service was never wrong; the form that feeds it was.
- **B2** survived because it is not a failure — it is a silent `false` in a
  response nobody asserted on.

The shared shape: **a test that constructs its own input cannot find a defect in
what constructs that input in production.** Tests written after this should build
the body the form actually serialises, and assert on what the participant ends up
able to do — not on what the service returns when handed good data.
