# 08 - Implementation Execution Plan

## Goal

Deliver the changes incrementally with small, reviewable phases.

Do not refactor the entire repository in one uncontrolled pass.

## Phase 0 - Audit

Read:

```text
README
package.json
routing
layouts
navigation
styles
auth
roles
PWA files
```

Produce the audit defined in `00-REPOSITORY-AUDIT.md`.

No major code changes before this step.

## Phase 1 - Navigation model

Tasks:

1. identify canonical existing routes
2. define one navigation configuration
3. map auth/role visibility
4. define labels
5. define active-route rules
6. keep footer routes separate
7. preserve route guards

Deliverable:

```text
navigation configuration/service
tests where appropriate
```

## Phase 2 - Shared app shell

Tasks:

1. consolidate root header
2. desktop primary navigation
3. mobile app bar
4. mobile drawer
5. profile/account menu
6. role/context switch if needed
7. footer integration
8. content spacing

Do not add bottom navigation until shell behavior is stable.

## Phase 3 - Mobile bottom navigation

Only for authenticated runner application area where it improves repeated use.

Tasks:

1. choose up to five destinations
2. reuse nav source of truth
3. implement safe-area spacing
4. add active state
5. reserve page bottom space
6. validate dialogs/forms

If current architecture does not benefit from bottom nav, document the reason and keep mobile drawer as primary navigation.

## Phase 4 - Responsive primitives

Create or consolidate:

```text
PageContainer
Stack
Inline
ResponsiveGrid
PageHeader
Card
FormSection
Dialog/Drawer wrappers
table responsive wrapper
mobile filter panel
```

Do not over-abstract single-use components.

## Phase 5 - Public high-traffic pages

Migrate:

```text
home
events
event detail
auth
```

Test before continuing.

## Phase 6 - Runner workflows

Migrate:

```text
My Runs/dashboard
registration
activity submission
results
leaderboards
profile
```

Prioritize mobile submission usability.

## Phase 7 - Organizer workflows

Migrate:

```text
organizer dashboard
events
participants
registrations
payments
submissions/reviews
results
settings
```

Do not weaken authorization.

## Phase 8 - PWA manifest and metadata

Tasks:

1. inspect existing implementation
2. create/extend manifest
3. add correct brand metadata
4. create/check icons
5. add maskable icon
6. link manifest through framework conventions
7. validate production paths

Do not add service worker yet if manifest can be tested independently.

## Phase 9 - Install experience

Tasks:

1. centralize install state
2. handle `beforeinstallprompt`
3. show conditional Install HelloRun action
4. handle `appinstalled`
5. detect standalone
6. implement iOS guidance
7. avoid automatic prompts
8. test browser navigation

## Phase 10 - Service worker/offline

Tasks:

1. use framework-compatible SW tooling
2. cache static assets conservatively
3. implement offline fallback
4. use network-first/no-cache for fresh/private data
5. exclude mutations
6. implement update lifecycle
7. remove obsolete cache versions

## Phase 11 - QA and hardening

Execute `07-TESTING-AND-ACCEPTANCE.md`.

Fix:

```text
overflow
focus bugs
role-navigation bugs
PWA install issues
service worker stale state
mobile form issues
safe-area issues
large-screen stretching
```

## Suggested commit boundaries

Use repository conventions.

Possible sequence:

```text
refactor: centralize navigation configuration
feat: add responsive application shell
feat: add mobile navigation
refactor: add responsive layout primitives
refactor: improve event browsing on mobile
refactor: improve runner workflows on mobile
refactor: improve organizer workflows on mobile
feat: add HelloRun web app manifest
feat: add install HelloRun experience
feat: add conservative PWA offline support
test: add responsive and PWA coverage
```

Do not force these exact messages.

## PR description requirements

The final change description should include:

```text
What changed
Why
Routes affected
Navigation behavior
Role behavior
Responsive behavior
PWA behavior
Caching behavior
Manual tests performed
Known limitations
Screenshots at mobile/tablet/desktop
Install test results
```

## Rollback safety

PWA/service worker changes have a longer client lifetime than normal frontend files.

Before production:

- verify service worker scope
- verify cache cleanup
- verify rollback deployment can replace previous worker
- verify no API route is unexpectedly intercepted
- verify manifest URLs are absolute/root-safe as needed

## Future enhancements not required in this implementation

Do not scope-creep into these unless already requested:

```text
offline submission queue
push notifications
background sync
share target
file handlers
native wrapper
Capacitor
React Native
mobile app store publishing
full design rebrand
new analytics provider
```

The architecture should not unnecessarily block them.
