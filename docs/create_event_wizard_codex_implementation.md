# HelloRun Create Event Wizard Implementation Guide

## Document Purpose

This document provides a complete implementation guide for improving the HelloRun organizer create-event workflow at:

```text
/organizer/create-event
```

The goal is to convert the create-event page from a long, overwhelming form into a guided event builder that walks organizers through the event setup process step by step.

This guide focuses on:

- Event type selection
- Free event and paid event setup
- Custom registration packages
- Distance-based pricing
- Early bird, regular, and late registration fees
- Rewards and merchandise setup
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

This guide covers the step-by-step wizard flow, conditional fields, free and paid event handling, package-based pricing, early bird pricing, regular pricing, late registration fees, payment setup, preview, and submit-for-review validation.
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
- Support same-fee pricing.
- Support per-distance pricing.
- Support package-based pricing.
- Support early bird, regular, and late registration fees.
- Allow incomplete draft saving.
- Require full validation only when submitting for admin review.
- Preserve existing backend behavior where possible.
- Preserve existing model fields and route behavior unless this document explicitly says otherwise.
- Improve helper text, section ordering, and preview before submission.

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
What rewards or packages will I offer?
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

---

## Recommended Wizard Flow

Use this order:

```text
Step 1: Event Type
Step 2: Core Event Details
Step 3: Schedule
Step 4: Event Format Setup
Step 5: Race Categories or Challenge Distances
Step 6: Rewards, Merchandise, and Packages
Step 7: Pricing Setup
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

## Step 6: Rewards, Merchandise, and Packages

### Purpose

Let the organizer define what runners receive before setting the final price.

This step must come before Pricing Setup.

### Reason

Medals, shirts, towels, finisher kits, delivery fees, and benefits affect pricing decisions.

If pricing comes first, the organizer may need to go back and change amounts after adding rewards.

### Main Sections

```text
Digital Recognition
Physical Rewards or Merchandise
Registration Packages
Category-Specific Rewards
Delivery and Claiming
Special Reward Benefits
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

### Physical Rewards or Merchandise

### Fields

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

### Suggested UI

```text
[ ] Medal
Amount: ₱____

[ ] Shirt
Amount: ₱____

[ ] Patch
Amount: ₱____

[ ] Towel
Amount: ₱____

[ ] Finisher Kit
Amount: ₱____

[ ] Other Item
Item Name: ______
Amount: ₱____
```

### Notes

The amount can represent:

- Cost included in the package
- Add-on amount
- Organizer reference amount

This should be clarified in the UI once the final pricing model is implemented.

---

### Registration Packages

### Purpose

Support package-based events.

This is useful for virtual events and merchandise-based events.

### Package Examples

```text
Registration Only
Medal Only
Medal + Shirt
Medal + Shirt + Towel
Finisher Kit Package
Premium Package
```

### Fields Per Package

```text
packageName
includedItems
pricingPeriods
packageNotes
isActive
```

### Suggested UI

```text
[ + Add Package ]

Package Name: Medal + Shirt
Included Items:
[x] Medal
[x] Shirt
[ ] Patch
[ ] Towel
[ ] Finisher Kit
[ ] Other

Notes: Includes delivery within the Philippines.

[ Duplicate Package ]
[ Remove Package ]
```

### Future Model Field

```js
registrationPackages: [
  {
    packageName: String,
    includedItems: {
      medal: Boolean,
      shirt: Boolean,
      patch: Boolean,
      towel: Boolean,
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
    notes: String,
    isActive: Boolean
  }
]
```

### Validation

For paid package-based events:

```text
At least one package is required.
Package names must be unique within the event.
Package amounts must be zero or higher.
Package pricing periods must not overlap.
Package pricing periods should fall within the registration window.
```

---

### Pricing Period Defaults for Packages

Suggested default behavior:

```text
Early Bird starts when registration opens.
Early Bird ends 14 days after registration opens.

Regular starts after Early Bird.
Regular ends 7 days before registration closes.

Late Registration starts 7 days before registration closes.
Late Registration ends when registration closes.
```

If the registration window is 21 days or shorter:

```text
Do not auto-fill all three pricing periods.
Show a message that the registration window may be too short for early bird, regular, and late pricing.
Allow the organizer to use a simpler pricing setup.
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

### Special Reward Benefits

### Purpose

Allow organizers to define temporary or package-specific benefits.

### Future Model Field

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

### Example

```text
Free Medal Engraving
Free medal engraving is available until May 31, 2026.
Applies to: Medal + Shirt Package, Premium Package
```

---

## Step 7: Pricing Setup

### Purpose

Define what runners will pay.

Pricing setup answers this question:

```text
How much should runners pay?
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
Optional donation note
Optional merchandise note
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
Fee amount should be zero.
```

---

## Paid Event Flow

If the organizer chooses `Paid Event`, ask:

```text
How do you want to price this event?
```

### Pricing Mode Options

```text
same_fee
per_distance
package_based
per_distance_period
package_period
```

### User-Friendly Labels

```text
Same fee for everyone
Different fee per distance
Package-based pricing
Different fee per distance with early bird, regular, and late registration
Package-based pricing with early bird, regular, and late registration
```

---

## Pricing Mode 1: Same Fee for Everyone

### Best For

```text
Simple virtual runs
Charity fun runs
Single-distance events
Small community events
```

### Fields

```text
feeAmount
feeCurrency
pricingDescription
```

### Example

```text
Registration Fee: ₱500
Includes: Digital certificate and digital badge
```

### Validation

```text
Fee amount is required for paid events.
Fee amount must be greater than zero.
Currency is required.
```

---

## Pricing Mode 2: Different Fee Per Distance

### Best For

```text
Onsite events
Hybrid events
Events with 5K, 10K, and 21K categories
```

### Example

```text
5K: ₱500
10K: ₱750
21K: ₱1,200
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

