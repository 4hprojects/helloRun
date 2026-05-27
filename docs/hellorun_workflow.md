# HelloRun Workflow

## Document Role

This document explains how HelloRun works from account creation through event completion, review, leaderboard visibility, certificates, badges, and related organiser/admin operations.

Use this as a high-level workflow reference. Detailed feature specifications remain in the dedicated docs for create-event, runner submissions, leaderboard, badges, shop, policies, and onsite operations.

## Core Actors

| Actor | Main responsibility |
|---|---|
| Public visitor | Browse public pages, events, blogs, badge verification, and public leaderboards. |
| Runner | Register for events, pay when required, submit run results, track review status, and access certificates/badges. |
| Organiser | Apply for organiser access, create events, manage registrants, review payments and results, and operate event tools. |
| Admin | Review organiser applications, approve/publish events, moderate content, manage users/policies, and support platform operations. |

## End-to-End Platform Flow

```text
Visitor
  -> signs up or logs in
  -> verifies email
  -> uses role-specific area

Runner
  -> discovers event
  -> registers
  -> submits payment receipt if event is paid
  -> waits for payment approval
  -> submits run result evidence or Strava activity
  -> waits for result review
  -> appears in leaderboard when approved
  -> receives certificate and badges when eligible

Organiser
  -> applies for organiser access
  -> completes profile and documents
  -> waits for admin approval
  -> creates event draft
  -> submits event for review
  -> manages published event
  -> reviews payment receipts and run results
  -> monitors registrants, submissions, badges, shop, and onsite operations

Admin
  -> reviews organiser applications
  -> reviews and publishes events
  -> monitors review queues
  -> manages users, policies, communications, badges, and moderation
```

## Account and Role Workflow

```text
1. User signs up from the auth flow.
2. User chooses a role: runner or organiser.
3. HelloRun sends email verification.
4. User verifies email.
5. Runner accounts can use runner/event flows after login.
6. Organiser accounts continue to organiser profile completion.
7. Admin reviews organiser applications.
8. Approved organisers can publish-ready events after event review.
```

Important surfaces:

| Surface | Route |
|---|---|
| Signup | `/signup` |
| Login | `/login` |
| Runner dashboard | `/runner/dashboard` |
| Organiser dashboard | `/organizer/dashboard` |
| Admin dashboard | `/admin/dashboard` |

## Public Discovery Workflow

```text
1. Visitor opens the home page or events page.
2. Public event list shows eligible published events.
3. Visitor opens an event detail page.
4. Event detail page shows event schedule, registration state, pricing, rewards, rules, media, and primary CTA.
5. Visitor must log in before registering.
```

Important surfaces:

| Surface | Route |
|---|---|
| Home | `/` |
| Public event list | `/events` |
| Public event detail | `/events/:slug` |
| Public leaderboard | `/events/:slug/leaderboard` |
| Blog | `/blog` |
| Static help | `/how-it-works`, `/faq`, `/contact` |

## Runner Registration Workflow

```text
1. Runner opens a published event.
2. Runner selects registration details:
   - participant information
   - participation mode
   - race distance or category
   - add-ons when available
   - waiver acceptance
3. HelloRun creates a Registration record.
4. Free event registration starts as paid/ready for result submission.
5. Paid event registration starts as unpaid and requires a payment receipt.
6. Runner tracks the registration from My Registrations and runner dashboard.
```

Primary data:

| Model | Key fields |
|---|---|
| `Registration` | `eventId`, `userId`, `participant`, `participationMode`, `raceDistance`, `paymentStatus`, `paymentProof`, `confirmationCode`, `registeredAt` |
| `Event` | `feeMode`, `feeAmount`, `paymentAccountName`, `paymentInstructions`, `paymentQrImageUrl`, `registrationOpenAt`, `registrationCloseAt` |

Important surfaces:

| Surface | Route |
|---|---|
| Registration form | `GET /events/:slug/register` |
| Registration submit | `POST /events/:slug/register` |
| Runner registrations | `/my-registrations` |

## Payment Receipt Workflow

