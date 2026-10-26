# Production MongoDB Orphan Audit

**Audit date:** October 20, 2026
**Mode:** Read-only aggregation
**Canonical task:** `DEC-01` in [ROADMAP](../../ROADMAP.md)

## Method and definitions

`npm run mongo:audit:orphans` compares MongoDB `Registration`, `Submission`, and
`AccumulatedActivitySubmission` references with the current `events`, `users`, and
`registrations` collections. It emits counts only and performs no writes.

- **Missing** means that a non-null referenced ObjectId has no matching document, or
  that an account registration lacks its required user.
- **Soft-deleted event** means the Event document exists with `isDeleted: true`.
- **Unavailable event** is the union of a missing and soft-deleted event.
- Columns below overlap. They must not be added together.

## Current production result

### Registrations

| Population | Total | Event missing | Event soft-deleted | Event unavailable |
|---|---:|---:|---:|---:|
| All registrations | 2,837 | 2,378 | 272 | 2,650 |
| Onsite registrations | 88 | 48 | 40 | 88 |

Across all registrations, 2,555 account registrations also lack their required User
document. This is broader than the old onsite-only note and confirms that the retained
historical/test footprint needs an explicit retention decision rather than an automatic
cleanup.

### Submissions

| Collection | Total | Event missing | Event soft-deleted | Runner missing | Missing runner or event | Any unavailable reference |
|---|---:|---:|---:|---:|---:|---:|
| Single activity | 1,076 | 917 | 151 | 1,043 | 1,044 | 1,068 |
| Accumulated activity | 1,325 | 24 | 24 | 48 | 48 | 48 |
| Combined | 2,401 | 941 | 175 | 1,091 | 1,092 | 1,116 |

Every submission in both collections still resolves to a Registration document; the
broken references are the runner and event sides. A null runner that is valid for an
onsite guest is not counted as missing.

## Reconciliation with the August record

The August 7 note described 48 of 108 onsite registrations and 1,136 of 1,211
single-activity submissions. The current population is different: 88 onsite
registrations and 1,076 single-activity submissions remain. The hard-missing onsite
event count is still 48, while another 40 now point to soft-deleted events. The current
single-activity hard-missing runner-or-event union is 1,044, or 1,068 when soft-deleted
events are included.

The read-only audit does not establish why the population changed and must not be
presented as evidence that an approved cleanup occurred.

## Decision still required

No record was modified. Before pruning, the owner must approve:

1. which populations are disposable fixtures versus retained operational/audit evidence;
2. whether soft-deleted event history is intentionally retained;
3. proof-object and PostgreSQL-shadow handling for affected submissions; and
4. a recoverable production backup and reviewed dry-run target list.

If retention is chosen, the decision should also state how orphan rows are excluded from
operator queues and future backfills. If deletion is chosen, the operation needs exact
targets, an audit log, cross-store/R2 handling, and post-run unresolved counts.
