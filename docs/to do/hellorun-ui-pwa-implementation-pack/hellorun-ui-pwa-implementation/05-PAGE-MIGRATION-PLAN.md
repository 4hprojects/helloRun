# 05 - Page Migration Plan

## Goal

Refactor high-value HelloRun workflows to the shared responsive system without changing business behavior.

## Migration order

Prioritize application-critical journeys.

Recommended order:

1. root application shell and global navigation
2. authentication
3. events listing
4. event detail
5. registration
6. runner dashboard / My Runs
7. activity/proof submission
8. results and leaderboards
9. profile/settings
10. organizer dashboard
11. organizer event management
12. participants/registrations
13. payment/submission review
14. public content pages
15. footer/legal pages

Adapt to actual repository routes.

## 1. Global shell

Refactor first because every later page depends on it.

Requirements:

- shared page container
- shared desktop header
- shared mobile header
- shared mobile drawer
- optional authenticated bottom navigation
- consistent footer
- safe-area handling
- page content spacing
- route active state
- role-aware navigation

Check:

```text
header does not overlap content
drawer does not cause document overflow
bottom nav reserves content space
footer remains reachable
```

## 2. Authentication pages

Pages:

```text
sign in
sign up
forgot password
reset password
email verification
```

Requirements:

- one-column mobile form
- reasonable desktop max width
- error messages wrap
- password controls have adequate touch area
- OAuth/social buttons, if present, fit narrow screens
- no horizontal overflow
- keyboard navigation
- mobile keyboard does not make actions inaccessible

## 3. Events listing

The events listing is one of the most important public and authenticated screens.

### Mobile layout

Recommended:

```text
Page title
Search
Filters | Sort
Active filter chips
Event cards
Pagination/load more
```

### Desktop layout

Recommended:

```text
Page title
Search/filter controls
Event grid/list
```

### Filter behavior

Mobile detailed filters should move to:

```text
bottom sheet
drawer
responsive dialog
```

Do not permanently render all controls vertically before results if that makes event discovery cumbersome.

### Active filters

Show concise removable filter chips where useful.

Example:

```text
Virtual ×
Open registration ×
10K ×
```

Keep a clear-all action.

### Event card

Ensure:

- long titles wrap
- status is visible
- organizer identity is readable
- date does not collide
- image scales
- CTA remains reachable
- full card is not accidentally nested interactive elements

## 4. Event detail

Mobile content order should reflect decision-making:

1. event identity
2. organizer
3. state/status
4. dates
5. event type/mode
6. challenge/distance
7. registration CTA
8. important rules
9. proof requirements
10. pricing/payment details if applicable
11. results/participants where applicable
12. supporting information

If a sticky registration CTA is used on mobile:

- ensure it does not cover content
- hide/disable appropriately when registration is unavailable
- account for bottom navigation if both exist
- avoid two stacked fixed bars

## 5. Registration

Requirements:

- progress indicator only if registration is genuinely multi-step
- mobile single-column layout
- preserve values on validation failure
- field errors near fields
- summary/review page if current workflow has one
- confirmation screen fits mobile
- payment instructions remain readable
- uploads work from phones

Do not change registration validation or payment logic as part of responsive work.

## 6. My Runs / runner dashboard

Mobile priority:

```text
upcoming/active events
registration status
submission status
next action
recent results
```

Use cards with strong next-action CTAs.

Avoid showing a desktop admin-like table when a runner only needs a few fields.

Potential card:

```text
Event Name
Active

Registration: Approved
Activity: Needs submission

[Submit Activity]
[View Event]
```

Use actual statuses from the application.

## 7. Activity/proof submission

This is a mobile-critical workflow.

Requirements:

- clear event identity
- proof instructions before upload
- URL field if supported by current HelloRun functionality
- screenshot/image upload if supported
- file preview fits viewport
- date/distance/time fields fit
- validation is understandable
- submit button does not become hidden behind mobile browser chrome
- confirmation clearly indicates successful server submission

Do not implement offline submission queue in this phase.

If the network fails, retain form state when safely possible and explain retry behavior.

## 8. Results and leaderboards

Mobile:

- emphasize rank, runner, main metric
- convert simple tables to cards/compact rows
- allow detailed results page
- preserve sorting/filtering if currently supported

Desktop:

- table is acceptable if readable
- constrain width and align numeric columns

Do not hide important ranking semantics only to fit the screen.

## 9. Profile and settings

Requirements:

- responsive avatar/image controls
- form sections stack cleanly
- destructive actions remain separated
- sign out is discoverable
- install action can live here if appropriate
- account/security sections retain existing logic

## 10. Organizer dashboard

Mobile priority:

```text
events requiring attention
pending registrations
pending payments
pending activity reviews
recent changes
primary organizer actions
```

Do not force all desktop analytics cards onto one tiny screen.

Use:

```text
summary metrics
attention queue
event list
```

Charts are secondary to operational tasks.

## 11. Organizer event management

Potential sections:

```text
event overview
edit event
registrations
participants
payments
activity submissions
results
certificates/recognition
settings
```

Use tabs only if they fit and remain understandable.

On mobile, a secondary menu or scrollable tabs may be appropriate.

Do not create page-level horizontal scrolling.

## 12. Organizer review queues

Review workflows need careful mobile design.

A mobile record should surface:

```text
participant
event
submission type
submitted date
important metrics
proof preview
review status
Approve
Reject / Request correction
```

Avoid small action icons without labels for consequential operations.

Confirmation may be appropriate for irreversible actions.

Preserve current business rules.

## 13. Admin tables

For dense administrative tables:

- wrap table in a local horizontal scroller
- freeze/sticky first column only if existing architecture supports it cleanly
- offer row detail action
- prioritize columns
- avoid 10px fonts

## 14. Blog/content pages

Requirements:

- readable line length
- responsive images
- headings do not overflow
- tables/code snippets scroll locally if required
- related content cards adapt
- CTA sections stack on mobile

Suggested reading width:

```text
roughly 65 to 80 characters per line
```

Use existing typography system.

## 15. Footer/legal

Footer:

- stacks into logical sections on mobile
- no tiny link grids
- legal links remain available
- social icons, if present, have accessible names

Legal content:

- readable max width
- heading hierarchy preserved
- long URLs wrap
- no unnecessary app bottom nav if it interferes with long-form reading, unless navigation strategy requires it

## Migration rule

For every page:

1. preserve business logic
2. preserve route
3. replace duplicated layout with shared primitives
4. fix narrow-screen overflow
5. test empty/loading/error/populated states
6. test long content
7. test keyboard
8. test authenticated/unauthenticated variants
