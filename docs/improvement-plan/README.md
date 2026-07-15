# HelloRun — Improvement Plan (July 6, 2026)

**Source:** full-codebase review across four lenses — **process, efficiency, intuitivity, security**.
**Relationship to prior work:** this is the successor to `docs/analysis/2026-07-05/` (whose P0–P3 findings are all fixed except CQ-3). Nothing already resolved is re-reported here; the still-open items from earlier reviews (CQ-3, the live-verification backlog, the 2 placeholder users) are folded into the phases below so **this folder is the single active plan**.

---

## Overall assessment

| Lens | Grade | One-line verdict |
|---|---|---|
| Security | B+ | App-level authz/CSRF/injection story is strong (validated July 5); the remaining gaps are *session lifecycle* (no regenerate on login), *IP attribution* (spoofable/misattributed), and *supply chain* (unpinned CDN script on every page). |
| Process | C | The weakest lens. No CI, no lint, no staging, `npm test` can touch the production DB, no graceful shutdown, no dependency automation. The code is better than the pipeline around it. |
| Efficiency | B+ | DB-side discipline is good (July 5 validated indexes/pagination). Remaining costs: a per-request `User.findById` in `populateAuthLocals`, request-path OCR, and an unversioned/unminified asset pipeline. |
| Intuitivity | B | Core journeys got dedicated UX passes (June–July). Remaining: raw `403 Access denied` plain-text responses, HTML error pages returned to `fetch()` callers, no skip-link, and no holistic cross-journey audit since the flows were rebuilt. |

**Fixed during this review (zero-risk):** `startAuthenticatedSession` was storing the **full user document — including `passwordHash` — into the MongoDB session store** on every login (`req.session.user = user`, never read anywhere). Removed; unit suite 315/315 green.

---

## Phase map

| Phase | Theme | Priority | When | Doc |
|---|---|---|---|---|
| **0** | Pre-deploy security quick wins | P0–P1 | Before/with the production push | [phase-0-pre-deploy-security.md](phase-0-pre-deploy-security.md) |
| **1** | Process safety net (CI, safe test defaults, shutdown) | P0–P1 | Same week — no app-code risk | [phase-1-process-safety-net.md](phase-1-process-safety-net.md) |
| **2** | Environments & data safety (dev DB split, Redis, live-verification backlog) | P1–P2 | Right after deploy | [phase-2-environments-and-data-safety.md](phase-2-environments-and-data-safety.md) |
| **3** | Efficiency (request-path costs, assets) | P2–P3 | After Phase 2 | [phase-3-efficiency.md](phase-3-efficiency.md) |
| **4** | Intuitivity & UX | P2–P3 | After deploy, uses live app | [phase-4-intuitivity-ux.md](phase-4-intuitivity-ux.md) |
| **5** | Strategic debt (CSP nonces, CQ-3, dependency majors) | P3 | Ongoing, one item per session | [phase-5-strategic-debt.md](phase-5-strategic-debt.md) |

## Priority index (all findings)

| ID | Finding | Priority | Phase |
|---|---|---|---|
| SEC-N1 | `passwordHash` persisted in session store (never read) | P0 | ✅ fixed this session |
| PRC-1 | No CI pipeline — deploys from `main` with zero automated gate | P0 | 1 |
| PRC-2 | `npm test` default includes live-DB integration tests (no staging exists) | P0 | 1 |
| SEC-N2 | No `session.regenerate()` on any of the 3 login paths (session fixation) | P1 | 0 |
| SEC-N3 | IP attribution spoofable (first-XFF) and misattributed (`trust proxy 1` behind 2 hops) | P1 | 0 |
| SEC-N4 | `lucide@latest` from unpkg on **every page** — unpinned, no SRI; `quill@1.3.7` similar | P1 | 0 |
| PRC-4 | No graceful shutdown — Render SIGTERMs on every deploy | P1 | 1 |
| PRC-3 | No Node version pinning (`engines` / `.nvmrc`) | P1 | 1 |
| PRC-5 | No Dependabot/Renovate | P1 | 1 |
| PRC-8 | Dev environment **is** production (single `.env`) — root cause of the stuck verification backlog | P1 | 2 |
| OPS-1 | Redis absent in production — limiters are per-process in-memory | P2 | 2 |
| EFF-1 | `populateAuthLocals` runs `User.findById` on every HTML request | P2 | 3 |
| EFF-2 | ID-OCR (Tesseract WASM, ≤30 s) awaited inside the application-submit request | P2 | 3 |
| UX-1 | Global error/404 handlers always return HTML — breaks `fetch()` callers; no `headersSent` guard | P2 | 4 |
| UX-2 | Plain-text `403 Access denied` responses from auth middleware | P2 | 4 |
| UX-4 | No holistic cross-journey UX audit since flows were rebuilt | P2 | 4 |
| PRC-6 | No ESLint/Prettier | P2 | 1 |
| PRC-7 | No ops runbook (deploy/rollback/restore/incident) | P2 | 2 |
| EFF-3 | Unversioned static assets; 30 MB vendor tree on 1-day cache | P3 | 3 |
| EFF-4 | No minification (largest page script 116 KB raw) | P3 | 3 |
| UX-3 | No skip-to-content link (a11y otherwise decent: all `<img>` have `alt`) | P3 | 4 |
| SEC-N5 | CSP `script-src 'unsafe-inline'` | P3 | 5 |
| CQ-3 | Organiser route auth not unified on `protectEventMutation`/`protectEventRead` (carried over) | P3 | 5 |
| DEP-* | Dependency majors: express 5, mongoose 9, ejs, resend, bcryptjs, tesseract 7 | P3 | 5 |

## Verification doctrine (applies to every phase)

There is **no staging environment** (single `.env`, `APP_URL` = production). Every change here must be verified via: (1) the DB-free unit suite (`npm run test:unit`), (2) `node --check` / EJS compile on touched files, and (3) a listed **post-deploy smoke check** on production. Changes whose failure mode is "login breaks" or "authz changes" (SEC-N2, SEC-N3, CQ-3) are marked **supervised** — do them at the keyboard with an immediate rollback path (Render rollback to previous deploy), never batched with other work.
