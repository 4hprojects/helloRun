# 02 - Responsive Design System

## Goal

Make HelloRun usable from 320 CSS px through large desktop screens using reusable layout rules rather than one-off page fixes.

## Core principle

Use content-driven, mobile-first responsive design.

Do not create separate mobile and desktop applications.

Do not hide necessary content simply because the viewport is small.

## Target validation widths

Test at minimum:

```text
320
360
375
390
412
480
768
1024
1280
1440
1920
```

The design may use different breakpoints.

These widths are QA checkpoints, not mandatory CSS breakpoint values.

## Recommended conceptual ranges

Use only if compatible with the current design system:

```text
small mobile: < 480
mobile: 480 - 767
tablet: 768 - 1023
small desktop: 1024 - 1279
desktop: >= 1280
large desktop: >= 1536
```

Prefer existing breakpoint tokens where reasonable.

## Global page container

Use a reusable page container.

Concept:

```css
.page-container {
  width: min(100% - 2rem, 75rem);
  margin-inline: auto;
}
```

or a tokenized equivalent.

Avoid fixed page widths.

Use `clamp()` when fluid scaling is appropriate.

Example:

```css
.page-shell {
  padding-inline: clamp(1rem, 3vw, 2rem);
}
```

## Global overflow rule

Normal pages must not create horizontal document scrolling at 320 CSS px.

Do not globally hide overflow to disguise layout problems.

Avoid:

```css
html,
body {
  overflow-x: hidden;
}
```

as a blanket fix unless there is a proven reason.

Fix the overflowing component.

## Grid behavior

Replace fixed multi-column layouts with responsive grids.

