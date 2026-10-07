# 03 - PWA Foundation

## Goal

Make HelloRun installable and provide a reliable app-like experience while protecting current data accuracy and authenticated workflows.

## First rule

Audit existing PWA infrastructure before adding anything.

If the repository already uses:

```text
Workbox
vite-plugin-pwa
Serwist
next-pwa
framework-native manifest APIs
custom service worker
```

extend that approach instead of layering another PWA system on top.

## Installability foundation

HelloRun should provide:

- HTTPS in production
- web app manifest
- app name
- short name
- start URL
- app scope
- standalone display mode
- theme color
- background color
- 192x192 icon
- 512x512 icon
- maskable icon
- Apple touch icon
- manifest reference in applicable pages/layout
- appropriate metadata

MDN documents manifest requirements used by Chromium-based browsers for installability, including a name/short name, 192 and 512 icons, `start_url`, and display configuration.

Reference:

https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

## Manifest

Use a framework-native manifest mechanism if the framework provides one.

Otherwise a conceptual manifest is:

```json
{
  "id": "/",
  "name": "HelloRun",
  "short_name": "HelloRun",
  "description": "Discover running events, join challenges, submit activities, and track your results.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "<existing HelloRun brand theme color>",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

Do not use placeholder colors in the final implementation.

Extract them from current HelloRun brand tokens.

## Manifest ID and start URL

Unless current routing/deployment requires something else:

```text
id: /
start_url: /
scope: /
```

If authentication redirects a signed-in user intelligently, keep that application behavior.

Do not make `start_url` point directly to a protected page unless the existing auth lifecycle safely handles it.

## Optional manifest shortcuts

After the base PWA works, consider shortcuts for existing routes only.

Example:

```json
"shortcuts": [
  {
    "name": "Find Events",
    "short_name": "Events",
    "url": "/events"
  },
  {
    "name": "My Runs",
    "short_name": "My Runs",
    "url": "<existing authenticated route>"
  },
  {
    "name": "Submit Activity",
    "short_name": "Submit",
    "url": "<existing submission route>"
  }
]
```

Do not include a shortcut whose route does not exist.

Protected shortcuts must redirect through existing auth correctly.

## Icons

Create app icons from the approved current HelloRun logo.

Required target assets:

```text
192x192 standard
512x512 standard
512x512 maskable
Apple touch icon appropriate to current framework/browser setup
favicon assets already used by site
```

### Maskable icon

The important logo content must remain inside a safe central area so OS-level cropping does not cut it off.

Do not simply rename a non-maskable icon.

Visually test it.

## App metadata

Set appropriate:

```text
application name
theme-color
Apple mobile web app metadata where still relevant
favicon
manifest link
description
```

Avoid conflicting duplicate tags across nested layouts.

## Service worker philosophy

PWA installation and offline support are separate concerns.

Do not force aggressive caching merely to call HelloRun a PWA.

HelloRun contains data where freshness matters:

```text
event registration state
submission review state
payment state
activity verification state
results
leaderboards
organizer management screens
authentication
```

Use conservative caching.

## Suggested caching matrix

Adapt to actual architecture.

| Resource | Strategy | Reason |
| --- | --- | --- |
| versioned CSS/JS bundles | cache-first or framework default | immutable/versioned assets |
| logo/icons/fonts | cache-first | stable assets |
| public static pages | stale-while-revalidate or framework strategy | low mutation risk |
| event images | stale-while-revalidate/cache-first with limits | performance |
| public event data | network-first | data can change |
| leaderboard/results data | network-first | freshness matters |
| authenticated dashboard data | network-first or no SW cache | private/current |
| authentication endpoints | network only | security/state |
| registration mutations | network only | writes |
| payment submission/review | network only | writes/sensitive |
| activity submission | network only | writes |
| organizer reviews | network only | writes |
| admin actions | network only | writes |

## Sensitive data

Do not put private API responses into broad shared caches without a deliberate design.

Do not cache:

```text
auth tokens
password-related responses
payment evidence
private user profile responses
mutation responses
organizer/admin action responses
```

unless the existing application has a proven, secure strategy.

## Offline page

Implement a simple offline experience.

Example:

```text
You're offline

HelloRun can't load the latest event or account information right now.

Check your connection and try again.

[Try Again]
```

Keep this branded and lightweight.

Do not claim that current event/submission data is available if it is not.

## Offline app shell

Cache enough static application shell resources to render a useful offline state if compatible with the stack.

Do not attempt full offline-first business logic in this phase.

## Offline writes

Do not queue registrations, payment submissions, activity submissions, review decisions, or organizer changes in the first implementation.

That introduces synchronization and duplicate-action risks.

A future phase may explicitly design background retry.

## Service worker updates

Prevent users from staying indefinitely on an old application shell.

Use the framework/plugin-recommended update lifecycle.

Potential UX:

```text
A new version of HelloRun is available.
Refresh
```

Do not force reload while the user is filling out or submitting a form.

If the chosen PWA plugin already implements update behavior, use it.

## Cache versioning

Use generated content hashes or tool-managed revisioning where possible.

Avoid manual never-expiring cache names that accumulate indefinitely.

Clean obsolete caches during service worker activation when using a custom service worker.

## Navigation fallback

If using an SPA:

- configure navigation fallback correctly
- do not intercept API requests as page navigation
- preserve server routes
- test deep links after install and refresh

If using SSR/multi-page rendering:

- follow framework conventions
- do not force SPA fallback behavior

## PWA acceptance criteria

- valid manifest loads in production
- production uses HTTPS
- icon assets load
- app name displays correctly
- installable Chromium browsers recognize HelloRun
- installed HelloRun launches within intended scope
- no second service worker conflicts
- service worker does not cache mutation endpoints
- stale private dashboard state is not served as authoritative data
- offline navigation produces an understandable result
- application updates can reach installed users
- deep-link refresh works
