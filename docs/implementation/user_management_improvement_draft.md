# User Management Improvement Draft

## Implementation Status - May 13, 2026

Status: MVP implemented.

## Auth Support Update - June 1, 2026

Status: local signup and email/password login support refinements implemented.

Completed auth workflow improvements:

- Server password validation now matches the signup UI: passwords need at least 8 characters, uppercase, lowercase, and a number; common symbols are allowed instead of being rejected after the browser marks them valid.
- Local auth email lookup now trims and lowercases email input for signup, login, forgot-password, and resend-verification flows.
- Login error recovery preserves the submitted email value so users do not have to retype it after a failed attempt.
- Unverified local accounts now get a direct resend-verification link from the login error state.
- Login client-side validation now uses inline errors and no longer disables the login button when a client-side validation error prevents submission.
- Focused coverage exists in `tests/auth-local-workflow.test.js`; the broader `npm run test:auth` suite passed after the change.

## Auth Abuse Protection Update - June 3, 2026

Status: signup protection and adaptive login challenge implemented.

Completed protections:

- Local signup now requires Cloudflare Turnstile when `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are configured.
- Turnstile tokens are validated server-side through Cloudflare Siteverify before user creation.
- Signup now includes IP and email + IP rate limits, a hidden honeypot, a minimum form-age check, a session-bound form token, disposable email blocking, and the existing email verification requirement.
- Login keeps its existing email + IP rate limit and adds adaptive Turnstile after 3 invalid credential attempts for the same email + IP within 15 minutes.
- Login failure tracking uses Redis when available and an in-memory fallback otherwise, so discarding browser cookies does not bypass the adaptive challenge.
- Successful local login clears the associated failed-login counter.
- Focused coverage exists in `tests/auth-abuse.service.test.js` and `tests/auth-local-workflow.test.js`; `npm run test:auth` passed with 44 tests.

Implemented admin surfaces:

- `/admin/users`
- `/admin/users/:id`
- `/admin/users/:id/edit`

Completed capabilities:

- Admin-only user directory with search, filters, pagination, sort controls, and activity counts.
- Dashboard entry point for user management.
- Compact quick-view modal with profile, access, contact, timestamps, and activity summary.
- "Open Full Details" from the modal opens the full detail page in a new tab.
- Column checklist for the directory table; User ID is hidden by default and can be re-enabled.
- Responsive table behavior for desktop, tablet, and mobile with compact labels and horizontal overflow where needed.
- User detail page with account, profile, emergency contact, policy consent, organizer application, recent registrations/submissions, and owned events.
- Admin edit page for personal information plus role and organizer status only.
- System/account data remains read-only from the edit page: email, auth provider, password, verification state, IDs, timestamps, consent, and activity data.
- User deletion is guarded by an admin password confirmation modal. Admins can delete other accounts, but cannot delete their own admin account. Bulk deletion is capped to reduce accidental damage.
- Focused route coverage exists in `tests/admin-users.test.js`.

Still deferred:

- `AdminAuditLog` model and mutation audit trail.
- Account restriction/suspension workflow.
- Admin notes.
- Resend verification and verification override workflows.
- Role-specific admin permission tiers.

## Current State

HelloRun now has a dedicated admin user-management MVP. The original gap analysis below is retained as planning context for the remaining account-governance work.

The closest existing admin/user surfaces are:

- `/admin/dashboard`: shows total user count and operational queues, but does not link to a user directory or user detail page.
- `/admin/applications`: lists organizer applications and lets admins approve or reject organizer status.
- `/admin/events` and event registrant pages: expose participants in the context of an event, not as platform accounts.
- `/runner/profile` and `/runner/security/password`: let a runner manage parts of their own account.
- Auth flows: signup, login, email verification, Google auth, password reset, and logout.

The `User` model already contains enough account state to support a first user management page:

- identity: `userId`, `email`, `firstName`, `lastName`
- access: `role`, `organizerStatus`, `emailVerified`
- auth: `authProvider`, `googleId`, `passwordHash`
- profile: mobile, country, date of birth, gender, emergency contact, running groups
- compliance: accepted policy versions and timestamps
- timestamps: `createdAt`, `updatedAt`

## Original Main Gaps

1. No searchable user directory [DONE]
   Admins can see total user count, but cannot browse, search, or filter accounts.

2. No user detail view [DONE]
   Admins cannot inspect a single user's account state, organizer status, registrations, submissions, events, blog activity, or policy consent from one place.

3. Role and account state are fragmented [PARTIAL]
   Organizer approval changes `role` and `organizerStatus`, but there is no central account governance page for admins to audit or correct user state.

4. No account restriction workflow [DEFERRED]
   The Terms mention suspension/termination, but the `User` model has no explicit `accountStatus`, suspension reason, or audit trail.

5. No admin audit trail [DEFERRED]
   Sensitive actions like role changes, account restrictions, email verification overrides, or organizer status corrections should be logged.

6. No support workflow for account issues [PARTIAL]
   Common support actions such as finding a user by email, checking verification state, reviewing linked Google auth, or viewing recent registrations require database access or indirect routes.

## Proposed Feature

Add a dedicated Admin User Management area:

- `/admin/users`
- `/admin/users/:id`

This should be an admin-only operational tool for support, trust/safety, role governance, and account audits.

## MVP Scope

### User Directory

Route: `GET /admin/users`

Implementation status: completed with responsive table UX, column checklist, quick-view modal, and filters.

Recommended table columns:

- User ID
- Name
- Email
- Role
- Organizer status
- Email verified
- Auth provider
- Created date
- Last updated
- Key counts: registrations, submissions, owned events
- Action: View

Filters:

- search by name, email, or `userId`
- role: runner, organiser, admin
- organizer status: not applied, pending, approved, rejected
- email verified: yes/no
- auth provider: local/google
- created date range

Sorting:

- newest users
- oldest users
- recently updated
- role
- organizer status

### User Detail

Route: `GET /admin/users/:id`

Implementation status: completed.

Recommended sections:

- Account summary: ID, name, email, role, organizer status, verification, auth provider
- Profile: mobile, country, date of birth masked by default, gender, emergency contact, running groups
- Activity summary: registrations, submitted results, approved results, certificates, owned events, blog posts/comments
- Organizer application: current/past application status and link to application detail
- Policy consent: accepted privacy, terms, cookie versions, accepted timestamp, IP/user agent if available
- Security/support state: Google linked, local password set, password reset throttling metadata
- Timeline: recent account events and admin actions

### Admin Actions

Start conservative. First release should avoid destructive operations.

Implementation status: partially completed. Admins can edit personal information, role, and organizer status; system data is excluded from the edit surface. Safe deletion is available only for dormant users with no platform activity. Audit logging and higher-risk support actions remain deferred.

Recommended MVP actions:

- resend verification email
- mark email as verified only with confirmation and audit log
- update role between `runner` and `organiser` only through guarded flows
- correct organizer status when linked to a valid application decision
- add internal admin note

Defer until audit trail and policy are clear:

- suspend account
- unsuspend account
- delete account
- anonymize account
- reset password on behalf of user
- change email
- grant admin role

## Data Model Additions

Recommended additions to `User`:

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
accountStatusUpdatedAt: {
  type: Date,
  default: null
},
accountStatusUpdatedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
}
```

