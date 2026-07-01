# Admin Permission Tiers

## Document Role

- **Purpose:** Spec and implementation record for role-based admin permission tiers.
- **Status:** Implemented July 1, 2026. Originally captured as a backlog item in
  `docs/done/admin-improvements/future-considerations.md` during the admin-improvements
  initiative; promoted to active work and implemented in this session.

---

## Feature Summary

Previously, "admin" was a single flat role with unrestricted access to every route in
`src/routes/admin.routes.js`. This adds a second, lower-privilege **support** tier that
can do everyday moderation/support work but is blocked from the highest-blast-radius
actions.

- **`full` tier (default):** unrestricted — identical to admin behavior before this
  feature. All existing admins default to `full` so nobody is locked out by the new field.
- **`support` tier:** blocked from user/event deletion, policy document publishing,
  communications settings + test email, homepage carousel + ad settings, mass-email
  promotion (`/admin/promote`), and all data exports (PII). Everything else — user
  edit/notes/resend-verification/account-status, event edit/media/sitemap-toggle, badge
  actions, organiser application approve/reject, blog moderation — remains available.

---

## Implementation

### Schema

`src/models/User.js` — new `adminTier` field: `enum: ['full', 'support']`, `default:
'full'`. Only meaningful when `role === 'admin'`. Missing/undefined is always treated as
`'full'` wherever it's checked (not just at the schema-default level), so pre-existing
admin documents that predate this field are unaffected.

### Middleware

`src/middleware/auth.middleware.js`:
- `isFullAdminTier(user)` — `Boolean(user) && user.adminTier !== 'support'`.
- `requireFullAdmin(req, res, next)` — re-queries `role` + `adminTier` from MongoDB (same
  pattern as `requireAdmin`) and 403s unless the session user is `role === 'admin'` and
  full-tier. Always runs immediately after `requireAdmin` on a route, never standalone.

### Routes gated by `requireFullAdmin`

Applied in `src/routes/admin.routes.js` to: both user-delete routes
(`/users/delete`, `/users/:id/delete`), event deletion (`/events/bulk-delete`,
`/events/:id/delete`), `/promote`, `/communications/settings`,
`/communications/events/:eventKey`, `/communications/test-email`, `/homepage-carousel`,
`/ads`, every policy-document `:id/publish` route (privacy, terms, cookie, and all 5
dynamically-registered documents), and all 6 CSV/XLSX export routes added in Phase 1.
See `docs/architecture/security_route_matrix.md` for the full route-by-route table.

### Privilege-escalation guards

`src/controllers/admin/users.controller.js#updateUser` — the generic user-edit form
already lets any admin change any user's `role` (including promoting a runner to admin),
so tier enforcement had to close two gaps beyond the route-level gate:
1. **No self-service tier changes.** An admin can never change their own `adminTier` via
   the edit form (mirrors the existing "cannot remove your own admin role" guard).
2. **Only a full admin can grant or edit admin access.** If the acting admin is
   support-tier, any attempt to set `role` to `admin` (on a new-to-admin user) or to
   change an existing admin's `role`/`adminTier` is rejected and the original values are
   restored before re-rendering the form with a 403.

Without guard #2, a support-tier admin could trivially bypass every other restriction by
just promoting a runner to a fresh `full`-tier admin account through the ordinary edit
form — the tier system would be security theater without it.

### UI

- `src/views/admin/user-edit.ejs` — new "Admin Tier" select (disabled, with an inline
  explanation, whenever the viewer isn't full-tier or is editing their own account); a
  meta-card showing the current tier when `managedUser.role === 'admin'`.
- `src/views/admin/users-list.ejs` — a compact tier badge (`F`/`S`) next to the role badge
  for admin-role rows.
- `src/public/css/admin.css` — `.status-badge-full` / `.status-badge-support` color
  variants.

### Audit

`admin.user.admin_tier_changed` added to `AUDIT_ACTION_GROUPS.admin` in
`src/services/critical-audit-query.service.js`; `updateUser` records this event whenever
a tier actually changes, following the same pattern as the existing
`admin.user.role_changed` / `admin.user.organiser_status_changed` events.

---

## Key Files

| File | Role |
|------|------|
| `src/models/User.js` | New `adminTier` field |
| `src/middleware/auth.middleware.js` | `isFullAdminTier`, `requireFullAdmin` |
| `src/routes/admin.routes.js` | `requireFullAdmin` applied to 24 routes |
| `src/controllers/admin/_shared.js` | `ADMIN_TIER_OPTIONS`, form-data/validation helpers, `mapAdminUserListItem` |
| `src/controllers/admin/users.controller.js` | `renderEditUser`/`updateUser` escalation guards |
| `src/services/critical-audit-query.service.js` | `admin.user.admin_tier_changed` action string |
| `src/views/admin/user-edit.ejs`, `src/views/admin/users-list.ejs` | UI |
| `docs/architecture/security_route_matrix.md` | Route-by-route tier requirements |

## Verification

- `node --check` on all changed files.
- `require()` load checks on `admin.routes.js` (loads without throwing) and
  `admin.controller` (exports resolve as functions).
- EJS compile checks on `user-edit.ejs` and `users-list.ejs`.
- Source-level tests: `tests/admin-permission-tier-source.unit.test.js` (route wiring,
  zero routes missing the tier gate where expected) and a pure unit test for
  `isFullAdminTier`.
- **Not verified:** full `npm run test:admin` integration suite and a live click-through
  of the edit form as a support-tier admin — no MongoDB/Postgres/live server available in
  this environment.
