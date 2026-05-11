# Create Event Tracking

## Purpose and Ownership

This document is the dedicated planning and tracking source for the organizer create-event workflow at `/organizer/create-event`.

`docs/PRD.md` remains the master roadmap. This file should hold the route-level, field-level, UI-level, model-level, and testing details for create-event work, including example-driven gaps discovered from event setup references.

The guided organizer create-event wizard implementation plan is documented in `docs/create_event_wizard_codex_implementation.md`.

This document also captures the planned direction for:

- Virtual events
- Onsite events
- Hybrid events
- Accumulated-distance challenges
- Race category pricing
- Registration package pricing
- Early bird, regular, and late registration pricing
- Rewards, medals, shirts, towels, and merchandise pricing
- Delivery or claiming fee configuration
- Special reward benefits such as engraving promos
- Manual QR payment setup
- Admin review before publishing

Primary implementation surfaces:

- Route and persistence: `src/routes/organizer.routes.js`
- Create view: `src/views/organizer/create-event.ejs`
- Shared create/edit/admin form normalization: `src/services/event-form.service.js`
- Shared create/edit styling: `src/public/css/create-event.css`
- Event model: `src/models/Event.js`
- Submission model constraint relevant to accumulated virtual runs: `src/models/Submission.js`
- Accumulated activity model: `src/models/AccumulatedActivitySubmission.js`
- Example references:
  - `docs/example/100k-progress-run-event-reference.md`
  - `docs/template/2026k_accumulated_run_challenge_template.md`

---

## Product Direction

The create-event workflow should allow an approved organizer to configure a running event from draft to admin review.

The form should support both simple and complex event setups.

Simple examples:

- Free virtual fun run
- Paid 5K virtual run
- Single-distance onsite fun run

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

---

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
- `Fees and Payment` should summarize the price rules, active package rules, delivery fees, and payment acceptance setup.

---

## Page Header

Purpose:

Tell the organizer what the page is for and what actions are available.

Suggested content:

```text
Create Event
Set up your virtual, onsite, or hybrid running event. You may save it as a draft or submit it for admin review.
```

Suggested header actions:

- Save Draft
- Preview Event
- Submit for Review

Draft behavior:

- Drafts require only a valid title.
- Drafts may be incomplete.
- Drafts are visible only to the organizer and admins.

Submit-for-review behavior:

- Requires full publish-readiness validation.
- Sends the event to admin review.
- Does not publish immediately.

---

## Current `/organizer/create-event` Capabilities

The current create-event flow supports approved organizers creating drafts or submitting events for admin review. Admin approval publishes the event.

Implemented capabilities:

- Dedicated page at `/organizer/create-event`
- `canCreateEvents()` route guard, including verified approved organizer requirements
- Core event details:
  - event title
  - organizer name, defaulted from the account owner's first and last name on new create forms
  - short description for event listings/cards, with tooltip guidance to keep long rules in Event Details
  - full editable Event Details content for event details pages
  - event type: virtual, onsite, hybrid
  - race distances, including custom distance text such as `100K`
- Guided blank create defaults:
  - new create-event forms start mostly empty so organizers do not accidentally publish sample event content
  - safe system defaults remain: free fee mode, PHP currency, free pricing mode, and the generic waiver template
  - the 2026K accumulated challenge content remains available as a reference template in `docs/template/2026k_accumulated_run_challenge_template.md`, but it is not preloaded by default
- Fees and payment acceptance:
  - free or paid fee mode
  - total event fee amount and currency for paid events
  - payment QR image upload for paid events
  - optional payment account name
  - optional payment instructions
  - paid drafts can save without a QR image, but submit-for-review requires a payment QR image
- Rewards and recognition:
  - digital badge toggle
  - digital finisher certificate toggle
  - leaderboard recognition toggle
  - physical rewards toggle
  - physical reward item toggles and amount fields for medal, shirt, patch, towel, and finisher kit
  - custom merchandise item names and amounts
  - registration package setup with package pricing periods
  - delivery fee, delivery address, and claiming method setup
  - special reward benefit setup such as free engraving promos
  - organizer-facing suggested setup total and final fee override
  - physical rewards description
- Waiver editor:
  - Quill rich-text editor
  - default waiver reset
  - organizer and event title placeholders
  - live preview
  - server-side sanitization and minimum text validation
- Schedule:
  - registration open
  - registration close
  - event start
  - event end
- Conditional onsite/hybrid location fields:
  - venue name
  - venue address
  - city
  - province/state
  - country
  - optional latitude/longitude
- Conditional virtual/hybrid rules:
  - event format, defaulting to accumulated distance challenge on new create/edit setup
  - virtual window start
  - virtual window end
  - proof types allowed: GPS, photo, manual
  - accumulated challenge target distance with race-distance auto-fill
  - final submission deadline, defaulted to 14 days after Event End when omitted
  - accepted activity types for accumulated challenges
  - recognition mode, defaulting to completion with optional ranking
  - leaderboard mode, defaulting to finishers and top distance
- Branding and media:
  - logo upload or URL
  - banner upload or URL
  - poster upload or URL
  - gallery uploads or URLs
