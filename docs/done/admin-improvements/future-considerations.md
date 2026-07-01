# Admin Panel — Future Considerations

## Document Role

- **Purpose:** Lightweight backlog capture for longer-term admin-panel ideas surfaced
  during the admin-improvements initiative (`docs/todo/admin-improvements/`), deferred
  rather than designed in detail.
- **Status:** Backlog, except the first item below (implemented July 1, 2026). The
  remaining two are still unscheduled and need their own dedicated planning pass before
  implementation.

---

## Role-based admin permission tiers — ✅ Implemented July 1, 2026

Promoted from backlog to implemented. See `docs/to-implement/admin-permission-tiers.md`
for the full spec/implementation record. Summary: `User.adminTier` (`'full'` default, or
`'support'`) plus a new `requireFullAdmin` middleware gate the highest-blast-radius admin
routes (user/event deletion, policy publishing, communications settings, site config,
mass-email promotion, and data exports). Everyday admin work (user edit, event edit,
badge actions, application review, blog moderation) remains available to both tiers.

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
