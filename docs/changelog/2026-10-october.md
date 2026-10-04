# HelloRun Changelog — October 2026

## October 4 — Responsive foundation and measured overflow fixes

- **Measured, not assumed.** Overflow was checked in headless Chromium against the real
  app.
  - **Setup:** the app ran against an ephemeral local MongoDB seeded with long-content
    fixtures. Every external service was blanked or pointed at a dead port.
  - **Coverage:** about 80 guest, runner, organiser and admin pages, at 12 widths from
    320 to 1440px.
  - **Method:** the old `body` clip was lifted during measurement so hidden overflow
    would show.
  - **Not covered:** pages backed by PostgreSQL (organiser event shop and audit) returned
    500 locally and were not measured.
- **Guest mobile menu bug fixed.** Below 900px, Log in and Sign Up were laid out side by
  side, which pushed **Sign Up outside the menu**. `body { overflow-x: hidden }` then
  clipped it, so guests on phones could not reach Sign Up from the menu. An unscoped
  `.nav .nav-auth-buttons { display: flex }` was overriding the mobile `display:
  contents`; the mobile rule is now re-asserted after it.
- **Mobile menu missing on six pages.** These pages never loaded `main.js`, which drives
  the menu button: organiser certificate setup, organiser complete-profile, admin
  promote, reset password, and both certificate verification pages. Every page with the
  shared nav now loads it.
- **Other overflows fixed:**
  - Cookie Policy choice buttons at 320–360px.
  - Admin page headers on analytics and promote, which now wrap their actions.
  - The organiser registrant roster at 761–800px: the header now wraps and the column
    minimums are lower.
  - Signed-in `/events` at 761–768px, where the global `.btn { width: 100% }` widened a
    header action.
  - 18 `repeat(auto-fit|auto-fill, minmax(≥200px, …))` grids now use
    `minmax(min(100%, N), …)`. This is identical wherever the container is at least N
    wide.
- **`body { overflow-x: hidden }` removed.** It hid the bugs above and broke
  `position: sticky`. With it gone, no measured page overflows at any width.
- **Shared foundation in `design-system.css`:**
  - spacing, gutter and z-index tokens, plus documented reference breakpoints;
  - `.hr-container`, `.hr-grid` and `.hr-table-wrap`;
  - a site-wide reduced-motion rule.
- **Skip link on every page.** It is rendered once by `layouts/nav.ejs` and replaces the
  home-only link. `main.js` gives the first `<main>` the `#main-content` target when a
  page lacks it.
- **DB-free coverage:** `tests/responsive-foundation.unit.test.js`. It guards against a
  returning body clip, fixed grid minimums of 200px or more, a missing or duplicate skip
  link, pages without the menu script, the mobile auth-button ordering, and each
  overflow fix.

## October 3 — Navigation consolidated into one configuration

- `src/config/navigation.js` is now the single source of truth for the global
  navigation. Each destination is defined once. `buildNavigation(locals)`, exposed as
  `app.locals.buildNavigation`, returns the header row, the guest sign-in actions, the
  workspace switch and the mobile bottom tabs for the current visitor and workspace, and
  marks the current page.
- `layouts/nav.ejs` only renders that result. Header links share the new
  `layouts/nav-item.ejs` partial. The hard-coded duplicates are gone; for example,
  `/runner/notifications` was previously written out in three branches.
- Behaviour changes, deliberately limited:
  - Every bottom-tab bar now has at most five destinations. The runner and organiser
    workspace switch was a sixth tab; it now lives only in the header menu, which is
    also the mobile menu.
  - The organiser notification bell now gets `aria-current` when it is the current page.
  - Redundant or ineffective attributes were removed: `role="navigation"` on `<nav>` and
    `aria-label` on the plain `.nav-user` div. All nav icons are now `aria-hidden`.
  - Rendered markup is otherwise unchanged. This was checked by diffing the old and new
    templates for the guest, runner, organiser, pending-organiser and admin cases.
- Visibility remains presentation only. Route guards are unchanged.
- The footer stays separate, because it holds content and policy pages.
- DB-free coverage: the new `tests/navigation-config.unit.test.js` covers role and
  workspace visibility, the five-tab limit, active-page matching, the notification
  summary, and checks that each destination has a GET route. The nav tests that matched
  template source text now assert on rendered output through `tests/helpers/render-nav.js`.

## October 3 — Installable PWA foundation and Install HelloRun

- HelloRun can now be installed as a Progressive Web App. `src/public/manifest.webmanifest`
  (`id`, `start_url` and `scope` set to `/`, standalone, theme `#c2410c`, background
  `#f8fafc`) is linked from `layouts/head.ejs`, together with `theme-color`, application-name
  metadata, and shortcuts to `/events` and `/my-registrations`.