- Event details rendering:
  - public event details
  - organizer event details
  - admin event details
  - event preview
- Preview route at `/organizer/preview-event`
- Save Draft and Submit for Review actions
- Success redirect to `/organizer/events`
- Unique slug generation
- Unique event reference code generation

---

## Current Field Inventory

### Current First-Class Create-Event Fields

| Area | Current Fields |
|---|---|
| Core details | title, organiserName, description, eventDetailsMarkdown, eventType, raceDistancePresets, raceDistanceCustom |
| Fees and payment | feeMode, feeAmount, feeCurrency, pricingMode, suggestedEventFee, finalEventFee, paymentQrImageFile, paymentQrImageUrl, paymentQrImageKey, paymentAccountName, paymentInstructions |
| Rewards, merchandise, and packages | digitalBadgeEnabled, digitalCertificateEnabled, physicalRewardsEnabled, physicalRewardMedalEnabled, physicalRewardMedalAmount, physicalRewardShirtEnabled, physicalRewardShirtAmount, physicalRewardPatchEnabled, physicalRewardPatchAmount, physicalRewardTowelEnabled, physicalRewardTowelAmount, physicalRewardFinisherKitEnabled, physicalRewardFinisherKitAmount, physicalRewardOtherItems, physicalRewardsDescription, physicalRewardsClaimingNotes, registrationPackages, deliveryFeeEnabled, deliveryFeeAmount, deliveryFeeDescription, requiresDeliveryAddress, requiresPhilippineDeliveryAddress, internationalRunnersAllowed, claimingMethod, specialRewardBenefits |
| Waiver | waiverTemplate |
| Schedule | registrationOpenAt, registrationCloseAt, eventStartAt, eventEndAt |
| Location | venueName, venueAddress, city, province, country, geoLat, geoLng |
| Virtual rules / leaderboard | virtualStartAt, virtualEndAt, proofTypesAllowed, virtualCompletionMode, targetDistanceKm, acceptedRunTypes, finalSubmissionDeadlineAt, recognitionMode, leaderboardMode, leaderboardRecognitionEnabled |
| Media | logoFile, logoUrl, bannerImageFile, bannerImageUrl, posterImageFile, posterImageUrl, galleryImageFiles, galleryImageUrlsText |
| Actions | actionType: draft or publish. Publish submits for admin review |

### Current Persisted Event Model Fields

| Area | Event Fields |
|---|---|
| Identity | organizerId, slug, referenceCode |
| Core details | title, organiserName, description, eventDetailsMarkdown, status, eventType, eventTypesAllowed, raceDistances |
| Dates | registrationOpenAt, registrationCloseAt, eventStartAt, eventEndAt |
| Location | venueName, venueAddress, city, province, country, geo |
| Virtual rules / leaderboard | virtualWindow, proofTypesAllowed, virtualCompletionMode, targetDistanceKm, acceptedRunTypes, finalSubmissionDeadlineAt, recognitionMode, leaderboardMode, leaderboardRecognitionEnabled |
| Fees and payment | feeMode, feeAmount, feeCurrency, pricingMode, suggestedEventFee, finalEventFee, paymentQrImageUrl, paymentQrImageKey, paymentAccountName, paymentInstructions |
| Rewards, merchandise, and packages | digitalBadgeEnabled, digitalCertificateEnabled, physicalRewardsEnabled, physicalRewardMedalEnabled, physicalRewardMedalAmount, physicalRewardShirtEnabled, physicalRewardShirtAmount, physicalRewardPatchEnabled, physicalRewardPatchAmount, physicalRewardTowelEnabled, physicalRewardTowelAmount, physicalRewardFinisherKitEnabled, physicalRewardFinisherKitAmount, physicalRewardOtherItems, physicalRewardsDescription, physicalRewardsClaimingNotes, registrationPackages, deliveryFeeEnabled, deliveryFeeAmount, deliveryFeeDescription, requiresDeliveryAddress, requiresPhilippineDeliveryAddress, internationalRunnersAllowed, claimingMethod, specialRewardBenefits |
| Media | logoUrl, bannerImageUrl, posterImageUrl, galleryImageUrls |
| Waiver | waiverTemplate, waiverVersion |

---

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
- Title, description, event type, and race distance are required for submit-for-review. Organizer name falls back to the account owner name when left unchanged.
- Event type must be one of `virtual`, `onsite`, or `hybrid`.

---

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

- The virtual submission window should align with the event period.
- The final submission deadline may be separate for accumulated events.

---

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

---

## Race Categories and Distance Pricing Panel

Purpose:

Allow organizers to define race categories and the amount runners will pay for each category.

This is especially important for onsite events because different race distances often have different fees.

Examples:

```text
5K - ₱500
10K - ₱750
21K - ₱1,200
```

With registration period pricing:

```text
5K
- Early Bird: ₱500
- Regular: ₱650
- Late Registration: ₱750

10K
- Early Bird: ₱750
- Regular: ₱900
- Late Registration: ₱1,000
```

### When This Panel Should Appear

Show for:

- Onsite events
- Hybrid events
- Virtual events with multiple distances or optional categories

Recommended default:

| Event Type | Recommended Pricing Mode |
|---|---|
| Virtual accumulated challenge | Usually same fee for the whole challenge |
| Standard virtual event | Same fee or free |
| Onsite event | Per distance and registration period |
| Hybrid event | Per distance and registration period, with optional virtual-only categories |

### Pricing Modes

Recommended values:

```text
free
same_fee
per_distance
per_distance_period
```

Meaning:

| Pricing Mode | Meaning |
|---|---|
| free | No registration fee |
| same_fee | One fee for all participants |
| per_distance | Different fee per race distance |
| per_distance_period | Different fee per race distance and registration period |

For onsite events, the recommended mode is:

```text
per_distance_period
```

### Race Category Fields

Each category should support:

| Field | Purpose |
|---|---|
| Distance Name | Example: `5K`, `10K`, `21K`, `Virtual 100K` |
| Distance in KM | Numeric distance value |
| Category Type | Run, walk, trail, bike, virtual, other |
| Base Registration Fee | Used for same-fee or simple per-distance pricing |
| Slots Available | Optional participant capacity |
| Cut-off Time | Optional onsite race cut-off |
| Age Group | Optional category rule |
| Included Rewards | Medal, shirt, patch, finisher kit, other |
| Notes | Extra category-specific notes |

### Pricing Period Fields

Each category may include multiple pricing periods.

Recommended default pricing period labels:

- Early Bird
- Regular
- Late Registration

Recommended suggested date defaults:

- Early Bird starts at `registrationOpenAt` and ends 14 days after registration opens.
- Regular starts when Early Bird ends and ends 7 days before registration closes.
- Late Registration starts 7 days before `registrationCloseAt` and ends at `registrationCloseAt`.
- If the registration window is 21 days or shorter, do not auto-fill all three periods because they would overlap or leave no regular period.

Each pricing period should support:

| Field | Purpose |
|---|---|
| Label | Example: Early Bird |
| Code | Example: `early_bird` |
| Start Date | When this price starts |
| End Date | When this price ends |
| Amount | Price for this category during this period |

Example:

```js
raceCategories: [
  {
    distanceName: "5K",
    distanceKm: 5,
    categoryType: "run",
    slotsAvailable: 300,
    cutoffTime: "01:30:00",
    ageGroup: "Open",
    pricingPeriods: [
      {
        label: "Early Bird",
        code: "early_bird",
        startAt: "2026-05-01T00:00:00+08:00",
        endAt: "2026-05-15T23:59:59+08:00",
        amount: 500
      },
      {
        label: "Regular",
        code: "regular",
        startAt: "2026-05-16T00:00:00+08:00",
        endAt: "2026-05-25T23:59:59+08:00",
        amount: 650
      },
      {
        label: "Late Registration",
        code: "late",
        startAt: "2026-05-26T00:00:00+08:00",
        endAt: "2026-05-31T23:59:59+08:00",
        amount: 750
      }
    ],
    includedRewards: {
      medal: true,
      shirt: true,
      patch: false,
      finisherKit: false
    },
    notes: "Includes race bib, event shirt, and finisher medal."
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
[ + Duplicate Category ]
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

---

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
| Proof Types Allowed | GPS, photo, manual |
| Virtual Completion Mode | Single activity or accumulated distance |
| Target Distance | Example: `100`, `2026` |
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

- Hide target distance.
- Hide accumulated progress rules.

If `accumulated_distance`:

- Show target distance.
- Show accepted activity types.
- Show final submission deadline.
- Default Virtual Window Start to Event Start unless the organizer edits it.
- Default Virtual Window End to Event End unless the organizer edits it.
- Default final submission deadline to 14 days after Event End unless the organizer sets a custom deadline.

---

## Accumulated Virtual Run Requirements

Accumulated virtual runs should be treated as a distinct virtual event format, not only as a long race distance.

The current implementation is built around one final run-proof submission per registration. `Submission.registrationId` is unique, and `createSubmission` rejects a second submission for the same registration unless using the rejected-resubmission path. That model fits a single-activity virtual run, but not a challenge where a participant completes 100 km across multiple activities.

Required future event configuration:

- `virtualCompletionMode`: `single_activity` or `accumulated_distance`
- `targetDistanceKm`, for example `100`
- `acceptedRunTypes`, for example run, walk, hike, trail run
- `finalSubmissionDeadlineAt`, defaulting to 14 days after event end when omitted
- Recognition mode, for example completion-based finisher recognition
- Leaderboard mode, for example finishers plus optional top total distance

Current accumulated submission behavior:

- Activity-level submission support exists through `src/models/AccumulatedActivitySubmission.js`.
- Multiple activity proofs are allowed per registration when the event uses `virtualCompletionMode: accumulated_distance`.
- Approved activity distance only counts toward official progress.
- Pending and rejected activities stay out of official progress.
- Completion is reached when approved total reaches the event target distance.
- Certificates unlock after completion.
- Progress rollups support displays such as `24.3 km / 100 km`.

Remaining model direction:

- Keep the existing single-submission path for standard virtual runs.
- Continue using the activity-level model for accumulated virtual run activities.
- Continue using rollup helpers to calculate approved distance, pending distance, rejected distance, completion status, and completion timestamp.
- Improve runner and organizer activity-review UX as needed for production event operations.

---

## Rewards, Merchandise, and Registration Packages Panel

Purpose:

Configure what runners receive when they join or complete the event, and define registration package options when the event has bundled entitlements.

This panel should come before Fees and Payment because medals, shirts, towels, patches, finisher kits, other merchandise, and delivery fees may affect the suggested event fee.

Recommended panel sections:

1. Digital Recognition
2. Physical Rewards / Merchandise
3. Registration Packages
4. Category-Specific Rewards
5. Delivery and Claiming Fees
6. Special Reward Benefits
7. Rewards Claiming Notes

### Digital Recognition

Fields:

| Field | Purpose |
|---|---|
| Digital Badge | Enable digital badge reward |
| Digital Finisher Certificate | Enable certificate reward |
| Leaderboard Recognition | Enable leaderboard recognition |

Suggested fields:

```js
digitalBadgeEnabled: Boolean,
digitalCertificateEnabled: Boolean,
leaderboardRecognitionEnabled: Boolean
```

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

Suggested UI:

```text
Rewards and Merchandise

