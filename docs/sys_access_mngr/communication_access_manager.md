# HelloRun Communication Access Manager

## Document purpose

This document defines the Communication Access Manager for the HelloRun web app.

The first implementation priority is email control because HelloRun uses Resend and must protect the available email quota.

The goal is to centralise control over current transactional emails and in-app notifications while avoiding future-scope channels that are not part of the app yet.

Implementation status:

```text
MVP implemented in the web app.
Admin page: /admin/communications
Templates: still code-backed in email.service.js
Newsletters/SMS/push/campaigns: still out of scope
```

Implemented files:

```text
src/models/CommunicationSetting.js
src/models/CommunicationEventSetting.js
src/models/CommunicationLog.js
src/models/DailyEmailUsage.js
src/services/communication-events.registry.js
src/services/communication.service.js
src/services/email-budget.service.js
src/services/email-log.service.js
src/views/admin/communications.ejs
```

---

## 1. Current web app scope

HelloRun currently uses:

| Channel | Current implementation |
|---|---|
| Email | Resend-backed helper functions in `src/services/email.service.js` |
| In-app notifications | `Notification` model plus runner notification page and nav unread badge |
| Dashboard/action reminders | Existing dashboard cards and page states; not a separate communication model |
| Toast/copy messages | Local browser UI feedback only; not managed by this feature |

Current in-app notifications are stored with:

```text
userId
type
title
message
href
metadata
readAt
createdAt
updatedAt
```

This manager should cover current web-app events only:

- account verification and password reset,
- organiser application submission and review,
- event registration confirmation,
- manual payment receipt submission and review,
- run result approval/rejection,
- certificate issued,
- runner in-app notifications.

Do not include shop, merchandise, race-kit, bib, check-in, direct payment gateway, newsletters, SMS, push notifications, or marketing automation until those modules exist.

---

## 2. Main objective

The Communication Access Manager should allow admins to control:

- Which current system events send email.
- Which current system events create in-app notifications.
- Which account/security emails are locked and cannot be disabled.
- Which non-critical emails are skipped when the daily quota is near the limit.
- Which email sends succeed, fail, skip, or fall back to in-app notification.
- Which existing hard-coded email templates should later move into managed templates.

This manager should not replace existing controller/service workflow rules. It should sit between app events and `email.service.js` / `notification.service.js`.

---

## 3. Recommended name and placement

Admin-facing name:

```text
Communication Access Manager
```

Recommended menu placement:

```text
Admin
  Communications
    Tool Kits
    Email Budget
    Communication Events
    Email Logs
    Test Email
```

Template editing is intentionally deferred. The MVP keeps existing code-backed email templates in `src/services/email.service.js`.

Do not include these sections in the first version:

```text
Newsletter
Campaigns
Segments
SMS
Push Notifications
User Preference Centre
```

Reason: those capabilities are not current HelloRun web-app features.

---

## 4. Communication principle

Use this rule:

```text
Email = account-critical or action-required outside the app.
In-app notification = routine status update inside HelloRun.
Dashboard state = visible prompt for pending user action.
```

Recommended default:

```text
Create in-app notifications for runner workflow updates.
Send email only for account-critical or action-required events.
```

---

## 5. Current communication channels

| Channel | Use in HelloRun |
|---|---|
| Email | Verification, password reset, organiser application updates, registration confirmation, payment review updates, result review updates, certificate availability |
| In-app notification | Runner registration, payment, result, and certificate updates |
| Dashboard/page state | Pending payment upload, rejected payment receipt, rejected run result, event setup actions |
| Admin log | Implemented operational tracking for sent, skipped, failed, suppressed, fallback, and test communications |

Out of scope for this manager:

| Channel | Reason |
|---|---|
| SMS | Not implemented |
| Push notifications | Not implemented |
| Newsletter | Not implemented |
| Marketing campaigns | Not implemented |
| Advanced segmentation | Not implemented |
| User communication preferences | Not implemented and not needed for MVP transactional control |

---

## 6. Priority levels

