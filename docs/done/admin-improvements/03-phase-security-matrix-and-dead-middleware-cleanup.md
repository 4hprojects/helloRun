# Phase 3 — Security Route Matrix Extension + Dead Middleware Cleanup

Status: implemented 2026-07-01. `src/routes/admin/onsite-operations.js` and its sole
dependency `src/services/onsite-operations-bulk.service.js` were deleted after
re-confirming via full-tree grep that neither `src/server.js` nor any view/test
referenced them. `docs/architecture/security_route_matrix.md` now has an `/admin/*`
section covering every route touched by Phase 1/2, cross-checked row-by-row against the
live `admin.routes.js` source. The `requireAdmin` vs `requireRole('admin')`
inconsistency is documented in the matrix, not fixed (out of scope). Verified via
`node --check`, a full-tree grep for dangling references (none found), and a
`require('./src/server.js')` smoke check (loads without throwing). Move this file to
`docs/done/admin-improvements/`.

## Objective

Extend `docs/architecture/security_route_matrix.md` to cover `/admin/*` routes (it
currently only tracks organiser/auth routes), and delete the unmounted, dead
`src/routes/admin/onsite-operations.js` route file.

## Why This Matters

`docs/architecture/security_route_matrix.md` is the project's single source of truth for
"what protects this route" (Auth / CSRF / Rate Limit / Bot Protection). It has zero rows
for `/admin/*`, so nobody can look at one file and know, for example, that `/admin/promote`
now has a rate limiter (after Phase 2) or that `/admin/users/:id/delete` requires
confirmation in addition to `requireAdmin`. Extending the matrix makes Phase 2's work
auditable and gives future contributors the same visibility organiser routes already have.

Separately, `src/routes/admin/onsite-operations.js` contains a no-op middleware:
```js
async function verifyAdminAccess(req, res, next) {
  if (!req.user || !req.session) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  next();
}
```
It runs after `requireAuth, requireRole('admin')` on every route in the file, and only
checks `req.user`/`req.session` existence — not role — so it adds nothing:
`requireRole('admin')` (`src/middleware/role.middleware.js`) already redirects/403s
unauthenticated or non-admin sessions before `verifyAdminAccess` ever runs.

**Confirmed this session**: `src/server.js` never `require`s or `app.use`s
`./routes/admin/onsite-operations` under `/admin` or anywhere else (only
`admin.routes.js` and `admin-shop.routes.js` are mounted under `/admin`). This means:
- The no-op middleware is not just redundant, it is unreachable in production today.
- The six endpoints in that file (bulk-assign bibs, bulk check-ins, process/retry result
  imports, export import errors, list check-ins, list result imports, update check-in
  status) are entirely inaccessible via HTTP right now.
- No view/JS in `src/views` or `src/public` calls any of these paths
  (`bibs/bulk-assign`, `check-ins/bulk`, `result-imports`, etc.).

**Decision (made with the user this session): delete the file.** It's inert, nothing
references it, and reviving an old, unvetted bulk-ops feature without a driving UI is
lower value than just removing dead code.

## Files To Touch

- `docs/architecture/security_route_matrix.md` — add an `/admin/*` section.
- `src/routes/admin/onsite-operations.js` — delete.
- Possibly `src/services/onsite-operations-bulk.service.js` — evaluate for removal too
  (see Task 1).
- Possibly `tests/*onsite*.test.js` — check for direct references before deleting.

## Tasks

1. **Before deleting, re-confirm and check for indirect references.** Run:
   ```
   grep -rn "admin/onsite-operations" src/server.js src/routes src/views src/public
   grep -rln "onsite-operations-bulk.service" src/ tests/
   ```
   Confirm the route file is still unmounted. If any test file imports
   `src/routes/admin/onsite-operations.js` directly (e.g. via `supertest` against a
   manually-constructed app that mounts it standalone), read that test first — it may be
   the only caller and should be deleted or updated alongside the route file. Only delete
   `src/services/onsite-operations-bulk.service.js` if nothing else imports it after the
   route file is gone.

2. **Delete `src/routes/admin/onsite-operations.js`** (and the service file too, if step 1
   confirms it has no other consumer). This removes the no-op `verifyAdminAccess`
   middleware along with the rest of the dead file — no separate middleware-only edit is
   needed since the whole file goes.

