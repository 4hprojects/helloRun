# HelloRun Create Event Wizard Implementation Guide

## Implementation Status (May 12, 2026)

### What has been built

The 12-step guided wizard structure is live at `/organizer/create-event` and `/organizer/events/:id/edit`.

**Navigation surfaces built:**
- Desktop: collapsible sidebar step list (12 steps)
- Tablet: horizontally scrollable `.wizard-pills-bar` with pill buttons
- Mobile: sticky `.wizard-mini-strip` with step counter, title, progress bar, and chevron toggle
- Mobile overlay: full-page `.wizard-nav-overlay` with backdrop, close button, and all 12 step links
- All surfaces sync via `setActiveWizardStep()` JS function

**Edit-event wizard alignment built:**
- Organizer edit pages now use the same 12-step builder navigation and responsive wizard surfaces as create-event.
- Edit mode keeps existing event values, existing media previews, and immediate media removal behavior.
- Draft edit pages expose `Save Changes`, `Preview`, and `Submit for Review`.
- Published and pending-review edit pages expose `Save Changes` and `Preview`, but hide the draft submit action.
- Draft submit from edit validates publish-readiness, saves changes, and transitions the event to `pending_review`.

**Steps implemented (Step 1–12 all present in the form):**
- Step 7 (Pricing): supports `free`, `per_distance`, `per_distance_period` modes; late fee column with optional tooltip
- Step 8 (Payment Setup): separate step for QR upload + account name + instructions; QR upload uses full drag-and-drop `upload-area` pattern
- Step 9 (Event Details): Quill editor; eraser button right-aligned inline with label via `.waiver-label-row`
- Step 11 (Waiver): Quill editor with organizer/event placeholders, reset to default, live preview
- Step 12 (Review): JS-populated readiness checklist; preview button opens `/organizer/preview-event`; adaptive action buttons

**UI patterns in use:**
- `upload-area` drag/drop with `upload-placeholder` and `upload-preview` for logo, banner, poster, QR
- `subsection-toolkit` accordion for Delivery & Fulfilment fields
- `.btn-adaptive`: icon+label on desktop ≥1025px; 2.5rem icon squares with hover tooltip on ≤1024px
- `.action-btn-group` inside `.actions`: always single-row, right-aligned at all breakpoints
- `.waiver-label-row`: label left, toolbar button right, same flex row
- `field-help-icon` `?` tooltips on optional/conditional fields

**Defaults set in `getBlankCreateEventDefaults()`:**
- `requiresDeliveryAddress: '1'`, `requiresPhilippineDeliveryAddress: '1'`, `internationalRunnersAllowed: '0'`

### What is still pending from the spec

- Race categories repeatable card UI (Step 5) — currently uses existing distance preset fields
- Per-distance pricing table (Step 7) — currently uses existing flat fee field
- Conditional field visibility by event type (virtual/onsite/hybrid) — partially implemented
- Pricing period date validation (non-overlapping, within registration window)
- Preview step full summary cards

---

## Document Purpose

This document provides a complete implementation guide for improving the HelloRun organizer create-event workflow at:

```text
/organizer/create-event
```

The goal is to convert the create-event page from a long, overwhelming form into a guided event builder that walks organizers through the event setup process step by step.

This guide focuses on:

- Event type selection
- Free event and paid event setup
- Distance-based pricing as the primary paid event model
- Early bird, regular, and late registration fees per distance
- Rewards and inclusions per distance or category
- Payment setup
- Draft saving
- Submit-for-review validation
- Event preview before submission

This document should be used as a working implementation reference for VS Code Codex and future development tasks.

---

## Recommended File Placement

Place this file at:

```text
docs/create_event_wizard_codex_implementation.md
```

Then add a short reference in:

```text
docs/create_event.md
docs/PRD.md
```

Suggested reference text:

```md
## Guided Create Event Wizard

The detailed implementation plan for improving the organizer create-event workflow is documented in:

`docs/create_event_wizard_codex_implementation.md`

This guide covers the step-by-step wizard flow, conditional fields, free and paid event handling, distance-based pricing, early bird pricing, regular pricing, late registration fees, payment setup, preview, and submit-for-review validation.

For the simplified MVP pricing direction, also read:

`docs/create_event_wizard_pricing_update.md`
```

---

## Main Implementation Goal

Build a guided create-event wizard for organizers.

The wizard should help organizers create virtual, onsite, and hybrid running events without being overwhelmed by fields that do not apply to their event type.

The wizard should:

- Show one logical step at a time.
- Use event type to control which fields appear.
- Separate pricing setup from payment setup.
- Support free events.
- Support paid events.
- Support per-distance pricing as the default paid event model.
- Support per-distance pricing with early bird, regular, and late registration periods.
- Allow incomplete draft saving.
- Require full validation only when submitting for admin review.
- Preserve existing backend behavior where possible.
- Preserve existing model fields and route behavior unless this document explicitly says otherwise.
- Improve helper text, section ordering, and preview before submission.

Supported MVP pricing modes:

```text
free
per_distance
per_distance_period
```

Postponed pricing modes (add after MVP is stable):

```text
same_fee
package_based
package_period
```

---

## Current Source Files to Review First

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
docs/create_event.md
```

If any filename differs in the repository, find the nearest matching file and continue.

---

## Current Behavior to Preserve

Preserve these behaviors:

- Approved organizers can access `/organizer/create-event`.
- Organizers can save events as drafts.
- Drafts require only a valid title.
- Organizers can submit complete events for admin review.
- Paid drafts can save without payment QR.
- Paid events submitted for review require payment QR.
- Free events should not require payment QR.
- Admin approval controls public publishing.
- Event details continue to use `eventDetailsMarkdown` internally.
- Waiver content continues to be sanitized server-side.
- Accumulated virtual runs continue using activity-level submissions and rollups.
- Existing organizer route guards should remain unchanged.
- Existing admin review flow should remain unchanged.
- Existing event detail rendering should remain unchanged.

---

## Core UX Principle

The organizer should feel this natural sequence:

```text
What kind of event am I creating?
When will it happen?
Where or how will runners participate?
What can runners join?
What rewards or inclusions will I offer?
Is it free or paid?
How much should runners pay per distance?
How will runners pay?
What rules should runners read?
What will the event look like?
What waiver will runners accept?
Is everything ready for review?
```

This flow matches how organizers usually think.

They do not start with payment.

They start with the event idea, then the runners, then the inclusions, then the price.

---

## Recommended Wizard Flow

Use this order:

```text
Step 1: Event Type
Step 2: Core Event Details
Step 3: Schedule
Step 4: Event Format Setup
Step 5: Race Categories or Challenge Distances
Step 6: Rewards and Inclusions
Step 7: Pricing Per Distance
Step 8: Payment Setup
Step 9: Event Details and Rules
Step 10: Branding and Media
Step 11: Waiver
Step 12: Preview and Submit
```

If a full wizard route implementation is too large for the first version, use collapsible accordion panels with the same order and a sticky progress indicator.

---

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
- Default pricing mode can be per-distance pricing.

If event type is `hybrid`:

- Show both location and virtual rules.
- Show race categories.
- Allow both onsite and virtual participation details.

---

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
At least one race distance or custom distance is required unless race categories are used.
```

### Recommended Behavior

- Organizer name may default from the account owner.
- Short description should be used for event cards.
- Full rules should not be placed here.
- Full rules should be entered in Step 9.

---

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

---

## Step 4: Event Format Setup

### Purpose

Ask for details specific to the selected event type.

This step should change based on event type.

---

### Virtual Event Setup

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
targetDistanceKm
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

- Hide target distance.
- Hide accumulated progress rules.
- Show final proof submission requirements.

If `accumulated_distance`:

- Show target distance.
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
screenshot
manual review
activity import
```

For the current HelloRun direction, screenshot-based submission remains the main proof type unless future integrations are added.

---

### Onsite Event Setup

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

---

## Step 5: Race Categories or Challenge Distances

### Purpose

Define what runners can join.

This step supports onsite races, hybrid events, and virtual events with multiple distances or challenge options.

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
```

For pricing periods:

```text
Pricing periods must not overlap.
Pricing periods should fall within the registration window.
```

---

## Step 6: Rewards and Inclusions

### Purpose

Let the organizer define what runners receive before setting the price.

This step must come before Pricing Per Distance.

### Reason

Medals, shirts, towels, finisher kits, and delivery fees affect pricing decisions.

If pricing comes first, the organizer may need to go back and change amounts after adding rewards.

### Main Sections

```text
Digital Recognition
Physical Rewards or Inclusions per Category
Delivery and Claiming
Rewards Claiming Notes
```

---

### Digital Recognition

### Fields

```text
digitalBadgeEnabled
digitalCertificateEnabled
leaderboardRecognitionEnabled
```

### Suggested Helper Text

```text
Digital rewards can be shown on the runner dashboard and may be shared or saved by runners.
```

---

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

### Suggested UI Example

```text
5K Category

Included:
[x] Race bib
[x] Shirt
[ ] Medal
[x] Digital certificate
[x] Digital badge

Notes:
Includes race bib, event shirt, and digital certificate.
```

```text
10K Category

Included:
[x] Race bib
[x] Shirt
[x] Medal
[x] Digital certificate
[x] Digital badge

Notes:
Includes race bib, event shirt, finisher medal, and digital certificate.
```

### Global Reward Fields

Some rewards may apply to the whole event:

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

---

### Delivery and Claiming

### Fields

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

### Suggested Helper Text

```text
Use this section if rewards will be delivered or claimed after the event.
```

### Delivery Fee Example

```text
Delivery Fee: ₱100
Description: Nationwide delivery within the Philippines.
```

---

> **Note:** Package-based pricing is postponed for MVP. Rewards are shown as inclusions per distance or category instead of as separate paid packages.

---

## Step 7: Pricing Per Distance

### Purpose

Define what runners will pay based on their selected distance or race category.

Pricing setup answers this question:

```text
How much should runners pay for each distance or category?
```

This should be separate from payment setup.

Payment setup answers this question:

```text
How will runners pay?
```

---

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

---

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

### Suggested UI Copy

```text
This event is free to join. Runners will not be asked to upload payment proof.
```

### Validation

For free events:

```text
Payment QR is not required.
Payment account name is not required.
Payment instructions are not required.
All category prices should be zero or blank.
```

---

## Paid Event Flow

If the organizer chooses `Paid Event`, show price fields for each distance or race category created in Step 5.

Example:

```text
5K - ₱500
10K - ₱750
21K - ₱1,200
```

The organizer should not need to create packages.

The organizer should only set the price for each distance or category.

---

## Supported MVP Pricing Modes

### 1. Free

Internal mode:

```text
free
```

Use when the event has no registration fee.

---

### 2. Price Per Distance

Internal mode:

```text
per_distance
```

Use when each distance or category has one fixed registration fee.

This is the default paid event pricing mode.

Example:

```text
3K - ₱350
5K - ₱500
10K - ₱750
21K - ₱1,200
```

### Fields

Use race categories from Step 5.

```text
raceCategory
amount
inclusions
```

### Validation

```text
Each paid race category must have an amount.
Amount must be greater than zero.
```

---

### 3. Price Per Distance with Pricing Periods

Internal mode:

```text
per_distance_period
```

Use when each distance or category has early bird, regular, and late registration prices.

Example:

```text
5K
Early Bird: ₱450
Regular: ₱500
Late Registration: ₱600

10K
Early Bird: ₱650
Regular: ₱750
Late Registration: ₱850

21K
Early Bird: ₱1,000
Regular: ₱1,200
Late Registration: ₱1,400
```

