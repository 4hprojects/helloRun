# HelloRun Certificate Template Workflow Implementation

## Purpose

Implement organiser-managed certificate templates on top of HelloRun's existing certificate issuing flow.

HelloRun already generates PDF certificates when qualifying run results are approved. This feature must extend that flow with event-linked templates, preview, public verification, certificate numbers, revocation, and regeneration without introducing a parallel certificate system.

## Current App Baseline

Before this feature starts, the app already has:

- `src/services/certificate.service.js` using `pdfkit` to generate A4 landscape PDF certificates.
- `src/services/submission.service.js` issuing certificates when standard submissions are approved.
- `src/services/accumulated-activity.service.js` issuing certificates when accumulated-distance goals are completed.
- `Submission.certificate` and `AccumulatedActivitySubmission.certificate` metadata in MongoDB.
- A Postgres `certificates` table created by `src/db/migrations/005_phase5_submission_certificate_shadow.sql`.
- Live shadow sync through `src/services/submission-shadow.service.js`.
- Protected runner certificate download at `GET /my-submissions/:submissionId/certificate`.
- Event-level `digitalCertificateEnabled`.
- Cloudflare R2 upload helpers through `src/services/upload.service.js`.
- Existing dependencies: `pdfkit`, `qrcode`, `ejs`, `multer`, `sharp`.

The implementation must preserve those routes, fields, tests, and behaviors.

## Core Goal

When an organiser creates or edits an event with digital certificates enabled, HelloRun should automatically prepare a usable certificate template based on:

- event title
- organiser name
- event logo
- organiser or HelloRun branding
- event date
- race category or distance
- certificate text
- runner name placeholder
- finish time placeholder
- rank placeholder, when available
- certificate number placeholder
- QR verification placeholder

Certificates should not render the registration confirmation code as a certificate detail. Registration confirmation codes remain useful for registration/payment workflows, but certificates should use `certificateNumber` and `verificationUrl` as their public references.

The organiser should be able to review and adjust the generated certificate template before the event is published or while the event is still editable.

## Product Decision

Do not force organisers to design certificates.

Default behaviour:

```text
HelloRun creates a certificate automatically.
The organiser only edits it if needed.
```

This keeps the workflow fast for small and medium running events.

## Recommended Implementation Strategy

Use a phased approach.

### Phase 1: Extend Existing PDFKit Certificates

Keep the current `pdfkit` generation path and add fixed template layouts.

Available layouts:

- Classic
- Modern Race
- Minimal
- School Event
- Charity Run
- Split Panel Event

Each layout should support uploaded images, certificate text, display toggles, certificate number, and QR verification.

### Split Panel Event Layout

Add a fixed `split_panel_event` layout inspired by a split-panel event certificate.

The layout should use:

- a full-height left branding panel using the event primary/accent colour
- event logo at the top of the left panel
- event title and event date below the logo
- event artwork, medal image, poster image, or fallback medal graphic in the centre of the left panel
- a clean white right panel with optional light grey pattern
- certificate type at the top, such as `Certificate of Completion`
- large recognition heading
- participant name in bold uppercase text with an underline
- completion phrase, event name, category/distance, finish time, event date, and rank when enabled
- footer with `Certified through HelloRun`, certificate number, and QR verification
- no registration confirmation code in the certificate detail cards

The layout must support dynamic data from event records, registration records, submission records, organiser profile, uploaded certificate assets, and certificate settings.

Do not add Puppeteer in Phase 1. The current app already has a working `pdfkit` generator and tests; extending it is lower risk.

### Phase 2: Template Selection and Basic Customisation

Allow organisers to:

- choose a layout
- reuse event logo from `Event.logoUrl`
- upload or replace certificate-specific logos
- upload sponsor logos
- upload signature image
- upload optional certificate background
- edit certificate heading
- edit certificate body text
- choose whether to show finish time
- choose whether to show rank
- choose whether to show QR code
- preview the certificate using sample runner data
- publish one active template per event

### Phase 3: HTML/EJS Preview Rendering

