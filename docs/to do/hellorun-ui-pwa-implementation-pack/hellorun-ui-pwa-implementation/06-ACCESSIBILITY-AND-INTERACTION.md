# 06 - Accessibility and Interaction

## Goal

Responsive changes must improve usability without reducing keyboard, screen-reader, or touch accessibility.

## Semantic navigation

Use semantic landmarks where supported:

```html
<header>
<nav>
<main>
<aside>
<footer>
```

Give multiple navigation landmarks accessible labels when needed.

Example:

```html
<nav aria-label="Primary">
<nav aria-label="Account">
```

## Current page

Use:

```html
aria-current="page"
```

for active navigation.

Do not rely only on a color change.

## Menu buttons

Mobile navigation trigger:

```text
button element
accessible name
expanded state
controlled element relationship where appropriate
```

Concept:

```html
<button
  aria-label="Open navigation"
  aria-expanded="false"
  aria-controls="mobile-navigation"
>
```

Do not use a clickable `div`.

## Focus visibility

All keyboard-operable controls must have a visible focus state.

Do not remove outlines unless replaced by an equally visible focus indicator.

Use `:focus-visible` when appropriate.

## Drawers and dialogs

When modal:

- focus moves into dialog/drawer
- focus is contained appropriately
- Escape closes on keyboard devices unless action is intentionally blocking
- focus returns to trigger on close
- dialog has accessible name
- close button has accessible label
- background content is not keyboard-interactable

Use existing accessible dialog primitives if the component library provides them.

## Dropdown/profile menus

Requirements:

- button trigger
- keyboard accessible
- can be dismissed
- focus behavior follows current library conventions
- selection does not trap user
- role and state attributes are correct

Prefer tested component-library primitives over handcrafted ARIA menus.

## Touch

Major controls should have generous hit areas.

Do not require precise tapping for:

```text
menu
close
filter
sort
pagination
upload remove
bottom navigation
review actions
```

## Forms

Every field needs an accessible name.

Prefer visible labels.

Associate:

```text
error text
helper text
required state
```

programmatically where reasonable.

Do not use placeholder text as the only label.

## Validation

When submission fails:

- preserve entered values
- summarize errors when useful
- move/announce focus appropriately
- show field-level messages
- do not rely on red color only

## Images

Event images:

- meaningful image: descriptive alt
- decorative image: empty alt
- organizer/participant avatars should use useful accessible text if they convey identity

Do not repeat nearby visible text unnecessarily in alt content.

## Icon buttons

Every icon-only button needs an accessible name.

Examples:

```text
Open navigation
Close
Remove image
Edit event
More actions
```

## Status colors

States such as:

```text
approved
pending
rejected
open
closed
completed
```

must include text, icon, pattern, or another non-color indicator.

## Reduced motion

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

for non-essential animations.

Do not make drawer/navigation operation depend on animation completion.

## Zoom and reflow

Do not block browser zoom.

Avoid:

```html
user-scalable=no
maximum-scale=1
```

unless there is a proven exceptional requirement.

Content must remain usable under zoom/reflow.

## Skip navigation

If site structure makes it useful, include:

```text
Skip to main content
```

especially with persistent global navigation.

## Heading hierarchy

Every page should have a logical page heading.

Do not choose heading levels solely for visual size.

## Live updates

For upload progress, validation, install state, or status changes, use appropriate live announcements where the update would otherwise be invisible to assistive technology.

Do not make large containers `aria-live`.

## Accessibility acceptance criteria

- all navigation works with keyboard
- visible focus exists
- mobile drawer can be opened and closed without pointer
- focus returns correctly
- profile menu is operable
- fields have labels
- errors are understandable
- icon buttons have names
- status is not color-only
- normal pages reflow at narrow widths
- zoom is not disabled
- active nav is semantic