| Priority | Description | Behaviour |
|---|---|---|
| critical | Account access or security related | Email locked on; send if provider is available |
| high | Requires user action | Email on by default if quota allows; create in-app notification when applicable |
| medium | Important status update | In-app first; email optional/off by default |
| low | Routine confirmation | In-app first; email off by default unless currently required |
| info | Operational or informational | In-app/log only; no email by default |

Recommended examples:

| Priority | Current web-app events |
|---|---|
| critical | Email verification, password reset |
| high | Payment rejected, result rejected, organiser application approved/rejected |
| medium | Payment approved, result approved, certificate issued, application submitted |
| low | Registration confirmed, payment receipt submitted |
| info | Admin review queue reminders, future low-priority operational notices |

---

## 7. Email budget rule

Initial budget structure:

```text
Daily email limit: configurable
Reserved critical emails: configurable
Soft stop threshold: configurable
Hard stop threshold: configurable
```

Recommended starter values while using a limited Resend quota:

```text
Daily email limit: 100
Reserved critical emails: 30
Soft stop threshold: 80
Hard stop threshold: 100
```

Behaviour:

| Condition | Behaviour |
|---|---|
| Below soft stop | Send enabled emails normally |
| Soft stop reached | Skip low and medium priority email; keep in-app notification where available |
| Hard stop reached | Send only critical email if the provider still allows it |
| Provider error | Record failure; keep in-app notification where available |
| Email event disabled | Skip email; keep in-app notification where available |

Do not block the underlying product action only because a non-critical email fails.

---

## 8. Communication matrix

### 8.1 Account events

| Event key | Current trigger | In-app | Email | Priority | Can disable email? | Notes |
|---|---|---:|---:|---|---:|---|
| account.email_verification | Signup and resend verification | No | Yes | critical | No | Required for account trust |
| account.password_reset | Forgot password | No | Yes | critical | No | Required for account recovery |
| account.password_reset_confirmation | Password changed through reset flow | No | Yes | critical | Yes | Current code sends this fire-and-forget |
| account.google_linked | Google OAuth login/signup | No | No | low | Yes | Not currently emailed or notified |
| account.google_unlinked | Runner unlinks Google account | No | No | low | Yes | Not currently emailed or notified |

Do not add `account.security_alert` to MVP unless the app first implements concrete security-alert triggers.

### 8.2 Organiser application events

| Event key | Current trigger | In-app | Email | Priority | Default email | Notes |
|---|---|---:|---:|---|---:|---|
| organiser.application_submitted | Organiser submits profile/application | No | Yes | medium | On | Current code sends confirmation email |
| organiser.application_approved | Admin approves organiser application | No | Yes | high | On | Current code sends approval email |
| organiser.application_rejected | Admin rejects organiser application | No | Yes | high | On | Current code sends rejection reason |

Do not include `organiser.application_needs_revision` until that state exists in the application workflow.

### 8.3 Registration events

| Event key | Current trigger | In-app | Email | Priority | Default email | Notes |
|---|---|---:|---:|---|---:|---|
| registration.confirmed | Runner registers for event | Yes | Yes | low | Off after manager | Current code sends email; manager should make it optional/off by default |

Do not include waitlist, cancellation, or registration-update events until those workflows exist.

### 8.4 Payment receipt events

| Event key | Current trigger | In-app | Email | Priority | Default email | Notes |
|---|---|---:|---:|---|---:|---|
| payment.receipt_submitted | Runner uploads payment receipt | Yes for runner | Yes to organiser | low | Off after manager | Current code emails organiser; manager should make it optional |
| payment.approved | Organiser/admin approves payment receipt | Yes for runner | Yes | medium | Off after manager | Current code sends email; in-app should be primary |
| payment.rejected | Organiser/admin rejects payment receipt | Yes for runner | Yes | high | On | Action required by runner |

Do not include direct payment transaction events until the payment gateway phase exists.

### 8.5 Run result events

| Event key | Current trigger | In-app | Email | Priority | Default email | Notes |
|---|---|---:|---:|---|---:|---|
| result.approved | Organiser/admin approves regular or accumulated result | Yes for runner | Yes | medium | Off after manager | Current code sends email; in-app should be primary |
| result.rejected | Organiser/admin rejects regular or accumulated result | Yes for runner | Yes | high | On | Action required by runner |

