# HelloRun PRD Expansion Insert

## Suggested Placement

Insert this section after **PROJECT OVERVIEW & STATUS** and before the detailed phase breakdown.

This insert updates the development direction so the PRD clearly reflects HelloRun as a platform for both runners and organisers. It also clarifies the difference between virtual run monitoring and onsite event support.

---

# PRODUCT POSITIONING UPDATE

## Platform Positioning

HelloRun is a centralized running event management platform for virtual and onsite running events.

The platform serves two primary user groups:

1. **Runners**
   - Discover events
   - Register for events
   - Upload payment proof
   - Submit virtual run proof
   - Track submission status
   - View rankings
   - Download certificates
   - Join running groups
   - Purchase or claim achievement-based merchandise in future phases

2. **Organisers**
   - Create and manage events
   - Collect and monitor registrations
   - Track payment proofs
   - Manage participant records
   - Review virtual run submissions
   - Publish results and rankings
   - Generate certificates
   - Access dashboards and reports
   - Manage merchandise options in future phases

HelloRun is not only a runner-facing app. It is an organiser-support platform that connects runner participation, event operations, payment-proof workflows, submission review, results, certificates, reports, and future merchandise opportunities.

---

# EVENT MODE DEFINITIONS

## Supported Event Modes

HelloRun supports two major event modes:

1. **Virtual Run**
2. **Onsite Event**

These modes should be used consistently across labels, filters, database fields, documentation, UI copy, and reports.

Avoid using the term **face-to-face** in the PRD and product copy. Use **onsite** instead.

---

## Virtual Run

A virtual run is an event where runners complete the required activity independently and submit proof through the platform.

### HelloRun Responsibilities for Virtual Runs

HelloRun should support the full virtual run workflow:

- Event discovery
- Event registration
- Payment-proof upload
- Organiser payment verification
- Run-proof upload
- OCR-assisted screenshot analysis
- Runner review of extracted activity details
- Suspicious-entry flagging
- Organiser/admin submission review
- Approval or rejection of submitted proof
- Leaderboard updates
- Certificate generation
- Event reports

### Virtual Run Monitoring Scope

Virtual run monitoring focuses on submitted activity proof, not live GPS tracking.

The platform should monitor virtual runs through:

- Uploaded activity screenshots
- OCR-extracted values
- Runner-submitted values
- Duplicate proof detection
- Activity consistency checks
- Review status tracking
- Organiser/admin decision logs

### OCR Data Targets

The OCR-assisted submission flow should attempt to extract or assist with:

- Distance
- Duration
- Pace where available
- Date
- Location
- Elevation
- Steps
- Source app
- Activity type
- Extracted runner name where available

### Supported Source Apps

Initial OCR support should prioritise screenshots from:

- Strava
- Garmin
- Nike Run Club
- Apple Health
- Google Fit

The system should not assume perfect OCR accuracy. Runner confirmation and organiser/admin review remain part of the workflow.

### Suspicious Entry Handling

Suspicious entries should be handled as review signals, not automatic rejection.

Examples of suspicious signals:

- Duplicate screenshot
- Extreme distance
- Extreme pace
- Extreme duration
- OCR distance mismatch
- OCR name mismatch
- Submitted date mismatch
- Location mismatch
- Activity type mismatch
- Implausible elevation density
- Implausible steps-per-kilometre
- Implausible cadence

Runner-facing copy should remain neutral.

Use wording such as:

- `Needs additional review`
- `Submitted for review`
- `Review pending`

Avoid exposing detailed suspicion labels to runners unless needed for a rejection reason.

Organiser/admin views may show detailed reasons to support decision-making.

---

## Onsite Event

An onsite event is a running event where runners attend a specific event location and complete the activity at the event venue.

### HelloRun Responsibilities for Onsite Events

HelloRun should support onsite events through:

- Event listing
- Event registration
- Payment-proof upload
- Organiser payment verification
- Participant list management
- Category and distance management
- Bib assignment support
- Race kit tracking
- Result import
- Manual result encoding
- Ranking publication
- Certificate generation
- Reports and analytics

### Onsite Timing Boundary

HelloRun should not initially replace race timing systems.

Organisers may continue using:

- RFID timing systems
- Chip timing systems
- Barcode or QR scanning
- Stopwatch-based recording
- Manual finish-line encoding
- Third-party timing providers
- Spreadsheet-based result encoding

