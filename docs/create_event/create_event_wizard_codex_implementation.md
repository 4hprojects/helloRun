# HelloRun Create Event Wizard Implementation Guide

## Document Role

This file is the developer and Codex implementation guide for the HelloRun create-event wizard.

Use this file to guide code changes, UI updates, validation behaviour, responsive wizard behaviour, and implementation sequencing.

This file is not the master PRD.

Use the following files for broader planning and tracking:

```text
docs/PRD.md
docs/create_event/create_event.md
```

Use focused Codex task files under `docs/codex/` for isolated implementation work, such as race categories, preview architecture, admin review feedback, and event readiness validation.

## Implementation Status

### Implementation Log

#### 2026-05-23 14:55:48 +08:00

Completed the create-event backend and organizer UI alignment for the current MVP pricing scope.

Implemented:

- Merged the updated create-event documentation into the canonical `docs/create_event/` folder and updated stale references.
- Removed organizer-facing manual `targetDistanceKm` entry from the create/edit wizard. Accumulated challenge target distance is now derived from the selected race distance label.
- Replaced organizer-facing `gps` proof setup with `running_app_sync`, labeled as "Strava sync or other running app sync".
- Kept legacy `gps` compatibility in normalization so older records and submissions can still be read safely.
- Added backend support for `distance_based` and `customized_options` paid pricing modes.
- Added `customizedOptions` persistence with `amount` and `shortDescription`.
- Added validation for paid distance-based pricing and paid customized signup options.
- Updated organizer create/edit pricing UI to select either distance-based pricing or customized signup options.
- Added customized option rows to organizer create/edit forms.
- Updated payment setup copy and validation to require payment account name before submitting a paid event for review.
- Updated public proof-type labeling for `running_app_sync`.
- Added and updated focused tests for form normalization, organizer routes, and public event view behavior.

Verified:

```text
node --test tests/create-event-form.service.test.js
node --test tests/event-public-view.test.js
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
```

Next phase:

- Implement runner signup selection for paid `customized_options`.
- Resolve and snapshot the selected signup option amount during registration.
- Keep `free` and `distance_based` registration behavior working while adding the custom option path.

#### 2026-05-23 15:03:29 +08:00

Completed the runner-facing registration phase for customized paid signup options.

Implemented:

- Added a registration price resolver for `free`, `distance_based`, and `customized_options`.
- Added runner registration UI for selecting a paid customized signup option.
- Added registration form handling for `customizedOptionId`.
- Added `Registration.pricingSnapshot`, `paymentAmountDue`, and `paymentCurrency` so the selected signup option and amount are preserved at registration time.
- Persisted selected custom option description, option id, amount, currency, and pricing mode during registration.
- Updated runner payment instructions to show the registration snapshot amount and selected signup option.
- Updated organizer payment proof expected payment calculation to use the registration amount snapshot.
- Added focused tests for registration price resolution.
- Added route coverage proving a runner can select a customized signup option and the registration snapshot is persisted.

Verified:

```text
node --test tests/registration-price.service.test.js
node --test tests/registration-addons-read.test.js
node --test tests/create-event-form.service.test.js tests/event-public-view.test.js
```

Remaining follow-up:

- Decide whether manual receipt payment orders should include the base registration fee, add-ons, or both in the shop/order bridge. The current change snapshots the expected registration amount in MongoDB and organizer review, while the existing add-on order bridge remains unchanged.

#### 2026-05-23 16:35:29 +08:00

Completed the registration checkout order bridge phase.

Implemented:

- Registration checkout orders now include the base registration amount from `Registration.paymentAmountDue`.
- Optional add-ons are added on top of the base registration amount instead of replacing it.
- Distance-based paid registrations now create a registration-fee order item plus any add-on order items.
- Customized-option paid registrations now create a registration-fee order item even when no add-ons are selected.
- Manual payment proof sync now uses the full checkout order total, so `shop_payments.amount_paid` matches the expected registration checkout amount.
- Paid events with legacy/default `pricingMode: free` now resolve as `distance_based` when `feeMode` is `paid`, preserving existing paid event behavior.

Verified:

```text
node --test tests/registration-price.service.test.js
node --test tests/registration-addons-read.test.js
```

Remaining follow-up:

- Rename `createRegistrationAddOnOrderIfNeeded` to a more accurate checkout-oriented name in a later cleanup pass. The behavior now covers registration fee plus add-ons, but the old name was kept to minimize unrelated churn.

#### 2026-05-23 20:04:17 +08:00

Completed the registration pricing visibility and checkout helper cleanup phase.

Implemented:

- Renamed the internal checkout bridge implementation to `createRegistrationCheckoutOrderIfNeeded`.
- Kept the old test export alias temporarily for compatibility.
- Existing registration confirmation cards now show expected payment and selected signup option when available.
- Organizer registrants table now shows expected payment and selected signup option.
- Organizer payment receipt cells now use the registration snapshot expected payment instead of event-level `feeAmount`.
- Registrant CSV/XLSX exports now include `Expected Payment` and `Signup Option` columns.

Verified:

```text
node --test tests/registration-price.service.test.js tests/registration-addons-read.test.js
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
```

#### 2026-05-23 20:10:54 +08:00

Completed the public event pricing visibility phase.

Implemented:

- Public event detail data now exposes `pricingOptions` for paid distance-based and customized signup pricing.
- Public pricing summaries now use published signup options before falling back to legacy event-level fee fields.
- Customized paid events now show a "Signup options" pricing summary with the option price range.
- Distance-based paid events now show a "Registration pricing" summary with the distance price range.
- Legacy paid pricing modes are normalized before public display, so old `same_fee` records still render as signup options.
- Public event detail pages now render pricing option cards before optional add-on packages.
- Added focused public event view tests for customized signup pricing and distance-based pricing.

Verified:

```text
node --test tests/event-public-view.test.js
node --test tests/registration-price.service.test.js tests/registration-addons-read.test.js
node --test tests/create-event-form.service.test.js
```

#### 2026-05-24 12:17:06 +08:00

Completed the distance pricing period validation and resolution phase.

Implemented:

- Added event-level pricing periods for paid `distance_based_period` events.
- Added early bird, regular, and late pricing date fields to organizer create/edit pricing setup.
- Validated distance pricing periods for required dates, start-before-end ordering, registration-window boundaries, and non-overlap.
- Kept period-based distance pricing tied to selected race distances and required at least one positive amount that matches an active period per distance.
- Made runner registration price resolution period-aware, using the active pricing window to select early bird, regular, or late distance amounts.
- Snapshotted the selected pricing period code and label on registration records.
- Surfaced pricing period labels in runner registration confirmations, runner payment instructions, organizer registrants, exports, and checkout order metadata.
- Updated public event distance pricing cards so period-priced distances show the lowest available period amount as "From ...".
- Added focused tests for period validation, persistence, and active-period price resolution.

Verified:

```text
node --test tests/create-event-form.service.test.js
node --test tests/registration-price.service.test.js
node --test tests/event-public-view.test.js
node --test tests/registration-addons-read.test.js
```

#### 2026-05-24 14:20:00 +08:00

Completed the structured race categories and category-backed distance pricing phase.

Implemented:

- Added `Event.raceCategories` for structured category setup while preserving legacy `raceDistances`.
- Added `categoryId` to `Event.distancePricing` so pricing rows can be tied to race categories instead of distance labels only.
- Added category identity fields to `Registration.pricingSnapshot`: `raceCategoryId`, `raceCategoryName`, and `raceCategoryType`.
- Updated create and edit Step 5 to use repeatable race category cards with category name, type, distance label, distance km, slots, cut-off time, age group, and category reward note.
- Kept legacy `raceDistancePresets` and `raceDistanceCustom` compatibility by deriving them from structured category distance labels in the browser and form service.
- Updated Step 7 distance pricing rows to use structured category IDs where available, with distance-label fallback for older events.
- Updated runner registration price resolution to preserve race category identity for distance-based and period-based registrations.
- Updated runner registration display so category names can appear while keeping the submitted distance value compatible with existing validation and registrations.
- Added focused tests for race category normalization, persistence, category-backed pricing, and registration price snapshots.

Verified:

```text
node --test tests/create-event-form.service.test.js
node --test tests/registration-price.service.test.js
node --test tests/event-public-view.test.js
node --test tests/registration-addons-read.test.js
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
```

Remaining follow-up:

- Improve Step 12 readiness so it is generated from backend-aligned validation rules instead of separate frontend-only checks.
- Improve preview summaries so category, pricing, rewards, payment, waiver, and media are visible before submit.
- Surface structured race categories more fully on public event details and organizer summaries, beyond the current distance-compatible display.

#### 2026-05-24 15:05:00 +08:00

Completed the backend-aligned readiness and Step 12 summary-card phase.

Implemented:

- Added `getEventReadinessChecklist(formData)` to `src/services/event-form.service.js`.
- Readiness output now derives from the same `validateCreateEventForm()` publish validation used by create/edit submit-for-review.
- Added checklist-friendly readiness items for event title, description, event type, schedule, race category/distance, content, waiver, event-type-specific requirements, paid payment setup, pricing mode, distance/category pricing, pricing periods, and customized signup options.
- Added `getEventReviewSummary(formData)` to build Step 12 summary card data from normalized form data.
- Added summary cards for event basics, schedule, location/virtual setup, pricing, payment, rewards, content, waiver, and media.
- Updated create and edit pages to render backend-provided initial readiness and review summary data.
- Kept draft validation title-only and preserved existing submit-for-review validation.
- Added focused tests for readiness output and review summary content.

Verified:

```text
node --test tests/create-event-form.service.test.js
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
```

Remaining follow-up:

- The initial Step 12 checklist is backend-aligned, but client-side live updates still run in browser JavaScript. Keep frontend labels and conditions aligned when validation rules change, or move live readiness to an API/session-backed flow later.
- Preview still uses the existing route flow; draft-ID preview or server-side preview sessions remain future architecture work.
- Public event and organizer detail pages can still surface richer structured race category details.

#### 2026-05-24 15:25:00 +08:00

Completed the structured category display polish phase.

Implemented:

- Public event view data now exposes `raceCategories` summaries derived from structured `Event.raceCategories`, with legacy `raceDistances` fallback.
- Public event pages now show Race Categories cards with category name, type, distance, distance km, slots, cutoff, age group, and category reward notes when available.
- Public distance-based pricing cards now prefer structured category labels when a pricing row has `categoryId`, while preserving legacy distance-label pricing.
- Organizer event details now show a Race Categories summary card.
- Organizer preview summary now shows structured race categories for the legacy preview template as well.
- Organizer registrants and runner My Registrations now display the selected race category snapshot when registration pricing captured it.
- Added a focused public event view regression test for structured categories and category-backed pricing labels.

Verified:

```text
node --test tests/event-public-view.test.js
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
node --test tests/registration-addons-read.test.js
```

Remaining follow-up:

- Preview still uses the existing route/preview mechanism rather than saved draft ID preview or server-side preview sessions.
- Category display is now covered on public, organizer, preview, and registration summary surfaces; exports can be extended later if category-specific reporting becomes necessary.

#### 2026-05-24 15:45:00 +08:00

Completed the preview architecture hardening phase.

Implemented:

- Added a CSRF-protected `POST /organizer/preview-event` route that stores the current editor payload in the organizer session and returns a short preview URL.
- Added preview session expiry and cleanup: preview payloads expire after 30 minutes and each session keeps only the newest preview entries.
- Updated `GET /organizer/preview-event` to load payloads from `previewId` when provided, while preserving the old query-string preview fallback.
- Kept preview rendering on the real public event details page via `buildPublicEventView(previewEvent)`.
- Updated create and edit wizard Preview buttons to post form values to the server first, then open `/organizer/preview-event?previewId=...`.
- Kept local file upload limitations explicit: unsaved file selections still do not appear until saved/uploaded.
- Added route coverage proving server-side preview sessions create short URLs and render the preview page correctly.

Verified:

```text
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
node --test tests/event-public-view.test.js
```

Remaining follow-up:

- Preview is now session-backed for create/edit buttons, but unsaved local file selections still cannot render in the public preview until they are uploaded or the event is saved.
- Optional future work: persist preview snapshots as draft records instead of session entries if organizers need shareable preview links across devices or browser sessions.

#### 2026-05-24 16:05:00 +08:00

Completed the API-backed live readiness refresh phase.

Implemented:

- Added a CSRF-protected `POST /organizer/event-readiness` endpoint.
- The readiness endpoint normalizes the current editor payload with `getCreateEventFormData()` and returns backend-generated `getEventReadinessChecklist(formData)` plus `getEventReviewSummary(formData)`.
- Updated create and edit Step 12 JavaScript to render backend readiness and summary data after entering or editing the review step.
- Kept the existing browser-only readiness checklist as the fallback if the readiness endpoint fails.
- Added safe HTML escaping for client-rendered readiness labels and review summary values.
- Added route coverage proving the readiness endpoint returns backend checklist and summary data for an incomplete paid event.

Verified:

```text
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
node --test tests/create-event-form.service.test.js
```

Remaining follow-up:

- The fallback browser checklist is intentionally narrower than backend validation and should remain only a resilience fallback.
- Unsaved local file selections still cannot appear in public preview until they are uploaded or saved.

#### 2026-05-24 16:25:00 +08:00

Completed the post-MVP package pricing planning phase.

Implemented:

- Added `docs/codex/package_pricing_update.md` as the focused implementation plan for package-based pricing.
- Confirmed the next package-pricing slice should extend existing `Event.registrationPackages` instead of adding a parallel model.
- Defined the recommended first package pricing mode as `package_period`, using existing package-level `pricingPeriods`.
- Documented required model additions for stable package IDs and `Registration.pricingSnapshot` package fields.
- Documented runner registration, price resolver, form service validation, public display, checkout metadata, compatibility, test plan, and definition of done.

Verified:

```text
Documentation-only change; no test run required.
```

Remaining follow-up:

- Implement package-period pricing in small slices, starting with package IDs, validation/readiness, and resolver tests before runner UI.

#### 2026-05-24 16:55:00 +08:00

Completed package-period pricing slices 1 and 2.

Implemented:

- Added stable `packageId` support to `Event.registrationPackages`.
- Added package snapshot fields to `Registration.pricingSnapshot`: `packageId`, `packageName`, `packagePeriodCode`, `packagePeriodLabel`, and `packageIncludedItems`.
- Normalized and persisted package IDs through create/edit form service data.
- Added publish validation and readiness coverage for paid `package_period` events.
- Extended event review summary pricing output to show package-period price ranges.
- Extended `registration-price.service.js` with package option listing and `package_period` price resolution.
- Added runner registration package selection for package-period events.
- Persisted selected package identity, included items, active package period, and amount in registration snapshots.
- Updated registration checkout order item labels and metadata to include selected package fields.
- Updated public event pricing cards to show package-period pricing options.
- Added focused tests for form validation, resolver behavior, public package pricing display, runner package selection, snapshots, and checkout order totals.

Verified:

```text
node --test tests/create-event-form.service.test.js
node --test tests/registration-price.service.test.js
node --test tests/event-public-view.test.js
node --test tests/registration-addons-read.test.js
```

Remaining follow-up:

- Add organizer create/edit UI controls for package-period pricing if the current hidden/request-backed package fields need full visual management.

#### 2026-05-24 17:54:00 +08:00

Completed the first visible organizer UI slice for package-period pricing.

Implemented:

- Added `Registration packages` as a paid pricing type in create and edit event Step 7.
- Added visible package cards for package name, included reward items, other included items, notes, and early/regular/late period dates and amounts.
- Preserved stable `registrationPackageId` values through hidden package ID inputs when editing existing packages.
- Wired package-period mode into the existing `pricingMode` hidden input and pricing panel visibility logic.
- Added suggested package pricing date buttons that split the current registration window into early bird, regular, and late periods.
- Added create-event CSS for package cards using the existing compact form/grid style.
- Extended the organizer route view test to assert package-period pricing controls are present in both create and edit templates.

Verified:

```text
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
```

Remaining follow-up:

- Optional dynamic add/remove package card controls if organizers need more than the initially rendered package rows without saving first.

#### 2026-05-24 21:52:00 +08:00

Completed package-period package row management polish.

Implemented:

- Added Add Package controls to create and edit Step 7 package-period pricing.
- Added Remove controls to each package card.
- Added a reusable package-card `<template>` for client-side package creation.
- Added package-card reindexing so checkbox names, suggestion buttons, titles, and remove labels stay aligned after adding or removing cards.
- Kept existing package IDs in hidden `registrationPackageId` inputs so edit submissions preserve stable package identity.
- Kept suggested package pricing dates working for dynamically added and reindexed package cards.
- Extended the organizer route view test to assert add/remove controls, the package template, and reindexing script are present.