Do not include `result.submitted`, `result.resubmitted`, or `result.needs_review` in MVP unless organiser/admin notifications are added first.

### 8.6 Certificate events

| Event key | Current trigger | In-app | Email | Priority | Default email | Notes |
|---|---|---:|---:|---|---:|---|
| certificate.issued | Certificate generated after approval/completion | Yes for runner | Yes | medium | Off after manager | Current code sends email; in-app should be primary |

Do not include certificate regeneration until there is a separate regeneration workflow.

### 8.7 Blog, legal, and admin events

| Event key | Current trigger | In-app | Email | Priority | Default email | Notes |
|---|---|---:|---:|---|---:|---|
| blog.post_approved | Admin approves blog post | No | No | medium | Off | Current app has workflow but no email/notification integration |
| blog.post_rejected | Admin rejects blog post | No | No | high | Off | Current app has workflow but no email/notification integration |
| blog.comment_reported | User reports post/comment | No | No | info | Off | Current app has admin moderation views, not notifications |
| legal.policy_published | Admin publishes legal policy | No | No | info | Off | Current app has legal versioning, not communication events |
| admin.review_queue_pending | Review queue has pending items | No | No | info | Off | Future admin reminder only |

These can stay in the registry as disabled future candidates, but they should not be part of MVP integration.

---

## 9. Events removed from active scope

Remove these from the active communication matrix until the product supports them:

| Removed event | Reason |
|---|---|
| registration.cancelled | No current cancellation workflow |
| registration.waitlisted | No waitlist workflow |
| registration.updated | No communication trigger currently exists |
| event.approved | Event approval exists, but no current email/notification helper is wired |
| event.rejected | Event archive/review flow exists, but no current email/notification helper is wired |
| event.published | No communication trigger currently exists |
| event.unpublished | No communication trigger currently exists |
| announcement.general | No announcement system |
| announcement.new_event | No announcement system |
| newsletter.weekly | No newsletter system |
| promotion.event_featured | No promotion campaign system |
| shop.* | Shop is future scope |
| race_kit.* | Race kit/bib/check-in is future scope |
| payment_gateway.* | Direct payment gateway is future scope |

---

## 10. Recommended MVP defaults

Keep email locked on:

```text
account.email_verification
account.password_reset
```

Keep email on by default:

```text
account.password_reset_confirmation
organiser.application_submitted
organiser.application_approved
organiser.application_rejected
payment.rejected
result.rejected
```

Keep email off by default after the manager is introduced:

```text
registration.confirmed
payment.receipt_submitted
payment.approved
result.approved
certificate.issued
```

Keep in-app notifications on where currently supported:

```text
registration.confirmed
payment.receipt_submitted
payment.approved
payment.rejected
result.approved
result.rejected
certificate.issued
```

This preserves important action-required email while reducing routine email usage.

---

## 11. Implemented database models

### 11.1 CommunicationSetting

```js
{
  key: "communication.global",
  emailSystemEnabled: true,
  inAppNotificationsEnabled: true,
  emailMaintenanceMode: false,
  dailyEmailLimit: 100,
  reservedCriticalEmailCount: 30,
  softStopThreshold: 80,
  hardStopThreshold: 100,
  provider: "resend",
  senderName: "HelloRun",
  senderEmail: process.env.EMAIL_FROM,
  replyToEmail: "support@hellorun.online",
  updatedBy: ObjectId,
  updatedAt: Date
}
```

### 11.2 CommunicationEventSetting

```js
{
  eventKey: "payment.rejected",
  name: "Payment Rejected",
  description: "Notifies the runner when a payment receipt is rejected.",
  category: "payment",
  priority: "high",
  required: false,
  emailEnabled: true,
  inAppEnabled: true,
  fallbackToInApp: true,
  recipientRoles: ["runner"],
  locked: false,
  updatedBy: ObjectId,
  updatedAt: Date
}
```

### 11.3 EmailTemplate

Not implemented in MVP. Templates remain as code-backed defaults in `email.service.js`. Add this model only when moving templates into the admin UI.

