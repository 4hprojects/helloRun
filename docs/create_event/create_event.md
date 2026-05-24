# Create Event Tracking

## Purpose and Ownership

This document is the dedicated product tracking and roadmap source for the organizer create-event workflow at `/organizer/create-event`.

`docs/PRD.md` remains the master roadmap for the full HelloRun platform.

This file focuses on the create-event feature scope, current implementation status, known gaps, product decisions, field inventory, roadmap items, and testing direction.

For step-by-step developer implementation details, use:

```text
docs/create_event/create_event_wizard_codex_implementation.md
```

For focused future implementation tasks, use files under:

```text
docs/codex/
```

## Relationship to Other Documents

| Document | Role |
|---|---|
| `docs/PRD.md` | Master roadmap for the full HelloRun platform |
| `docs/create_event/create_event.md` | Product tracker and roadmap for the create-event workflow |
| `docs/create_event/create_event_wizard_codex_implementation.md` | Developer and Codex implementation guide for the guided event wizard |
| `docs/public_event_page_template.md` | Public event page display and content reference |
| `docs/template/2026k_accumulated_run_challenge_template.md` | Reference template for accumulated-distance challenges |
| `docs/example/100k-progress-run-event-reference.md` | Example event setup reference for accumulated virtual runs |

## Guided Create Event Wizard Reference

The improved organizer create-event workflow is documented in:

```text
docs/create_event/create_event_wizard_codex_implementation.md
```

That guide covers the recommended 12-step wizard flow for creating virtual, onsite, and hybrid running events. It includes guidance for free events, paid events, distance-based pricing, customized signup options, rewards and merchandise, payment setup, waiver handling, event preview, and submit-for-review validation.

Use this document for product tracking and direction.

Use the implementation guide when updating code for `/organizer/create-event` and `/organizer/events/:id/edit`.

## Create-Event Feature Status

| Area | Status | Notes |
|---|---|---|
| 12-step wizard navigation | Done | Create and edit modes share the guided wizard direction |
| Draft save | Done | Drafts should require only a valid title |
| Submit for review | Done/Partial | Publish-readiness validation exists but should be centralised further |
| Event type conditional UI | Partial | Virtual, onsite, and hybrid visibility rules need full consistency |
| Race categories | Pending | Current flow still depends heavily on distance preset fields |
| Distance-based pricing | Partial | Needs structured category-based pricing table |
| Customized signup option pricing | MVP | Needed for selectable paid entries such as `5K - Medal + Shirt + Race Kit` |
| Pricing periods | Pending | Needs non-overlap and registration-window validation |
| Package-based pricing | Post-MVP | Keep documented as future scope only |
| Payment setup | Done/Partial | Paid review requires QR; payment account name rule should be strengthened |
| Event details editor | Done | Quill rich content with sanitised rendering |
| Waiver editor | Done | Quill editor, reset, preview, and server-side sanitisation |
| Preview | Partial | Current GET-query preview should move toward draft/session-based preview |
| Admin review feedback | Pending | Rejected events should show admin notes and allow resubmission |

## Product Direction

The create-event workflow should allow approved organizers to configure a running event from draft to admin review.

Pending organizers may also start event setup after accepting a limited-access acknowledgement from `/organizer/dashboard`. This does not approve the organizer account. It only allows provisional event creation while account requirements are still under review.

The form should support both simple and complex event setups.

Simple examples:

- Free virtual fun run
- Paid customized-option virtual fun run
- Paid 5K virtual run
- Single-distance onsite fun run
- Small community run with one fixed registration fee

Complex examples:

- 100K accumulated virtual challenge
- 2026K annual accumulated challenge
- Onsite event with 5K, 10K, and 21K distances
- Onsite event with early bird, regular, and late registration pricing
- Event with medal, shirt, patch, finisher kit, towel, or custom merchandise
- Event with package options such as Medal Only, Medal + Shirt, or Medal + Shirt + Towel
- Event with delivery fee or pickup/claiming setup
- Event with time-limited benefits such as free engraving
- Hybrid event with onsite categories and virtual participation options

The page should let organizers save incomplete drafts, but submitting for admin review should require publish-ready validation.

## Recommended Create-Event Page Structure

Final recommended page order:

1. Page Header
2. Core Details
3. Schedule
4. Location
5. Race Categories and Distance Pricing
6. Virtual Rules
7. Rewards, Merchandise, and Registration Packages
8. Fees and Payment
9. Event Details
10. Branding and Media
11. Waiver
12. Preview
13. Sticky Action Bar

Notes:

- `Core Details` should be open by default and receive initial focus.
- `Location` should appear only for onsite or hybrid events.
- `Race Categories and Distance Pricing` should appear for onsite and hybrid events. It may also appear for virtual events when the organizer wants multiple distances or categories.
- `Virtual Rules` should appear only for virtual or hybrid events.
- `Rewards, Merchandise, and Registration Packages` should appear before `Fees and Payment` because medals, shirts, towels, other merchandise, delivery fees, and package options may affect the suggested event fee.
- `Fees and Payment` should summarise the price rules, active package rules, delivery fees, and payment acceptance setup.

## Current Implementation Surfaces
## Current App Alignment Notes

These notes were verified against the current web app implementation while merging the old and updated create-event documents.

Aligned with the app:

- `src/views/organizer/create-event.ejs` and `src/views/organizer/edit-event.ejs` both use the 12-step builder direction.
- `src/services/event-form.service.js` centralises most create/edit normalisation, validation, and persistence mapping.
- `src/models/Event.js` already persists `pricingMode`, `distancePricing`, physical reward fields, delivery/claiming fields, `registrationPackages`, and `specialRewardBenefits`.
- `/organizer/preview-event` exists, but it is still GET-query based and should be treated as partial preview architecture.
- `src/models/Registration.js` supports payment status and payment proof review, but does not yet persist resolved price snapshot fields such as `amountDue`, selected category, selected package, or selected pricing period.

