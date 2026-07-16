# Public Event Detail Mobile UI/UX Analysis

> Route: `/events/:slug`
> Primary surfaces: `src/views/pages/event-details.ejs`, `src/public/css/event-details.css`, `src/utils/event-public-view.js`
> Analysis date: 2026-07-16

## 1. Objective and method

The public event page must help a runner answer five questions quickly on a phone: what the event is, whether registration is available, what it costs, when it happens, and what completing it requires. This audit prioritizes those decisions while preserving the page's marketing role on larger screens.

Findings marked **Verified** come directly from the current template, styles, controller, or view model. Findings marked **Heuristic** are usability judgments that should be validated with device testing and product analytics.

The review covers compact phones (320–375 px), standard phones (390–430 px), tablets (768–980 px), and desktop, plus anonymous/authenticated, organizer preview, open, upcoming, closed, and ended states.

## 2. Current experience

The page currently renders a large image hero, chips, organizer, title, description, three hero actions, a pricing panel, navigation actions, three highlight cards, long-form content, a responsive sidebar, a final CTA row, a fixed mobile registration CTA, related events, and the footer.

### Strengths

- **Verified:** Critical event values are normalized by `buildPublicEventView` instead of recomputed in the template.
- **Verified:** Registration status, price, timeline, distance, location, rules, rewards, gallery, shop, organizer contact, and related events have explicit presentation states.
- **Verified:** Buttons generally become full-width on phones and most primary actions meet a 44 px minimum height.
- **Verified:** Banner imagery has a strong dark overlay and the lead uses an additional contrast layer.
- **Verified:** Optional modules are conditionally omitted, avoiding empty gallery, poster, shop, and contact panels.
- **Verified:** Organizer preview renders the same public template, supporting parity.

### Primary friction

- **Verified:** At mobile widths the hero remains content-heavy and includes the registration action, browse action, save action, pricing panel, and then another registration card immediately below the highlights.
- **Verified:** Registration/pricing is repeated in the hero, hero panel, sidebar registration card, final CTA row, and fixed mobile CTA.
- **Verified:** At `max-width: 980px`, the entire sidebar is moved before the main content, so timeline and detail cards can delay “How This Event Works.”
- **Verified:** The fixed event CTA, authenticated runner navigation, and global scroll-up control all compete for the mobile bottom edge unless page-specific offsets coordinate them.
- **Verified:** The fixed CTA shows only an action; price/status context remains elsewhere on the page.
- **Verified:** Closed and ended events still reserve a full fixed bar for a disabled button.
- **Verified:** Rich-content tables use `width: 100%` but have no narrow-screen overflow container behavior.
- **Verified:** Gallery and poster dialogs focus the close button on open, but do not trap focus, restore focus to the opener, or mark the rest of the page inert.
- **Verified:** Save-event failures are silent and success has no live-region announcement.
- **Heuristic:** Repeated card borders and headings make all sections feel equally important, increasing scan time.
- **Heuristic:** Related-event cards are appropriately secondary but remain visually tall on phones.

## 3. Responsive and state audit

### Compact phones: 320–375 px

- **P0:** Fixed registration and runner navigation can overlap, obscuring both actions and content.
- **P1:** The hero uses too much first-screen space before runners see dates, distance, and location together.
- **P1:** Multiple full-width action rows and repeated registration cards create avoidable scrolling.
- **P1:** Long titles, chips, prices, distance lists, and organizer-authored tables need explicit wrapping/overflow protection.
- **P2:** Removing section icons below 420 px helps density, but hierarchy still depends on many nearly identical cards.

### Standard phones: 390–430 px

- The same hierarchy and fixed-surface problems apply, with slightly improved title and chip wrapping.
- This range can support a compact two-column key-fact summary without sacrificing readable labels.

### Tablets: 768–980 px

- **Verified:** The hero and main layout become single-column, while the sidebar becomes a two-column block placed before main content.
- **Heuristic:** Two-column facts work well, but moving every sidebar module ahead of the story over-prioritizes secondary content.
- The desktop hero character can be retained at this range with a shorter minimum height.

### Desktop

- The two-column layout, sticky sidebar, and visual hero are appropriate.
- Desktop behavior should remain stable except for shared accessibility and content-resilience improvements.

### Registration states

- **Open:** needs one unmistakable persistent action with nearby price and deadline.
- **Upcoming:** should show opening timing without a large disabled fixed control.
- **Closed/ended:** should show a compact status message in-page; a persistent disabled CTA adds little value.
- **Preview:** must not show a viewport-fixed public registration control and must preserve editor return actions.

## 4. Accessibility, interaction, and resilience

- All fixed actions must respect `env(safe-area-inset-bottom)` and the authenticated mobile navigation height.
- Every interactive target should be at least 44×44 px with a visible `:focus-visible` state.
- Dialogs must keep keyboard focus inside, restore focus to the opener, close with Escape, and prevent background interaction while open.
- Status must be communicated by text as well as color.
- Save success and failure must be announced through a polite live region; request failures must remain visible long enough to understand.
- Organizer rich content must wrap long URLs/code and place wide tables in a horizontally scrollable region without widening the page.
- Long titles, prices, category names, and locations must use safe wrapping (`overflow-wrap: anywhere`) where needed.
- Motion-based polish must be disabled under `prefers-reduced-motion: reduce`.
- Below-the-fold related and gallery images should lazy-load to reduce initial mobile transfer and decoding work.

## 5. Priority matrix