Digital Recognition
[ ] Digital Badge
[ ] Digital Finisher Certificate
[ ] Leaderboard Recognition

Physical Rewards / Merchandise
[ ] This event includes physical rewards or merchandise

If checked, show:

[ ] Medal
    Medal Amount: ₱_____

[ ] Shirt
    Shirt Amount: ₱_____

[ ] Patch
    Patch Amount: ₱_____

[ ] Towel
    Towel Amount: ₱_____

[ ] Finisher Kit
    Finisher Kit Amount: ₱_____

[ ] Other Merchandise
    Item Name: __________
    Amount: ₱_____
    [ + Add another item ]

Physical Rewards Description
[ textarea ]

Rewards Claiming Notes
[ textarea ]
```

Suggested fields:

```js
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

### Registration Packages

Some virtual and onsite events use package-based pricing instead of one flat registration fee.

Examples:

- Medal Only
- Medal + Shirt
- Medal + Shirt + Towel
- Medal + Shirt + Patch
- Finisher Kit

The sample virtual run events show this pattern clearly. Runners do not only select a distance. They also select a reward package.

Example price options:

```text
Early Bird Rate
- Medal Only: ₱595
- Medal + Shirt: ₱1,095
- Medal + Shirt + Towel: ₱1,595

Regular Rate
- Medal Only: ₱695
- Medal + Shirt: ₱1,195
- Medal + Shirt + Towel: ₱1,695
```

Required fields:

| Field | Purpose |
|---|---|
| Package Name | Example: Medal Only |
| Included Items | Medal, shirt, towel, patch, finisher kit, custom items |
| Pricing Periods | Early bird, regular, late, or custom periods |
| Notes | Optional package-specific description |

Suggested structure:

```js
registrationPackages: [
  {
    name: "Medal Only",
    includedItems: {
      medal: true,
      shirt: false,
      towel: false,
      patch: false,
      finisherKit: false,
      otherItemNames: []
    },
    pricingPeriods: [
      {
        label: "Early Bird",
        code: "early_bird",
        startAt: "2026-05-01T00:00:00+08:00",
        endAt: "2026-05-15T23:59:59+08:00",
        amount: 595
      },
      {
        label: "Regular",
        code: "regular",
        startAt: "2026-05-16T00:00:00+08:00",
        endAt: "2026-06-08T23:59:59+08:00",
        amount: 695
      }
    ],
    notes: "Includes finisher medal."
  },
  {
    name: "Medal + Shirt",
    includedItems: {
      medal: true,
      shirt: true,
      towel: false,
      patch: false,
      finisherKit: false,
      otherItemNames: []
    },
    pricingPeriods: [
      {
        label: "Early Bird",
        code: "early_bird",
        amount: 1095
      },
      {
        label: "Regular",
        code: "regular",
        amount: 1195
      }
    ],
    notes: "Includes finisher medal and official event shirt."
  },
  {
    name: "Medal + Shirt + Towel",
    includedItems: {
      medal: true,
      shirt: true,
      towel: true,
      patch: false,
      finisherKit: false,
      otherItemNames: []
    },
    pricingPeriods: [
      {
        label: "Early Bird",
        code: "early_bird",
        amount: 1595
      },
      {
        label: "Regular",
        code: "regular",
        amount: 1695
      }
    ],
    notes: "Includes finisher medal, official event shirt, and towel."
  }
]
```

Recommended UI:

```text
Registration Packages

[ + Add Package ]

Package Name: Medal Only
Included Items:
[ ] Medal
[ ] Shirt
[ ] Towel
[ ] Patch
[ ] Finisher Kit
[ ] Other Item

Pricing:
Early Bird: ₱_____
Regular: ₱_____
Late Registration: ₱_____

[ + Add Pricing Period ]
[ Duplicate Package ]
[ Remove Package ]
```

