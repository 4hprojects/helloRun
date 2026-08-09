# Onsite Registration Workflow — End-to-End Analysis

**Status: Three blocking defects fixed; all ten further gaps closed; the race-day
chain walked end to end through its own interfaces**

**Last reconciled:** August 10, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

The feature checklist in [delivery-plan.md](delivery-plan.md) is complete: every
item the implementation pack asked for is built, tested and deployed. This
document asks a different question — **does the workflow work end to end?** — and
the answer was no.

The gap between those two statements is the point of this document. Features were
verified individually. The seams between them were not, and all three blocking
defects live in a seam — the third in the seam between a projected read and a
background sync, which is the least visible kind.

Everything here was verified by running the path, not by reading it — and since
August 9, by running it *through the interface a person uses*, which is a
stricter and more useful bar. The distinction is not pedantic: it is the only
reason B1 was ever found.

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
| Duplicate check | unique index | both (fixed Aug 8) | guests **and** accounts | re-checked at commit (fixed Aug 8) | both (fixed Aug 8) | recipient not already entered |

Only the walk-in awaits the Postgres shadow write, because it is the only path
where somebody assigns a bib seconds later. That was a deliberate call and it is
still right.

## 2. The race-day chain

**The whole chain below was driven through its own interfaces on August 9** — the
organiser console in a browser, then the same routes over HTTP with a real
session — rather than by calling the services. That is the check that found B1,
and it is now the standard for this table: a row says "works" only if the
interface that produces it was the thing exercised.

| Stage | State | Note |
|---|---|---|
| Bib assignment | works | Scoped to the event since August 8; guests permitted since migration `024`; browser-verified Aug 9 |
| Race pass / bib QR | works | Account holders via `/my-registrations`; guests via their manage link (Aug 8) |
| Check-in | works | Name/code search, and QR scanning now works for guests too; state persists across reload |
| Race kit release | works | Atomic per-size claim, substitution recorded; stock decremented 5→4 live. Requires a bib first and now says so (`409`, Aug 10). No longer blanks the shadow row — see B3 |
| Result recording | works | |
| Result approval | works | Writes `onsite_results`; verified `approved` with the entered time |
| → Submission | works | Guests allowed since migration `025` |
| → Ranking / leaderboard | works | A guest ranks under the participant's name |
| → Badges | **account only, by design** | Issued on claim |
| → Certificate | **account only, by design** | Issued on claim |
| Cancellation | works | Slot, kit and bib all returned — verified Aug 9 |

Five of the six entry paths produce a guest. The chain used to stop at "approved"
for all of them; it now runs to the leaderboard, with the two account-scoped
outcomes waiting on a claim.

**Cancellation gives everything back.** Checked on August 9 against an event with
a capped category and kit stock: `raceCategories.reserved` 1→0, kit `released`
1→0 with the size available again, the registration `cancelled`, and the Postgres
bib assignment `voided` so the number can be reissued. All four in one request —
which matters, because a partial rollback here silently shrinks an event's
capacity for the rest of its life.

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

### B3 — Releasing a race kit erased the runner from the console — FIXED August 10

`race-kit-release.service.js:26` reads the registration with
`.select('kitSize kitSizeReleased participant')`, sets the released size and saves.
`Registration`'s `post('save')` hook syncs whatever document it is handed, and the
shadow upsert writes **every** column from `excluded` — so the fields the projection
never loaded were not skipped, they were overwritten with defaults:

```
mongo_event_id     : ''        (was the event id)
event_core_id      : null
confirmation_code  : ''
participation_mode : 'virtual' (the schema default, on an onsite entry)
```

`getOnsiteStateByRegistrationId` filters `WHERE r.mongo_event_id = ${eventId}`, so the
row stopped matching: **the bib and check-in state vanished from the check-in, bibs and
results lists the moment the kit was handed over**, and every row read "Not synced".
The desk saw a success.

Fixed in `syncRegistrationPaymentShadow`, which now reloads a document that was read
with a projection before normalising it, carrying forward whatever the caller changed.
Placed there rather than in the kit service because the hook fires for every `save()`
anywhere — a per-call-site fix would hold only until the next projected save. A sweep
confirmed the kit release was the only path that saved a projected registration.

**Why it survived the walkthrough.** It was seen on August 9 — a row with an empty
`mongo_event_id` — and then wrongly retracted, on the strength of a second walk-in
whose row was written correctly. That walk-in never had a kit released, which is the
only step that triggers it. The retraction was the mistake, not the original report:
*a control that does not include the step under suspicion does not clear it.*

## 4. Further gaps

| # | Gap | What happens to a participant |
|---|---|---|
| 3 | ~~Transfer drops the manage token on organiser approval~~ | **Fixed Aug 8** — emailed to the new holder on both approval paths |
| 4 | ~~Transfer never resets `customAnswers`~~ | **Fixed Aug 8** — cleared, so the previous person's answers do not follow |
| 5 | ~~Transfer never requires an emergency contact~~ | **Fixed Aug 8** — demanded for an onsite entry, as everywhere else |
| 6 | ~~Import commit trusts client-supplied rows~~ | **Fixed Aug 8** — validation and the duplicate check re-run at commit |
| 7 | ~~Import's shadow-sync failure is never recorded~~ | **Fixed Aug 8** — writes a `sync_failures` row the retry worker can see |
| 8 | ~~Guest duplicate check ignores accounts~~ | **Fixed Aug 8** — the public route now checks both kinds, as the walk-in desk did |
| 9 | ~~No guest-reachable race pass~~ | **Built Aug 8** — the guest manage link is the race pass; QR check-in now works for guests |
| 10 | ~~Roster has no pagination~~ | **Fixed Aug 8** — paged, with the real total shown; the offline export pages through too |
| 11 | ~~Mode is never checked against the event~~ | **Fixed Aug 8** — refused, so nobody holds an entry invisible on race day |
| 12 | ~~Roster has no status filter~~ | **Fixed Aug 8** — cancelled entries are off the list, reachable via `includeCancelled` |

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
using throwaway data. All three blocking defects survived that.

- **B1** survived because the tests called the service with correct arguments.
  The service was never wrong; the form that feeds it was.
- **B2** survived because it is not a failure — it is a silent `false` in a
  response nobody asserted on.
- **B3** survived because the damage is done by a *different* request than the one
  that reveals it. The kit release returns `200`; the runner disappears from a
  page loaded afterwards. Nothing that asserts on a response can see it.

The shared shape: **a test that constructs its own input cannot find a defect in
what constructs that input in production.** Tests written after this should build
the body the form actually serialises, and assert on what the participant ends up
able to do — not on what the service returns when handed good data.

B3 adds a second rule, learned by getting it wrong: **the control has to include
the step under suspicion.** The empty `mongo_event_id` was spotted on August 9 and
retracted after a second walk-in wrote a clean row — but that walk-in never had a
kit released, which is the only step that causes it. A passing case that skips the
suspect step is not evidence; it is a different experiment.

The practical form of both rules for this codebase: **check the state after the
next request, not the response of this one.** Both B2 and B3 are invisible to any
assertion made on the reply that caused them.