```js
{
  eventKey: "payment.rejected",
  version: 1,
  status: "published",
  subject: "Your payment receipt needs correction",
  bodyHtml: "<p>Hello {{firstName}}, your payment receipt for {{eventTitle}} needs correction.</p>",
  bodyText: "Hello {{firstName}}, your payment receipt for {{eventTitle}} needs correction.",
  variables: [
    "firstName",
    "eventTitle",
    "confirmationCode",
    "rejectionReason",
    "reviewNotes",
    "actionUrl"
  ],
  updatedBy: ObjectId,
  updatedAt: Date
}
```

### 11.4 CommunicationLog

```js
{
  eventKey: "payment.rejected",
  channel: "email",
  recipientUserId: ObjectId,
  recipientEmail: "runner@example.com",
  subject: "Payment Rejected: 2026K HelloRun Challenge",
  status: "sent",
  statusReason: null,
  provider: "resend",
  providerMessageId: "resend_xxx",
  priority: "high",
  quotaCounted: true,
  metadata: {
    registrationId: ObjectId,
    eventId: ObjectId
  },
  sentAt: Date,
  createdAt: Date
}
```

Allowed statuses:

```text
queued
sent
failed
skipped
suppressed
fallback_in_app
```

### 11.5 DailyEmailUsage

```js
{
  dateKey: "2026-05-15",
  provider: "resend",
  totalLimit: 100,
  sentCount: 42,
  criticalSentCount: 6,
  highSentCount: 12,
  mediumSentCount: 10,
  lowSentCount: 14,
  failedCount: 1,
  skippedCount: 8,
  updatedAt: Date
}
```

Do not duplicate the existing `Notification` model. Reuse it for in-app notifications.

---

## 12. Suggested indexes

```js
CommunicationEventSetting.index({ eventKey: 1 }, { unique: true });
CommunicationEventSetting.index({ category: 1, priority: 1 });

EmailTemplate.index({ eventKey: 1, status: 1 });
EmailTemplate.index({ eventKey: 1, version: -1 });

CommunicationLog.index({ eventKey: 1, createdAt: -1 });
CommunicationLog.index({ recipientUserId: 1, createdAt: -1 });
CommunicationLog.index({ channel: 1, status: 1, createdAt: -1 });

DailyEmailUsage.index({ dateKey: 1, provider: 1 }, { unique: true });
```

Existing notification indexes remain in `src/models/Notification.js`.

---

## 13. Service architecture

Recommended service file:

```text
src/services/communication.service.js
```

Recommended helper files:

```text
src/services/email-budget.service.js
src/services/email-log.service.js
```

Optional later helper:

```text
src/services/email-template.service.js
```

Recommended public function:

```js
async function notify(eventKey, payload) {}
```

Example usage:

```js
await communicationService.notify("payment.rejected", {
  recipientUser: runner,
  actorUser: reviewer,
  event,
  registration,
  rejectionReason,
  reviewNotes,
  actionUrl: "/my-registrations"
});
```

The service should wrap existing functions instead of rewriting all templates first:

| Event | Existing helper |
|---|---|
| account.email_verification | `emailService.sendVerificationEmail` |
| account.password_reset | `emailService.sendPasswordResetEmail` |
| account.password_reset_confirmation | `emailService.sendPasswordResetConfirmation` |
| organiser.application_submitted | `emailService.sendApplicationSubmittedEmail` |
| organiser.application_approved | `emailService.sendApplicationApprovedEmail` |
| organiser.application_rejected | `emailService.sendApplicationRejectedEmail` |
| registration.confirmed | `emailService.sendEventRegistrationConfirmationEmail` |
| payment.receipt_submitted | `emailService.sendPaymentProofSubmittedEmailToOrganizer` |
| payment.approved | `emailService.sendPaymentApprovedEmailToRunner` |
| payment.rejected | `emailService.sendPaymentRejectedEmailToRunner` |
| result.approved | `emailService.sendResultApprovedEmailToRunner` |
| result.rejected | `emailService.sendResultRejectedEmailToRunner` |
| certificate.issued | `emailService.sendCertificateIssuedEmailToRunner` |

