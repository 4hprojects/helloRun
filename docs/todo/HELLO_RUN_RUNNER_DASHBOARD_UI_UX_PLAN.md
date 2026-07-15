# HelloRun Runner Dashboard UI/UX Improvement Plan

## Document Role

This file defines the product vision, UI hierarchy, runner experience rules, implementation scope, and acceptance criteria for improving the HelloRun runner dashboard.

Use this document as the primary implementation guide for Codex when modifying:

- `src/views/runner/dashboard.ejs`
- `src/views/runner/partials/`
- `src/public/css/runner-dashboard.css`
- `src/public/js/runner-dashboard.js`
- runner dashboard controller and service files when additional display data is required

Do not treat this document as a full redesign of every runner-facing page.

The main target is:

- `/runner/dashboard`

Supporting runner pages may be adjusted only when required to complete a dashboard action.

---

# 1. Product Vision

The runner dashboard must behave like a **race-progress assistant**, not a general account summary.

When a runner opens the dashboard, the page should immediately answer:

1. What event am I currently participating in?
2. What do I need to do next?
3. How much progress have I completed?
4. Was my latest activity received?
5. Is anything waiting for review?
6. Did a submission require correction?
7. How much time remains?
8. Is my certificate ready?
9. What is my current leaderboard position?
10. What event can I join next?

The dashboard must prioritize actions, deadlines, progress, and status clarity.

Account settings, login details, old event history, and secondary statistics must not compete with the runner's active event journey.

---

# 2. Core UX Principle

Every active registration must have one clear runner-facing next action.

Examples:

| Registration state | Runner-facing message | Primary action |
|---|---|---|
| No registration | Find your next challenge | Browse Events |
| Payment required | Complete your registration | Pay or Upload Payment Proof |
| Payment under review | Payment proof received | View Registration |
| Registration ready | You are ready to participate | View Event |
| No run submitted | Submit your activity before the deadline | Submit Run |
| Accumulated event in progress | Continue your challenge | Add Activity |
| Submission pending | Your activity is under review | View Submission |
| Submission rejected | Your submission needs an update | Fix Submission |
| Approved result | Your result was approved | View Result |
| Certificate ready | Your certificate is ready | View Certificate |
| Event completed | You completed the event | View Achievement |

The dashboard must never force the runner to interpret raw system states.

---

# 3. Existing Dashboard Capabilities to Preserve

The current dashboard already supports:

- runner greeting
- profile completion reminder
- submit run result action
- registration links
- summary KPI cards
- event progress
- standard result submissions
- accumulated activity submissions
- upcoming events
- saved events
- recent badges
- badge progress
- past events
- running groups
- certificates
- activity log
- progress statistics
- completion hero
- onboarding banner

Do not remove working backend behavior unless it is replaced by an equivalent or better user experience.

Preserve:

- standard event submissions
- accumulated challenge submissions
- payment status rules
- certificate routes
- shared run-proof modal
- submission review flow
- badge and certificate data
- mobile responsiveness
- accessibility attributes
- current authorization rules

---

# 4. Main Problem

The current dashboard displays too many sections with similar visual weight.

The page contains useful information, but the hierarchy is weak.

A runner may see:

- onboarding
- profile completion
- greeting
- hero buttons
- completion message
- five KPI cards
- event progress
- upcoming events
- saved events
- account status
- badges
- badge challenges
- submissions
- past events
- certificates
- groups
- activity logs
- general statistics

This creates three problems:

1. The runner cannot immediately identify the next required action.
2. Active event progress competes with account and historical information.
3. Mobile users must scroll through too much content before reaching important actions.

---

# 5. Required Information Hierarchy

The dashboard should follow this order.

## 5.1 Header

Show:

- runner greeting
- short context-aware subtitle
- primary action
- secondary registration action

Recommended primary action:

- Submit Run
- Add Activity
- Fix Submission
- Browse Events

The action should change based on the runner's most urgent state.

## 5.2 Urgent Alerts

Show only when action is required.

Examples:

- payment required
- payment proof rejected
- run submission rejected
- event deadline approaching
- submission deadline approaching
- profile information missing for certificates
- restricted account

Do not show a permanent alert section when no urgent issue exists.

## 5.3 Your Next Action

This is the most important dashboard section.

It must appear before general KPI cards.

Show the highest-priority active registration.

The card should contain:

- event title
- selected race distance
- event type
- current lifecycle status
- approved progress
- pending progress
- remaining distance
- start date
- end date
- submission deadline
- days remaining
- clear helper text
- one primary action
- one optional secondary action

## 5.4 Active Event Progress

Show all active registrations.

Each event should appear once.

The event card must represent the registration lifecycle, not individual submission history.

## 5.5 Current Snapshot

Show only three primary metrics:

- Active Events
- Approved Distance
- Pending Review

Secondary metrics may appear in a compact section:

- Certificates
- Completed Events
- Achievement Points

KPI cards should be clickable when they lead to a relevant page.

## 5.6 Recent Activity

Show the latest three runner activity records.

Examples:

- activity submitted
- activity approved
- activity rejected
- payment proof submitted
- payment approved
- certificate issued

Include a "View All Activity" or "View All Submissions" action.

## 5.7 Upcoming Event

Show the runner's nearest upcoming registered event.

Include:

- event title
- selected distance
- start date
- participation mode
- payment status
- event link

## 5.8 Latest Achievement

Show only the newest relevant achievement.

Possible content:

- certificate
- badge
- event completion
- leaderboard improvement

Actions:

- View
- Download
- Verify
- Share

## 5.9 Discover More Events

Show event recommendations only after the runner's current responsibilities and progress.

## 5.10 Secondary Sections

The following should be below the main runner journey or moved to dedicated pages:

- account sign-in method
- password status
- full badge list
- full certificate history
- full past event history
- full activity history
- running group management
- detailed achievement points
- detailed profile information

---

# 6. Recommended Desktop Layout

```text
Welcome back, Runner                         [Primary Action]

[Urgent Alert, only when needed]

Your Next Action
┌────────────────────────────────────────────────────┐
│ July Active Quest 100K                             │
│ 58.4 km approved of 100 km                         │
│ ███████████░░░░░░░ 58%                             │
│ 10 km awaiting review                              │
│ 41.6 km remaining                                  │
│ 12 days left                                       │
│                                  [Add Activity]    │
└────────────────────────────────────────────────────┘

Active Event Progress
[Event Progress Card]
[Event Progress Card]

Current Snapshot
[Active Events] [Approved Distance] [Pending Review]

Recent Activity                    Upcoming Event
[Latest activity list]             [Next registered event]

Latest Achievement
[Certificate or badge preview]
[View] [Download] [Verify] [Share]

Discover More Events
[Event cards]
```

---

# 7. Recommended Mobile Layout

```text
Welcome back, Runner

[Primary Action]

[Urgent Alert]

Your Next Action
[Active event progress card]

[Approved Distance]
[Pending Review]
[Days Remaining]

Recent Activity

Upcoming Event

Latest Achievement

Discover Events

Bottom Navigation:
Home | Events | Submit | Progress | Profile
```

The mobile page must prioritize:

1. next action
2. current progress
3. deadlines
4. recent submission status

---

# 8. Event Progress Card Requirements

Each active registration must show:

- event title
- selected distance
- participation mode
- event type
- current state
- runner-facing status label
- progress bar when applicable
- approved distance
- pending distance
- rejected activity count
- remaining distance
- event start date
- event end date
- submission deadline
- days remaining
- confirmation code in secondary metadata
- one primary action
- optional secondary action

## 8.1 Standard Event States

Supported states:

- `payment_required`
- `registration_not_ready`
- `not_submitted`
- `submitted`
- `approved`
- `rejected`
- `certificate_ready`

## 8.2 Accumulated Event States

Supported states:

- `payment_required`
- `not_submitted`
- `in_progress`
- `submitted`
- `completed`

## 8.3 Runner-Facing Status Labels

Use clear labels:

| Internal state | Runner-facing label |
|---|---|
| payment_required | Payment needed |
| registration_not_ready | Registration under review |
| not_submitted | Ready for activity |
| in_progress | Challenge in progress |
| submitted | Under review |
| rejected | Changes needed |
| approved | Approved |
| certificate_ready | Certificate ready |
| completed | Completed |

Avoid showing raw enum values.

Avoid making "Rejected" the primary message.

Use:

- Changes needed
- Update required
- Please correct your submission

Include the reviewer reason when available.

---

# 9. Accumulated Challenge Progress

The accumulated challenge card must clearly separate:

- approved distance
- pending distance
- rejected activity distance or count
- target distance
- remaining distance

Example:

```text
Official progress: 58.4 km
Awaiting review: 10.0 km
Target: 100 km
Remaining: 41.6 km
Potential progress after approval: 68.4 km
```

Only approved distance counts toward official progress.

Pending distance must not increase the official progress bar.

A secondary visual may indicate potential progress after pending submissions are approved.

## 9.1 Optional Guidance

When event dates are available, calculate:

- days remaining
- remaining distance
- suggested average distance per day
- suggested average distance per week

Example:

```text
41.6 km remaining
12 days left
Suggested average: 3.5 km per day
```

Label this as guidance, not a requirement.

---

# 10. Deadline Visibility

The dashboard must display relevant dates without requiring the runner to open the event page.

Show:

- registration deadline
- event start date
- event end date
- result submission deadline
- days remaining

Use urgency states:

- Normal
- Approaching deadline
- Due today
- Closed

Suggested behavior:

- more than 7 days: standard text
- 3 to 7 days: highlighted
- 1 to 2 days: warning
- due today: urgent
- past deadline: disabled action with explanation

Do not rely on color alone.

Include text and icons.

---

# 11. Payment UX

When payment is required, show:

- amount due
- currency
- selected race distance
- selected package
- add-on total
- payment method
- payment proof status
- payment deadline
- upload payment proof action

The amount must come from the registration snapshot.

Do not recalculate using the event's current live price.

Example:

```text
Amount due: ₱450
Selected package: 100K Finisher Package
Payment status: Proof required
```

---

# 12. Submit Run UX

The main submission action must be context-aware.

Possible labels:

- Submit First Activity
- Add Activity
- Submit Final Result
- Resubmit Proof
- Fix Submission
- Submit Run
- No Eligible Events

Rules:

- Preselect the registration when the runner launches submission from a specific event card.
- Preselect the only eligible event when only one exists.
- When several events are eligible, explain which events can receive the activity.
- Preserve the shared run-proof modal.
- Do not duplicate submission forms inside the dashboard.

---

# 13. Recent Activity

Show the latest three activity items.

Each item should include:

- event title
- activity type
- submitted distance
- date submitted
- status
- short reviewer feedback when rejected
- action to view details

Examples:

```text
10.00 km submitted
July Active Quest
Under review
Submitted today
```

```text
8.25 km approved
Midyear Reset Run
Reviewed yesterday
```

```text
Submission needs an update
Screenshot does not clearly show the activity date
[Fix Submission]
```

Do not show the full activity history on the dashboard.

---

# 14. KPI Redesign

## 14.1 Primary Metrics

Show:

- Active Events
- Approved Distance
- Pending Review

## 14.2 Secondary Metrics

Show in a smaller section:

- Completed Events
- Certificates
- Achievement Points

## 14.3 KPI Interaction

Where possible:

- Active Events links to registrations
- Approved Distance links to activity history
- Pending Review links to submitted entries
- Certificates links to certificates
- Completed Events links to past events
- Achievement Points links to badges

Cards must have clear hover, focus, and active states.

---

# 15. Achievements

Combine overlapping achievement content into one dashboard section.

The dashboard should not separately emphasize:

- recent badges
- challenge progress
- achievement points
- certificates
- completion hero
- leaderboard

Use one "Latest Achievement" or "Achievements" section.

Show:

- latest certificate
- latest badge
- current leaderboard rank
- latest milestone

