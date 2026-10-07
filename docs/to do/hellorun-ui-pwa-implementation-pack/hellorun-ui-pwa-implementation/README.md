# HelloRun Responsive Navigation and PWA Implementation Pack

## Purpose

This implementation pack defines how to refactor HelloRun into a consistent, mobile-first, installable web application without rewriting working business logic.

It is written for Codex, Claude Code, or another coding agent working directly in the HelloRun repository.

The main objectives are:

1. Create one simple and consistent navigation system.
2. Make every important workflow usable across mobile, tablet, desktop, and large screens.
3. Make HelloRun installable as a Progressive Web App.
4. Add an in-app "Install HelloRun" action when installation is supported.
5. Add a useful iOS installation fallback.
6. Preserve current authentication, event, registration, activity submission, organizer, leaderboard, results, payment, and other business logic.
7. Avoid creating duplicate routes, components, manifests, service workers, or design systems.
8. Establish reusable responsive patterns so future HelloRun features inherit the same UI behavior.

## Product context

HelloRun supports a workflow centered on:

- event discovery
- event registration
- participant records
- activity or proof submission
- submission review and status tracking
- results and leaderboards
- certificates or event recognition
- organizer event management

The public site also contains informational, help, policy, and content pages.

The navigation must reflect user intent rather than exposing every available route at the same level.

## Required implementation principle

Do not treat this as:

> desktop website + mobile patches + optional PWA

Treat it as:

> one responsive web application that also works as an installable PWA

The same codebase must support browser and installed-app use.

## Documents in this pack

| File | Purpose |
| --- | --- |
| `00-REPOSITORY-AUDIT.md` | Mandatory pre-change repository audit |
| `01-INFORMATION-ARCHITECTURE-AND-NAVIGATION.md` | Navigation model for guests, runners, and organizers |
| `02-RESPONSIVE-DESIGN-SYSTEM.md` | Breakpoints, layout rules, components, forms, tables, cards |
| `03-PWA-FOUNDATION.md` | Manifest, icons, metadata, service worker, caching |
| `04-INSTALL-EXPERIENCE.md` | Install button, installed-state detection, iOS fallback |
| `05-PAGE-MIGRATION-PLAN.md` | Priority page-by-page responsive refactor |
| `06-ACCESSIBILITY-AND-INTERACTION.md` | Keyboard, focus, targets, semantic navigation, dialogs |
| `07-TESTING-AND-ACCEPTANCE.md` | Required test matrix and acceptance criteria |
| `08-IMPLEMENTATION-EXECUTION-PLAN.md` | Recommended implementation phases and commits |
| `09-AGENT-INSTRUCTIONS.md` | Operating rules for Codex or Claude Code |

## External standards referenced

Use current browser behavior and repository-compatible tooling. Do not blindly copy code examples without checking framework requirements.

Primary references:

- MDN: Progressive Web Apps
- MDN: Making PWAs installable
- MDN: Trigger installation from your PWA
- MDN: Web application manifest
- WCAG 2.2 responsive and interaction guidance

Useful URLs:

- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- https://www.w3.org/TR/WCAG22/

## Non-negotiable constraints

- Audit before editing.
- Reuse existing components when they are sound.
- Do not break working routes or deep links.
- Do not rename routes merely to match this document.
- Do not change authentication behavior unless required for responsive navigation.
- Do not change authorization or role checks.
- Do not cache sensitive authenticated API responses indiscriminately.
- Do not cache mutation requests such as registration, payment, activity submission, review, or admin actions.
- Do not show a fake install button when the browser cannot perform installation.
- Do not make iOS users click a button wired to unsupported `beforeinstallprompt`.
- Do not create horizontal page scrolling at 320 CSS px except for content that inherently requires two-dimensional presentation.
- Do not solve responsiveness by shrinking text or controls until they are difficult to use.
- Do not introduce a second CSS framework unless the repository clearly requires migration and the change is explicitly justified.
- Do not replace the current brand visual identity unless necessary for accessibility or responsiveness.

## Definition of done

This project is complete when:

- the application uses a shared global navigation architecture
- mobile and desktop navigation use the same route configuration
- guest, runner, and organizer navigation states are role-aware
- major pages function at 320 px through large desktop sizes
- common forms do not overflow
- event lists and dashboards adapt cleanly
- key tables have an intentional mobile strategy
- dialogs and drawers are usable on mobile
- the app has a valid web app manifest
- installable browsers can install HelloRun
- an in-app install action appears only when meaningful
- iOS users receive correct Add to Home Screen guidance
- installed state hides redundant install prompts
- service worker caching is conservative and does not serve stale mutation or sensitive application state
- offline failure is understandable
- keyboard and screen-reader navigation remain usable
- the defined QA matrix passes
