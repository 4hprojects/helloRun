# Admin Event Editor UI/UX Analysis

> Route: `/admin/events/:id/edit`
> Audited URL shape: `/admin/events/:id/edit?returnTo=/admin/events?...`
> Primary surfaces: `src/views/organizer/edit-event.ejs`, `src/controllers/admin/events.controller.js`, `src/public/css/create-event.css`
> Analysis date: 2026-07-16

> **Current full-desktop audit:** [`admin-event-editor-desktop-deep-dive.md`](admin-event-editor-desktop-deep-dive.md) is the canonical source for remaining desktop findings, priorities, implementation tasks, and acceptance criteria. This document retains the earlier analysis and implementation history.

## Objective

The admin editor must let an administrator safely identify the target event, make bounded changes, understand their effect on the current lifecycle state, preview the result, and return to the originating event queue without losing filters. Because the page reuses the organizer's 13-step builder, admin-specific behavior must remain truthful without breaking the organizer workflow.

Findings below are verified from the route, controller, shared template, CSS, and client script. The local URL redirects unauthenticated requests to `/login`, so authenticated visual validation remains part of implementation acceptance.

## Critical findings

1. Admin save calls `getCreateEventFormData` without importing it, causing a `ReferenceError` on submission.
2. Drafts show “Submit for Review,” but the admin controller overwrites the submitted action as `draft` and never transitions the event to `pending_review`.
3. Admin payment-QR removal sends `kind=paymentQr`, which the admin media endpoint does not support.
4. The UI declares 13 steps while JavaScript declares 12 and omits Badges from step metadata, producing incorrect active/progress state.
5. Badges and the admin-only Homepage Promotion card lack flex ordering, so their visual desktop position does not match the numbered navigation.
6. The admin route does not provide readiness or review-summary data, leaving Step 13 incomplete or misleading.

## Workflow and desktop findings

- The supplied `returnTo` queue URL is ignored by Back and POST success/error paths, losing search and filter context.
- The header does not identify the event title, reference, status, or whether changes affect an already published event.
- The desktop step rail uses `top: 1rem` beneath a sticky global navigation and can be obscured while scrolling.
- Save controls live at the end of a very long form; their sticky behavior is constrained to the Review card instead of supporting work throughout the builder.
- The page does not track dirty state or warn before leaving with unsaved changes.
- Existing-media removal persists immediately, unlike normal form changes, but the confirmation copy does not explicitly distinguish that behavior.
- Confirmation dialogs close with Escape but do not trap/restore focus or make background content inert.
- Admin badge customization is presented through organizer-owned endpoints that do not grant admin ownership access; the admin experience must not advertise unusable controls.
- The card-heavy, hover-elevated presentation makes all 13 steps appear equally urgent and increases desktop scan cost.

## Implementation priorities

### P0 — truthful and functional

- Restore admin save parsing and preserve existing route protections.
- Implement the advertised draft-to-review transition or remove the action; this pass implements the transition consistently with organizer edit.
- Support admin payment-QR removal.
- Sanitize and preserve event-list `returnTo` context.
- Populate readiness and review summary on initial and validation-error renders.
- Correct all 13 step counts, metadata, and CSS order.

### P1 — safe admin workflow

- Add target identity/status context and a published-event impact notice.
- Provide persistent desktop Preview/Save actions and a visible dirty/saved state.
- Add an unsaved-change guard that is cleared for confirmed submit and preview does not clear it.
- Place Homepage Promotion in the ordered Core Details area and present Badges as admin-appropriate read-only guidance rather than unusable organizer forms.
- Offset sticky controls below the global navigation and reduce decorative hover/elevation noise.
- Upgrade confirmation dialogs with focus containment, restoration, inert background, and pending state.

## Acceptance criteria

- Back and successful save return to the sanitized filtered `/admin/events` URL when supplied; unsafe/external values fall back to event detail.
- Save works for draft, pending-review, and published events; Submit for Review validates publishing requirements and moves a draft to `pending_review`.
- Payment QR removal succeeds through the existing admin media route.
- Desktop navigation and rendered content follow steps 1–13 exactly; Badges is step 10 and progress reaches 13 of 13.
- Readiness and review summaries are populated on GET and every validation re-render.
- Published edits clearly state that saving updates the live event.
- Persistent actions do not cover content at 1024, 1280, 1440, or 1920 px and collapse safely on smaller screens.
- DB-free tests cover controller imports, action semantics, safe return handling, media payload compatibility, step ordering, admin-mode badge behavior, dirty state, and dialog accessibility.