Validation:

- Paid package-based events should have at least one package.
- Each package should have at least one pricing period.
- Package pricing periods should not overlap.
- Package pricing periods should fall within the registration window.
- Package amount must be zero or higher.
- Package name should be unique within the event.
- If package contains custom items, each custom item should have a name.

### Delivery and Claiming Fees

Some virtual events charge a separate delivery fee for physical entitlements.

Example:

```text
Plus ₱100 delivery fee
International runners are welcome, but a valid Philippine address is required for delivery.
```

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

Recommended UI:

```text
Delivery and Claiming

[ ] This event has delivery or claiming instructions

Claiming Method:
( ) Delivery only
( ) Pickup only
( ) Delivery or pickup

Delivery Fee: ₱_____

[ ] Require delivery address
[ ] Require Philippine delivery address
[ ] Allow international runners

Delivery / Claiming Notes:
[ textarea ]
```

Validation:

- If delivery fee is enabled, delivery fee amount must be zero or higher.
- If claiming method is delivery, delivery address should be required during runner registration.
- If Philippine address is required, runner registration should collect or validate the required address fields.

### Special Reward Benefits

Some events offer time-limited benefits tied to registration or completion.

Examples:

- Free name engraving until May 30
- Free medal engraving until May 31
- Early bird shirt inclusion
- Sponsor-covered delivery

Suggested fields:

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

Recommended UI:

```text
Special Reward Benefits

[ + Add Benefit ]

Title: Free Medal Engraving
Description: Free medal engraving is available until May 31, 2026.
Valid Until: May 31, 2026
Applies To: All packages / Selected packages
```

Validation:

- Benefit title is required when a benefit is added.
- `validUntil` should fall within a reasonable event or registration timeline.
- If benefit applies only to selected packages, selected package names should exist.

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

Recommended behavior:

- Let organizers apply global rewards to all categories.
- Let organizers override rewards per race category.
- Use category-specific rewards when the event uses different inclusions per distance.

Suggested structure:

```js
raceCategories: [
  {
    distanceName: "10K",
    includedRewards: {
      medal: true,
      shirt: true,
      patch: true,
      finisherKit: false,
      otherItemNames: ["Sticker Pack"]
    }
  }
]
```

---

## Fees and Payment Panel

Purpose:

Summarize pricing and configure how runners will pay.

This panel should appear after Rewards and Merchandise.

Reason:

The system can suggest a total event fee after the organizer defines race categories, pricing periods, and merchandise inclusions.

### Fees and Payment Sections

Recommended sections:

1. Pricing Summary
2. Suggested Fee Calculation
3. Final Fee Setup
4. Payment Acceptance

### Pricing Summary

For same-fee events:

```text
Same fee for all participants: ₱500
```

For per-distance events:

```text
5K: ₱500
10K: ₱750
21K: ₱1,200
```

For per-distance and period events:

```text
5K
- Early Bird: ₱500
- Regular: ₱650
- Late Registration: ₱750

10K
- Early Bird: ₱750
- Regular: ₱900
- Late Registration: ₱1,000
```

For package-based events:

```text
Medal Only
- Early Bird: ₱595
- Regular: ₱695

Medal + Shirt
- Early Bird: ₱1,095
- Regular: ₱1,195

Medal + Shirt + Towel
- Early Bird: ₱1,595
- Regular: ₱1,695

Delivery Fee: ₱100
```

### Suggested Fee Calculation

Use this for events where the organizer wants a computed suggestion.

```text
Suggested Event Fee

Base Registration Fee: ₱_____
Medal: ₱_____
Shirt: ₱_____
Patch: ₱_____
Towel: ₱_____
Finisher Kit: ₱_____
Other Merchandise: ₱_____
Delivery Fee: ₱_____
Suggested Total: ₱_____
```

Suggested calculation:

```text
Suggested Total =
Base Registration Fee
+ Medal Amount
+ Shirt Amount
+ Patch Amount
+ Finisher Kit Amount
+ Other Merchandise Amounts
```

The organizer should still be allowed to override the suggested amount.

Example:

```text
Suggested Total: ₱650
Final Event Fee: ₱699
```

Possible reasons for override:

- Platform fee
- Payment processing cost
- Packaging cost
- Delivery subsidy
- Discounted bundle pricing
- Sponsor-covered item
- Organizer margin
- Manual promotion

### Final Fee Setup

Fields:

| Field | Purpose |
|---|---|
| Fee Mode | Free or paid |
| Pricing Mode | Free, same fee, per distance, per distance period |
| Currency | Example: PHP |
| Final Event Fee | Used only for same-fee mode |
| Final Category Prices | Used for per-distance or per-distance-period pricing |

### Payment Acceptance

Fields:

| Field | Purpose |
|---|---|
| Payment QR Image | Required for paid events before submit-for-review |
| Payment Account Name | Optional account holder name |
| Payment Instructions | Payment steps for runners |

Current rule:

- Paid drafts can save without a QR image.
- Submit-for-review requires a payment QR image for paid events.

