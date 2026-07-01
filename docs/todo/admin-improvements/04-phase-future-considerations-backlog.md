# Phase 4 — Future Considerations Backlog (Documentation Only)

Status: not started — this phase produces a document, not code.

## Objective

Capture three longer-term admin-panel ideas as a lightweight backlog document so they are
not lost, without designing or implementing them now: role-based admin permission tiers,
an admin-editable email template UI, and admin "login as user" impersonation.

## Why This Matters

These three ideas came up during research for Phases 1-3 but are each substantial enough
(data model changes, security review, UX design) to warrant their own dedicated planning
pass later. Writing a short problem statement per idea now, in the same
`docs/to-implement/`-style tone the repo already uses (see
`docs/to-implement/admin-governance.md` for tone/structure), is enough to make sure they
surface in the next planning cycle without over-investing effort today.

## Files To Touch

- New: `docs/todo/admin-improvements/future-considerations.md`.
- `docs/todo/admin-improvements/00-master-plan.md` — add a link to the new doc (if this
  phase file hasn't already moved to `docs/done/`).

## Tasks

1. Write `docs/todo/admin-improvements/future-considerations.md` with one short section
   per idea:

   **Role-based admin permission tiers.** Today, `requireAdmin`
   (`src/middleware/auth.middleware.js`) and `requireRole('admin')`
   (`src/middleware/role.middleware.js`) both treat "admin" as a single flat role with full
   access to every route in `src/routes/admin.routes.js` — there is no distinction between,
   say, a support admin who can view/edit users and a super-admin who can delete accounts,
   edit policy documents, or send platform-wide promotions. Rough shape for later: a
   `permissions` or `adminTier` field on the `User` model, a small
   `requirePermission(permission)` middleware alongside the existing `requireAdmin`, and a
   mapping of admin routes to required permissions (the extended security matrix from
   Phase 3 would be a natural input to that mapping). Do not design the schema or
   middleware now — just record the problem.

   **Admin-editable email template UI.** Transactional/communication emails
   (`communicationService`) currently appear to be defined in code rather than editable
   through the admin panel. An eventual "Email Templates" admin screen would let admins
   edit subject/body copy for these without a deploy. Rough shape for later: inspect
   wherever `communicationService` currently sources template content from, decide whether
   templates become DB-backed or file-backed with an admin override layer, and reuse the
   existing policy-document draft/preview/publish workflow
   (`src/controllers/admin/policy.controller.js`) as a UX precedent since it already solves
   "draft, preview, then publish" for admin content. Do not design further now.

   **Admin "login as user" impersonation.** Support staff currently cannot see what a
   runner/organiser sees without asking for credentials. An eventual impersonation feature
   would let an admin start a scoped, time-limited, fully-audited session as another user.
   This is the highest-risk of the three ideas from a security standpoint (session
   handling, audit trail — see `recordCriticalAuditEventInBackground` and
   `src/services/critical-audit-query.service.js` for the existing audit infrastructure it
   would need to hook into) and a hard requirement to never allow impersonating another
   admin. Rough shape for later: a signed, short-lived "impersonation token", a visible
   banner in every page while impersonating, an audit entry on both start and end of the
   session, and a hard block on impersonating admin-role accounts. Do not design the token
   format, session handling, or UI now — just record the problem and the non-negotiable
   constraints (audit everything, never admin-to-admin, always time-boxed).

2. Do not create tickets, schema, middleware, or routes for any of the three items in this
   phase. This phase's only deliverable is the document.

## Acceptance Criteria

- A single markdown file exists capturing all three ideas with a short problem statement
  and rough shape each (a few sentences to a short paragraph per idea — not a full spec).
- No code, schema, or route changes are made in this phase.
- The document is linked from `docs/todo/admin-improvements/00-master-plan.md` (or from
  `docs/STATUS.md`, if `00-master-plan.md` has already moved to `docs/done/` by the time
  this phase runs).

## Agent Prompt

```txt
You are working on the HelloRun codebase. Complete Phase 4 of the admin improvements plan:
write a lightweight "future considerations" backlog document for three deferred ideas —
role-based admin permission tiers, an admin-editable email template UI, and admin
"login as user" impersonation.

This is a documentation-only phase. Do not write any code, middleware, routes, or schema
changes.

Tasks:
1. Read docs/to-implement/admin-governance.md to match its tone/structure.
2. Write docs/todo/admin-improvements/future-considerations.md with one short section per
   idea: a 2-3 sentence problem statement and a short "rough shape for later" note, not a
   detailed design.
3. Link the new doc from docs/todo/admin-improvements/00-master-plan.md (or docs/STATUS.md
   if 00-master-plan.md has already moved to docs/done/).

Acceptance checks:
- The new doc exists and covers all three ideas at backlog-level detail only.
- No source files were modified.

Report the file created.
```
