# Admin Event Editor Full-Desktop UI/UX Deep Dive

> Primary route: `/admin/events/:id/edit`
> Shared surfaces: `/organizer/events/:id/edit`, `/organizer/create-event`
> Desktop scope: 1025px and wider; primary review widths are 1280, 1440, and 1920px
> Analysis date: 2026-07-16
> Status: Current-state audit and implementation backlog; no UI changes are included in this document

## Executive summary

The five-group Event Builder is directionally correct for desktop: it uses the 1200px HelloRun grid, keeps group navigation available during long edits, preserves lifecycle-aware actions, and exposes validation state. The remaining high-risk issues are structural rather than decorative.

The edit template is visually reordered with CSS instead of being physically ordered in the DOM. As a result, keyboard and screen-reader traversal does not follow what a sighted user sees. The local-autosave notice is inserted as an unassigned direct child of the two-column form grid, which can displace the intended rail/content placement. Action priority is also incomplete: when Submit for Review is absent, Save Changes remains visually secondary even though it is the primary task.

The recommended sequence is therefore:

1. correct DOM, heading, grid, save-state, and lifecycle-action semantics;
2. consolidate navigation ownership and make scrollspy deterministic;
3. refine desktop density and long-section navigation;
4. add operational context only after the editing foundation is stable.

## Audit scope and evidence

This audit treats the admin editor as the primary workflow and calls out shared effects because Create Event and organizer Edit use the same builder CSS, navigation partial, workspace autosave, and group client behavior.

Evidence was collected from:

- `src/views/organizer/edit-event.ejs` and `create-event.ejs`;
- `src/views/organizer/partials/event-builder-navigation.ejs`;
- `src/public/css/create-event.css` and the shared `.workspace-autosave-status` rule;
- `src/public/js/event-builder-groups.js` and `main.js`;
- admin editor and responsive DB-free tests.

The authenticated route cannot be visually inspected from an unauthenticated client: the local request returns `302` to `/login`. Findings below are tagged **Source-verified** when established directly from implementation. Items tagged **Browser validation** require a logged-in desktop session before acceptance.

## Current desktop composition

| Region | Current behavior | Assessment |
|---|---|---|
| Page header | Event title, status/reference in admin mode, and published-event warning | Useful identity, but navigation and save context are fragmented |
| Builder rail | Five sticky groups below the global navigation | Correct concept; group-level navigation is coarse for very long groups |
| Main column | Visually ordered sections inside five groups | Visual order is correct, but edit-template DOM order is not |
| Autosave state | JavaScript prepends a local-save message directly to the form | Can disrupt grid placement and competes with admin dirty-state messaging |
| Review/actions | Fixed full-width action dock sourced from the final Review section | Persistent, but navigation and mutations compete and non-draft Save lacks primary emphasis |
| Validation | Error summary links to exact fields or section fallbacks | Good recovery direction; completion labels are not authoritative readiness |

## Priority matrix

| ID | Priority | Finding | User impact | Evidence |
|---|---|---|---|---|
| D-01 | P0 | Edit DOM order differs from visual group order | Keyboard and assistive-technology workflow becomes unpredictable | Source-verified |
| D-02 | P0 | Group headings are CSS-ordered separately from their content | Heading navigation does not describe the rendered sequence | Source-verified |
| D-03 | P0 | Autosave status becomes an unassigned grid child | Rail/main-column placement can shift when shared JavaScript initializes | Source-verified |
| D-04 | P0 | Local save, dirty state, and server save use competing messages | Administrators can misread local recovery as a completed server save | Source-verified |
| D-05 | P0 | Save Changes remains secondary when it is the only mutation | Published and pending-review workflows have no clear primary action | Source-verified |
| D-06 | P0 | Group completion is derived from HTML `required` controls | Navigation can overstate readiness and undermine trust | Source-verified |
| D-07 | P1 | Hidden 13-step navigation and old scroll logic remain | Duplicate ownership increases regression and active-state risk | Source-verified |
| D-08 | P1 | Scrollspy observes many independently ordered nodes | Active group may flicker around tall or adjacent sections | Source-verified; browser validation required |
| D-09 | P1 | Five primary links are too coarse for long groups | Users must scan or scroll blindly within Commerce/Public Experience | Source-verified; browser validation required |
| D-10 | P1 | Outer shell, group headers, cards, kickers, and dividers stack hierarchy | Desktop page remains visually dense and longer than necessary | Source-verified; browser validation required |
| D-11 | P1 | Some ARIA relationships are surface-dependent | Organizer/create can reference an admin-only promotion ID that is absent | Source-verified |
| D-12 | P2 | Admin impact context is separated from editing | Published changes lack registrations/submissions and change-impact context | Source-verified capability gap |