### Payment Amount Logic During Runner Registration

For same-fee events:

```text
Fee Mode + Event Fee = Amount to Pay
```

For per-distance events:

```text
Selected Race Category = Amount to Pay
```

For per-distance and period events:

```text
Selected Race Category + Current Registration Date = Active Price
```

Example:

```text
Runner selects: 10K
Registration date: May 20, 2026
Active pricing period: Regular
Amount to pay: ₱900
```

For package-based virtual events:

```text
Selected Registration Package + Current Registration Date + Delivery Fee = Amount to Pay
```

Example:

```text
Runner selects: Medal + Shirt + Towel
Registration date: May 20, 2026
Active pricing period: Regular
Package amount: ₱1,695
Delivery fee: ₱100
Amount to pay: ₱1,795
```

For complex onsite or hybrid events:

```text
Selected Race Category + Selected Registration Package + Current Registration Date + Delivery Fee = Amount to Pay
```

---

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

This is where organizers can describe a `100K Progress Run` or `2026K Accumulated Run Challenge` without forcing everything into the short description.

---

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
- Local uploaded files may not appear in GET-query previews until preview architecture improves.

---

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

---

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

---

## Sticky Action Bar

Suggested action bar:

```text
Save Draft | Preview Event | Submit for Review
```

Behavior:

| Action | Behavior |
|---|---|
| Save Draft | Requires title only |
| Preview Event | Shows realistic event preview |
| Submit for Review | Requires full validation |

Design requirement:

- Use the project-wide `/login` button treatment:
  - 12px radius
  - Poppins 600
  - no uppercase
  - no letter spacing
  - inline-flex icon and label where useful
  - consistent hover and disabled states

---

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

---

## Admin Review Feedback Requirements

Admin review should not only approve or reject an event. It should also provide feedback to organizers.

Suggested fields:

```js
adminReviewStatus: "pending" | "approved" | "rejected",
adminReviewNotes: String,
reviewedBy: ObjectId,
reviewedAt: Date
```

Recommended behavior:

- Submit-for-review sets status to `pending_review`.
- Admin approval sets status to `approved` or `published`.
- Admin rejection sets status to `rejected`.
- Rejected events should display review notes to the organizer.
- Organizers should be able to edit and resubmit rejected events.

---

## Paid Registration Follow-up Requirements

Current scope:

- Organizer can configure paid event settings during event creation.
- Runner payment proof enforcement is deferred to a follow-up phase.

Future paid registration behavior:

- Paid events should require payment proof after runner registration.
- Runner registration should remain pending until payment proof is approved.
- Organizers or admins should review payment proofs.
- Only approved paid registrations should appear as confirmed participants.
- The amount to pay should be derived from the active event pricing rule.
- For onsite events, selected race category and active pricing period should determine the amount.
- For package-based events, selected registration package and active pricing period should determine the amount.
- For events with delivery fees, delivery fee should be added to the resolved amount when applicable.
- For virtual same-fee events, the event-level fee should determine the amount.

Suggested registration states:

```text
registered_pending_payment
payment_submitted
payment_approved
payment_rejected
confirmed
cancelled
```

---

## Digital Badge Requirements

Digital badges should support HelloRun’s achievement-based recognition direction.

Requirements:

- Event-level badge template can be configured by organizer or generated by the system.
- Badge unlocks when completion requirements are met.
- Badge should be viewable from the runner dashboard.
- Badge should be downloadable as an image.
- Badge should be shareable through a public achievement page.
- Badge should include:
  - event name
  - runner name
  - distance or challenge target
  - completion date
  - HelloRun branding
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

---

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
| Screenshot proof | Partially supported by proofTypesAllowed |
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

## Proposed Create-Event Roadmap

### Near-Term Documentation and Form Polish

- [DONE] Clean create/edit-event encoding artifacts.
- [DONE] Add create-event-specific regression coverage for focused route and static view checks.
- [DONE] Improve draft-vs-publish expectations in product copy.
- [DONE] Allow incomplete draft saves with title-only minimum.
- [DONE] Focus the Core Details panel on create/edit event page load.
- [DONE] Update create/edit event panel order:
  - Core Details
  - Schedule
  - Location
  - Virtual Rules
  - Rewards, Merchandise, and Registration Packages
  - Fees and Payment
  - Event Details
  - Branding and Media
  - Waiver
- [DONE] Add organizer-facing preview/details summaries for Event Details, fee setup, rewards, packages, delivery, and benefits.
- [TODO] Add Race Categories and Distance Pricing panel before Virtual Rules when that feature is implemented.
- [TODO] Improve public-style preview beyond the current configuration snapshot.
- [TODO] Add admin review notes display for rejected events.
- [TODO] Add event visibility rules to UI copy and backend status handling where needed.

### Create-Event Field Expansion