```text
1. Runner registers for a paid event.
2. Registration paymentStatus is unpaid.
3. Runner uploads a payment receipt.
4. Registration paymentStatus becomes proof_submitted.
5. Organiser or admin reviews the receipt.
6. If approved:
   - paymentStatus becomes paid
   - runner can submit run result evidence
   - payment approved notification can be sent
7. If rejected:
   - paymentStatus becomes proof_rejected
   - rejection reason and notes are saved
   - runner can submit a corrected receipt
```

Payment status values:

| Status | Meaning |
|---|---|
| `unpaid` | Paid event registration still needs a receipt. |
| `proof_submitted` | Receipt is waiting for organiser/admin review. |
| `proof_rejected` | Receipt was rejected and needs correction. |
| `paid` | Registration is payment-cleared. |
| `failed` | Payment failed. |
| `refunded` | Payment was refunded. |

Important surfaces:

| Surface | Route |
|---|---|
| Upload payment receipt | `POST /my-registrations/:registrationId/payment-proof` |
| Organiser payment review | `/organizer/events/:eventId/payment-proofs/review` |
| Approve payment | `POST /organizer/events/:id/registrants/:registrationId/payment/approve` |
| Reject payment | `POST /organizer/events/:id/registrants/:registrationId/payment/reject` |

## Run Result Submission Workflow

```text
1. Runner has an eligible paid or free registration.
2. Runner opens the run result modal from dashboard, My Registrations, or submissions page.
3. Runner uploads screenshot evidence, enters manual details, or imports a selected Strava activity.
4. OCR may extract distance, time, date, source app, run type, and confidence.
5. Runner confirms final submitted values.
6. HelloRun creates a Submission or AccumulatedActivitySubmission record.
7. Submission starts as submitted unless auto-approval criteria apply.
8. Organiser/admin reviews the result.
9. Approved results count toward leaderboard, certificate, badge, and progress workflows.
10. Rejected results show feedback and can be resubmitted.
```

Submission status values:

| Status | Meaning |
|---|---|
| `submitted` | Waiting for review. |
| `approved` | Counts as verified result data. |
| `rejected` | Needs runner correction. |

Primary data:

| Model | Used for |
|---|---|
| `Submission` | Single-activity race/result submissions. |
| `AccumulatedActivitySubmission` | Multi-activity accumulated-distance challenges. |
| `StravaConnection` | Encrypted Strava OAuth connection for runner imports. |

Important surfaces:

| Surface | Route |
|---|---|
| Eligible submission options | `/runner/submissions/eligible` |
| Submit result | `POST /my-registrations/:registrationId/submit-result` |
| Resubmit result | `POST /my-registrations/:registrationId/resubmit-result` |
| Runner submitted entries | `/runner/submissions` |
| Submission detail | `/runner/submissions/:submissionId` |
| Organiser result review | `/organizer/events/:id/submissions/:submissionId/review` |
| Approve result | `POST /organizer/events/:id/submissions/:submissionId/approve` |
| Reject result | `POST /organizer/events/:id/submissions/:submissionId/reject` |

## Leaderboard Workflow

```text
1. Event enables leaderboard recognition or leaderboard settings.
2. Public leaderboard route loads event settings.
3. Leaderboard service selects ranking mode:
   - race_result for single-activity events
   - accumulated_challenge for accumulated-distance events
4. Official rankings include approved results only by default.
5. Pending results may be shown only when event settings allow it.
6. Public data hides proof images, raw OCR text, contact details, internal notes, and suspicious review details.
7. Logged-in runner can request My Standing and nearby runners.
```

Ranking behavior:

| Event mode | Ranking basis |
|---|---|
| Single activity | Fastest approved elapsed time. |
| Accumulated distance | Highest approved total distance. |

Important surfaces:

| Surface | Route |
|---|---|
| Public event leaderboard | `/events/:slug/leaderboard` |
| Leaderboard data API | `/events/:slug/leaderboard/data` |
| My standing API | `/events/:slug/leaderboard/my-standing` |
| Global leaderboard | `/leaderboard` |

## Certificate and Badge Workflow