## Detailed P0 findings and tasks

### D-01 and D-02 — DOM, keyboard order, and semantic hierarchy

**Finding — Source-verified:** Create Event is physically arranged in the expected sequence. The edit template is not: Pricing, Payment, Rewards, Event Details, Badges, and Waiver appear in source before Schedule, Location/Virtual, Race Categories, and Media. CSS `order` makes the screen look correct, but Tab order, screen-reader reading order, find-in-page context, and no-CSS fallback follow the source.

The five `h2` group headings are also emitted together before the form sections and distributed visually through CSS ordering. Section names such as “Schedule” and “Payment Setup” are styled `div.section-title` elements rather than headings.

**Tasks:**

- Physically arrange both Create and Edit into Basics, Participation, Commerce, Public Experience, and Review.
- Wrap each group in a semantic section associated with its own `h2`.
- Promote each form-section title to `h3`; retain media/review card headings below that level.
- Remove CSS `order` as the primary information-architecture mechanism.
- Ensure conditional Location and Virtual sections retain the correct position without creating duplicate landmarks.

**Acceptance:** DOM, Tab, screen-reader, and visual order are identical. The heading outline is `h1` page title → `h2` group → `h3` form section. The page remains coherent with CSS or JavaScript unavailable.

### D-03 and D-04 — autosave placement and save-state truthfulness

**Finding — Source-verified:** `initWorkspaceDrafts()` creates `.workspace-autosave-status` and calls `form.prepend(status)`. The form is a two-column grid whose intended direct children are the rail and main column. The injected paragraph has no grid placement, so automatic grid placement can move the rail or content into another cell or row.

The same screen can communicate “saved locally,” “unsaved changes,” and “No unsaved changes” through separate elements. Local storage excludes files and does not save to the server, but the current prominence and wording can be mistaken for persistence.

The restore flow uses native `window.confirm`, unlike the accessible confirmation pattern already used by builder actions.

**Tasks:**

- Provide a declared save-status slot in the page header or persistent action dock; never inject a new direct grid child.
- Use one state model: unchanged, unsaved, saving locally, saved locally, saving to server, saved to server, and save failed.
- Explicitly label local recovery as “On this device only”; retain the file-upload caveat.
- Replace the native restore prompt with the existing modal behavior: focus trap/restore, Escape, descriptive copy, and explicit Restore/Discard choices.
- Ensure rich-text values and dynamic pricing/category controls participate consistently in restoration or are explicitly excluded.

**Acceptance:** initializing autosave does not change grid placement. A user can distinguish local recovery from server persistence without relying on color. Restore is fully keyboard accessible and never clears server data implicitly.

### D-05 — lifecycle-aware action hierarchy

**Finding — Source-verified:** Drafts have a primary Submit for Review action and a secondary Save Changes action. When the submit action is absent—published, pending-review, and other editable states—Save Changes keeps the outline style, leaving the desktop workflow without a primary mutation. Back navigation is presented beside mutations in the fixed dock.

**Tasks:**

- Make Save Changes primary whenever Submit for Review is unavailable.
- Keep Submit for Review primary for drafts and Save Draft/Changes secondary.
- Move Back/Return to the page breadcrumb or header; keep Preview as a contextual secondary action.
- Align the action group with the main editing column rather than the entire 1200px shell, while keeping save status visible near the actions.
- Preserve pending, disabled, double-submit, and inline failure behavior.

