# Admin Panel — Future Considerations

## Document Role

- **Purpose:** Lightweight backlog capture for longer-term admin-panel ideas surfaced
  during the admin-improvements initiative (`docs/todo/admin-improvements/`), deferred
  rather than designed in detail.
- **Status:** Backlog — none of these are scheduled. Each needs its own dedicated
  planning pass before implementation.

---

## Role-based admin permission tiers

Today, `requireAdmin` (`src/middleware/auth.middleware.js`) and `requireRole('admin')`
(`src/middleware/role.middleware.js`) both treat "admin" as a single flat role with full
access to every route in `src/routes/admin.routes.js` — there is no distinction between,
say, a support admin who can view/edit users and a super-admin who can delete accounts,
edit policy documents, or send platform-wide promotions.

**Rough shape for later:** a `permissions` or `adminTier` field on the `User` model, a
small `requirePermission(permission)` middleware alongside the existing `requireAdmin`,
and a mapping of admin routes to required permissions — the extended security matrix
added in Phase 3 (`docs/architecture/security_route_matrix.md`) would be a natural input
to that mapping.

## Admin-editable email template UI

Transactional/communication emails (`communicationService`) currently appear to be
defined in code rather than editable through the admin panel. An eventual "Email
Templates" admin screen would let admins edit subject/body copy for these without a
deploy.

**Rough shape for later:** inspect wherever `communicationService` currently sources
template content from, decide whether templates become DB-backed or file-backed with an
admin override layer, and reuse the existing policy-document draft/preview/publish
workflow (`src/controllers/admin/policy.controller.js`) as a UX precedent since it
already solves "draft, preview, then publish" for admin content.

## Admin "login as user" impersonation

Support staff currently cannot see what a runner/organiser sees without asking for
credentials. An eventual impersonation feature would let an admin start a scoped,
time-limited, fully-audited session as another user. This is the highest-risk of the
three ideas from a security standpoint.

**Rough shape for later:** a signed, short-lived "impersonation token", a visible banner
in every page while impersonating, an audit entry on both start and end of the session
(via the existing `recordCriticalAuditEventInBackground` /
`src/services/critical-audit-query.service.js` infrastructure), and a hard, non-negotiable
block on impersonating admin-role accounts. Constraints that must survive into any future
design: audit everything, never admin-to-admin, always time-boxed.