Current mismatches to resolve before implementation claims are marked complete:

- Paid pricing should be refined into `distance_based` and `customized_options` before implementation. Customized options need an amount plus short description and must be selectable during runner signup.
- The Event model and form service know about `registrationPackages` and `specialRewardBenefits`, but the current create/edit UI does not expose the full package/benefit editor path in the same way the old roadmap described it. Keep package pricing as post-MVP until the runner flow supports it.
- `feeAmount`, `finalEventFee`, and `suggestedEventFee` exist in the service/model layer, but runner registration currently does not resolve or snapshot the amount a runner should pay.
- Race categories remain represented mostly by `raceDistances` plus generated distance pricing rows. A dedicated `raceCategories` model/UI is still pending.

Primary files:

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
docs/public_event_page_template.md
```

Related example and template files:

```text
docs/example/100k-progress-run-event-reference.md
docs/template/2026k_accumulated_run_challenge_template.md
```

## Current `/organizer/create-event` Capabilities

The current create-event flow supports approved organizers creating drafts or submitting events for admin review. Pending organizers can access the same create-event page only after signing the pending-account acknowledgement on the dashboard. Admin approval publishes the event.

Implemented capabilities:

- Dedicated page at `/organizer/create-event`
- `canCreateEvents()` route guard
- Verified approved organizer access
- Pending organizer access after acknowledgement
- Pending organizer acknowledgement modal from `/organizer/dashboard`
- Electronic signature matching the account full name
- Timestamp, signature name, IP address, and user agent capture for the acknowledgement
- `/terms#pending-organizer-terms` explanation for limited pending-account event creation
- Core event details
- Mostly blank guided create defaults
- Fee mode setup
- Payment QR image upload for paid events
- Digital badge toggle
- Digital finisher certificate toggle
- Leaderboard recognition toggle
- Physical rewards fields
- Registration package setup
- Delivery fee and claiming method fields
- Waiver editor
- Schedule fields
- Conditional location fields
- Conditional virtual/hybrid fields
- Branding and media fields
- Event details rendering for public, organizer, admin, and preview contexts
- Preview route at `/organizer/preview-event`
- Save Draft and Submit for Review actions
- Success redirect to `/organizer/events`
- Unique slug generation
- Unique event reference code generation

## Current Field Inventory

### Current First-Class Create-Event Fields

| Area | Current Fields |
|---|---|
| Core details | `title`, `organiserName`, `description`, `eventDetailsMarkdown`, `eventType`, `raceDistancePresets`, `raceDistanceCustom` |
| Fees and payment | `feeMode`, `feeAmount`, `feeCurrency`, `pricingMode`, `suggestedEventFee`, `finalEventFee`, `paymentQrImageFile`, `paymentQrImageUrl`, `paymentQrImageKey`, `paymentAccountName`, `paymentInstructions` |
| Rewards, merchandise, and packages | `digitalBadgeEnabled`, `digitalCertificateEnabled`, `physicalRewardsEnabled`, `physicalRewardMedalEnabled`, `physicalRewardMedalAmount`, `physicalRewardShirtEnabled`, `physicalRewardShirtAmount`, `physicalRewardPatchEnabled`, `physicalRewardPatchAmount`, `physicalRewardTowelEnabled`, `physicalRewardTowelAmount`, `physicalRewardFinisherKitEnabled`, `physicalRewardFinisherKitAmount`, `physicalRewardOtherItems`, `physicalRewardsDescription`, `physicalRewardsClaimingNotes`, `registrationPackages`, `deliveryFeeEnabled`, `deliveryFeeAmount`, `deliveryFeeDescription`, `requiresDeliveryAddress`, `requiresPhilippineDeliveryAddress`, `internationalRunnersAllowed`, `claimingMethod`, `specialRewardBenefits` |
| Waiver | `waiverTemplate` |
| Schedule | `registrationOpenAt`, `registrationCloseAt`, `eventStartAt`, `eventEndAt` |
| Location | `venueName`, `venueAddress`, `city`, `province`, `country`, `geoLat`, `geoLng` |
| Virtual rules / leaderboard | `virtualStartAt`, `virtualEndAt`, `proofTypesAllowed`, `virtualCompletionMode`, `acceptedRunTypes`, `finalSubmissionDeadlineAt`, `recognitionMode`, `leaderboardMode`, `leaderboardRecognitionEnabled` |
| Media | `logoFile`, `logoUrl`, `bannerImageFile`, `bannerImageUrl`, `posterImageFile`, `posterImageUrl`, `galleryImageFiles`, `galleryImageUrlsText` |
| Actions | `actionType: draft` or `actionType: publish` |

### Current Persisted Event Model Fields

| Area | Event Fields |
|---|---|
| Identity | `organizerId`, `slug`, `referenceCode` |
| Core details | `title`, `organiserName`, `description`, `eventDetailsMarkdown`, `status`, `eventType`, `eventTypesAllowed`, `raceDistances` |
| Dates | `registrationOpenAt`, `registrationCloseAt`, `eventStartAt`, `eventEndAt` |
| Location | `venueName`, `venueAddress`, `city`, `province`, `country`, `geo` |
| Virtual rules / leaderboard | `virtualWindow`, `proofTypesAllowed`, `virtualCompletionMode`, `acceptedRunTypes`, `finalSubmissionDeadlineAt`, `recognitionMode`, `leaderboardMode`, `leaderboardRecognitionEnabled` |
| Fees and payment | `feeMode`, `feeAmount`, `feeCurrency`, `pricingMode`, `suggestedEventFee`, `finalEventFee`, `paymentQrImageUrl`, `paymentQrImageKey`, `paymentAccountName`, `paymentInstructions` |
| Rewards, merchandise, and packages | `digitalBadgeEnabled`, `digitalCertificateEnabled`, `physicalRewardsEnabled`, `physicalRewardMedalEnabled`, `physicalRewardMedalAmount`, `physicalRewardShirtEnabled`, `physicalRewardShirtAmount`, `physicalRewardPatchEnabled`, `physicalRewardPatchAmount`, `physicalRewardTowelEnabled`, `physicalRewardFinisherKitEnabled`, `physicalRewardOtherItems`, `physicalRewardsDescription`, `physicalRewardsClaimingNotes`, `registrationPackages`, `deliveryFeeEnabled`, `deliveryFeeAmount`, `deliveryFeeDescription`, `requiresDeliveryAddress`, `requiresPhilippineDeliveryAddress`, `internationalRunnersAllowed`, `claimingMethod`, `specialRewardBenefits` |
| Media | `logoUrl`, `bannerImageUrl`, `posterImageUrl`, `galleryImageUrls` |
| Waiver | `waiverTemplate`, `waiverVersion` |