Only one item should be visually dominant.

## 15.1 Certificate Actions

Each certificate item should support:

- View Certificate
- Download Certificate
- Verify Certificate
- Copy Verification Link
- Share

Use the Web Share API when available.

Fallback:

- copy link
- selectable verification URL

---

# 16. Leaderboard Context

When leaderboard data is available, show runner-specific context.

Examples:

```text
Your rank: 23 of 184
You are 5.6 km behind rank 20
```

```text
You moved up 8 positions after your latest approved activity
```

Do not show public rank when:

- the event disables ranking
- the runner opted out
- ranking is unavailable
- the runner has no approved result

---

# 17. Account Information

The current dashboard account card should be reduced or removed.

Move these to the profile or account page:

- sign-in method
- password status
- linked account status
- email details

Show a dashboard profile card only when action is required.

Example:

```text
Complete your profile
Your full name and location are required for registrations and certificates.
[Complete Profile]
```

When the profile is complete, hide the profile reminder.

---

# 18. Empty States

Every empty state must explain:

1. what is missing
2. why it matters
3. what the runner should do next

Avoid:

```text
No registered event progress yet.
```

Use:

```text
You have not joined an event yet.
Choose a distance, register, and start tracking your progress.
[Browse Active Events]
```

Avoid:

```text
No submissions found.
```

Use:

```text
You have not submitted an activity yet.
Once your event starts, upload an activity screenshot or sync Strava.
[View My Events]
```

---

# 19. Mobile Bottom Navigation

Add a fixed bottom navigation for authenticated runner pages on screens below 768 pixels.

Items:

- Home
- Events
- Submit
- Progress
- Profile

Requirements:

- show only for runner role
- hide for organizer and admin layouts
- show active route
- keep the hamburger menu for secondary actions
- do not overlap page content
- add bottom page padding equal to nav height
- support safe-area inset on compatible devices
- use labels and icons
- use at least 44 px tap height for main navigation items

Suggested routes:

| Item | Route |
|---|---|
| Home | `/runner/dashboard` |
| Events | `/events` |
| Submit | shared run-proof modal |
| Progress | `/runner/submissions` or dashboard progress anchor |
| Profile | `/runner/profile` |

---

# 20. Accessibility Requirements

Preserve and improve:

- semantic heading order
- keyboard navigation
- visible focus states
- descriptive button labels
- progress bar ARIA attributes
- status announcements
- accessible alert roles
- sufficient contrast
- touch target size
- screen-reader labels
- text alternatives for badge and certificate images

Do not use color as the only indicator of:

- pending
- approved
- rejected
- urgent
- completed

Use icon, text, and color together.

---

# 21. Visual Design Rules

The redesign should remain consistent with the existing HelloRun brand and design system.

Use:

- strong section hierarchy
- clear spacing
- fewer competing cards
- one dominant primary action
- consistent card radius
- consistent button sizes
- clear status chips
- progress bars with visible labels
- responsive single-column layout on mobile

Avoid:

- excessive gradients
- excessive decorative icons
- too many colored cards
- multiple equally dominant buttons
- long helper paragraphs
- duplicate information
- excessive dashboard headings
- horizontal scrolling
- clipped action buttons

---

# 22. Content Rules

Use direct runner-facing language.

Preferred:

- Add Activity
- Payment Needed
- Under Review
- Changes Needed
- Certificate Ready
- 12 Days Left
- 41.6 km Remaining
- 10 km Awaiting Review

Avoid:

- raw database status values
- technical review language
- OCR confidence wording
- long system explanations
- vague labels such as "Process" or "Continue"

Status messages should explain:

- what happened
- what it means
- what the runner should do next

---

# 23. Data Requirements

The dashboard service may need to provide:

- next urgent runner action
- active registration count
- approved distance total
- pending submission count
- selected registration target
- approved accumulated distance
- pending accumulated distance
- remaining distance
- potential distance after approval
- days remaining
- event end date
- submission deadline
- registration price snapshot
- selected package
- selected category
- latest activity records
- latest achievement
- leaderboard rank and movement
- reviewer feedback summary