Verified:

```text
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
```

Remaining follow-up:

- Optional category-specific registrant export/reporting polish if organizers need category-level exports.

#### 2026-05-24 21:57:00 +08:00

Completed category-specific registrant export polish.

Implemented:

- Added `Race Category ID`, `Race Category Name`, and `Race Category Type` columns to registrant CSV/XLSX export.
- Export rows now populate those columns from `Registration.pricingSnapshot` category fields.
- Kept the legacy `Race Distance` column and existing signup option, registration package, pricing period, payment, and add-on behavior intact.
- Added route/export coverage with a category-backed registration snapshot fixture.

Verified:

```text
node --test tests/registration-addons-read.test.js
```

Remaining follow-up:

- Optional saved-draft preview links if previews need to persist beyond the organizer's current browser session.

#### 2026-05-24 22:00:00 +08:00

Completed saved draft preview links.

Implemented:

- `/organizer/preview-event?eventId=...&previewSource=edit` now loads the saved event when no session preview payload is present.
- Saved event previews render through the shared public `pages/event-details` view in preview mode.
- Saved previews disable runner registration CTA and label the state as `Saved Preview`.
- Preview back links return to the saved event edit page.
- Organizer event workspace now exposes a `Preview Saved Event` link.
- Access remains owner-scoped: non-owner organizers receive a 404 for another organizer's saved draft preview.
- Session-backed unsaved form previews still work for current editor values.

Verified:

```text
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
```

Remaining follow-up:

- No create-event wizard implementation items are currently pending in this note.

#### 2026-05-24 22:37:00 +08:00

Completed stabilization pass across organizer, shop, service, smoke, auth, admin, and runner test groups.

Implemented:

- Fixed a legacy payment-proof review regression where paid registrations with default `paymentAmountDue: 0` displayed `PHP 0.00` instead of falling back to the event fee.
- Payment-proof expected payment now prefers a positive saved registration amount, then a positive pricing snapshot amount, then the event-level paid fee.

Verified:

```text
npm run test:organizer
npm run test:shop
npm run test:services
npm run test:smoke
npm run test:auth
npm run test:admin
npm run test:runner
```

Remaining follow-up:

- No create-event wizard implementation items are currently pending in this note.

#### 2026-05-24 17:49:00 +08:00

Completed package-period display/export polish and route regression cleanup.

Implemented:

- Organizer registrants now show the selected registration package alongside the pricing period.
- Runner My Registrations now shows the selected registration package when the registration snapshot includes one.
- Registrant CSV/XLSX export now includes a `Registration Package` column.
- Package-period route coverage now verifies runner package selection snapshots, checkout order metadata, organizer registrant display, runner registration display, and export output.
- Updated the paid publish route fixture to use the generated registration window for package pricing periods instead of hard-coded May 2026 dates.

Verified:

```text
node src\scripts\run-test-group.js tests\organizer-waiver-routes.test.js
node --test tests/create-event-form.service.test.js
node --test tests/registration-price.service.test.js
node --test tests/event-public-view.test.js
node --test tests/registration-addons-read.test.js
```

Remaining follow-up:

- Add organizer create/edit UI controls for package-period pricing if the current hidden/request-backed package fields need full visual management.

### What Has Been Built

The 12-step guided wizard structure is live at:

```text
/organizer/create-event
/organizer/events/:id/edit
```

Navigation surfaces built:

- Desktop: collapsible sidebar step list with 12 steps
- Tablet: horizontally scrollable `.wizard-pills-bar` with pill buttons
- Mobile: sticky `.wizard-mini-strip` with step counter, title, progress bar, and chevron toggle
- Mobile overlay: full-page `.wizard-nav-overlay` with backdrop, close button, and all 12 step links
- All surfaces sync through `setActiveWizardStep()`

Edit-event wizard alignment built:

- Organizer edit pages use the same 12-step builder navigation and responsive wizard surfaces as create-event.
- Edit mode keeps existing event values.
- Edit mode keeps existing media previews.
- Edit mode supports immediate media removal behaviour.
- Draft edit pages expose `Save Changes`, `Preview`, and `Submit for Review`.
- Published and pending-review edit pages expose `Save Changes` and `Preview`, but hide the draft submit action.
- Draft submit from edit validates publish-readiness, saves changes, and transitions the event to `pending_review`.

Steps implemented:

- Step 1 to Step 12 are present in the form.
- Step 5 Race Categories uses repeatable structured category cards and preserves legacy race distance fallback.
- Step 7 Pricing supports category-backed distance pricing, distance-based period pricing, and customized signup options.
- Step 8 Payment Setup separates QR upload, account name, and payment instructions.
- Step 8 QR upload uses the drag-and-drop `upload-area` pattern.
- Step 9 Event Details uses Quill.
- Step 11 Waiver uses Quill with organizer/event placeholders, reset to default, and live preview.
- Step 12 Review renders backend-aligned initial readiness and summary cards, and live refreshes them through `POST /organizer/event-readiness` while editing.
- Step 12 Preview button creates a session-backed preview and opens `/organizer/preview-event?previewId=...`.
- Step 12 uses adaptive action buttons.

UI patterns in use:

- `upload-area` drag/drop with `upload-placeholder` and `upload-preview` for logo, banner, poster, and QR
- `subsection-toolkit` accordion for Delivery and Fulfilment fields
- `.btn-adaptive` with icon and label on desktop
- `.btn-adaptive` icon-square pattern with hover tooltip on smaller screens
- `.action-btn-group` inside `.actions`
- `.waiver-label-row` with label left and toolbar button right
- `field-help-icon` question mark tooltips on optional or conditional fields

Current defaults set in `getBlankCreateEventDefaults()`:

```text
requiresDeliveryAddress: '1'
requiresPhilippineDeliveryAddress: '1'
internationalRunnersAllowed: '0'
```

### What Is Still Pending

- No create-event wizard implementation items are currently pending in this note.

### Current Implementation Truth

Use this section when deciding what to implement next.

Already implemented:

- Create and edit both use the 12-step guided wizard.
- Free, distance-based, customized-option, and distance-based-period pricing are supported.
- Customized signup options are selectable during runner registration.
- Registration price resolution stores `Registration.pricingSnapshot`, `paymentAmountDue`, and `paymentCurrency`.
- Checkout orders include the base registration fee plus optional add-ons.
- Package-period registration pricing is supported in backend validation, runner registration, price snapshots, public pricing display, checkout order metadata, organizer registrants, runner My Registrations, and registrant export.
- Create/edit Step 7 exposes package-period pricing controls for package name, inclusions, notes, and early/regular/late period prices.
- Create/edit Step 7 supports dynamic add/remove package cards and reindexes package fields before submit.
- Distance-based pricing periods validate required dates, ordering, registration-window boundaries, and overlap.
- Structured race categories are persisted and used by Step 7 pricing rows where available.
- Registration pricing snapshots preserve selected race category identity.
- Step 12 renders backend-aligned initial readiness and review summary cards, then refreshes them through an API-backed readiness endpoint.
- Public event pages expose pricing summaries for distance-based and customized-option pricing.
- Public event pages, organizer details, preview summaries, organizer registrants, and runner My Registrations now surface structured race category details where available.
- Registrant CSV/XLSX exports include structured race category snapshot columns where available.
- Create/edit preview buttons now use session-backed preview payloads instead of long GET-query URLs.
- Organizer event workspace exposes durable saved-event preview links for saved drafts and other organizer-owned events.
- The browser-only Step 12 checklist remains as a network-failure fallback, not the primary source of truth.
- Package pricing has a focused implementation plan in `docs/codex/package_pricing_update.md`.

Still not implemented:

- Unsaved local file selections still cannot appear in public preview until they are uploaded or saved.

## Main Implementation Goal

Build and stabilise a guided create-event wizard for organizers.

The wizard should help organizers create virtual, onsite, and hybrid running events without being overwhelmed by fields that do not apply to their event type.

The wizard should:

- Show one logical step at a time.
- Use event type to control which fields appear.
- Separate pricing setup from payment setup.
- Support free events.
- Support paid events.
- Support paid events priced by distance.
- Support paid events priced by custom registration options.
- Allow incomplete draft saving.
- Require full validation only when submitting for admin review.
- Preserve existing backend behaviour where possible.
- Preserve existing model fields and route behaviour unless this document explicitly says otherwise.
- Improve helper text, section ordering, and preview before submission.