## MVP Pricing Scope

The MVP pricing scope should support the following modes:

```text
free
distance_based
customized_options
```

### Free

Use when the event has no registration fee.

Free event rules:

- Payment setup is hidden.
- Payment QR is not required.
- Payment account name is not required.
- Payment proof upload should not be required during runner registration.
- Registration should move directly to the correct free-event state.

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

Use when the organizer defines selectable paid entries that include both an amount and a short description.

Example:

```text
5K - Medal + Shirt + Race Kit - PHP 850
10K - Medal + Shirt + Race Kit - PHP 1,050
Virtual 100K - Digital Badge Only - PHP 300
```

The customized option is what the runner selects during signup.

### Pricing Periods

Pricing periods are post-MVP unless explicitly included in a focused pricing task. If enabled later, pricing periods may apply to either distance-based or customized options.

Example:

```text
5K
Early Bird: PHP 450
Regular: PHP 500
Late Registration: PHP 600
```

## Post-MVP Pricing Scope

The following modes should be documented but not prioritised for the first stable wizard version:

```text
package_based
package_period
```

Package-based pricing should be implemented after race categories, per-distance pricing, and preview stability are already working.

Examples:

- Medal Only
- Medal + Shirt
- Medal + Shirt + Towel
- Finisher Kit
- Sponsor-covered package

## Core Details Panel

Purpose:

Capture the basic identity and public summary of the event.

Fields:

| Field | Purpose |
|---|---|
| Event Title | Main event name |
| Organizer Name | Displayed organizer name; defaults to the account owner but can be changed to a club, brand, or team name |
| Short Description | Used for event cards and listings; tooltip clarifies that full rules belong in Event Details |
| Race Distance Presets | Common distances |
| Custom Distance | Example: `100K`, `2026K` |
| Event Type | Virtual, onsite, or hybrid |

Suggested helper text for custom distance:

```text
Use this for challenge-style distances such as 100K, 500K, or 2026K.
```

Validation:

- Title is required for draft.
- Title, description, event type, and race distance or category are required for submit-for-review.
- Organizer name falls back to the account owner name when left unchanged.
- Event type must be one of `virtual`, `onsite`, or `hybrid`.

## Schedule Panel

Purpose:

Define when registration opens, when registration closes, and when the event happens.

Fields:

| Field | Purpose |
|---|---|
| Registration Open | When registration starts |
| Registration Close | When registration ends |
| Event Start | When the event begins |
| Event End | When the event ends |

Validation:

```text
Registration Open <= Registration Close <= Event Start <= Event End
```

For virtual and hybrid events:

- The virtual submission window should align with the event period unless the organizer edits it.
- The final submission deadline may be separate for accumulated events.

## Location Panel

Purpose:

Capture onsite or hybrid venue details.

Show this panel when:

- Event Type = Onsite
- Event Type = Hybrid

Hide this panel when:

- Event Type = Virtual

Fields:

| Field | Purpose |
|---|---|
| Venue Name | Event venue |
| Venue Address | Full venue address |
| City | City or municipality |
| Province/State | Province or state |
| Country | Country |
| Latitude | Optional map coordinate |
| Longitude | Optional map coordinate |

Validation:

- Venue name, city, province/state, and country should be required for onsite and hybrid events.
- Latitude and longitude should be optional.
- If latitude is provided, longitude should also be provided.
- If longitude is provided, latitude should also be provided.

## Race Categories and Distance Pricing Panel

Purpose:

Allow organizers to define race categories and the amount runners will pay for each category.

This is especially important for onsite and hybrid events because different race distances often have different fees.

Examples:

```text
5K - â‚±500
10K - â‚±750
21K - â‚±1,200
```

With registration period pricing:

```text
5K
- Early Bird: â‚±500
- Regular: â‚±650
- Late Registration: â‚±750

10K
- Early Bird: â‚±750
- Regular: â‚±900
- Late Registration: â‚±1,000
```

### When This Panel Should Appear

Show for:

- Onsite events
- Hybrid events
- Virtual events with multiple distances or optional categories

Recommended default:

| Event Type | Recommended Pricing Mode |
|---|---|
| Virtual accumulated challenge | `customized_options`, `distance_based`, or `free` |
| Standard virtual event | `customized_options`, `distance_based`, or `free` |
| Onsite event | `distance_based` or `customized_options` |
| Hybrid event | `distance_based` or `customized_options`, with optional virtual-only categories |

### Race Category Fields

Each category should support:

| Field | Purpose |
|---|---|
| Distance Name | Example: `5K`, `10K`, `21K`, `Virtual 100K` |
| Distance in KM | Numeric distance value |
| Category Type | Run, walk, trail, bike, virtual, other |
| Base Registration Fee | Used for distance-based pricing |
| Customized Options | Optional runner-selectable signup options with amount and short description |
| Slots Available | Optional participant capacity |
| Cut-off Time | Optional onsite race cut-off |
| Age Group | Optional category rule |
| Included Rewards | Medal, shirt, patch, finisher kit, other |
| Notes | Extra category-specific notes |

Suggested structure:

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

### Recommended UI Pattern