HelloRun should support onsite events before and after timing:

1. **Before the event**
   - Registration
   - Payment verification
   - Participant management
   - Category setup
   - Bib support
   - Race kit support

2. **During the event**
   - Optional participant lookup
   - Optional race kit claiming support
   - Optional check-in support

3. **After the event**
   - Official result import
   - Manual result encoding
   - Ranking generation
   - Certificate release
   - Event report generation

### Onsite Result Handling

Official onsite results should come from the organiser or the organiser's timing provider.

HelloRun should support these result entry methods:

- CSV upload
- Excel upload
- Manual encoding
- Future API import from timing providers

---

# UPDATED DEVELOPMENT ROADMAP

## Current Development Priority

The current priority remains release hardening and production-readiness verification.

New feature expansion should remain gated until:

- Full regression suite passes
- Production environment variables are verified
- Security and CSRF enforcement are stable
- Manual smoke testing is completed
- Deployment checklist is signed off

---

## Updated Upcoming Phases

The roadmap should be updated to reflect a clearer development sequence.

```text
Phase 9:  [NOW] Release hardening, regression stability, and production-readiness verification
Phase 10: [NEXT] Production deployment launch gate
Phase 11: [DRAFT] Shop / Merchandise Feature
Phase 12: [DRAFT] OCR Smart Activity Submission
Phase 13: [DRAFT] Onsite Event Result Import
Phase 14: [DRAFT] Organiser Reports and Export Centre
Phase 15: [DRAFT] Payment Gateway Integration
Phase 16: [DRAFT] Race Kit, Bib, and Check-in Support
```

---

# PHASE 11: SHOP / MERCHANDISE FEATURE [COMMERCE] DRAFT

## Goal

Add a HelloRun shop for running-related and achievement-based merchandise that supports the platform brand, runners, organisers, and event-specific collections.

## Product Scope

The shop should support:

- HelloRun-branded merchandise
- Event-specific merchandise
- Achievement-based products
- Optional organiser-linked merchandise collections
- Future bundle offers connected to event registration

## Target Merchandise

Initial merchandise options may include:

- Event shirts
- Finisher shirts
- Medals
- Patches
- Caps
- Towels
- Socks
- Race belts
- Bib holders
- Digital medals
- Certificate add-ons

## User Stories

### Runner / Customer

- As a runner, I want to browse merchandise so I can buy event-related or achievement-based items.
- As a runner, I want to view product details so I can check images, price, sizes, and stock.
- As a runner, I want to order event merchandise so I can receive a physical reminder of my participation.
- As a runner, I want to track my order status so I know if my order is pending, paid, processing, shipped, or completed.

### Organiser

- As an organiser, I want to link merchandise to my event so participants can order event-specific items.
- As an organiser, I want to see merchandise interest or order summaries so I can coordinate with suppliers.
- As an organiser, I want merchandise reports so I can estimate sizes, stock, and fulfilment needs.

### Admin

- As an admin, I want to create and manage products so the shop catalog stays updated.
- As an admin, I want to manage product variants so size, colour, and stock are tracked properly.
- As an admin, I want to update order statuses so customers know the progress of their orders.

## Suggested Data Models

### Product

Fields:

- `name`
- `slug`
- `description`
- `category`
- `images`
- `basePrice`
- `status`
- `isFeatured`
- `eventId` optional
- `organizerId` optional
- `createdBy`
- `createdAt`
- `updatedAt`

### ProductVariant

Fields:

- `productId`
- `size`
- `color`
- `sku`
- `priceOverride`
- `stockQuantity`
- `status`

### Order

Fields:

- `orderNumber`
- `userId`
- `items`
- `subtotal`
- `serviceFee`
- `shippingFee`
- `totalAmount`
- `paymentStatus`
- `orderStatus`
- `paymentProof`
- `shippingDetails`
- `createdAt`
- `updatedAt`

### OrderItem

Fields:

- `productId`
- `variantId`
- `nameSnapshot`
- `variantSnapshot`
- `quantity`
- `unitPrice`
- `lineTotal`

## Suggested Routes

Public and runner routes:

- `GET /shop`
- `GET /shop/:slug`
- `POST /shop/cart/add`
- `GET /shop/cart`
- `POST /shop/checkout`
- `GET /runner/orders`
- `GET /runner/orders/:orderNumber`

