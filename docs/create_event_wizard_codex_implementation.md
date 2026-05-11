# HelloRun Create Event Wizard Implementation Guide

## Purpose

This document gives Codex a clear implementation direction for improving the HelloRun organizer create-event workflow at `/organizer/create-event`.

The goal is to convert the current long create-event form into a more user-friendly guided event builder.

The page should help organizers create virtual, onsite, and hybrid running events step by step without being overwhelmed by fields that do not apply to their event type.

---

## Implementation Goal

Build a guided create-event wizard for organizers.

The wizard should:

- Show one logical step at a time.
- Use event type to control which fields appear.
- Allow incomplete draft saving.
- Require full validation only when submitting for admin review.
- Keep the existing backend behaviour where possible.
- Preserve existing model fields and route behaviour unless this document explicitly says otherwise.
- Improve user guidance, helper text, section ordering, and preview before submission.

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

## Current Behaviour to Preserve

Preserve these behaviours:

- Approved organizers can access `/organizer/create-event`.
- Organizers can save events as drafts.
- Drafts require only a valid title.
- Organizers can submit complete events for admin review.
- Paid drafts can save without payment QR.
- Paid events submitted for review require payment QR.
- Admin approval controls public publishing.
- Event details continue to use `eventDetailsMarkdown` internally.
- Waiver content continues to be sanitized server-side.
- Accumulated virtual runs continue using activity-level submissions and rollups.

---

## Recommended Wizard Flow

Use this order:

```text
Step 1: Event Type
Step 2: Core Details
Step 3: Schedule
Step 4: Location or Virtual Rules
Step 5: Race Categories
Step 6: Rewards and Merchandise
Step 7: Pricing and Payment
Step 8: Event Details
Step 9: Branding and Media
Step 10: Waiver
Step 11: Preview and Submit
```

This flow should replace the feeling of one long form.

If full wizard routing is too large for the first implementation, use collapsible accordion panels with this same order and a sticky progress/sidebar indicator.

---

## Step 1: Event Type

Purpose:

Let the organizer choose the event format first.

Options:

```text
virtual
onsite
hybrid
```

Suggested UI copy:

```text
Choose the type of event you want to create.

Virtual Event
Best for accumulated runs, screenshot-based submissions, and online participation.

Onsite Event
Best for physical races with venue, race categories, and registration fees.

Hybrid Event
Best for events that allow both onsite and virtual participation.
```

Required for submit-for-review.

Event type controls conditional fields in later steps.

---

## Step 2: Core Details

Fields:

- `title`
- `organiserName`
- `description`
- `raceDistancePresets`
- `raceDistanceCustom`

Suggested helper text:

```text
Short Description
Used on event cards and listings. Keep this under two sentences. Full rules belong in Event Details.
```

Validation:

- Draft: `title` required only.
- Submit for review: title, description, event type, and at least one race distance or custom distance required.
- Organizer name may default from the account owner.

---

## Step 3: Schedule

Fields:

- `registrationOpenAt`
- `registrationCloseAt`
- `eventStartAt`
- `eventEndAt`

Validation:

```text
registrationOpenAt <= registrationCloseAt <= eventStartAt <= eventEndAt
```

Suggested helper text:

```text
Registration dates control when runners can join. Event dates control when the activity or race happens.
```

---

## Step 4: Location or Virtual Rules

This step should change based on event type.

### For Onsite Events

Show location fields:

- `venueName`
- `venueAddress`
- `city`
- `province`
- `country`
- `geoLat`
- `geoLng`

Validation:

- Venue name required for onsite and hybrid events.
- City, province, and country required for onsite and hybrid events.
- Latitude and longitude optional.
- If latitude is provided, longitude should also be provided.

### For Virtual Events

Show virtual rules:

- `virtualStartAt`
- `virtualEndAt`
- `proofTypesAllowed`
- `virtualCompletionMode`
- `targetDistanceKm`
- `acceptedRunTypes`
- `finalSubmissionDeadlineAt`
- `recognitionMode`
- `leaderboardMode`
- `leaderboardRecognitionEnabled`

Completion mode options:

```text
single_activity
accumulated_distance
```

Suggested UI copy:

```text
Single Activity
Best for events where runners submit one final run proof.

Accumulated Distance
Best for 50K, 100K, 500K, or 2026K challenges where runners submit multiple activities.
```

Conditional logic:

- If `single_activity`, hide target distance and accumulated progress rules.
- If `accumulated_distance`, show target distance, accepted activity types, final submission deadline, recognition mode, and leaderboard mode.
- Default virtual window start to event start while the field is blank or still auto-filled.
- Default virtual window end to event end while the field is blank or still auto-filled.
- Default final submission deadline to 14 days after event end if blank.

### For Hybrid Events

Show both:

- Location fields
- Virtual rules

---

## Step 5: Race Categories

Show this step for:

- Onsite events
- Hybrid events
- Virtual events with multiple distances or categories

Use repeatable cards.

Suggested UI:

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

Fields per category:

- `distanceName`
- `distanceKm`
- `categoryType`
- `baseRegistrationFee`
- `slotsAvailable`
- `cutoffTime`
- `ageGroup`
- `includedRewards`
- `notes`

Future model field:

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

Validation:

- Onsite and hybrid events should have at least one race category.
- Paid race categories must have an amount.
- Pricing periods must not overlap.
- Pricing periods should fall within the registration window.
- Amounts must be zero or higher.

---

## Step 6: Rewards and Merchandise

This step must come before Pricing and Payment.

Reason:

Medals, shirts, towels, finisher kits, packages, delivery fees, and benefits affect pricing decisions.

Sections:

1. Digital Recognition
2. Physical Rewards or Merchandise
3. Registration Packages
4. Category-Specific Rewards
5. Delivery and Claiming
6. Special Reward Benefits
7. Rewards Claiming Notes

### Digital Recognition

Fields:

- `digitalBadgeEnabled`
- `digitalCertificateEnabled`
- `leaderboardRecognitionEnabled`

### Physical Rewards

Fields:

- `physicalRewardsEnabled`
- `physicalRewardMedalEnabled`
- `physicalRewardMedalAmount`
- `physicalRewardShirtEnabled`
- `physicalRewardShirtAmount`
- `physicalRewardPatchEnabled`
- `physicalRewardPatchAmount`
- `physicalRewardTowelEnabled`
- `physicalRewardTowelAmount`
- `physicalRewardFinisherKitEnabled`
- `physicalRewardFinisherKitAmount`
- `physicalRewardOtherItems`
- `physicalRewardsDescription`
- `physicalRewardsClaimingNotes`

### Registration Packages

Support package-based events.

Examples:

```text
Medal Only
Medal + Shirt
Medal + Shirt + Towel
```

Fields:

- Package name
- Included items
- Pricing periods
- Notes

Suggested pricing date defaults:

- Early Bird starts when registration opens and ends 14 days after registration opens.
- Regular starts after Early Bird and ends 7 days before registration closes.
- Late Registration starts 7 days before registration closes and ends when registration closes.
- If the registration window is 21 days or shorter, avoid auto-filling all three pricing periods because the periods would overlap or leave no regular period.

Validation:

- Paid package-based events should have at least one package.
- Package names should be unique within the event.
- Package amounts must be zero or higher.
- Package pricing periods must not overlap.

### Delivery and Claiming

Fields:

- `deliveryFeeEnabled`
- `deliveryFeeAmount`
- `deliveryFeeDescription`
- `requiresDeliveryAddress`
- `requiresPhilippineDeliveryAddress`
- `internationalRunnersAllowed`
- `claimingMethod`

Claiming method options:

```text
delivery
pickup
both
```

### Special Reward Benefits

Fields:

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

Example:

```text
Free Medal Engraving
Free medal engraving is available until May 31, 2026.
```

---

## Step 7: Pricing and Payment

Purpose:

Summarize pricing and configure how runners will pay.

Pricing modes:

```text
free
same_fee
package_period
per_distance
per_distance_period
```

Recommended defaults:

```text
Virtual accumulated challenge: same_fee or package_period
Standard virtual event: same_fee
Onsite event: per_distance_period
Hybrid event: per_distance_period
```

Fields:

- `feeMode`
- `feeAmount`
- `feeCurrency`
- `pricingMode`
- `suggestedEventFee`
- `finalEventFee`
- `paymentQrImageFile`
- `paymentQrImageUrl`
- `paymentQrImageKey`
- `paymentAccountName`
- `paymentInstructions`

Payment validation:

- Free events do not require payment QR.
- Paid drafts may save without payment QR.
- Paid events submitted for review require payment QR.

Suggested UI summary:

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

For package-based events:

```text
Medal Only
Early Bird: ₱595
Regular: ₱695

Medal + Shirt
Early Bird: ₱1,095
Regular: ₱1,195

Delivery Fee: ₱100
```

---

## Step 8: Event Details

Field:

- `eventDetailsMarkdown`

User-facing label:

```text
Event Details
```

Suggested helper text:

```text
Use this section for full event rules, FAQs, pricing explanation, submission rules, and runner guidance. This content appears on the public event details page.
```

Suggested content blocks:

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
- Delivery or claiming instructions
- Payment instructions
- FAQ
- Contact or support details

---

## Step 9: Branding and Media

Fields:

- `logoFile`
- `logoUrl`
- `bannerImageFile`
- `bannerImageUrl`
- `posterImageFile`
- `posterImageUrl`
- `galleryImageFiles`
- `galleryImageUrlsText`

Recommended image usage:

```text
Logo: Event cards and badges
Banner: Event details page
Poster: Promotional sharing
Gallery: Extra visuals
```

Validation:

- Upload or URL should be accepted.
- If upload and URL are both provided, define one clear priority.

---

## Step 10: Waiver

Field:

- `waiverTemplate`

Current features to preserve:

- Quill rich-text editor
- Default waiver reset
- Organizer and event title placeholders
- Live preview
- Server-side sanitization
- Minimum text validation

Suggested helper text:

```text
This agreement is shown to participants before they join the event. You may use the default waiver or customize it for your event.
```

Draft behaviour:

- Drafts may use incomplete waiver content.

Submit-for-review behaviour:

- Waiver must meet minimum content requirements.

---

## Step 11: Preview and Submit

Show a final review before submission.

Preview sections:

- Event card preview
- Event details preview
- Schedule summary
- Location or virtual setup summary
- Race category summary
- Rewards summary
- Pricing summary
- Payment summary
- Waiver preview

Actions:

```text
Save Draft
Preview Event
Submit for Review
```

Suggested submit message:

```text
Your event will be reviewed by an admin before it becomes public.
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
| Rewards | Show | Show | Show |
| Packages | Show | Optional | Show |
| Pricing | Show | Show | Show |
| Payment | Show if paid | Show if paid | Show if paid |
| Event Details | Show | Show | Show |
| Media | Show | Show | Show |
| Waiver | Show | Show | Show |
| Preview | Show | Show | Show |

---

## UX Requirements

### Progress Indicator

Show the current step.

Example:

```text
1 Event Type
2 Details
3 Schedule
4 Rules
5 Pricing
6 Review
```

### Save Draft

Save Draft should be available throughout the flow.

Draft minimum requirement:

```text
Title only
```

### Setup Completeness Checklist

Before submit-for-review, show a checklist.

Example:

```text
Required before review:

[ ] Event title
[ ] Schedule
[ ] Event type
[ ] Race distance or category
[ ] Pricing setup
[ ] Payment QR for paid event
[ ] Waiver
[ ] Event details
```

### Inline Helper Text

Use short helper text beside fields instead of long instructional paragraphs.

### Smart Defaults

Recommended defaults:

- Virtual event hides location.
- Onsite event shows race categories.
- Hybrid event shows both location and virtual rules.
- Accumulated virtual run shows target distance.
- Paid event requires payment QR before submit-for-review.
- Virtual Window Start defaults to Event Start.
- Virtual Window End defaults to Event End.
- Final submission deadline defaults to 14 days after event end.
- Onsite event defaults pricing mode to `per_distance_period`.
- Virtual accumulated challenge defaults pricing mode to `same_fee` or `package_period`.

---

## Validation Summary

### Draft Validation

Minimum:

- Valid title

Draft may be incomplete.

### Submit-for-Review Validation

Require:

- Title
- Description
- Event type
- Schedule
- Race distance or race category
- Location for onsite or hybrid
- Virtual rules for virtual or hybrid
- Pricing setup
- Payment QR for paid events
- Event details
- Valid waiver

---

## Recommended Implementation Sequence

Implement in small safe increments.

### Phase 1: UI Reordering and Step Structure

- Reorder the create-event form using the wizard flow.
- Add progress indicator or sidebar step list.
- Preserve existing form fields and names.
- Do not change the database model yet unless required.

### Phase 2: Conditional Field Display

- Show/hide location, virtual rules, race categories, and payment sections based on event type and fee mode.
- Keep server-side validation as the source of truth.

### Phase 3: Draft vs Submit Validation Messaging

- Improve visible validation feedback.
- Add setup completeness checklist before submit.
- Keep title-only draft saving.

### Phase 4: Preview Improvements

- Replace fragile GET-query preview if possible.
- Prefer draft preview ID or server-side temporary preview state.
- If this is too large, keep current preview but improve summary display.

### Phase 5: Race Categories and Pricing Expansion

- Add `raceCategories[]` model support.
- Add per-distance pricing.
- Add early bird, regular, and late pricing periods.
- Add category-specific reward inclusions.

### Phase 6: Runner-Facing Price Resolution

- Add active price resolver.
- Store payment amount snapshot during registration.
- Add payment proof enforcement against resolved amount.

---

## Acceptance Checklist

### General UX

- [ ] Organizer sees a guided create-event flow.
- [ ] Event Type is the first major decision.
- [ ] Fields that do not apply are hidden.
- [ ] Save Draft is available throughout the flow.
- [ ] Submit for Review shows required missing items.
- [ ] User can preview before submission.

### Draft Behaviour

- [ ] Draft requires title only.
- [ ] Draft can save incomplete schedules, pricing, media, and waiver.
- [ ] Draft remains private to organizer and admins.

### Submit-for-Review Behaviour

- [ ] Submit validates all publish-ready fields.
- [ ] Paid event requires payment QR.
- [ ] Onsite and hybrid events require location.
- [ ] Virtual and hybrid events require virtual rules.
- [ ] Submitted event moves to admin review.

### Conditional Logic

- [ ] Virtual event hides location.
- [ ] Onsite event hides virtual rules.
- [ ] Hybrid event shows both.
- [ ] Paid event shows payment setup.
- [ ] Free event hides payment QR requirement.
- [ ] Accumulated completion mode shows target distance and activity rules.

### Pricing

- [ ] Same-fee pricing still works.
- [ ] Package-based pricing still works.
- [ ] Delivery fee still works.
- [ ] Suggested event fee still works.
- [ ] Final fee override still works.

### No Regression

- [ ] Existing tests pass.
- [ ] Existing organizer route guard still works.
- [ ] Existing admin review flow still works.
- [ ] Existing accumulated activity submission behaviour still works.
- [ ] Existing event details rendering still works.
- [ ] Existing waiver sanitization still works.

---

## Codex Task Prompt

Use this prompt inside VS Code Codex after placing this file in the repository:

```text
Read docs/create_event_wizard_codex_implementation.md and inspect the current create-event implementation. Implement Phase 1 and Phase 2 only.

Goals:
1. Reorder the create-event page into the recommended guided wizard flow.
2. Add a clear progress indicator or step sidebar.
3. Preserve the existing form field names, backend route behaviour, model fields, and current validation.
4. Add conditional show/hide behaviour for virtual, onsite, hybrid, free, and paid event sections.
5. Keep Save Draft and Submit for Review behaviour unchanged.
6. Do not add new database fields yet unless the current code already supports them.
7. Add or update tests only for the UI structure and conditional behaviour if the project already has matching test patterns.

After implementation, summarize:
- Files changed
- Behaviour changed
- Tests added or updated
- Any follow-up work needed
```

---

## Recommended File Placement

Place this document at:

```text
docs/create_event_wizard_codex_implementation.md
```

Then update `docs/PRD.md` or `docs/create_event.md` with a short reference:

```text
The guided organizer create-event wizard implementation plan is documented in docs/create_event_wizard_codex_implementation.md.
```