Business-state decisions should remain in controllers or services.

EJS templates should receive normalized display-ready values.

Avoid complex state resolution inside templates.

---

# 24. Suggested Data Contract

Each active event card should receive:

```js
{
  registrationId,
  eventId,
  eventTitle,
  eventSlug,
  eventType,
  participationMode,
  raceDistance,
  confirmationCode,

  state,
  stateTone,
  stateLabel,
  helperText,

  startDateLabel,
  endDateLabel,
  submissionDeadlineLabel,
  daysRemaining,
  deadlineTone,

  payment: {
    required,
    amount,
    currency,
    packageName,
    categoryName,
    status,
    statusLabel
  },

  progress: {
    approvedDistanceKm,
    pendingDistanceKm,
    rejectedDistanceKm,
    targetDistanceKm,
    remainingDistanceKm,
    potentialDistanceKm,
    percent,
    approvedActivityCount,
    pendingActivityCount,
    rejectedActivityCount,
    suggestedDailyDistanceKm,
    suggestedWeeklyDistanceKm
  },

  latestSubmission: {
    id,
    submittedAtLabel,
    reviewedAtLabel,
    status,
    statusLabel,
    reviewerFeedback
  },

  nextAction: {
    type,
    label,
    href,
    registrationId
  },

  secondaryAction: {
    label,
    href
  }
}
```

Only include fields that apply to the registration.

---

# 25. Implementation Phases

## Phase 1: Information Hierarchy

Tasks:

- move Active Event Journey above KPI summary
- create Your Next Action card
- reduce repeated headings
- reduce dashboard intro text
- move account details lower or remove them
- keep existing backend behavior

Acceptance:

- the runner can identify the next action within the first screen
- active event progress appears before general statistics
- primary action is visually dominant

## Phase 2: Progress and Deadline Clarity

Tasks:

- show approved distance
- show pending distance
- show remaining distance
- show target distance
- show event end date
- show submission deadline
- show days remaining
- add deadline urgency state

Acceptance:

- runner can identify official progress
- runner can identify pending progress
- runner can identify remaining distance
- runner can identify how much time remains

## Phase 3: Payment and Submission Actions

Tasks:

- show registration price snapshot
- show selected package and category
- add context-aware submission labels
- preserve event preselection in run-proof modal
- improve rejected submission messaging

Acceptance:

- runner can see exact payment amount without leaving dashboard
- rejected submissions explain the correction required
- event-specific submit action preselects the registration

## Phase 4: KPI and Activity Simplification

Tasks:

- reduce primary KPI cards to three
- make KPI cards navigable
- show only three recent activity items
- move full history to dedicated pages
- compact secondary statistics

Acceptance:

- current status is visible without excessive scrolling
- full history remains available
- dashboard does not duplicate the submissions page

## Phase 5: Achievements and Sharing

Tasks:

- combine badge, certificate, and achievement content
- add certificate verify action
- add copy-link action
- add Web Share API support
- show latest achievement
- optionally show leaderboard rank

Acceptance:

- certificate can be viewed, verified, copied, and shared
- achievement content does not dominate active event progress

## Phase 6: Mobile Navigation

Tasks:

- implement runner-only bottom navigation
- highlight current route
- trigger shared run-proof modal from Submit item
- add bottom spacing
- test safe-area behavior

Acceptance:

- common runner actions are available in one tap
- page content is not covered by navigation
- hamburger menu still works

---

# 26. File Targets

Primary files:

- `src/views/runner/dashboard.ejs`
- `src/views/runner/partials/dashboard-summary.ejs`
- `src/views/runner/partials/dashboard-event-progress.ejs`
- `src/views/runner/partials/event-progress-row.ejs`
- `src/views/runner/partials/result-submissions-card.ejs`
- `src/public/css/runner-dashboard.css`
- `src/public/js/runner-dashboard.js`
- `src/controllers/runner.controller.js`
- `src/services/runner-data.service.js`

Possible supporting files:

- shared navigation partial
- authenticated runner layout
- registration payment partial
- certificate card partial
- mobile navigation stylesheet
- submission modal integration file
- date formatting helper
- deadline calculation helper

Before adding a new file, confirm an equivalent shared component does not already exist.

---

# 27. Non-Goals

Do not include the following in this implementation unless separately approved:

- full redesign of public event pages
- organizer dashboard redesign
- admin dashboard redesign
- replacement of the shared run-proof modal
- new database migration without a clear need
- new gamification engine
- social feed
- direct messaging
- full training analytics
- wearable integrations beyond current supported services
- complete profile page redesign
- full leaderboard redesign
- shop redesign

---

# 28. Testing Scenarios

Test with the following runner states.

## Scenario 1: New Runner

- no registrations
- no submissions
- incomplete profile

Expected:

- profile reminder
- Browse Events as primary action
- meaningful empty states
- no empty KPI clutter

## Scenario 2: Unpaid Registration

Expected:

- amount due visible
- package and distance visible
- payment action visible
- event progress locked until payment

## Scenario 3: Payment Under Review

Expected:

- payment proof received message
- no duplicate upload action unless allowed
- review status visible

## Scenario 4: Standard Event Ready

Expected:

- Submit Run action
- event deadline visible
- selected distance visible

## Scenario 5: Standard Submission Pending

Expected:

- Under Review status
- submitted date visible
- no unnecessary resubmit button

## Scenario 6: Standard Submission Rejected

Expected:

- Changes Needed status
- reviewer reason visible
- Fix Submission action

## Scenario 7: Accumulated Challenge In Progress

Expected:

- approved distance visible
- pending distance visible
- remaining distance visible
- target distance based on selected category
- Add Activity action
- days remaining visible

## Scenario 8: Accumulated Challenge Completed

Expected:

- completion state
- certificate action
- latest achievement display
- no Add Activity action unless post-completion submissions are supported

## Scenario 9: Multiple Active Registrations

Expected:

- one highest-priority next action
- all active event cards shown
- no duplicate registration cards
- correct action per registration

## Scenario 10: Mobile Runner

Expected:

- bottom navigation visible
- primary actions reachable with one tap
- no clipped buttons
- no horizontal scroll
- content not covered by fixed navigation

---

# 29. Usability Validation Tasks

Ask test users to complete these tasks:

1. Find how much they need to pay.
2. Identify their next required action.
3. Check whether their latest activity was received.
4. Find their approved challenge distance.
5. Find pending distance.
6. Find the event deadline.
7. Fix a rejected submission.
8. Submit another activity.
9. Download a certificate.
10. Share a certificate.
11. Find their leaderboard position.
12. Browse another event.

Measure:

- task completion rate
- completion time
- number of taps
- wrong-page visits
- user confusion
- abandoned actions
- confidence rating after each task

---

# 30. Acceptance Criteria

The improved runner dashboard is complete when:

- active event progress appears before general KPI cards
- the most important next action is visible without scrolling on standard mobile screens
- every active registration has a clear state and next action
- approved and pending distance are clearly separated
- target and remaining distance are visible
- relevant deadlines are visible
- payment amount is visible when payment is required
- rejected submissions show a reason and correction action
- primary KPI cards are reduced to three
- account sign-in details no longer compete with event progress
- recent activity is limited to a concise list
- certificate actions include view, verify, and share
- mobile bottom navigation is available for runners
- keyboard and screen-reader navigation remain functional
- no existing runner submission or certificate flow is broken
- standard and accumulated events still use correct business rules
- dashboard logic remains primarily in services and controllers
- templates render normalized display data

---

# 31. Codex Execution Rules

Codex must:

1. Inspect current dashboard templates, styles, scripts, controllers, and services before editing.
2. Reuse existing components and design tokens.
3. Preserve authorization and CSRF protection.
4. Preserve shared run-proof modal behavior.
5. Preserve standard and accumulated submission logic.
6. Keep business logic out of EJS templates where practical.
7. Avoid large unrelated refactors.
8. Implement in phases.
9. Run focused tests after each phase.
10. Report changed files, tests run, remaining gaps, and manual checks required.

