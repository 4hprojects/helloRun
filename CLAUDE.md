# HelloRun Repository Context

## Project

HelloRun manages running-event discovery, registration, payment, proof
submission, organiser review, results, certificates, communities, content, and
event operations.

**Stack:** Node.js, Express, EJS, MongoDB/Mongoose, PostgreSQL/Supabase, Redis,
and Cloudflare R2.

**Production:** <https://hellorun.online>

## Canonical Documentation

| Document | Ownership |
|---|---|
| `PRODUCT.md` | Product audience, brand, and design principles |
| `docs/PRD.md` | Stable requirements |
| `docs/STATUS.md` | Sole current delivery-status source |
| `docs/ROADMAP.md` | Forward priorities |
| `docs/CHANGELOG.md` | Implementation history |
| `docs/improvement-plan/README.md` | Active cross-cutting work |

Follow `docs/DOCUMENTATION-CONVENTIONS.md`. Completed plans belong in
`docs/implementation/` or `docs/archive/`, not in `todo/` or `to-implement/`.

## Commands

```bash
npm run dev
npm run test:unit
npm test
```

## Test Safety

This repository has historically had no isolated staging environment. A local
`.env` may point at production MongoDB and PostgreSQL services.

- Prefer DB-free unit tests and mocked database clients.
- Do not run integration suites unless the target databases are explicitly
  approved and verified as non-production.
- Do not treat DB-free results as production verification.

## Architecture Notes

- Sessions use `connect-mongo`.
- Authentication uses Express sessions and supports Cloudflare Turnstile.
- Uploads use memory-backed multer validation and Cloudflare R2.
- Email and notifications route through the communication service.
- Workers cover PostgreSQL sync retry, communication retry, scheduled blog
  publishing, and accumulated certificate work.
- Shared rate limits use Redis when configured and documented in-memory
  fallbacks otherwise.
- Health and readiness endpoints are `/healthz` and `/readyz`.

## Escaping Rule

Use EJS `<%= %>` by default. Raw `<%- %>` output is limited to includes,
hardened JSON, the layout body, and fields that pass through the documented
sanitization helpers. The repository escaping test enforces the allowlist.

## Terminology

Persisted role values and compatibility identifiers use `organiser`. Product
copy and established `/organizer/*` URLs generally use `organizer`. Do not
rename either form without checking its compatibility boundary.
