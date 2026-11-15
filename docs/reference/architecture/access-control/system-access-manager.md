# HelloRun System Access Manager

## Document purpose

This document defines the proposed System Access Manager for the HelloRun web app.

The goal is to let admins turn selected product features on, off, hidden, or into maintenance mode without weakening the existing authentication, role checks, ownership checks, CSRF protection, rate limits, or review rules.

This is a later implementation. Build the Communication Access Manager first because email usage and in-app notifications are the more immediate release risk.

---

## 1. Current web app scope

HelloRun is a Node.js, Express, MongoDB, Mongoose, EJS, and vanilla JavaScript web app.

Current user roles:

| Role | Current scope |
|---|---|
| Guest | View public pages, public events, event details, leaderboard, blog posts, static pages, login, signup, password reset, and email verification flows |
| Runner | Register for events, upload payment receipts, submit and resubmit run results, connect Strava, view registrations, submissions, notifications, groups, profile, password settings, and certificates |
| Organiser | Apply as organiser, manage owned events after approval, view registrants, review payment receipts, review run results, export registrants, edit event content/media, and view organiser dashboard |
| Admin | Manage users, events, organiser applications, review queues, blog moderation, comments/reports, legal policy versions, and admin dashboard |

The System Access Manager is only for HelloRun web-app features. It should not include mobile-app permissions, hardware timing systems, SMS, push notifications, newsletters, complex subscription plans, payment-gateway controls, race-kit operations, or shop controls until those modules exist in the product.

---

## 2. Main objective

The System Access Manager should allow an admin to control selected feature availability inside the existing web app.

Practical use cases:

- Hide unfinished web modules.
- Disable beta features during release hardening.
- Put high-risk workflows into maintenance mode.
- Temporarily block uploads, imports, exports, or public display pages.
- Keep route-level protection aligned with UI visibility.
- Preserve core account access and admin recovery paths.

This manager is not a replacement for security. It is a product availability layer.

---

## 3. Recommended name and placement

Admin-facing name:

```text
System Access Manager
```

Recommended menu placement:

```text
Admin
  System Access Manager
    Feature Access
    Role Matrix
    Locked Features
    Audit Logs
```

Do not include these tabs in the first web-app version:

```text
User Overrides
Plan Access
Subscriptions
External Integrations Marketplace
```

Reason: the current app does not have per-user feature overrides, organiser subscription plans, or a marketplace-style integration system.

---

## 4. Core rule

Use this rule:

```text
Role-based access protects the system.
Feature access controls product availability.
Ownership checks protect user data.
```

A request should only run when all required checks pass:

```text
Authenticated user
  -> Correct role
  -> Feature access allowed
  -> Ownership or admin privilege verified
  -> Workflow-specific state allows the action
  -> Controller action runs
```

Example:

```text
Runner submits a run result
  -> User is logged in
  -> User is a runner
  -> runner.submit_result is enabled
  -> Registration belongs to the runner
  -> Payment status allows result submission
  -> Submission window and event rules allow submission
  -> Run result is accepted for review
```

---

## 5. Access model

Keep the first version simple. Support feature status plus role permissions.

Feature status values:

| Status | Meaning |
|---|---|
| enabled | Feature is visible and usable |
| hidden | Feature is not rendered in navigation, cards, or action buttons |
| disabled | Feature is blocked even by direct URL |
| maintenance | Feature is blocked with a maintenance message |
| locked | Feature cannot be changed from the admin UI |

Role permission fields:

| Permission | Meaning |
|---|---|
| canView | User can see the page, card, menu item, or detail view |
| canUse | User can perform the main action |
| canCreate | User can create a record |
| canEdit | User can edit a record |
| canDelete | User can delete, archive, or remove a record |
| canReview | User can approve, reject, restore, dismiss, or moderate |
| canExport | User can download/export data |
| canManage | User has broader management access for the feature |

Do not add per-user override permissions in the MVP. They increase support and audit complexity and are not needed for the current web app.

---

## 6. Current feature categories

Use categories that match the existing app:

| Category | Scope |
|---|---|
| public | Public pages, event discovery, event detail, blog reading, leaderboard, static pages |
| account | Login, signup, verification, password reset, profile, password settings, Google OAuth |
| runner | Runner dashboard, registrations, submissions, certificates, notifications, groups |
| organiser | Organiser application, dashboard, event management, registrants, payment review, result review, exports |
| admin | Admin dashboard, users, events, applications, review queues, legal policies |
| blog | Authoring, moderation, comments, likes, reports |
| payment | Manual payment receipt upload and review |
| result | Run result submission, resubmission, review, proof access |
| certificate | Certificate download |
| leaderboard | Public leaderboard display |
| integration | Strava connection and selected activity import |
| communication | In-app notifications only here; email controls belong to Communication Access Manager |

Do not include these categories until the modules are implemented:

| Category | Reason |
|---|---|
| shop | Shop is still draft/planned, not a current web-app feature |
| subscription | No organiser plan system exists |
| race_kit | Race kit, bib, and check-in support is future scope |
| payment_gateway | Direct online payment is future scope |
| sms_push | SMS and push notifications are not part of the current app |

---

## 7. Feature access matrix

### 7.1 Public and account features

| Feature key | Feature | Guest | Runner | Organiser | Admin | Configurable? | Default |
|---|---|---:|---:|---:|---:|---:|---|
| public.home | Home page | Yes | Yes | Yes | Yes | No | locked |
| public.events | Event discovery | Yes | Yes | Yes | Yes | Yes | enabled |
| public.event_details | Public event detail pages | Yes | Yes | Yes | Yes | Yes | enabled |
| public.leaderboard | Public leaderboard | Yes | Yes | Yes | Yes | Yes | enabled |
| public.blog | Public blog list and post pages | Yes | Yes | Yes | Yes | Yes | enabled |
| public.static_pages | About, how it works, contact, FAQ | Yes | Yes | Yes | Yes | No | locked |
| public.legal_pages | Privacy, terms, cookie policy | Yes | Yes | Yes | Yes | No | locked |
| account.signup | Signup and registration | Yes | No | No | No | Yes | enabled |
| account.login | Login | Yes | No | No | No | No | locked |
| account.logout | Logout | No | Yes | Yes | Yes | No | locked |
| account.email_verification | Email verification | Yes | Yes | Yes | Yes | No | locked |
| account.password_reset | Forgot/reset password | Yes | Yes | Yes | Yes | No | locked |
| account.google_oauth | Google OAuth login/signup | Yes | Yes | Optional | Optional | Yes | enabled |

### 7.2 Runner features

| Feature key | Feature | Runner | Organiser | Admin | Configurable? | Default |
|---|---|---:|---:|---:|---:|---|
| runner.dashboard | Runner dashboard | Yes | No | No | No | enabled |
| runner.profile | Runner profile and contact/emergency details | Yes | No | Support via admin user tools | No | enabled |
| runner.password_settings | Password settings | Yes | No | No | No | locked |
| runner.event_registration | Register for event | Yes | No | Admin support optional | Yes | enabled |
| runner.my_registrations | My registrations | Yes | No | No | No | enabled |
| runner.payment_receipt_upload | Upload payment receipt | Yes | No | No | Yes | enabled |
| runner.submit_result | Submit run result | Yes | No | No | Yes | enabled |
| runner.resubmit_result | Resubmit rejected result | Yes | No | No | Yes | enabled |
| runner.submissions | View submitted entries | Yes | No | No | Yes | enabled |
| runner.submission_proof | View own proof image | Yes | No | Admin/organiser through review views | No | enabled |
| runner.certificates_download | Download certificate | Yes | No | No | Yes | enabled |
| runner.notifications | View and mark in-app notifications | Yes | No | No | No | enabled |
| runner.groups_view | View running groups | Yes | No | No | Yes | enabled |
| runner.groups_create | Create running group | Yes | No | No | Yes | enabled |
| runner.groups_join | Join or leave running group | Yes | No | No | Yes | enabled |