## MVP Pricing Scope

The MVP pricing scope should support the following modes:

```text
free
distance_based
customized_options
```

### Free

Use when the event has no registration fee.

Rules:

- Hide payment setup.
- Do not require payment QR.
- Do not require payment account name.
- Do not require payment proof upload during runner registration.

### Distance Based

Use when the price follows the runner's selected race distance or category.

This is important for onsite races, hybrid races, and virtual events with multiple distance options.

Example:

```text
3K - PHP 350
5K - PHP 500
10K - PHP 750
21K - PHP 1,200
```

### Customized Options

Use when the organizer wants runners to choose from custom registration packages or entries that are not only distance labels.

Example:

```text
5K - Medal + Shirt + Race Kit - PHP 850
10K - Medal + Shirt + Race Kit - PHP 1,050
Virtual 100K - Digital Badge Only - PHP 300
```

Each customized option should gather:

```text
amount
shortDescription
```

The customized option is what the runner selects during signup.

### Pricing Periods

Distance-based pricing periods have been implemented for `distance_based_period`.

Future pricing-period work may extend the same pattern to customized options or package pricing.

Example:

```text
5K
Early Bird: PHP 450
Regular: PHP 500
Late Registration: PHP 600
```

## Post-MVP Pricing Scope

Postpone these modes until the MVP wizard is stable:

```text
package_based
package_period
```

Package-based pricing should be implemented after race categories, per-distance pricing, and preview stability are already working.

## Current Source Files to Review First

## Current App Alignment Notes

These notes were verified against the current implementation before this guide was merged.

Aligned with current files:

- `src/views/organizer/create-event.ejs` has the 12-step wizard, responsive navigation, Quill Event Details, Quill Waiver, upload areas, preview action, draft action, and submit-for-review action.
- `src/views/organizer/edit-event.ejs` follows the same builder direction and preserves existing event/media values.
- `src/services/event-form.service.js` normalises `pricingMode`, `distancePricing`, reward fields, delivery fields, package fields, and special benefit fields.
- `src/models/Event.js` persists the broad organizer setup surface, including fields that are currently ahead of the runner registration flow.
- `src/models/Registration.js` tracks payment review state, proof metadata, pricing snapshots, and expected payment amounts.

Implementation gaps to keep explicit:

- Structured race categories still need dedicated card UI and persistence.
- Per-distance pricing rows are currently derived from race distance selections, not dedicated race category cards.
- Category-backed pricing should preserve current distance label fallback behavior.
- Step 12 readiness checks should be aligned with backend validation as rules continue to grow.
- Package pricing exists in model/service normalization, but should remain post-MVP until runner package selection, price resolution, and payment amount snapshots are implemented.
- Registration payment proof, price snapshots, and checkout order totals are implemented for the current registration pricing scope.

Before coding, inspect these files:

```text
src/routes/organizer.routes.js
src/views/organizer/create-event.ejs
src/services/event-form.service.js
src/public/css/create-event.css
src/models/Event.js
src/models/Submission.js
src/models/AccumulatedActivitySubmission.js
docs/PRD.md
docs/create_event/create_event.md
```

If any filename differs in the repository, find the nearest matching file and continue.

## Current Behaviour to Preserve

Preserve these behaviours:

- Approved organizers can access `/organizer/create-event`.
- Pending organizers can create provisional events only after acknowledgement, if this is already implemented.
- Organizers can save events as drafts.
- Drafts require only a valid title.
- Organizers can submit complete events for admin review.
- Paid drafts can save without payment QR.
- Paid events submitted for review require payment QR.
- Paid events submitted for review should require payment account name.
- Free events should not require payment QR.
- Free events should not require payment account name.
- Admin approval controls public publishing.
- Event details continue to use `eventDetailsMarkdown` internally.
- Waiver content continues to be sanitized server-side.
- Accumulated virtual runs continue using activity-level submissions and rollups.
- Existing organizer route guards should remain unchanged.
- Existing admin review flow should remain unchanged unless a focused admin review task says otherwise.
- Existing event detail rendering should remain unchanged unless a focused public event task says otherwise.

## Core UX Principle

The organizer should feel this natural sequence:

```text
What kind of event am I creating?
When will it happen?
Where or how will runners participate?
What can runners join?
What rewards or inclusions will I offer?
Is it free or paid?
How much should runners pay?
How will runners pay?
What rules should runners read?
What will the event look like?
What waiver will runners accept?
Is everything ready for review?
```

This flow matches how organizers usually think.

They do not start with payment.

They start with the event idea, then the runners, then the inclusions, then the price.

## Recommended Wizard Flow

Use this order:

```text
Step 1: Event Type
Step 2: Core Event Details
Step 3: Schedule
Step 4: Event Format Setup
Step 5: Race Categories or Challenge Distances
Step 6: Rewards and Inclusions
Step 7: Pricing
Step 8: Payment Setup
Step 9: Event Details and Rules
Step 10: Branding and Media
Step 11: Waiver
Step 12: Preview and Submit
```

If a full wizard route implementation is too large for one iteration, use collapsible accordion panels with the same order and a sticky progress indicator.

## Step 1: Event Type

### Purpose

Let the organizer choose the event format first.

This decision controls which fields appear in the rest of the form.

### Options

```text
virtual
onsite
hybrid
```

### Suggested UI Copy

```text
Choose the type of event you want to create.
```

```text
Virtual Event
Best for accumulated runs, screenshot-based submissions, and online participation.
```

```text
Onsite Event
Best for physical races with venue, race categories, and registration fees.
```

```text
Hybrid Event
Best for events that allow both onsite and virtual participation.
```

### Validation

For draft:

```text
Event type may be incomplete.
```

For submit-for-review:

```text
Event type is required.
```

### Conditional Logic

If event type is `virtual`:

- Show virtual rules.
- Hide location by default.
- Race categories are optional unless multiple distances are offered.
- Accumulated distance options may appear.

If event type is `onsite`:

- Show location.
- Show race categories.
- Hide virtual submission rules.
- Allow distance-based or customized paid pricing.

If event type is `hybrid`:

- Show both location and virtual rules.
- Show race categories.
- Allow both onsite and virtual participation details.

## Step 2: Core Event Details

### Purpose

Collect the basic public-facing event information.

### Fields

```text
title
organiserName
description
raceDistancePresets
raceDistanceCustom
```

### Suggested Labels

```text
Event Title
Organizer Name
Short Description
Race Distance
Custom Distance
```

### Suggested Helper Text

```text
Short Description
Used on event cards and listings. Keep this under two sentences. Full rules belong in Event Details.
```

### Validation

For draft:

```text
Title is required.
```

For submit-for-review:

```text
Title is required.
Description is required.
Event type is required.
At least one race distance, custom distance, challenge distance, or race category is required.
```

### Recommended Behaviour

- Organizer name may default from the account owner.
- Short description should be used for event cards.
- Full rules should not be placed here.
- Full rules should be entered in Step 9.

## Step 3: Schedule

### Purpose

Define registration dates and event dates.

### Fields

```text
registrationOpenAt
registrationCloseAt
eventStartAt
eventEndAt
```

### Suggested Labels

```text
Registration Opens
Registration Closes
Event Starts
Event Ends
```

### Suggested Helper Text

```text
Registration dates control when runners can join. Event dates control when the activity or race happens.
```

### Validation

For submit-for-review:

```text
registrationOpenAt <= registrationCloseAt <= eventStartAt <= eventEndAt
```

### Recommended Smart Defaults

For virtual and hybrid events:

```text
virtualStartAt = eventStartAt
virtualEndAt = eventEndAt
finalSubmissionDeadlineAt = 14 days after eventEndAt
```

Only auto-fill these fields while the fields are blank or still auto-filled by the system.

Do not overwrite organizer-edited values.

## Step 4: Event Format Setup

### Purpose

Ask for details specific to the selected event type.

This step should change based on event type.

## Step 4A: Virtual Event Setup

Show this section for:

```text
virtual
hybrid
```

### Virtual Fields

```text
virtualStartAt
virtualEndAt
proofTypesAllowed
virtualCompletionMode
acceptedRunTypes
finalSubmissionDeadlineAt
recognitionMode
leaderboardMode
leaderboardRecognitionEnabled
```