Use EJS only where it helps the organiser-facing preview UI.

The issuing PDF can remain `pdfkit` until there is a strong reason to switch. If HTML-to-PDF is later needed, evaluate Puppeteer separately because it adds operational weight.

### Phase 4: pdfme Designer

Add a visual template editor later using pdfme after certificate issuing, verification, revocation, and regeneration are stable.

pdfme can store templates as JSON and support visual field placement, but it should not be the first implementation path.

## Feature Boundaries

This is a certificate issuing system, not only a certificate maker.

It must handle:

- template creation
- asset upload
- certificate preview
- approval-based generation
- certificate storage
- certificate verification
- regeneration
- revocation
- audit trail

## Existing Workflow To Preserve

### Standard Submission Certificate Flow

```text
Runner submits run proof
-> Organiser approves submission or submission is auto-approved
-> src/services/submission.service.js calls attachCertificateIfNeeded
-> src/services/certificate.service.js generates a PDF
-> PDF uploads to R2 when configured
-> Submission.certificate is saved
-> Postgres certificates table is updated by shadow sync
-> Runner downloads from /my-submissions/:submissionId/certificate
```

### Accumulated Challenge Certificate Flow

```text
Runner submits accumulated activities
-> Approved distance reaches the event target
-> src/services/accumulated-activity.service.js calls attachCompletionCertificateIfNeeded
-> Certificate is generated for the completion activity
-> Runner downloads from the same existing certificate route
```

## Event Creation Workflow

The current create/edit event wizard already has a Rewards and Inclusions step with `Digital Finisher Certificate`.

Recommended aligned order:

1. Event Type
2. Core Details
3. Schedule
4. Location or Virtual Rules
5. Race Categories
6. Rewards and Inclusions
7. Certificate Template, visible when digital certificates are enabled
8. Pricing
9. Payment Setup
10. Event Details
11. Branding and Media
12. Waiver
13. Review

Implementation note: adding a full wizard step touches a large EJS file and JS step tracking. If scope needs to stay smaller, start with a separate event management page:

```text
GET /organizer/events/:eventId/certificate
```

Then link it from create/edit review screens and organiser event management.

## Certificate Template Step

The Certificate Template step or page should show:

- auto-created certificate preview
- template selector
- event logo inherited from `Event.logoUrl`
- certificate-specific uploaded logos
- editable certificate wording
- display toggles
- preview button
- save draft button
- publish template button

Suggested UI sections:

```text
Certificate Preview
Template Layout
Branding Assets
Certificate Text
Displayed Runner Data
Verification Settings
Save / Publish Controls
```

## Data Storage Direction

Use the existing hybrid database architecture.

### MongoDB

Use MongoDB for flexible certificate template configuration.

Create a new model:

```text
src/models/CertificateTemplate.js
```

Collection:

```text
certificate_templates
```

Suggested document shape:

```js
{
  _id: ObjectId,

  eventId: ObjectId,
  organizerId: ObjectId,

  name: "Default Event Certificate",
  layoutKey: "modern_race",

  status: "draft",
  // draft, active, archived

  assets: {
    backgroundImageUrl: "",
    backgroundImageKey: "",
    organizerLogoUrl: "",
    organizerLogoKey: "",
    eventLogoUrl: "",
    eventLogoKey: "",
    eventArtworkUrl: "",
    eventArtworkKey: "",
    signatureImageUrl: "",
    signatureImageKey: "",
    sponsorLogoUrls: [],
    sponsorLogoKeys: []
  },

  content: {
    heading: "Certificate of Completion",
    bodyText: "This certifies that {{runnerName}} successfully completed {{distance}} in {{eventTitle}}.",
    footerText: "Verify this certificate using the QR code below.",
    signatureName: "",
    signatureRole: ""
  },

  displayOptions: {
    showDistance: true,
    showFinishTime: true,
    showRank: false,
    showEventDate: true,
    showCertificateNumber: true,
    showQrCode: true,
    showOrganizerLogo: true,
    showEventLogo: true,
    showSponsorLogos: true
  },

  styleOptions: {
    primaryColor: "#0F172A",
    accentColor: "#FA9A4B",
    secondaryAccentColor: "#78C0E9",
    fontFamily: "Helvetica",
    pageSize: "A4",
    orientation: "landscape"
  },

  previewSampleData: {
    runnerName: "Juan Dela Cruz",
    distance: "10K",
    finishTime: "01:08:42",
    rank: "15",
    eventTitle: "HelloRun Sample Event",
    eventDate: "May 27, 2026",
    organizerName: "Sample Organizer",
    certificateNumber: "HR-CERT-2026-SAMPLE-000001"
  },

  pdfmeTemplateJson: null,

  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date
}
```