Use repeatable cards.

```text
[ + Add Race Category ]

5K Category Card
  Basic Details
  Pricing Periods
  Included Rewards
  Slots and Notes

[ + Add Pricing Period ]
[ Duplicate Category ]
[ Remove Category ]
```

Duplication matters because an organizer may create a 5K category, duplicate it into 10K, then adjust only the amount, slots, and cut-off time.

### Validation Rules

- Each onsite or hybrid event should have at least one race category.
- Each paid race category must have at least one amount.
- Each pricing period must have a start date, end date, label, and amount.
- Pricing periods must not overlap within the same race category.
- Early bird should end before regular starts.
- Regular should end before late registration starts.
- All pricing periods should fall within registration open and registration close dates.
- Amount must be zero or higher.
- Paid events must have at least one amount greater than zero.
- Free events should not require pricing periods.

## Virtual Rules Panel

Purpose:

Configure virtual participation rules, proof requirements, and completion rules.

Show this panel when:

- Event Type = Virtual
- Event Type = Hybrid

Hide this panel when:

- Event Type = Onsite only

Fields:

| Field | Purpose |
|---|---|
| Virtual Window Start | When submissions may begin; defaults to Event Start while blank or auto-filled |
| Virtual Window End | Final accepted activity date; defaults to Event End while blank or auto-filled |
| Proof Types Allowed | Strava or other running app sync, photo, manual |
| Virtual Completion Mode | Single activity or accumulated distance |
| Accepted Activity Types | Run, walk, hike, trail run |
| Final Submission Deadline | Defaults to Event End + 14 days for accumulated challenges |
| Recognition Mode | Completion-based or ranking-based |
| Leaderboard Mode | Finishers, total distance, or both |
| Leaderboard Recognition | Toggle |

Recommended completion modes:

```text
single_activity
accumulated_distance
```

Conditional logic:

If `single_activity`:

- Hide accumulated progress rules.

If `accumulated_distance`:

- Derive the completion goal from the selected race distance or challenge category.
- Show accepted activity types.
- Show final submission deadline.
- Default Virtual Window Start to Event Start unless the organizer edits it.
- Default Virtual Window End to Event End unless the organizer edits it.
- Default final submission deadline to 14 days after Event End unless the organizer sets a custom deadline.

## Accumulated Virtual Run Requirements

Accumulated virtual runs should be treated as a distinct virtual event format, not only as a long race distance.

Current accumulated submission direction:

- Keep the existing single-submission path for standard virtual runs.
- Continue using the activity-level model for accumulated virtual run activities.
- Continue using rollup helpers to calculate approved distance, pending distance, rejected distance, completion status, and completion timestamp.
- Multiple activity proofs should be allowed per registration when `virtualCompletionMode` is `accumulated_distance`.
- Approved activity distance only counts toward official progress.
- Pending and rejected activities stay out of official progress.
- Completion is reached when approved total reaches the selected race distance or challenge category goal.
- Certificates unlock after completion.
- Progress rollups support displays such as `24.3 km / 100 km`.

Required configuration:

- `virtualCompletionMode`
- `acceptedRunTypes`
- `finalSubmissionDeadlineAt`
- `recognitionMode`
- `leaderboardMode`

## Rewards, Merchandise, and Registration Packages Panel

Purpose:

Configure what runners receive when they join or complete the event, and document future package options.

This panel should come before Fees and Payment because medals, shirts, towels, patches, finisher kits, other merchandise, and delivery fees may affect the suggested event fee.

Recommended panel sections:

1. Digital Recognition
2. Physical Rewards / Merchandise
3. Category-Specific Rewards
4. Delivery and Claiming Fees
5. Special Reward Benefits
6. Rewards Claiming Notes
7. Registration Packages for post-MVP planning

### Digital Recognition

Fields:

| Field | Purpose |
|---|---|
| Digital Badge | Enable digital badge reward |
| Digital Finisher Certificate | Enable certificate reward |
| Leaderboard Recognition | Enable leaderboard recognition |

### Physical Rewards / Merchandise

Fields:

| Field | Purpose |
|---|---|
| Physical Rewards Enabled | Shows physical reward fields |
| Medal Enabled | Whether medal is included |
| Medal Amount | Internal or suggested cost amount |
| Shirt Enabled | Whether shirt is included |
| Shirt Amount | Internal or suggested cost amount |
| Patch Enabled | Whether patch is included |
| Patch Amount | Internal or suggested cost amount |
| Towel Enabled | Whether towel is included |
| Towel Amount | Internal or suggested cost amount |
| Finisher Kit Enabled | Whether finisher kit is included |
| Finisher Kit Amount | Internal or suggested cost amount |
| Other Merchandise Items | Custom items with name and amount |
| Physical Rewards Description | Display copy for runners |
| Rewards Claiming Notes | Claiming, pickup, shipping, or release instructions |

### Category-Specific Rewards

Some onsite events include different rewards per distance.

Example:

```text
5K
- Medal
- Shirt

10K
- Medal
- Shirt
- Patch

21K
- Medal
- Shirt
- Finisher Kit
```

Recommended behaviour:

- Let organizers apply global rewards to all categories.
- Let organizers override rewards per race category.
- Use category-specific rewards when the event uses different inclusions per distance.

### Delivery and Claiming Fees

Suggested fields:

```js
deliveryFeeEnabled: Boolean,
deliveryFeeAmount: Number,
deliveryFeeDescription: String,
requiresDeliveryAddress: Boolean,
requiresPhilippineDeliveryAddress: Boolean,
internationalRunnersAllowed: Boolean,
claimingMethod: "delivery" | "pickup" | "both"
```

Validation:

- If delivery fee is enabled, delivery fee amount must be zero or higher.
- If claiming method is delivery, delivery address should be required during runner registration.
- If Philippine address is required, runner registration should collect or validate the required address fields.

### Registration Packages

Package-based pricing should remain post-MVP.

Examples:

- Medal Only
- Medal + Shirt
- Medal + Shirt + Towel
- Medal + Shirt + Patch
- Finisher Kit

Keep this direction documented, but do not prioritise it before the MVP pricing modes are stable.

## Fees and Payment Panel

Purpose:

Summarise pricing and configure how runners will pay.

This panel should appear after Rewards and Merchandise.

### Fees and Payment Sections

Recommended sections:

1. Pricing Summary
2. Suggested Fee Calculation
3. Final Fee Setup
4. Payment Acceptance

### Pricing Summary

For distance-based events:

```text
5K: PHP 500
10K: PHP 750
21K: PHP 1,200
```

For customized-option events:

```text
5K - Medal + Shirt + Race Kit: PHP 850
10K - Medal + Shirt + Race Kit: PHP 1,050
Virtual 100K - Digital Badge Only: PHP 300
```

### Final Fee Setup

Fields:

| Field | Purpose |
|---|---|
| Fee Mode | Free or paid |
| Pricing Mode | Free, distance based, customized options |
| Currency | Example: PHP |
| Distance Prices | Used for distance-based pricing |
| Custom Signup Options | Amount plus short description; runner selects one during signup |

### Payment Acceptance

Fields:

| Field | Purpose |
|---|---|
| Payment QR Image | Required for paid events before submit-for-review |
| Payment Account Name | Required for paid events before submit-for-review |
| Payment Instructions | Recommended payment steps for runners |

Current rule:

- Paid drafts can save without a QR image.
- Submit-for-review requires a payment QR image for paid events.
- Submit-for-review should also require payment account name for paid events.

## Event Details Panel

Purpose:

Capture the long-form public event content.

The organizer UI should label this field as:

```text
Event Details
```

The internal persisted field may remain:

```text
eventDetailsMarkdown
```

Recommended content blocks inside the editor:

- Event overview
- Who can join
- Registration details
- Race categories
- Pricing details
- Challenge rules
- Submission rules
- Completion rules
- Leaderboard rules
- Rewards and merchandise
- Registration packages
- Delivery or claiming fees
- Special reward benefits
- Claiming or shipping instructions
- Payment instructions
- FAQ
- Contact or support details

Rendering notes:

- Public rendering must sanitize Quill HTML directly when the saved value looks like HTML.
- Markdown fallback should remain available for older or manually seeded content.
- Critical event mechanics should use structured event fields first.
- Long-form Event Details content should support deeper explanation, FAQ, and organizer-specific instructions.

## Branding and Media Panel

Purpose:

Allow organizers to upload or link event branding assets.

Fields:

| Field | Purpose |
|---|---|
| Logo Upload or URL | Event logo |
| Banner Upload or URL | Main event banner |
| Poster Upload or URL | Promotional poster |
| Gallery Uploads or URLs | Additional event images |

Recommended image usage:

| Image | Recommended Use |
|---|---|
| Logo | Event card and badge |
| Banner | Event details page |
| Poster | Promotional and shareable image |
| Gallery | Event page visual section |

Validation:

- Upload or URL should be accepted.
- If both upload and URL are provided, define a clear priority.
- Uploaded file should take priority over URL.
- Local uploaded files may not appear in GET-query previews until preview architecture improves.

## Waiver Panel

Purpose:

Allow organizers to define the waiver and participant agreement text.

Current features:

- Quill rich-text editor
- Default waiver reset
- Organizer and event title placeholders
- Live preview
- Server-side sanitization
- Minimum text validation

Fields:

| Field | Purpose |
|---|---|
| Waiver Template | Legal and rules agreement |
| Reset to Default | Restore default waiver |
| Live Preview | See final waiver content |

Suggested placeholders:

```text
{{organizerName}}
{{eventTitle}}
```

Validation:

- Waiver must meet minimum content length for submit-for-review.
- Waiver should be sanitized server-side before saving.
- Drafts may use incomplete waiver content.

## Preview

Current preview limitations:

- Preview is GET-query based.
- Preview cannot preview local uploaded files.
- Preview can become fragile with long rich-text waiver content because form data is serialized into the URL.

Recommended future preview structure:

- Event card preview
- Event details page preview
- Fee/payment section preview
- Race category and pricing preview
- Rewards and merchandise preview
- Waiver preview
- Media preview, where possible

Better future direction:

Use a temporary server-side preview session or draft preview ID instead of passing everything through the URL.

Best practical option:

```text
Save as draft first, then preview using draft ID.
```

## Sticky Action Bar

Suggested action bar:

```text
Save Draft | Preview Event | Submit for Review
```

Behaviour:

| Action | Behaviour |
|---|---|
| Save Draft | Requires title only |
| Preview Event | Shows realistic event preview |
| Submit for Review | Requires full validation |

Design requirement:

- Use the project-wide button treatment.
- Use clear hover and disabled states.
- Keep icon and label layouts consistent across breakpoints.

## Event Visibility Rules

Draft events:

- Visible only to the organizer and admins.
- May be incomplete.
- Should not appear on public event listing pages.

Submitted-for-review events:

- Visible to admins.
- Visible to the organizer.
- Not publicly visible.

Approved events:

- Publicly visible.
- Can accept registrations based on registration dates and capacity.

Rejected events:

- Returned to organizer edit mode.
- Should show admin review notes.
- Should not be publicly visible.

Archived or cancelled events:

- Should not accept new registrations.
- May remain visible depending on admin/organizer decision.

## Admin Review Feedback Requirements

Admin review should not only approve or reject an event. It should also provide feedback to organizers.

Suggested fields:

```js
adminReviewStatus: "pending" | "approved" | "rejected",
adminReviewNotes: String,
reviewedBy: ObjectId,
reviewedAt: Date
```

Recommended behaviour:

- Submit-for-review sets status to `pending_review`.
- Admin approval sets status to `approved` or `published`.
- Admin rejection sets status to `rejected`.
- Rejected events should display review notes to the organizer.
- Organizers should be able to edit and resubmit rejected events.