### Completion Mode Options

```text
single_activity
accumulated_distance
```

### Suggested UI Copy

```text
Single Activity
Best for events where runners submit one final run proof.
```

```text
Accumulated Distance
Best for 50K, 100K, 500K, or 2026K challenges where runners submit multiple activities.
```

### Conditional Logic

If `single_activity`:

- Hide accumulated progress rules.
- Show final proof submission requirements.

If `accumulated_distance`:

- Derive the completion goal from the selected race distance or challenge category.
- Show accepted activity types.
- Show final submission deadline.
- Show recognition mode.
- Show leaderboard mode.

### Accepted Activity Types

Suggested options:

```text
run
walk
trail run
hike
bike
other
```

### Proof Types

Suggested options:

```text
running_app_sync
photo
manual
```

User-facing labels:

```text
Strava sync or other running app sync
Photo proof
Manual proof
```

The old GPS proof label should no longer be shown to organizers or runners. If legacy events store the old value, migrate or map it to `running_app_sync` when implementation begins.

## Step 4B: Onsite Event Setup

Show this section for:

```text
onsite
hybrid
```

### Location Fields

```text
venueName
venueAddress
city
province
country
geoLat
geoLng
```

### Suggested Labels

```text
Venue Name
Venue Address
City
Province
Country
Latitude
Longitude
```

### Validation

For onsite and hybrid submit-for-review:

```text
Venue name is required.
City is required.
Province is required.
Country is required.
Latitude and longitude are optional.
If latitude is provided, longitude should also be provided.
If longitude is provided, latitude should also be provided.
```

## Step 5: Race Categories or Challenge Distances

### Purpose

Define what runners can join.

This step supports onsite races, hybrid events, virtual events with multiple distances, and accumulated challenge options.

### Show This Step For

```text
onsite events
hybrid events
virtual events with multiple distances
virtual accumulated challenges
```

### Suggested UI

Use repeatable cards.

```text
[ + Add Race Category ]

5K Category
Distance: 5 km
Category Type: Run
Slots: 300
Cut-off Time: 01:30:00
Notes: Includes race bib, shirt, and finisher medal.

[ Duplicate Category ]
[ Remove Category ]
```

### Fields Per Category

```text
distanceName
distanceKm
categoryType
baseRegistrationFee
customizedOptions
slotsAvailable
cutoffTime
ageGroup
includedRewards
notes
```

### Category Type Options

```text
run
walk
trail
bike
virtual
other
```

### Example Categories

```text
5K Open
10K Open
21K Open
Kids Run
50K Accumulated
100K Accumulated
2026K Accumulated Challenge
```

### Future Model Field

```js
raceCategories: [
  {
    distanceName: String,
    distanceKm: Number,
    categoryType: "run" | "walk" | "trail" | "bike" | "virtual" | "other",
    baseRegistrationFee: Number,
    customizedOptions: [
      {
        shortDescription: String,
        amount: Number
      }
    ],
    slotsAvailable: Number,
    cutoffTime: String,
    ageGroup: String,
    pricingPeriods: [
      {
        label: String,
        code: "early_bird" | "regular" | "late" | "custom",
        startAt: Date,
        endAt: Date,
        amount: Number
      }
    ],
    includedRewards: {
      medal: Boolean,
      shirt: Boolean,
      patch: Boolean,
      towel: Boolean,
      finisherKit: Boolean,
      otherItemNames: [String]
    },
    notes: String
  }
]
```

### Validation

For onsite and hybrid submit-for-review:

```text
At least one race category is required.
```

For paid categories:

```text
Amount is required.
Amount must be zero or higher.
Paid events must have at least one amount greater than zero.
```

For pricing periods:

```text
Pricing periods must not overlap.
Pricing periods should fall within the registration window.
```

## Step 6: Rewards and Inclusions

### Purpose

Let the organizer define what runners receive before setting the price.

This step must come before Pricing.

### Reason

Medals, shirts, towels, finisher kits, and delivery fees affect pricing decisions.

If pricing comes first, the organizer may need to go back and change amounts after adding rewards.

### Main Sections

```text
Digital Recognition
Physical Rewards or Inclusions per Category
Delivery and Claiming
Rewards Claiming Notes
Post-MVP Registration Packages
```

### Digital Recognition Fields

```text
digitalBadgeEnabled
digitalCertificateEnabled
leaderboardRecognitionEnabled
```

### Physical Rewards or Inclusions

Each race category may include:

```text
Race bib
Shirt
Medal
Patch
Towel
Finisher kit
Digital certificate
Digital badge
Other item
```

### Global Reward Fields

```text
physicalRewardsEnabled
physicalRewardMedalEnabled
physicalRewardMedalAmount
physicalRewardShirtEnabled
physicalRewardShirtAmount
physicalRewardPatchEnabled
physicalRewardPatchAmount
physicalRewardTowelEnabled
physicalRewardTowelAmount
physicalRewardFinisherKitEnabled
physicalRewardFinisherKitAmount
physicalRewardOtherItems
physicalRewardsDescription
physicalRewardsClaimingNotes
```

### Delivery and Claiming Fields

```text
deliveryFeeEnabled
deliveryFeeAmount
deliveryFeeDescription
requiresDeliveryAddress
requiresPhilippineDeliveryAddress
internationalRunnersAllowed
claimingMethod
```

### Claiming Method Options

```text
delivery
pickup
both
```

### Package-Based Pricing Note

Package-based pricing is post-MVP.

Rewards can be shown as inclusions per distance or category for MVP.

Do not implement full package pricing until `free`, `distance_based`, and `customized_options` are stable.

## Step 7: Pricing

### Purpose

Define what runners will pay.

Pricing setup answers this question:

```text
How much should runners pay?
```

Payment setup answers this question:

```text
How will runners pay?
```

Keep these as separate steps.

## Pricing Decision Flow

Ask the organizer this first:

```text
Is this event free or paid?
```

Options:

```text
Free Event
Paid Event
```

## Free Event Flow

If the organizer chooses `Free Event`, show only:

```text
Free event confirmation
Optional note about free registration
Optional note about rewards or claiming
```

Hide:

```text
Payment QR
Payment account name
Payment proof instructions
Early bird pricing
Regular pricing
Late registration pricing
Fee tables
```

Suggested UI copy:

```text
This event is free to join. Runners will not be asked to upload payment proof.
```

Validation:

```text
Payment QR is not required.
Payment account name is not required.
Payment instructions are not required.
All category prices should be zero or blank.
```

## Paid Event Flow

If the organizer chooses `Paid Event`, show pricing mode options.

Supported MVP pricing modes:

```text
distance_based
customized_options
```

### 1. Distance Based

Internal mode:

```text
distance_based
```

Use when the runner selects a distance or race category and the amount comes from that selected distance/category.

Example:

```text
3K - PHP 350
5K - PHP 500
10K - PHP 750
21K - PHP 1,200
```

Fields:

```text
distanceName
distanceKm
amount
feeCurrency
```

Validation:

```text
Each paid distance/category must have an amount.
Amount must be greater than zero.
```

Runner signup behaviour:

```text
Runner selects one distance/category.
The selected distance/category determines the amount due.
```

### 2. Customized Options

Internal mode:

```text
customized_options
```

Use when the organizer defines selectable paid options with an amount and a short description.

Example:

```text
5K - Medal + Shirt + Race Kit - PHP 850
10K - Medal + Shirt + Race Kit - PHP 1,050
Virtual 100K - Digital Badge Only - PHP 300
```

Fields per custom option:

```text
amount
shortDescription
```

Validation:

```text
Each custom option must have an amount.
Each custom option must have a short description.
Amount must be greater than zero.
```

Runner signup behaviour:

```text
Runner selects one custom option.
The selected custom option determines the amount due.
```

### 3. Pricing Periods

Pricing periods are optional and should be added after the base paid event flow is stable.

If enabled, pricing periods may apply to distance-based or customized options.

Example:

```text
5K
Early Bird: PHP 450
Regular: PHP 500
Late Registration: PHP 600

5K - Medal + Shirt + Race Kit
Early Bird: PHP 800
Regular: PHP 850
Late Registration: PHP 950
```

Fields per priced option:

```text
earlyBirdAmount
earlyBirdStartAt
earlyBirdEndAt
regularAmount
regularStartAt
regularEndAt
lateAmount
lateStartAt
lateEndAt
```