Example:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, 18rem), 1fr)
  );
  gap: 1rem;
}
```

Use repository conventions.

## Flex items

Remember:

```css
min-width: 0;
```

for flexible children containing text where overflow occurs.

Images should generally support:

```css
max-width: 100%;
height: auto;
```

unless intentionally cropped.

## Typography

Use fluid typography where appropriate but retain design tokens.

Potential pattern:

```css
.page-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
}
```

Avoid excessively small text on mobile.

Do not solve overflow by reducing font sizes below accessible reading sizes.

## Touch targets

Aim for approximately 44 to 48 CSS px for major interactive controls where practical.

At minimum, comply with the project's accessibility target and WCAG expectations.

Examples:

```text
buttons
menu button
close button
icon buttons
tabs
pagination controls
bottom navigation
checkbox/radio touch area
```

## Buttons

Buttons must support:

- wrapping text
- icon + label
- loading states
- disabled states
- focus-visible states
- full-width mobile variant where useful
- intrinsic width on desktop

Do not hard-code all buttons to fixed widths.

## Forms

### General

Mobile forms should normally become one column.

Desktop can use two-column or multi-column grouping where it improves scanning.

Example:

Desktop:

```text
First name | Last name
Email      | Phone
```

Mobile:

```text
First name
Last name
Email
Phone
```

### Input sizing

Requirements:

- `width: 100%` inside constrained form groups
- labels remain visible
- errors do not cause clipping
- helper text wraps
- select controls remain usable
- file inputs do not overflow
- date fields fit mobile widths
- uploaded filenames wrap or truncate intentionally
- validation messages are associated semantically

### Upload interfaces

HelloRun may handle:

```text
payment proof
activity proof
images/screenshots
documents
```

Mobile upload interfaces must:

- support camera/photo-library behavior when the browser provides it
- show accepted format/size guidance
- show upload progress if currently supported
- prevent file preview cards from exceeding viewport
- provide accessible remove/retry controls
- not rely on drag-and-drop as the only method

## Event cards

Use a reusable event card.

Mobile card priority:

1. event title
2. organizer
3. state/status
4. date
5. distance or challenge target
6. mode/location
7. registration state
8. primary action

Do not display every database field.

Desktop grids can show 2-4 columns depending on available width.

Use image aspect ratios consistently.

## Event listing filters

### Desktop

Filters may appear inline or in a side/filter bar if space permits.

Potential controls:

```text
search
event mode
distance/category
registration availability
date range
sort
```

### Mobile

Prefer:

```text
Search field
Filters button
Sort button
```

Open detailed filters in a bottom sheet, drawer, or mobile-friendly dialog.

The filter interface must include:

```text
current filters
clear/reset
apply/show results
close
```

Do not occupy most of the initial mobile viewport with permanent filter controls.

## Tables

Tables require an intentional strategy.

Choose per table:

### Strategy A: responsive cards

Use for user-facing simple records.

Example:

```text
Rank #1
Runner name
390.65 km
25 activities
```

### Strategy B: horizontally scrollable table

Use for genuinely tabular admin data when maintaining column relationships matters.

Requirements:

```css
.table-wrapper {
  overflow-x: auto;
}
```

- scrolling belongs to the table container, not the page
- header remains understandable
- do not make every column artificially tiny

### Strategy C: priority columns

Hide low-value columns at narrow widths while providing detail view access.

Only use when information remains discoverable elsewhere.

### Strategy D: stacked label/value rows

Useful for management records on mobile.

Do not apply the same strategy blindly to all tables.

## Leaderboards

Mobile priority:

```text
rank
runner/team
primary metric
secondary metric
```

Less important data can move to detail.

Avoid 8-column leaderboard tables on phones.

## Dialogs and modals

Desktop:

- constrained max width
- visible close control
- logical focus order

Mobile:

- width respects viewport
- can become full-screen or near-full-screen
- use dynamic viewport units when supported
- content scrolls internally when needed
- actions remain reachable
- keyboard appearance must not make primary controls inaccessible

Avoid fixed values such as:

```css
width: 700px;
height: 600px;
```

without max-width/max-height protections.

## Drawers and bottom sheets

Use for:

```text
mobile nav
filters
secondary actions
contextual detail
```

Requirements:

- focus management
- Escape behavior where applicable
- body scroll locking
- backdrop
- safe-area handling
- high enough z-index within existing token system
- route changes close navigation drawer

## Dashboard cards

On mobile:

- one column by default
- metric cards may use 2 columns only if labels and values remain readable
- charts must resize
- legends must not overflow
- buttons must remain reachable

On desktop:

- use grid layout
- cap content width
- avoid stretching every card across ultra-wide screens

## Charts

If HelloRun currently uses charts:

- use responsive chart container
- ensure height is explicit enough for library rendering
- labels must not overlap
- provide textual/accessible equivalent for key values
- avoid rendering tiny desktop charts unchanged on mobile

## Images

For event imagery:

- use responsive images if supported
- preserve aspect ratio
- use meaningful alt text when image conveys information
- use empty alt for purely decorative imagery
- lazy-load below-the-fold imagery where appropriate
- do not cause layout shift

## Safe areas

Installed PWAs and modern mobile browsers may require safe-area handling.

Use only where relevant:

```css
padding-bottom: env(safe-area-inset-bottom);
padding-top: env(safe-area-inset-top);
```

Do not add large blank spaces on devices without safe areas.

## Dynamic viewport height

Avoid assuming `100vh` always equals visible mobile viewport.

Prefer modern units where supported:

```css
min-height: 100dvh;
```

with compatible fallback if required by target browsers.

## Long content

Test:

- long event titles
- long organizer names
- long user names
- long email addresses
- long filenames
- long URLs
- large numeric values
- translated text if localization exists

Use wrapping/truncation intentionally.

## Empty, loading, and error states

Every responsive component must support:

```text
loading
empty
error
success
disabled
```

Do not design only the populated desktop state.

## Responsive acceptance criteria

- no unintended document-level horizontal scroll at 320 px
- key content remains readable without zoom
- controls are reachable and usable by touch
- forms fit screen
- cards resize correctly
- tables use an explicit mobile strategy
- dialogs remain within viewport
- mobile browser keyboard does not permanently hide required actions
- navigation does not overlap page content
- fixed/sticky elements reserve sufficient space
- 1920 px layouts remain bounded and readable rather than excessively stretched