### 7.3 Strava integration features

| Feature key | Feature | Runner | Organiser | Admin | Configurable? | Default |
|---|---|---:|---:|---:|---:|---|
| integration.strava_connect | Connect Strava account | Yes | No | No | Yes | enabled |
| integration.strava_disconnect | Disconnect Strava account | Yes | No | No | Yes | enabled |
| integration.strava_activity_fetch | Fetch recent Strava activities | Yes | No | No | Yes | enabled |
| integration.strava_import | Submit selected Strava activity to an event | Yes | No | No | Yes | enabled |

### 7.4 Organiser features

| Feature key | Feature | Runner | Organiser | Admin | Configurable? | Default |
|---|---|---:|---:|---:|---:|---|
| organiser.application | Apply as organiser and view application status | Yes | No | Review/manage | Yes | enabled |
| organiser.dashboard | Organiser dashboard | No | Yes | No | No | enabled |
| organiser.create_event | Create event wizard, draft save, preview, submit | No | Approved/pending rules apply | Yes through admin event tools | Yes | enabled |
| organiser.events | View owned events | No | Yes | Admin has separate admin event list | No | enabled |
| organiser.event_details | View owned event management detail | No | Yes | Admin has separate admin event detail | No | enabled |
| organiser.edit_event | Edit owned event | No | Yes | Yes | Yes | enabled |
| organiser.event_media_upload | Upload/remove event branding and media | No | Yes | Yes | Yes | enabled |
| organiser.event_status | Update owned event status where allowed | No | Yes | Yes | Yes | enabled |
| organiser.registrants_view | View owned event registrants | No | Yes | Yes | No | enabled |
| organiser.payment_review | Approve/reject payment receipts | No | Yes | Yes | Yes | enabled |
| organiser.result_review | Approve/reject run results | No | Yes | Yes | Yes | enabled |
| organiser.participant_export_csv | Export registrants as CSV | No | Yes | Yes | Yes | enabled |
| organiser.participant_export_xlsx | Export registrants as XLSX | No | Yes | Yes | Yes | enabled |

### 7.5 Blog features

| Feature key | Feature | Guest | Runner | Organiser | Admin | Configurable? | Default |
|---|---|---:|---:|---:|---:|---:|---|
| blog.read | Read public blog posts | Yes | Yes | Yes | Yes | Yes | enabled |
| blog.comment | Create/delete own comments | No | Yes | Yes | Yes | Yes | enabled |
| blog.like | Like posts | No | Yes | Yes | Yes | Yes | enabled |
| blog.report | Report posts or comments | No | Yes | Yes | Yes | Yes | enabled |
| blog.authoring | Create, edit, upload assets, submit posts | No | Yes | Yes | Yes | Yes | enabled |
| blog.admin_review | Review, approve, reject, archive posts | No | No | No | Yes | Yes | enabled |
| blog.comment_moderation | Remove/restore comments and resolve/dismiss reports | No | No | No | Yes | Yes | enabled |

### 7.6 Admin features

| Feature key | Feature | Admin | Configurable? | Default |
|---|---|---:|---:|---|
| admin.dashboard | Admin dashboard | Yes | No | locked |
| admin.users | Manage users | Yes | No | enabled |
| admin.events | Manage all events | Yes | No | enabled |
| admin.organiser_applications | Review organiser applications | Yes | No | enabled |
| admin.review_queue | Cross-event payment and result review queue | Yes | No | enabled |
| admin.legal_policies | Manage privacy, terms, and cookie policy versions | Yes | No | enabled |
| admin.blog_moderation | Blog moderation tools | Yes | Yes | enabled |
| admin.system_access | System Access Manager | Yes | No | locked |
| admin.communication_access | Communication Access Manager | Yes | No | locked |

The current app has an `admin` role, not a separate `super_admin` role. If a super-admin distinction is later introduced, update the user role model and this document together.

---

## 8. Locked features

Do not allow these to be disabled from the admin UI:

