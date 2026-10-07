# 07 - Testing and Acceptance Criteria

## Goal

Do not mark the work complete based only on one desktop screenshot.

Test application behavior, responsive layout, navigation, authentication state, and PWA installation.

## Test environments

At minimum test:

### Desktop

```text
Chrome/Chromium
Edge or another Chromium browser
Firefox
Safari if development environment permits
```

### Mobile

```text
Android Chrome/Chromium
iOS Safari on a real device or reliable device test environment
```

Real-device validation is strongly preferred for install behavior.

## Viewport matrix

Test:

```text
320 x representative height
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

Also resize continuously between sizes.

A component can fail between standard device presets.

## State matrix

Test navigation as:

```text
guest
runner
organizer
runner + organizer if supported
admin if supported
```

Test:

```text
logged out
logged in
expired session
loading user/role state
```

The navigation must not flicker unauthorized destinations in a harmful way.

## Content-state matrix

Important pages need:

```text
loading
empty
error
one item
many items
long names
long event title
long filename
long URL
large numeric value
```

## Navigation acceptance tests

### Desktop

- logo works
- primary routes work
- active route is visible
- profile menu works
- role-specific links are correct
- install link does not shift layout badly
- browser back/forward works

### Mobile

- menu opens
- menu closes
- route click closes menu
- backdrop behavior works
- Escape works where applicable
- body does not scroll behind modal navigation
- bottom nav does not obscure content
- bottom nav handles safe area
- active state works
- long labels do not overflow

## Responsive acceptance tests

For each priority page:

- no document-level horizontal scrollbar
- content stays within viewport
- heading wraps
- buttons remain usable
- cards resize
- images do not overflow
- dialogs fit
- mobile keyboard does not make forms unusable
- fixed headers/bottom bars do not cover anchors/actions
- content remains bounded on large screens

## Event listing tests

Test:

- no events
- one event
- many events
- long event title
- long organizer name
- image and no image
- open/closed state
- filter open/close
- reset filters
- sort
- active filter chips
- pagination/load more

Mobile filter panel must remain usable at 320 px.

## Event detail tests

Test:

- registration open
- registration closed
- already registered
- guest
- authenticated
- organizer-owned event if relevant
- long rules
- multiple event metadata rows
- payment instructions if present

## Form tests

Test:

- required errors
- server error
- slow submission
- success
- long field values
- upload file name
- image preview
- multiple validation errors
- mobile keyboard
- autofill
- password managers on auth pages

## Table tests

For each table, confirm its selected mobile strategy.

Do not accept:

```text
page itself scrolls sideways because table is too wide
```

Local table scrollers are acceptable where intentional.

## Accessibility checks

Automated checks can assist but do not replace manual testing.

Test manually:

- Tab order
- Shift+Tab
- Enter/Space activation
- Escape for overlays
- focus visibility
- focus return
- page landmarks
- labels
- active-route semantics

If repository already includes axe or accessibility testing, extend it.

## PWA manifest tests

Confirm:

- manifest request succeeds
- correct MIME type where platform requires
- name
- short name
- start URL
- scope
- display
- theme/background colors
- icons resolve
- 192 icon works
- 512 icon works
- maskable icon is visually safe

## Install tests

### Chromium

Test:

1. app is not installed
2. browser determines app is installable
3. HelloRun install CTA appears
4. click CTA
5. native prompt opens
6. dismiss once
7. app remains functional
8. invoke again when browser permits
9. accept
10. app installs
11. `appinstalled` path updates state
12. install CTA disappears
13. launch installed app
14. installed display is appropriate
15. internal links remain in scope

### iOS

Test:

- install guidance appears only where appropriate
- no broken Chromium prompt code
- Add to Home Screen flow works according to current Safari UI
- installed app opens
- install guidance does not remain visible in standalone mode

## Service worker tests

Test:

- first load online
- second load online
- refresh
- update deployment
- offline navigation
- reconnect
- API failure
- authenticated screens
- logout
- another account login on shared device if feasible

Ensure cached private content does not leak across sessions.

## Mutation safety tests

With service worker active:

```text
register for event
submit activity
submit payment proof
approve/reject review
edit event
profile update
```

Use only mutations that exist and can be safely tested.

Confirm requests reach network and are not replayed from an inappropriate cache.

## Update lifecycle

Deploy a visible test change.

Confirm installed PWA can obtain the new version.

Do not accept a service worker that traps the application on old assets.

## Performance sanity

Check:

- navigation bundle does not become disproportionately large
- icon assets are optimized
- large images do not block primary content
- service worker does not precache an excessive payload
- drawer/modal libraries are not duplicated unnecessarily

## Lighthouse

Use Lighthouse PWA/performance/accessibility checks where meaningful, but do not treat a score as the sole success criterion.

Document significant remaining issues.

## Definition of done checklist

```text
[ ] repository audit completed
[ ] shared nav configuration implemented
[ ] desktop navigation implemented
[ ] mobile navigation implemented
[ ] role-aware navigation verified
[ ] active-route semantics verified
[ ] responsive primitives implemented
[ ] priority pages migrated
[ ] tables have explicit mobile behavior
[ ] forms tested on mobile
[ ] manifest valid
[ ] icons valid
[ ] install CTA works on Chromium
[ ] iOS fallback works
[ ] installed state detected
[ ] service worker strategy verified
[ ] mutations not in unsafe caches
[ ] offline state works
[ ] update path works
[ ] keyboard testing passed
[ ] 320px test passed
[ ] large desktop test passed
[ ] real mobile device install tested
```
