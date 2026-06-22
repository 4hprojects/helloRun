# Admin Governance Implementation

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026
**Tests:** 10/10 integration + 44/44 auth
**Spec:** `docs/to-implement/admin-governance.md`

---

## Overview

Extends the existing admin user management MVP (`/admin/users`, `/admin/users/:id`) with four deferred governance features: audit trail, admin notes, verification actions, and account suspension.

**Key decision:** No new MongoDB audit model — uses the existing `critical-audit.service.js` (Postgres `audit_critical` table) with `admin.user.*` action names, consistent with how all other critical actions are already logged.

---

## Step 1 — Audit Trail

Wire `recordCriticalAuditEventInBackground()` into existing admin mutations:
- `updateUser` → logs role changes and organiser status changes
- `deleteUsers` → logs each deletion

Show Audit Trail section on `/admin/users/:id` (queries `audit_critical` WHERE `target_id = userId`).

## Step 2 — Admin Notes

- Add `adminNotes[]` array to `User.js`
- New `POST /admin/users/:id/notes` route + controller method
- Append-only notes card on user detail (author + date shown)

## Step 3 — Resend Verification & Email Override

- `POST /admin/users/:id/resend-verification` — reuses `communicationService.notify()` email pattern
- `POST /admin/users/:id/verify-email` — manual override, requires 20-char reason
- Rate-limited via `adminActionLimiter`; buttons shown in Account card when user is unverified local auth

## Step 4 — Account Suspension

- Add `accountStatus` / `accountStatusReason` / `accountStatusUpdatedAt` / `accountStatusUpdatedBy` to `User.js`
- Suspension check in `populateAuthLocals` (destroys session) and login flow (blocks at login)
- New `POST /admin/users/:id/account-status` route
- Status badge on user detail + list; admins cannot suspend themselves

---

## Files Changed

| File | Change |
|------|--------|
| `src/models/User.js` | Add `accountStatus`, `accountStatusReason`, `accountStatusUpdatedAt`, `accountStatusUpdatedBy`, `adminNotes[]` |
| `src/middleware/auth.middleware.js` | Add suspension check in `populateAuthLocals` |
| `src/routes/authRoutes.js` | Add suspension check in login flow |
| `src/routes/admin.routes.js` | 4 new routes + `adminActionLimiter` |
| `src/controllers/admin.controller.js` | Audit wiring + 4 new controller methods + viewUser audit query |
| `src/views/admin/user-detail.ejs` | Audit Trail, Admin Notes, Verification actions, Account Status sections |
| `src/views/admin/users-list.ejs` | Account status badge for non-active accounts |
| `tests/admin-governance.integration.test.js` | **New** — 10 integration tests |

---

## Verification Checklist

- [ ] Add note → appears with author + date on user detail
- [ ] Add note without text → error, note not saved
- [ ] Resend verification → token updated, email sent
- [ ] Resend for verified user → blocked
- [ ] Override verification with reason → user marked verified, audit logged
- [ ] Override without reason → blocked
- [ ] Suspend user → status badge shows on detail + list
- [ ] Suspended user logs in → blocked with message
- [ ] Active session suspended → destroyed on next request
- [ ] Role change → appears in audit trail on user detail
- [ ] Deletion → audit trail entry logged
- [ ] Admin cannot suspend themselves → blocked
- [ ] Tests: 10/10 passing
