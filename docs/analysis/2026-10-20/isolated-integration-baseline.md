# Isolated Integration Baseline — October 20, 2026

**Environment:** [isolated development environment](../../operations/isolated-development.md)
**Backlog owner:** `OPS-06` in [ROADMAP.md](../../ROADMAP.md)

## Result

`npm run test:isolated` completed against loopback-only MongoDB and PostgreSQL:

| Metric | Result |
|---|---:|
| Tests reported | 527 |
| Passed | 451 |
| Failed | 76 |
| Cancelled / skipped / todo | 0 / 0 / 0 |
| Elapsed | 1,137.4 seconds |

After repairing the shared test-event visibility gate, CSRF login helper, and
several current-copy assertions, the same guarded command completed a second
time with the following checkpoint:

| Metric | Second checkpoint |
|---|---:|
| Tests reported | 527 |
| Passed | 491 |
| Failed | 36 |
| Cancelled / skipped / todo | 0 / 0 / 0 |
| Elapsed | 1,167.6 seconds |

The second run therefore retired 40 failures without weakening the production
test-data visibility default. Those 36 failures became the final repair set for
`OPS-06`.

## Passing release-gate result

After correcting runtime defects and updating assertions that no longer matched
the documented contracts, the unchanged guarded command passed completely:

| Metric | Final integration gate |
|---|---:|
| Tests reported | 527 |
| Passed | 527 |
| Failed | 0 |
| Cancelled / skipped / todo | 0 / 0 / 0 |
| Elapsed | 1,217.8 seconds |

The separate DB-free unit gate also passed 2,486/2,486 tests in 927.2 seconds.

The first specialized OCR invocation exposed an isolated-environment limit, not
an application assertion failure: MongoDB inherited a 1,024-file soft limit and
restarted while the suites repeatedly created collections and indexes. The
Compose service now sets both soft and hard `nofile` limits to 65,536. With a
fresh `hellorun_ocr_test` database, the guarded OCR command passed 46/46 tests
in 75.1 seconds and the container restart count remained zero.

The passing integration run created 96 unresolved fixture-generated shadow-sync
records (95 submission and one registration) because many isolated Mongo test
fixtures intentionally have no Postgres parent projection. There were zero
dead-letter rows. The required named-volume reset then removed those artifacts,
reapplied migrations `001`–`027`, and reseeded the environment. Post-reset
verification found five Mongo users, three Mongo events, no registrations or
submissions, five Postgres app users, two organisers, three events, and zero
sync-failure, unresolved, or dead-letter rows. The OCR database had zero
collections. No production or shared data service was contacted.

## Failure clusters observed

- Shared login/CSRF helpers received 403 or 404 responses across registration,
  cart, payment-review, and other route suites.
- Current route authorization sometimes returns 404 where older tests expect
  403, and one unapproved-organiser submissions route returned 200.
- Event-builder tests disagree with current naming (`accumulated_activity`
  versus `accumulated_distance`) and detected a mojibake/source assertion.
- Rejection-reason persistence now includes structured reason labels/codes while
  older tests expect the unadorned free-text reason.
- Strava submission tests expect event-submission support even though current
  product behavior deliberately blocks connected Strava activities from official
  submissions.
- Dashboard/onboarding, achievement, leaderboard, carousel, blog scheduling,
  notification, upload, and admin-setting assertions exposed additional
  behavior or fixture drift.
- Mongo fixtures created by many suites do not create matching Postgres shadow
  parents. Background sync therefore emitted missing-user/event errors and left
  dead-letter rows. Cleanup also encountered a review-decision foreign-key
  dependency.

## Triage rule

Each failing file must be rerun independently against a freshly reset isolated
environment. A failure is closed only by one of:

1. a product fix plus a behavior-focused regression test;
2. a test update proving the existing behavior is the current documented
   contract; or
3. a documented retirement decision for obsolete coverage.

The rerun must also verify that Mongo fixtures and Postgres shadow parents are
created and removed as one test unit. Passing tests must not be made green by
disabling PostgreSQL or suppressing background errors unless the test explicitly
targets a Mongo-only component.

## Exit evidence

- all 527 database-backed integration tests passed in the isolated tier;
- all 46 specialized Mongo-only OCR tests passed using their guarded local URI;
- all 2,486 DB-free unit tests passed;
- cleanup and deterministic reseeding left no test registrations, submissions,
  OCR collections, sync failures, or dead-letter rows; and
- the final commands, loopback environment, totals, and elapsed times are
  recorded above and linked from STATUS.

`OPS-06` is complete. Deployed and provider-backed checks remain separate
ROADMAP tasks and are not implied by this local evidence.