```text
1. Event may enable digital certificates and badges.
2. Approved results trigger certificate eligibility.
3. Badge rules evaluate after registration/payment, result approval, accumulated progress, onsite result approval, published rankings, or organiser milestones.
4. Runner can view badges in dashboard/profile and public badge pages when visible.
5. Public badge verification and Open Badge JSON are available for earned badges.
```

Important surfaces:

| Surface | Route |
|---|---|
| Certificate download | `/my-submissions/:submissionId/certificate` |
| Runner badges | `/runner/profile/badges` |
| Badge verification | `/badges/:userBadgeId/verify` |
| Open Badge JSON | `/badges/:userBadgeId/open-badge.json` |
| Event badges | `/events/:slug/badges` |
| Organiser badge manager | `/organizer/events/:id/badges/manage` |
| Admin badges | `/admin/badges` |

## Organiser Event Creation Workflow

```text
1. Approved organiser opens Create Event.
2. Organiser builds event through the guided wizard.
3. Organiser can save as draft.
4. Organiser can preview draft.
5. Organiser submits event for review.
6. Event status becomes pending_review unless auto-approval publishes it.
7. Admin reviews event.
8. Approved event becomes published and appears publicly when visibility rules allow it.
9. Organiser manages registrants, payment reviews, result reviews, badges, shop, and onsite operations.
```

Event status values:

| Status | Meaning |
|---|---|
| `draft` | Organiser-owned draft, not public. |
| `pending_review` | Submitted for admin review. |
| `published` | Publicly eligible event. |
| `closed` | Event no longer active/editable in normal flow. |
| `archived` | Hidden from active management. |

Important surfaces:

| Surface | Route |
|---|---|
| Create event | `/organizer/create-event` |
| Preview event | `/organizer/preview-event` |
| Organiser events | `/organizer/events` |
| Edit event | `/organizer/events/:id/edit` |
| Registrants | `/organizer/events/:id/registrants` |
| Registrant export | `/organizer/events/:id/registrants/export` |
| XLSX export | `/organizer/events/:id/registrants/export-xlsx` |

## Admin Review Workflow

```text
1. Admin monitors dashboard and review queues.
2. Admin reviews organiser applications.
3. Admin approves or rejects organiser applications.
4. Admin reviews submitted events.
5. Admin approves, edits, archives, or deletes events when needed.
6. Admin manages users, policy documents, communications, badges, blogs, comments, and reports.
```

Important surfaces:

| Surface | Route |
|---|---|
| Review queue | `/admin/reviews` |
| Applications | `/admin/applications` |
| Events | `/admin/events` |
| Users | `/admin/users` |
| Communications | `/admin/communications` |
| Policies | `/admin/privacy-policy`, `/admin/terms-and-conditions`, `/admin/cookie-policy` |
| Blog review | `/admin/blog/review` |

## Shop and Add-On Workflow

```text
1. Event can expose add-ons or shop products.
2. Runner selects available registration add-ons during registration when supported.
3. Shop orders and payments are tracked separately from core event registration payment.
4. Organiser/admin can review shop products, orders, and payment proofs.
5. Approved shop payment can update related order payment status and, when tied back to registration, registration payment status.
```

Important surfaces:

| Surface | Route family |
|---|---|
| Event shop | `/events/:slug/shop` or event shop page route where enabled |
| Shop routes | `/shop/*` |
| Organiser shop management | `/organizer/events/:eventId/shop/*` |
| Admin shop management | `/admin/shop/*` |

## Onsite and Hybrid Operations Workflow

```text
1. Organiser creates an onsite or hybrid event.
2. Published event can use QR, check-in, bib, kit, and onsite result operations.
3. Onsite results can be submitted or imported.
4. Approved onsite results feed ranking, badges, and certificates.
5. Realtime check-in and operational reports support race-day workflows.
```

Related route modules:

| Area | File |
|---|---|
| Onsite operations | `src/routes/organiser/onsite-operations.js` |
| QR and dashboard | `src/routes/organiser/qr-and-dashboard.js` |
| Timing webhook | `src/routes/webhooks/timing-system.js` |