Add a new `AdminAuditLog` model:

```js
actorId
targetUserId
action
before
after
reason
ipAddress
userAgent
createdAt
```

This keeps user management defensible and helps with support, privacy, and abuse investigations.

## Access Control

Use `requireAdmin` for all routes.

For high-risk actions, add additional safeguards:

- CSRF protection for all mutations
- explicit confirmation fields for role/status/account restriction changes
- rate limiting for repeated admin actions
- block self-demotion or self-suspension
- block direct admin role grants in the MVP
- audit every mutation

Longer term, consider splitting admin permissions into roles:

- support admin: view users, resend verification
- operations admin: manage organizer corrections
- super admin: grant roles, restrict accounts, export user data

## UX Proposal

Keep the page operational and dense, matching the existing admin style.

Directory layout:

- header with total accounts and filtered count
- compact filter bar
- table with status badges
- pagination
- empty state

Detail layout:

- summary band at top
- tabs or sections for Profile, Activity, Organizer, Compliance, Security, Audit
- right-side action panel for safe support actions
- destructive/restrictive actions in a separate guarded area

## Suggested Implementation Plan

1. Add admin user directory [DONE]
   - routes in `src/routes/admin.routes.js`
   - controller methods in `src/controllers/admin.controller.js`
   - view at `src/views/admin/users-list.ejs`
   - dashboard quick link
   - tests for admin-only access, filtering, and search

2. Add user detail page [DONE]
   - fetch user safely without `passwordHash`
   - aggregate registrations, submissions, events, blogs, application
   - view at `src/views/admin/user-detail.ejs`
   - tests for access and missing user handling

3. Add audit log foundation [DEFERRED]
   - `AdminAuditLog` model
   - helper service for admin user actions
   - log read-sensitive and write actions as needed

4. Add safe support actions [PARTIAL/DEFERRED]
   - resend verification email
   - admin notes
   - guarded email verification override

5. Add account status workflow [DEFERRED]
   - add `accountStatus` fields
   - enforce restricted/suspended accounts in auth middleware
   - surface status in admin directory and detail

## Current Recommendation

Build the audit log and admin-notes foundation next before adding higher-risk account governance actions such as verification overrides, account restriction, suspension, anonymization, or email changes.