Indexes:

```js
certificateTemplateSchema.index({ eventId: 1, status: 1 });
certificateTemplateSchema.index({ organizerId: 1, updatedAt: -1 });
```

Only one active template should exist per event.

### MongoDB Submission Certificate Metadata

Extend existing embedded certificate metadata instead of replacing it.

Current shape:

```js
certificate: {
  url: String,
  key: String,
  issuedAt: Date
}
```

Target shape:

```js
certificate: {
  url: String,
  key: String,
  issuedAt: Date,
  certificateNumber: String,
  verificationUrl: String,
  templateId: ObjectId,
  status: String,
  revokedAt: Date,
  regeneratedAt: Date
}
```

Keep existing fields for backward compatibility with runner dashboard and submission pages.

### Supabase/Postgres

Do not create a second `certificates` table.

Add an additive migration that extends the existing table created in Phase 5.

Suggested migration:

```sql
alter table certificates
  add column if not exists registration_id uuid references registrations(id),
  add column if not exists organizer_user_id uuid references app_users(id),
  add column if not exists certificate_template_id text,
  add column if not exists certificate_number text,
  add column if not exists verification_url text,
  add column if not exists status text not null default 'generated',
  add column if not exists generated_at timestamptz,
  add column if not exists regenerated_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoke_reason text,
  add column if not exists generation_error text;

create unique index if not exists certificates_certificate_number_uidx
  on certificates(certificate_number)
  where certificate_number is not null and certificate_number <> '';

create index if not exists certificates_registration_id_idx on certificates(registration_id);
create index if not exists certificates_status_idx on certificates(status);
```

Accepted statuses:

```text
pending
generated
regenerated
revoked
failed
```

### Certificate Audit Logs

Add a new Postgres table for certificate-specific audit events.

```sql
create table if not exists certificate_audit_logs (
  id uuid primary key default gen_random_uuid(),

  certificate_id uuid references certificates(id),
  event_id uuid references events_core(id),
  actor_user_id uuid references app_users(id),
  actor_role text,

  action text not null,
  -- generated, regenerated, revoked, failed, downloaded, verified

  details jsonb,
  ip_address text,
  user_agent text,

  created_at timestamptz not null default now()
);

create index if not exists certificate_audit_logs_certificate_id_idx
  on certificate_audit_logs(certificate_id);

create index if not exists certificate_audit_logs_event_id_idx
  on certificate_audit_logs(event_id);
```

Keep using `critical-audit.service.js` for platform-critical events if needed. This table is for certificate-specific lookup and verification/download history.

### Cloudflare R2

Use existing `upload.service.js`.

Add certificate-specific upload helpers only if needed:

```text
events/{eventId}/certificate-assets/backgrounds/
events/{eventId}/certificate-assets/logos/
events/{eventId}/certificate-assets/signatures/
events/{eventId}/certificate-assets/sponsors/
results/certificates/
```

The existing generated PDF category `results/certificates` can remain for compatibility.

## Certificate Number Format

Use a predictable but unique public certificate number.

Recommended format:

```text
HR-CERT-{YEAR}-{EVENT_SHORT_CODE}-{SEQUENCE}
```

Example:

```text
HR-CERT-2026-BAG10K-000123
```

Rules:

- must be unique
- must not expose MongoDB ObjectIds or Postgres UUIDs
- should be easy to type into a verification form
- should be printable on the certificate
- should be included in QR verification URL