Validation:

```text
Pricing periods must not overlap.
Pricing periods must stay within the registration window.
Amounts must be greater than zero.
Each category must have at least one active pricing period.
```

## Pricing Periods Toggle

Pricing periods are optional.

The organizer should see a checkbox:

```text
[ ] Add early bird and late registration pricing
```

If unchecked:

```text
Show only one amount per distance or custom option.
```

If checked:

```text
Show Early Bird, Regular, and Late Registration prices per distance or custom option.
```

## Suggested Pricing Tables

If distance-based pricing is selected:

```text
| Distance | Amount |
|---|---:|
| 3K | PHP 350 |
| 5K | PHP 500 |
| 10K | PHP 750 |
```

If customized-option pricing is selected:

```text
| Signup Option | Amount |
|---|---:|
| 5K - Medal + Shirt + Race Kit | PHP 850 |
| 10K - Medal + Shirt + Race Kit | PHP 1,050 |
| Virtual 100K - Digital Badge Only | PHP 300 |
```

If pricing periods are enabled:

```text
| Category | Early Bird | Regular | Late Registration |
|---|---:|---:|---:|
| 3K | PHP 300 | PHP 350 | PHP 400 |
| 5K | PHP 450 | PHP 500 | PHP 600 |
| 10K | PHP 650 | PHP 750 | PHP 850 |
```

## Step 8: Payment Setup

### Purpose

Define how runners will pay.

Show this step only if the event is paid.

### Fields

```text
paymentQrImageFile
paymentQrImageUrl
paymentQrImageKey
paymentAccountName
paymentInstructions
```

### Suggested Labels

```text
Payment QR Image
Payment Account Name
Payment Instructions
```

### Suggested Helper Text

```text
Runners will see these payment details before uploading their payment proof.
```

### Payment Validation

For free events:

```text
Payment setup is hidden.
Payment QR is not required.
Payment account name is not required.
```

For paid drafts:

```text
Payment QR may be missing.
Payment account name may be missing.
Draft can still be saved.
```

For paid submit-for-review:

```text
Payment QR is required.
Payment account name is required.
Payment instructions are recommended.
```

### Suggested Payment Instructions Placeholder

```text
Please scan the QR code and upload your payment proof after registration. Use your full name as the payment reference if supported by your payment app.
```

## Step 9: Event Details and Rules

### Purpose

Allow organizers to write the full public event information.

### Field

```text
eventDetailsMarkdown
```

### User-Facing Label

```text
Event Details
```

### Suggested Helper Text

```text
Use this section for full event rules, FAQs, pricing explanation, submission rules, and runner guidance. This content appears on the public event details page.
```

Implementation notes:

- The field is still named `eventDetailsMarkdown` internally.
- The organizer editor stores Quill rich HTML.
- The public `/events/:slug` renderer sanitizes rich HTML directly when the saved value looks like HTML.
- Markdown fallback should remain available for older content.
- Structured fields should drive public summary sections first.
- Event Details should provide the long-form explanation.

### Suggested Content Blocks

```text
Event overview
Who can join
Registration details
Race categories
Pricing details
Challenge rules
Submission rules
Completion rules
Leaderboard rules
Rewards and merchandise
Delivery or claiming instructions
Payment instructions
Frequently asked questions
Contact or support details
```

### Suggested Starter Template

```md
## Event Overview

Briefly describe the event.

## Who Can Join

Explain who may register.

## Registration Details

Explain registration dates and requirements.

## Race Categories or Challenge Distances

List available distances or categories.

## Pricing Details

Explain fees and pricing periods.

## Challenge or Race Rules

Explain participation rules.

## Submission Rules

Explain how runners submit proof or results.

## Completion Rules

Explain how finishers are verified.

## Leaderboard Rules

Explain how rankings are calculated.

## Rewards and Merchandise

Explain digital and physical rewards.

## Delivery or Claiming Instructions

Explain how runners receive items.

## Payment Instructions

Explain how payment should be completed.

## Frequently Asked Questions

Add common questions and answers.

## Contact Details

Add organizer contact information.
```

## Step 10: Branding and Media

### Purpose

Collect event visuals.

### Fields

```text
logoFile
logoUrl
bannerImageFile
bannerImageUrl
posterImageFile
posterImageUrl
galleryImageFiles
galleryImageUrlsText
```

### Recommended Image Usage

```text
Logo: Event cards and badges
Banner: Event details page
Poster: Promotional sharing
Gallery: Extra visuals
```

### Validation

```text
Upload or URL should be accepted.
If upload and URL are both provided, define one clear priority.
Uploaded file should take priority over URL.
```

### Suggested Helper Text

```text
Use the banner for the event page and the poster for promotional sharing.
```

## Step 11: Waiver

### Purpose

Collect the participant agreement shown before registration.

### Field

```text
waiverTemplate
```

### Current Features to Preserve

```text
Quill rich-text editor
Default waiver reset
Organizer and event title placeholders
Live preview
Server-side sanitization
Minimum text validation
```

### Suggested Helper Text

```text
This agreement is shown to participants before they join the event. You may use the default waiver or customize it for your event.
```

### Draft Behaviour

```text
Drafts may use incomplete waiver content.
```

### Submit-for-Review Behaviour

```text
Waiver must meet minimum content requirements.
```

## Step 12: Preview and Submit

### Purpose

Show a final review before the organizer submits the event for admin review.

### Preview Sections

```text
Event card preview
Event details preview
Schedule summary
Location or virtual setup summary
Race category summary
Rewards and inclusions summary
Pricing summary
Payment summary
Waiver preview
```

### Actions

```text
Save Draft
Preview Event
Submit for Review
```

### Suggested Submit Message

```text
Your event will be reviewed by an admin before it becomes public.
```

### Setup Completeness Checklist

Before submit-for-review, show:

```text
Required before review:

[ ] Event title
[ ] Short description
[ ] Event type
[ ] Schedule
[ ] Race distance, category, or challenge distance
[ ] Location for onsite or hybrid events
[ ] Virtual rules for virtual or hybrid events
[ ] Pricing setup
[ ] Payment QR for paid events
[ ] Payment account name for paid events
[ ] Event details
[ ] Valid waiver
```

## Field Visibility Matrix

| Section | Virtual | Onsite | Hybrid |
|---|---:|---:|---:|
| Core Details | Show | Show | Show |
| Schedule | Show | Show | Show |
| Location | Hide | Show | Show |
| Virtual Rules | Show | Hide | Show |
| Race Categories | Optional | Show | Show |
| Challenge Distance | Show | Optional | Show |
| Rewards and Inclusions | Show | Show | Show |
| Pricing | Show | Show | Show |
| Payment | Show if paid | Show if paid | Show if paid |
| Event Details | Show | Show | Show |
| Media | Show | Show | Show |
| Waiver | Show | Show | Show |
| Preview | Show | Show | Show |

## Pricing Mode Visibility Matrix

| Pricing Mode | Free Event | Paid Event | Race Categories Needed | Pricing Periods Needed | MVP Status |
|---|---:|---:|---:|---:|---:|
| `free` | Show | Hide | No | No | Supported |
| `distance_based` | Hide | Show | Yes | No | Supported |
| `customized_options` | Hide | Show | Optional | No | Supported |
| `distance_based_period` | Hide | Show | Yes | Yes | Later |
| `customized_options_period` | Hide | Show | Optional | Yes | Later |
| `package_based` | Hide | Post-MVP | No | Optional | Postponed |
| `package_period` | Hide | Post-MVP | No | Yes | Postponed |

## Draft Validation

Drafts should remain easy to save.

Minimum requirement:

```text
Valid title
```

Drafts may have incomplete:

```text
Schedule
Event type
Pricing
Payment setup
Media
Waiver
Event details
Race categories
```

This allows organizers to build events gradually.

## Submit-for-Review Validation

Submit-for-review should require a complete public-ready event.

Required for all events:

```text
Title
Description
Event type
Schedule
At least one race category, race distance, or challenge distance
Event details
Valid waiver
```

Required for onsite or hybrid events:

```text
Location is required.
```

Required for virtual or hybrid events:

```text
Virtual rules are required.
```

Required for paid events:

```text
Valid pricing setup is required.
Payment QR is required.
Payment account name is required.
```

Required for distance-based paid events:

```text
Each selectable distance/category must have a valid amount.
Amount must be greater than zero.
```

