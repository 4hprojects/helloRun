# P11 — Admin User Management UI

**Priority:** P11  
**Effort:** ~1 week (core already built; remaining gaps ~1 day)  
**Status:** Implemented — June 24, 2026  
**Dependency:** Builds on P1 Admin Governance (completed June 22, 2026)

---

## What Was Already Built (June 22, 2026)

The core admin user management surface was completed as part of the P1 Admin Governance pass and the earlier admin MVP. All routes, controller functions, and views below are live and tested.

### Routes (`src/routes/admin.routes.js`)
- `GET /admin/users` — searchable, filterable, paginated user directory
- `GET /admin/users/:id` — full user detail page
- `GET /admin/users/:id/edit` — user edit form
- `POST /admin/users/:id/edit` — save profile edits (personal info, role, trust score)
- `POST /admin/users/delete` — bulk delete (password-protected)
- `POST /admin/users/:id/notes` — append admin note
- `POST /admin/users/:id/resend-verification` — resend email token (max 3/24h)
- `POST /admin/users/:id/verify-email` — override email verification with 20+ char reason
- `POST /admin/users/:id/account-status` — set active/restricted/suspended/closed

### User Directory (`/admin/users`)
- Full-text search by userId, email, first/last name
- Filters: role, organizer status, email verified, auth provider
- Sort: newest, oldest, recently updated, by role
- Pagination: 25/50/100/all per page
- Toggleable column visibility (User ID hidden by default)
- Quick-view modal with profile summary and "Open Full Details"
- Bulk delete with password confirmation modal

### User Detail (`/admin/users/:id`)
- Identity & metrics summary card
- Account card: email, auth method, verification status, account status
- Profile card: personal info, emergency contact
- Policy consent card
- Organizer application link
- Recent Registrations table (5 rows)
- Recent Submissions table (5 rows)
- Owned Events table (5 rows)
- **Account Status section**: dropdown (active/restricted/suspended/closed) + reason input
- **Admin Notes section**: reverse-chronological append-only notes + add form
- **Audit Trail section**: last 20 entries from Postgres `audit_critical` table

### Enforcement
- `suspended`/`closed` accounts: blocked from login; session destroyed on next request
- `restricted` accounts: blocked from submitting results, registering for events, checking out from shop
- Self-suspension blocked at controller level

### Tests
- `tests/admin-governance.integration.test.js` — 10 governance action tests
- `tests/admin-users.integration.test.js` — search, filter, pagination, edit, delete coverage

---

## Remaining Gaps (Completed June 24, 2026)

### 1. Account Status Filter

The user list showed `accountStatus` as a badge per row but had no filter dropdown to query by it. Admins couldn't easily find all restricted or suspended accounts.

**Fix:** Added `accountStatus` to `normalizeAdminUserFilters()`, `buildAdminUserQuery()`, and `buildAdminUserListPath()` in `admin.controller.js`. Added a filter dropdown to `users-list.ejs`.

### 2. `lastLoginAt` Tracking

The `User` model had no `lastLoginAt` field. Admins couldn't tell when a flagged user last accessed the platform or identify inactive accounts.

**Fix:** Added `lastLoginAt: { type: Date, default: null }` to `User.js`. Fire-and-forget `updateOne` on every successful login (local + Google OAuth) in `authRoutes.js`. Displayed in the user detail Account section and as an optional hidden column on the user list.

### 3. Badge List on User Detail

The ROADMAP spec included "badge list" in the user detail view, but it was never implemented. The detail showed registrations, submissions, and events but not earned badges.

**Fix:** Added `getRunnerEarnedBadges(userId, { limit: 20 })` to the `viewUser` parallel data fetch in `admin.controller.js`. Added a Badges section to `user-detail.ejs` showing badge name, event/scope, and award date. Added minimal grid CSS to `admin.css`.

---

## Access Control

All admin user management routes require `requireAdmin` middleware. Governance mutation routes have `adminAccountActionLimiter` (30 req/hour) and CSRF protection.

---

## Files Modified

| File | Purpose |
|------|---------|
| `src/models/User.js` | `lastLoginAt` field |
| `src/routes/authRoutes.js` | Set `lastLoginAt` on login |
| `src/controllers/admin.controller.js` | accountStatus filter; lastLoginAt in viewUser; earnedBadges in viewUser |
| `src/views/admin/users-list.ejs` | accountStatus filter dropdown; lastLoginAt column |
| `src/views/admin/user-detail.ejs` | lastLoginAt display; Badges section |
| `src/public/css/admin.css` | admin-badge-grid styles |