## Pricing Mode 3: Package-Based Pricing

### Best For

```text
Virtual events with merchandise
Events where runners can choose inclusions
Events with medal-only or shirt packages
```

### Example

```text
Registration Only: ₱300
Medal Only: ₱595
Medal + Shirt: ₱1,095
Medal + Shirt + Towel: ₱1,295
```

### Fields

Use packages from Step 6.

```text
packageName
amount
includedItems
deliveryFee
notes
```

### Validation

```text
At least one package is required.
Each active package must have an amount.
Amount must be greater than zero.
Package names must be unique.
```

---

## Pricing Mode 4: Per Distance with Pricing Periods

### Best For

```text
Onsite races
Hybrid races
Events that reward early registration
```

### Example

```text
5K
Early Bird: ₱500
Regular: ₱650
Late Registration: ₱750

10K
Early Bird: ₱750
Regular: ₱900
Late Registration: ₱1,000
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

## Pricing Mode 5: Package-Based Pricing with Pricing Periods

### Best For

```text
Virtual events with merchandise
Premium virtual challenges
Events with early bird package discounts
```

### Example

```text
Medal Only
Early Bird: ₱595
Regular: ₱695
Late Registration: ₱795

Medal + Shirt
Early Bird: ₱1,095
Regular: ₱1,195
Late Registration: ₱1,295
```

### Fields Per Package

```text
packageName
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
Each package must have at least one active pricing period.
```

---

## Pricing Summary UI

After pricing setup, show a clear summary.

### Same Fee Example

```text
Pricing Summary

Everyone pays: ₱500
Includes: Digital certificate and badge
```

### Per-Distance Example

```text
Pricing Summary

5K: ₱500
10K: ₱750
21K: ₱1,200
```

### Per-Distance with Periods Example

```text
Pricing Summary

5K
Early Bird: ₱500
Regular: ₱650
Late Registration: ₱750

10K
Early Bird: ₱750
Regular: ₱900
Late Registration: ₱1,000
```

### Package-Based Example

```text
Pricing Summary

Medal Only: ₱595
Medal + Shirt: ₱1,095
Medal + Shirt + Towel: ₱1,295

Delivery Fee: ₱100
```

### Package-Based with Periods Example

```text
Pricing Summary

Medal Only
Early Bird: ₱595
Regular: ₱695
Late Registration: ₱795

Medal + Shirt
Early Bird: ₱1,095
Regular: ₱1,195
Late Registration: ₱1,295

Delivery Fee: ₱100
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
Rewards summary
Package summary
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
| Rewards | Show | Show | Show |
| Packages | Show | Optional | Show |
| Pricing | Show | Show | Show |
| Payment | Show if paid | Show if paid | Show if paid |
| Event Details | Show | Show | Show |
| Media | Show | Show | Show |
| Waiver | Show | Show | Show |
| Preview | Show | Show | Show |

---

## Pricing Mode Visibility Matrix

| Pricing Mode | Free Event | Paid Event | Race Categories Needed | Packages Needed | Pricing Periods Needed |
|---|---:|---:|---:|---:|---:|
| free | Show | Hide | No | No | No |
| same_fee | Hide | Show | No | No | No |
| per_distance | Hide | Show | Yes | No | No |
| package_based | Hide | Show | No | Yes | No |
| per_distance_period | Hide | Show | Yes | No | Yes |
| package_period | Hide | Show | No | Yes | Yes |

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
Packages
```

This allows organizers to build events gradually.

---

## Submit-for-Review Validation

Submit-for-review should require a complete public-ready event.

Required:

```text
Title
Description
Event type
Schedule
Race distance or race category
Location for onsite or hybrid events
Virtual rules for virtual or hybrid events
Pricing setup
Payment QR for paid events
Event details
Valid waiver
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

```text
If package-based pricing:
- Require at least one package.
- Show package pricing summary.
- Allow delivery fee if physical rewards are enabled.

If not package-based:
- Hide package pricing fields unless packages are used only as event details.
```

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
Add per-distance pricing.
Add early bird, regular, and late pricing periods.
Add category-specific reward inclusions.
Validate pricing period overlaps.
Validate pricing dates against registration dates.
```

### Expected Result

HelloRun can support different prices per race category.

---

## Phase 6: Registration Packages Expansion

### Goal

Add structured support for package-based events.

### Tasks

```text
Add registrationPackages[] model support.
Allow packages to include medal, shirt, patch, towel, finisher kit, and other items.
Allow package-based pricing.
Allow package-based early bird, regular, and late pricing.
Allow package-specific notes.
```

### Expected Result

HelloRun can support virtual events with custom packages.

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
  hasPackages: false,
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
  // same_fee, per_distance, package_based, per_distance_period, package_period
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
[ ] Same-fee pricing shows one amount field.
[ ] Per-distance pricing shows category amount fields.
[ ] Package-based pricing shows package amount fields.
[ ] Pricing period modes show early bird, regular, and late registration fields.
```

### Pricing

```text
[ ] Free event pricing works.
[ ] Same-fee pricing works.
[ ] Per-distance pricing works.
[ ] Package-based pricing works.
[ ] Per-distance pricing periods work.
[ ] Package-based pricing periods work.
[ ] Delivery fee works.
[ ] Suggested event fee still works if already implemented.
[ ] Final fee override still works if already implemented.
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
