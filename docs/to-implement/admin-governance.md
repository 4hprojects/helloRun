# Admin Governance

## Document Role
- Purpose: Spec for deferred admin account governance features — audit trail, account suspension, admin notes, and verification workflows.
- Status: Active backlog — Priority 4 (after shop UI and runner/organiser UX improvements).
- PRD reference: See `docs/PRD.md` admin governance items and `docs/user_management_improvement_draft.md` for the already-implemented admin user management MVP.

## Current Alignment Snapshot (June 2026)

The admin user management MVP is live (implemented May–June 2026). Admins can search, filter, view, and edit user accounts with guarded deletion. The gaps below are all explicitly listed as "still deferred" in `docs/user_management_improvement_draft.md`.

What is live:
- `/admin/users` — searchable user directory with filters, pagination, quick-view modal
- `/admin/users/:id` — full user detail page with account, profile, activity, compliance sections
- `/admin/users/:id/edit` — edit personal info, role, and organiser status; system data is read-only
- Guarded user deletion (dormant accounts only; cannot self-delete; bulk cap)
- Test coverage: `tests/admin-users.test.js`

Still deferred (all of this spec):
- `AdminAuditLog` model and mutation audit trail
- Account restriction / suspension workflow
- Admin notes on user profiles
- Resend verification and verification override
- Role-specific admin permission tiers (longer-term)

## Feature Intent

Make admin account governance defensible: every sensitive mutation is logged, restricted accounts are enforced across the platform, admins can leave notes for support context, and verification issues can be resolved without direct database access.

## Primary Users
- **Admins** — all features below are admin-only

## MVP Scope

### 1. AdminAuditLog Model and Mutation Trail

**Problem:** Admins can currently change a user's role, organiser status, or delete an account with no persistent record of who did what, why, or what the previous state was. This is a compliance and support liability.

**Data model — `AdminAuditLog`** (new Mongoose model):
```js
{
  actorId:        { type: ObjectId, ref: 'User', required: true },
  targetUserId:   { type: ObjectId, ref: 'User', default: null },
  action:         { type: String, required: true },
  // action values: role_change, organiser_status_change, account_status_change,
  //                verification_override, resend_verification, admin_note_added,
  //                account_deleted, account_anonymized
  before:         { type: Mixed, default: null },
  after:          { type: Mixed, default: null },
  reason:         { type: String, maxlength: 500, default: '' },
  ipAddress:      { type: String, default: '' },
  userAgent:      { type: String, default: '' },
  createdAt:      { type: Date, default: Date.now }
}
```

**Service:** Add `src/services/admin-audit-log.service.js`:
- `logAction({ actorId, targetUserId, action, before, after, reason, req })` — creates an `AdminAuditLog` document; extracts `ipAddress` and `userAgent` from `req`
- `getLogsForUser(targetUserId, opts)` — returns paginated log entries for a given user
- `getRecentActions(adminId, limit)` — for the admin's own activity feed

**Wire audit logging into every admin mutation:**
- Role change in `/admin/users/:id/edit` — log before/after role
- Organiser status change — log before/after status and linked application ID
- User deletion — log `action: 'account_deleted'` with snapshot of key fields before delete
- Future: account status change, verification override, resend verification

**Surface audit log in admin UI:**
- Add an "Audit Trail" tab or collapsible section to `/admin/users/:id`
- Show last N audit entries for the user with: date, actor name, action label, before/after summary, reason

**Acceptance:**
- Every role change and organiser status change creates an `AdminAuditLog` entry
- Audit log entries for a user are visible on the user detail page
- Log includes the actor's ID, not just "admin"
- Test in `tests/admin-audit-log.unit.test.js`: `logAction` creates a document; `getLogsForUser` returns correct entries

### 2. Account Suspension / Restriction Workflow

**Problem:** The Terms of Service reference suspension and termination, but the `User` model has no `accountStatus` field. There is no way to restrict a user's access without deleting their account.

**Data model additions to `User`:**
```js
accountStatus: {
  type: String,
  enum: ['active', 'restricted', 'suspended', 'closed'],
  default: 'active'
},
accountStatusReason: {
  type: String,
  trim: true,
  maxlength: 500,
  default: ''
},
accountStatusUpdatedAt: { type: Date, default: null },
accountStatusUpdatedBy: { type: ObjectId, ref: 'User', default: null }
```