### Fields Per Distance

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

### Validation

```text
Pricing periods must not overlap.
Pricing periods must stay within the registration window.
Amounts must be greater than zero.
Each category must have at least one active pricing period.
```

---

## Pricing Periods Toggle

Pricing periods are optional.

The organizer should see a checkbox:

```text
[ ] Add early bird and late registration pricing
```

If unchecked:

```text
Show only Regular Price per distance.
```

If checked:

```text
Show Early Bird, Regular, and Late Registration prices per distance.
```

---

## Suggested Simple Pricing Table

If pricing periods are disabled:

```text
| Category | Regular Price |
|---|---:|
| 3K | ₱350 |
| 5K | ₱500 |
| 10K | ₱750 |
| 21K | ₱1,200 |
```

---

## Suggested Pricing Period Table

If pricing periods are enabled:

```text
| Category | Early Bird | Regular | Late Registration |
|---|---:|---:|---:|
| 3K | ₱300 | ₱350 | ₱400 |
| 5K | ₱450 | ₱500 | ₱600 |
| 10K | ₱650 | ₱750 | ₱850 |
| 21K | ₱1,000 | ₱1,200 | ₱1,400 |
```

---

## Pricing Summary UI

After pricing setup, show a clear summary.

### Per-Distance Example

```text
Pricing Summary

3K: ₱350
5K: ₱500
10K: ₱750
21K: ₱1,200
```

### Per-Distance with Periods Example

```text
Pricing Summary

5K
Early Bird: ₱450
Regular: ₱500
Late Registration: ₱600

10K
Early Bird: ₱650
Regular: ₱750
Late Registration: ₱850
```

---

## How to Handle Same-Fee Events

For MVP, a same-fee event can be handled by creating one general category.

Example:

```text
Category: General Registration
Price: ₱500
```

Do not create a separate `same_fee` mode for MVP.

---

## Postponed Pricing Modes

The following modes are postponed until after the core event creation flow is stable:

```text
same_fee — use one general category instead
package_based — rewards shown as inclusions per category for now
package_period — postponed with package_based
```

---

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
```

For paid drafts:

```text
Payment QR may be missing.
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

---

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

Public page reference:

```text
docs/public_event_page_template.md
```

Implementation note:

- The field is still named `eventDetailsMarkdown` internally.
- The organizer editor stores Quill rich HTML.
- The public `/events/:slug` renderer sanitizes rich HTML directly when the saved value looks like HTML, with markdown fallback for older content.
- Structured fields should drive public summary sections first; Event Details should provide the long-form explanation.

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

### Suggested Markdown Starter Template

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

Explain fees, packages, and pricing periods.

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

---

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
```

### Recommended Priority

```text
Uploaded file should take priority over URL.
```

### Suggested Helper Text

```text
Use the banner for the event page and the poster for promotional sharing.
```

---

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

### Draft Behavior

```text
Drafts may use incomplete waiver content.
```

### Submit-for-Review Behavior

```text
Waiver must meet minimum content requirements.
```

---

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
[ ] Event details
[ ] Valid waiver
```

---

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
| Pricing Per Distance | Show | Show | Show |
| Payment | Show if paid | Show if paid | Show if paid |
| Event Details | Show | Show | Show |
| Media | Show | Show | Show |
| Waiver | Show | Show | Show |
| Preview | Show | Show | Show |

---

## Pricing Mode Visibility Matrix

| Pricing Mode | Free Event | Paid Event | Race Categories Needed | Pricing Periods Needed | MVP Status |
|---|---:|---:|---:|---:|---:|
| free | Show | Hide | No | No | Supported |
| per_distance | Hide | Show | Yes | No | Supported |
| per_distance_period | Hide | Show | Yes | Yes | Supported |
| same_fee | Hide | Postponed | No | No | Postponed |
| package_based | Hide | Postponed | No | No | Postponed |
| package_period | Hide | Postponed | No | Yes | Postponed |

