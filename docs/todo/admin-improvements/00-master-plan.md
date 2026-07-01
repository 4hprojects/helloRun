# HelloRun Admin Panel Improvement Master Plan

Status: not started.

## Purpose

This workflow breaks a set of confirmed admin-panel gaps into four phases that can be
executed one at a time using Claude, Codex, or another coding assistant. It mirrors the
structure used in `docs/adsense-readiness/phases/` — one phase file per unit of work,
each with an Agent Prompt block that can be pasted directly into a fresh session.

## Background

The admin panel (`src/routes/admin.routes.js`, `src/controllers/admin/*`,
`src/views/admin/*`) has grown alongside the organiser panel but has fallen behind it in
three concrete ways, all verified against the live repo on 2026-07-01:

1. No CSV/XLSX export exists anywhere in `/admin/*`, even though the organiser side
   shipped this exact pattern for registrant exports (`src/routes/organiser/registrants.js`)
   and shop reports (Phase 11, `docs/STATUS.md`) using ExcelJS + a hand-rolled
   `csvEscape()` helper.
2. Rate limiting on `/admin/*` mutating routes is inconsistent: some destructive routes
   (`/users/:id/notes`, `/events/:id/approve`, blog moderation) are protected by
   `adminAccountActionLimiter` / `adminModerationLimiter`, but roughly 90 other mutating
   routes — including bulk user deletion and a mass-email "promote" endpoint — have no
   rate limiter at all.
3. `docs/architecture/security_route_matrix.md` only documents organiser/auth routes; it
   has zero rows for `/admin/*`.

A fourth issue was found during this pass and resolved by decision (see Phase 3):
`src/routes/admin/onsite-operations.js` is not mounted anywhere in `src/server.js` (only
`admin.routes.js` and `admin-shop.routes.js` are required under `/admin`), so its 6
endpoints and its no-op `verifyAdminAccess` middleware are currently unreachable dead
code. Decision: delete the file (Phase 3, Task 1).

## Recommended Phase Order

1. Phase 1 — Admin Data Exports (CSV/XLSX)
2. Phase 2 — Admin Mutation Rate Limiting
3. Phase 3 — Security Route Matrix Extension + Dead Middleware Cleanup
4. Phase 4 — Future Considerations Backlog (documentation only, no implementation)

## Files

- `01-phase-admin-data-exports.md` — implemented 2026-07-01, pending live-DB integration
  test verification before moving to `docs/done/`
- `02-phase-admin-mutation-rate-limiting.md` — implemented 2026-07-01, pending a manual
  429 smoke-check against a live server before moving to `docs/done/`
- `03-phase-security-matrix-and-dead-middleware-cleanup.md` — done; moved to
  `../../done/admin-improvements/03-phase-security-matrix-and-dead-middleware-cleanup.md`
- `04-phase-future-considerations-backlog.md`

## How To Use With Codex Or Claude

1. Open one phase file.
2. Give the coding assistant access to the HelloRun repository.
3. Paste the "Agent Prompt" section from that phase.
4. Ask the assistant to re-verify the referenced line numbers/routes before editing —
   this repo has recently undergone two large route-splitting refactors
   (`DEBT-1`, `DEBT-2` in `docs/STATUS.md`), so exact line numbers may drift.
5. Let it implement the phase.
6. Run the acceptance checks listed in the file (`npm run test:admin` at minimum).
7. Commit only after the phase's tests pass.
8. Move the phase file from `docs/todo/admin-improvements/` to
   `docs/done/admin-improvements/` (same filename) once acceptance criteria are verified.
   When all four phase files have moved, move `00-master-plan.md` there too.

## Global Rules For Every Phase

The agent must:

- Inspect the current state of `src/routes/admin.routes.js`, `src/controllers/admin/*`,
  and `src/middleware/rate-limit.middleware.js` before editing — do not assume the line
  numbers in these plan files are still exact.
- Reuse existing patterns: `createRateLimiter` from `src/middleware/rate-limit.middleware.js`
  for all new rate limiters; ExcelJS + `csvEscape`-style CSV generation for all new exports.
- Avoid unrelated refactors (do not re-split `admin.routes.js` into sub-files as part of
  these phases unless a phase explicitly calls for it).
- Preserve all existing route behavior, especially `requireAdmin` auth checks and the
  global CSRF middleware already applied to all POSTs in `admin.routes.js`.
- Run `npm run test:admin` (and any other test glob a phase names) before considering the
  phase done.
- Do not touch organiser-side files (`src/routes/organiser/*`, `src/controllers/organizer-shop.controller.js`)
  except where a phase explicitly says to extract a shared utility — and even then, do not
  change organiser route behavior.

## Known Pre-Existing Issue (not part of this plan, flag only)

`tests/organizer-route-source.unit.test.js` currently fails 2 of 3 assertions because it
still reads `src/routes/organizer.routes.js` (now a thin barrel) expecting to find
`registrantExportLimiter` / `submissionReviewActionLimiter`, which actually live in
`src/routes/organiser/registrants.js` since the `DEBT-2` route split. Phase 2 references
this because it asks for an analogous admin route-source test; consider fixing the stale
organizer test in the same pass since it establishes the exact pattern to copy.