Required for customized-option paid events:

```text
Each custom signup option must have an amount.
Each custom signup option must have a short description.
Amount must be greater than zero.
```

Not required for free events:

```text
Payment QR is not required.
Payment account name is not required.
```

For pricing periods:

```text
Early bird, regular, and late dates must not overlap.
Pricing period dates must be within the registration period.
```

## Conditional Logic Summary

### Event Type Logic

If virtual:

- Hide location.
- Show virtual rules.
- Show challenge distance fields.
- Race categories are optional.

If onsite:

- Show location.
- Hide virtual rules.
- Show race categories.
- Allow distance-based or customized paid pricing.

If hybrid:

- Show location.
- Show virtual rules.
- Show race categories.

### Fee Logic

If free:

- Hide payment setup.
- Set fee amount to zero or blank.
- Hide pricing periods.
- Hide payment proof instructions.

If paid:

- Show pricing mode selection.
- Show payment setup.
- Require QR and payment account name only on submit-for-review.

### Pricing Mode Logic

If `distance_based`:

- Show a price for each selectable distance/category.
- Runner signup must require one distance/category selection.

If `customized_options`:

- Show repeatable custom signup options.
- Each option needs an amount and short description.
- Runner signup must require one custom option selection.

If pricing periods are enabled later:

- Show early bird, regular, and late amounts per distance/category or custom option.
- Validate dates and amounts.

## Recommended Validation Service

Validation should be centralised as much as possible.

Recommended file:

```text
src/services/event-readiness.service.js
```

Suggested functions:

```js
validateDraftEvent(formData)
validateEventForReview(formData)
getEventReadinessChecklist(formData)
validatePricingPeriods(raceCategories, registrationWindow)
validateEventTypeRequirements(formData)
```

Why this matters:

- Step 12 readiness checklist should match backend validation.
- Create and edit mode should use the same rules.
- Admin review should receive consistent event data.
- Runner registration should not depend on incomplete pricing data.

## Preview Architecture Direction

Current preview limitations:

- Preview is GET-query based.
- Preview cannot reliably preview local uploaded files.
- Long rich-text content can make URL-based preview fragile.

Recommended future direction:

```text
Save as draft first, then preview using draft ID.
```

Alternative:

```text
Use a temporary server-side preview session.
```

Preview should eventually show:

- Event card preview
- Event details page preview
- Schedule summary
- Location summary
- Virtual setup summary
- Race category summary
- Rewards summary
- Pricing summary
- Payment summary
- Waiver preview
- Media preview

## Implementation Sequence

### Phase 1: Stabilise Existing Wizard

Goal:

Make the current 12-step wizard reliable before adding deeper pricing complexity.

Tasks:

- Confirm all 12 steps render in create mode.
- Confirm all 12 steps render in edit mode.
- Confirm desktop, tablet, and mobile navigation surfaces sync.
- Confirm draft save still requires only title.
- Confirm submit-for-review remains stricter than draft save.
- Confirm free events do not require payment setup.
- Confirm paid submit-for-review requires QR.
- Add or strengthen paid submit-for-review account name validation.

### Phase 2: Complete Event Type Conditional Visibility

Goal:

Make virtual, onsite, and hybrid field visibility consistent.

Tasks:

- Hide location for virtual events.
- Show location for onsite and hybrid events.
- Show virtual rules for virtual and hybrid events.
- Hide virtual rules for onsite-only events.
- Confirm hidden fields do not trigger submit-for-review errors unless required by event type.

### Phase 3: Implement Race Categories

Goal:

Replace simple distance presets as the main source of category-driven event setup.

Tasks:

- Add repeatable race category card UI.
- Add category duplication.
- Add category removal.
- Add category type field.
- Add distance name and distance km fields.
- Add optional slots field.
- Add optional cut-off time field.
- Add optional age group field.
- Add category-specific reward fields.
- Preserve existing `raceDistancePresets` and `raceDistanceCustom` as fallback or migration support.

### Phase 4: Stabilise Category-Backed Paid Pricing

Goal:

Move the existing paid pricing implementation from distance-label proxies toward structured race categories.

Tasks:

- Keep the existing `distance_based`, `distance_based_period`, and `customized_options` registration behavior working.
- Make distance pricing rows use structured race category IDs or labels when available.
- Preserve `raceDistancePresets` and `raceDistanceCustom` as fallback sources.
- Keep customized signup options selectable during runner registration.
- Keep registration price snapshots and checkout order totals unchanged.
- Add regression tests that prove old distance-label events and new category-backed events both resolve prices.

### Phase 5: Extract Readiness Validation

Goal:

Keep Step 12 readiness checks aligned with backend submit-for-review validation.

Tasks:

- Extract or wrap the existing backend validation into a readiness-focused service if the codebase benefits from the split.
- Keep `src/services/event-form.service.js` as the source of truth unless extraction is clearly lower risk.
- Return checklist-friendly readiness items for Step 12.
- Ensure create and edit use the same readiness rules.
- Preserve draft validation as title-only.

### Phase 6: Improve Preview

Goal:

Make event preview more accurate and less fragile.

Tasks:

- Add full summary cards to Step 12.
- Move away from GET-query preview when practical.
- Prefer draft ID preview.
- Show pricing summary.
- Show payment summary.
- Show rewards summary.
- Show waiver preview.
- Show media preview where possible.

### Phase 7: Post-MVP Package Pricing

Goal:

Add package-based pricing only after the main pricing flow is stable.

Tasks:

- Add package configuration.
- Add package pricing periods.
- Add package-specific included items.
- Add runner package selection.
- Add payment amount snapshot logic.
- Add delivery fee integration into resolved payment amount.

## Testing Checklist

### Draft Tests

- Draft saves with valid title only.
- Draft can omit schedule.
- Draft can omit event type.
- Draft can omit pricing.
- Draft can omit payment setup.
- Draft can omit media.
- Draft can omit waiver.

### Submit-for-Review Tests

- Missing title fails.
- Missing description fails.
- Missing event type fails.
- Missing schedule fails.
- Missing race distance, race category, or challenge distance fails.
- Missing event details fails.
- Invalid waiver fails.
- Onsite event without location fails.
- Hybrid event without location fails.
- Virtual event without virtual rules fails.
- Hybrid event without virtual rules fails.
- Paid event without payment QR fails.
- Paid event without payment account name fails.
- Free event without payment QR passes.
- Free event without payment account name passes.

### Pricing Tests

- Free event hides payment setup.
- Distance-based paid event requires category prices.
- Distance-based paid event rejects missing category amount.
- Customized-option paid event requires at least one option.
- Customized-option paid event requires amount and short description per option.
- Customized-option paid event rejects zero or negative amount.
- Pricing-period event requires valid periods when pricing periods are enabled.
- Overlapping pricing periods fail.
- Pricing periods outside registration dates fail.
- Valid pricing periods pass.

### Create/Edit Regression Tests

- Create event loads with blank defaults.
- Edit draft loads saved values.
- Edit published event hides Submit for Review.
- Edit pending-review event hides Submit for Review.
- Draft edit can Save Changes.
- Draft edit can Preview.
- Draft edit can Submit for Review.
- Existing media previews remain visible.
- Removed media does not reappear after save.

### UI Tests

- Desktop sidebar step navigation works.
- Tablet pill navigation works.
- Mobile mini strip works.
- Mobile overlay opens and closes correctly.
- Active step syncs across all wizard surfaces.
- Upload areas show placeholder and preview states.
- Adaptive buttons show labels and tooltips correctly.
- Step 12 checklist updates after field changes.

## Definition of Done

The create-event wizard is considered complete for MVP when:

- All 12 steps are present in create and edit modes.
- Draft save requires only a valid title.
- Submit for review validates all publish-ready fields.
- Event type controls conditional visibility.
- Free events hide payment setup.
- Paid events require payment QR and account name before review.
- Distance-based pricing works for paid events.
- Customized-option pricing works for paid events.
- Runner signup can select the configured paid option.
- Pricing periods validate against registration dates.
- Pricing periods do not overlap.
- Registration price snapshots preserve the amount shown to the runner.
- Checkout orders include registration fee plus optional add-ons.
- Existing admin review behaviour remains intact.
- Existing public event detail rendering remains intact.
- Create and edit modes share the same validation direction.

The create-event wizard is considered complete for the next category-focused enhancement when:

- Race categories use repeatable cards.
- Category-backed distance pricing works without breaking legacy distance-label pricing.
- Category-specific reward fields are available where needed.
- Runner registration can preserve category identity in the pricing snapshot.
- Existing admin review behaviour remains intact.
- Existing public event detail rendering remains intact.
- Create and edit modes share the same validation direction.

Current category-focused enhancement status:

- Race category cards, category persistence, category-backed pricing, category identity snapshots, public category cards, organizer category summaries, preview category summaries, and registration category snapshot displays are implemented.
- The remaining category-related work is optional reporting/export polish if organizers need category-specific registrant exports.

## Next Implementation Priority

The next major implementation priority is:

```text
No Pending Create-Event Wizard Slice
```

The create-event wizard items tracked in this note are implemented. Future work should start from a new focused task file if product requirements expand beyond this scope.

Implement next:

- Define the next product requirement before changing the create-event wizard further.
- Keep existing route, service, and registration pricing regression tests green when adding adjacent organizer features.

Do not re-implement race category persistence, customized signup option selection, registration price snapshots, or checkout order registration-fee handling as part of this priority. Those paths already exist and should be preserved with regression tests.

## Recommended Focused Codex Task Files

Future implementation tasks should be placed under:

```text
docs/codex/
```

Recommended files:

```text
docs/codex/race_categories_and_paid_pricing_options.md
docs/codex/preview_architecture_update.md
docs/codex/event_readiness_validation_service.md
docs/codex/admin_review_feedback_update.md
docs/codex/package_pricing_update.md
```

Each focused task file should include:

- goal
- current problem
- files to inspect
- behaviour to preserve
- UI requirements
- model or service changes
- validation rules
- testing checklist
- definition of done

## Preserved Historical Implementation References

The following old-guide sections describe work that has since been implemented for the current pricing scope.

Treat them as historical context only. Do not use these sections as fresh implementation prompts unless a new task explicitly asks for a refactor or extension.

## Completed: Runner-Facing Price Resolver

### Goal

Calculate the correct amount during runner registration.

Current implementation:

- `src/services/registration-price.service.js` resolves free, distance-based, distance-based-period, and customized-option pricing.
- Runner registration calls the resolver before creating a registration.
- Resolver output is stored on the registration pricing snapshot.

### Price Resolver Inputs

```text
Selected event
Selected race category
Selected package
Current date
Pricing mode
Delivery fee
```

### Price Resolver Output

```text
Base amount
Active pricing period
Delivery fee
Final amount due
Currency
```

### Example

```text
Runner selects 10K on May 10.
System checks the active pricing period.
System returns Regular Fee: PHP 900.
Runner uploads proof for PHP 900.
```

### Expected Result

Runners see the correct fee automatically.

---


## Completed: Registration Price Snapshot

### Goal

Store the amount shown to the runner at the time of registration.

Current implementation:

- `Registration.pricingSnapshot` stores the selected option, distance, amount, currency, and pricing period metadata.
- `Registration.paymentAmountDue` and `Registration.paymentCurrency` preserve the amount expected from the runner.
- Organizer payment review and checkout order metadata use the stored registration amount.

### Fields to Store

```text
selectedOptionId
optionDescription
raceDistance
amount
currency
pricingMode
pricingPeriodCode
pricingPeriodLabel
priceResolvedAt
```

### Reason

Prices can change later.

The runner's payment should be checked against the amount shown during registration, not against a future price.

---


## Suggested Frontend State Structure

This can guide JavaScript implementation.

```js
const createEventState = {
  eventType: null,
  feeType: null,
  pricingMode: null,
  completionMode: null,
  hasPhysicalRewards: false,
  hasPricingPeriods: false,
  hasDeliveryFee: false,
  currentStep: 1
};
```

### Suggested UI Watchers

```js
function updateEventTypeVisibility(eventType) {
  // virtual, onsite, hybrid
}

function updateFeeVisibility(feeType) {
  // free, paid
}

function updatePricingModeVisibility(pricingMode) {
  // free, distance_based, customized_options
  // (distance/customized pricing periods and package pricing postponed)
}

function updateCompletionModeVisibility(completionMode) {
  // single_activity, accumulated_distance
}

function updateStepCompleteness() {
  // checklist status
}
```

---


## Suggested Server-Side Validation Structure

Keep server-side validation as the source of truth.

```js
function validateEventDraft(payload) {
  const errors = [];

  if (!payload.title || !payload.title.trim()) {
    errors.push("Event title is required to save a draft.");
  }

  return errors;
}

function validateEventForReview(payload) {
  const errors = [];

  validateCoreDetails(payload, errors);
  validateSchedule(payload, errors);
  validateEventTypeRequirements(payload, errors);
  validatePricing(payload, errors);
  validatePayment(payload, errors);
  validateEventDetails(payload, errors);
  validateWaiver(payload, errors);

  return errors;
}
```

### Suggested Validation Groups

```js
function validateCoreDetails(payload, errors) {}
function validateSchedule(payload, errors) {}
function validateEventTypeRequirements(payload, errors) {}
function validateRaceCategories(payload, errors) {}
function validatePackages(payload, errors) {}
function validatePricing(payload, errors) {}
function validatePayment(payload, errors) {}
function validateEventDetails(payload, errors) {}
function validateWaiver(payload, errors) {}
```

---


## Codex Task Prompt for Phase 1 and Phase 2

Use this prompt inside VS Code Codex after placing this file in the repository:

```text
Read docs/create_event/create_event_wizard_codex_implementation.md and inspect the current create-event implementation.

Implement Phase 1 and Phase 2 only.

Goals:
1. Reorder the create-event page into the recommended guided wizard flow.
2. Add a clear progress indicator or step sidebar.
3. Preserve the existing form field names, backend route behavior, model fields, and current validation.
4. Add conditional show/hide behavior for virtual, onsite, hybrid, free, and paid event sections.
5. Separate Pricing Setup and Payment Setup into different UI sections.
6. Keep Save Draft and Submit for Review behavior unchanged.
7. Do not add new database fields yet unless the current code already supports them.
8. Add or update tests only for the UI structure and conditional behavior if the project already has matching test patterns.

After implementation, summarize:
- Files changed
- Behavior changed
- Tests added or updated
- Any follow-up work needed
```

---


## Codex Task Prompt for Phase 3

```text
Read docs/create_event/create_event_wizard_codex_implementation.md.

Implement Phase 3 only.

Goals:
1. Improve validation messaging for Save Draft and Submit for Review.
2. Keep draft validation title-only.
3. Add a setup completeness checklist before submission.
4. Show missing requirements clearly.
5. Preserve existing backend validation as the source of truth.
6. Do not add new database fields.

After implementation, summarize:
- Files changed
- Validation behavior changed
- Tests added or updated
- Any follow-up work needed
```

---


## Codex Task Prompt for Phase 4

```text
Read docs/create_event/create_event_wizard_codex_implementation.md.

Implement Phase 4 only.

Goals:
1. Improve the event preview experience.
2. Add event card preview.
3. Add schedule summary.
4. Add event type summary.
5. Add location or virtual setup summary.
6. Add race category summary if available.
7. Add rewards and package summary if available.
8. Add pricing summary.
9. Add payment summary for paid events.
10. Add waiver preview.
11. Keep the existing preview mechanism if replacing it is too large for this phase.

After implementation, summarize:
- Files changed
- Preview behavior changed
- Tests added or updated
- Any follow-up work needed
```

---


## Codex Task Prompt for Phase 5 and Beyond

```text
Read docs/create_event/create_event_wizard_codex_implementation.md.

Plan the implementation for structured race categories, registration packages, pricing periods, runner-facing price resolution, and registration price snapshots.

Do not code yet.

Create a technical implementation plan that includes:
1. Proposed model changes.
2. Route changes.
3. Service changes.
4. Frontend changes.
5. Validation changes.
6. Migration or backward compatibility concerns.
7. Test plan.
8. Risks and recommended order of implementation.
```

---

## Final Guidance for Codex

When using this file for implementation:

- Do not rewrite unrelated routes.
- Do not break existing draft save behaviour.
- Do not make free events require payment setup.
- Do not implement package-based pricing before MVP pricing is stable.
- Do not remove existing event details or waiver sanitisation.
- Prefer additive changes when preserving current production behaviour.
- Keep create and edit mode aligned.
- Keep Step 12 readiness checklist aligned with backend validation.