**Acceptance:** every lifecycle has exactly one visually primary action. Navigation is visually separated from mutations. At 200% zoom, every action remains reachable and the dock does not cover the final Review content.

### D-06 — completion versus publish readiness

**Finding — Source-verified:** group completion is calculated from visible HTML controls carrying `required`. Publishing readiness also depends on server validation, conditional pricing/payment rules, uploads, rich content, and lifecycle state. A green completion icon can therefore communicate more certainty than the underlying validation supports.

**Tasks:**

- Prefer readiness data already produced by the event-form service for publish-capable states.
- If live authoritative readiness is unavailable, rename the state to “Required fields filled” and reserve “Ready” for server-equivalent validation.
- Treat conditional, file, rich-text, and collection builders consistently.
- For published events, use neutral “No detected errors” or modified-state indicators instead of draft readiness language.

**Acceptance:** the rail never claims an event is ready when Review still reports blockers. State text remains meaningful without icons or color.

## Detailed P1 findings and tasks

### D-07 and D-08 — single navigation owner and deterministic scrollspy

**Finding — Source-verified:** the templates retain hidden desktop, tablet, mobile, phase, and overlay markup for the former 13-step system. The older inline scripts still observe `data-wizard-step` sections while the new group script runs a second observer. Although the legacy UI is hidden/inert, two navigation models still process the same long page.

The current group observer chooses from entries delivered in each observer callback rather than calculating the nearest ordered group boundary across the whole document. Tall sections and adjacent headings can produce unstable active state.

**Tasks:**

- Remove the hidden 13-step markup after migrating any remaining readiness hooks.
- Remove old progress metadata, overlay handlers, and duplicate observer code.
- Give the five-group controller sole ownership of group state.
- Determine the active group from semantic group containers and a stable top-of-content activation line.
- Preserve hash navigation, reduced motion, error focus, and browser Back/Forward behavior.

**Acceptance:** one observer/controller updates group state. The active item does not flicker when crossing long sections, resizing, or zooming.

### D-09 — section-level navigation inside long groups

**Finding — Source-verified:** five groups reduce primary complexity, but Commerce contains Rewards, Pricing, and Payment, while Public Experience contains Event Details, Badges, Media, and Waiver. A single group link does not show where the user is within those long areas.

**Tasks:**

- Add a compact desktop-only secondary list beneath the active group.
- Expose section labels and error markers without restoring 13 equal primary steps.
- Keep primary group state visually dominant; collapse inactive secondary lists.
- Ensure secondary links share the same scroll offset and error-focus behavior.

**Acceptance:** any desktop form section is reachable in two navigation choices or fewer. The rail remains readable at 1025px and at 200% zoom.

### D-10 — hierarchy, density, and complex controls

**Finding — Source-verified / Browser validation:** the page combines a shadowed outer shell, five group headers, bordered form cards, repeated group kickers, section dividers, helper copy, and a fixed action bar. The pattern is clearer than the former 13-step page but still consumes substantial vertical space and repeats hierarchy.

Pricing, race-category, reward, media, waiver, and review components use several multi-column grids. These require explicit validation near the 1025px desktop boundary and under zoom, where the effective content width becomes tablet-like before the CSS breakpoint changes.

**Tasks:**

- Keep group headings as the major visual boundaries and flatten routine form sections into quiet record panels.
- Remove repeated group-name kickers once semantic group containers exist.
- Normalize section padding, helper spacing, border weight, and heading rhythm.
- Add component-level wrapping/min-width rules based on available content width, not only viewport width.
- Constrain rich text, preview media, tables, and generated rows to the main column.

**Acceptance:** the user can distinguish group, section, field, helper, and warning levels at a glance. No complex control clips or causes page-level horizontal overflow at the documented desktop widths and zoom levels.

### D-11 — ARIA relationships and focus

**Finding — Source-verified:** the shared Basics link lists `homepage-promotion-step` in `aria-controls`, but that ID exists only in admin mode. Desktop links also retain disclosure-oriented `aria-expanded` even though all desktop groups remain expanded.

**Tasks:**