| Feature | Reason |
|---|---|
| Login | Required system access path |
| Logout | Required account safety action |
| Password reset | Account recovery |
| Email verification | Account trust |
| Legal pages | Compliance and transparency |
| Static support pages | Basic public support and trust pages |
| Admin dashboard | Operational recovery path |
| System Access Manager | Prevent accidental lockout |
| Communication Access Manager | Protect email and notification controls |
| Role validation | Security |
| Ownership checks | Data privacy |
| CSRF protection | Security |
| Rate limiting | Abuse protection |
| Payment and result audit fields | Data integrity |
| Health and readiness endpoints | Deployment monitoring |

---

## 9. Proposed database models

### 9.1 SystemFeature

```js
{
  key: "runner.submit_result",
  name: "Submit Run Result",
  description: "Allows runners to submit run proof for eligible registrations.",
  category: "runner",
  routePatterns: [
    "/submit-result",
    "/resubmit-result",
    "/runner/submissions/eligible"
  ],
  defaultStatus: "enabled",
  status: "enabled",
  locked: false,
  displayOrder: 100,
  createdAt: Date,
  updatedAt: Date
}
```

### 9.2 RoleFeatureAccess

```js
{
  featureKey: "runner.submit_result",
  role: "runner",
  canView: true,
  canUse: true,
  canCreate: true,
  canEdit: false,
  canDelete: false,
  canReview: false,
  canExport: false,
  canManage: false,
  updatedBy: ObjectId,
  updatedAt: Date
}
```

### 9.3 FeatureAccessAuditLog

```js
{
  featureKey: "runner.submit_result",
  action: "update_role_access",
  role: "runner",
  before: {
    canUse: true
  },
  after: {
    canUse: false
  },
  reason: "Temporary maintenance for result uploads.",
  actorId: ObjectId,
  actorRole: "admin",
  createdAt: Date
}
```

Do not add `UserFeatureOverride` in the MVP. Add it later only if there is a real support need for individual exceptions.

---

## 10. Suggested indexes

```js
SystemFeature.index({ key: 1 }, { unique: true });
SystemFeature.index({ category: 1, status: 1 });

RoleFeatureAccess.index({ featureKey: 1, role: 1 }, { unique: true });
RoleFeatureAccess.index({ role: 1 });

FeatureAccessAuditLog.index({ featureKey: 1, createdAt: -1 });
FeatureAccessAuditLog.index({ actorId: 1, createdAt: -1 });
```

---

## 11. Service architecture

Recommended service file:

```text
src/services/feature-access.service.js
```

Recommended functions:

```js
async function getFeature(featureKey) {}

async function isAllowed({
  role,
  featureKey,
  action = "canUse"
}) {}

async function getAllowedFeaturesForRole(role) {}

async function updateFeatureStatus({
  featureKey,
  status,
  actorId,
  reason
}) {}

async function updateRoleFeatureAccess({
  featureKey,
  role,
  permissions,
  actorId,
  reason
}) {}

async function seedSystemFeatures() {}
```

Access priority:

```text
1. Locked security and account rules
2. Feature status
3. Role feature access
4. Default feature setting
```

---

## 12. Middleware architecture

Recommended middleware file:

```text
src/middleware/requireFeature.js
```

Example:

```js
function requireFeature(featureKey, action = "canUse") {
  return async function (req, res, next) {
    const role = req.user?.role;

    if (!req.user || !role) {
      return res.redirect("/login");
    }

    const decision = await featureAccessService.isAllowed({
      role,
      featureKey,
      action
    });

    if (!decision.allowed) {
      const statusCode = decision.status === "maintenance" ? 503 : 403;

      return res.status(statusCode).render("error", {
        message: decision.message || "This feature is currently unavailable."
      });
    }

    return next();
  };
}

module.exports = requireFeature;
```

Route example:

```js
router.post(
  "/submit-result",
  requireAuth,
  requireFeature("runner.submit_result", "canCreate"),
  requireCsrfProtection,
  uploadService.uploadSubmissionProof,
  pageController.postSubmitResult
);
```