- [DONE] Add structured virtual completion settings.
- [DONE] Add accumulated distance draft setup settings.
- [DONE] Add accepted activity type draft setup settings.
- [DONE] Add final submission deadline draft setup.
- [TODO] Add optional review and certificate release dates.
- [DONE] Add milestone configuration draft setup.
- [DONE] Add recognition and leaderboard mode draft setup.
- [DONE] Add full editable Event Details content, stored internally as eventDetailsMarkdown.
- [DONE] Add 2026K accumulated challenge default create-event content.
- [DONE] Add free/paid event fee configuration.
- [DONE] Add paid-event payment QR/account/instruction configuration.
- [DONE] Add structured digital and physical reward configuration.
- [DONE] Add physical reward amount fields for medal, shirt, patch, towel, and finisher kit.
- [DONE] Add custom merchandise item entries with name and amount.
- [DONE] Add initial fixed-row support for other merchandise entries.
- [DONE] Add registration package configuration.
- [DONE] Add package-based pricing periods for early bird, regular, and late package rates.
- [DONE] Add towel as a common physical reward option.
- [DONE] Add delivery fee configuration.
- [DONE] Add claiming method configuration.
- [DONE] Add special reward benefits such as free engraving.
- [DONE] Add organizer-facing suggested event fee calculation based on selected rewards, merchandise, packages, and delivery fees.
- [TODO] Add race categories.
- [TODO] Add per-distance pricing.
- [TODO] Add early bird, regular, and late registration pricing periods.
- [TODO] Add category-specific reward inclusions.
- [DONE] Add organizer-facing pricing summary in Fees and Payment panel.

### Backend Feature Expansion for Accumulated Virtual Runs

- [DONE] Add activity-level submission persistence.
- [DONE] Add progress rollup helpers.
- [TODO] Add runner progress UI.
- [DONE] Add organizer review queue support for activity-level proofs.
- [DONE] Add certificate eligibility logic based on approved accumulated distance.
- [DONE] Add leaderboard views for finishers and top total distance.
- [TODO] Add badge unlock logic for milestones and completion.

### Backend Feature Expansion for Onsite and Hybrid Pricing

- [DONE] Add V1 `pricingMode` support for organizer setup: `free`, `same_fee`, and `package_period`.
- [TODO] Add `raceCategories[]` model support.
- [TODO] Add `raceCategories[].pricingPeriods[]`.
- [TODO] Add active price resolver based on selected race category, selected package, registration date, and delivery fee.
- [TODO] Add pricing validation for non-overlapping pricing periods.
- [TODO] Add registration amount snapshot when runner registers.
- [TODO] Add payment proof amount matching or admin review support.
- [TODO] Add category capacity tracking.

### Deferred or Separate Roadmap Items

- Runner paid-event registration should require payment proof after signup/registration in a dedicated follow-up.
- Full merchandise shop and add-on checkout should remain aligned with the shop/merchandise phase.
- Payment gateway support should remain aligned with payment gateway planning.
- Onsite result import, bib assignment, race kit claiming, and check-in fields should remain in onsite operations planning.
- Shipping fee automation should remain separate unless needed for the first paid event release.

---

## Proposed Data Model Additions

### Event Pricing Fields

