# Dependency Health — Full Codebase Analysis (July 5, 2026)

**Scope:** `npm audit`, outdated/risky packages, unused dependencies.

## Vulnerability audit
```
npm audit --omit=dev  →  found 0 vulnerabilities
```
Clean. Nothing to patch for a known CVE today.

## Unused dependencies
- **None confirmed.** Every production dependency is used. Note two that a naive `require()` grep misses:
  - `feed` — used via **dynamic ESM import** (`import('feed')`) in `src/controllers/blog.controller.js:82` for the RSS feed. *Not* unused (an earlier pass wrongly flagged it — corrected here).
  - `ejs` — no direct `require`, but it's the configured view engine (`server.js:188`). Keep.

## Outdated packages (major versions behind)

| Package | Current | Latest | Risk / notes | Priority |
|---|---|---|---|---|
| `multer` | 1.4.5-lts.2 | 2.2.0 | File-upload middleware — the security-sensitive one. 1.x is in LTS-only maintenance; 2.x is the actively-developed line. Upgrade path is small (API mostly compatible). | **High** |
| `express` | 4.22.2 | 5.2.1 | 4.x still supported. 5.x changes async error handling (would let us drop the COR-B try/catch boilerplate) but is a broader migration. | Medium (plan) |
| `mongoose` | 8.24.0 | 9.7.3 | Major; review breaking changes before jumping. 8.x is fine for now. | Medium (plan) |
| `ejs` | 3.1.10 | 6.0.1 | Several majors behind; templates are simple, but validate rendering after upgrade. | Medium |
| `bcryptjs` | 2.4.3 | 3.0.3 | Password hashing — pin deliberately and test hash/verify round-trip on upgrade. | Medium |
| `resend` | 3.5.0 | 6.17.1 | Email SDK; 3 majors behind. Check `notify()`/`email.service.js` API surface. | Medium |
| `exceljs` | 3.10.0 | 4.4.0 | Export generation; 4.x has API changes. | Low |
| `tesseract.js` (+ `-core`) | 5.1.1 | 7.0.0 | OCR; heavy/native-ish. Upgrade only with a submission-flow regression test — 2 majors of behaviour change. | Low |
| `connect-mongo` | 5.1.0 | 6.0.0 | Session store; small surface. | Low |
| `dotenv` | 16.6.1 | 17.4.2 | Trivial. | Low |
| `pdfkit` | 0.18.0 | 0.19.1 | Certificate rendering; minor. | Low |
| `sharp` | 0.34.5 | 0.35.3 | Image processing; keep reasonably current for native security fixes. | Low |
| Patch-level: `@aws-sdk/*`, `@sentry/node`, `express-session`, `ioredis`, `sanitize-html`, `nodemon` | — | — | All one minor/patch behind; safe routine bumps. `sanitize-html` powers XSS defence — keep it current. | Low (routine) |

## Recommendation
1. **Now:** bump `multer` to 2.x (upload security) and take the routine patch-level bumps (`sanitize-html`, `@aws-sdk/*`, `@sentry/node`, `express-session`, `ioredis`). Low risk, run `npm test` after.
2. **Planned, one at a time with tests:** `resend`, `bcryptjs`, `ejs`, `mongoose`, `exceljs`.
3. **Deliberate migrations (own session each):** `express` 4→5 (pairs well with the COR-B async-error cleanup) and `tesseract.js` 5→7 (gate behind a run-proof/OCR regression test — no staging, so validate against the DB-free submission unit tests).

> No-staging caveat: every upgrade must be verified through the DB-free unit tests and manual smoke checks, not live integration runs (see `test-suite.md`).