Use event `referenceCode` when available to derive `EVENT_SHORT_CODE`. Fall back to a sanitized event title prefix.

## Verification URL Format

Use:

```text
/certificates/verify/:certificateNumber
```

Example:

```text
https://hellorun.online/certificates/verify/HR-CERT-2026-BAG10K-000123
```

The public verification page should show:

- certificate status
- runner name
- event title
- organiser name
- distance
- finish time, if enabled
- rank, if enabled and available
- generated date
- certificate number

If revoked, show:

```text
This certificate is no longer valid.
```

Do not expose private submission proof files, OCR data, payment data, reviewer notes, or internal IDs.

## Routes

### Organiser Template Routes

```text
GET    /organizer/events/:eventId/certificate
POST   /organizer/events/:eventId/certificate
POST   /organizer/events/:eventId/certificate/assets
POST   /organizer/events/:eventId/certificate/preview
POST   /organizer/events/:eventId/certificate/publish
POST   /organizer/events/:eventId/certificate/archive
```

Use existing auth and organiser event ownership protections.

### Certificate Generation Routes

Manual actions only:

```text
POST   /organizer/events/:eventId/certificates/regenerate/:certificateId
POST   /organizer/events/:eventId/certificates/revoke/:certificateId
```

Do not add a normal manual generate route until there is a product requirement. The primary trigger should remain approval/completion.

### Existing Runner Route To Preserve

```text
GET /my-submissions/:submissionId/certificate
```

This route is already used by runner dashboard and submissions pages.

### Future Runner Certificate Page

Optional after template and verification work:

```text
GET /runner/certificates
GET /runner/certificates/:certificateId
GET /runner/certificates/:certificateId/download
```

### Public Routes

```text
GET /certificates/verify
GET /certificates/verify/:certificateNumber
```

## Controllers

Create:

```text
src/controllers/certificateTemplate.controller.js
src/controllers/certificate.controller.js
src/controllers/certificateVerification.controller.js
```

### certificateTemplate.controller.js

Responsibilities:

- load template setup page
- create default template if none exists
- update template settings
- upload template assets
- generate preview PDF or preview image
- publish active template
- archive template

### certificate.controller.js

Responsibilities:

- regenerate certificate
- revoke certificate
- preserve existing runner download behavior
- log certificate actions

Generation from approval should remain service-driven rather than route-driven.

### certificateVerification.controller.js

Responsibilities:

- search certificate by certificate number
- render public verification result
- return only public-safe fields
- show revoked or invalid certificate state
- log verification attempts

## Services

Create or refactor:

```text
src/services/certificateTemplate.service.js
src/services/certificateNumber.service.js
src/services/certificateVerification.service.js
src/services/certificateAudit.service.js
```

Extend:

```text
src/services/certificate.service.js
src/services/submission.service.js
src/services/accumulated-activity.service.js
src/services/submission-shadow.service.js
src/services/upload.service.js
```

### certificateTemplate.service.js

Responsibilities:

- create default template from event and organiser data
- validate template fields
- manage template status
- prepare preview sample data
- convert stored config into render-ready certificate data
- ensure only one active template per event

### certificate.service.js

Responsibilities after refactor:

- build certificate render data from submission, registration, event, runner, template, and certificate number
- render fixed `pdfkit` layouts
- generate QR code from verification URL
- upload PDF to R2 through `upload.service.js`
- preserve current local/dev inline data URL fallback

### certificateNumber.service.js

Responsibilities:

- generate unique certificate numbers
- handle event short codes
- handle sequence numbers
- retry if duplicate number is detected

### certificateVerification.service.js

Responsibilities:

- verify certificate number
- return public-safe certificate data
- hide private fields
- handle revoked certificates

### certificateAudit.service.js

Responsibilities:

- log generation
- log regeneration
- log revocation
- log verification
- log download

## Certificate Rendering Data Contract

Create a clean data object before rendering.

