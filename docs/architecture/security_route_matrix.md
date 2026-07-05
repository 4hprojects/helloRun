# Security Route Matrix

This matrix tracks the current protection posture for the main mutating auth/public routes after the June 3, 2026 auth abuse-protection pass.

| Route | Method | Auth | CSRF | Rate Limit | Bot Protection |
| --- | --- | --- | --- | --- | --- |
| `/login` | POST | public | no | yes | Adaptive Turnstile after 3 invalid credentials per email + IP in 15 minutes |
| `/signup` | POST | public | yes | yes | Turnstile, honeypot, form-age/session token, disposable email blocking |
| `/register` | POST | public | yes | yes | Turnstile, honeypot, form-age/session token, disposable email blocking |
| `/auth/google` | GET | public | n/a | no |
| `/forgot-password` | POST | public | yes | yes |
| `/reset-password/:token` | POST | public | yes | no |
| `/resend-verification` | POST | public | yes | yes |
| `/logout` | POST | authenticated | yes | no |
| `/events/:slug/register` | POST | runner | yes | no |
| `/profile/quick-update` | POST | runner | yes | yes |
| `/my-registrations/:registrationId/payment-proof` | POST | runner | yes | yes |
| `/my-registrations/:registrationId/submit-result` | POST | runner | yes | yes |
| `/my-registrations/:registrationId/resubmit-result` | POST | runner | yes | yes |
| `/organizer/events/:id/registrants/:registrationId/payment/approve` | POST | approved organiser/admin | yes | yes |
| `/organizer/events/:id/registrants/:registrationId/payment/reject` | POST | approved organiser/admin | yes | yes |
| `/organizer/events/:id/submissions/:submissionId/approve` | POST | approved organiser/admin | yes | yes |
| `/organizer/events/:id/submissions/:submissionId/reject` | POST | approved organiser/admin | yes | yes |
| `/organizer/events/:id/status` | POST | approved organiser | yes | no |
| `/organizer/events/:id/media/remove` | POST | approved organiser | yes | no |

Notes:
- Multipart routes run upload parsing first, then CSRF validation, so the token can be read from the parsed form body.
- `CSRF_PROTECTION=0` still disables enforcement for local troubleshooting; production/staging should leave it enabled.
- Turnstile is enabled only when both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are configured.
- Signup limits are 5 attempts per IP per hour and 3 attempts per email + IP per hour.
- Login keeps the existing 10-attempt email + IP rate limit and adds an adaptive Turnstile threshold at 3 invalid credential attempts. The threshold uses Redis when available and an in-memory fallback otherwise.
- Organizer payment and run-proof review actions share the review-action limiter. Event status and media removal are CSRF-protected but still lack dedicated mutation rate limits — that hardening pass has not been done yet for organiser routes.

## Admin Routes (`/admin/*`)

Added 2026-07-01 as part of the admin-panel improvements initiative
(`docs/todo/admin-improvements/`, Phase 3). All `/admin/*` mutating routes now carry a
rate limiter (Phase 2); this section makes that coverage auditable. Only the
destructive/high-risk routes are listed — see `src/routes/admin.routes.js` for the full
route table.

| Route | Method | Auth | Admin Tier | CSRF | Rate Limit | Bot Protection |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin/users/delete` | POST | admin | **full** | yes | adminAccountActionLimiter | n/a |
| `/admin/users/:id/edit` | POST | admin | any | yes | adminAccountActionLimiter | n/a |
| `/admin/users/:id/delete` | POST | admin | **full** | yes | adminAccountActionLimiter | n/a |
| `/admin/events/bulk-delete` | POST | admin | **full** | yes | adminModerationLimiter | n/a |
| `/admin/events/test-data/purge` | POST | admin | **full** | yes | adminTestDataPurgeLimiter | n/a |
| `/admin/users/test-fixtures/purge` | POST | admin | **full** | yes | adminTestUserPurgeLimiter | n/a |
| `/admin/events/:id/edit` | POST | admin | any | yes | adminModerationLimiter | n/a |
| `/admin/events/:id/delete` | POST | admin | **full** | yes | adminModerationLimiter | n/a |
| `/admin/applications/:id/approve` | POST | admin | any | yes | adminModerationLimiter | n/a |
| `/admin/applications/:id/reject` | POST | admin | any | yes | adminModerationLimiter | n/a |
| `/admin/promote` | POST | admin | **full** | yes | adminPromotionLimiter | n/a |
| `/admin/communications/settings` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/communications/events/:eventKey` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/communications/test-email` | POST | admin | **full** | yes | adminTestEmailLimiter | n/a |
| `/admin/homepage-carousel` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/ads` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/privacy-policy/:id/publish` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/terms-and-conditions/:id/publish` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/cookie-policy/:id/publish` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/data-usage-policy/:id/publish` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/refund-and-cancellation-policy/:id/publish` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/organiser-terms/:id/publish` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/community-guidelines/:id/publish` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/acceptable-use-policy/:id/publish` | POST | admin | **full** | yes | adminContentSettingsLimiter | n/a |
| `/admin/users/export.csv` | GET | admin | **full** | n/a | adminExportLimiter | n/a |
| `/admin/users/export.xlsx` | GET | admin | **full** | n/a | adminExportLimiter | n/a |
| `/admin/audit/export.csv` | GET | admin | **full** | n/a | adminExportLimiter | n/a |
| `/admin/audit/export.xlsx` | GET | admin | **full** | n/a | adminExportLimiter | n/a |
| `/admin/analytics/export.csv` | GET | admin | **full** | n/a | adminExportLimiter | n/a |
| `/admin/analytics/export.xlsx` | GET | admin | **full** | n/a | adminExportLimiter | n/a |

