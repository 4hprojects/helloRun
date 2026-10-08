# HelloRun

HelloRun is a running-event platform for discovery, registration, payment,
run-proof submission, organiser review, results, certificates, leaderboards,
running groups, editorial content, and event operations.

Production: <https://hellorun.online>

## Technology

- Node.js and Express with EJS views
- MongoDB through Mongoose
- PostgreSQL through Supabase
- Redis-backed shared workers and rate limits, with documented fallbacks
- Cloudflare R2 for uploads

## Local Setup

```bash
npm install
npm run dev
```

The application requires environment configuration. Do not assume a local
`.env` is safe for testing: this repository has historically used credentials
that point at production services.

Copy `.env.example` to a local untracked `.env` and fill only the services you
intend to exercise. The Strava connection is an athlete-only private viewer;
connected activities cannot be used as event proof, organizer evidence,
leaderboard data, certificates, or analytics.

The runner profile also includes a guided COROS-to-Strava setup. It stores only
the runner's HelloRun-owned setup state and confirmation time; it never receives
COROS credentials or attempts to connect the providers itself. Direct COROS API
access remains disabled behind `COROS_DIRECT_INTEGRATION_ENABLED=false` until
Partner API approval and terms review are documented.

Historical Strava cleanup is deliberately operator-controlled:

```bash
npm run strava:remediate:dry
# After reviewing the report and verifying non-production/production targets:
npm run strava:remediate:apply
```

The apply command requires MongoDB, PostgreSQL, and R2 configuration and must
run in a maintenance window. It also requires `STRAVA_REMEDIATION_APPROVED=yes`,
the reviewed record count, and the target fingerprint printed by the dry run.
It is restartable and must never be tested against production by accident.
Before applying it, inventory logs, exports, and backups that may contain
provider data. Purge supported copies and record the expiry schedule for any
immutable backup that cannot be changed in place.

## Safe Validation

Use DB-free tests for routine development:

```bash
npm run test:unit
```

Integration tests may connect to MongoDB or PostgreSQL and must only be run in
an explicitly approved non-production environment. See
[`CLAUDE.md`](CLAUDE.md) and
[`docs/improvement-plan/phase-2-environments-and-data-safety.md`](docs/improvement-plan/phase-2-environments-and-data-safety.md).

## Documentation

- [Product brief](PRODUCT.md)
- [Documentation index](docs/README.md)
- [Current status](docs/STATUS.md)
- [Forward roadmap](docs/ROADMAP.md)
- [Product requirements](docs/PRD.md)
- [Changelog](docs/CHANGELOG.md)
- [Documentation conventions](docs/DOCUMENTATION-CONVENTIONS.md)

## Package

The reusable threaded-comment engine is documented separately in
[`packages/threaded-comments/README.md`](packages/threaded-comments/README.md).

## License

This repository is private and unlicensed for redistribution. See
[`LICENSE`](LICENSE).