## Paid Registration Payment Receipt Requirements

Current scope:

- Organizer can configure paid event settings during event creation.
- Paid-event registrations require payment receipt review before run result submission is unlocked.
- Free-event registrations skip payment verification and start as confirmed or equivalent free-event state.

Current paid registration behaviour:

- Paid events require payment receipt upload after runner registration.
- Runner registration remains pending for run result submission until the payment receipt is approved.
- Organizers or admins review payment receipts.
- Only approved paid registrations should appear as confirmed participants.

Future pricing/payment snapshot behaviour:

- The amount to pay should be derived from the active event pricing rule.
- For distance-based events, selected race category should determine the amount.
- For customized-option events, selected custom option should determine the amount.
- For package-based events, selected registration package and active pricing period should determine the amount.
- For events with delivery fees, delivery fee should be added to the resolved amount when applicable.

Suggested registration states:

```text
registered_pending_payment
payment_submitted
payment_approved
payment_rejected
confirmed
cancelled
```

## Digital Badge Requirements

Digital badges should support HelloRun's achievement-based recognition direction.

Requirements:

- Event-level badge template can be configured by organizer or generated by the system.
- Badge unlocks when completion requirements are met.
- Badge should be viewable from the runner dashboard.
- Badge should be downloadable as an image.
- Badge should be shareable through a public achievement page.
- Badge should include event name, runner name, distance or challenge target, completion date, and HelloRun branding.
- For accumulated events, badges may unlock at milestones or final completion.
- Badge unlock rules should depend on event configuration.

Suggested fields:

```js
badgeConfig: {
  enabled: Boolean,
  unlockMode: "completion" | "milestone" | "manual",
  badgeTemplateUrl: String,
  badgeTitle: String,
  badgeDescription: String
}
```

## Validation Direction

Validation should be centralised as much as possible.

Recommended service:

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

## Create/Edit Regression Checklist

Use this whenever the create-event wizard or edit-event wizard is updated.

- Create event loads with blank defaults.
- Edit draft loads saved values.
- Edit published event hides Submit for Review.
- Edit pending-review event hides Submit for Review.
- Draft edit can Save Changes.
- Draft edit can Preview.
- Draft edit can Submit for Review.
- Existing media previews remain visible.
- Removed media does not reappear after save.
- Free event does not require payment setup.
- Paid event requires payment QR before review.
- Paid event requires payment account name before review.
- Event type controls virtual/location visibility.
- Waiver content is saved and previewed correctly.
- Rich Event Details content is sanitised on public render.

## Next Implementation Priority

The next major implementation priority is:

```text
Race Categories + Paid Pricing Options + Runner Signup Selection
```

This should come before package-based pricing and before major preview architecture work because race categories affect:

- runner registration choices
- distance-based fees
- early bird, regular, and late registration pricing
- category-specific rewards
- onsite event setup
- hybrid event setup
- payment amount calculation
- event summary and preview content

## Recommended Focused Codex Task Files

To avoid making this tracking document too large, future implementation tasks should be placed under:

```text
docs/codex/
```

Recommended files:

