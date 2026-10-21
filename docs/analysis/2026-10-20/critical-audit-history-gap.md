# Critical Audit History Gap Decision Record

**Prepared:** October 20, 2026
**Decision state:** Accepted by the owner on October 22, 2026
**Canonical task:** `DEC-02` in [ROADMAP](../../ROADMAP.md)

## Confirmed facts

The repository's original `critical-audit.service.js` insert used an explicit SQL column
list followed by the postgres.js object-list helper. That shape selected the wrong query
builder and could fail with `str.replace is not a function`. Commit `74b37e1` corrected
the insert on August 7, 2026 at 22:48 Asia/Manila.

The exact production exposure window cannot be derived from Git history because served
commit metadata and deployment history are incomplete. Production currently contains
908 `audit_critical` rows, including 344 whose event `created_at` precedes the fix. Those
rows show that the ledger was not literally empty before August 7; they may include
direct writes, test data, or rows written later with an earlier event time. The schema
does not retain a separate ingestion timestamp, so they do not prove continuous coverage.

The failure log retains three known pre-fix `critical_audit` dead letters:

| Failed action | Recorded failure time (UTC) |
|---|---|
| `admin.test_users.purged` | July 19, 2026 16:32:32 |
| `organiser.registrants_exported` | July 19, 2026 16:53:25 |
| `registration.claimed` | August 7, 2026 14:40:44 |

Those legacy rows retain only action, target type, and the target identifier stored in
the failure row. They do not retain the complete actor, status transition, notes, IP,
user agent, original event time, or stable idempotency key. Other failed calls may never
have produced durable failure rows, so three is a lower bound, not the size of the gap.

## Why the gap must not be backfilled

Reconstructing an append-only audit event from current domain state would invent when
the action occurred, who performed it, and what the before-state was. Labeling such rows
as original evidence would make the audit ledger less trustworthy. The three known rows
therefore remain explicit dead letters, and the unknown historical gap remains a stated
limitation.

## Forward fix and verification

The August insert correction remains covered by integration tests. On October 20, a
second defect was found in the retry path: the shared failure writer encoded `context`
as a JSON string while the worker expects a JSON object. It now writes with
`sql.json(context)`, and the integration test uses the real failure writer before replay.
The isolated test proves a newly failed audit event retains its timestamp and idempotency
key, replays once, writes `audit_critical`, and marks the failure resolved.

This protects new failures after deployment; it cannot restore missing historical facts.

## Accepted owner decision

The owner accepted the pre-August audit gap as an unrecoverable historical limitation
on October 22, 2026, with these controls:

1. do not synthesize historical `audit_critical` events;
2. retain the three legacy dead letters as incident evidence;
3. keep this limitation linked from STATUS and operator/audit documentation;
4. deploy and verify the corrected structured-context retry path; and
5. investigate any new unresolved `critical_audit` failure as an incident.

`DEC-02` is complete. Deployment and live verification of the corrected forward retry
path remain separate release work and do not alter this historical decision.