## Notifications and Communications Workflow

```text
1. Important events call the communication service.
2. Communication settings determine whether email or in-app notification behavior is enabled.
3. Runner-facing notifications link back to registrations, submissions, payment status, certificates, and badges.
4. Admin can manage communication settings and logs.
```

Common notification triggers:

| Trigger | Recipient |
|---|---|
| Payment approved or rejected | Runner |
| Result approved or rejected | Runner |
| Certificate issued | Runner |
| Badge earned | Runner, when enabled |
| Organiser application approved or rejected | Organiser |

## Data Sync Workflow

```text
1. MongoDB remains the primary app data store for core app models.
2. Selected records sync to Supabase/Postgres shadow tables when DATABASE_URL is configured.
3. Shadow sync covers app users, event core data, registrations/payment data, submissions/certificates, policy consents, rankings, and onsite operations.
4. Backfill and verify scripts keep shadow data auditable.
```

Important scripts:

| Script | Purpose |
|---|---|
| `npm run supabase:migrate` | Apply Supabase migrations. |
| `npm run supabase:backfill:app-users` | Backfill app users. |
| `npm run supabase:backfill:event-core` | Backfill event core data. |
| `npm run supabase:backfill:registrations` | Backfill registration/payment data. |
| `npm run supabase:backfill:submissions` | Backfill submission/certificate data. |
| `npm run supabase:backfill:rankings` | Backfill rankings data. |
| `npm run supabase:smoke:live-sync` | Smoke test live sync. |

## Happy Path Summary

```text
1. Runner creates account and verifies email.
2. Runner registers for a published event.
3. If paid, runner uploads payment receipt.
4. Organiser approves payment.
5. Runner submits run result evidence or Strava activity.
6. Organiser approves result.
7. Runner appears on leaderboard.
8. Runner gets certificate and eligible badges.
9. Organiser monitors event analytics, exports registrants, and completes event operations.
10. Admin oversees applications, event publishing, policies, communications, and moderation.
```

## Review and Exception Paths

| Scenario | Expected handling |
|---|---|
| Email not verified | User must complete verification before normal protected flows. |
| Organiser not approved | Organiser must complete application/review before full publishing access. |
| Event draft incomplete | Event can be saved as draft but cannot submit for review until required fields pass validation. |
| Paid registration unpaid | Runner cannot submit run result until payment status is paid. |
| Payment receipt rejected | Runner sees rejection feedback and can resubmit receipt. |
| Result rejected | Runner sees review feedback and can resubmit result evidence. |
| Suspicious result signal | Public UI uses neutral labels; organiser/admin review sees detailed OCR/integrity signals. |
| Pending result | Does not count in official leaderboard by default. |
| Rejected or private data | Public APIs must not expose proof images, OCR raw text, contact information, internal notes, or payment proof data. |

## Source Map

| Area | Main files |
|---|---|
| Public pages and registration | `src/routes/pageRoutes.js`, `src/controllers/page.controller.js` |
| Runner workspace | `src/routes/runner.routes.js`, `src/controllers/runner.controller.js` |
| Organiser workflow | `src/routes/organizer.routes.js`, `src/views/organizer/*` |
| Admin workflow | `src/routes/admin.routes.js`, `src/controllers/admin.controller.js` |
| Events | `src/models/Event.js`, `src/services/event-form.service.js` |
| Registrations and payments | `src/models/Registration.js`, `src/utils/payment-workflow.js` |
| Result submissions | `src/models/Submission.js`, `src/services/submission.service.js`, `src/services/accumulated-activity.service.js` |
| Leaderboard | `src/services/leaderboard.service.js`, `src/views/pages/event-leaderboard.ejs` |
| Badges and certificates | `src/services/achievement.service.js`, `src/services/certificate.service.js` |
| Shop | `src/routes/shop.routes.js`, `src/routes/organizer-shop.routes.js`, `src/routes/admin-shop.routes.js`, `src/services/shop/*` |
| Policies and consent | `src/services/policy-registry.service.js`, `src/models/PrivacyPolicy.js` |