```text
docs/codex/race_categories_and_paid_pricing_options.md
docs/codex/preview_architecture_update.md
docs/codex/event_readiness_validation_service.md
docs/codex/admin_review_feedback_update.md
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

## Proposed Roadmap

### Phase 1: Stabilise MVP Wizard

Focus:

- Confirm the 12-step wizard works in create mode.
- Confirm the 12-step wizard works in edit mode.
- Keep draft save lightweight.
- Keep submit-for-review strict.
- Fix event-type field visibility issues.
- Strengthen payment account name validation for paid submit-for-review.

### Phase 2: Race Categories and Pricing

Focus:

- Add repeatable race category cards.
- Support duplicate and remove actions.
- Support category-specific rewards.
- Connect categories to `distance_based` pricing.
- Add customized signup options with amount and short description.
- Ensure runner signup can select the configured paid option.
- Validate pricing periods.
- Preserve fallback behaviour for existing `raceDistances`.

### Phase 3: Event Readiness Validation Service

Focus:

- Centralise draft validation.
- Centralise submit-for-review validation.
- Reuse the same readiness rules for Step 12.
- Reuse the same readiness rules for create and edit mode.

### Phase 4: Preview Architecture

Focus:

- Replace fragile GET-query preview.
- Support draft ID preview.
- Support uploaded media preview.
- Show full summary cards.
- Preview pricing, payment, rewards, waiver, and event details more realistically.

### Phase 5: Admin Review Feedback

Focus:

- Add structured review notes.
- Show rejection notes to organizers.
- Allow rejected events to be edited and resubmitted.
- Track reviewer and review timestamp.

### Phase 6: Post-MVP Pricing

Focus:

- Add package-based pricing.
- Add package period pricing.
- Add runner package selection during registration.
- Add payment amount snapshots.
- Add delivery fee integration into resolved amount.

## Testing Requirements

### Unit or Service-Level Tests

- Draft validation allows incomplete events with valid title.
- Submit-for-review rejects incomplete events.
- Event type validation applies correct virtual/location requirements.
- Free events skip payment validation.
- Distance-based paid events require valid category amounts, QR, and payment account name before review.
- Customized-option paid events require amount and short description per option, QR, and payment account name before review.
- Pricing periods do not overlap.
- Pricing periods stay within the registration window.
- Waiver minimum content validation works.
- Event details sanitisation works.

### Integration Tests

- Approved organizer can create draft.
- Pending acknowledged organizer can create provisional draft.
- Organizer can submit complete event for review.
- Organizer cannot submit paid event without QR.
- Organizer cannot submit onsite/hybrid event without location.
- Organizer cannot submit virtual/hybrid event without virtual rules.
- Edit draft preserves existing media.
- Edit published event hides submit action.
- Admin can review submitted event.

### UI Tests or Manual QA

- Desktop sidebar step navigation works.
- Tablet pill navigation works.
- Mobile mini strip works.
- Mobile overlay opens and closes correctly.
- Active step syncs across all wizard surfaces.
- Upload areas show placeholder and preview states.
- Adaptive buttons show labels and tooltips correctly.
- Step 12 checklist updates after field changes.

## Preserved Detailed References

The following sections are retained from the previous tracker because they contain useful detailed analysis that is not fully represented in the shorter updated roadmap.

## Accumulated Leaderboard Display

For accumulated virtual events, the leaderboard should show more than rank and name.

Recommended fields:

- Rank
- Runner name
- Total approved distance
- Target distance progress
- Completion status
- Completion date
- Number of approved activities
- Badge availability
- Certificate availability

Example:

```text
Rank | Runner | Approved Distance | Progress | Status | Completed At
1    | Juan   | 112.5 km          | 100%     | Completed | May 25, 2026
2    | Maria  | 97.2 km           | 97.2%    | In Progress | -
```

Recommended leaderboard modes:

```text
finishers_only
top_total_distance
finishers_plus_total_distance
```

Recommended decision:

- For accumulated events, approved distance may continue counting beyond the target if leaderboard mode includes top total distance.
- Certificates should unlock only after the runner reaches the target distance through approved activities.
- Badges may unlock at milestones and/or final completion depending on event configuration.

---


## 100K Progress Run Field-Mapping Analysis

Reference: `docs/example/100k-progress-run-event-reference.md`

The 100K Progress Run can partially be encoded today, but several important rules need structured fields or future backend support.

### Already Supported

| 100K Reference Need | Current Support |
|---|---|
| Event title | Supported by title |
| Virtual event mode | Supported by eventType = virtual |
| Short description and overview | Supported by description |
| Full rules, FAQ, and long-form instructions | Supported by Event Details UI field, stored internally as eventDetailsMarkdown |
| 100K distance label | Supported by custom race distance |
| Registration open and close | Supported |
| Challenge start and end | Supported by eventStartAt/eventEndAt and virtualWindow |
| Strava or other running app sync, photo, or manual proof | Partially supported by proofTypesAllowed |
| Waiver and rules copy | Supported as rich text |
| Event media | Supported by logo/banner/poster/gallery |
| Event fee | Supported by feeMode/feeAmount/feeCurrency |
| Manual payment acceptance QR | Supported by paymentQrImageUrl/paymentQrImageKey |
| Digital and physical recognition setup | Supported by reward toggles, physical reward item toggles, and physicalRewardsDescription |

### Remaining Gaps and Follow-Ups

| 100K Reference Need | Current Gap |
|---|---|
| Multiple submissions per participant | Supported for accumulated-distance events through activity-level submissions. Runner and organizer UX can still be polished. |
| Approved-distance progress tracking | Supported through accumulated activity rollups. |
| Review period | No structured review-period field yet |
| Certificate release date | No structured certificate-release field yet |
| Merchandise packages | Organizer setup is supported through registration packages, package pricing periods, reward items, custom merchandise, and delivery fee fields. Runner package selection and full checkout remain separate scope. |
| Encoding cleanup | Reference text contains mojibake apostrophe artifacts, for example participant plus a garbled apostrophe sequence |

### Suggested Current Manual Encoding for the 100K Example

- Event Title: `100K Progress Run by HelloRun`
- Event Type: `Virtual`
- Race Distance Custom: `100K`
- Registration Open: May 5, 2026
- Registration Close: May 12, 2026
- Event Start: May 13, 2026
- Event End: May 31, 2026
- Virtual Window Start: May 13, 2026
- Virtual Window End: May 31, 2026 at 11:59 PM
- Proof Types: GPS and Photo
- Description: include the overview, challenge goal, accepted activities, completion rule, submission rules, progress tracking explanation, recognition, and FAQ.

This is now acceptable as an accumulated-distance event setup because activity-level submissions and approved-distance rollups exist. Runner package selection, structured review/certificate-release dates, and full checkout remain separate follow-up work.

---


## Proposed Data Model Additions

### Event Pricing Fields

```js
feeMode: "free" | "paid",

pricingMode: "free" | "distance_based" | "customized_options" | "distance_based_period" | "customized_options_period" | "package_period",

currency: "PHP",

baseRegistrationFee: Number,

suggestedEventFee: Number,

finalEventFee: Number
```

### Race Categories

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
      finisherKit: Boolean,
      otherItemNames: [String]
    },

    notes: String
  }
]
```

### Registration Packages

```js
registrationPackages: [
  {
    name: String,

    includedItems: {
      medal: Boolean,
      shirt: Boolean,
      towel: Boolean,
      patch: Boolean,
      finisherKit: Boolean,
      otherItemNames: [String]
    },

    pricingPeriods: [
      {
        label: String,
        code: "early_bird" | "regular" | "late" | "custom",
        startAt: Date,
        endAt: Date,
        amount: Number
      }
    ],

    notes: String
  }
]
```

### Delivery and Claiming

```js
deliveryFeeEnabled: Boolean,
deliveryFeeAmount: Number,
deliveryFeeDescription: String,
requiresDeliveryAddress: Boolean,
requiresPhilippineDeliveryAddress: Boolean,
internationalRunnersAllowed: Boolean,
claimingMethod: "delivery" | "pickup" | "both"
```

### Special Reward Benefits

```js
specialRewardBenefits: [
  {
    title: String,
    description: String,
    validUntil: Date,
    appliesToPackageNames: [String]
  }
]
```

### Rewards and Merchandise