3. **Extend `docs/architecture/security_route_matrix.md`** with a new `/admin/*` section,
   matching the existing table's exact column format (`Route | Method | Auth | CSRF | Rate
   Limit | Bot Protection`). At minimum, cover the destructive/high-risk routes touched by
   Phase 2:
   ```
   | `/admin/users/delete` | POST | admin | yes | adminAccountActionLimiter | n/a |
   | `/admin/users/:id/delete` | POST | admin | yes | adminAccountActionLimiter | n/a |
   | `/admin/users/:id/edit` | POST | admin | yes | adminAccountActionLimiter | n/a |
   | `/admin/events/bulk-delete` | POST | admin | yes | adminModerationLimiter | n/a |
   | `/admin/events/:id/delete` | POST | admin | yes | adminModerationLimiter | n/a |
   | `/admin/promote` | POST | admin | yes | adminPromotionLimiter | n/a |
   | `/admin/communications/test-email` | POST | admin | yes | adminTestEmailLimiter | n/a |
   | `/admin/privacy-policy/:id/publish` | POST | admin | yes | adminContentSettingsLimiter | n/a |
   | `/admin/users/export.csv` | GET | admin | n/a | adminExportLimiter | n/a |
   | `/admin/audit/export.csv` | GET | admin | n/a | adminExportLimiter | n/a |
   ```
   (Exact rows depend on what Phase 1/2 actually shipped — regenerate this list from the
   final state of `src/routes/admin.routes.js`, do not assume the row set above is final.)
   Also update this file's closing "Notes" section — the current note "Event status and
   media removal are CSRF-protected but should still receive dedicated mutation rate
   limits in the next hardening pass" refers to organiser routes; once Phase 2 lands, add a
   parallel note confirming `/admin/*` mutation routes now have the same coverage, or
   remove the note if it's now fully resolved for both organiser and admin.

4. **Cross-check `requireAdmin` vs `requireRole('admin')`.** While extending the matrix,
   note in the file (or in a follow-up doc note) that the codebase has two different
   admin-role guards: `requireAdmin` (`src/middleware/auth.middleware.js`, re-queries
   MongoDB for the user's current role) used by `admin.routes.js`, and
   `requireRole('admin')` (`src/middleware/role.middleware.js`, trusts `req.session.role`)
   used by organiser routes. This is a pre-existing architectural inconsistency, not a bug
   to fix in this phase — just document it so the matrix accurately reflects which guard
   each route actually uses.

## Acceptance Criteria

- `src/routes/admin/onsite-operations.js` is deleted (and
  `src/services/onsite-operations-bulk.service.js` too, if confirmed unused elsewhere).
- `docs/architecture/security_route_matrix.md` has a new `/admin/*` section using the
  exact same column format as the existing table, covering at minimum every route touched
  by Phase 2's new limiters and Phase 1's new export routes.
- The matrix's closing notes are updated to no longer describe admin mutation rate
  limiting as an open gap.
- `node --check` passes on any modified route file; `npm run test:admin` passes, and no
  test references the deleted file.

## Agent Prompt

```txt
You are working on the HelloRun codebase. Complete Phase 3 of the admin improvements plan:
extend the security route matrix to cover /admin/* and delete the dead, unmounted
src/routes/admin/onsite-operations.js file.

Before editing:
1. Confirm src/routes/admin/onsite-operations.js is still unmounted by grepping
   src/server.js and the whole src/ tree for "admin/onsite-operations". If you find it IS
   mounted somewhere now, stop and re-read this phase's assumptions before proceeding.
2. Check whether src/services/onsite-operations-bulk.service.js or any test file
   references the route file or the service directly.
3. Read docs/architecture/security_route_matrix.md in full to match its exact table format
   and tone.
4. Read the final state of src/routes/admin.routes.js (after Phases 1 and 2) to know which
   routes and limiters actually exist.

Tasks:
1. Delete src/routes/admin/onsite-operations.js. Delete
   src/services/onsite-operations-bulk.service.js too if nothing else imports it. Remove
   or update any test file that referenced either.
2. Add an /admin/* section to docs/architecture/security_route_matrix.md, in the same
   table format as the existing organiser/auth section, covering the destructive/high-risk
   admin routes (user delete/edit, event delete/bulk-delete, promote, test-email, policy
   publish, new export routes).
3. Update the matrix's closing Notes section to reflect that admin mutation rate limiting
   is now covered.

Acceptance checks:
- Dead file(s) removed, no dangling references.
- Security matrix has a working /admin/* section matching the existing format.
- npm run test:admin passes.

Report the files changed.
```