Codex must not:

- remove working features without documenting the replacement
- introduce a new CSS framework
- introduce React or another frontend framework
- change database structure unless required
- hardcode event-specific values
- hardcode currency assumptions when currency data exists
- rely only on color for status
- duplicate submission forms
- convert the dashboard into a full submissions-history page

---

# 32. Suggested Verification Commands

Use the project's actual available test files.

Likely checks include:

```bash
node --check src/services/runner-data.service.js
node --check src/controllers/runner.controller.js
node --check src/public/js/runner-dashboard.js
```

Run focused dashboard and submission tests:

```bash
node --test --test-concurrency=1 tests/runner-dashboard-profile.test.js
node --test --test-concurrency=1 tests/runner-dashboard-modal.test.js
node --test --test-concurrency=1 tests/runner-submissions-routes.test.js
node --test --test-concurrency=1 tests/submission.service.test.js
node --test --test-concurrency=1 tests/submission-routes.test.js
```

Also perform manual browser validation:

- desktop
- tablet
- mobile portrait
- mobile landscape
- keyboard-only navigation
- screen-reader labels
- long event names
- multiple active registrations
- no-data states
- rejected state
- deadline state
- restricted account

---

# 33. Final Product Direction

The runner dashboard should help the runner answer:

> What should I do next, and how close am I to finishing?

Everything else should support that question.

The target experience is:

- action-first
- progress-focused
- deadline-aware
- mobile-friendly
- clear during review
- easy to recover from errors
- rewarding after completion

---

# 34. Implementation Log

Times below use the Asia/Manila timezone.

## Phase 1 — Information Hierarchy

**Completed:** 2026-07-15 13:52:00 PST

- Added a context-aware hero, conditional urgent alerts, and a dominant Your Next Action card.
- Moved Active Event Progress before Current Snapshot and removed competing account/sign-in details.
- Added deterministic lifecycle ordering, actionable profile guidance, concise onboarding, and helpful empty states.
- Verified with dashboard source tests, EJS compilation, and authenticated onboarding/dashboard integration coverage.

## Phase 2 — Progress and Deadline Clarity

**Completed:** 2026-07-15 13:56:00 PST

- Normalized event start/end dates, submission deadlines, days remaining, urgency tones, and closed states.
- Separated approved, pending, rejected, target, remaining, and potential accumulated distance.
- Kept official progress bars approved-only and added optional daily guidance when dates and targets permit.
- Corrected future registrations so unopened submission windows are not classified as missed.
- Verified deadline boundaries and accumulated calculations with focused unit tests.

## Phase 3 — Payment and Submission Actions

**Completed:** 2026-07-15 13:59:51 PST

- Added snapshot-based amount, currency, package/category, add-on, payment-review, and payment-rejection display data.
- Added runner-facing submission labels, reviewer correction feedback, and event-specific shared-modal preselection.
- Preserved existing registration, payment, submission, certificate, authorization, and shared modal routes.
- Verified unpaid, payment-rejected, pending, approved, rejected, and accumulated submission states.

## Phase 4 — Snapshot and Activity Simplification

**Completed:** 2026-07-15 14:03:00 PST

- Reduced primary metrics to Active Events, Approved Distance, and Pending Review, with compact secondary metrics.
- Limited recent dashboard activity to three records and nearest upcoming registration to one card.
- Retained full history through dedicated pages and reused saved events for Discover More Events.
- Verified information order, metric destinations, activity limits, and empty states with focused tests.

## Phase 5 — Achievements and Sharing

**Completed:** 2026-07-15 14:06:00 PST

- Consolidated certificate, badge, and milestone emphasis into one Latest Achievement section.
- Added deterministic certificate-first selection plus view, verify, copy-link, and Web Share actions with fallback.
- Kept complete achievement collections on the runner profile and deferred leaderboard integration as agreed.
- Verified certificate action hooks and achievement source markup.

## Phase 6 — Mobile Navigation and Accessibility