Feature middleware must sit beside existing auth, CSRF, rate-limit, ownership, and workflow checks. It should never replace them.

---

## 13. UI integration

### 13.1 res.locals integration

Add role-level allowed features to `res.locals` for logged-in users.

```js
app.use(async (req, res, next) => {
  res.locals.allowedFeatures = {};

  if (req.user?.role) {
    res.locals.allowedFeatures = await featureAccessService.getAllowedFeaturesForRole(
      req.user.role
    );
  }

  next();
});
```

### 13.2 EJS usage

```ejs
<% if (allowedFeatures["runner.submit_result"]?.canCreate) { %>
  <button type="button" class="btn btn-primary">
    Submit Run Result
  </button>
<% } %>
```

### 13.3 UI behaviour

| Feature state | UI behaviour |
|---|---|
| enabled | Show normally |
| hidden | Do not render nav item, card, or action button |
| disabled | Hide action or show disabled state where context is useful |
| maintenance | Show maintenance message when reached directly |
| locked | Show locked badge in admin UI |

UI hiding is not enough. Direct routes must still be guarded.

---

## 14. Admin page plan

Routes:

```text
GET /admin/system-access
POST /admin/system-access/features/:featureKey/status
POST /admin/system-access/features/:featureKey/roles/:role
GET /admin/system-access/audit-logs
```

Recommended sections:

```text
System Access Manager

Tabs:
1. Feature Access
2. Role Matrix
3. Locked Features
4. Audit Logs
```

### 14.1 Feature Access table

```text
Feature                  Category      Status       Runner     Organiser     Admin
Submit Run Result        Runner        Enabled      Create     -             -
Upload Payment Receipt   Payment       Enabled      Create     -             -
Create Event             Organiser     Enabled      -          Create        Manage
Payment Review           Payment       Enabled      -          Review        Review
Result Review            Result        Enabled      -          Review        Review
Strava Import            Integration   Enabled      Use        -             -
Leaderboard              Public        Enabled      View       View          View
```

### 14.2 Feature detail modal

```text
Feature: Submit Run Result
Category: Runner
Status: Enabled

Runner
[x] Can View
[x] Can Create

Organiser
[ ] Can View
[ ] Can Review

Admin
[ ] Can Manage

Reason for change:
[ Temporary maintenance for result uploads ]

[Save Changes]
```

Require a reason for every change and record an audit log.

---

## 15. MVP implementation scope

Build only role-level feature access for current web-app features.

MVP should include:

- `SystemFeature` model
- `RoleFeatureAccess` model
- `FeatureAccessAuditLog` model
- Feature seed file for current web-app feature keys
- `feature-access.service.js`
- `requireFeature()` middleware
- Admin feature access table
- Role permission checkboxes
- Feature status dropdown
- Required reason field for changes
- Audit log display
- Route guards for selected high-risk routes
- `res.locals.allowedFeatures` for EJS visibility

Do not include in MVP:

- Per-user override UI
- Subscription plans
- Organiser plan gating
- Feature usage analytics
- Time-based scheduling
- Advanced policy engine
- Shop access controls
- Race kit, bib, and check-in controls
- Payment gateway controls
- Newsletter, SMS, or push notification controls
- Communication email-budget controls, because those belong to Communication Access Manager

---

## 16. Recommended MVP feature keys

Prioritise features that are already part of the web app, are visible to users, and are useful to disable during maintenance.

```text
public.events
public.event_details
public.leaderboard
public.blog
blog.authoring
blog.comment
blog.report
runner.event_registration
runner.payment_receipt_upload
runner.submit_result
runner.resubmit_result
runner.certificates_download
runner.groups_create
runner.groups_join
integration.strava_connect
integration.strava_import
organiser.application
organiser.create_event
organiser.edit_event
organiser.event_media_upload
organiser.payment_review
organiser.result_review
organiser.participant_export_csv
organiser.participant_export_xlsx
admin.blog_moderation
```

Reasons:

- These features are user-facing or operationally sensitive.
- They map to current web routes.
- They are realistic maintenance toggles.
- They can be tested without introducing future product assumptions.