- Icons generated from `helloRun-icon.png` in `src/public/images/pwa/`: 192 and 512 standard,
  a 512 maskable icon with the logo inside the safe zone, and a 180×180 opaque Apple touch
  icon. This replaces the 32×32 favicon that was previously used as the touch icon.
- Conservative service worker, `src/public/sw.js`. It does not intercept non-GET requests
  or cross-origin requests. Page HTML is never cached: navigations always go to the network
  and fall back to the static `/offline.html`. Only same-origin `/css/`, `/js/` and
  `/images/` assets are cached, stale-while-revalidate, excluding `/js/vendor/`.
- `/sw.js` is served by its own route (`src/utils/service-worker.js`) with `no-cache` and a
  cache version stamped from the deployed commit. Each deploy therefore installs a new
  worker, and that worker deletes the previous caches. The manifest and offline page are
  also `no-cache`.
- When a new worker is waiting, the page shows "A new version of HelloRun is available" with
  a Refresh button. The page reloads only when the user clicks it.
- `src/public/js/pwa.js` holds the install state. It publishes the state as `data-pwa-install`
  on `<html>`:
  - Chromium's `beforeinstallprompt` enables an **Install HelloRun** nav control that opens
    the native prompt. The prompt only opens on a click.
  - On iPhone and iPad browser tabs, the control opens Add to Home Screen guidance instead.
  - The control is hidden when the app is already installed, running standalone, inside
    in-app webviews, and on browsers that offer no install path.
  - `pwa.css` controls visibility.
- DB-free coverage: `tests/pwa-foundation.unit.test.js`. It checks the manifest and icon
  dimensions, the shortcut routes, the head and nav wiring, and the install-module
  invariants. It also runs the real worker in a VM sandbox against mocked caches and
  fetch, confirming that writes, API and cross-origin requests are ignored, navigations
  are not cached, the offline fallback works, and static assets are cached.
- Not yet verified: installation on a real Android or iOS device, and the update flow
  against a production deploy.

## October 3 — Admin promotion live send status

- `/admin/promote` has a **Live Send Status** card under Recipient Preview. It shows every
  campaign that is currently sending (admin, organiser and automatic-publish), with a progress
  bar, sent/failed/skipped/queued counters and a per-recipient list
  (pending → sending → sent/failed/skipped/suppressed/queued). It polls
  `GET /admin/promote/live` every 3 seconds while a campaign is sending, pauses while the tab is
  hidden, and updates the Recent Campaigns row when a campaign finishes. Recipient emails are
  shown to full administrators only; the endpoint requires `requireFullAdmin`.
- `dispatchEventPromotionCampaign` now records progress after each recipient through a
  best-effort tracker. `EventPromotion` gains `deliveries` (capped at 1,000; counters stay
  exact beyond the cap), `deliveryListTruncated`, `processedCount`, `lastProgressAt` and
  `completedAt`, plus a `{ status, createdAt }` index. A campaign with no progress for two
  minutes is shown as stalled.
- After a send, the redirect includes the new `campaign` id so the page tracks it immediately.
- DB-free coverage: `tests/admin-promote-live-status.unit.test.js`. No live-database
  verification was run.

## October 3 — October Active Run 2026 published

### October Active Run 2026

- **Live at `/events/october-active-run-2026`** (reference `OAR-260210`, event
  `6abfdb46e6176464b7c200d2`). Free virtual accumulated-distance challenge with six
  categories: 25K, 50K, 75K, 100K, 150K and 200K.
- Activity window October 1–31, 2026; registration closes October 22, 2026 at
  11:59 PM Asia/Manila; final proof deadline November 14, 2026. Activities from
  October 1 onward count even though the event was published on October 3.
- Event content lives in `src/content/events/october-active-run-2026.js`;
  `npm run event:create-october-active-run-2026` is dry-run unless `--apply` is passed.
  The apply run uploaded the banner, poster and badge to R2, published the certificate
  template, and created 19 finisher badges (none deferred). Automatic email promotion
  is disabled.
- The banner and poster published on October 3 are text edits of the September Active
  Run artwork.

### October Active Run artwork replacement

- New illustrated banner (1920×1080), poster (1080×1620) and transparent badge
  (1254×1254) replace the September-derived artwork in
  `assets/events/october-active-run-2026/`: rice terraces at sunset with palms, a runner
  and a walker on a winding road, in HelloRun green, orange and gold. The badge drops the
  maple-leaf motif.
- `npm run event:update-october-active-run-2026-artwork` uploads the committed artwork
  to R2, updates the event's banner, poster, logo and badge URLs and the active
  certificate template's logo and artwork, and re-synchronises the badge image on the
  event's PostgreSQL badges. It is dry-run unless `--apply` is passed and keeps the
  previous R2 objects so already-shared links still resolve.