```js
feeMode: "free" | "paid",

pricingMode: "free" | "same_fee" | "package_period" | "per_distance" | "per_distance_period",

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

### Same Fee

Use `finalEventFee`.

```text
Amount to Pay = finalEventFee
```

### Per Distance

Use selected race category fee.

```text
Amount to Pay = selectedRaceCategory.baseRegistrationFee
```

### Per Distance and Registration Period

Use selected race category and active pricing period.

```text
Amount to Pay =
selectedRaceCategory.pricingPeriods.find(period =>
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
Package amount: ₱1,195
Delivery fee: ₱100
Amount to pay: ₱1,295
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

If the organizer changes the price later, the runner’s registered amount should not unexpectedly change.

---

## Acceptance Checklist

### Documentation Acceptance

- [x] `docs/create_event.md` exists and is linked from `docs/PRD.md`.
- [x] Current create-event behavior is summarized.
- [x] Existing route, view, model, and test surfaces are referenced.
- [x] 100K Progress Run requirements are mapped to supported and missing fields.
- [x] Accumulated virtual run is documented as a feature gap requiring backend changes.
- [x] Event visibility rules are documented.
- [x] Admin review feedback requirements are documented.
- [x] Paid registration follow-up requirements are documented.
- [x] Digital badge requirements are documented.
- [x] Accumulated leaderboard display requirements are documented.
- [x] Rewards and merchandise pricing is documented.
- [x] Registration package pricing is documented.
- [x] Delivery and claiming fee setup is documented.
- [x] Special reward benefits are documented.
- [x] Per-distance pricing is documented.
- [x] Early bird, regular, and late registration pricing is documented.

### Future Implementation Acceptance

#### General Event Creation

- [x] Organizer can create a draft event with title only.
- [x] Organizer can submit a complete event for admin review.
- [x] Admin can approve or reject submitted events.
- [ ] Rejected events show admin review notes.
- [x] Approved events appear publicly.
- [ ] Draft and rejected events do not appear publicly.

#### Virtual and Accumulated Events

- [x] Organizer can configure a standard single-activity virtual run.
- [x] Organizer can configure an accumulated-distance virtual challenge.
- [x] Runner can submit multiple activity proofs for accumulated events.
- [x] Pending and rejected activities do not count toward progress.
- [x] Approved activity distance controls progress and completion.
- [x] Certificate eligibility is based on approved total distance reaching the target.
- [x] Leaderboard can show completion-based finishers and optional total-distance ranking.
- [x] 100K/2026K-style progress-run content can be represented without placing core rules only in the short description.

#### Pricing and Payment

- [x] Organizer can configure free events.
- [x] Organizer can configure same-fee paid events.
- [ ] Organizer can configure per-distance pricing.
- [ ] Organizer can configure per-distance and registration-period pricing.
- [ ] Organizer can configure early bird, regular, and late registration prices.
- [x] Organizer can configure package-based pricing such as Medal Only, Medal + Shirt, and Medal + Shirt + Towel.
- [x] Organizer can configure delivery fee.
- [x] Organizer can configure claiming method.
- [x] Organizer can configure special reward benefits such as free engraving.
- [ ] System can resolve the active price based on race category, package, registration date, and delivery fee.
- [ ] Runner registration stores an amount snapshot.
- [x] Organizer can configure payment QR/account details for paid events.
- [ ] Paid runner registration requires payment proof during the signup/payment step.

#### Rewards and Merchandise

- [x] Organizer can configure digital badges.
- [x] Organizer can configure digital certificates.
- [x] Organizer can configure leaderboard recognition.
- [x] Organizer can configure medal, shirt, patch, towel, and finisher kit.
- [x] Organizer can enter amount for medal, shirt, patch, towel, and finisher kit.
- [x] Organizer can add custom merchandise with name and amount.
- [x] Organizer can add multiple custom merchandise items.
- [x] System can suggest event fee based on selected rewards, merchandise, registration packages, and delivery fees.
- [x] Organizer can override suggested event fee.
- [ ] Organizer can configure category-specific reward inclusions.

---

## Open Product Decisions

- [DECIDED] Draft events may be incomplete, with title as the minimum required field.
- [DECIDED] Accumulated virtual run is represented by a separate virtual event format field.
- [DECIDED] Event creation stores paid event payment acceptance data first. Runner paid-registration enforcement is a follow-up phase.
- [DECIDED] Rewards, Merchandise, and Registration Packages should appear before Fees and Payment because merchandise and package options can affect suggested pricing.
- [DECIDED] Package-based pricing should be supported for events that offer options such as Medal Only, Medal + Shirt, and Medal + Shirt + Towel.
- [DECIDED] Delivery fee should be a separate configurable fee, not only text inside Event Details.
- [DECIDED] Special reward benefits such as free engraving should be configurable as optional event benefits.
- [DECIDED] Organizer setup V1 treats reward item amounts as organizer pricing inputs, not public checkout line items.
- [DECIDED] Organizer setup V1 uses independently configured package prices rather than deriving package prices from item cost fields.
- [DECIDED] Organizer setup V1 uses one flat delivery fee.
- [DECIDED] Organizer setup V1 keeps special reward benefits informational; they do not automatically apply during runner registration yet.
- [DECIDED] Onsite events should support per-distance pricing.
- [DECIDED] Onsite events should support early bird, regular, and late registration pricing.
- [RECOMMENDED] For onsite events, `per_distance_period` should be the default pricing mode.
- [RECOMMENDED] For virtual accumulated events, same-fee pricing should be the default, with optional pricing periods later.
- [RECOMMENDED] For accumulated events, approved distance should continue counting beyond the target if leaderboard mode includes top total distance.
- [RECOMMENDED] Certificates should unlock only after the runner reaches the target distance through approved activities.
- [RECOMMENDED] Badges should unlock at milestones and/or final completion depending on event configuration.
- [OPEN] Should final submission deadline default to `virtualWindow.endAt`, `eventEndAt`, or be a required separate field for accumulated events?
- [OPEN] Should activities above the target distance continue to count in all leaderboard modes or only in top-total-distance mode?
- [OPEN] Should certificates issue immediately on completion or only after an event-level certificate release date?
- [OPEN] Should milestones be purely display/progress markers, or should they generate notifications/badges?
- [OPEN] Should accepted activity types be organizer-configurable per event, or platform-fixed for virtual runs?
- [OPEN] Should merchandise amounts eventually appear publicly in runner price breakdowns?
- [OPEN] Should package prices eventually support auto-calculation from individual merchandise item costs?
- [OPEN] Should delivery fees eventually vary by location?
- [OPEN] Should shipping or claiming fee be a separate field or part of custom merchandise? Current recommendation is separate field.
- [OPEN] Should category-specific reward inclusions override global reward settings or merge with them?
- [OPEN] Should special reward benefits automatically apply during registration in a later checkout release?

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
8. Add paid registration payment proof enforcement against the resolved amount.
9. Improve runner accumulated progress UI.
10. Add optional review-period and certificate-release date fields.
11. Add badge unlock logic for milestones and completion.

This keeps the implementation practical.

Organizer setup V1 is complete. The next pricing risk is runner-facing price resolution, especially when event category, package, registration period, and delivery fee can combine.