**Completed:** 2026-07-15 14:09:41 PST

- Replaced runner navigation with Home, Events, Submit, Progress, and Profile while leaving organizer/admin navigation unchanged.
- Connected Submit to the existing run-proof modal and retained active-route, safe-area, and page-clearance behavior.
- Added focus states, semantic labels, textual status/deadline cues, approved-progress ARIA values, and responsive layouts.
- Verified navigation source, modal behavior, EJS compilation, desktop hierarchy, and mobile CSS requirements.

---

# 35. Active Countdown and Progress List Correction

**Specified:** 2026-07-15 14:20:23 PST  
**Completed:** 2026-07-15 14:23:26 PST  
**Status:** Implemented and verified

## Problem Confirmed

The July Active Quest Virtual Run ends on July 31, 2026, but accepts final submissions until August 14, 2026. The Active Event Progress chip currently uses the final submission deadline, so it reports submission grace time as challenge time remaining.

## Required Correction

- Track challenge timing and submission timing independently.
- For virtual events, calculate challenge time from `virtualWindow.endAt`, falling back to `eventEndAt`.
- Calculate submission time from `finalSubmissionDeadlineAt`, falling back to the applicable challenge end.
- Use Asia/Manila calendar days for countdown labels and daily-distance guidance.
- Show challenge time in the Active Event Progress chip while retaining the separate `Submit by` date.
- If the challenge has ended but submissions remain open, show `Challenge ended`; mark an unsubmitted registration missed only after its submission deadline.
- Render Approved, Remaining, Awaiting review, and Target as a compact vertical definition list in Active Event Progress cards. Keep Your Next Action unchanged.

## Acceptance Criteria

- July Active Quest counts down to July 31 rather than August 14.
- Challenge and submission closed states remain independent.
- Suggested daily distance uses challenge days remaining.
- Progress values stay legible on one line where card width permits.
- Focused service, template, modal, and authenticated dashboard checks pass.

## Implementation Result

- Added independent challenge and submission timing fields to normalized dashboard event cards.
- Active countdowns and suggested pacing now use the challenge end; missed-state logic continues to use the submission deadline.
- Added Asia/Manila calendar-day handling, including the platform's UTC end-of-day convention.
- Replaced the Active Event Progress distance tiles with the requested compact vertical list.
- Verified 17 focused dashboard tests, affected EJS compilation, syntax checks, diff hygiene, authenticated dashboard rendering, and refresh fragment rendering.

---

# 36. Event Icon Layout Stability

**Completed:** 2026-07-15 17:00:29 PST
**Status:** Implemented and verified

- Added intrinsic 40×40 and 44×44 image dimensions so active-event artwork reserves its final space before dashboard CSS and remote images finish loading.
- Kept the primary Next Action logo eager, while below-the-fold Active Event Progress logos remain lazy-loaded; both use asynchronous decoding.
- Restricted dashboard event artwork to the real event logo with the lightweight HelloRun icon as fallback, removing large event banners from the icon fallback chain.
- Added fixed, non-growing icon containers with clipped overflow to prevent oversized source artwork from causing layout flash or shifting nearby content.
- Verified real, missing, and whitespace logo sources, template image attributes, responsive container constraints, EJS compilation, and focused dashboard tests.

---

# 37. Latest Achievement Social Sharing

**Completed:** 2026-07-15 17:46:57 PST
**Status:** Implemented and verified

- Replaced the single Share action with an accessible menu for Facebook, X, LinkedIn, native device sharing, and copy-link fallback.
- Kept all social destinations tied to the public certificate verification URL and reused the verified achievement message and preview metadata.
- Added menu focus management, arrow-key navigation, Escape and outside-click dismissal, accurate expanded state, and minimum 44px touch targets.
- Kept native sharing available through More for installed apps such as Instagram, Messenger, and WhatsApp; unsupported browsers copy the link with local, non-scrolling feedback.
- Verified encoded social URLs, native and clipboard paths, menu accessibility behavior, responsive layout, EJS compilation, and focused dashboard tests.