**Middleware enforcement:**
- In the session auth middleware (`requireAuth` or equivalent), after loading the user from session, check `accountStatus`
- If `suspended` or `closed`: destroy the session and redirect to `/auth/login` with an error message explaining the account is suspended
- If `restricted`: allow login but block specific write actions (registration, submission, new orders) — surface a banner on the runner dashboard

**Admin UI:**
- Add an "Account Status" section to `/admin/users/:id`
- Show current status with a badge
- Provide a "Change Status" action with:
  - Status selector: active / restricted / suspended
  - Required reason field (min 10 chars)
  - Confirmation modal with "I understand this will affect the user's access"
- Wire change to `logAction` with `action: 'account_status_change'`, before/after, and reason

**Acceptance:**
- A suspended user cannot log in; existing session is terminated on next request
- A restricted user can log in but cannot submit registrations or run proofs; they see a banner explaining the restriction
- Admin can change status from suspended back to active with a reason
- Every status change is recorded in `AdminAuditLog`
- Add shadow sync field to Supabase `app_users` table if `accountStatus` needs to be queryable server-side outside MongoDB

### 3. Admin Notes on User Profiles

**Problem:** Admins handling support requests have no way to leave internal notes on a user's profile visible only to other admins.

**Data model — inline on `User`** (preferred over separate model for MVP):
```js
adminNotes: [{
  note:      { type: String, maxlength: 1000, required: true },
  addedBy:   { type: ObjectId, ref: 'User', required: true },
  addedAt:   { type: Date, default: Date.now }
}]
```

**Admin UI:**
- Add an "Admin Notes" section to `/admin/users/:id`
- Textarea + "Add Note" button — submits `POST /admin/users/:id/notes`
- Notes list shows note text, author name, and date — most recent first
- Admins cannot edit or delete their own notes in MVP (append-only for integrity)
- Notes are never visible to the user themselves

**Access control:**
- All note routes require `requireAdmin`
- CSRF protected

**Acceptance:**
- Admin can add a note from the user detail page
- Notes appear in the "Admin Notes" section in reverse chronological order with author name and timestamp
- Notes are not visible anywhere in the runner-facing views
- `logAction` is called with `action: 'admin_note_added'` (note text is NOT stored in the audit log — only the fact that a note was added)

### 4. Resend Verification and Verification Override

**Problem:** When a runner does not receive their verification email (spam filter, typo, provider issue), the only current resolution is direct database access. There is no admin UI to resend the email or manually mark the account as verified.

**Resend verification:**
Route: `POST /admin/users/:id/resend-verification`
- Available only when `emailVerified === false` and `authProvider === 'local'`
- Calls the existing verification email service with a fresh token
- Rate-limited per user: max 3 sends per 24 hours
- Creates an `AdminAuditLog` entry with `action: 'resend_verification'`
- Returns success/error JSON; surfaces result in the UI as a toast

**Verification override:**
Route: `POST /admin/users/:id/verify-email`
- Admin manually marks `emailVerified = true` without the runner clicking a link
- Requires an explicit reason field (min 20 chars) and a confirmation checkbox ("I have independently confirmed the runner's email is valid")
- Creates an `AdminAuditLog` entry with `action: 'verification_override'` capturing before state (`emailVerified: false`), after state (`emailVerified: true`), and the admin's reason
- Should be used sparingly — resend is the preferred first step

**Admin UI:**
- Both actions appear as buttons in the "Account" section of `/admin/users/:id` when the account is unverified
- Resend button disables after click and shows "Sent — check email" feedback
- Override requires the confirmation modal before submitting

**Acceptance:**
- Resend sends an email via the existing verification email service and logs the action
- Override marks the account verified, logs the action with reason, and the "unverified" badge disappears from the user detail page
- Neither action is available if the account is already verified (buttons hidden or disabled)
- Resend is blocked if already sent 3 times in 24 hours (shows remaining count)

## Suggested Build Order

1. `AdminAuditLog` model + service — foundation everything else builds on
2. Wire audit logging into existing admin mutations (role change, deletion)
3. Admin notes — simple append-only, no new model needed
4. Resend verification — reuses existing email service
5. Account suspension — most impactful but requires middleware enforcement and Supabase migration

## Test Coverage Targets

- `tests/admin-audit-log.unit.test.js` — `logAction` creates document; `getLogsForUser` paginates correctly; `getRecentActions` returns correct subset
- `tests/admin-governance.integration.test.js` — role change logs audit entry; suspension blocks session; resend verification sends email and logs; override marks verified and logs; note add appears in notes list
- Existing `tests/admin-users.integration.test.js` must continue to pass after `User` model additions