## Implementation outcome

Implemented on 2026-07-16. Admin save parsing, draft-to-review transition, QR removal, sanitized queue return, complete review data, 13-step consistency, admin identity/live-impact context, admin badge guidance, internal notes, nav-safe desktop progress, persistent desktop actions, dirty-state protection, and accessible confirmation focus behavior are now covered by `tests/admin-event-editor-ui.unit.test.js`.

Post-implementation browser verification exposed a multipart CSRF ordering defect: the admin router attempted to validate `_csrf` before Multer populated `req.body`. The blanket admin guard now defers multipart requests, while every admin multipart endpoint performs explicit CSRF validation immediately after its authenticated, rate-limited upload middleware. Non-multipart admin mutations retain the blanket guard.

Focused editor, detail, permission, route, gating, template-escaping, syntax, EJS compilation, and diff checks pass. The live integration suite was not run because the repository has no staging database. One unrelated strategic runner-dashboard test remains failing against pre-existing workspace changes because its expected “Certificates Earned” text is absent from the current runner dashboard.

## Responsive workflow follow-up — five task groups

The first correction made the admin editor functional and safer, but authenticated desktop feedback and source review confirm that the shared builder still asks users to navigate 13 equally weighted sections. It also maintains three competing navigation systems: a desktop rail, tablet pills, and a mobile step overlay. This increases scan cost, makes the action hierarchy difficult to understand, and causes create, organizer edit, and admin edit to feel like separate workflows even though they submit the same event model.

The supplied return URL also demonstrates a feedback-loop defect: previously appended `type` and `msg` values are retained inside `returnTo`, then another pair is appended after every save. Repeated edits therefore accumulate duplicate success messages. Queue filters should persist, but transient feedback parameters must be removed before a new message is added.

### Target information architecture

The 13 sections remain intact at the field and payload level but are presented through five operational groups:

1. **Basics** — event type, core details, schedule, and admin-only homepage promotion.
2. **Participation** — location or virtual rules and race categories.
3. **Commerce** — rewards, pricing, and payment setup.
4. **Public Experience** — event details, badges, branding/media, and waiver.
5. **Review** — readiness, summary, admin notes, preview, save, and submission.

This shared hierarchy applies to Create Event, organizer Edit Event, and admin Edit Event. Lifecycle-specific actions and admin-only warnings remain contextual; no field, payload, route, permission, or validation rule changes.

### Responsive findings and decisions

- **Desktop (1025px and wider):** use the 1200px HelloRun grid, a 220–240px nav-safe sticky group rail, a flexible record column, quieter subsection panels, and a workspace-aligned action dock.
- **Tablet (641–1024px):** use one content column and a single sticky, horizontally scrollable five-group bar. Primary actions retain text labels.
- **Mobile (320–640px):** use a compact “Group X of 5” control, accessible group disclosures, single-column fields, 44px targets, viewport-safe complex controls, and a safe-area-aware action dock.
- All content remains visible and usable without JavaScript. Enhanced mobile disclosure opens the current hash group or first invalid group and never hides validation evidence from assistive technology without updating disclosure state.
- Error summaries link to concrete fields. Activating an error opens its group, scrolls with the sticky offset, and focuses the control.
- Drafts prioritize Submit for Review while retaining Save Draft. Published edits prioritize Save Changes. Preview and Back remain available without competing with the primary mobile action.

### Phases and priorities

- **P0 foundation:** replace visible 13-step navigation with five shared groups, retain payload compatibility, fix validation recovery, and canonicalize admin queue returns.
- **P0 desktop:** stabilize the 1200px workspace, sticky offsets, record hierarchy, and persistent actions.
- **P1 responsive:** implement tablet group navigation and mobile disclosures/action layout.
- **P0 verification:** compile both EJS templates and run DB-free workflow, permission, CSRF, escaping, accessibility-source, and responsive CSS checks.
- **P2 deferred:** autosave, event-scoped audit history, downstream-impact summaries, and queue-to-next-event navigation.