Admin routes:

- `GET /admin/shop/products`
- `GET /admin/shop/products/new`
- `POST /admin/shop/products`
- `GET /admin/shop/products/:id/edit`
- `POST /admin/shop/products/:id`
- `POST /admin/shop/products/:id/archive`
- `GET /admin/shop/orders`
- `GET /admin/shop/orders/:id`
- `POST /admin/shop/orders/:id/status`

Organiser routes, optional:

- `GET /organizer/events/:id/merch`
- `POST /organizer/events/:id/merch/link`
- `GET /organizer/events/:id/merch/orders`

## Acceptance Criteria

- Public users can browse available products.
- Product detail pages show images, price, variants, and stock status.
- Logged-in runners can place merchandise orders.
- Admin can create, edit, archive, and manage products.
- Admin can update order status.
- Event-specific merchandise can be linked to an event.
- Order records preserve product and variant snapshots.
- Mobile layout is usable for browsing, checkout, and order tracking.
- Core shop workflows have route and service tests.

## Deferred Scope

- Full payment gateway integration
- Automated shipping integration
- Discount codes
- Refund management
- Supplier portal
- Inventory forecasting

---

# PHASE 12: OCR SMART ACTIVITY SUBMISSION [OCR] DRAFT / MVP HARDENING

## Goal

Improve virtual run submission by allowing runners to upload activity screenshots, analyse them on the frontend, review extracted data, and submit structured activity details for organiser/admin review.

## Product Scope

This phase should support:

- Screenshot upload
- Frontend OCR analysis
- Source app detection
- Auto-filled activity fields
- Runner confirmation
- Manual fallback entry
- OCR metadata persistence
- Suspicious-entry flagging
- Organiser/admin review display
- Neutral runner-facing review language

## Supported Activity Types

- Run
- Walk
- Trail run
- Hike
- Step-based activity

## OCR Parsing Targets

- Distance
- Duration
- Pace
- Date
- Location
- Elevation
- Steps
- Source app
- Activity type
- Extracted name where available

## Frontend OCR Direction

The OCR feature should use a dedicated frontend JavaScript file for image reading and parsing logic.

Suggested file:

- `src/public/js/ocr-proof-reader.js`

Supporting files:

- `src/public/js/run-proof-modal.js`
- `src/public/js/run-proof-integrity.js`

The OCR logic should be modular so parser rules can be improved without rewriting the run-proof modal.

## Run Classification Rules

Activity classification should consider:

- OCR text labels from the screenshot
- Source app layout hints
- Distance and duration pattern
- Steps presence
- Pace presence
- Elevation or route hints
- User-confirmed activity type

### Classification Examples

- If screenshot contains `Run`, `Running`, or Strava running layout signals, classify as `run`.
- If screenshot contains `Walk` or walking layout signals, classify as `walk`.
- If screenshot contains trail-related labels or high elevation context, suggest `trail run` or `hike`, but require runner confirmation.
- If screenshot has steps but no distance, classify as `steps`.
- If classification confidence is low, require manual selection.

## Integrity Rules

Use flag-only review signals for suspicious data.

Checks should include:

- Duplicate proof screenshot
- Extreme distance
- Extreme pace
- Extreme duration
- OCR-vs-submitted distance mismatch
- OCR-vs-submitted name mismatch
- OCR-vs-submitted date mismatch
- OCR-vs-submitted location mismatch
- OCR-vs-submitted elevation mismatch
- OCR-vs-submitted steps mismatch
- OCR-vs-submitted activity type mismatch
- Implausible elevation density
- Implausible steps per kilometre
- Implausible cadence

## Runner UX Requirements

- Modal opens immediately after runner action.
- Eligible event lookup happens inside the modal.
- Step 1 is labelled as screenshot analysis, not final submission.
- Runner may continue with manual entry if OCR fails.
- Runner may edit extracted fields.
- Mismatches show non-blocking warnings.
- Suspicious entries can still be saved.
- Suspicious entries move to review and do not auto-approve.
- Replacing or removing an image clears stale OCR values.
- Runner-facing status uses neutral language.

## Organiser/Admin Review Requirements

Organiser/admin review views should show:

- Original uploaded proof
- Submitted values
- OCR-extracted values
- Source app
- Activity type
- Mismatch flags
- Suspicious reasons
- Duplicate proof signal
- Review decision controls
- Review notes
- Rejection reason when applicable

## Acceptance Criteria

- OCR analysis works for priority source apps.
- Compact duration formats such as `27m 48s`, `31m38s`, and `1h47m` are parsed correctly.
- Pace tokens such as `5:33/km` are not mistaken as elapsed duration.
- Source app detection can identify common layouts.
- Runner can manually correct values.
- Suspicious values do not block submission.
- Suspicious submissions require review.
- Organiser/admin views show detailed review signals.
- Runner-facing pages use neutral wording.
- Stale values clear when image is replaced.
- Automated tests cover parser, modal, integrity, routes, and review display.

## Manual QA Checklist

- Upload Strava compact duration screenshots.
- Upload Garmin screenshots.
- Upload Apple Health screenshots.
- Upload Google Fit screenshots.
- Replace an image after OCR and confirm stale fields clear.
- Confirm mismatched values show non-blocking warnings.
- Confirm suspicious submissions save and move to review.
- Confirm runner pages use neutral wording.
- Confirm organiser/admin pages show detailed review reasons.

---

# PHASE 13: ONSITE EVENT RESULT IMPORT [EVENT OPS] DRAFT

## Goal

Allow organisers to upload, encode, review, and publish official results for onsite running events without replacing existing race timing systems.

## Product Boundary

HelloRun should not initially provide live race timing.

The platform should support official result handling after the onsite event.

## Supported Result Sources

- RFID timing export
- Chip timing export
- Barcode or QR scanning export
- Stopwatch/manual timing sheet
- Third-party timing provider export
- Spreadsheet prepared by organiser
- Manual encoding by authorised organiser/admin

## Result Import Methods

Initial support:

- CSV upload
- Excel upload
- Manual encoding form

Future support:

- API import from timing providers
- QR/checkpoint integration
- Timing partner integration

## Suggested Data Model: OnsiteResultImport

Fields:

- `eventId`
- `uploadedBy`
- `sourceType`
- `sourceFile`
- `status`
- `totalRows`
- `validRows`
- `invalidRows`
- `duplicateRows`
- `mappingConfig`
- `createdAt`
- `validatedAt`
- `publishedAt`

Status values:

- `uploaded`
- `mapped`
- `validated`
- `has_errors`
- `published`
- `archived`

## Suggested Data Model: OnsiteResult

Fields:

- `eventId`
- `registrationId`
- `runnerId`
- `bibNumber`
- `runnerNameSnapshot`
- `distance`
- `category`
- `genderCategory` optional
- `gunTime`
- `chipTime`
- `officialTime`
- `rankOverall`
- `rankCategory`
- `status`
- `remarks`
- `sourceImportId`
- `publishedAt`
- `createdAt`
- `updatedAt`

Status values:

- `finished`
- `dnf`
- `dns`
- `disqualified`
- `pending_review`

## Import Mapping Requirements

The import flow should support column mapping for:

- Bib number
- Runner name
- Category
- Distance
- Gun time
- Chip time
- Official time
- Rank
- Status
- Remarks

## Validation Rules

The system should validate:

- Missing bib number
- Unknown bib number
- Duplicate bib number
- Invalid time format
- Missing category
- Distance mismatch
- Duplicate result for same runner and event
- Result uploaded for unpaid or cancelled registration
- Invalid status value

## Ranking Rules

When results are published, the platform should support:

- Overall ranking
- Distance ranking
- Category ranking
- Optional gender/category ranking if the event collects this data
- Exclusion of DNS, DNF, and disqualified records from finisher rankings

## Certificate Rules

Certificates may be generated for:

- Finished onsite participants
- Published official results
- Approved categories only
- Records not marked as DNS, DNF, or disqualified

## Suggested Routes

Organiser routes:

- `GET /organizer/events/:id/results/import`
- `POST /organizer/events/:id/results/import`
- `GET /organizer/events/:id/results/import/:importId/map`
- `POST /organizer/events/:id/results/import/:importId/map`
- `GET /organizer/events/:id/results/import/:importId/validate`
- `POST /organizer/events/:id/results/import/:importId/publish`
- `GET /organizer/events/:id/results`
- `POST /organizer/events/:id/results/manual`

