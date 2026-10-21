# Production Placeholder and Fixture-User Audit

**Audit date:** October 20, 2026
**Mode:** Read-only MongoDB/PostgreSQL queries
**Canonical tasks:** `DEC-04` and `DEC-07` in [ROADMAP](../../ROADMAP.md)

## Original two placeholder accounts

The exact documented prefixes `purge.runner` and `purge.organizer` match zero production
users. The narrower documented `@example.com` patterns also match zero users, and there
are no corresponding `app_users` rows. No deletion is required; `DEC-04` is complete as
a verified no-op.

## Broader fixture footprint discovered

The existing read-only test-user cleanup preview found 99 active, non-admin
`@example.com` users that do not use the two original placeholder prefixes:

| Role | Count | Creation range (UTC) |
|---|---:|---|
| Runner | 71 | September 9–13, 2026 |
| Organiser | 28 | September 9, 2026 |

None is marked `isSmokeTest`. The shared cleanup preview reports the following directly
owned MongoDB records:

| Record type | Count |
|---|---:|
| Events | 37 |
| Registrations | 70 |
| Notifications | 269 |
| Communication logs | 142 |
| Event-reminder deliveries | 69 |
| Blog posts | 5 |
| Certificate templates | 1 |

The other supported ownership categories currently report zero.

## Downstream impact refresh

`npm run mongo:audit:fixture-impact` traced the event, participant, asset-reference, and
PostgreSQL surfaces without exposing identifiers:

- all 37 fixture-owned events have `status: published`, `isDeleted: true`, and
  `isTestData: true`;
- those events contain 69 registrations, all belonging to the fixture-account set;
  there are no non-fixture or guest registrations, no single/accumulated submissions,
  and no review decisions, guest tokens, waitlist entries, transfers, bib tokens, or
  co-organiser records;
- the 70th directly owned registration belongs to another event that is also published,
  soft-deleted, and marked test data;
- the event set has one certificate template and no event/template asset references;
- five fixture-authored blogs remain: three pending, one draft, and one published. They
  reference five blog asset URLs and are not soft-deleted; and
- PostgreSQL has zero matching `app_users`, `events_core`, event-dependent, user-owned,
  or actor-reference rows across the cleanup inventory.

The deeper audit found no real-participant or PostgreSQL impact, but the published blog
and five referenced assets still need human review. The current cleanup service deletes
the Blog documents; it does not prove whether those referenced R2 objects should be
retained or removed. This inventory does not authorize using the bulk cleanup against
production.

## Required decision

`DEC-07` requires an owner-approved classification and a recoverable backup. The
count-only downstream and Postgres dry run is complete. Before any apply, review the
one published blog, decide retention/removal for its five referenced assets, and generate
the exact target-ID operation manifest. Choose one of:

1. retain and label the fixture accounts;
2. quarantine/hide them while preserving evidence; or
3. delete them with the existing cross-store cascade after reviewing the full target
   report.

The narrow two-account decision must not be treated as authorization for option 3. If
option 3 is approved, take a recoverable backup, retain the operation manifest, verify
the critical-audit write, and rerun both fixture and orphan audits afterward.