---

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

---

## Submit-for-Review Validation

Submit-for-review should require a complete public-ready event.

Required for all events:

```text
Title
Description
Event type
Schedule
At least one race category or challenge distance
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
Each race category must have a valid price.
Payment QR is required.
Payment account name is required.
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

---

## Conditional Logic Summary

### Event Type Logic

```text
If virtual:
- Hide location.
- Show virtual rules.
- Show challenge distance fields.
- Race categories are optional.

If onsite:
- Show location.
- Hide virtual rules.
- Show race categories.
- Default pricing mode can be per_distance_period.

If hybrid:
- Show location.
- Show virtual rules.
- Show race categories.
```

### Fee Logic

```text
If free:
- Hide payment setup.
- Set fee amount to zero.
- Hide pricing periods.
- Hide payment proof instructions.

If paid:
- Show pricing mode selection.
- Show payment setup.
- Require payment QR only when submitting for review.
```

### Pricing Period Logic

```text
If pricing mode uses periods:
- Show early bird, regular, and late registration sections.
- Validate dates against registration window.
- Prevent overlapping periods.

If pricing mode does not use periods:
- Show simple amount fields only.
```

### Package Logic

Package-based pricing is postponed for MVP.

Rewards are shown as inclusions per distance or category.

Do not show package pricing fields until package-based pricing is implemented in a later phase.

---

## Recommended Implementation Sequence

Implement in small safe increments.

---

## Phase 1: UI Reordering and Step Structure

### Goal

Improve the user flow without changing the database model.

### Tasks

```text
Reorder the create-event form using the recommended wizard flow.
Add progress indicator or sidebar step list.
Preserve existing form fields and names.
Keep Save Draft behavior unchanged.
Keep Submit for Review behavior unchanged.
Do not add new database fields yet unless required.
```

### Expected Result

The organizer sees a guided structure instead of one long form.

---

## Phase 2: Conditional Field Display

### Goal

Show only the fields that apply to the organizer’s event.

### Tasks

```text
Show or hide location based on event type.
Show or hide virtual rules based on event type.
Show or hide payment setup based on free or paid selection.
Show or hide pricing period fields based on pricing mode.
Show or hide package fields based on package-based pricing.
```

### Expected Result

Organizers are not distracted by irrelevant fields.

---

## Phase 3: Draft vs Submit Validation Messaging

### Goal

Make validation easier to understand.

### Tasks

```text
Keep draft validation title-only.
Add visible validation feedback.
Add setup completeness checklist before submit.
Show missing items clearly.
```

### Expected Result

Organizers know what is missing before submitting for admin review.

---

## Phase 4: Preview Improvements

### Goal

Give organizers confidence before submission.

### Tasks

```text
Improve event card preview.
Improve schedule summary.
Improve pricing summary.
Improve payment summary.
Improve waiver preview.
Prefer preview by draft ID or server-side temporary preview state.
If too large for now, keep current preview behavior and improve summary display.
```

### Expected Result

Organizers can review the event before submitting.

---

## Phase 5: Race Categories and Pricing Expansion

### Goal

Add structured support for onsite and hybrid event pricing.

### Tasks

```text
Add raceCategories[] model support.
Add per-distance pricing (per_distance).
Add early bird, regular, and late pricing periods (per_distance_period).
Add category-specific reward inclusions.
Validate pricing period overlaps.
Validate pricing dates against registration dates.
Add runner-facing price resolver.
Store runner registration price snapshot.
```

### Expected Result

HelloRun can support different prices per race category with optional pricing periods.

---

## Phase 6: Registration Packages Expansion (Postponed)

### Goal

Add structured support for package-based events after the core event creation flow is stable.

### Tasks

```text
Add registrationPackages[] model support.
Allow packages to include medal, shirt, patch, towel, finisher kit, and other items.
Allow package-based pricing (package_based).
Allow package-based early bird, regular, and late pricing (package_period).
Allow package-specific notes.
```

### Expected Result

HelloRun can support virtual events with custom packages.

> **Note:** Do not implement this phase until Phase 5 is stable and the core create-event flow is working.

---

## Phase 7: Runner-Facing Price Resolver

### Goal

Calculate the correct amount during runner registration.

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
System returns Regular Fee: ₱900.
Runner uploads proof for ₱900.
```

