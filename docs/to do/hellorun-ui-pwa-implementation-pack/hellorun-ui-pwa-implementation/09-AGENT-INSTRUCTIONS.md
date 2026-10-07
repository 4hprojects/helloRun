# 09 - Instructions for Codex / Claude Code

## Mission

Implement the HelloRun navigation, responsive UI, and PWA improvements defined in this folder.

Work from the repository as the source of truth.

These documents specify desired behavior, not permission to invent routes or replace working business logic.

## Required reading order

Read:

```text
README.md
00-REPOSITORY-AUDIT.md
01-INFORMATION-ARCHITECTURE-AND-NAVIGATION.md
02-RESPONSIVE-DESIGN-SYSTEM.md
03-PWA-FOUNDATION.md
04-INSTALL-EXPERIENCE.md
05-PAGE-MIGRATION-PLAN.md
06-ACCESSIBILITY-AND-INTERACTION.md
07-TESTING-AND-ACCEPTANCE.md
08-IMPLEMENTATION-EXECUTION-PLAN.md
```

Then inspect the repository.

## Step 1 - Audit first

Before implementation:

- identify framework
- identify router
- identify styling system
- identify auth
- identify roles
- identify layouts
- identify existing navigation
- identify PWA files
- inventory routes

Do not assume the examples in these docs are literal route paths.

## Step 2 - Produce a brief plan

Before large modifications, state:

```text
Existing architecture discovered
Files/components to reuse
Files/components to change
Any conflicts with this specification
Implementation phases
```

Resolve conflicts in favor of:

1. preserving working business logic
2. repository/framework best practices
3. the user-experience goals in this pack

## Step 3 - Make minimal coherent changes

Prefer:

```text
reuse
refactor
centralize
extend
```

over:

```text
duplicate
replace everything
add a second framework
create parallel navigation systems
```

## Mandatory prohibitions

Do not:

- rename working URLs without a migration requirement
- remove current features
- weaken authentication
- weaken role authorization
- expose organizer/admin routes to unauthorized users
- add fake placeholder pages
- add a second router
- add a second CSS framework without explicit justification
- create a second manifest if one exists
- create conflicting service workers
- cache sensitive data casually
- cache write/mutation requests
- make install prompts automatic on page load
- use iOS `beforeinstallprompt` as if it were supported
- hide horizontal overflow globally to conceal responsive bugs
- implement device-specific CSS for named phone models
- use viewport JavaScript for layout that CSS can solve
- make mobile a stripped-down version that removes core workflow functionality

## Code quality expectations

- follow repository naming conventions
- follow existing formatting
- type new code appropriately if TypeScript is used
- avoid `any` unless genuinely required
- do not suppress lint warnings without reason
- clean up event listeners
- centralize browser feature detection
- avoid repeated user-agent detection
- reuse existing modal/menu primitives
- write comments for non-obvious PWA behavior
- remove dead code after migration

## Navigation implementation rule

There must be one canonical primary navigation definition.

Desktop, drawer, bottom nav, and account UI may render different subsets but must not independently hard-code conflicting routes/labels.

## Responsive implementation rule

Fix components at their source.

Do not accumulate route-specific CSS patches for the same repeated component.

Example:

Bad:

```text
events.css fixes EventCard
dashboard.css fixes EventCard differently
home.css fixes EventCard again
```

Better:

```text
EventCard owns its responsive behavior
```

## PWA implementation rule

Use the framework's recommended current approach.

If a dependency is necessary:

1. check whether an equivalent dependency already exists
2. choose a maintained solution
3. justify the dependency
4. avoid large dependency trees for a simple manifest/install handler
5. keep service worker scope clear

## Browser feature detection

Prefer capabilities.

Examples:

```text
beforeinstallprompt availability
display-mode media query
serviceWorker in navigator
```

Avoid relying entirely on user-agent sniffing.

Use targeted iOS detection only for the manual installation instruction path if no cleaner platform capability is available.

## Data freshness

HelloRun contains state that changes.

Treat as fresh/current:

```text
registration status
payment review
activity review
event availability
results
leaderboards
organizer queues
```

Do not make offline caching change the authoritative meaning of these screens.

## Forms

Never lose form values simply because the responsive shell rerenders.

Do not cause hydration/client/server mismatch through viewport-dependent initial rendering.

## SSR/hydration

If the framework uses SSR:

- do not access `window` or `navigator` during server render
- place PWA install logic in client-only lifecycle
- avoid rendering different markup server/client merely from window width
- use CSS for responsive presentation

## Tests

Run existing:

```text
lint
typecheck
unit tests
integration tests
build
```

Do not ignore pre-existing failures.

Separate pre-existing failures from regressions introduced by this work.

Add focused tests where the existing test architecture supports them.

## Manual validation

At minimum manually verify:

```text
320px
390px
768px
1024px
1440px
```

and one real/simulated Android install flow plus iOS manual install behavior if available.

## Completion response

When implementation is complete, report:

```markdown
## Implemented

- ...

## Key files changed

- ...

## PWA behavior

- ...

## Responsive behavior

- ...

## Tests run

- ...

## Remaining limitations

- ...
```

Do not claim a browser/device test was performed unless it was actually performed.