Admin notes:
- CSRF: `admin.routes.js` applies `requireCsrfProtection` at the router level to every
  `POST`/`PUT`/`PATCH`/`DELETE` request, so all mutating admin routes are covered even
  though the table doesn't repeat an inline call per route.
- As of Phase 2 (2026-07-01), every mutating route in `admin.routes.js` carries one of:
  `adminAccountActionLimiter`, `adminModerationLimiter`, `adminContentSettingsLimiter`,
  `adminTestEmailLimiter`, `adminPromotionLimiter`, or `adminExportLimiter` — the admin
  mutation rate-limiting gap referenced in earlier planning docs is now closed.
- **Admin permission tiers (implemented 2026-07-01, see `docs/to-implement/admin-permission-tiers.md`):**
  `User.adminTier` (`'full'` default, or `'support'`) plus a new `requireFullAdmin`
  middleware (`src/middleware/auth.middleware.js`) gate the "Admin Tier" column above.
  Missing/undefined `adminTier` is always treated as `'full'`, so existing admins are
  never locked out by the new field. `requireFullAdmin` always runs immediately after
  `requireAdmin` on a route. Only a full admin can grant/change another user's admin role
  or tier (`src/controllers/admin/users.controller.js#updateUser`); nobody can change
  their own tier via the edit form. This was the "role-based admin permission tiers"
  future-consideration item, promoted from backlog to implemented.
- **Test-data purge (added 2026-07-02):** `POST /admin/events/test-data/purge`
  permanently deletes every `Event` flagged `isTestData: true` plus everything linked to
  it (Registrations, Submissions, AccumulatedActivitySubmissions, EventPromotions,
  CertificateTemplates in MongoDB; the matching shadow rows in Postgres/Supabase). Unlike
  every other destructive route in this table, it is a hard delete, not a soft-delete —
  `verifyAdminDeletionPassword` plus a required typed `PURGE` confirmation gate it in
  addition to the usual reason/password checks, and it has its own strict
  `adminTestDataPurgeLimiter` (5/hour, per-admin-session-keyed) rather than sharing
  `adminModerationLimiter`. See `src/services/test-data-cleanup.service.js`.
- **Test-user purge (added 2026-07-02):** `POST /admin/users/test-fixtures/purge`
  permanently deletes every User with an `@example.com` email (excluding `role: 'admin'`
  and the acting admin's own account) plus everything they own — Registrations,
  Submissions, AccumulatedActivitySubmissions, OrganiserApplications, StravaConnections,
  Notifications, Blogs (+ their comments/likes/views/revisions), RunningGroups (+ their
  activity logs), EventPromotions, CertificateTemplates, and any Events they organize
  (reusing the test-data purge's event cascade) — in both MongoDB and the Postgres
  shadow tables (`app_users` and everything referencing it). Same elevated confirmation
  bar as the event purge (password + reason + typed `PURGE`) and its own strict
  `adminTestUserPurgeLimiter` (5/hour, per-admin-session-keyed). See
  `src/services/test-user-cleanup.service.js`.
- **Auth guard inconsistency (documented, not fixed):** the codebase uses two different
  admin-role guards. `admin.routes.js` uses `requireAdmin`
  (`src/middleware/auth.middleware.js`), which re-queries MongoDB for the user's current
  role on every request. Organiser routes (and the now-deleted
  `src/routes/admin/onsite-operations.js`) used `requireRole('admin')`
  (`src/middleware/role.middleware.js`), which trusts `req.session.role` without a fresh
  DB read. This is a pre-existing architectural inconsistency, not addressed by this
  matrix update.
- `src/routes/admin/onsite-operations.js` was deleted 2026-07-01: it was never mounted in
  `src/server.js` (confirmed via full-tree grep), so its 6 endpoints and no-op
  `verifyAdminAccess` middleware were unreachable dead code. Its sole service dependency,
  `src/services/onsite-operations-bulk.service.js`, was deleted alongside it after
  confirming no other file referenced it.