Admin routes:

- `GET /admin/events/:id/results`
- `POST /admin/events/:id/results/import/:importId/approve`
- `POST /admin/events/:id/results/import/:importId/archive`

Public routes:

- `GET /leaderboard?event=:eventId`
- `GET /events/:slug/results`

## Acceptance Criteria

- Organiser can upload CSV or Excel result files.
- Organiser can map uploaded columns to HelloRun fields.
- System validates missing, duplicate, unknown, and malformed rows.
- Organiser can review errors before publishing.
- Published onsite results can update leaderboards.
- Finished participants can receive certificates.
- DNS, DNF, and disqualified participants do not receive finisher rankings.
- Imported results preserve source file and audit metadata.
- Tests cover import validation, mapping, publishing, and leaderboard output.

## Deferred Scope

- Live timing
- RFID hardware integration
- Timing provider API integration
- Real-time checkpoint tracking
- Mobile race marshal app

---

# PHASE 14: ORGANISER REPORTS AND EXPORT CENTRE [REPORTS] DRAFT

## Goal

Create a centralized reports area where organisers can view, filter, export, and use event data for operations, post-event review, finance checking, and fulfilment planning.

## Report Centre Scope

The report centre should support:

- Event-level reports
- Registration reports
- Payment reports
- Participant reports
- Submission reports
- Result reports
- Merchandise reports
- Certificate reports
- Revenue summaries

## Suggested Route

Organiser route:

- `GET /organizer/events/:id/reports`

Admin route:

- `GET /admin/reports`
- `GET /admin/events/:id/reports`

## Report Types

### Registration Report

Fields:

- Registration ID
- Runner name
- Email
- Mobile number
- Event
- Distance
- Category
- Registration date
- Registration status
- Payment status
- Waiver acceptance
- Emergency contact

### Payment Report

Fields:

- Runner name
- Event
- Distance
- Amount expected
- Amount submitted
- Payment method
- Payment reference
- Payment status
- Submitted date
- Reviewed date
- Reviewed by
- Rejection reason

### Participant Category Report

Fields:

- Distance
- Category
- Total registered
- Paid
- Unpaid
- Approved
- Cancelled
- Completed
- DNS
- DNF

### Virtual Run Submission Report

Fields:

- Runner name
- Event
- Distance
- Submitted distance
- Duration
- Date
- Location
- Source app
- Activity type
- Submission status
- OCR match status
- Suspicious flags
- Reviewed by
- Reviewed date

### Onsite Result Report

Fields:

- Bib number
- Runner name
- Distance
- Category
- Gun time
- Chip time
- Official time
- Rank overall
- Rank category
- Result status
- Certificate status

### Merchandise Report

Fields:

- Product name
- Event
- Variant
- Size
- Quantity
- Order status
- Payment status
- Claiming or delivery status
- Customer name

### Revenue Summary

Fields:

- Event registration total
- Paid registration count
- Unpaid registration count
- Payment-proof pending count
- Merchandise total
- Platform fee estimate
- Refund or cancellation count where applicable

## Export Formats

Support:

- CSV
- XLSX

Future support:

- PDF summary
- Printable report view

## Filtering Requirements

Reports should support filters for:

- Date range
- Distance
- Category
- Payment status
- Submission status
- Result status
- Merchandise status
- Runner name or email
- Registration status

## Acceptance Criteria

- Organiser can open one report centre per event.
- Reports use consistent filters.
- Reports can export to CSV.
- Reports can export to XLSX.
- Payment reports match registration/payment-proof records.
- Submission reports include OCR metadata where available.
- Onsite result reports include imported or manually encoded official results.
- Report exports preserve user-friendly column names.
- Reports respect organiser ownership and admin permissions.
- Tests cover filters, export structure, and access control.

---

# PHASE 15: PAYMENT GATEWAY INTEGRATION [PAYMENTS] DRAFT

## Goal

Move from manual payment-proof review toward direct payment confirmation through a payment gateway.

## Current Payment Direction

Initial platform flow uses payment-proof upload and organiser verification.

Direct payment integration should be added only after registration and organiser workflows are stable.

## Possible Payment Providers

Potential providers:

- PayMongo
- Maya
- Stripe
- PayPal
- Bank transfer APIs where available

Provider selection should consider:

- Philippine payment support
- GCash or wallet support
- Card support
- Webhook reliability
- Fees
- Settlement process
- Refund support
- Developer documentation
- Compliance requirements

## Payment Features

The payment gateway phase should support:

- Checkout session creation
- Payment status callback/webhook
- Transaction records
- Automatic registration payment update
- Failed payment handling
- Expired payment handling
- Refund or cancellation tracking
- Admin transaction audit
- Event revenue summary

## Suggested Data Model: PaymentTransaction

Fields:

- `registrationId`
- `eventId`
- `userId`
- `provider`
- `providerTransactionId`
- `providerCheckoutId`
- `amount`
- `currency`
- `status`
- `paymentMethod`
- `metadata`
- `paidAt`
- `failedAt`
- `refundedAt`
- `createdAt`
- `updatedAt`

Status values:

- `pending`
- `paid`
- `failed`
- `expired`
- `cancelled`
- `refunded`

## Acceptance Criteria

- Runner can choose direct payment when available.
- Successful payment automatically updates registration payment status.
- Failed or expired payment does not approve registration.
- Webhook processing is idempotent.
- Manual payment-proof upload remains available when enabled by organiser.
- Admin can view transaction logs.
- Organiser can see direct payment status in registrants table.
- Tests cover checkout creation, webhook handling, idempotency, and payment status transitions.

## Deferred Scope

- Split payments to organisers
- Automated refunds
- Wallet balance system
- Installment payments
- International tax handling

---

# PHASE 16: RACE KIT, BIB, AND CHECK-IN SUPPORT [ONSITE OPS] DRAFT

## Goal

Support onsite event operations before race day and during claiming/check-in.

## Product Scope

This phase should support:

- Bib assignment
- Race kit claim tracking
- Shirt size tracking
- Add-on merchandise tracking
- Check-in lists
- Exportable claiming lists
- Optional QR-based claiming in future versions

## Bib Assignment

Bib numbers may be:

- Manually encoded
- Auto-generated by event
- Auto-generated by distance/category
- Imported from organiser spreadsheet

## Race Kit Tracking

Race kit statuses:

- `not_ready`
- `ready_for_claiming`
- `claimed`
- `unclaimed`
- `released_to_representative`
- `cancelled`

## Suggested Data Fields on Registration

- `bibNumber`
- `raceKitStatus`
- `raceKitClaimedAt`
- `raceKitClaimedBy`
- `shirtSize`
- `addOns`
- `checkInStatus`
- `checkedInAt`

## Suggested Routes

Organiser routes:

- `GET /organizer/events/:id/race-kits`
- `POST /organizer/events/:id/registrants/:registrationId/bib`
- `POST /organizer/events/:id/registrants/:registrationId/race-kit/claim`
- `POST /organizer/events/:id/registrants/:registrationId/check-in`
- `GET /organizer/events/:id/race-kits/export`

## Acceptance Criteria

- Organiser can assign or import bib numbers.
- Organiser can mark race kits as claimed.
- Organiser can filter claimed and unclaimed race kits.
- Organiser can export race kit lists.
- Organiser can check in participants.
- Race kit and check-in records are auditable.
- Mobile layout works for onsite claiming tables.
- Tests cover bib assignment, race kit status changes, exports, and access control.

## Deferred Scope

- QR scanner workflow
- Offline check-in mode
- Volunteer/marshal role
- Multiple claiming stations
- Hardware scanner integration

---

# CROSS-CUTTING DEVELOPMENT REQUIREMENTS

## Terminology Rules

Use these terms consistently:

- `runner`
- `organiser`
- `admin`
- `virtual run`
- `onsite event`
- `payment proof`
- `run proof`
- `submission`
- `result`
- `certificate`
- `leaderboard`
- `report`

Avoid:

- `face-to-face`
- `physical race` when `onsite event` is clearer
- `payment platform` when only payment-proof tracking exists
- `automatic verification` unless a specific automated rule exists
- `live tracking` unless GPS or timing integration exists

## Payment Wording Rule

Use:

- `payment-proof tracking`
- `payment-proof upload`
- `organiser payment verification`
- `manual payment review`
- `future payment gateway integration`

Avoid saying the platform already has:

- full payment gateway
- automated payment processing
- direct online payment confirmation

unless Phase 15 is implemented.

## Onsite Timing Rule