Use `notification.service.js` for in-app notifications.

---

## 14. Message sending flow

```text
System event happens
  -> Call communicationService.notify(eventKey, payload)
  -> Load CommunicationEventSetting
  -> Create in-app notification if enabled and supported
  -> Check if email is enabled
  -> Check if event is locked/required
  -> Check priority and daily email budget
  -> Send through current email.service.js helper
  -> Record CommunicationLog
```

Fallback rule:

```text
If email is disabled, skipped, over budget, or failed,
keep the in-app notification when that event supports one and record the email status.
```

Do not create fake in-app notifications for unauthenticated account events such as password reset or email verification.

---

## 15. Email budget decision flow

```text
Email request
  -> Is email system enabled?
     -> No: skip email, log skipped, create in-app notification if supported
     -> Yes:
        -> Is event email enabled or locked on?
           -> No: skip email, log skipped, create in-app notification if supported
           -> Yes:
              -> Is event critical?
                 -> Yes: send if provider allows
                 -> No:
                    -> Has soft threshold been reached?
                       -> No: send email
                       -> Yes:
                          -> Is priority high?
                             -> Yes: send if quota remains
                             -> No: skip email and use in-app notification if supported
```

---

## 16. Admin UI

Route plan:

```text
GET /admin/communications
POST /admin/communications/settings
POST /admin/communications/events/:eventKey
GET /admin/communications/logs
POST /admin/communications/test-email
```

Implemented page:

```text
/admin/communications
```

The admin dashboard links to this page from the Communications card.

### 16.0 Tool Kits

Implemented at the top of `/admin/communications`.

Tool kits:

| Tool kit | Purpose |
|---|---|
| Budget Guardrails | Shows flexible sends remaining after the critical reserve; links to budget settings and skipped logs |
| Locked Account Mail | Shows required locked account events; links to event controls and verification logs |
| Delivery Coverage | Shows enabled email and in-app event counts; links to event controls and in-app logs |
| Test & Trace | Links to test email and communication logs |

Section anchors:

```text
#email-budget
#communication-events
#test-email
#email-logs
```

Defer template editing routes until the code-backed templates are ready to move into a database:

```text
GET /admin/communications/templates/:eventKey
POST /admin/communications/templates/:eventKey
```

### 16.1 Email Budget section

Display:

```text
Daily Email Limit: 100
Sent Today: 42
Remaining: 58
Reserved for Critical: 30
Soft Stop Threshold: 80
Hard Stop Threshold: 100
Current Mode: Normal
```

Controls:

```text
[ ] Email system enabled
[ ] Email maintenance mode
[ ] Auto-skip low/medium priority emails near limit
Daily limit: [100]
Reserved critical emails: [30]
Soft stop threshold: [80]
Hard stop threshold: [100]
```

### 16.2 Communication Events section

```text
Event                         Priority    In-App    Email    Default Recipient
Email Verification            Critical    OFF       ON       Account email
Password Reset                Critical    OFF       ON       Account email
Application Approved          High        OFF       ON       Organiser
Application Rejected          High        OFF       ON       Organiser
Payment Rejected              High        ON        ON       Runner
Result Rejected               High        ON        ON       Runner
Payment Approved              Medium      ON        OFF      Runner
Result Approved               Medium      ON        OFF      Runner
Certificate Issued            Medium      ON        OFF      Runner
Registration Confirmed        Low         ON        OFF      Runner
```

### 16.3 Logs section

```text
Date/Time        Event              Channel   Recipient          Status
May 15 10:20 PM  payment.rejected   email     runner@email.com   sent
May 15 10:21 PM  result.approved    email     runner@email.com   skipped
May 15 10:21 PM  result.approved    in_app    runner@email.com   sent
```

### 16.4 Test Email

Allow admins to send a test email to a chosen address. Test sends should:

- be marked as `test` in `CommunicationLog`,
- count toward the daily email usage if Resend counts them,
- never create product notifications,
- never mutate registration, payment, result, or certificate state.

---

## 17. In-app notification improvements

