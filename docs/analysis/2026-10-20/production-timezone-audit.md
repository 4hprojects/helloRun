# Production Time and Timezone Audit

**Audit date:** October 20, 2026
**Mode:** Read-only production comparison plus isolated regression tests
**Canonical task:** `TIME-01` in [ROADMAP](../../ROADMAP.md)

## MongoDB/PostgreSQL shadow comparison

The audit compared the five exact event instants stored in MongoDB with their
`TIMESTAMPTZ` counterparts in `events_core` by ISO UTC value:

- registration open;
- registration close;
- event start;
- event end; and
- final submission deadline.

Production contains 19 active, non-test MongoDB event documents. Eight are personal
record containers, which the event-shadow backfill deliberately excludes. All 11 active
non-personal events have PostgreSQL rows.

Ten events match across all five values. The remaining event,
`cns-move-more-challenge-2026`, has three discrepancies:

| Field | MongoDB | PostgreSQL |
|---|---|---|
| Registration open | `2026-09-07T17:00:00.000Z` | `2026-09-08T16:00:00.000Z` |
| Registration close | `2026-10-17T23:59:00.000Z` | `2026-10-02T15:59:00.000Z` |
| Final submission deadline | `2026-11-03T23:59:00.000Z` | `2026-11-03T15:59:00.000Z` |

No timestamp was changed. MongoDB remains the application source for these event values,
but the intended historical wall-clock schedule must be confirmed with the organiser
before repairing the shadow. The eight-hour deadline difference is especially not a
license to assume either UTC or Manila intent.

The event-shadow operator command now defaults to dry-run and supports a validated,
automatically organiser-skipping `--event-id=<Mongo ObjectId>` scope. After organiser
confirmation, review a targeted dry run before using the separate explicit apply command;
do not run a fleet-wide shadow rewrite for this discrepancy.

The broad inventory also contains many PostgreSQL-only historical/test rows. They are
outside this active-event timestamp check and must not be removed until `DEC-05` confirms
there are no external consumers.

## Date-only boundary review

Date-of-birth values use a compatibility representation of UTC midnight but are calendar
dates, not instants. The review found two boundary defects:

1. shortly after midnight in Manila, today's date could compare as later than the current
   UTC instant and be rejected as a future birth date; and
2. displayed age used process-local year/month/day fields, so a non-UTC host could shift
   the birthday boundary.

Validation now compares the submitted `YYYY-MM-DD` value with the current Manila calendar
date. Age uses UTC components from the stored date and the Manila calendar date for
today. This preserves existing storage without bulk-shifting historical values.

Three explicit boundary cases, 34 related timezone/presentation cases, all 13 runner
profile integration scenarios, and all 13 admin/onboarding integration scenarios pass.

## Remaining verification

`TIME-01` remains verification pending until:

- the CNS organiser confirms the intended three schedule values and an approved shadow
  repair is verified;
- a sample of other historical event schedules is confirmed by organisers; and
- the paired runner-local/Manila presentation is checked after deployment in supported
  browsers and email delivery.