```js
digitalBadgeEnabled: Boolean,
digitalCertificateEnabled: Boolean,
leaderboardRecognitionEnabled: Boolean,

physicalRewardsEnabled: Boolean,

physicalRewardMedalEnabled: Boolean,
physicalRewardMedalAmount: Number,

physicalRewardShirtEnabled: Boolean,
physicalRewardShirtAmount: Number,

physicalRewardPatchEnabled: Boolean,
physicalRewardPatchAmount: Number,

physicalRewardTowelEnabled: Boolean,
physicalRewardTowelAmount: Number,

physicalRewardFinisherKitEnabled: Boolean,
physicalRewardFinisherKitAmount: Number,

physicalRewardOtherItems: [
  {
    name: String,
    amount: Number
  }
],

physicalRewardsDescription: String,
physicalRewardsClaimingNotes: String
```

### Admin Review

```js
adminReviewStatus: "pending" | "approved" | "rejected",
adminReviewNotes: String,
reviewedBy: ObjectId,
reviewedAt: Date
```

### Badge Config

```js
badgeConfig: {
  enabled: Boolean,
  unlockMode: "completion" | "milestone" | "manual",
  badgeTemplateUrl: String,
  badgeTitle: String,
  badgeDescription: String
}
```

---


## Price Resolution Rules

### Distance Based

Use selected race category fee.

```text
Amount to Pay = selectedRaceCategory.baseRegistrationFee
```

### Customized Options

Use selected custom signup option amount.

```text
Amount to Pay = selectedCustomOption.amount
```

The selected custom option should also be snapshotted with its short description because that is what the runner chose during signup.

### Distance Based or Customized Option with Registration Period

Use selected race category or custom option and active pricing period.

```text
Amount to Pay =
selectedPriceOption.pricingPeriods.find(period =>
  now >= period.startAt && now <= period.endAt
).amount
```

### Package-Based Virtual Event

Use selected registration package and active pricing period.

```text
Amount to Pay =
selectedRegistrationPackage.pricingPeriods.find(period =>
  now >= period.startAt && now <= period.endAt
).amount
+ deliveryFeeIfApplicable
```

Example:

```text
Selected package: Medal + Shirt
Active period: Regular
Package amount: â‚±1,195
Delivery fee: â‚±100
Amount to pay: â‚±1,295
```

### Complex Onsite or Hybrid Event

Use selected race category, selected package, active pricing period, and delivery fee when applicable.

```text
Amount to Pay =
resolvedRaceCategoryPrice
+ resolvedPackagePrice
+ deliveryFeeIfApplicable
```

This should be used only if the event allows both category-based pricing and package-based add-ons.

### Important Payment Rule

When a runner registers, the calculated amount should be saved as a payment snapshot.

Suggested fields on registration:

```js
selectedRaceCategoryId: ObjectId,
selectedRaceCategoryName: String,

selectedRegistrationPackageId: ObjectId,
selectedRegistrationPackageName: String,

selectedPricingPeriodCode: String,
selectedPricingPeriodLabel: String,

deliveryFeeApplied: Boolean,
deliveryFeeAmount: Number,

amountDue: Number,
currency: String,
priceResolvedAt: Date
```

Reason:

If the organizer changes the price later, the runnerâ€™s registered amount should not unexpectedly change.

---


## Sample Event Validation Notes

The reviewed virtual run samples validate the need for package-based pricing and delivery fee support.

Observed event patterns:

- Virtual run with a fixed event period.
- Multiple cumulative distance categories.
- Early bird and regular pricing.
- Reward package options such as Medal Only, Medal + Shirt, and Medal + Shirt + Towel.
- Separate delivery fee.
- Digital badge as a finisher reward.
- Medal, shirt, and towel as physical entitlements.
- Free engraving as a time-limited benefit.
- GPS app, watch, and treadmill submissions.
- Honour-system rules with fraud checking.
- Final submission deadline after the event period.
- Runner count and runner avatar preview.

HelloRun should avoid forcing these details into one long Event Details text field.

Recommended structured handling:

| Sample Event Detail | HelloRun Feature |
|---|---|
| 25K, 10K, 5K, 3K categories | Race categories |
| 40K, 20K, 10K categories | Race categories |
| Medal Only pricing | Registration packages |
| Medal + Shirt pricing | Registration packages |
| Medal + Shirt + Towel pricing | Registration packages with towel item |
| Early bird and regular rates | Pricing periods |
| Plus delivery fee | Delivery fee configuration |
| Free engraving until a date | Special reward benefits |
| Virtual badge | Digital badge |
| GPS/watch/treadmill proof | Virtual proof types |
| Submit until July 1 | Final submission deadline |
| Fraud checking | Review queue and suspicious-entry logic |
| Runner count | Registration count display |
| Runner avatars | Optional participant preview display |



## Recommended Next Implementation Priority

The next practical implementation sequence should be:

1. Add race categories.
2. Add per-distance pricing.
3. Add early bird, regular, and late pricing periods for race categories.
4. Add category-specific reward inclusions.
5. Add active price resolver for runner registration.
6. Add payment amount snapshot to runner registration.
7. Add runner package/category selection UI.
8. Add paid registration payment receipt enforcement against the resolved amount.
9. Improve runner accumulated progress UI.
10. Add optional review-period and certificate-release date fields.
11. Add badge unlock logic for milestones and completion.

This keeps the implementation practical.

Organizer setup V1 is complete. The next pricing risk is runner-facing price resolution, especially when event category, package, registration period, and delivery fee can combine.

## Open Product Questions

These are not blockers for the next implementation step, but they should be resolved before post-MVP pricing work.

- Should package-based pricing be limited to virtual events first?
- Should onsite events allow both race category and package selection together?
- Should delivery fees be event-level, package-level, or category-level?
- Should payment account name be required for all paid submit-for-review events?
- Should international runners be allowed only when delivery is not required?
- Should badge templates be organizer-uploaded, system-generated, or both?
- Should rejected events keep the same event reference code after resubmission?

## Summary Direction

Keep this file as the create-event feature tracker and roadmap.

Use `docs/create_event/create_event_wizard_codex_implementation.md` as the implementation guide.

Use focused files under `docs/codex/` for isolated development tasks.

The next implementation priority is race categories, per-distance pricing, and pricing period validation.