---

## 17. Suggested implementation phases

### Phase 1: Registry and defaults

Deliverables:

- Final list of current web-app feature keys
- `SystemFeature` schema
- `RoleFeatureAccess` schema
- `FeatureAccessAuditLog` schema
- Seed script with idempotent defaults

### Phase 2: Service and middleware

Deliverables:

- `feature-access.service.js`
- `requireFeature.js`
- Unit tests for allowed, hidden, disabled, maintenance, and locked states

### Phase 3: Route integration

Start with:

- Event registration
- Payment receipt upload
- Run result submission
- Run result resubmission
- Strava connect/import
- Organiser event creation/editing/media upload
- Payment review
- Result review
- Registrant exports
- Blog authoring and moderation

### Phase 4: Admin UI

Deliverables:

- Feature access table
- Role permissions modal
- Status update form
- Locked features view
- Audit log display

### Phase 5: EJS visibility integration

Deliverables:

- `allowedFeatures` in `res.locals`
- Conditional nav items
- Conditional dashboard cards
- Conditional action buttons
- Disabled and maintenance messages

### Phase 6: Testing and hardening

Tests:

- Runner cannot access disabled runner feature by direct URL.
- Organiser cannot access disabled organiser feature by direct URL.
- Hidden feature does not appear in navigation or dashboard actions.
- Maintenance mode returns a helpful maintenance response.
- Locked features cannot be changed from the admin UI.
- Admin cannot disable System Access Manager.
- Audit logs record actor, timestamp, before, after, and reason.
- Existing role and ownership checks still run.

---

## 18. Testing checklist

```text
[ ] SystemFeature seed is idempotent.
[ ] Locked features cannot be disabled.
[ ] Feature access checks respect role permissions.
[ ] Disabled feature blocks direct URL access.
[ ] Hidden feature is removed from navigation and page actions.
[ ] Maintenance mode shows helpful user copy.
[ ] Audit logs record actor, timestamp, before, after, and reason.
[ ] Admin cannot accidentally lock out all admins.
[ ] Login, logout, password reset, and legal pages remain available.
[ ] Feature checks do not bypass ownership checks.
[ ] Feature checks do not bypass payment or result workflow rules.
```

---

## 19. Risks and controls

| Risk | Control |
|---|---|
| Admin disables login or password reset | Mark account-critical features as locked |
| Buttons hidden but routes still accessible | Add route middleware, not only EJS checks |
| Feature access bypasses ownership | Keep ownership checks in controllers and services |
| Too many toggles confuse admins | Start with the MVP feature keys only |
| Performance issue from repeated database checks | Cache allowed role features per request and consider short-lived memory cache |
| Accidental access changes | Require reason and save audit logs |
| Admin lockout | Lock admin dashboard and System Access Manager |
| Future-scope features pollute the MVP | Add feature keys only when the route/module exists |

---

## 20. Explicitly out of scope for this document

The following belong in separate future documents or existing dedicated docs:

| Area | Source or reason |
|---|---|
| Email event settings, email budget, templates, email logs | `docs/sys_access_mngr/communication_access_manager.md` |
| Shop and merchandise controls | Future shop module |
| Direct payment gateway controls | Future payment gateway phase |
| Race kit, bib, and check-in controls | Future onsite operations phase |
| Organiser subscription plans | No current plan model exists |
| SMS and push notification permissions | Not part of the current app |
| Hardware timing or live GPS tracking | Not part of HelloRun's current product scope |

---

## 21. Recommended final decision

Build the System Access Manager later, after Communication Access Manager and release hardening.

When implementation starts, keep the first version focused on current HelloRun web-app routes:

- public visibility controls,
- runner submission and registration controls,
- Strava controls,
- organiser event/review/export controls,
- blog controls,
- admin-safe locked features,
- audit logs for every access change.

Do not add subscription plans, shop controls, race-kit controls, payment-gateway controls, SMS, push notifications, or per-user override features until those product modules are actually implemented.
