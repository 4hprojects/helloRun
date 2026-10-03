# UI and PWA Follow-Ups

**Created:** October 3, 2026

**Source:** a repository audit against the external "HelloRun Responsive Navigation and
PWA Implementation Pack", which was supplied as generic, framework-agnostic guidance. The
audit found that the pack assumes a component framework, with hooks, providers and SPA
fallback. HelloRun is server-rendered Express + EJS with plain CSS and vanilla JS, so the
pack's guidance has been translated to fit that architecture below.

## Delivered October 3

These were phases A–C of the pack: the manifest, icons and metadata, a conservative
service worker with an offline page and update prompt, and the **Install HelloRun**
control with iOS guidance. See
[changelog/2026-10-october.md](../changelog/2026-10-october.md). Live-device
verification is listed in [STATUS.md](../STATUS.md).

## Audit findings that remain open

| Area | Current state | Gap |
|---|---|---|
| Account menu | There is no profile or account menu. The user area has only an avatar, a greeting and a logout icon. | Medium |
| Breakpoints and tokens | 59 distinct `@media` widths across 61 stylesheets. Two overlapping token sets with conflicting radii: legacy tokens in `style.css` and `--hr-*` tokens in `design-system.css`. There are no spacing, breakpoint or z-index tokens. | High (long tail) |
| Overflow | `style.css` sets `body { overflow-x: hidden }`, which hides overflow instead of fixing it. 17 large `min-width` rules, mainly in `organizer-events.css` (up to 1840px) and `admin.css`. | High |
| Event card | There is no shared partial. `article.event-card` is duplicated in `pages/events.ejs`, `home.ejs`, `about.ejs` and `organizer/dashboard.ejs`. | Medium |
| Tables | 55 tables across 34 views. About 31 are inside `*-table-wrap` scrollers. The policy-page tables are not wrapped. | Medium |
| Dialogs | 16 native `<dialog>` elements and 42 custom `role="dialog"` implementations. | Medium (defer) |
| Skip link | Only the home page has one. | Low |

Already sound, so keep it:
- `aria-current` and `is-active` on the current page, now computed in `src/config/navigation.js`.
- Menu toggle focus trap, Escape and outside-click handling in `public/js/main.js`.
- Workspace-based role switching via `src/utils/workspace.js` and POST `/workspace/:workspace`.
- The `<details>`-based events filter panel.
- Browser zoom is not disabled.

## Next phases

### D — Navigation consolidation (done October 3, except the account menu)
`src/config/navigation.js` is now the single source of truth for the nav. Each bottom
tab bar has at most five destinations, the workspace switch is in the header menu, and
the organiser bell has `aria-current`. See the changelog.

Still open: a `<details>`-based account menu (Profile, Install HelloRun, Switch
workspace, Log out). It changes the desktop header layout, so it needs a visual review
before it ships.

### E — Responsive foundation
- Add spacing and z-index tokens, plus documented reference breakpoints of 480, 768,
  1024 and 1280, to `design-system.css`.
- Add shared `.hr-container`, `.hr-grid` and `.hr-table-wrap` utilities, a global
  reduced-motion rule and a site-wide skip link.
- Extract `partials/event-card.ejs`.
- Fix the 320px offenders, then remove `body { overflow-x: hidden }`.

### F — Page migration
Migrate one pull request per area, in this order:
1. Event detail and registration.
2. Runner submissions and the run-proof modal.
3. Leaderboards.
4. Organiser and admin tables.

Desktop rendering must stay unchanged.

## Constraints
- New partials must pass `tests/blog-template-escaping.unit.test.js`, which means using
  `<%= %>` by default.
- The service worker must keep ignoring non-GET and cross-origin requests and must never
  cache HTML. The behavioural tests in `tests/pwa-foundation.unit.test.js` enforce this.
- To roll back the service worker, deploy a `sw.js` with these properties:
  - `install` calls `skipWaiting()`.
  - `activate` deletes all `hellorun-*` caches and calls `self.registration.unregister()`.
  - It has no fetch handler.
