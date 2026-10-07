# HelloRun Implementation Checklist

## Audit

- [ ] framework identified
- [ ] router identified
- [ ] CSS strategy identified
- [ ] component library identified
- [ ] auth identified
- [ ] role model identified
- [ ] route inventory completed
- [ ] existing nav components identified
- [ ] existing PWA files identified
- [ ] existing breakpoints/tokens identified

## Navigation

- [ ] primary nav configuration centralized
- [ ] guest desktop nav
- [ ] guest mobile nav
- [ ] runner desktop nav
- [ ] runner mobile nav
- [ ] organizer context
- [ ] role visibility
- [ ] current-route state
- [ ] keyboard support
- [ ] account menu
- [ ] bottom nav decision documented

## Responsive

- [ ] page shell
- [ ] containers
- [ ] grids
- [ ] cards
- [ ] event cards
- [ ] forms
- [ ] uploads
- [ ] filters
- [ ] dialogs
- [ ] tables
- [ ] leaderboards
- [ ] dashboards
- [ ] long content
- [ ] safe areas
- [ ] no 320px document overflow

## PWA

- [ ] manifest
- [ ] name/short name
- [ ] start URL
- [ ] scope
- [ ] standalone display
- [ ] theme/background
- [ ] 192 icon
- [ ] 512 icon
- [ ] maskable icon
- [ ] Apple touch icon
- [ ] manifest linked
- [ ] service worker audited
- [ ] offline state
- [ ] update lifecycle
- [ ] mutation routes excluded from unsafe cache

## Install

- [ ] centralized install state
- [ ] beforeinstallprompt handling
- [ ] user-triggered native prompt
- [ ] appinstalled handling
- [ ] standalone detection
- [ ] conditional install UI
- [ ] iOS instructions
- [ ] unsupported-browser behavior

## Accessibility

- [ ] landmarks
- [ ] aria-current
- [ ] focus-visible
- [ ] keyboard nav
- [ ] drawer focus management
- [ ] profile menu
- [ ] form labels
- [ ] validation association
- [ ] icon button labels
- [ ] status not color-only
- [ ] reduced motion consideration

## QA

- [ ] 320
- [ ] 360
- [ ] 375
- [ ] 390
- [ ] 412
- [ ] 480
- [ ] 768
- [ ] 1024
- [ ] 1280
- [ ] 1440
- [ ] 1920
- [ ] guest
- [ ] runner
- [ ] organizer
- [ ] Android install
- [ ] iOS Add to Home Screen guidance
- [ ] offline
- [ ] app update
- [ ] build
- [ ] lint
- [ ] typecheck
- [ ] existing tests