### Expected Result

Runners see the correct fee automatically.

---

## Phase 8: Registration Price Snapshot

### Goal

Store the amount shown to the runner at the time of registration.

### Fields to Store

```text
selectedCategory
selectedPackage
basePrice
pricingPeriod
deliveryFee
finalAmountDue
currency
priceResolvedAt
```

### Reason

Prices can change later.

The runner’s payment should be checked against the amount shown during registration, not against a future price.

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
  // free, per_distance, per_distance_period
  // (same_fee, package_based, package_period postponed)
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

## Acceptance Checklist

### General UX

```text
[ ] Organizer sees a guided create-event flow.
[ ] Event Type is the first major decision.
[ ] Fields that do not apply are hidden.
[ ] Save Draft is available throughout the flow.
[ ] Submit for Review shows required missing items.
[ ] User can preview before submission.
[ ] Pricing setup and payment setup are separate steps.
```

### Draft Behavior

```text
[ ] Draft requires title only.
[ ] Draft can save incomplete schedules.
[ ] Draft can save incomplete pricing.
[ ] Draft can save incomplete media.
[ ] Draft can save incomplete waiver.
[ ] Draft remains private to organizer and admins.
```

### Submit-for-Review Behavior

```text
[ ] Submit validates all publish-ready fields.
[ ] Paid event requires payment QR.
[ ] Free event does not require payment QR.
[ ] Onsite and hybrid events require location.
[ ] Virtual and hybrid events require virtual rules.
[ ] Submitted event moves to admin review.
```

### Conditional Logic

```text
[ ] Virtual event hides location.
[ ] Onsite event hides virtual rules.
[ ] Hybrid event shows both.
[ ] Paid event shows payment setup.
[ ] Free event hides payment setup.
[ ] Accumulated completion mode shows target distance and activity rules.
[ ] Per-distance pricing shows category amount fields.
[ ] Pricing period mode shows early bird, regular, and late registration fields.
[ ] Package-based pricing fields are hidden (postponed).
```

### Pricing

```text
[ ] Free event pricing works.
[ ] Per-distance pricing works.
[ ] Per-distance pricing periods work.
[ ] Delivery fee works.
[ ] Suggested event fee still works if already implemented.
[ ] Final fee override still works if already implemented.
[ ] Package-based pricing is hidden (postponed for later phase).
```

### No Regression

```text
[ ] Existing tests pass.
[ ] Existing organizer route guard still works.
[ ] Existing admin review flow still works.
[ ] Existing accumulated activity submission behavior still works.
[ ] Existing event details rendering still works.
[ ] Existing waiver sanitization still works.
```

---

## Codex Task Prompt for Phase 1 and Phase 2

Use this prompt inside VS Code Codex after placing this file in the repository:

```text
Read docs/create_event_wizard_codex_implementation.md and inspect the current create-event implementation.

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
Read docs/create_event_wizard_codex_implementation.md.

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
Read docs/create_event_wizard_codex_implementation.md.

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
Read docs/create_event_wizard_codex_implementation.md.

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

## Final Recommended Direction

Start with Phase 1 and Phase 2.

Do not immediately add all model changes.

The safest path is:

```text
1. Improve the create-event flow.
2. Add conditional field visibility.
3. Separate pricing setup from payment setup.
4. Improve validation messaging.
5. Improve preview.
6. Add structured race categories.
7. Add structured packages.
8. Add price resolver.
9. Store runner registration price snapshots.
```

This keeps the current system stable while making the organizer experience much easier to use.