The current notification system already supports:

- runner notification page,
- unread count,
- read one,
- mark all read,
- notification type display,
- link target through `href`,
- metadata storage.

Useful improvements:

| Improvement | Purpose |
|---|---|
| Consistent notification type keys | Keep filtering and future UI grouping reliable |
| Notification categories | Group payment, result, registration, certificate, and system updates |
| Better action labels | Send users directly to the next useful page |
| Important badge | Highlight rejected or action-required items |
| Archive or retention policy | Keep old notifications manageable |
| Organiser/admin notifications | Add later if review-queue reminders become necessary |

Do not add push-style browser notifications in this MVP.

Example notification:

```text
Payment Receipt Rejected

Your payment receipt for 2026K HelloRun Challenge was rejected. Please review and resubmit.

Action: My Registrations
```

---

## 18. Template variables

Common variables for current web-app emails:

```text
{{firstName}}
{{lastName}}
{{fullName}}
{{email}}
{{eventTitle}}
{{eventSlug}}
{{eventDate}}
{{eventDistance}}
{{participationMode}}
{{confirmationCode}}
{{applicationId}}
{{paymentStatus}}
{{resultStatus}}
{{rejectionReason}}
{{reviewNotes}}
{{certificateUrl}}
{{actionUrl}}
{{supportEmail}}
```

Rules:

- Do not expose sensitive internal IDs unless needed for support.
- Use confirmation code, application ID, or public reference code where possible.
- Keep email templates short.
- Add one clear action link when action is needed.
- Prefer neutral runner-facing wording for review states.
- Escape dynamic values before rendering HTML.

---

## 19. Recommended email copy examples

### 19.1 Payment rejected

Subject:

```text
Your payment receipt needs correction
```

Body:

```text
Hello {{firstName}},

Your payment receipt for {{eventTitle}} needs correction.

Reason:
{{rejectionReason}}

Please upload a new payment receipt from your HelloRun account.

Action: {{actionUrl}}
```

### 19.2 Run result rejected

Subject:

```text
Your run result needs correction
```

Body:

```text
Hello {{firstName}},

Your run result for {{eventTitle}} needs correction.

Reason:
{{rejectionReason}}

Please review the note and submit an updated result in HelloRun.

Action: {{actionUrl}}
```

### 19.3 Organiser application approved

Subject:

```text
Your organiser application has been approved
```

Body:

```text
Hello {{firstName}},

Your HelloRun organiser application has been approved.

You can now create and manage events from your organiser dashboard.

Action: {{actionUrl}}
```

---

## 20. MVP implementation scope

Implemented:

- `CommunicationSetting` model.
- `CommunicationEventSetting` model.
- `CommunicationLog` model.
- `DailyEmailUsage` model.
- Communication event seed file for current web-app events.
- Communication service wrapping existing email and notification services.
- Email budget service.
- Email log service.
- Admin communications page.
- Admin communication settings form.
- Admin communication event control table.
- Admin communication logs filters/table.
- Admin communication tool kits.
- Test email action.
- Integration with current email and notification call sites.

Defer:

- Database-backed `EmailTemplate` editing UI
- Newsletter system
- Marketing automation
- Scheduled campaigns
- SMS
- Push notifications
- Advanced segmentation
- User preference centre
- Shop, race-kit, and payment-gateway communication events

---

## 21. MVP event keys to integrate first

Start with:

```text
account.email_verification
account.password_reset
account.password_reset_confirmation
organiser.application_submitted
organiser.application_approved
organiser.application_rejected
registration.confirmed
payment.receipt_submitted
payment.approved
payment.rejected
result.approved
result.rejected
certificate.issued
```

Recommended default behaviour:

| Event | Email | In-app |
|---|---:|---:|
| Email verification | On locked | Off |
| Password reset | On locked | Off |
| Password reset confirmation | On | Off |
| Application submitted | On | Off |
| Application approved/rejected | On | Off |
| Registration confirmed | Off | On |
| Payment receipt submitted | Off | On for runner |
| Payment approved | Off | On |
| Payment rejected | On | On |
| Result approved | Off | On |
| Result rejected | On | On |
| Certificate issued | Off | On |

