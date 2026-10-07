# 01 - Information Architecture and Navigation

## Goal

Create a simple, predictable, reusable navigation system.

The system must support:

- guests
- authenticated runners
- organizers
- users who are both runner and organizer
- administrators if the existing application supports them
- desktop
- tablet
- mobile browser
- installed PWA

## Design principle

The navigation must prioritize the next action a user is likely to take.

Do not expose every page in the top navigation.

Policy, help, legal, and secondary informational pages belong in the footer, account menu, contextual links, or mobile drawer.

## Navigation source of truth

Create or consolidate into one navigation configuration appropriate to the current stack.

Possible structure:

```ts
type NavItem = {
  id: string
  label: string
  href: string
  icon?: Icon
  roles?: UserRole[]
  auth?: "guest" | "authenticated" | "any"
  mobilePrimary?: boolean
  desktopPrimary?: boolean
}
```

Do not duplicate route arrays separately for desktop and mobile.

Both interfaces should consume the same navigation model and apply presentation rules.

## Guest navigation

Recommended information architecture:

```text
HelloRun logo
Events
How It Works
Blog
Organize
Install HelloRun, only when meaningful
Sign In
Sign Up
```

### Desktop

Primary destinations:

```text
Events
How It Works
Blog
Organize
```

Utility/action destinations:

```text
Install HelloRun
Sign In
Sign Up
```

### Mobile

Use:

```text
logo
menu button
```

Drawer or sheet:

```text
Events
How It Works
Blog
Organize
Sign In
Sign Up
Install HelloRun, conditionally
Help / FAQ
Contact
```

Legal pages should normally remain in the footer.

## Authenticated runner navigation

Recommended primary destinations:

```text
Events
My Runs
Activities
Results
Profile
```

Use the actual existing route names.

If the repository uses "My Events" instead of "My Runs", retain the route and choose one user-facing label consistently across the application.

Do not randomly mix:

```text
My Runs
My Events
Registrations
Joined Events
```

for the same destination.

### Desktop runner navigation

Recommended:

```text
HelloRun
Events
My Runs
Activities
Results
Install HelloRun, conditionally
Profile menu
```

### Mobile runner navigation

Use a simple top app bar plus bottom navigation when technically appropriate.

Top:

```text
HelloRun                  Menu
```

Bottom primary navigation:

```text
Home
Events
My Runs
Activities
Profile
```

If `Results` is more frequently used than `Activities`, determine this from current product priorities and route usage, then replace one item.

Maximum target: five bottom-navigation destinations.

Secondary items belong in profile/menu UI.

## Organizer navigation

Organizer tools should not compete with runner navigation.

Recommended organizer context:

```text
Dashboard
Events
Participants
Submissions
Results
Settings
```

Use only destinations supported by existing routes.

If payment review is a major separate workflow, it may appear as:

```text
Payments
```

If certificates are a major workflow, they may appear as:

```text
Recognition
```

Avoid placing every organizer sub-page in top-level navigation.

## Runner and organizer mode switching

If a user can be both runner and organizer, provide a clear context switch.

Preferred patterns:

### Account/context menu

```text
Runner
Organizer
Account Settings
Sign Out
```

or

### Header context switch

```text
Runner | Organizer
```

Use whichever integrates naturally with the current app shell.

The active context must be obvious.

Do not infer role solely from the current URL if user role data already exists.

## Admin navigation

If an admin area exists, keep it isolated from normal runner navigation.

Do not expose admin links to unauthorized users.

Do not remove server-side or route-level authorization.

## Active route state

Every navigation surface must visually identify the current destination.

Use semantic state where supported:

```html
aria-current="page"
```

Do not rely on color alone.

For parent routes, determine whether nested routes should keep the parent active.

Example:

```text
/events/123
```

should normally keep `Events` active.

## Desktop header behavior

Target behavior:

- consistent height
- logo always returns to appropriate root/home destination
- primary links do not wrap into two rows at standard desktop widths
- authenticated and guest actions remain visually distinct
- profile menu remains accessible by keyboard
- sticky header only if it does not cover anchors, dialogs, or content
- no layout shift when install action appears

If space becomes constrained, collapse earlier into the mobile/tablet pattern instead of squeezing links.

## Mobile header behavior

Requirements:

- menu button has an accessible label
- drawer traps focus when modal
- Escape closes drawer on keyboard-capable devices
- backdrop click closes when appropriate
- route selection closes drawer
- body background should not scroll behind a modal drawer
- menu remains usable when browser UI changes viewport height
- account actions are easy to reach

## Mobile bottom navigation

Use only for authenticated application workflows where repeated navigation benefits from persistent primary actions.

Requirements:

- maximum around five actions
- icon plus text label
- current destination clearly highlighted
- account for safe-area inset
- do not cover page CTAs
- add content bottom padding equal to nav height plus safe area
- hidden or adapted on screens where desktop navigation is active
- do not show on pages where it interferes with full-screen tasks unless intentionally designed

Possible CSS:

```css
.mobile-bottom-nav {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
```

Do not hard-code iPhone-specific dimensions.

## Navigation route mapping

During repository audit, produce a mapping:

| UI label | Existing route | Guest | Runner | Organizer | Mobile primary |
| --- | --- | --- | --- | --- | --- |
| Events | existing route | yes | yes | optional | yes |
| My Runs | existing route | no | yes | if also runner | yes |
| Activities | existing route | no | yes | no | yes/secondary |
| Results | existing route | public/auth based on current behavior | yes | yes | yes/secondary |
| Organizer | existing route | entry point | if organizer | yes | secondary |

Populate with actual route paths.

## Footer

The footer can contain:

```text
About
How It Works
FAQ / Help
Contact
Blog
Privacy
Terms
Community Guidelines
Refund Policy
Organizer information
```

Use current existing pages and names.

Do not create empty destinations simply because they appear here.

## Breadcrumbs

Use breadcrumbs for deep hierarchical screens, especially organizer/admin workflows.

Examples:

```text
Organizer > Events > Event Name > Submissions
```

Do not use breadcrumbs for every shallow public page.

## Navigation acceptance criteria

- one source of truth for primary nav items
- no duplicated route arrays solely for screen sizes
- desktop and mobile labels are consistent
- current route state is visible and semantic
- guest does not see authenticated-only links
- runner does not see unauthorized organizer controls
- organizer context is explicit
- mobile navigation works without horizontal overflow
- menu works with keyboard
- profile menu works with keyboard
- navigation works when JavaScript has not yet measured viewport size
- links remain deep-linkable and browser-native