```js
const certificateData = {
  runnerName: "Juan Dela Cruz",
  eventTitle: "Baguio 10K Challenge",
  organizerName: "HelloRun Events",
  distance: "10K",
  finishTime: "01:08:42",
  rank: "15",
  eventDate: "May 27, 2026",
  certificateNumber: "HR-CERT-2026-BAG10K-000123",
  verificationUrl: "https://hellorun.online/certificates/verify/HR-CERT-2026-BAG10K-000123",

  assets: {
    organizerLogoUrl: "",
    eventLogoUrl: "",
    backgroundImageUrl: "",
    signatureImageUrl: "",
    sponsorLogoUrls: []
  },

  content: {
    heading: "Certificate of Completion",
    bodyText: "This certifies that {{runnerName}} successfully completed {{distance}} in {{eventTitle}}.",
    footerText: "Verify this certificate using the QR code below.",
    signatureName: "",
    signatureRole: ""
  },

  displayOptions: {
    showDistance: true,
    showFinishTime: true,
    showRank: false,
    showEventDate: true,
    showCertificateNumber: true,
    showQrCode: true
  },

  styleOptions: {
    primaryColor: "#0F172A",
    accentColor: "#FA9A4B",
    secondaryAccentColor: "#78C0E9",
    pageSize: "A4",
    orientation: "landscape"
  }
};
```

## Placeholder Fields

Support these placeholders:

```text
{{runnerName}}
{{eventTitle}}
{{organizerName}}
{{distance}}
{{finishTime}}
{{rank}}
{{eventDate}}
{{certificateNumber}}
{{verificationUrl}}
```

Optional future placeholders:

```text
{{bibNumber}}
{{teamName}}
{{categoryName}}
{{genderRank}}
{{ageGroupRank}}
{{overallRank}}
{{completionDate}}
```

Use a safe whitelist-based placeholder replacement function. Do not evaluate arbitrary template expressions.

## QR Code

Use existing `qrcode` dependency.

Generate QR code from the public verification URL and embed it in the PDF.

Store only:

- certificate number
- verification URL
- generated PDF URL/key

Do not store private proof data in the QR code.

## Trigger Point For Certificate Generation

Certificate generation should trigger only when a qualifying approval/completion happens.

Existing trigger points:

- `submission.status` changes to `approved`
- accumulated-distance progress reaches the event target

Before generating certificate, check:

- event has `digitalCertificateEnabled !== false`
- event has an active certificate template, or create/use a default template
- runner registration exists
- runner is eligible for a certificate
- certificate for this submission/registration does not already exist, unless regeneration was requested
- required event and runner fields are available

## Regeneration Rules

Allow regeneration when:

- runner name correction was made
- finish time was corrected
- rank was recalculated
- organiser updated active certificate template
- certificate file failed to generate
- admin or organiser manually requested regeneration

When regenerating:

- keep old certificate audit trail
- update certificate file URL/key
- update status to `regenerated`
- update `regenerated_at`
- update embedded Mongo certificate metadata
- update Postgres certificate row through direct service or shadow sync
- do not reuse revoked certificate unless explicitly allowed
- log actor and reason

## Revocation Rules

Allow revocation when:

- submission was later found invalid
- runner was disqualified
- duplicate or fraudulent result was detected
- organiser manually revoked certificate

Revoked certificate page should remain searchable but show invalid status.

Do not delete certificate records by default.

## Access Control

Use existing auth middleware.

Required protections:

- organiser must own/manage the event, or be admin
- runner can only view/download their own certificate through private routes
- public verification only exposes safe certificate data
- asset uploads must validate file type and size
- generated certificate routes must require approved submission/completion status
- all POST routes must use CSRF protection
- public verification search should be rate limited

## File Upload Rules

Allowed certificate asset files:

```text
image/png
image/jpeg
image/webp
```

Avoid SVG uploads in the first implementation unless there is server-side sanitisation. Existing branding upload currently allows JPEG, PNG, and WebP only.

Recommended limits:

```text
Logo: 2 MB
Signature: 2 MB
Background image: 5 MB
Sponsor logo: 2 MB each
```

Suggested validation:

- reject unsupported MIME types
- use server-side image processing/validation where possible
- normalise file names
- store files under event-specific or certificate-specific paths
- never trust original file names for public paths

## UI Pages

### Organiser Certificate Setup Page

Suggested file:

```text
src/views/organizer/certificate-setup.ejs
```

or:

```text
src/views/organizer/events/certificate-setup.ejs
```

Main sections:

```text
Certificate Preview
Template Layout
Branding Assets
Certificate Text
Displayed Runner Data
Verification Settings
Save / Publish Controls
```

### Public Verification Page

Suggested files:

```text
src/views/certificates/verify.ejs
src/views/certificates/verification-result.ejs
```

Show:

- certificate number input
- verification result
- safe certificate details

### Future Runner Certificates Page

Suggested file:

```text
src/views/runner/certificates/index.ejs
```

Show:

- event title
- distance
- certificate status
- generated date
- download button
- verify button

This is optional because runner submissions and dashboard already expose certificate downloads.

## Environment Variables

Use existing R2 environment variables.

Add only if needed:

```text
CERTIFICATE_DEFAULT_LAYOUT=modern_race
CERTIFICATE_PUBLIC_VERIFY_BASE_URL=https://hellorun.online/certificates/verify
CERTIFICATE_GENERATION_MODE=pdfkit
```

Future:

```text
CERTIFICATE_GENERATION_MODE=pdfme
```

## Error Handling

Handle these cases:

- event has digital certificates disabled
- missing active template
- unsupported image upload
- failed R2 upload
- failed PDF generation
- duplicate certificate number
- missing runner name
- missing event title
- certificate already generated
- invalid certificate number
- revoked certificate
- unauthorised organiser access

Do not expose stack traces to users.

Log internal errors.

Certificate generation should not block submission approval unless product policy changes. If generation fails after approval, mark the certificate row as `failed`, log the error, and allow regeneration.

## Security Requirements

- Validate uploaded images.
- Restrict certificate template editing to authorised organisers/admins.
- Restrict private certificate download to the runner, organiser, or admin.
- Public verification must expose only safe fields.
- Use signed URLs if generated certificate PDFs become private.
- Do not include payment proof, run proof screenshot, OCR data, reviewer notes, or internal metadata on public pages.
- Add CSRF protection to all POST routes.
- Add rate limiting to public verification search.
- Escape dynamic text in EJS views.
- Use safe whitelist placeholder replacement.

## Testing Requirements

Create or update tests for:

### Template Creation

- auto-creates a default template for an event with digital certificates enabled
- does not duplicate template if one already exists
- saves uploaded logo URLs/keys
- saves display options
- publishes only one active template per event
- blocks organiser from editing another organiser's event template

### Certificate Generation

- generates certificate only after approved submission
- skips generation when `digitalCertificateEnabled === false`
- does not generate certificate for pending submission
- does not generate duplicate certificate for same submission/registration
- includes certificate number
- includes verification URL
- includes QR code data
- uploads generated PDF to R2 when configured
- preserves inline PDF fallback in local/dev when R2 is unavailable
- saves Mongo certificate metadata
- syncs Postgres certificate fields
- creates audit log

### Certificate Verification

- verifies valid certificate number
- shows revoked certificate as invalid
- rejects unknown certificate number
- does not expose private proof data
- rate limits repeated public verification attempts

### Access Control

- organiser cannot edit another organiser's certificate template
- runner cannot download another runner's certificate
- public verification only returns safe fields

## Suggested Smoke Test

Create one test event with:

```text
Event: Baguio Sample 10K
Organiser: HelloRun Demo Organizer
Distance: 10K
Runner: Juan Dela Cruz
Finish Time: 01:08:42
Certificate Number: HR-CERT-2026-BAG10K-000001
```

Expected result:

- default template is created
- organiser preview loads
- certificate PDF generates after approval/completion
- PDF is uploaded or locally available as inline fallback
- runner can download certificate through existing route
- QR verification page works
- public verification page does not expose private proof data

## Acceptance Criteria

The implementation is acceptable when:

- organiser can see an auto-generated certificate template for an event
- organiser can upload certificate branding assets
- organiser can preview the certificate with sample data
- organiser can publish one active certificate template
- approved runner submission can trigger certificate generation
- accumulated challenge completion can trigger certificate generation
- generated PDF is stored in R2 when configured
- generated PDF still works in local/dev fallback mode
- certificate metadata remains available on Mongo submission documents
- certificate record is stored in the existing Postgres `certificates` table
- certificate number is unique and public-safe
- runner can download certificate through existing links
- QR code links to public verification page
- public verification page shows safe certificate details
- revoked certificates no longer appear valid
- audit logs record generation, regeneration, verification, download, and revocation

## Implementation Order For Codex

### Step 1: Data Layer

- Add `CertificateTemplate` Mongo model.
- Add additive Postgres migration for certificate fields.
- Add `certificate_audit_logs` migration.
- Extend Mongo embedded certificate metadata schema.

### Step 2: Template Service

- Create `certificateTemplate.service.js`.
- Add default template creation from event data.
- Add template update and publish logic.
- Enforce one active template per event.

### Step 3: Certificate Number And Verification Data

- Create `certificateNumber.service.js`.
- Generate unique certificate numbers.
- Add verification URL builder.
- Extend shadow sync to include new certificate fields.

### Step 4: PDF Generator Refactor

- Refactor `certificate.service.js` around a clean render data contract.
- Keep current `pdfkit` behavior working.
- Add layout selection.
- Add QR code embedding.
- Add template-driven content and display toggles.

### Step 5: Organiser UI

- Add certificate setup page.
- Add routes under `/organizer/events/:eventId/certificate`.
- Add preview panel.
- Add asset upload controls.
- Add publish/archive controls.

### Step 6: Generation Hook Alignment

- Update `submission.service.js` certificate generation to:
  - skip when digital certificates are disabled
  - load active/default template
  - generate certificate number
  - store extended metadata

- Update `accumulated-activity.service.js` with the same behavior.

### Step 7: Public Verification

- Add verification search page.
- Add certificate result page.
- Add QR link support.
- Add public-safe data mapping.

### Step 8: Regeneration And Revocation

- Add regenerate service/controller path.
- Add revoke service/controller path.
- Add organiser controls.
- Add audit logging.

### Step 9: Optional Runner Certificate Index

- Add `/runner/certificates` only after existing runner submission/dashboard links remain stable.

### Step 10: Tests

- Add unit tests for services.
- Add integration tests for routes.
- Extend existing certificate access tests.
- Add smoke test for full certificate generation and verification.

## Suggested Folder Structure

```text
src/controllers/
  certificate.controller.js
  certificateTemplate.controller.js
  certificateVerification.controller.js

src/services/
  certificate.service.js
  certificateTemplate.service.js
  certificateNumber.service.js
  certificateVerification.service.js
  certificateAudit.service.js

src/models/
  CertificateTemplate.js

src/routes/
  certificate.routes.js
  certificateTemplate.routes.js
  certificateVerification.routes.js

src/views/
  organizer/
    certificate-setup.ejs
  certificates/
    verify.ejs
    verification-result.ejs
  runner/
    certificates/
      index.ejs

src/db/migrations/
  016_certificate_template_and_verification.sql

tests/
  certificate-template.service.test.js
  certificate-number.service.test.js
  certificate-verification.service.test.js
  certificate-generation-routes.test.js
```

## Future pdfme Integration

After Phase 1 and Phase 2 are stable, add pdfme.

Future features:

- drag-and-drop field positioning
- JSON-based template storage
- visual template designer
- custom fields per event
- sponsor logo placement
- certificate background editing
- per-category certificate templates

Store pdfme output in:

```js
pdfmeTemplateJson
```

When `CERTIFICATE_GENERATION_MODE=pdfme`, use pdfme generator instead of the current `pdfkit` generator.

## Definition Of Done

The feature is done when an organiser can publish an event with a usable certificate template and a runner with an approved result or completed accumulated-distance goal can receive a downloadable, verifiable certificate PDF without manual admin work.