---

## 22. Suggested implementation phases

### Phase 1: Communication registry and defaults

Status: implemented.

Deliverables:

- Define event keys for current web-app events.
- Seed default communication settings.
- Lock email verification and password reset.
- Set email defaults based on priority.

### Phase 2: Email budget and logs

Status: implemented.

Deliverables:

- Track sent emails per date.
- Enforce soft stop and hard stop rules.
- Reserve quota for critical email.
- Log sent, skipped, failed, and suppressed sends.

### Phase 3: Communication service wrapper

Status: implemented.

Deliverables:

- `communicationService.notify(eventKey, payload)`.
- Calls to existing `email.service.js` helpers.
- Calls to existing `notification.service.js` where in-app is supported.
- Email fallback rules.

### Phase 4: Integrate current workflows

Status: implemented.

Integrate with:

- Signup and resend verification.
- Password reset and reset confirmation.
- Organiser application submission.
- Organiser application approval/rejection.
- Event registration confirmation.
- Payment receipt submission.
- Payment approval/rejection.
- Result approval/rejection.
- Certificate issued.

### Phase 5: Admin UI

Status: implemented.

Deliverables:

- Email Budget tab.
- Communication Events tab.
- Email Logs tab.
- Test Email button.
- Locked event indicators.
- Tool Kits section.

### Phase 6: Tests and QA

Status: focused tests added; full suite has one unrelated leaderboard seed failure.

Tests:

- Critical emails still send when non-critical email is disabled.
- Low/medium priority email is skipped after the soft threshold.
- In-app notification is still created when a supported email is skipped.
- Email log records sent, skipped, failed, and fallback statuses.
- Locked email events cannot be disabled.
- Admin can send test email.
- Existing workflow actions still succeed when non-critical email fails.

---

## 23. Testing checklist

```text
[x] Email verification cannot be disabled.
[x] Password reset cannot be disabled.
[x] Password reset confirmation can be disabled without breaking reset success.
[x] Registration confirmed creates in-app notification and can skip email.
[x] Payment receipt submitted creates runner in-app notification and can skip organiser email.
[x] Payment approved creates in-app notification and no email by default.
[x] Payment rejected sends email when quota allows and creates in-app notification.
[x] Result approved creates in-app notification and no email by default.
[x] Result rejected sends email when quota allows and creates in-app notification.
[x] Certificate issued creates in-app notification and no email by default.
[x] Daily email usage increments after successful email send.
[x] Skipped emails do not increment sent count.
[x] Logs show sent, skipped, failed, suppressed, and fallback_in_app statuses.
[x] Admin settings changes are logged.
[x] Test email is marked as test and does not create product notifications.
```

Validation run:

```text
node --check on modified JS files: passed
tests/communication.service.test.js: passed
tests/submission.service.test.js: passed
tests/admin-dashboard.test.js: passed
npm test: 321/322 passed; remaining failure is an unrelated leaderboard seed expectation.
```

---

## 24. Risks and controls

| Risk | Control |
|---|---|
| Email quota runs out | Use budget thresholds and priority rules |
| Required account emails are skipped | Lock verification and password reset |
| Users miss action-required updates | Keep payment/result rejection email on and create in-app notifications |
| Routine emails consume quota | Default routine registration, approval, and certificate email off |
| Email provider fails | Keep the workflow successful where email is non-critical and log failure |
| Templates break due to missing variables | Keep code-backed templates first; validate templates before admin editing |
| Logs expose sensitive data | Store metadata only; do not store full email body or uploaded proof data |
| Duplicate messages after refactor | Route all communication through one service per event key |

---

## 25. Recommended final decision

Build the Communication Access Manager before the broader System Access Manager.

Start with current HelloRun web-app communication events only:

- account verification,
- password reset,
- organiser application updates,
- registration confirmation,
- payment receipt updates,
- run result updates,
- certificate issued,
- runner in-app notifications,
- email budget and logs.

Do not add newsletters, campaigns, SMS, push notifications, shop, race-kit, payment-gateway, or advanced preference features until those modules exist in the product.
