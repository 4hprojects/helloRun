# Isolated Development and Integration Environment

**Status:** available locally and repository-verified on October 20, 2026
**Backlog ownership:** `OPS-02` and `OPS-06` (complete) in
[ROADMAP.md](../ROADMAP.md)

This environment is the approved default for development, migrations, seed data,
and database-touching integration tests. It uses Docker services exposed only on
loopback and does not require production credentials.

## Safety boundary

- MongoDB 7 listens on `127.0.0.1:27018`, uses `hellorun_dev`, and runs as a
  single-node replica set so transaction-backed workflows are exercised locally.
  Its health check does not pass until that node is writable primary, preventing
  migrations, seeds, or tests from racing the initial replica-set election.
  Its Compose service raises the file-descriptor limit to 65,536 so the complete
  serialized integration and OCR gates cannot exhaust MongoDB's handles while
  repeatedly creating and dropping fixture collections.
- PostgreSQL 16 listens on `127.0.0.1:5433` and uses a local-only
  `hellorun_dev` role and database.
- `.env.development` is ignored. Copy `.env.development.example`; never put
  production values in it.
- Non-production application boot refuses remote data services by default.
  `ALLOW_REMOTE_DEVELOPMENT_DB=1` permits only remote Mongo/Postgres database
  names visibly containing `dev`, `test`, `testing`, or `staging`; it never
  permits remote Redis.
- The test guard applies the same database-name rule. A remote production-looking
  database cannot be authorized by setting `ALLOW_REMOTE_TEST_DB=1`.
- The development seeder is stricter: both database endpoints must be loopback
  and both database names must be recognizably non-production.
- External email, object storage, bot protection, Strava, COROS, OCR rollout,
  and step-competition flags are blank or disabled in the example environment.
- The guarded integration runner injects `TEST_UPLOAD_STORAGE=memory` only into
  its `NODE_ENV=test` child. The flag is absent from `.env.development`, and the
  upload service rejects it outside test mode. Test uploads stay in that server
  process and use a non-routable `test-uploads.invalid` URL, exercising multipart
  upload, persistence, read, and cleanup without production R2 access.

## First-time setup

```bash
cp .env.development.example .env.development
npm run dev:services:up
npm run dev:migrate
npm run dev:seed
npm run dev:isolated
```

The seed is idempotent. It creates five local accounts (full/support admin,
approved/pending organiser, and runner) and three events (published virtual,
draft onsite, and closed hybrid), then synchronizes their required Postgres
shadow rows. The local-only password is printed by the command.

Check the running application at `http://127.0.0.1:3001/healthz` and
`http://127.0.0.1:3001/readyz`.

## Integration tests

```bash
npm run test:isolated
```

This command loads `.env.development` explicitly and executes all integration
files serially through the repository database guard. Some OCR suites require a
Mongo-only process with `OCR_TEST_MONGODB_URI` set and `DATABASE_URL` empty;
run those guarded suites with:

```bash
npm run test:ocr:isolated
```

The command targets a disposable `hellorun_ocr_test` database on the same local
replica set and deliberately clears PostgreSQL from the OCR test process.

The October 20 baseline progressed from 451/527 to 491/527 and finally to
527/527 passing integration tests. The separate guarded OCR gate passed 46/46,
and the DB-free unit gate passed 2,486/2,486. The passing integration run's 96
fixture-generated sync records were measured before the required reset; the
reset/reseed left zero sync failures and zero dead letters. See the
[baseline report](../analysis/2026-10-20/isolated-integration-baseline.md).

## Reset and recovery

The following command deletes only the named Docker volumes in
`compose.dev.yml`. Confirm the active Compose project is
`hellorun-development` before using it.

```bash
docker compose -f compose.dev.yml ps
npm run dev:services:reset
npm run dev:services:up
npm run dev:migrate
npm run dev:seed
```

This is the repeatable cleanup path after destructive tests. It must never be
replaced with a broad Docker-volume deletion or pointed at a shared database.

## Recorded verification

On October 20, 2026:

- both containers reached their health checks;
- migrations `001` through `027` applied to the isolated Postgres database;
- two consecutive seed runs retained exactly five Mongo users, three Mongo
  events, five Postgres app users, two Postgres organisers, and three Postgres
  events;
- 27 focused environment/guard tests passed;
- the application booted from `.env.development`; `/healthz` and `/readyz`
  returned HTTP 200, Mongo reported ready, and unfinished integrations remained
  disabled; and
- the final full integration gate passed 527/527, the Mongo-only OCR gate passed
  46/46, and the DB-free unit gate passed 2,486/2,486;
- the named development volumes were removed, recreated, migrated, and reseeded
  successfully after the baseline, leaving five users, three events, no test
  registrations/submissions, and zero sync-failure or dead-letter rows; and
- the MongoDB service retained its primary state with a 65,536-file limit and
  zero restarts during the successful OCR rerun.