### Responsive acceptance criteria

- Only five task groups are exposed as primary navigation on all three builder surfaces; the 13 field sections remain present and submit their existing names and action values.
- Sticky navigation remains below the global header, action docks never cover final fields, and no page-level horizontal overflow occurs at 320, 390, 641, 768, 1024, 1280, 1440, or 1920px.
- Keyboard users can navigate groups, expand mobile disclosures, follow an error to its field, and operate every persistent action at 200% zoom.
- Repeated admin saves preserve event-list search/filter context but produce exactly one feedback `type`/`msg` pair.
- Failed saves retain entered values and surface errors in context. The Supabase sync worker's DNS availability is operationally separate and does not change the builder's form contract.

### Baseline for this follow-up

Captured before the five-group implementation on 2026-07-16: `tests/admin-event-editor-ui.unit.test.js` passes 11/11. The combined strategic check passes all event/policy assertions but retains the unrelated pre-existing runner-dashboard failure described above. Database-connected integration tests remain excluded because no staging environment is available.

### Five-group implementation outcome

Implemented on 2026-07-16 in the planned priority order:

- Create Event, organizer Edit Event, and admin Edit Event now share five primary task groups and one navigation model while retaining all 13 underlying form sections, field names, action values, uploads, and lifecycle behavior.
- Desktop uses the centered 1200px workspace and nav-safe sticky group rail. Tablet uses a single sticky horizontal group list. Mobile uses a five-group disclosure menu, persistent safe-area-aware actions, 44px controls, and one active content group at a time.
- Group navigation exposes current, complete, and invalid states. Error-summary links open the owning group and focus either the exact field or an appropriate compound-section fallback.
- The Review action dock remains available while other mobile groups are open. Draft and published action priorities remain lifecycle-aware.
- Admin queue returns now preserve recognized filters, strip every previous feedback pair, and append exactly one new `type`/`msg` result after save.
- Legacy 13-step navigation markup is retained only as hidden, inert compatibility scaffolding for the existing inline builder behavior; it is not exposed visually or to assistive technology.

Verification: 44 focused DB-free editor, responsive, admin permission, route, organizer gating, and escaping checks pass. Controller/client syntax, EJS compilation, and `git diff --check` pass. The strategic suite's event and policy checks pass; its pre-existing runner-dashboard “Certificates Earned” assertion remains the only failure and is unrelated to this change. Authenticated visual verification at the documented breakpoints remains a browser acceptance step because the supplied local route redirects unauthenticated requests to login and no staging database is available.

## Desktop sticky-rail visual correction

Full-desktop review identified that the Event Builder rail looked like a detached floating card after scrolling. The sticky position itself is useful and correctly remains below the global navigation; the visual defect comes from combining stickiness with an opaque white surface, full border, rounded corners, shadow, padding, and an always-enabled independent scroll container.

The desktop correction keeps the rail sticky but integrates it into the 1200px workspace: its outer card surface is removed, a quiet right divider anchors it to the form grid, and independent vertical scrolling is limited to unusually short viewports. Active, complete, invalid, hover, and focus treatments remain on the individual group links. Tablet and mobile navigation are intentionally unchanged.

Acceptance: at 1025, 1280, 1440, and 1920px the rail must remain aligned, fully visible below the global header, and visually part of the editor rather than a floating overlay. Short-height desktop windows must still expose every group through a flat internal scroll region without overlapping the form.

Implemented on 2026-07-16. The desktop rail now uses a transparent, square, shadow-free outer surface with a subtle workspace divider; short-height scrolling is enabled only at 560px viewport height and below. Tablet and mobile rules are unchanged. The focused editor/responsive suite passes 18/18 alongside EJS compilation, client syntax validation, and `git diff --check`.

## Full-desktop deep-dive handoff

The next desktop phase is documented separately in [`admin-event-editor-desktop-deep-dive.md`](admin-event-editor-desktop-deep-dive.md). Its P0 backlog addresses physical DOM/keyboard order, semantic headings, autosave grid placement, local-versus-server state, lifecycle-primary actions, and trustworthy completion language before further visual refinement. P1 covers navigation consolidation, section-level desktop wayfinding, density, zoom, and ARIA correctness; P2 contains operational context and audit enhancements.
