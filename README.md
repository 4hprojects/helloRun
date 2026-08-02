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