Use:

- `HelloRun supports onsite result import`
- `HelloRun does not initially replace race timing systems`
- `organisers may continue using existing timing systems`

Avoid saying:

- `HelloRun tracks onsite race results live`
- `HelloRun replaces RFID/chip timing`
- `HelloRun provides race timing hardware`

unless future timing integration is implemented.

## Review Wording Rule

Runner-facing labels should remain neutral.

Recommended labels:

- `Pending review`
- `Needs additional review`
- `Submitted`
- `Approved`
- `Rejected`

Organiser/admin labels may include technical detail:

- `Duplicate proof suspected`
- `OCR distance mismatch`
- `Name mismatch`
- `Implausible pace`
- `Activity type mismatch`

## Report Access Rules

- Organisers can access reports only for events they own.
- Admins can access all event reports.
- Runners can access only their own certificates, registrations, orders, and submissions.
- Exports should not expose sensitive data beyond the report’s operational need.

## Audit Requirements

Important actions should record:

- `createdBy`
- `updatedBy`
- `reviewedBy`
- `approvedBy`
- `rejectedBy`
- `uploadedBy`
- `publishedBy`
- timestamp
- status transition
- notes or reason when applicable

Audit coverage should apply to:

- Payment proof review
- Run proof review
- Result import
- Result publishing
- Certificate generation
- Merchandise order status changes
- Race kit claiming
- Report exports where needed

---

# UPDATED ACCEPTANCE GATES

## Release Gate Before New Feature Expansion

Before starting Phases 13 to 16:

- [ ] Full `npm test` passes.
- [ ] Manual smoke tests pass for auth, registration, payment proof, run proof, review queues, dashboards, leaderboard, and certificates.
- [ ] Production env variables are verified.
- [ ] `/healthz` and `/readyz` are tested.
- [ ] Error tracking and uptime monitoring are configured.
- [ ] Backup and restore runbook is ready.
- [ ] Security route matrix is updated.
- [ ] Production readiness checklist is signed off.

## Onsite Event Readiness Gate

Before publishing onsite event result import:

- [ ] Onsite event mode is supported in event creation/editing.
- [ ] Event categories and distances are stable.
- [ ] Registrant export is stable.
- [ ] Bib number support exists or import matching rules are final.
- [ ] Import validation handles malformed rows.
- [ ] Leaderboard output separates virtual submissions and onsite official results where needed.
- [ ] Certificate logic distinguishes virtual-approved submissions from onsite-published results.

## Organiser Reports Readiness Gate

Before launching report centre:

- [ ] Report filters are defined.
- [ ] CSV export format is finalized.
- [ ] XLSX export format is finalized.
- [ ] Permissions are tested.
- [ ] Sensitive fields are reviewed.
- [ ] Large event export performance is tested.

## Payment Gateway Readiness Gate

Before launching direct payment:

- [ ] Provider selected.
- [ ] Webhook security verified.
- [ ] Idempotency rules tested.
- [ ] Payment failure states tested.
- [ ] Manual payment-proof fallback retained.
- [ ] Transaction audit view ready.
- [ ] Terms, privacy, and refund wording reviewed.

---

# UPDATED DEVELOPMENT NOTES

## Recommended Immediate PRD Changes

1. Add this product positioning update after project overview.
2. Replace `face-to-face` with `onsite` across the documentation.
3. Keep virtual run monitoring tied to OCR-assisted proof submission and review.
4. Add Phase 13 for onsite result import.
5. Add Phase 14 for organiser reports and export centre.
6. Add Phase 15 for payment gateway integration.
7. Add Phase 16 for race kit, bib, and check-in support.
8. Keep shop and merchandise as Phase 11.
9. Keep OCR smart activity submission as Phase 12.
10. Keep production deployment as the release gate before larger feature expansion.

## Recommended File Split

Keep PRD.md as the master planning document.

Create or maintain dedicated detail files:

- `docs/shop_feature.md`
- `docs/ocr_smart_submission.md`
- `docs/onsite_result_import.md`
- `docs/organizer_reports.md`
- `docs/payment_gateway_integration.md`
- `docs/race_kit_bib_checkin.md`

PRD.md should contain the summary, status, phase roadmap, acceptance gates, and links to the detailed documents.

Dedicated files should contain field-level, route-level, UI-level, and testing details.