- Generate controlled-ID lists from the sections actually rendered for the current surface.
- Use `aria-expanded` only when a control truly expands/collapses content.
- Preserve `aria-current` for current navigation and provide textual complete/error state.
- Verify visible focus against active, complete, and error backgrounds.

**Acceptance:** every ARIA ID reference resolves in rendered HTML, and role/state attributes match actual desktop behavior.

## P2 operational opportunities

These are intentionally deferred until the P0/P1 editor foundation is stable:

- show organizer identity, last server save, lifecycle status, and test-data state in a compact admin context row;
- show registrations/submissions counts and explain the impact of editing a published event;
- add event-scoped audit history and a change-impact summary;
- offer comparison preview and queue previous/next navigation;
- consolidate duplicated create/edit sections and inline scripts after behavior parity is proven.

## Phased implementation backlog

### Phase 1 — semantic structure and grid integrity (P0)

- Rebuild physical group order and heading hierarchy.
- Add a declared save-status slot and correct autosave restoration.
- Add source tests for DOM order, headings, grid children, and ARIA ID resolution.

**Exit:** visual, keyboard, and screen-reader order match; autosave initialization cannot alter the desktop grid.

### Phase 2 — actions and trustworthy state (P0)

- Implement lifecycle-aware primary actions.
- Separate Back navigation from mutations and align the dock to the main column.
- Replace approximate completion language with authoritative or deliberately limited state.

**Exit:** each lifecycle has one primary task, and local/server/readiness states are unambiguous.

### Phase 3 — navigation consolidation (P1)

- Remove legacy markup and scripts.
- Implement stable group scrollspy and active-group secondary section links.
- Preserve hashes, errors, keyboard use, and reduced motion.

**Exit:** one navigation controller owns state and every section is efficiently reachable.

### Phase 4 — desktop hierarchy and component fit (P1)

- Flatten routine panels and remove redundant kickers.
- Normalize spacing and complex control wrapping.
- Validate sticky rail/action behavior at all target widths, heights, and zoom levels.

**Exit:** no overlap or page overflow; hierarchy remains clear without nested-card noise.

### Phase 5 — admin operations (P2)

- Add impact context, audit/history, comparison, and queue navigation only with approved controller interfaces.

**Exit:** administrators understand who and what a live edit affects before saving.

## Desktop validation matrix

| Dimension | Required scenarios |
|---|---|
| Width | 1025, 1280, 1440, and 1920px |
| Height | 560, 768, and 900px |
| Zoom | 100%, 125%, 150%, and 200% |
| Lifecycle | Draft, pending review, published, archived/editable |
| Surface | Admin edit, organizer edit, organizer create |
| Event setup | Free/paid, virtual/on-site/hybrid, missing media, long rich content, many categories/pricing rows |
| State | Clean, locally saved, dirty, validation errors, failed save, rate limited, successful save |
| Input | Mouse, keyboard only, screen-reader heading/navigation pass |

Manual acceptance must confirm:

- no sticky element is hidden beneath the global navigation or overlaps another sticky element;
- the rail remains visually attached to the workspace and every group/section is reachable;
- Tab and heading order match the visual sequence;
- the main column never drops beneath the rail because of injected status content;
- the action dock never covers Review fields, browser controls, or focus indicators;
- long titles, labels, rich content, and generated rows do not create page-level horizontal scrolling;
- failed saves preserve values and keep feedback adjacent to the relevant workflow.

## Verification baseline and constraints

Current focused baseline on 2026-07-16: 18/18 tests pass across `admin-event-editor-ui.unit.test.js` and `event-builder-responsive-ui.unit.test.js`. Database-connected suites are excluded because the repository has no staging environment.

Future implementation tests must add coverage for physical DOM order, semantic headings, autosave-slot placement, lifecycle-primary actions, authoritative state wording, one navigation owner, stable section navigation, and valid ARIA references. EJS compilation, client/controller syntax, focused permission/CSRF/escaping tests, Markdown links, and `git diff --check` remain required.

Authenticated browser validation is still mandatory before declaring the desktop backlog complete; source inspection cannot confirm final visual rhythm, scroll feel, or zoom behavior behind the authenticated route.
