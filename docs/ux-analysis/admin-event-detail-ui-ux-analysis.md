# Admin Event Detail UI/UX Analysis

> Route: `/admin/events/:id`
> Primary surfaces: `src/views/admin/event-detail.ejs`, `src/controllers/admin/events.controller.js`, `src/public/css/admin.css`
> Analysis date: 2026-07-16

## 1. Objective and method

The admin event detail page must let an administrator identify the event, understand its lifecycle and public state, resolve approval blockers, reach operational records, and perform a safe lifecycle action without reconstructing context from a long record dump.

Findings marked **Verified** come directly from the current route, controller, template, styles, or authorization middleware. Findings marked **Heuristic** are workflow judgments to validate through device testing and future usage data. The review covers pending review, published, scheduled-publication, archived, deleted, test-data, free, and paid events across compact phone, standard phone, tablet, and desktop widths.

## 2. Current experience

### Strengths

- **Verified:** The route centralizes event status, organizer, schedule, rules, fees, rewards, location, content, media, sitemap state, registrations, and submissions.
- **Verified:** Approval uses the shared publishing service and shows a pre-publish summary, readiness validation, and optional audit/organizer note.
- **Verified:** Archive and delete require server-validated reasons; delete also requires full-admin authorization and password confirmation.
- **Verified:** Mutations retain CSRF protection and rate limiting, and publish/archive/delete preserve their existing communication and audit behavior.
- **Verified:** Scheduled public listing and test-data sitemap behavior have explicit states.

### Primary friction

- **Verified:** Approval blockers appear after the entire event record, separated from the pending status and approval decision.
- **Verified:** Navigation, editing, public context, registrants, approval, archive, and delete are presented as similarly weighted buttons.
- **Verified:** Archive uses the browser's `prompt`, while approve and delete use custom dialogs; the patterns have inconsistent validation, context, and accessibility.
- **Verified:** Support admins see the full-admin-only delete control and learn that it is unavailable only after requesting the protected endpoint.
- **Verified:** Registration and submission counts are static values instead of operational entry points.
- **Verified:** Media thumbnails have empty alternative text and no labels identifying logo, banner, poster, or gallery roles.
- **Verified:** Event facts are displayed as repeated paragraphs in many equal-weight cards, making review evidence difficult to scan.
- **Verified:** The custom dialogs restore focus and close on Escape, but do not trap focus, prevent background interaction, or expose a durable pending state.
- **Heuristic:** The page reads like a database summary followed by actions rather than an adaptive review or lifecycle-management workspace.

## 3. Workflow and responsive assessment

### Pending review

The primary task is deciding whether the event is publish-ready. Status, visibility timing, fee/payment readiness, and validation failures must appear together. Approval should be prominent only when eligible; blocked events should lead directly to editing.

### Published and scheduled publication

The primary task becomes monitoring public state and reaching the public page or operational records. Scheduled-publication events need an unmistakable visibility explanation without implying the public page is currently available.

### Archived and deleted

These are terminal or restricted states. The page should prioritize status history and retained records, remove irrelevant editing/publishing affordances, and keep destructive state visually separate from normal work.

### Compact and standard phones: 320–430 px

- **P1:** The header action cluster and two-column detail grid become a long sequence without a task-oriented hierarchy.
- **P1:** Lifecycle actions must remain separated to reduce wrong-target activation.
- **P1:** Rich organizer-authored content needs horizontal overflow containment for tables and long unbroken values.
- **P2:** Section navigation should scroll to content without covering headings and should wrap safely.

### Tablet: 768–1024 px

The page can support a main record column plus task context, but touch targets and action separation must remain phone-safe. Sticky positioning must stop before it obscures long content or the footer.

### Desktop: 1280 px and above

A compact status/task panel can remain visible beside the record. The page should favor fast scanning, predictable section anchors, and operational links over additional decorative cards.

## 4. Accessibility and interaction requirements

- Use a breadcrumb landmark, one page-level heading, semantic section headings, and labelled section navigation.
- Keep every interactive target at least 44 by 44 CSS pixels and provide visible `:focus-visible` styling.
- Dialogs must trap Tab/Shift+Tab, restore focus, close with Escape, use `aria-modal`, prevent background interaction, and focus the first meaningful control.
- Mutation controls must disable while pending, communicate progress, prevent duplicate submission, and expose server failures in an `aria-live` region without losing context.
- Status and availability must use text in addition to color or icons.
- Rich details, long identifiers, dates, and media must remain usable at 200% zoom and 320 px width.
- Motion must be removed when `prefers-reduced-motion: reduce` is active.

## 5. Prioritized implementation

| Priority | Change | Acceptance criterion |
|---|---|---|
| P0 | Permission-aware danger zone | Support admins are not offered deletion; the route remains protected by `requireFullAdmin` |
| P0 | Accessible, consistent lifecycle dialogs | Approve, archive, and delete provide target/impact context, focus containment, progress, and inline errors; no native prompt remains |
| P1 | Adaptive task hierarchy | Pending events lead with readiness/approval; other states lead with relevant visibility and lifecycle guidance |
| P1 | Scannable information architecture | Identity, status, operations, task, event information, visibility/media, and danger zone appear in that order |
| P1 | Operational count links | Registration and submission counts lead to existing event-filtered operational pages |
| P1 | Responsive and content resilience | No page-level horizontal scroll at 320 px; rich details contain wide content; desktop task context can remain sticky |
| P2 | Media semantics | Every preview is labelled and has meaningful alternative text; missing media has a clear empty state |

## 6. Deferred improvements

The first pass deliberately does not add an event-scoped audit feed, downstream impact calculations, queue ownership, or previous/next review navigation. Those require new query and product behavior. A later operational phase should add lifecycle history with actor/reason, affected registration/payment/submission summaries before live-event edits, and queue-context preservation after a decision.

## 7. Acceptance and validation

- Validate pending-ready, pending-blocked, published-visible, published-scheduled, archived, deleted, test-data, paid, and free states.
- Validate 320, 390, 768, and 1280 px widths, keyboard-only operation, 200% zoom, reduced motion, missing media, long titles, and wide rich-content tables.
- Verify approve, archive, delete, and sitemap request paths and payloads remain unchanged.
- Use DB-free source/template tests only; this repository has no staging database and live integration tests may reach production.

## 8. Desktop follow-up: balanced workspace correction

The first implementation exposed three desktop-specific issues during review:

- **Verified:** The event workspace expanded to 1320 px while the global navigation uses the shared 1200 px site container, producing inconsistent left and right alignment on larger monitors.
- **Verified:** The global navigation is sticky and approximately 76 px tall, but the event section navigation and task rail used `top: 0` and `top: 1rem`. Both could scroll underneath the global navigation.
- **Verified:** The entire right rail was sticky, including Archive and Soft Delete, giving destructive actions persistent prominence while the administrator reviewed otherwise unrelated event information.
- **Heuristic:** Repeated bordered sections containing additional shaded fact cards made the desktop page feel more layered and visually dense than necessary.

The correction uses the shared 1200 px desktop grid, a flexible record column with a compact decision rail, and one sticky offset below the global navigation. Only the primary status/decision card remains sticky. Lifecycle destruction returns to the document flow as a full-width danger zone after media and visibility, where it remains discoverable without competing with routine review work.
