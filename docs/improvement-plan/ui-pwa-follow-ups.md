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
| Breakpoints and tokens | 59 distinct `@media` widths across 61 stylesheets, and two overlapping token sets with conflicting radii. Shared spacing, z-index and reference breakpoints now exist in `design-system.css` (October 4); existing rules have not been migrated to them. | Medium (long tail) |
| Tables | 55 tables across 34 views. About 31 are inside `*-table-wrap` scrollers. The policy-page tables are not wrapped. | Medium |
| Dialogs | 16 native `<dialog>` elements and 42 custom `role="dialog"` implementations. | Medium (defer) |

Already sound, so keep it:
- `aria-current` and `is-active` on the current page, now computed in `src/config/navigation.js`.
- Menu toggle focus trap, Escape and outside-click handling in `public/js/main.js`.
- Workspace-based role switching via `src/utils/workspace.js` and POST `/workspace/:workspace`.
- The `<details>`-based events filter panel.
- Browser zoom is not disabled.

## Next phases

### D — Navigation consolidation (done October 3–4)
`src/config/navigation.js` is now the single source of truth for the nav. Each bottom
tab bar has at most five destinations. The account menu (October 4) holds My profile,
Install HelloRun, the workspace switch and Log out. See the changelog.

### E — Responsive foundation (done October 4)
- Tokens, `.hr-container`, `.hr-grid`, `.hr-table-wrap`, a site-wide reduced-motion rule
  and the site-wide skip link are all in place.
- Overflow was measured at 12 widths across about 80 pages. The offenders were fixed
  and `body { overflow-x: hidden }` was removed. See the changelog.
- Not done: a shared event card. The audit's "duplicated event card" was inaccurate.
  `event-card`, `featured-event-card`, `about-event-card` and `organizer-event-card` are
  four different designs with their own CSS, and the listing card is used in one place.
  Merging them would be a redesign, not a refactor.
- Not measured: PostgreSQL-backed pages (organiser event shop and audit) and blog
  posts. Re-run the measurement against staging once one exists.

### F — Page migration (first pass done October 4)
An audit-driven pass replaced the planned page-by-page rewrite. Overflow (phase E) and
accessibility/interaction checks now pass on the 26 priority pages: targets, names,
`alt`, IDs, `<h1>` and fixed-bar overlap. See the changelog.

Already met before this work, verified October 4 at 390px:
- **Event detail order on phones.** Rendered order: status and mode, organiser, title,
  summary, fee, then **Register Now inside the first screen** (y≈742 of 800px). Then key
  facts, how it works, submission rules (proof requirements), categories and rewards.
  This matches the pack's decision-first order.
- **Leaderboard on phones.** `event-leaderboard.ejs` renders `leaderboard-mobile-card`
  entries (rank, runner, main metric, progress), and `leaderboard.css` hides the table
  at 900px and below.

Still open:
- Unifying the 42 custom `role="dialog"` implementations on native `<dialog>`. This is
  large and touches review, registrant and admin workflows, so it belongs on its own
  branch.
- Real-device checks: iOS Safari and Android Chrome, including install.

## Constraints
- New partials must pass `tests/blog-template-escaping.unit.test.js`, which means using
  `<%= %>` by default.
- The service worker must keep ignoring non-GET and cross-origin requests and must never
  cache HTML. The behavioural tests in `tests/pwa-foundation.unit.test.js` enforce this.
- To roll back the service worker, deploy a `sw.js` with these properties:
  - `install` calls `skipWaiting()`.
  - `activate` deletes all `hellorun-*` caches and calls `self.registration.unregister()`.
  - It has no fetch handler.