| Priority | Problem | Required outcome |
|---|---|---|
| P0 | Mobile registration CTA overlaps runner navigation | One coordinated CTA above authenticated navigation, with safe-area support |
| P0 | Scroll-up control overlaps mobile registration surfaces | Page-scoped offset keeps it above the sticky registration CTA and runner navigation only when those controls render |
| P1 | First-screen hierarchy delays key decisions | Compact mobile hero and key facts expose status, price, dates, mode, distance, and location |
| P1 | Registration/pricing is repeated excessively | One mobile persistent action and one in-page summary; desktop sidebar remains available |
| P1 | Dialog keyboard behavior is incomplete | Focus trap, focus restoration, Escape support, and background scroll protection |
| P1 | Narrow content can overflow | 320 px-safe wrapping and scroll-contained rich tables |
| P2 | Long page is difficult to scan | Compact section navigation and deliberate mobile ordering |
| P2 | Save feedback is silent | Accessible success/error feedback |
| P2 | Related content is tall/heavy | Denser cards and lazy-loaded imagery |
| P3 | Measurement is absent | Track registration CTA use, detail-section engagement, and mobile exits when analytics is available |

## 6. Phased implementation checklist

### Phase 1 — Mobile task completion

- [x] Add a compact key-facts summary directly after the hero.
- [x] Shorten the mobile hero and de-emphasize secondary hero actions.
- [x] Hide duplicate mobile registration panels/rows while retaining desktop behavior.
- [x] Add status, price, and deadline context to the fixed registration bar.
- [x] Position the bar above authenticated runner navigation and device safe areas.
- [x] Lift the global scroll-up button above the event registration CTA stack only when the sticky CTA is present.
- [x] Do not show a persistent disabled bar for unavailable registration.
- [x] Verify 44 px targets, focus styles, contrast, and 320 px overflow through focused source/render checks; complete physical-device visual QA before release.

### Phase 2 — Hierarchy and navigation

- [x] Add a compact native “Jump to section” disclosure for the main decision sections, replacing the horizontally scrolling pill row.
- [x] Keep key facts, timeline, and registration options ahead of mechanics on phones without duplicating content.
- [x] Add stable section IDs for mechanics, registration options, rules, rewards, details, and gallery.
- [x] Make rich tables horizontally scrollable with a visible containment boundary.
- [x] Complete gallery/poster dialog keyboard focus management.

Navigation labels are intentionally task-oriented: Steps, conditional Registration, Rules, Rewards, and conditional Full details. The disclosure is mobile-only, non-sticky, keyboard operable, closes after selection, and collapses to one link column at 340 px.

Category-specific accumulated goals use a compact summary rather than repeating the same goal internally. The card presents one registration rule, category/distance pairs, and one approved-submissions note; detailed category eligibility and rewards remain in Race Categories. Single-goal accumulated events retain the prominent completion-goal panel.

The following Race Categories section is suppressed when a category-specific goal card already contains every available category fact. If any category adds a special type, slot limit, cutoff, age group, or category-specific reward, the section remains under the clearer “Category Details” heading so runner-critical information is not discarded.

Ended-event recap, submission rules, and full event details use compact, purpose-specific patterns. Recap highlights are concise verified records; submission rules use a semantic labelled fact grid; organizer-authored rich content sits in a contained, overflow-safe surface with mobile typography rather than another visually heavy generic card.

Desktop layout keeps the registration, timeline, and detail sidebar aligned with the top decision controls instead of starting below the highlight strip. The sidebar remains sticky on desktop, while tablet and mobile retain the compact single-column ordering.

The authenticated Contact Organiser card uses a concise purpose statement, grouped labelled fields, client validation matching the server’s message-length rule, a live character count, and an explicit email-sharing note. Inputs retain 44 px targets and visible focus treatment on mobile.

### Phase 3 — Polish and resilience

- [x] Add save-event live feedback and visible error handling.
- [x] Compact related-event cards on phones and lazy-load secondary imagery.
- [x] Harden wrapping for long organizer-authored and structured values.
- [x] Respect reduced-motion preferences.
- [x] Preserve public/preview parity and all conditional modules.

## 7. Acceptance and success criteria

- At 320, 375, 390, 430, 768, 980, and desktop widths, the document has no page-level horizontal overflow.
- On a phone, status, price, deadline/date, mode, distance, location, and the available registration action are discoverable before long-form content.
- Authenticated runner navigation and the event CTA never overlap; both remain operable above safe areas.
- Upcoming, closed, ended, and preview pages do not show a misleading persistent registration action.
- Keyboard users can open, traverse, and close gallery/poster dialogs and return to the originating control.
- Rich tables and long strings remain contained at 320 px.
- Save actions announce success and failure without relying only on icon/color changes.
- Registration, preview, save, contact, shop, ads, gallery, poster, and related-event behavior continue to work.

Recommended measurement after release: mobile registration CTA click-through, registration-form completion, event-page exit rate, save success/failure rate, and section-anchor usage. Compare against the pre-change mobile baseline where available.

## 8. Implementation handoff

- Implementation surfaces: `src/views/pages/event-details.ejs` and `src/public/css/event-details.css`.
- Focused regression coverage: `tests/event-details-mobile-ui.unit.test.js` plus `tests/event-public-view.unit.test.js`.
- Validated with `node --test tests/event-details-mobile-ui.unit.test.js tests/event-public-view.unit.test.js` and `git diff --check`.
- Remaining release QA: visual checks at 320, 375, 390, 430, 768, 980, and desktop widths, including anonymous and authenticated runner states.
